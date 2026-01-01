use common::types::{ApiRequest, Priority};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::{RwLock, Semaphore};
use uuid::Uuid;

/// Metrics for request pool
#[derive(Debug, Clone, Default)]
pub struct PoolMetrics {
    pub queued: usize,
    pub processing: usize,
    pub completed: usize,
    pub failed: usize,
}

/// Request pool implementation
/// Manages concurrent API requests with priority queuing
pub struct RequestPool {
    /// Priority queues for requests
    queues: Arc<RwLock<HashMap<Priority, VecDeque<ApiRequest>>>>,
    /// Semaphore for concurrency control
    semaphore: Arc<Semaphore>,
    /// Metrics tracking
    metrics: Arc<RwLock<PoolMetrics>>,
    /// Maximum concurrent requests
    #[allow(dead_code)]
    max_concurrent: usize,
}

impl RequestPool {
    /// Create a new request pool
    pub fn new(max_concurrent: usize) -> Self {
        let mut queues = HashMap::new();
        queues.insert(Priority::Critical, VecDeque::new());
        queues.insert(Priority::High, VecDeque::new());
        queues.insert(Priority::Normal, VecDeque::new());
        queues.insert(Priority::Low, VecDeque::new());

        Self {
            queues: Arc::new(RwLock::new(queues)),
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            metrics: Arc::new(RwLock::new(PoolMetrics::default())),
            max_concurrent,
        }
    }

    /// Enqueue a request
    pub async fn enqueue(&self, request: ApiRequest) {
        let mut queues = self.queues.write().await;
        if let Some(queue) = queues.get_mut(&request.priority) {
            queue.push_back(request);
            
            // Update metrics
            let mut metrics = self.metrics.write().await;
            metrics.queued += 1;
        }
    }

    /// Dequeue the next request based on priority
    pub async fn dequeue(&self) -> Option<ApiRequest> {
        let mut queues = self.queues.write().await;
        
        // Process in priority order
        for priority in [Priority::Critical, Priority::High, Priority::Normal, Priority::Low] {
            if let Some(queue) = queues.get_mut(&priority) {
                if let Some(request) = queue.pop_front() {
                    // Update metrics
                    let mut metrics = self.metrics.write().await;
                    metrics.queued = metrics.queued.saturating_sub(1);
                    metrics.processing += 1;
                    
                    return Some(request);
                }
            }
        }
        
        None
    }

    /// Acquire a permit for processing
    pub async fn acquire_permit(&self) -> tokio::sync::SemaphorePermit<'_> {
        self.semaphore.acquire().await.expect("Semaphore closed")
    }

    /// Mark request as completed
    pub async fn mark_completed(&self, _request_id: Uuid) {
        let mut metrics = self.metrics.write().await;
        metrics.processing = metrics.processing.saturating_sub(1);
        metrics.completed += 1;
    }

    /// Mark request as failed
    pub async fn mark_failed(&self, _request_id: Uuid) {
        let mut metrics = self.metrics.write().await;
        metrics.processing = metrics.processing.saturating_sub(1);
        metrics.failed += 1;
    }

    /// Get current metrics
    pub async fn get_metrics(&self) -> PoolMetrics {
        self.metrics.read().await.clone()
    }

    /// Get queue size for a specific priority
    pub async fn get_queue_size(&self, priority: Priority) -> usize {
        let queues = self.queues.read().await;
        queues.get(&priority).map(|q| q.len()).unwrap_or(0)
    }

    /// Get total queue size
    pub async fn get_total_queue_size(&self) -> usize {
        let queues = self.queues.read().await;
        queues.values().map(|q| q.len()).sum()
    }

    /// Check if pool is at capacity
    pub fn is_at_capacity(&self) -> bool {
        self.semaphore.available_permits() == 0
    }

    /// Get available permits
    pub fn available_permits(&self) -> usize {
        self.semaphore.available_permits()
    }

    /// Clear all queues
    pub async fn clear(&self) {
        let mut queues = self.queues.write().await;
        for queue in queues.values_mut() {
            queue.clear();
        }
        
        let mut metrics = self.metrics.write().await;
        metrics.queued = 0;
    }

    /// Get requests by priority
    pub async fn get_requests_by_priority(&self, priority: Priority) -> Vec<ApiRequest> {
        let queues = self.queues.read().await;
        queues.get(&priority)
            .map(|q| q.iter().cloned().collect())
            .unwrap_or_default()
    }
}

impl Default for RequestPool {
    fn default() -> Self {
        Self::new(100) // Default to 100 concurrent requests
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::{HttpMethod, RetryConfig};
    use std::collections::HashMap;

    fn create_test_request(priority: Priority) -> ApiRequest {
        ApiRequest {
            id: Uuid::new_v4(),
            provider: "test".to_string(),
            endpoint: "https://api.test.com".to_string(),
            method: HttpMethod::GET,
            headers: HashMap::new(),
            body: None,
            priority,
            workflow_id: Uuid::new_v4(),
            node_id: Uuid::new_v4(),
            timeout: std::time::Duration::from_secs(30),
            retry_config: RetryConfig::default(),
        }
    }

    #[tokio::test]
    async fn test_enqueue_dequeue() {
        let pool = RequestPool::new(10);
        
        let request = create_test_request(Priority::Normal);
        let request_id = request.id;
        
        pool.enqueue(request).await;
        
        let metrics = pool.get_metrics().await;
        assert_eq!(metrics.queued, 1);
        
        let dequeued = pool.dequeue().await;
        assert!(dequeued.is_some());
        assert_eq!(dequeued.unwrap().id, request_id);
    }

    #[tokio::test]
    async fn test_priority_ordering() {
        let pool = RequestPool::new(10);
        
        // Enqueue in reverse priority order
        pool.enqueue(create_test_request(Priority::Low)).await;
        pool.enqueue(create_test_request(Priority::Normal)).await;
        pool.enqueue(create_test_request(Priority::High)).await;
        pool.enqueue(create_test_request(Priority::Critical)).await;
        
        // Dequeue should return in priority order
        let req1 = pool.dequeue().await.unwrap();
        assert_eq!(req1.priority, Priority::Critical);
        
        let req2 = pool.dequeue().await.unwrap();
        assert_eq!(req2.priority, Priority::High);
        
        let req3 = pool.dequeue().await.unwrap();
        assert_eq!(req3.priority, Priority::Normal);
        
        let req4 = pool.dequeue().await.unwrap();
        assert_eq!(req4.priority, Priority::Low);
    }

    #[tokio::test]
    async fn test_metrics() {
        let pool = RequestPool::new(10);
        
        let request = create_test_request(Priority::Normal);
        let request_id = request.id;
        
        pool.enqueue(request).await;
        pool.dequeue().await;
        pool.mark_completed(request_id).await;
        
        let metrics = pool.get_metrics().await;
        assert_eq!(metrics.completed, 1);
        assert_eq!(metrics.processing, 0);
    }

    #[tokio::test]
    async fn test_concurrency_limit() {
        let pool = RequestPool::new(2);
        
        let _permit1 = pool.acquire_permit().await;
        let _permit2 = pool.acquire_permit().await;
        
        assert!(pool.is_at_capacity());
        assert_eq!(pool.available_permits(), 0);
    }
}
