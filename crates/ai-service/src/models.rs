use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// AI model types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ModelType {
    #[serde(rename = "gpt-4")]
    GPT4,
    #[serde(rename = "gpt-4-turbo")]
    GPT4Turbo,
    #[serde(rename = "gpt-3.5-turbo")]
    GPT35Turbo,
    #[serde(rename = "claude-3-opus")]
    Claude3Opus,
    #[serde(rename = "claude-3-sonnet")]
    Claude3Sonnet,
}

impl ModelType {
    pub fn as_str(&self) -> &str {
        match self {
            ModelType::GPT4 => "gpt-4",
            ModelType::GPT4Turbo => "gpt-4-turbo",
            ModelType::GPT35Turbo => "gpt-3.5-turbo",
            ModelType::Claude3Opus => "claude-3-opus-20240229",
            ModelType::Claude3Sonnet => "claude-3-sonnet-20240229",
        }
    }

    pub fn provider(&self) -> &str {
        match self {
            ModelType::GPT4 | ModelType::GPT4Turbo | ModelType::GPT35Turbo => "openai",
            ModelType::Claude3Opus | ModelType::Claude3Sonnet => "anthropic",
        }
    }
}

/// Model configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelConfig {
    pub model: ModelType,
    pub temperature: f32,
    pub max_tokens: u32,
    pub top_p: f32,
    pub mode: ConfigMode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConfigMode {
    Basic,
    Advanced,
}

impl Default for ModelConfig {
    fn default() -> Self {
        Self {
            model: ModelType::GPT4,
            temperature: 0.7,
            max_tokens: 2000,
            top_p: 1.0,
            mode: ConfigMode::Basic,
        }
    }
}

/// Model manager for managing AI models
pub struct ModelManager {
    configs: HashMap<String, ModelConfig>,
    api_keys: HashMap<String, String>,
}

impl ModelManager {
    pub fn new() -> Self {
        Self {
            configs: HashMap::new(),
            api_keys: HashMap::new(),
        }
    }

    /// Register a model configuration
    pub fn register_config(&mut self, name: String, config: ModelConfig) {
        self.configs.insert(name, config);
    }

    /// Set API key for a provider
    pub fn set_api_key(&mut self, provider: String, api_key: String) {
        self.api_keys.insert(provider, api_key);
    }

    /// Get model configuration
    pub fn get_config(&self, name: &str) -> Option<&ModelConfig> {
        self.configs.get(name)
    }

    /// Get API key for a provider
    pub fn get_api_key(&self, provider: &str) -> Option<&String> {
        self.api_keys.get(provider)
    }

    /// Validate model configuration
    pub fn validate_config(&self, config: &ModelConfig) -> Result<(), ModelError> {
        if config.temperature < 0.0 || config.temperature > 2.0 {
            return Err(ModelError::InvalidParameter(
                "Temperature must be between 0.0 and 2.0".to_string(),
            ));
        }

        if config.max_tokens == 0 {
            return Err(ModelError::InvalidParameter(
                "Max tokens must be greater than 0".to_string(),
            ));
        }

        if config.top_p < 0.0 || config.top_p > 1.0 {
            return Err(ModelError::InvalidParameter(
                "Top_p must be between 0.0 and 1.0".to_string(),
            ));
        }

        Ok(())
    }
}

impl Default for ModelManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ModelError {
    #[error("Invalid parameter: {0}")]
    InvalidParameter(String),

    #[error("Model not found: {0}")]
    ModelNotFound(String),

    #[error("API key not configured for provider: {0}")]
    ApiKeyNotConfigured(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_model_type_as_str() {
        assert_eq!(ModelType::GPT4.as_str(), "gpt-4");
        assert_eq!(ModelType::Claude3Opus.provider(), "anthropic");
    }

    #[test]
    fn test_model_manager() {
        let mut manager = ModelManager::new();
        let config = ModelConfig::default();

        manager.register_config("default".to_string(), config.clone());
        assert!(manager.get_config("default").is_some());

        manager.set_api_key("openai".to_string(), "sk-test".to_string());
        assert!(manager.get_api_key("openai").is_some());
    }

    #[test]
    fn test_validate_config() {
        let manager = ModelManager::new();
        let mut config = ModelConfig::default();

        assert!(manager.validate_config(&config).is_ok());

        config.temperature = 3.0;
        assert!(manager.validate_config(&config).is_err());
    }
}
