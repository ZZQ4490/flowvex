use common::types::{AuditLog, AuditFilter, ExportFormat};

use crate::{query::AuditQuery, storage::AuditError};

/// Audit exporter for exporting logs in various formats
pub struct AuditExporter {
    query: AuditQuery,
}

impl AuditExporter {
    pub fn new(query: AuditQuery) -> Self {
        Self { query }
    }

    /// Export audit logs in the specified format
    pub async fn export(
        &self,
        filter: AuditFilter,
        format: ExportFormat,
    ) -> Result<Vec<u8>, AuditError> {
        let logs = self.query.query(filter).await?;

        match format {
            ExportFormat::Json => self.export_json(&logs),
            ExportFormat::Csv => self.export_csv(&logs),
        }
    }

    /// Export logs as JSON
    fn export_json(&self, logs: &[AuditLog]) -> Result<Vec<u8>, AuditError> {
        serde_json::to_vec_pretty(logs)
            .map_err(|e| AuditError::ExportError(e.to_string()))
    }

    /// Export logs as CSV
    fn export_csv(&self, logs: &[AuditLog]) -> Result<Vec<u8>, AuditError> {
        let mut wtr = csv::Writer::from_writer(vec![]);

        // Write header
        wtr.write_record(&[
            "id",
            "user_id",
            "action",
            "resource_type",
            "resource_id",
            "ip_address",
            "user_agent",
            "timestamp",
            "result",
            "is_security_sensitive",
        ])
        .map_err(|e| AuditError::ExportError(e.to_string()))?;

        // Write data
        for log in logs {
            wtr.write_record(&[
                log.id.to_string(),
                log.user_id.to_string(),
                format!("{:?}", log.action),
                format!("{:?}", log.resource_type),
                log.resource_id.to_string(),
                log.ip_address.clone(),
                log.user_agent.clone(),
                log.timestamp.to_rfc3339(),
                match &log.result {
                    common::types::AuditResult::Success => "Success".to_string(),
                    common::types::AuditResult::Failure(e) => format!("Failure: {}", e),
                    common::types::AuditResult::Denied => "Denied".to_string(),
                },
                log.is_security_sensitive.to_string(),
            ])
            .map_err(|e| AuditError::ExportError(e.to_string()))?;
        }

        wtr.into_inner()
            .map_err(|e| AuditError::ExportError(e.to_string()))
    }

    /// Export to file
    pub async fn export_to_file(
        &self,
        filter: AuditFilter,
        format: ExportFormat,
        path: &str,
    ) -> Result<(), AuditError> {
        let data = self.export(filter, format).await?;
        
        std::fs::write(path, data)
            .map_err(|e| AuditError::ExportError(e.to_string()))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn test_export_json() {
        let logs = vec![AuditLog::new(
            Uuid::new_v4(),
            common::types::AuditAction::Create,
            common::types::ResourceType::Workflow,
            Uuid::new_v4(),
            "127.0.0.1".to_string(),
            "test-agent".to_string(),
            common::types::AuditResult::Success,
        )];

        let query = AuditQuery::new(sqlx::PgPool::connect_lazy("postgresql://localhost/test").unwrap());
        let exporter = AuditExporter::new(query);
        let result = exporter.export_json(&logs);

        assert!(result.is_ok());
    }

    #[test]
    fn test_export_csv() {
        let logs = vec![AuditLog::new(
            Uuid::new_v4(),
            common::types::AuditAction::Create,
            common::types::ResourceType::Workflow,
            Uuid::new_v4(),
            "127.0.0.1".to_string(),
            "test-agent".to_string(),
            common::types::AuditResult::Success,
        )];

        let query = AuditQuery::new(sqlx::PgPool::connect_lazy("postgresql://localhost/test").unwrap());
        let exporter = AuditExporter::new(query);
        let result = exporter.export_csv(&logs);

        assert!(result.is_ok());
    }
}

