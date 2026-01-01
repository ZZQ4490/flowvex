use common::types::{ApiKeyConfig, LoadBalanceStrategy};
use std::collections::HashMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use tokio::sync::RwLock;

/// Load balancer for distributing requests across multiple API keys
pub struct LoadBalancer {
    providers: Arc<RwLock<HashMap<String, ProviderKeys>>>,
    strategy: LoadBalanceStrategy,
}

struct ProviderKeys {
    keys: Vec<ApiKeyConfig>,
    round_robin_index: AtomicUsize,
}

impl LoadBalancer {
    pub fn new(strategy: LoadBalanceStrategy) -> Self {
        Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
            strategy,
        }
    }

    /// Add or update provider keys
    pub async fn configure_provider(&self, provider: String, keys: Vec<ApiKeyConfig>) {
        let mut providers = self.providers.write().await;
        providers.insert(
            provider,
            ProviderKeys {
                keys,
                round_robin_index: AtomicUsize::new(0),
            },
        );
    }

    /// Select an API key based on the configured strategy
    pub async fn select_key(&self, provider: &str) -> Option<ApiKeyConfig> {
        let providers = self.providers.read().await;
        let provider_keys = providers.get(provider)?;

        match self.strategy {
            LoadBalanceStrategy::RoundRobin => self.round_robin_select(provider_keys),
            LoadBalanceStrategy::Weighted => self.weighted_select(provider_keys),
            LoadBalanceStrategy::LeastConnections => self.least_connections_select(provider_keys),
        }
    }

    /// Round-robin selection
    fn round_robin_select(&self, provider_keys: &ProviderKeys) -> Option<ApiKeyConfig> {
        let enabled_keys: Vec<&ApiKeyConfig> = provider_keys
            .keys
            .iter()
            .filter(|k| k.enabled)
            .collect();

        if enabled_keys.is_empty() {
            return None;
        }

        let index = provider_keys
            .round_robin_index
            .fetch_add(1, Ordering::Relaxed)
            % enabled_keys.len();
        Some(enabled_keys[index].clone())
    }

    /// Weighted selection based on key weights
    fn weighted_select(&self, provider_keys: &ProviderKeys) -> Option<ApiKeyConfig> {
        let enabled_keys: Vec<&ApiKeyConfig> = provider_keys
            .keys
            .iter()
            .filter(|k| k.enabled)
            .collect();

        if enabled_keys.is_empty() {
            return None;
        }

        let total_weight: u32 = enabled_keys.iter().map(|k| k.weight).sum();
        if total_weight == 0 {
            return self.round_robin_select(provider_keys);
        }

        // Use current time as pseudo-random seed
        let random_value = (std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
            % total_weight as u128) as u32;

        let mut cumulative_weight = 0;
        for key in &enabled_keys {
            cumulative_weight += key.weight;
            if random_value < cumulative_weight {
                return Some((*key).clone());
            }
        }

        // Fallback to first key
        enabled_keys.first().map(|k| (*k).clone())
    }

    /// Least connections selection (based on usage count)
    fn least_connections_select(&self, provider_keys: &ProviderKeys) -> Option<ApiKeyConfig> {
        let enabled_keys: Vec<&ApiKeyConfig> = provider_keys
            .keys
            .iter()
            .filter(|k| k.enabled)
            .collect();

        if enabled_keys.is_empty() {
            return None;
        }

        // Select key with lowest usage count
        enabled_keys
            .into_iter()
            .min_by_key(|k| k.usage_count)
            .map(|k| k.clone())
    }

    /// Increment usage count for a key
    pub async fn increment_usage(&self, provider: &str, key: &str) {
        let mut providers = self.providers.write().await;
        if let Some(provider_keys) = providers.get_mut(provider) {
            if let Some(api_key) = provider_keys.keys.iter_mut().find(|k| k.key == key) {
                api_key.usage_count += 1;
            }
        }
    }

    /// Get all keys for a provider
    pub async fn get_provider_keys(&self, provider: &str) -> Option<Vec<ApiKeyConfig>> {
        let providers = self.providers.read().await;
        providers.get(provider).map(|p| p.keys.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_round_robin() {
        let lb = LoadBalancer::new(LoadBalanceStrategy::RoundRobin);
        let keys = vec![
            ApiKeyConfig {
                key: "key1".to_string(),
                weight: 1,
                enabled: true,
                usage_count: 0,
            },
            ApiKeyConfig {
                key: "key2".to_string(),
                weight: 1,
                enabled: true,
                usage_count: 0,
            },
        ];

        lb.configure_provider("test".to_string(), keys).await;

        let key1 = lb.select_key("test").await.unwrap();
        let key2 = lb.select_key("test").await.unwrap();
        let key3 = lb.select_key("test").await.unwrap();

        assert_eq!(key1.key, "key1");
        assert_eq!(key2.key, "key2");
        assert_eq!(key3.key, "key1");
    }

    #[tokio::test]
    async fn test_weighted() {
        let lb = LoadBalancer::new(LoadBalanceStrategy::Weighted);
        let keys = vec![
            ApiKeyConfig {
                key: "key1".to_string(),
                weight: 3,
                enabled: true,
                usage_count: 0,
            },
            ApiKeyConfig {
                key: "key2".to_string(),
                weight: 1,
                enabled: true,
                usage_count: 0,
            },
        ];

        lb.configure_provider("test".to_string(), keys).await;

        // Should select based on weights
        let key = lb.select_key("test").await.unwrap();
        assert!(key.key == "key1" || key.key == "key2");
    }

    #[tokio::test]
    async fn test_least_connections() {
        let lb = LoadBalancer::new(LoadBalanceStrategy::LeastConnections);
        let keys = vec![
            ApiKeyConfig {
                key: "key1".to_string(),
                weight: 1,
                enabled: true,
                usage_count: 5,
            },
            ApiKeyConfig {
                key: "key2".to_string(),
                weight: 1,
                enabled: true,
                usage_count: 2,
            },
        ];

        lb.configure_provider("test".to_string(), keys).await;

        let key = lb.select_key("test").await.unwrap();
        assert_eq!(key.key, "key2"); // Should select key with lower usage
    }
}
