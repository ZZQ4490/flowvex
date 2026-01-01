use std::time::Duration;
use tokio::time::sleep;

/// Retry policy for handling failed API requests
#[derive(Debug, Clone)]
pub struct RetryPolicy {
    pub max_retries: u32,
    pub initial_delay: Duration,
    pub max_delay: Duration,
    pub backoff_multiplier: f64,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(30),
            backoff_multiplier: 2.0,
        }
    }
}

impl RetryPolicy {
    pub fn new(
        max_retries: u32,
        initial_delay: Duration,
        max_delay: Duration,
        backoff_multiplier: f64,
    ) -> Self {
        Self {
            max_retries,
            initial_delay,
            max_delay,
            backoff_multiplier,
        }
    }

    /// Calculate delay for a given retry attempt
    pub fn calculate_delay(&self, attempt: u32) -> Duration {
        if attempt == 0 {
            return Duration::from_secs(0);
        }

        let delay_ms = self.initial_delay.as_millis() as f64
            * self.backoff_multiplier.powi((attempt - 1) as i32);

        let delay = Duration::from_millis(delay_ms as u64);
        delay.min(self.max_delay)
    }

    /// Execute a function with retry logic
    pub async fn execute<F, Fut, T, E>(&self, mut f: F) -> Result<T, E>
    where
        F: FnMut() -> Fut,
        Fut: std::future::Future<Output = Result<T, E>>,
        E: std::fmt::Display,
    {
        let mut attempt = 0;

        loop {
            match f().await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    attempt += 1;
                    if attempt > self.max_retries {
                        return Err(e);
                    }

                    let delay = self.calculate_delay(attempt);
                    tracing::warn!(
                        "Attempt {} failed: {}. Retrying in {:?}...",
                        attempt,
                        e,
                        delay
                    );
                    sleep(delay).await;
                }
            }
        }
    }

    /// Check if an error is retryable
    pub fn is_retryable(status_code: u16) -> bool {
        matches!(
            status_code,
            408 | 429 | 500 | 502 | 503 | 504 | 509 | 598 | 599
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_delay() {
        let policy = RetryPolicy::default();

        assert_eq!(policy.calculate_delay(0), Duration::from_secs(0));
        assert_eq!(policy.calculate_delay(1), Duration::from_millis(100));
        assert_eq!(policy.calculate_delay(2), Duration::from_millis(200));
        assert_eq!(policy.calculate_delay(3), Duration::from_millis(400));
    }

    #[test]
    fn test_max_delay() {
        let policy = RetryPolicy {
            max_retries: 10,
            initial_delay: Duration::from_secs(1),
            max_delay: Duration::from_secs(5),
            backoff_multiplier: 2.0,
        };

        // Should cap at max_delay
        assert_eq!(policy.calculate_delay(10), Duration::from_secs(5));
    }

    #[tokio::test]
    async fn test_execute_success() {
        let policy = RetryPolicy::default();
        let mut attempts = 0;

        let result = policy
            .execute(|| async {
                attempts += 1;
                if attempts < 2 {
                    Err("temporary error")
                } else {
                    Ok(42)
                }
            })
            .await;

        assert_eq!(result, Ok(42));
        assert_eq!(attempts, 2);
    }

    #[tokio::test]
    async fn test_execute_max_retries() {
        let policy = RetryPolicy {
            max_retries: 2,
            initial_delay: Duration::from_millis(1),
            max_delay: Duration::from_secs(1),
            backoff_multiplier: 2.0,
        };

        let mut attempts = 0;
        let result = policy
            .execute(|| async {
                attempts += 1;
                Err::<i32, _>("persistent error")
            })
            .await;

        assert!(result.is_err());
        assert_eq!(attempts, 3); // Initial + 2 retries
    }

    #[test]
    fn test_is_retryable() {
        assert!(RetryPolicy::is_retryable(429)); // Rate limit
        assert!(RetryPolicy::is_retryable(500)); // Server error
        assert!(RetryPolicy::is_retryable(503)); // Service unavailable
        assert!(!RetryPolicy::is_retryable(400)); // Bad request
        assert!(!RetryPolicy::is_retryable(404)); // Not found
    }
}

