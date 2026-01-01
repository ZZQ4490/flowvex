use common::types::{ApiRequest, ApiResponse};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, FromRow, Row};
use uuid::Uuid;

/// API request logger for persisting request/response data
pub struct ApiLogger {
    pool: PgPool,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ApiRequestLog {
    pub id: Uuid,
    pub provider: String,
    pub endpoint: String,
    pub method: String,
    pub status_code: Option<i32>,
    pub latency_ms: Option<i64>,
    pub request_size: Option<i32>,
    pub response_size: Option<i32>,
    pub workflow_id: Uuid,
    pub node_id: Uuid,
    pub cached: bool,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl ApiLogger {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Log a successful API request
    pub async fn log_success(
        &self,
        request: &ApiRequest,
        response: &ApiResponse,
        cached: bool,
    ) -> Result<(), sqlx::Error> {
        let request_size = request
            .body
            .as_ref()
            .map(|b| serde_json::to_string(b).unwrap_or_default().len() as i32);

        let response_size = response
            .body
            .as_ref()
            .map(|b| serde_json::to_string(b).unwrap_or_default().len() as i32);

        sqlx::query(
            r#"
            INSERT INTO api_request_logs (
                id, provider, endpoint, method, status_code, latency_ms,
                request_size, response_size, workflow_id, node_id, cached,
                error_message, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&request.provider)
        .bind(&request.endpoint)
        .bind(format!("{:?}", request.method))
        .bind(Some(response.status_code as i32))
        .bind(Some(response.latency_ms as i64))
        .bind(request_size)
        .bind(response_size)
        .bind(request.workflow_id)
        .bind(request.node_id)
        .bind(cached)
        .bind(None::<String>)
        .bind(Utc::now())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Log a failed API request
    pub async fn log_failure(
        &self,
        request: &ApiRequest,
        error: &str,
        latency_ms: u64,
    ) -> Result<(), sqlx::Error> {
        let request_size = request
            .body
            .as_ref()
            .map(|b| serde_json::to_string(b).unwrap_or_default().len() as i32);

        sqlx::query(
            r#"
            INSERT INTO api_request_logs (
                id, provider, endpoint, method, status_code, latency_ms,
                request_size, response_size, workflow_id, node_id, cached,
                error_message, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&request.provider)
        .bind(&request.endpoint)
        .bind(format!("{:?}", request.method))
        .bind(None::<i32>)
        .bind(Some(latency_ms as i64))
        .bind(request_size)
        .bind(None::<i32>)
        .bind(request.workflow_id)
        .bind(request.node_id)
        .bind(false)
        .bind(Some(error.to_string()))
        .bind(Utc::now())
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Query logs with filters
    pub async fn query_logs(
        &self,
        filter: LogFilter,
    ) -> Result<Vec<ApiRequestLog>, sqlx::Error> {
        let mut query = String::from(
            "SELECT id, provider, endpoint, method, status_code, latency_ms, 
             request_size, response_size, workflow_id, node_id, cached, 
             error_message, created_at FROM api_request_logs WHERE 1=1"
        );

        if let Some(provider) = &filter.provider {
            query.push_str(&format!(" AND provider = '{}'", provider));
        }

        if let Some(workflow_id) = filter.workflow_id {
            query.push_str(&format!(" AND workflow_id = '{}'", workflow_id));
        }

        if let Some(start_time) = filter.start_time {
            query.push_str(&format!(" AND created_at >= '{}'", start_time));
        }

        if let Some(end_time) = filter.end_time {
            query.push_str(&format!(" AND created_at <= '{}'", end_time));
        }

        if filter.errors_only {
            query.push_str(" AND error_message IS NOT NULL");
        }

        query.push_str(&format!(" ORDER BY created_at DESC LIMIT {}", filter.limit));

        let logs = sqlx::query_as::<_, ApiRequestLog>(&query)
            .fetch_all(&self.pool)
            .await?;

        Ok(logs)
    }

    /// Get statistics for a provider
    pub async fn get_provider_stats(
        &self,
        provider: &str,
        start_time: DateTime<Utc>,
    ) -> Result<ProviderStats, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN error_message IS NULL THEN 1 END) as successful_requests,
                COUNT(CASE WHEN error_message IS NOT NULL THEN 1 END) as failed_requests,
                AVG(latency_ms) as avg_latency_ms,
                SUM(request_size) as total_request_size,
                SUM(response_size) as total_response_size
            FROM api_request_logs
            WHERE provider = $1 AND created_at >= $2
            "#,
        )
        .bind(provider)
        .bind(start_time)
        .fetch_one(&self.pool)
        .await?;

        Ok(ProviderStats {
            total_requests: row.get("total_requests"),
            successful_requests: row.get("successful_requests"),
            failed_requests: row.get("failed_requests"),
            avg_latency_ms: row.get("avg_latency_ms"),
            total_request_size: row.get("total_request_size"),
            total_response_size: row.get("total_response_size"),
        })
    }

    /// Delete old logs (for cleanup)
    pub async fn delete_old_logs(&self, before: DateTime<Utc>) -> Result<u64, sqlx::Error> {
        let result = sqlx::query("DELETE FROM api_request_logs WHERE created_at < $1")
            .bind(before)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected())
    }
}

#[derive(Debug, Clone)]
pub struct LogFilter {
    pub provider: Option<String>,
    pub workflow_id: Option<Uuid>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub errors_only: bool,
    pub limit: i64,
}

impl Default for LogFilter {
    fn default() -> Self {
        Self {
            provider: None,
            workflow_id: None,
            start_time: None,
            end_time: None,
            errors_only: false,
            limit: 100,
        }
    }
}

#[derive(Debug, Clone)]
pub struct ProviderStats {
    pub total_requests: i64,
    pub successful_requests: i64,
    pub failed_requests: i64,
    pub avg_latency_ms: Option<f64>,
    pub total_request_size: Option<i64>,
    pub total_response_size: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: These tests require a database connection
    // In a real implementation, you would use a test database

    #[test]
    fn test_log_filter_default() {
        let filter = LogFilter::default();
        assert_eq!(filter.limit, 100);
        assert!(!filter.errors_only);
    }
}
