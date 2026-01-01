use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use common::types::Role;
use common::error::{AuthError, PlatformError, Result};

/// JWT Claims structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: Uuid,           // user_id
    pub role: Role,
    pub permissions: Vec<String>,
    pub exp: i64,            // expiration timestamp
    pub iat: i64,            // issued at timestamp
}

/// JWT Manager for token generation and validation
pub struct JwtManager {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
    token_expiration: Duration,
}

impl JwtManager {
    /// Create a new JWT manager with the given secret
    pub fn new(secret: &str, token_expiration_hours: i64) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
            token_expiration: Duration::hours(token_expiration_hours),
        }
    }

    /// Generate a JWT token for a user
    pub fn generate_token(
        &self,
        user_id: Uuid,
        role: Role,
        permissions: Vec<String>,
    ) -> Result<String> {
        let now = Utc::now();
        let exp = now + self.token_expiration;

        let claims = JwtClaims {
            sub: user_id,
            role,
            permissions,
            exp: exp.timestamp(),
            iat: now.timestamp(),
        };

        encode(&Header::default(), &claims, &self.encoding_key)
            .map_err(|_| PlatformError::Auth(AuthError::InvalidToken))
    }

    /// Validate and decode a JWT token
    pub fn validate_token(&self, token: &str) -> Result<JwtClaims> {
        let token_data = decode::<JwtClaims>(
            token,
            &self.decoding_key,
            &Validation::default(),
        )
        .map_err(|_| PlatformError::Auth(AuthError::InvalidToken))?;

        Ok(token_data.claims)
    }

    /// Refresh a token (generate a new one with updated expiration)
    pub fn refresh_token(&self, claims: &JwtClaims) -> Result<String> {
        self.generate_token(claims.sub, claims.role.clone(), claims.permissions.clone())
    }
}
