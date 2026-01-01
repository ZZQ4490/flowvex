use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::sync::Arc;

/// Tool definition for function calling
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tool {
    pub name: String,
    pub description: String,
    pub parameters: JsonValue,
}

/// Tool call from AI model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolCall {
    pub id: String,
    pub name: String,
    pub arguments: JsonValue,
}

/// Tool execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ToolResult {
    pub tool_call_id: String,
    pub result: JsonValue,
    pub error: Option<String>,
}

/// Tool executor trait
#[async_trait]
pub trait ToolExecutor: Send + Sync {
    async fn execute(&self, arguments: JsonValue) -> Result<JsonValue, ToolError>;
    fn definition(&self) -> Tool;
}

/// Tool registry for managing available tools
pub struct ToolRegistry {
    tools: HashMap<String, Arc<dyn ToolExecutor>>,
}

impl ToolRegistry {
    pub fn new() -> Self {
        Self {
            tools: HashMap::new(),
        }
    }

    /// Register a tool
    pub fn register(&mut self, name: String, executor: Arc<dyn ToolExecutor>) {
        self.tools.insert(name, executor);
    }

    /// Get tool by name
    pub fn get(&self, name: &str) -> Option<Arc<dyn ToolExecutor>> {
        self.tools.get(name).cloned()
    }

    /// List all available tools
    pub fn list_tools(&self) -> Vec<Tool> {
        self.tools
            .values()
            .map(|executor| executor.definition())
            .collect()
    }

    /// Execute a tool call
    pub async fn execute(&self, call: &ToolCall) -> ToolResult {
        match self.get(&call.name) {
            Some(executor) => match executor.execute(call.arguments.clone()).await {
                Ok(result) => ToolResult {
                    tool_call_id: call.id.clone(),
                    result,
                    error: None,
                },
                Err(e) => ToolResult {
                    tool_call_id: call.id.clone(),
                    result: JsonValue::Null,
                    error: Some(e.to_string()),
                },
            },
            None => ToolResult {
                tool_call_id: call.id.clone(),
                result: JsonValue::Null,
                error: Some(format!("Tool not found: {}", call.name)),
            },
        }
    }

    /// Execute multiple tool calls
    pub async fn execute_batch(&self, calls: &[ToolCall]) -> Vec<ToolResult> {
        let mut results = Vec::new();
        for call in calls {
            results.push(self.execute(call).await);
        }
        results
    }
}

impl Default for ToolRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ToolError {
    #[error("Tool execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Invalid arguments: {0}")]
    InvalidArguments(String),

    #[error("Tool not found: {0}")]
    NotFound(String),
}

// Example tool: Calculator
pub struct CalculatorTool;

#[async_trait]
impl ToolExecutor for CalculatorTool {
    async fn execute(&self, arguments: JsonValue) -> Result<JsonValue, ToolError> {
        let operation = arguments["operation"]
            .as_str()
            .ok_or_else(|| ToolError::InvalidArguments("Missing operation".to_string()))?;

        let a = arguments["a"]
            .as_f64()
            .ok_or_else(|| ToolError::InvalidArguments("Missing parameter a".to_string()))?;

        let b = arguments["b"]
            .as_f64()
            .ok_or_else(|| ToolError::InvalidArguments("Missing parameter b".to_string()))?;

        let result = match operation {
            "add" => a + b,
            "subtract" => a - b,
            "multiply" => a * b,
            "divide" => {
                if b == 0.0 {
                    return Err(ToolError::ExecutionFailed("Division by zero".to_string()));
                }
                a / b
            }
            _ => {
                return Err(ToolError::InvalidArguments(format!(
                    "Unknown operation: {}",
                    operation
                )))
            }
        };

        Ok(JsonValue::Number(
            serde_json::Number::from_f64(result).unwrap(),
        ))
    }

    fn definition(&self) -> Tool {
        Tool {
            name: "calculator".to_string(),
            description: "Perform basic arithmetic operations".to_string(),
            parameters: serde_json::json!({
                "type": "object",
                "properties": {
                    "operation": {
                        "type": "string",
                        "enum": ["add", "subtract", "multiply", "divide"],
                        "description": "The operation to perform"
                    },
                    "a": {
                        "type": "number",
                        "description": "First operand"
                    },
                    "b": {
                        "type": "number",
                        "description": "Second operand"
                    }
                },
                "required": ["operation", "a", "b"]
            }),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_calculator_tool() {
        let tool = CalculatorTool;
        let args = serde_json::json!({
            "operation": "add",
            "a": 5.0,
            "b": 3.0
        });

        let result = tool.execute(args).await.unwrap();
        assert_eq!(result.as_f64().unwrap(), 8.0);
    }

    #[tokio::test]
    async fn test_tool_registry() {
        let mut registry = ToolRegistry::new();
        registry.register("calculator".to_string(), Arc::new(CalculatorTool));

        let tools = registry.list_tools();
        assert_eq!(tools.len(), 1);
        assert_eq!(tools[0].name, "calculator");

        let call = ToolCall {
            id: "call_1".to_string(),
            name: "calculator".to_string(),
            arguments: serde_json::json!({
                "operation": "multiply",
                "a": 4.0,
                "b": 5.0
            }),
        };

        let result = registry.execute(&call).await;
        assert!(result.error.is_none());
        assert_eq!(result.result.as_f64().unwrap(), 20.0);
    }
}
