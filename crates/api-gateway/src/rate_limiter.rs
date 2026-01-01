use common::types::RateLimitConfig;
use common::error::GatewayError;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

/// Token bucket for rate limiting
#[derive(Debug, Clone)]
struct TokenBucket {
    tokens: f64,
    capacity: f64,
    refill_rate: f64, // tokens per second
    last_refill: Instant,
}

impl TokenBucket {
    fn new(capacity: u32, refill_rate: u32) -> Self {
        Self {
            tokens: capacity as f64,
            capacity: capacity as f64,
            refill_rate: refill_rate as f64,
            last_refill: Instant::now(),
        }
    }

    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();
        
        let new_tokens = elapsed * self.refill_rate;
        self.tokens = (self.tokens + new_tokens).min(self.capacity);
        self.last_refill = now;
    }

    fn try_consume(&mut self, tokens: f64) -> bool {
        self.refill();
        
        if self.tokens >= tokens {
            self.tokens -= tokens;
            true
        } else {
            false
        }
    }

    fn available_tokens(&mut self) -> f64 {
        self.refill();
        self.tokens
    }
}

/// Rate limiter implementation
/// Implements token bucket algorithm with per-second, per-minute, and per-hour limits
pub struct RateLimiter {
    /// Rate limit configurations per provider
    configs: Arc<RwLock<HashMap<String, RateLimitConfig>>>,
    /// Token buckets per provider (second, minute, hour)
    buckets: Arc<RwLock<HashMap<String, (TokenBucket, TokenBucket, TokenBucket)>>>,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            configs: Arc::new(RwLock::new(HashMap::new())),
            buckets: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Configure rate limits for a provider
    pub async fn configure(&self, provider: String, config: RateLimitConfig) {
        let mut configs = self.configs.write().await;
        configs.insert(provider.clone(), config.clone());

        // Initialize token buckets
        let mut buckets = self.buckets.write().await;
        buckets.insert(
            provider,
            (
                TokenBucket::new(config.requests_per_second, config.requests_per_second),
                TokenBucket::new(config.requests_per_minute, config.requests_per_minute / 60),
                TokenBucket::new(config.requests_per_hour, config.requests_per_hour / 3600),
            ),
        );
    }

    /// Check if a request can proceed
    pub async fn check_limit(&self, provider: &str) -> Result<(), GatewayError> {
        let mut buckets = self.buckets.write().await;
        
        if let Some((second_bucket, minute_bucket, hour_bucket)) = buckets.get_mut(provider) {
            // Check all three buckets
            if !second_bucket.try_consume(1.0) {
                return Err(GatewayError::RateLimitExceeded(format!(
                    "{} (per-second limit)",
                    provider
                )));
            }
            
            if !minute_bucket.try_consume(1.0) {
                // Refund the second bucket token
                second_bucket.tokens += 1.0;
                return Err(GatewayError::RateLimitExceeded(format!(
                    "{} (per-minute limit)",
                    provider
                )));
            }
            
            if !hour_bucket.try_consume(1.0) {
                // Refund tokens
                second_bucket.tokens += 1.0;
                minute_bucket.tokens += 1.0;
                return Err(GatewayError::RateLimitExceeded(format!(
                    "{} (per-hour limit)",
                    provider
                )));
            }
            
            Ok(())
        } else {
            // No rate limit configured, allow request
            Ok(())
        }
    }

    /// Get available tokens for a provider
    pub async fn get_available_tokens(&self, provider: &str) -> Option<(f64, f64, f64)> {
        let mut buckets = self.buckets.write().await;
        
        buckets.get_mut(provider).map(|(second, minute, hour)| {
            (
                second.available_tokens(),
                minute.available_tokens(),
                hour.available_tokens(),
            )
        })
    }

