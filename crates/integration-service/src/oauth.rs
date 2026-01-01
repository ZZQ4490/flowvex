use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

/// OAuth2 handler for managing OAuth2 flows
pub struct OAuth2Handler {
    configs: Arc<RwLock<HashMap<Uuid, OAuth2Config>>>,
    tokens: Arc<RwLock<HashMap<Uuid, OAuth2Token>>>,
    client: reqwest::Client,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuth2Config {
    pub client_id: String,
    pub client_secret: String,
    pub auth_url: String,
    pub token_url: String,
    pub scopes: Vec<String>,
    pub redirect_uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OAuth2Token {
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub expires_at: DateTime<Utc>,
    pub token_type: String,
}

impl OAuth2Handler {
    pub fn new() -> Self {
        Self {
            configs: Arc::new(RwLock::new(HashMap::new())),
            tokens: Arc::new(RwLock::new(HashMap::new())),
            client: reqwest::Client::new(),
        }
    }

    /// Register an OAuth2 configuration
    pub async fn register_config(&self, integration_id: Uuid, config: OAuth2Config) {
        let mut configs = self.configs.write().await;
        configs.insert(integration_id, config);
    }

    /// Generate authorization URL
    pub async fn get_auth_url(&self, integration_id: Uuid, state: &str) -> Option<String> {
        let configs = self.configs.read().await;
        let config = configs.get(&integration_id)?;

        let scopes = config.scopes.join(" ");
        Some(format!(
            "{}?client_id={}&redirect_uri={}&scope={}&state={}&response_type=code",
            config.auth_url,
            urlencoding::encode(&config.client_id),
            urlencoding::encode(&config.redirect_uri),
            urlencoding::encode(&scopes),
            state
        ))
    }

    /// Exchange authorization code for access token
    pub async fn exchange_code(
        &self,
        integration_id: Uuid,
        code: &str,
    ) -> Result<OAuth2Token, OAuth2Error> {
        let configs = self.configs.read().await;
        let config = configs
            .get(&integration_id)
            .ok_or(OAuth2Error::ConfigNotFound)?
            .clone();
        drop(configs);

        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
            ("redirect_uri", &config.redirect_uri),
            ("client_id", &config.client_id),
            ("client_secret", &config.client_secret),
        ];

        let response = self
            .client
            .post(&config.token_url)
            .form(&params)
            .send()
            .await
            .map_err(|e| OAuth2Error::RequestFailed(e.to_string()))?;

        if !response.status().is_success() {
            return Err(OAuth2Error::TokenExchangeFailed(
                response.status().to_string(),
            ));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| OAuth2Error::InvalidResponse(e.to_string()))?;

        let token = OAuth2Token {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token,
            expires_at: Utc::now() + Duration::seconds(token_response.expires_in as i64),
            token_type: token_response.token_type,
        };

        // Store token
        let mut tokens = self.tokens.write().await;
        tokens.insert(integration_id, token.clone());

        Ok(token)
    }

    /// Refresh an access token
    pub async fn refresh_token(&self, integration_id: Uuid) -> Result<OAuth2Token, OAuth2Error> {
        let tokens = self.tokens.read().await;
        let old_token = tokens
            .get(&integration_id)
            .ok_or(OAuth2Error::TokenNotFound)?;

        let refresh_token = old_token
            .refresh_token
            .as_ref()
            .ok_or(OAuth2Error::NoRefreshToken)?
            .clone();
        drop(tokens);

        let configs = self.configs.read().await;
        let config = configs
            .get(&integration_id)
            .ok_or(OAuth2Error::ConfigNotFound)?
            .clone();
        drop(configs);

        let params = [
            ("grant_type", "refresh_token"),
            ("refresh_token", &refresh_token),
            ("client_id", &config.client_id),
            ("client_secret", &config.client_secret),
        ];

        let response = self
            .client
            .post(&config.token_url)
            .form(&params)
            .send()
            .await
            .map_err(|e| OAuth2Error::RequestFailed(e.to_string()))?;

        if !response.status().is_success() {
            return Err(OAuth2Error::RefreshFailed(response.status().to_string()));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| OAuth2Error::InvalidResponse(e.to_string()))?;

        let token = OAuth2Token {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token.or(Some(refresh_token)),
            expires_at: Utc::now() + Duration::seconds(token_response.expires_in as i64),
            token_type: token_response.token_type,
        };

        // Update token
        let mut tokens = self.tokens.write().await;
        tokens.insert(integration_id, token.clone());

        Ok(token)
    }

    /// Get valid access token (refresh if expired)
    pub async fn get_valid_token(&self, integration_id: Uuid) -> Result<String, OAuth2Error> {
        let tokens = self.tokens.read().await;
        if let Some(token) = tokens.get(&integration_id) {
            if token.expires_at > Utc::now() {
                return Ok(token.access_token.clone());
            }
        }
        drop(tokens);

        // Token expired or not found, refresh it
        let token = self.refresh_token(integration_id).await?;
        Ok(token.access_token)
    }
}

impl Default for OAuth2Handler {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: u64,
    token_type: String,
}

#[derive(Debug, thiserror::Error)]
pub enum OAuth2Error {
    #[error("OAuth2 config not found")]
    ConfigNotFound,

    #[error("Token not found")]
    TokenNotFound,

    #[error("No refresh token available")]
    NoRefreshToken,

    #[error("Request failed: {0}")]
    RequestFailed(String),

    #[error("Token exchange failed: {0}")]
    TokenExchangeFailed(String),

    #[error("Token refresh failed: {0}")]
    RefreshFailed(String),

    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_register_config() {
        let handler = OAuth2Handler::new();
        let id = Uuid::new_v4();
        let config = OAuth2Config {
            client_id: "test".to_string(),
            client_secret: "secret".to_string(),
            auth_url: "https://auth.example.com".to_string(),
            token_url: "https://token.example.com".to_string(),
            scopes: vec!["read".to_string()],
            redirect_uri: "https://callback.example.com".to_string(),
        };

        handler.register_config(id, config).await;
        let auth_url = handler.get_auth_url(id, "state123").await;
        assert!(auth_url.is_some());
    }
}

