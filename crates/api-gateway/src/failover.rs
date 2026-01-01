use common::types::ProviderConfig;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// Failover manager for handling provider failures and automatic recovery
pub struct FailoverManager {
    providers: Arc<RwLock<HashMap<String, ProviderHealth>>>,
    health_check_interval: Duration,
    failure_threshold: u32,
    recovery_timeout: Duration,
}

#[derive(Debug, Clone)]
struct ProviderHealth {
    is_healthy: bool,
    consecutive_failures: u32,
    last_failure: Option<Instant>,
    last_health_check: Option<Instant>,
    config: ProviderConfig,
}

impl FailoverManager {
    pub fn new(
        health_check_interval: Duration,
        failure_threshold: u32,
        recovery_timeout: Duration,
    ) -> Self {
        Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
            health_check_interval,
            failure_threshold,
            recovery_timeout,
        }
    }

    /// Register a provider with its configuration
    pub async fn register_provider(&self, config: ProviderConfig) {
        let mut providers = self.providers.write().await;
        providers.insert(
            config.name.clone(),
            ProviderHealth {
                is_healthy: true,
                consecutive_failures: 0,
                last_failure: None,
                last_health_check: None,
                config,
            },
        );
    }

    /// Record a successful request
    pub async fn record_success(&self, provider: &str) {
        let mut providers = self.providers.write().await;
        if let Some(health) = providers.get_mut(provider) {
            health.is_healthy = true;
            health.consecutive_failures = 0;
            health.last_health_check = Some(Instant::now());
        }
    }

    /// Record a failed request
    pub async fn record_failure(&self, provider: &str) {
        let mut providers = self.providers.write().await;
        if let Some(health) = providers.get_mut(provider) {
            health.consecutive_failures += 1;
            health.last_failure = Some(Instant::now());

            if health.consecutive_failures >= self.failure_threshold {
                health.is_healthy = false;
            }
        }
    }

    /// Check if a provider is healthy
    pub async fn is_healthy(&self, provider: &str) -> bool {
        let providers = self.providers.read().await;
        providers
            .get(provider)
            .map(|h| h.is_healthy)
            .unwrap_or(false)
    }

    /// Get failover providers for a given provider
    pub async fn get_failover_providers(&self, provider: &str) -> Vec<String> {
        let providers = self.providers.read().await;
        if let Some(health) = providers.get(provider) {
            health
                .config
                .failover_providers
                .iter()
                .filter(|p| {
                    providers
                        .get(*p)
                        .map(|h| h.is_healthy)
                        .unwrap_or(false)
                })
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    /// Select the best available provider (primary or failover)
    pub async fn select_provider(&self, primary: &str) -> Option<String> {
        if self.is_healthy(primary).await {
            return Some(primary.to_string());
        }

        // Try failover providers
        let failovers = self.get_failover_providers(primary).await;
        for failover in failovers {
            if self.is_healthy(&failover).await {
                return Some(failover);
            }
        }

        None
    }

    /// Perform health check on all providers
    pub async fn health_check_all(&self) {
        let providers = self.providers.read().await;
        let provider_names: Vec<String> = providers.keys().cloned().collect();
        drop(providers);

        for provider in provider_names {
            self.health_check(&provider).await;
        }
    }

    /// Perform health check on a specific provider
    async fn health_check(&self, provider: &str) {
        let mut providers = self.providers.write().await;
        if let Some(health) = providers.get_mut(provider) {
            // Check if enough time has passed since last failure
            if let Some(last_failure) = health.last_failure {
                if last_failure.elapsed() >= self.recovery_timeout {
                    // Attempt recovery
                    health.is_healthy = true;
                    health.consecutive_failures = 0;
                }
            }

            health.last_health_check = Some(Instant::now());
        }
    }

    /// Start background health check task
    pub fn start_health_check_task(self: Arc<Self>) {
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(self.health_check_interval);
            loop {
                interval.tick().await;
                self.health_check_all().await;
            }
        });
    }

    /// Get health status of all providers
    pub async fn get_all_health_status(&self) -> HashMap<String, ProviderHealthStatus> {
        let providers = self.providers.read().await;
        providers
            .iter()
            .map(|(name, health)| {
                (
                    name.clone(),
                    ProviderHealthStatus {
                        is_healthy: health.is_healthy,
                        consecutive_failures: health.consecutive_failures,
                        last_failure: health.last_failure,
                    },
                )
            })
            .collect()
    }
}

#[derive(Debug, Clone)]
pub struct ProviderHealthStatus {
    pub is_healthy: bool,
    pub consecutive_failures: u32,
    pub last_failure: Option<Instant>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::{ApiKeyConfig, RateLimitConfig};

    fn create_test_config(name: &str, failovers: Vec<String>) -> ProviderConfig {
        ProviderConfig {
            name: name.to_string(),
            api_keys: vec![ApiKeyConfig::default()],
            rate_limit: RateLimitConfig::default(),
            cache_ttl: None,
            failover_providers: failovers,
        }
    }

    #[tokio::test]
    async fn test_provider_health() {
        let manager = FailoverManager::new(
            Duration::from_secs(10),
            3,
            Duration::from_secs(30),
        );

        let config = create_test_config("primary", vec![]);
        manager.register_provider(config).await;

        assert!(manager.is_healthy("primary").await);

        // Record failures
        manager.record_failure("primary").await;
        manager.record_failure("primary").await;
        assert!(manager.is_healthy("primary").await); // Still healthy

        manager.record_failure("primary").await;
        assert!(!manager.is_healthy("primary").await); // Now unhealthy

        // Record success
        manager.record_success("primary").await;
        assert!(manager.is_healthy("primary").await); // Recovered
    }

    #[tokio::test]
    async fn test_failover_selection() {
        let manager = FailoverManager::new(
            Duration::from_secs(10),
            3,
            Duration::from_secs(30),
        );

        let primary = create_test_config("primary", vec!["backup1".to_string()]);
        let backup = create_test_config("backup1", vec![]);

        manager.register_provider(primary).await;
        manager.register_provider(backup).await;

        // Primary is healthy
        assert_eq!(
            manager.select_provider("primary").await,
            Some("primary".to_string())
        );

        // Make primary unhealthy
        for _ in 0..3 {
            manager.record_failure("primary").await;
        }

        // Should select backup
        assert_eq!(
            manager.select_provider("primary").await,
            Some("backup1".to_string())
        );
    }
}
