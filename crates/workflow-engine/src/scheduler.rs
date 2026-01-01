use common::types::{Workflow, ExecutionContext, ExecutionState};
use common::error::WorkflowError;
use crate::executor::WorkflowExecutor;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tokio::time::{interval, Duration};
use uuid::Uuid;
use chrono::{Utc, Datelike, Timelike};

/// Schedule configuration for a workflow
#[derive(Debug, Clone)]
pub struct ScheduleConfig {
    pub workflow_id: Uuid,
    pub schedule_type: ScheduleType,
    pub enabled: bool,
}

#[derive(Debug, Clone)]
pub enum ScheduleType {
    Cron(String),
    Interval(Duration),
    Webhook { url: String, secret: Option<String> },
}

/// Workflow scheduler implementation
/// Responsible for scheduling and triggering workflow executions
pub struct WorkflowScheduler {
    executor: Arc<WorkflowExecutor>,
    schedules: Arc<RwLock<HashMap<Uuid, ScheduleConfig>>>,
    running: Arc<RwLock<bool>>,
}

impl WorkflowScheduler {
    pub fn new(executor: Arc<WorkflowExecutor>) -> Self {
        Self {
            executor,
            schedules: Arc::new(RwLock::new(HashMap::new())),
            running: Arc::new(RwLock::new(false)),
        }
    }

    /// Add a schedule for a workflow
    pub async fn add_schedule(&self, config: ScheduleConfig) -> Result<(), WorkflowError> {
        let mut schedules = self.schedules.write().await;
        schedules.insert(config.workflow_id, config);
        Ok(())
    }

    /// Remove a schedule
    pub async fn remove_schedule(&self, workflow_id: Uuid) -> Result<(), WorkflowError> {
        let mut schedules = self.schedules.write().await;
        schedules.remove(&workflow_id);
        Ok(())
    }

    /// Start the scheduler
    pub async fn start(&self) -> Result<(), WorkflowError> {
        let mut running = self.running.write().await;
        if *running {
            return Err(WorkflowError::ValidationFailed("Scheduler already running".to_string()));
        }
        *running = true;
        drop(running);

        // Start scheduler loop
        let schedules = self.schedules.clone();
        let _executor = self.executor.clone();
        let running_flag = self.running.clone();

        tokio::spawn(async move {
            let mut tick_interval = interval(Duration::from_secs(60)); // Check every minute

            loop {
                tick_interval.tick().await;

                let is_running = *running_flag.read().await;
                if !is_running {
                    break;
                }

                // Check all schedules
                let schedules_map = schedules.read().await;
                for (workflow_id, config) in schedules_map.iter() {
                    if !config.enabled {
                        continue;
                    }

                    match &config.schedule_type {
                        ScheduleType::Cron(cron_expr) => {
                            if Self::should_trigger_cron(cron_expr) {
                                // Trigger workflow execution
                                // Note: In real implementation, we'd need the actual workflow
                                tracing::info!("Triggering workflow {} via cron", workflow_id);
                            }
                        }
                        ScheduleType::Interval(_duration) => {
                            // Interval-based scheduling would need separate tracking
                            tracing::debug!("Interval schedule for workflow {}", workflow_id);
                        }
                        ScheduleType::Webhook { .. } => {
                            // Webhooks are triggered externally, not by scheduler
                        }
                    }
                }
            }
        });

        Ok(())
    }

    /// Stop the scheduler
    pub async fn stop(&self) -> Result<(), WorkflowError> {
        let mut running = self.running.write().await;
        *running = false;
        Ok(())
    }

    /// Check if a cron expression should trigger now
    fn should_trigger_cron(cron_expr: &str) -> bool {
        // Simplified cron parsing - in production, use a cron library
        // This is a placeholder implementation
        
        // Parse cron expression: minute hour day month weekday
        let parts: Vec<&str> = cron_expr.split_whitespace().collect();
        if parts.len() != 5 {
            return false;
        }

        let now = Utc::now();
        let current_minute = now.minute();
        let current_hour = now.hour();
        let current_day = now.day();
        let current_month = now.month();
        let current_weekday = now.weekday().num_days_from_monday();

        // Check minute
        if !Self::matches_cron_field(parts[0], current_minute) {
            return false;
        }

        // Check hour
        if !Self::matches_cron_field(parts[1], current_hour) {
            return false;
        }

        // Check day
        if !Self::matches_cron_field(parts[2], current_day) {
            return false;
        }

        // Check month
        if !Self::matches_cron_field(parts[3], current_month) {
            return false;
        }

        // Check weekday
        if !Self::matches_cron_field(parts[4], current_weekday) {
            return false;
        }

        true
    }

