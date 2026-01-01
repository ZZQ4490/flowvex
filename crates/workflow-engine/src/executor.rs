use common::types::{
    Workflow, Node, NodeType, ExecutionContext, ExecutionState, ExecutionResult,
    NodeExecutionState, ConcurrentExecutionContext, JsonValue,
};
use common::error::WorkflowError;
use crate::parser::WorkflowParser;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::Utc;

/// Workflow executor implementation
/// Responsible for executing workflows asynchronously with state management
pub struct WorkflowExecutor {
    parser: WorkflowParser,
    // Store execution contexts for recovery
    execution_contexts: Arc<RwLock<HashMap<Uuid, ConcurrentExecutionContext>>>,
}

impl WorkflowExecutor {
    pub fn new() -> Self {
        Self {
            parser: WorkflowParser::new(),
            execution_contexts: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Execute a workflow
    pub async fn execute(
        &self,
        workflow: &Workflow,
        mut ctx: ExecutionContext,
    ) -> Result<ExecutionResult, WorkflowError> {
        // Convert to concurrent context
        let concurrent_ctx = ConcurrentExecutionContext::from_context(ctx.clone());
        
        // Store context for recovery
        {
            let mut contexts = self.execution_contexts.write().await;
            contexts.insert(concurrent_ctx.execution_id, concurrent_ctx.clone());
        }

        // Get topological order of nodes
        let execution_order = self.parser.topological_sort(workflow)
            .map_err(|e| WorkflowError::ValidationFailed(e.to_string()))?;

        // Update state to running
        ctx.state = ExecutionState::Running;
        self.update_context_state(concurrent_ctx.execution_id, ExecutionState::Running).await;

        // Execute nodes in order
        let node_count = execution_order.len();
        for node_id in execution_order {
            let node = workflow.nodes.iter()
                .find(|n| n.id == node_id)
                .ok_or_else(|| WorkflowError::NodeNotFound(node_id.to_string()))?;

            // Update current node
            ctx.current_node = Some(node_id);
            
            // Execute node
            match self.execute_node(node, &concurrent_ctx, workflow).await {
                Ok(node_result) => {
                    // Store node output in variables
                    if let Some(output) = node_result.output {
                        let mut vars = concurrent_ctx.variables.write().await;
                        vars.insert(format!("node_{}", node_id), output);
                    }
                }
                Err(e) => {
                    // Node execution failed
                    self.update_context_state(concurrent_ctx.execution_id, ExecutionState::Failed).await;
                    
                    return Ok(ExecutionResult {
                        execution_id: ctx.execution_id,
                        state: ExecutionState::Failed,
                        completed_at: Some(Utc::now()),
                        error: Some(e.to_string()),
                        output: None,
                    });
                }
            }
        }

        // Execution completed successfully
        self.update_context_state(concurrent_ctx.execution_id, ExecutionState::Completed).await;

        Ok(ExecutionResult {
            execution_id: ctx.execution_id,
            state: ExecutionState::Completed,
            completed_at: Some(Utc::now()),
            error: None,
            output: Some(serde_json::json!({
                "status": "success",
                "nodes_executed": node_count
            })),
        })
    }

    /// Execute a single node
    async fn execute_node(
        &self,
        node: &Node,
        ctx: &ConcurrentExecutionContext,
        workflow: &Workflow,
    ) -> Result<NodeExecutionState, WorkflowError> {
        let started_at = Utc::now();

        // Get input data from previous nodes
        let input = self.collect_node_inputs(node, ctx, workflow).await?;

        // Execute based on node type
        let output = match &node.node_type {
            NodeType::Trigger { trigger_type: _ } => {
                self.execute_trigger_node(node, &input, ctx).await?
            }
            NodeType::Action { action_type: _ } => {
                self.execute_action_node(node, &input, ctx).await?
            }
            NodeType::Condition { condition_type: _ } => {
                self.execute_condition_node(node, &input, ctx).await?
            }
            NodeType::Loop { loop_type: _ } => {
                self.execute_loop_node(node, &input, ctx).await?
            }
            NodeType::AI { ai_type: _ } => {
                self.execute_ai_node(node, &input, ctx).await?
            }
            NodeType::Custom { config } => {
                self.execute_custom_node(node, &input, ctx, config).await?
            }
        };

        Ok(NodeExecutionState {
            node_id: node.id,
            state: ExecutionState::Completed,
            started_at: Some(started_at),
            completed_at: Some(Utc::now()),
            input: Some(input),
            output: Some(output),
            error: None,
        })
    }

    /// Collect inputs for a node from previous nodes
    async fn collect_node_inputs(
        &self,
        node: &Node,
        ctx: &ConcurrentExecutionContext,
        workflow: &Workflow,
    ) -> Result<JsonValue, WorkflowError> {
        let mut inputs = serde_json::Map::new();

        // Find all edges that target this node
        let incoming_edges: Vec<_> = workflow.edges.iter()
            .filter(|e| e.target == node.id)
            .collect();

        // Collect outputs from source nodes
        let vars = ctx.variables.read().await;
        for edge in incoming_edges {
            let source_key = format!("node_{}", edge.source);
            if let Some(value) = vars.get(&source_key) {
                inputs.insert(edge.source_handle.clone(), value.clone());
            }
        }

        Ok(JsonValue::Object(inputs))
    }

    /// Execute trigger node
    async fn execute_trigger_node(
        &self,
        _node: &Node,
        _input: &JsonValue,
        ctx: &ConcurrentExecutionContext,
    ) -> Result<JsonValue, WorkflowError> {
        // Trigger nodes typically just pass through or generate initial data
        Ok(serde_json::json!({
            "triggered": true,
            "timestamp": Utc::now().to_rfc3339(),
            "execution_id": ctx.execution_id.to_string()
        }))
    }

    /// Execute action node
    async fn execute_action_node(
        &self,
        node: &Node,
        input: &JsonValue,
        _ctx: &ConcurrentExecutionContext,
    ) -> Result<JsonValue, WorkflowError> {
        // Action nodes perform operations
        // This is a placeholder - actual implementation would call external services
        Ok(serde_json::json!({
            "action": "executed",
            "input": input,
            "node_id": node.id.to_string()
        }))
    }

    /// Execute condition node
    async fn execute_condition_node(
        &self,
        _node: &Node,
        _input: &JsonValue,
        _ctx: &ConcurrentExecutionContext,
    ) -> Result<JsonValue, WorkflowError> {
        // Evaluate condition
        // This is a placeholder - actual implementation would evaluate expressions
        let condition_result = true; // Placeholder

        Ok(serde_json::json!({
            "condition_result": condition_result,
            "branch": if condition_result { "true" } else { "false" }
        }))
    }

    /// Execute loop node
    async fn execute_loop_node(
        &self,
        _node: &Node,
        _input: &JsonValue,
        _ctx: &ConcurrentExecutionContext,
    ) -> Result<JsonValue, WorkflowError> {
        // Execute loop iterations
        // This is a placeholder - actual implementation would iterate over data
        Ok(serde_json::json!({
            "iterations": 0,
            "results": []
        }))
    }

    /// Execute AI node
    async fn execute_ai_node(
        &self,
        node: &Node,
        _input: &JsonValue,
        _ctx: &ConcurrentExecutionContext,
    ) -> Result<JsonValue, WorkflowError> {
        // Call AI service
        // This is a placeholder - actual implementation would call AI service
        Ok(serde_json::json!({
            "ai_response": "placeholder response",
            "model": node.config.parameters.get("model")
        }))
    }

    /// Execute custom node
    async fn execute_custom_node(
        &self,
        _node: &Node,
        _input: &JsonValue,
        _ctx: &ConcurrentExecutionContext,
        config: &common::types::CustomNodeConfig,
    ) -> Result<JsonValue, WorkflowError> {
        // Execute custom code in sandbox
        // This is a placeholder - actual implementation would use sandbox
        Ok(serde_json::json!({
            "custom_result": "executed",
            "language": &config.language
        }))
    }

    /// Update execution context state
    async fn update_context_state(&self, execution_id: Uuid, state: ExecutionState) {
        let mut contexts = self.execution_contexts.write().await;
        if let Some(ctx) = contexts.get_mut(&execution_id) {
            ctx.state = state;
        }
    }

    /// Pause execution
    pub async fn pause(&self, execution_id: Uuid) -> Result<(), WorkflowError> {
        self.update_context_state(execution_id, ExecutionState::Paused).await;
        Ok(())
    }

    /// Resume execution
    pub async fn resume(&self, execution_id: Uuid) -> Result<(), WorkflowError> {
        self.update_context_state(execution_id, ExecutionState::Running).await;
        // TODO: Implement actual resume logic
        Ok(())
    }

    /// Cancel execution
    pub async fn cancel(&self, execution_id: Uuid) -> Result<(), WorkflowError> {
        self.update_context_state(execution_id, ExecutionState::Cancelled).await;
        Ok(())
    }

    /// Get execution context for recovery
    pub async fn get_context(&self, execution_id: Uuid) -> Option<ConcurrentExecutionContext> {
        let contexts = self.execution_contexts.read().await;
        contexts.get(&execution_id).cloned()
    }

    /// Persist execution context (for recovery after restart)
    pub async fn persist_context(&self, _execution_id: Uuid) -> Result<(), WorkflowError> {
        // TODO: Implement persistence to database
        // This would save the context to PostgreSQL for recovery
        Ok(())
    }

    /// Restore execution context from persistence
    pub async fn restore_context(&self, _execution_id: Uuid) -> Result<ConcurrentExecutionContext, WorkflowError> {
        // TODO: Implement restoration from database
        Err(WorkflowError::NodeNotFound("Context not found".to_string()))
    }

    /// Execute a workflow with retry support
    pub async fn execute_with_retry(
        &self,
        workflow: &Workflow,
        ctx: ExecutionContext,
        max_retries: u32,
    ) -> Result<ExecutionResult, WorkflowError> {
        let mut attempts = 0;
        let mut last_error = None;

        while attempts <= max_retries {
            match self.execute(workflow, ctx.clone()).await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    attempts += 1;
                    last_error = Some(e);
                    
                    if attempts <= max_retries {
                        // Wait before retry with exponential backoff
                        let delay = std::time::Duration::from_millis(100 * 2_u64.pow(attempts - 1));
                        tokio::time::sleep(delay).await;
                    }
                }
            }
        }

        Err(last_error.unwrap_or_else(|| WorkflowError::NodeExecutionFailed(
            "unknown".to_string(),
            "Max retries exceeded".to_string(),
        )))
    }

