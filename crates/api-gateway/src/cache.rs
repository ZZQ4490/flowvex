use common::types::{ApiResponse, CachedResponse};
use chrono::Utc;
use moka::future::Cache;
use std::time::Duration;

/// Response cache using moka for in-memory caching
pub struct ResponseCache {
    cache: Cache<String, CachedResponse>,
}

impl ResponseCache {
    /// Create a new response cache with specified capacity
    pub fn new(max_capacity: u64, default_ttl: Duration) -> Self {
        let cache = Cache::builder()
            .max_capacity(max_capacity)
            .time_to_live(default_ttl)
            .build();

        Self { cache }
    }

    /// Generate cache key from provider, endpoint, and request parameters
    pub fn generate_key(provider: &str, endpoint: &str, method: &str, body: &str) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(provider.as_bytes());
        hasher.update(endpoint.as_bytes());
        hasher.update(method.as_bytes());
        hasher.update(body.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    /// Get cached response if available and not expired
    pub async fn get(&self, key: &str) -> Option<ApiResponse> {
        let cached = self.cache.get(key).await?;

        if cached.is_expired() {
            self.cache.invalidate(key).await;
            return None;
        }

        Some(cached.response)
    }

    /// Store response in cache with TTL
    pub async fn set(&self, key: String, response: ApiResponse, ttl: Duration) {
        let cached = CachedResponse {
            response,
            cached_at: Utc::now(),
            ttl,
        };

        self.cache.insert(key, cached).await;
    }

    /// Invalidate a specific cache entry
    pub async fn invalidate(&self, key: &str) {
        self.cache.invalidate(key).await;
    }

    /// Invalidate all cache entries for a provider
    pub async fn invalidate_provider(&self, _provider: &str) {
        // Note: moka doesn't support prefix-based invalidation
        // In production, consider using Redis with pattern matching
        self.cache.invalidate_all();
    }

    /// Get cache statistics
    pub async fn stats(&self) -> CacheStats {
        CacheStats {
            entry_count: self.cache.entry_count(),
            weighted_size: self.cache.weighted_size(),
        }
    }

    /// Clear all cache entries
    pub async fn clear(&self) {
        self.cache.invalidate_all();
    }
}

#[derive(Debug, Clone)]
pub struct CacheStats {
    pub entry_count: u64,
    pub weighted_size: u64,
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::ApiResponse;
    use std::collections::HashMap;
    use uuid::Uuid;

    #[tokio::test]
    async fn test_cache_set_get() {
        let cache = ResponseCache::new(100, Duration::from_secs(60));
        let key = ResponseCache::generate_key("openai", "/v1/chat", "POST", "{}");

        let response = ApiResponse {
            request_id: Uuid::new_v4(),
            status_code: 200,
            headers: HashMap::new(),
            body: Some(serde_json::json!({"result": "success"})),
            latency_ms: 100,
        };

        cache
            .set(key.clone(), response.clone(), Duration::from_secs(60))
            .await;

        let cached = cache.get(&key).await;
        assert!(cached.is_some());
        assert_eq!(cached.unwrap().status_code, 200);
    }

    #[tokio::test]
    async fn test_cache_expiration() {
        let cache = ResponseCache::new(100, Duration::from_millis(100));
        let key = ResponseCache::generate_key("openai", "/v1/chat", "POST", "{}");

        let response = ApiResponse {
            request_id: Uuid::new_v4(),
            status_code: 200,
            headers: HashMap::new(),
            body: None,
            latency_ms: 100,
        };

        cache
            .set(key.clone(), response, Duration::from_millis(50))
            .await;

        // Should be cached immediately
        assert!(cache.get(&key).await.is_some());

        // Wait for expiration
        tokio::time::sleep(Duration::from_millis(100)).await;

        // Should be expired
        assert!(cache.get(&key).await.is_none());
    }

    #[tokio::test]
    async fn test_cache_invalidate() {
        let cache = ResponseCache::new(100, Duration::from_secs(60));
        let key = ResponseCache::generate_key("openai", "/v1/chat", "POST", "{}");

        let response = ApiResponse {
            request_id: Uuid::new_v4(),
            status_code: 200,
            headers: HashMap::new(),
            body: None,
            latency_ms: 100,
        };

        cache
            .set(key.clone(), response, Duration::from_secs(60))
            .await;
        assert!(cache.get(&key).await.is_some());

        cache.invalidate(&key).await;
        assert!(cache.get(&key).await.is_none());
    }
}
