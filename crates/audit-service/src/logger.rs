use common::types::{AuditLog, AuditAction, AuditResult, ResourceType};
use std::sync::Arc;
use tokio::sync::mpsc;
use uuid::Uuid;

use crate::storage::{AuditStorage, AuditError};

/// Audit logger for creating and logging audit entries
pub struct AuditLogger {
    storage: Arc<AuditStorage>,
    batch_sender: mpsc::UnboundedSender<AuditLog>,
}

impl AuditLogger {
    pub fn new(storage: Arc<AuditStorage>) -> Self {
        let (tx, mut rx) = mpsc::unbounded_channel::<AuditLog>();
        let storage_clone = storage.clone();

        // Spawn background task to batch process logs
        tokio::spawn(async move {
            let mut batch = Vec::new();
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));

            loop {
                tokio::select! {
                    Some(log) = rx.recv() => {
                        batch.push(log);
                        
                        // Flush if batch is large enough
                        if batch.len() >= 100 {
                            if let Err(e) = storage_clone.store_batch(&batch).await {
                                tracing::error!("Failed to store audit logs: {}", e);
                            }
                            batch.clear();
                        }
                    }
                    _ = interval.tick() => {
                        // Flush batch periodically
                        if !batch.is_empty() {
                            if let Err(e) = storage_clone.store_batch(&batch).await {
                                tracing::error!("Failed to store audit logs: {}", e);
                            }
                            batch.clear();
                        }
                    }
                }
            }
        });

        Self {
            storage,
            batch_sender: tx,
        }
    }

    /// Log an audit entry
    pub fn log(&self, log: AuditLog) -> Result<(), AuditError> {
        self.batch_sender
            .send(log)
            .map_err(|e| AuditError::StorageError(e.to_string()))
    }

    /// Log a successful action
    pub fn log_success(
        &self,
        user_id: Uuid,
        action: AuditAction,
        resource_type: ResourceType,
        resource_id: Uuid,
        ip_address: String,
        user_agent: String,
    ) -> Result<(), AuditError> {
        let log = AuditLog::new(
            user_id,
            action,
            resource_type,
            resource_id,
            ip_address,
            user_agent,
            AuditResult::Success,
        );

        self.log(log)
    }

    /// Log a failed action
    pub fn log_failure(
        &self,
        user_id: Uuid,
        action: AuditAction,
        resource_type: ResourceType,
        resource_id: Uuid,
        ip_address: String,
        user_agent: String,
        error: String,
    ) -> Result<(), AuditError> {
        let log = AuditLog::new(
            user_id,
            action,
            resource_type,
            resource_id,
            ip_address,
            user_agent,
            AuditResult::Failure(error),
        );

        self.log(log)
    }

    /// Log a denied action
    pub fn log_denied(
        &self,
        user_id: Uuid,
        action: AuditAction,
        resource_type: ResourceType,
        resource_id: Uuid,
        ip_address: String,
        user_agent: String,
    ) -> Result<(), AuditError> {
        let log = AuditLog::new(
            user_id,
            action,
            resource_type,
            resource_id,
            ip_address,
            user_agent,
            AuditResult::Denied,
        );

        self.log(log)
    }

    /// Log immediately without batching (for critical events)
    pub async fn log_immediate(&self, log: AuditLog) -> Result<(), AuditError> {
        self.storage.store(&log).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::PgPool;

    #[tokio::test]
    async fn test_audit_logger() {
        let pool = PgPool::connect_lazy("postgresql://localhost/test").unwrap();
        let storage = Arc::new(AuditStorage::new(pool));
        let logger = AuditLogger::new(storage);

        let result = logger.log_success(
            Uuid::new_v4(),
            AuditAction::Create,
            ResourceType::Workflow,
            Uuid::new_v4(),
            "127.0.0.1".to_string(),
            "test-agent".to_string(),
        );

        assert!(result.is_ok());
    }
}