    /// Resume execution from a failed node
    pub async fn resume_from_failure(
        &self,
        workflow: &Workflow,
        execution_id: Uuid,
        failed_node_id: Uuid,
    ) -> Result<ExecutionResult, WorkflowError> {
        // Get the stored context
        let ctx = self.get_context(execution_id).await
            .ok_or_else(|| WorkflowError::NodeNotFound("Execution context not found".to_string()))?;

        // Get topological order
        let execution_order = self.parser.topological_sort(workflow)
            .map_err(|e| WorkflowError::ValidationFailed(e.to_string()))?;

        // Find the index of the failed node
        let failed_index = execution_order.iter()
            .position(|&id| id == failed_node_id)
            .ok_or_else(|| WorkflowError::NodeNotFound("Failed node not found in workflow".to_string()))?;

        // Update state to running
        self.update_context_state(execution_id, ExecutionState::Running).await;

        // Execute from the failed node onwards
        let node_count = execution_order.len() - failed_index;
        for node_id in execution_order.into_iter().skip(failed_index) {
            let node = workflow.nodes.iter()
                .find(|n| n.id == node_id)
                .ok_or_else(|| WorkflowError::NodeNotFound(node_id.to_string()))?;

            // Execute node
            match self.execute_node(node, &ctx, workflow).await {
                Ok(node_result) => {
                    // Store node output in variables
                    if let Some(output) = node_result.output {
                        let mut vars = ctx.variables.write().await;
                        vars.insert(format!("node_{}", node_id), output);
                    }
                }
                Err(e) => {
                    // Node execution failed again
                    self.update_context_state(execution_id, ExecutionState::Failed).await;
                    
                    return Ok(ExecutionResult {
                        execution_id,
                        state: ExecutionState::Failed,
                        completed_at: Some(Utc::now()),
                        error: Some(e.to_string()),
                        output: None,
                    });
                }
            }
        }

        // Execution completed successfully
        self.update_context_state(execution_id, ExecutionState::Completed).await;

        Ok(ExecutionResult {
            execution_id,
            state: ExecutionState::Completed,
            completed_at: Some(Utc::now()),
            error: None,
            output: Some(serde_json::json!({
                "status": "success",
                "nodes_executed": node_count,
                "resumed_from": failed_node_id.to_string()
            })),
        })
    }

