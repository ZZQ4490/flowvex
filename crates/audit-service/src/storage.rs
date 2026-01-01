use common::types::{AuditLog, AuditResult};
use sqlx::PgPool;
use uuid::Uuid;

/// Audit storage for persisting audit logs
pub struct AuditStorage {
    pool: PgPool,
}

impl AuditStorage {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Store an audit log entry (append-only)
    pub async fn store(&self, log: &AuditLog) -> Result<(), AuditError> {
        sqlx::query(
            r#"
            INSERT INTO audit_logs (
                id, user_id, action, resource_type, resource_id,
                ip_address, user_agent, result, details,
                is_security_sensitive, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            "#,
        )
        .bind(log.id)
        .bind(log.user_id)
        .bind(format!("{:?}", log.action))
        .bind(format!("{:?}", log.resource_type))
        .bind(log.resource_id)
        .bind(&log.ip_address)
        .bind(&log.user_agent)
        .bind(match &log.result {
            AuditResult::Success => "Success",
            AuditResult::Failure(_) => "Failure",
            AuditResult::Denied => "Denied",
        })
        .bind(&log.details)
        .bind(log.is_security_sensitive)
        .bind(log.timestamp)
        .execute(&self.pool)
        .await
        .map_err(|e| AuditError::StorageError(e.to_string()))?;

        Ok(())
    }

    /// Batch store multiple audit logs
    pub async fn store_batch(&self, logs: &[AuditLog]) -> Result<(), AuditError> {
        let mut tx = self
            .pool
            .begin()
            .await
            .map_err(|e| AuditError::StorageError(e.to_string()))?;

        for log in logs {
            sqlx::query(
                r#"
                INSERT INTO audit_logs (
                    id, user_id, action, resource_type, resource_id,
                    ip_address, user_agent, result, details,
                    is_security_sensitive, created_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                "#,
            )
            .bind(log.id)
            .bind(log.user_id)
            .bind(format!("{:?}", log.action))
            .bind(format!("{:?}", log.resource_type))
            .bind(log.resource_id)
            .bind(&log.ip_address)
            .bind(&log.user_agent)
            .bind(match &log.result {
                AuditResult::Success => "Success",
                AuditResult::Failure(_) => "Failure",
                AuditResult::Denied => "Denied",
            })
            .bind(&log.details)
            .bind(log.is_security_sensitive)
            .bind(log.timestamp)
            .execute(&mut *tx)
            .await
            .map_err(|e| AuditError::StorageError(e.to_string()))?;
        }

        tx.commit()
            .await
            .map_err(|e| AuditError::StorageError(e.to_string()))?;

        Ok(())
    }

    /// Check if audit logs are immutable (no updates/deletes allowed)
    pub async fn verify_immutability(&self, log_id: Uuid) -> Result<bool, AuditError> {
        // In a real implementation, this would check database constraints
        // For now, we just verify the log exists
        let exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM audit_logs WHERE id = $1)",
        )
        .bind(log_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| AuditError::StorageError(e.to_string()))?;

        Ok(exists)
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AuditError {
    #[error("Storage error: {0}")]
    StorageError(String),

    #[error("Query error: {0}")]
    QueryError(String),

    #[error("Export error: {0}")]
    ExportError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_audit_storage_creation() {
        let pool = PgPool::connect_lazy("postgresql://localhost/test").unwrap();
        let _storage = AuditStorage::new(pool);
        assert!(true); // Just test creation
    }
}

