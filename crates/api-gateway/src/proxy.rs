use common::error::{GatewayError, Result};
use common::types::{ApiRequest, ApiResponse, HttpMethod};
use reqwest::{Client, Method, RequestBuilder};
use std::time::Instant;

/// API proxy for forwarding requests to external providers
pub struct ApiProxy {
    client: Client,
}

impl ApiProxy {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    /// Send an API request and return the response
    pub async fn send(&self, request: ApiRequest, api_key: &str) -> Result<ApiResponse> {
        let start = Instant::now();
        let request_id = request.id;

        // Build the request
        let mut req_builder = self.build_request(&request)?;

        // Add API key to headers
        req_builder = req_builder.header("Authorization", format!("Bearer {}", api_key));

        // Add custom headers
        for (key, value) in &request.headers {
            req_builder = req_builder.header(key, value);
        }

        // Add body if present
        if let Some(body) = &request.body {
            req_builder = req_builder.json(body);
        }

        // Send the request
        let response = req_builder
            .send()
            .await
            .map_err(|e| GatewayError::ProviderUnavailable(e.to_string()))?;

        let status_code = response.status().as_u16();
        let headers = response
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();

        // Parse response body
        let body = if response.status().is_success() {
            response
                .json()
                .await
                .ok()
        } else {
            None
        };

        let latency_ms = start.elapsed().as_millis() as u64;

        Ok(ApiResponse {
            request_id,
            status_code,
            headers,
            body,
            latency_ms,
        })
    }

    /// Build a reqwest request from ApiRequest
    fn build_request(&self, request: &ApiRequest) -> Result<RequestBuilder> {
        let method = match request.method {
            HttpMethod::GET => Method::GET,
            HttpMethod::POST => Method::POST,
            HttpMethod::PUT => Method::PUT,
            HttpMethod::PATCH => Method::PATCH,
            HttpMethod::DELETE => Method::DELETE,
        };

        let url = format!("{}", request.endpoint);
        Ok(self.client.request(method, url))
    }

    /// Send a batch of requests concurrently
    pub async fn send_batch(
        &self,
        requests: Vec<(ApiRequest, String)>,
    ) -> Vec<Result<ApiResponse>> {
        let futures: Vec<_> = requests
            .into_iter()
            .map(|(req, key)| {
                let key_owned = key.clone();
                async move { self.send(req, &key_owned).await }
            })
            .collect();

        futures::future::join_all(futures).await
    }
}

impl Default for ApiProxy {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::{Priority, RetryConfig};
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_proxy_creation() {
        let proxy = ApiProxy::new();
        assert!(true); // Just test that it can be created
    }

    #[test]
    fn test_build_request() {
        let proxy = ApiProxy::new();
        let request = ApiRequest {
            id: Uuid::new_v4(),
            provider: "openai".to_string(),
            endpoint: "https://api.openai.com/v1/chat/completions".to_string(),
            method: HttpMethod::POST,
            headers: HashMap::new(),
            body: Some(serde_json::json!({"model": "gpt-4"})),
            priority: Priority::Normal,
            workflow_id: Uuid::new_v4(),
            node_id: Uuid::new_v4(),
            timeout: std::time::Duration::from_secs(30),
            retry_config: RetryConfig::default(),
        };

        let result = proxy.build_request(&request);
        assert!(result.is_ok());
    }
}