    /// Wait until rate limit allows request
    pub async fn wait_for_capacity(&self, provider: &str) -> Result<(), GatewayError> {
        let max_wait = Duration::from_secs(60);
        let start = Instant::now();
        
        loop {
            if self.check_limit(provider).await.is_ok() {
                return Ok(());
            }
            
            if start.elapsed() > max_wait {
                return Err(GatewayError::Timeout(max_wait.as_millis() as u64));
            }
            
            // Wait a bit before retrying
            tokio::time::sleep(Duration::from_millis(100)).await;
        }
    }

    /// Reset rate limits for a provider
    pub async fn reset(&self, provider: &str) {
        let configs = self.configs.read().await;
        if let Some(config) = configs.get(provider) {
            let mut buckets = self.buckets.write().await;
            buckets.insert(
                provider.to_string(),
                (
                    TokenBucket::new(config.requests_per_second, config.requests_per_second),
                    TokenBucket::new(config.requests_per_minute, config.requests_per_minute / 60),
                    TokenBucket::new(config.requests_per_hour, config.requests_per_hour / 3600),
                ),
            );
        }
    }

    /// Get rate limit configuration for a provider
    pub async fn get_config(&self, provider: &str) -> Option<RateLimitConfig> {
        let configs = self.configs.read().await;
        configs.get(provider).cloned()
    }

    /// Remove rate limit configuration
    pub async fn remove_config(&self, provider: &str) {
        let mut configs = self.configs.write().await;
        configs.remove(provider);
        
        let mut buckets = self.buckets.write().await;
        buckets.remove(provider);
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limit_basic() {
        let limiter = RateLimiter::new();
        
        let config = RateLimitConfig {
            requests_per_second: 2,
            requests_per_minute: 10,
            requests_per_hour: 100,
            concurrent_limit: 5,
        };
        
        limiter.configure("test_provider".to_string(), config).await;
        
        // First two requests should succeed
        assert!(limiter.check_limit("test_provider").await.is_ok());
        assert!(limiter.check_limit("test_provider").await.is_ok());
        
        // Third request should fail (per-second limit)
        assert!(limiter.check_limit("test_provider").await.is_err());
    }

    #[tokio::test]
    async fn test_token_refill() {
        let limiter = RateLimiter::new();
        
        let config = RateLimitConfig {
            requests_per_second: 1,
            requests_per_minute: 60,
            requests_per_hour: 3600,
            concurrent_limit: 5,
        };
        
        limiter.configure("test_provider".to_string(), config).await;
        
        // Consume token
        assert!(limiter.check_limit("test_provider").await.is_ok());
        
        // Should fail immediately
        assert!(limiter.check_limit("test_provider").await.is_err());
        
        // Wait for refill
        tokio::time::sleep(Duration::from_secs(1)).await;
        
        // Should succeed after refill
        assert!(limiter.check_limit("test_provider").await.is_ok());
    }

    #[tokio::test]
    async fn test_get_available_tokens() {
        let limiter = RateLimiter::new();
        
        let config = RateLimitConfig {
            requests_per_second: 10,
            requests_per_minute: 100,
            requests_per_hour: 1000,
            concurrent_limit: 5,
        };
        
        limiter.configure("test_provider".to_string(), config).await;
        
        let tokens = limiter.get_available_tokens("test_provider").await;
        assert!(tokens.is_some());
        
        let (second, minute, hour) = tokens.unwrap();
        assert!(second > 0.0);
        assert!(minute > 0.0);
        assert!(hour > 0.0);
    }

    #[tokio::test]
    async fn test_reset() {
        let limiter = RateLimiter::new();
        
        let config = RateLimitConfig {
            requests_per_second: 1,
            requests_per_minute: 10,
            requests_per_hour: 100,
            concurrent_limit: 5,
        };
        
        limiter.configure("test_provider".to_string(), config).await;
        
        // Consume token
        assert!(limiter.check_limit("test_provider").await.is_ok());
        assert!(limiter.check_limit("test_provider").await.is_err());
        
        // Reset
        limiter.reset("test_provider").await;
        
        // Should succeed after reset
        assert!(limiter.check_limit("test_provider").await.is_ok());
    }
}