    /// Check if a cron field matches the current value
    fn matches_cron_field(field: &str, value: u32) -> bool {
        if field == "*" {
            return true;
        }

        // Handle specific value
        if let Ok(field_value) = field.parse::<u32>() {
            return field_value == value;
        }

        // Handle range (e.g., "1-5")
        if field.contains('-') {
            let range_parts: Vec<&str> = field.split('-').collect();
            if range_parts.len() == 2 {
                if let (Ok(start), Ok(end)) = (range_parts[0].parse::<u32>(), range_parts[1].parse::<u32>()) {
                    return value >= start && value <= end;
                }
            }
        }

        // Handle list (e.g., "1,3,5")
        if field.contains(',') {
            let values: Vec<u32> = field.split(',')
                .filter_map(|v| v.parse::<u32>().ok())
                .collect();
            return values.contains(&value);
        }

        // Handle step (e.g., "*/5")
        if field.contains('/') {
            let step_parts: Vec<&str> = field.split('/').collect();
            if step_parts.len() == 2 && step_parts[0] == "*" {
                if let Ok(step) = step_parts[1].parse::<u32>() {
                    return value % step == 0;
                }
            }
        }

        false
    }

    /// Trigger a workflow via webhook
    pub async fn trigger_webhook(
        &self,
        workflow: &Workflow,
        payload: serde_json::Value,
    ) -> Result<Uuid, WorkflowError> {
        let execution_id = Uuid::new_v4();
        
        let mut variables = HashMap::new();
        variables.insert("webhook_payload".to_string(), payload);

        let ctx = ExecutionContext {
            execution_id,
            workflow_id: workflow.id,
            variables,
            state: ExecutionState::Pending,
            started_at: Utc::now(),
            current_node: None,
        };

        // Execute workflow asynchronously
        let executor = self.executor.clone();
        let workflow_clone = workflow.clone();
        
        tokio::spawn(async move {
            match executor.execute(&workflow_clone, ctx).await {
                Ok(result) => {
                    tracing::info!("Webhook execution completed: {:?}", result);
                }
                Err(e) => {
                    tracing::error!("Webhook execution failed: {}", e);
                }
            }
        });

        Ok(execution_id)
    }

    /// Get all active schedules
    pub async fn get_schedules(&self) -> HashMap<Uuid, ScheduleConfig> {
        let schedules = self.schedules.read().await;
        schedules.clone()
    }

    /// Enable a schedule
    pub async fn enable_schedule(&self, workflow_id: Uuid) -> Result<(), WorkflowError> {
        let mut schedules = self.schedules.write().await;
        if let Some(config) = schedules.get_mut(&workflow_id) {
            config.enabled = true;
            Ok(())
        } else {
            Err(WorkflowError::NodeNotFound(format!("Schedule not found for workflow {}", workflow_id)))
        }
    }

    /// Disable a schedule
    pub async fn disable_schedule(&self, workflow_id: Uuid) -> Result<(), WorkflowError> {
        let mut schedules = self.schedules.write().await;
        if let Some(config) = schedules.get_mut(&workflow_id) {
            config.enabled = false;
            Ok(())
        } else {
            Err(WorkflowError::NodeNotFound(format!("Schedule not found for workflow {}", workflow_id)))
        }
    }
}

impl Default for WorkflowScheduler {
    fn default() -> Self {
        Self::new(Arc::new(WorkflowExecutor::new()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cron_field_matching() {
        assert!(WorkflowScheduler::matches_cron_field("*", 5));
        assert!(WorkflowScheduler::matches_cron_field("5", 5));
        assert!(!WorkflowScheduler::matches_cron_field("5", 6));
        assert!(WorkflowScheduler::matches_cron_field("1-5", 3));
        assert!(!WorkflowScheduler::matches_cron_field("1-5", 6));
        assert!(WorkflowScheduler::matches_cron_field("1,3,5", 3));
        assert!(!WorkflowScheduler::matches_cron_field("1,3,5", 2));
        assert!(WorkflowScheduler::matches_cron_field("*/5", 10));
        assert!(!WorkflowScheduler::matches_cron_field("*/5", 11));
    }

    #[tokio::test]
    async fn test_add_remove_schedule() {
        let executor = Arc::new(WorkflowExecutor::new());
        let scheduler = WorkflowScheduler::new(executor);
        
        let workflow_id = Uuid::new_v4();
        let config = ScheduleConfig {
            workflow_id,
            schedule_type: ScheduleType::Cron("0 0 * * *".to_string()),
            enabled: true,
        };

        let result = scheduler.add_schedule(config).await;
        assert!(result.is_ok());

        let schedules = scheduler.get_schedules().await;
        assert!(schedules.contains_key(&workflow_id));

        let result = scheduler.remove_schedule(workflow_id).await;
        assert!(result.is_ok());

        let schedules = scheduler.get_schedules().await;
        assert!(!schedules.contains_key(&workflow_id));
    }

    #[tokio::test]
    async fn test_enable_disable_schedule() {
        let executor = Arc::new(WorkflowExecutor::new());
        let scheduler = WorkflowScheduler::new(executor);
        
        let workflow_id = Uuid::new_v4();
        let config = ScheduleConfig {
            workflow_id,
            schedule_type: ScheduleType::Cron("0 0 * * *".to_string()),
            enabled: true,
        };

        scheduler.add_schedule(config).await.unwrap();

        let result = scheduler.disable_schedule(workflow_id).await;
        assert!(result.is_ok());

        let schedules = scheduler.get_schedules().await;
        assert!(!schedules.get(&workflow_id).unwrap().enabled);

        let result = scheduler.enable_schedule(workflow_id).await;
        assert!(result.is_ok());

        let schedules = scheduler.get_schedules().await;
        assert!(schedules.get(&workflow_id).unwrap().enabled);
    }
}