    /// Save execution state for recovery
    pub async fn save_execution_state(
        &self,
        execution_id: Uuid,
        node_id: Uuid,
        error: Option<String>,
    ) -> Result<(), WorkflowError> {
        let contexts = self.execution_contexts.read().await;
        if let Some(_ctx) = contexts.get(&execution_id) {
            // In production, this would save to database
            tracing::info!(
                "Saving execution state: execution_id={}, node_id={}, error={:?}",
                execution_id,
                node_id,
                error
            );
            // TODO: Persist to PostgreSQL
        }
        Ok(())
    }

    /// Classify error for better handling
    fn classify_error(&self, error: &WorkflowError) -> ErrorCategory {
        match error {
            WorkflowError::Timeout(_) => ErrorCategory::Timeout,
            WorkflowError::NodeExecutionFailed(_, _) => ErrorCategory::NodeFailure,
            WorkflowError::ValidationFailed(_) => ErrorCategory::Validation,
            _ => ErrorCategory::Unknown,
        }
    }

    /// Suggest recovery action based on error
    pub fn suggest_recovery(&self, error: &WorkflowError) -> RecoveryAction {
        match self.classify_error(error) {
            ErrorCategory::Timeout => RecoveryAction::Retry,
            ErrorCategory::NodeFailure => RecoveryAction::RetryFromFailed,
            ErrorCategory::Validation => RecoveryAction::FixConfiguration,
            ErrorCategory::Unknown => RecoveryAction::Manual,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum ErrorCategory {
    Timeout,
    NodeFailure,
    Validation,
    Unknown,
}

#[derive(Debug, Clone, PartialEq)]
pub enum RecoveryAction {
    Retry,
    RetryFromFailed,
    FixConfiguration,
    Manual,
}

impl Default for WorkflowExecutor {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::{TriggerType, Position, NodeConfig, Port, DataType, Edge};

    fn create_simple_workflow() -> Workflow {
        let node1_id = Uuid::new_v4();
        let node2_id = Uuid::new_v4();

        let node1 = Node {
            id: node1_id,
            node_type: NodeType::Trigger { trigger_type: TriggerType::Manual },
            config: NodeConfig::default(),
            position: Position { x: 0.0, y: 0.0 },
            inputs: vec![],
            outputs: vec![Port {
                id: "out".to_string(),
                name: "output".to_string(),
                data_type: DataType::Any,
            }],
        };

        let node2 = Node {
            id: node2_id,
            node_type: NodeType::Action { action_type: common::types::ActionType::Http },
            config: NodeConfig::default(),
            position: Position { x: 100.0, y: 0.0 },
            inputs: vec![Port {
                id: "in".to_string(),
                name: "input".to_string(),
                data_type: DataType::Any,
            }],
            outputs: vec![Port {
                id: "out".to_string(),
                name: "output".to_string(),
                data_type: DataType::Any,
            }],
        };

        let edge = Edge {
            id: Uuid::new_v4(),
            source: node1_id,
            source_handle: "output".to_string(),
            target: node2_id,
            target_handle: "input".to_string(),
        };

        Workflow {
            id: Uuid::new_v4(),
            name: "Test Workflow".to_string(),
            description: Some("Test".to_string()),
            nodes: vec![node1, node2],
            edges: vec![edge],
            variables: HashMap::new(),
            created_at: Utc::now(),
            updated_at: Utc::now(),
        }
    }

    #[tokio::test]
    async fn test_execute_workflow() {
        let executor = WorkflowExecutor::new();
        let workflow = create_simple_workflow();
        
        let ctx = ExecutionContext {
            execution_id: Uuid::new_v4(),
            workflow_id: workflow.id,
            variables: HashMap::new(),
            state: ExecutionState::Pending,
            started_at: Utc::now(),
            current_node: None,
        };

        let result = executor.execute(&workflow, ctx).await;
        assert!(result.is_ok());
        
        let exec_result = result.unwrap();
        assert_eq!(exec_result.state, ExecutionState::Completed);
    }

    #[tokio::test]
    async fn test_pause_resume() {
        let executor = WorkflowExecutor::new();
        let execution_id = Uuid::new_v4();

        let result = executor.pause(execution_id).await;
        assert!(result.is_ok());

        let result = executor.resume(execution_id).await;
        assert!(result.is_ok());
    }
}
