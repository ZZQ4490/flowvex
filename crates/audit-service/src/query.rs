use common::types::{AuditLog, AuditFilter};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::storage::AuditError;

/// Audit query for searching and filtering audit logs
pub struct AuditQuery {
    pool: PgPool,
}

impl AuditQuery {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    /// Query audit logs with filters
    pub async fn query(&self, filter: AuditFilter) -> Result<Vec<AuditLog>, AuditError> {
        let mut query = String::from(
            "SELECT id, user_id, action, resource_type, resource_id, 
             ip_address, user_agent, timestamp, result, details, 
             is_security_sensitive FROM audit_logs WHERE 1=1"
        );

        if let Some(user_id) = filter.user_id {
            query.push_str(&format!(" AND user_id = '{}'", user_id));
        }

        if let Some(action) = filter.action {
            query.push_str(&format!(" AND action = '{:?}'", action));
        }

        if let Some(resource_type) = filter.resource_type {
            query.push_str(&format!(" AND resource_type = '{:?}'", resource_type));
        }

        if let Some(start_time) = filter.start_time {
            query.push_str(&format!(" AND timestamp >= '{}'", start_time));
        }

        if let Some(end_time) = filter.end_time {
            query.push_str(&format!(" AND timestamp <= '{}'", end_time));
        }

        if filter.security_only {
            query.push_str(" AND is_security_sensitive = true");
        }

        query.push_str(" ORDER BY timestamp DESC LIMIT 1000");

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| AuditError::QueryError(e.to_string()))?;

        let logs = rows
            .into_iter()
            .map(|row| {
                let result_str: String = row.get("result");
                let result = match result_str.as_str() {
                    "Success" => common::types::AuditResult::Success,
                    "Denied" => common::types::AuditResult::Denied,
                    _ => common::types::AuditResult::Failure("Unknown".to_string()),
                };

                AuditLog {
                    id: row.get("id"),
                    user_id: row.get("user_id"),
                    action: parse_audit_action(row.get("action")),
                    resource_type: parse_resource_type(row.get("resource_type")),
                    resource_id: row.get("resource_id"),
                    ip_address: row.get("ip_address"),
                    user_agent: row.get("user_agent"),
                    timestamp: row.get("timestamp"),
                    result,
                    details: row.get("details"),
                    is_security_sensitive: row.get("is_security_sensitive"),
                }
            })
            .collect();

        Ok(logs)
    }

    /// Get security-sensitive logs
    pub async fn get_security_alerts(&self) -> Result<Vec<AuditLog>, AuditError> {
        let filter = AuditFilter {
            user_id: None,
            action: None,
            resource_type: None,
            start_time: None,
            end_time: None,
            security_only: true,
        };

        self.query(filter).await
    }

    /// Get logs for a specific user
    pub async fn get_user_logs(&self, user_id: Uuid) -> Result<Vec<AuditLog>, AuditError> {
        let filter = AuditFilter {
            user_id: Some(user_id),
            action: None,
            resource_type: None,
            start_time: None,
            end_time: None,
            security_only: false,
        };

        self.query(filter).await
    }

    /// Get recent logs
    pub async fn get_recent_logs(&self, limit: i32) -> Result<Vec<AuditLog>, AuditError> {
        let query = format!(
            "SELECT id, user_id, action, resource_type, resource_id, 
             ip_address, user_agent, timestamp, result, details, 
             is_security_sensitive FROM audit_logs 
             ORDER BY timestamp DESC LIMIT {}",
            limit
        );

        let rows = sqlx::query(&query)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| AuditError::QueryError(e.to_string()))?;

        let logs = rows
            .into_iter()
            .map(|row| {
                let result_str: String = row.get("result");
                let result = match result_str.as_str() {
                    "Success" => common::types::AuditResult::Success,
                    "Denied" => common::types::AuditResult::Denied,
                    _ => common::types::AuditResult::Failure("Unknown".to_string()),
                };

                AuditLog {
                    id: row.get("id"),
                    user_id: row.get("user_id"),
                    action: parse_audit_action(row.get("action")),
                    resource_type: parse_resource_type(row.get("resource_type")),
                    resource_id: row.get("resource_id"),
                    ip_address: row.get("ip_address"),
                    user_agent: row.get("user_agent"),
                    timestamp: row.get("timestamp"),
                    result,
                    details: row.get("details"),
                    is_security_sensitive: row.get("is_security_sensitive"),
                }
            })
            .collect();

        Ok(logs)
    }
}

fn parse_audit_action(s: String) -> common::types::AuditAction {
    match s.as_str() {
        "Create" => common::types::AuditAction::Create,
        "Read" => common::types::AuditAction::Read,
        "Update" => common::types::AuditAction::Update,
        "Delete" => common::types::AuditAction::Delete,
        "Execute" => common::types::AuditAction::Execute,
        "Login" => common::types::AuditAction::Login,
        "Logout" => common::types::AuditAction::Logout,
        "PermissionChange" => common::types::AuditAction::PermissionChange,
        "ConfigChange" => common::types::AuditAction::ConfigChange,
        _ => common::types::AuditAction::Read,
    }
}

fn parse_resource_type(s: String) -> common::types::ResourceType {
    match s.as_str() {
        "Workflow" => common::types::ResourceType::Workflow,
        "Template" => common::types::ResourceType::Template,
        "Integration" => common::types::ResourceType::Integration,
        "User" => common::types::ResourceType::User,
        "AuditLog" => common::types::ResourceType::AuditLog,
        "Settings" => common::types::ResourceType::Settings,
        _ => common::types::ResourceType::Workflow,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_audit_action() {
        assert!(matches!(
            parse_audit_action("Create".to_string()),
            common::types::AuditAction::Create
        ));
    }
}

