use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Integration registry for managing available integrations
pub struct IntegrationRegistry {
    integrations: Arc<RwLock<HashMap<String, Box<dyn Integration>>>>,
}

impl IntegrationRegistry {
    pub fn new() -> Self {
        let mut registry = Self {
            integrations: Arc::new(RwLock::new(HashMap::new())),
        };

        // Register built-in integrations
        registry.register_builtin_integrations();
        registry
    }

    fn register_builtin_integrations(&mut self) {
        // This would register all 50+ integrations
        // For now, we'll register a few examples
    }

    /// Register a new integration
    pub async fn register(&self, name: String, integration: Box<dyn Integration>) {
        let mut integrations = self.integrations.write().await;
        integrations.insert(name, integration);
    }

    /// Get an integration by name
    pub async fn get(&self, name: &str) -> Option<Box<dyn Integration>> {
        let integrations = self.integrations.read().await;
        integrations.get(name).map(|i| i.clone_box())
    }

    /// List all available integrations
    pub async fn list(&self) -> Vec<IntegrationInfo> {
        let integrations = self.integrations.read().await;
        integrations
            .values()
            .map(|i| i.info())
            .collect()
    }

    /// Execute an integration action
    pub async fn execute(
        &self,
        name: &str,
        action: &str,
        params: JsonValue,
        credentials: &str,
    ) -> Result<JsonValue, IntegrationError> {
        let integration = self
            .get(name)
            .await
            .ok_or_else(|| IntegrationError::NotFound(name.to_string()))?;

        integration.execute(action, params, credentials).await
    }
}

impl Default for IntegrationRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Integration trait that all integrations must implement
#[async_trait]
pub trait Integration: Send + Sync {
    /// Get integration information
    fn info(&self) -> IntegrationInfo;

    /// Execute an action
    async fn execute(
        &self,
        action: &str,
        params: JsonValue,
        credentials: &str,
    ) -> Result<JsonValue, IntegrationError>;

    /// Validate credentials
    async fn validate_credentials(&self, credentials: &str) -> Result<bool, IntegrationError>;

    /// List available actions
    fn actions(&self) -> Vec<ActionDefinition>;

    /// Clone the integration
    fn clone_box(&self) -> Box<dyn Integration>;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntegrationInfo {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub category: IntegrationCategory,
    pub auth_type: AuthType,
    pub icon_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IntegrationCategory {
    SocialMedia,
    Email,
    Database,
    Notification,
    Document,
    Http,
    AI,
    Storage,
    Analytics,
    Other,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthType {
    ApiKey,
    OAuth2,
    Basic,
    Bearer,
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionDefinition {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub parameters: Vec<ParameterDefinition>,
    pub returns: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParameterDefinition {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub param_type: ParameterType,
    pub required: bool,
    pub default_value: Option<JsonValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParameterType {
    String,
    Number,
    Boolean,
    Object,
    Array,
}

#[derive(Debug, thiserror::Error)]
pub enum IntegrationError {
    #[error("Integration not found: {0}")]
    NotFound(String),

    #[error("Action not found: {0}")]
    ActionNotFound(String),

    #[error("Invalid credentials")]
    InvalidCredentials,

    #[error("Invalid parameters: {0}")]
    InvalidParameters(String),

    #[error("Execution failed: {0}")]
    ExecutionFailed(String),

    #[error("Network error: {0}")]
    NetworkError(String),
}

// Example integration: HTTP Request
#[derive(Clone)]
pub struct HttpIntegration;

#[async_trait]
impl Integration for HttpIntegration {
    fn info(&self) -> IntegrationInfo {
        IntegrationInfo {
            name: "http".to_string(),
            display_name: "HTTP Request".to_string(),
            description: "Make HTTP requests to any endpoint".to_string(),
            category: IntegrationCategory::Http,
            auth_type: AuthType::None,
            icon_url: None,
        }
    }

    async fn execute(
        &self,
        action: &str,
        params: JsonValue,
        _credentials: &str,
    ) -> Result<JsonValue, IntegrationError> {
        match action {
            "request" => {
                let url = params["url"]
                    .as_str()
                    .ok_or_else(|| IntegrationError::InvalidParameters("url required".to_string()))?;

                let method = params["method"].as_str().unwrap_or("GET");

                let client = reqwest::Client::new();
                let response = match method {
                    "GET" => client.get(url).send().await,
                    "POST" => client.post(url).json(&params["body"]).send().await,
                    _ => {
                        return Err(IntegrationError::InvalidParameters(
                            "Invalid method".to_string(),
                        ))
                    }
                }
                .map_err(|e| IntegrationError::NetworkError(e.to_string()))?;

                let status = response.status().as_u16();
                let body = response
                    .json::<JsonValue>()
                    .await
                    .unwrap_or(serde_json::json!({}));

                Ok(serde_json::json!({
                    "status": status,
                    "body": body
                }))
            }
            _ => Err(IntegrationError::ActionNotFound(action.to_string())),
        }
    }

    async fn validate_credentials(&self, _credentials: &str) -> Result<bool, IntegrationError> {
        Ok(true) // HTTP doesn't require credentials
    }

    fn actions(&self) -> Vec<ActionDefinition> {
        vec![ActionDefinition {
            name: "request".to_string(),
            display_name: "HTTP Request".to_string(),
            description: "Make an HTTP request".to_string(),
            parameters: vec![
                ParameterDefinition {
                    name: "url".to_string(),
                    display_name: "URL".to_string(),
                    description: "The URL to request".to_string(),
                    param_type: ParameterType::String,
                    required: true,
                    default_value: None,
                },
                ParameterDefinition {
                    name: "method".to_string(),
                    display_name: "Method".to_string(),
                    description: "HTTP method (GET, POST, etc.)".to_string(),
                    param_type: ParameterType::String,
                    required: false,
                    default_value: Some(serde_json::json!("GET")),
                },
            ],
            returns: Some("Response object with status and body".to_string()),
        }]
    }

    fn clone_box(&self) -> Box<dyn Integration> {
        Box::new(self.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_registry() {
        let registry = IntegrationRegistry::new();
        registry
            .register("http".to_string(), Box::new(HttpIntegration))
            .await;

        let integration = registry.get("http").await;
        assert!(integration.is_some());

        let list = registry.list().await;
        assert_eq!(list.len(), 1);
    }

    #[tokio::test]
    async fn test_http_integration() {
        let integration = HttpIntegration;
        let info = integration.info();
        assert_eq!(info.name, "http");

        let actions = integration.actions();
        assert_eq!(actions.len(), 1);
        assert_eq!(actions[0].name, "request");
    }
}

