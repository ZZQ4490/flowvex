use crate::models::{ModelConfig, ModelType};
use crate::tools::{Tool, ToolCall};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

/// AI request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIRequest {
    pub model: ModelType,
    pub prompt: String,
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
    pub top_p: Option<f32>,
    pub tools: Option<Vec<Tool>>,
    pub tool_choice: Option<String>,
}

impl AIRequest {
    pub fn new(model: ModelType, prompt: String) -> Self {
        Self {
            model,
            prompt,
            temperature: None,
            max_tokens: None,
            top_p: None,
            tools: None,
            tool_choice: None,
        }
    }

    pub fn with_config(model: ModelType, prompt: String, config: &ModelConfig) -> Self {
        Self {
            model,
            prompt,
            temperature: Some(config.temperature),
            max_tokens: Some(config.max_tokens),
            top_p: Some(config.top_p),
            tools: None,
            tool_choice: None,
        }
    }
}

/// AI response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIResponse {
    pub content: String,
    pub tool_calls: Option<Vec<ToolCall>>,
    pub usage: Usage,
    pub model: String,
    pub finish_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// AI client for making requests to AI providers
pub struct AIClient {
    client: reqwest::Client,
    api_keys: HashMap<String, String>,
}

impl AIClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
            api_keys: HashMap::new(),
        }
    }

    pub fn with_api_key(mut self, provider: String, api_key: String) -> Self {
        self.api_keys.insert(provider, api_key);
        self
    }

    /// Generate completion
    pub async fn generate(&self, request: AIRequest) -> Result<AIResponse, AIError> {
        let provider = request.model.provider();
        let api_key = self
            .api_keys
            .get(provider)
            .ok_or_else(|| AIError::ApiKeyNotConfigured(provider.to_string()))?;

        match provider {
            "openai" => self.generate_openai(request, api_key).await,
            "anthropic" => self.generate_anthropic(request, api_key).await,
            _ => Err(AIError::UnsupportedProvider(provider.to_string())),
        }
    }

    async fn generate_openai(
        &self,
        request: AIRequest,
        api_key: &str,
    ) -> Result<AIResponse, AIError> {
        let mut body = serde_json::json!({
            "model": request.model.as_str(),
            "messages": [
                {
                    "role": "user",
                    "content": request.prompt
                }
            ],
        });

        if let Some(temp) = request.temperature {
            body["temperature"] = JsonValue::from(temp);
        }
        if let Some(max_tokens) = request.max_tokens {
            body["max_tokens"] = JsonValue::from(max_tokens);
        }
        if let Some(top_p) = request.top_p {
            body["top_p"] = JsonValue::from(top_p);
        }
        if let Some(tools) = request.tools {
            body["tools"] = serde_json::to_value(tools).unwrap();
        }

        let response = self
            .client
            .post("https://api.openai.com/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AIError::RequestFailed(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AIError::ApiError(error_text));
        }

        let response_json: JsonValue = response
            .json()
            .await
            .map_err(|e| AIError::ParseError(e.to_string()))?;

        let choice = &response_json["choices"][0];
        let message = &choice["message"];

        let content = message["content"]
            .as_str()
            .unwrap_or("")
            .to_string();

        let tool_calls = if let Some(calls) = message["tool_calls"].as_array() {
            Some(
                calls
                    .iter()
                    .map(|call| ToolCall {
                        id: call["id"].as_str().unwrap_or("").to_string(),
                        name: call["function"]["name"].as_str().unwrap_or("").to_string(),
                        arguments: call["function"]["arguments"].clone(),
                    })
                    .collect(),
            )
        } else {
            None
        };

        Ok(AIResponse {
            content,
            tool_calls,
            usage: Usage {
                prompt_tokens: response_json["usage"]["prompt_tokens"].as_u64().unwrap_or(0)
                    as u32,
                completion_tokens: response_json["usage"]["completion_tokens"]
                    .as_u64()
                    .unwrap_or(0) as u32,
                total_tokens: response_json["usage"]["total_tokens"].as_u64().unwrap_or(0)
                    as u32,
            },
            model: response_json["model"].as_str().unwrap_or("").to_string(),
            finish_reason: choice["finish_reason"].as_str().unwrap_or("").to_string(),
        })
    }

    async fn generate_anthropic(
        &self,
        request: AIRequest,
        api_key: &str,
    ) -> Result<AIResponse, AIError> {
        let body = serde_json::json!({
            "model": request.model.as_str(),
            "messages": [
                {
                    "role": "user",
                    "content": request.prompt
                }
            ],
            "max_tokens": request.max_tokens.unwrap_or(2000),
            "temperature": request.temperature.unwrap_or(0.7),
        });

        let response = self
            .client
            .post("https://api.anthropic.com/v1/messages")
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|e| AIError::RequestFailed(e.to_string()))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(AIError::ApiError(error_text));
        }

        let response_json: JsonValue = response
            .json()
            .await
            .map_err(|e| AIError::ParseError(e.to_string()))?;

        let content = response_json["content"][0]["text"]
            .as_str()
            .unwrap_or("")
            .to_string();

        Ok(AIResponse {
            content,
            tool_calls: None,
            usage: Usage {
                prompt_tokens: response_json["usage"]["input_tokens"].as_u64().unwrap_or(0)
                    as u32,
                completion_tokens: response_json["usage"]["output_tokens"].as_u64().unwrap_or(0)
                    as u32,
                total_tokens: (response_json["usage"]["input_tokens"].as_u64().unwrap_or(0)
                    + response_json["usage"]["output_tokens"].as_u64().unwrap_or(0))
                    as u32,
            },
            model: response_json["model"].as_str().unwrap_or("").to_string(),
            finish_reason: response_json["stop_reason"]
                .as_str()
                .unwrap_or("")
                .to_string(),
        })
    }
}

impl Default for AIClient {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum AIError {
    #[error("API key not configured for provider: {0}")]
    ApiKeyNotConfigured(String),

    #[error("Unsupported provider: {0}")]
    UnsupportedProvider(String),

    #[error("Request failed: {0}")]
    RequestFailed(String),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("Parse error: {0}")]
    ParseError(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ai_request_creation() {
        let request = AIRequest::new(ModelType::GPT4, "Hello".to_string());
        assert_eq!(request.prompt, "Hello");
        assert_eq!(request.model, ModelType::GPT4);
    }

    #[test]
    fn test_ai_client_creation() {
        let client = AIClient::new()
            .with_api_key("openai".to_string(), "sk-test".to_string());

        assert!(client.api_keys.contains_key("openai"));
    }
}
