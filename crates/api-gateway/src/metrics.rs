use common::types::ProviderMetrics;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// Metrics collector for API Gateway
pub struct MetricsCollector {
    providers: Arc<RwLock<HashMap<String, ProviderMetricsData>>>,
}

#[derive(Debug, Clone)]
struct ProviderMetricsData {
    total_requests: u64,
    successful_requests: u64,
    failed_requests: u64,
    latencies: Vec<u64>,
    total_cost: f64,
    #[allow(dead_code)]
    last_reset: Instant,
}

impl Default for ProviderMetricsData {
    fn default() -> Self {
        Self {
            total_requests: 0,
            successful_requests: 0,
            failed_requests: 0,
            latencies: Vec::new(),
            total_cost: 0.0,
            last_reset: Instant::now(),
        }
    }
}

impl MetricsCollector {
    pub fn new() -> Self {
        Self {
            providers: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Record a successful request
    pub async fn record_success(&self, provider: &str, latency_ms: u64, cost: f64) {
        let mut providers = self.providers.write().await;
        let metrics = providers.entry(provider.to_string()).or_default();

        metrics.total_requests += 1;
        metrics.successful_requests += 1;
        metrics.latencies.push(latency_ms);
        metrics.total_cost += cost;

        // Keep only last 1000 latencies to avoid memory growth
        if metrics.latencies.len() > 1000 {
            metrics.latencies.drain(0..500);
        }
    }

    /// Record a failed request
    pub async fn record_failure(&self, provider: &str, latency_ms: u64) {
        let mut providers = self.providers.write().await;
        let metrics = providers.entry(provider.to_string()).or_default();

        metrics.total_requests += 1;
        metrics.failed_requests += 1;
        metrics.latencies.push(latency_ms);

        if metrics.latencies.len() > 1000 {
            metrics.latencies.drain(0..500);
        }
    }

    /// Get metrics for a specific provider
    pub async fn get_metrics(&self, provider: &str) -> Option<ProviderMetrics> {
        let providers = self.providers.read().await;
        let data = providers.get(provider)?;

        let average_latency_ms = if data.latencies.is_empty() {
            0.0
        } else {
            data.latencies.iter().sum::<u64>() as f64 / data.latencies.len() as f64
        };

        let error_rate = if data.total_requests > 0 {
            data.failed_requests as f64 / data.total_requests as f64
        } else {
            0.0
        };

        Some(ProviderMetrics {
            provider: provider.to_string(),
            total_requests: data.total_requests,
            successful_requests: data.successful_requests,
            failed_requests: data.failed_requests,
            average_latency_ms,
            error_rate,
            total_cost: data.total_cost,
        })
    }

    /// Get metrics for all providers
    pub async fn get_all_metrics(&self) -> Vec<ProviderMetrics> {
        let providers = self.providers.read().await;
        let mut metrics = Vec::new();

        for (provider, data) in providers.iter() {
            let average_latency_ms = if data.latencies.is_empty() {
                0.0
            } else {
                data.latencies.iter().sum::<u64>() as f64 / data.latencies.len() as f64
            };

            let error_rate = if data.total_requests > 0 {
                data.failed_requests as f64 / data.total_requests as f64
            } else {
                0.0
            };

            metrics.push(ProviderMetrics {
                provider: provider.clone(),
                total_requests: data.total_requests,
                successful_requests: data.successful_requests,
                failed_requests: data.failed_requests,
                average_latency_ms,
                error_rate,
                total_cost: data.total_cost,
            });
        }

        metrics
    }

    /// Reset metrics for a provider
    pub async fn reset_provider(&self, provider: &str) {
        let mut providers = self.providers.write().await;
        providers.remove(provider);
    }

    /// Reset all metrics
    pub async fn reset_all(&self) {
        let mut providers = self.providers.write().await;
        providers.clear();
    }

    /// Get metrics summary
    pub async fn get_summary(&self) -> MetricsSummary {
        let providers = self.providers.read().await;

        let mut total_requests = 0;
        let mut total_successful = 0;
        let mut total_failed = 0;
        let mut total_cost = 0.0;
        let mut all_latencies = Vec::new();

        for data in providers.values() {
            total_requests += data.total_requests;
            total_successful += data.successful_requests;
            total_failed += data.failed_requests;
            total_cost += data.total_cost;
            all_latencies.extend(&data.latencies);
        }

        let average_latency_ms = if all_latencies.is_empty() {
            0.0
        } else {
            all_latencies.iter().sum::<u64>() as f64 / all_latencies.len() as f64
        };

        let error_rate = if total_requests > 0 {
            total_failed as f64 / total_requests as f64
        } else {
            0.0
        };

        MetricsSummary {
            total_requests,
            successful_requests: total_successful,
            failed_requests: total_failed,
            average_latency_ms,
            error_rate,
            total_cost,
            provider_count: providers.len(),
        }
    }

    /// Start periodic metrics cleanup task
    pub fn start_cleanup_task(self: Arc<Self>, interval: Duration) {
        tokio::spawn(async move {
            let mut interval_timer = tokio::time::interval(interval);
            loop {
                interval_timer.tick().await;
                self.cleanup_old_metrics().await;
            }
        });
    }

    /// Clean up old metrics data
    async fn cleanup_old_metrics(&self) {
        let mut providers = self.providers.write().await;
        for data in providers.values_mut() {
            // Keep only recent latencies
            if data.latencies.len() > 1000 {
                data.latencies.drain(0..data.latencies.len() - 1000);
            }
        }
    }
}

impl Default for MetricsCollector {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Clone)]
pub struct MetricsSummary {
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub average_latency_ms: f64,
    pub error_rate: f64,
    pub total_cost: f64,
    pub provider_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_record_success() {
        let collector = MetricsCollector::new();
        collector.record_success("openai", 100, 0.01).await;
        collector.record_success("openai", 200, 0.02).await;

        let metrics = collector.get_metrics("openai").await.unwrap();
        assert_eq!(metrics.total_requests, 2);
        assert_eq!(metrics.successful_requests, 2);
        assert_eq!(metrics.failed_requests, 0);
        assert_eq!(metrics.total_cost, 0.03);
    }

    #[tokio::test]
    async fn test_record_failure() {
        let collector = MetricsCollector::new();
        collector.record_success("openai", 100, 0.01).await;
        collector.record_failure("openai", 150).await;

        let metrics = collector.get_metrics("openai").await.unwrap();
        assert_eq!(metrics.total_requests, 2);
        assert_eq!(metrics.successful_requests, 1);
        assert_eq!(metrics.failed_requests, 1);
        assert_eq!(metrics.error_rate, 0.5);
    }

    #[tokio::test]
    async fn test_average_latency() {
        let collector = MetricsCollector::new();
        collector.record_success("openai", 100, 0.01).await;
        collector.record_success("openai", 200, 0.01).await;
        collector.record_success("openai", 300, 0.01).await;

        let metrics = collector.get_metrics("openai").await.unwrap();
        assert_eq!(metrics.average_latency_ms, 200.0);
    }

    #[tokio::test]
    async fn test_summary() {
        let collector = MetricsCollector::new();
        collector.record_success("openai", 100, 0.01).await;
        collector.record_success("anthropic", 150, 0.02).await;
        collector.record_failure("openai", 200).await;

        let summary = collector.get_summary().await;
        assert_eq!(summary.total_requests, 3);
        assert_eq!(summary.successful_requests, 2);
        assert_eq!(summary.failed_requests, 1);
        assert_eq!(summary.provider_count, 2);
    }
}
