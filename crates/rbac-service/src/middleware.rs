use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;

use crate::jwt::{JwtClaims, JwtManager};

/// Auth middleware state
#[derive(Clone)]
pub struct AuthMiddleware {
    jwt_manager: Arc<JwtManager>,
}

impl AuthMiddleware {
    pub fn new(jwt_manager: Arc<JwtManager>) -> Self {
        Self { jwt_manager }
    }

    /// Middleware function to validate JWT tokens
    pub async fn auth_middleware(
        State(auth): State<Self>,
        mut req: Request,
        next: Next,
    ) -> Result<Response, AuthError> {
        // Extract token from Authorization header
        let auth_header = req
            .headers()
            .get(header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .ok_or(AuthError::MissingToken)?;

        // Check for Bearer token
        let token = auth_header
            .strip_prefix("Bearer ")
            .ok_or(AuthError::InvalidTokenFormat)?;

        // Validate token
        let claims = auth.jwt_manager
            .validate_token(token)
            .map_err(|_| AuthError::InvalidToken)?;

        // Insert claims into request extensions for downstream handlers
        req.extensions_mut().insert(claims);

        Ok(next.run(req).await)
    }
}

/// Authentication errors
#[derive(Debug)]
pub enum AuthError {
    MissingToken,
    InvalidTokenFormat,
    InvalidToken,
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            AuthError::MissingToken => (StatusCode::UNAUTHORIZED, "Missing authorization token"),
            AuthError::InvalidTokenFormat => (StatusCode::UNAUTHORIZED, "Invalid token format. Expected 'Bearer <token>'"),
            AuthError::InvalidToken => (StatusCode::UNAUTHORIZED, "Invalid or expired token"),
        };

        let body = Json(json!({
            "error": {
                "code": "AUTH_ERROR",
                "message": message,
            }
        }));

        (status, body).into_response()
    }
}

/// Extension trait to extract claims from request
pub trait ClaimsExt {
    fn claims(&self) -> Option<&JwtClaims>;
}

impl ClaimsExt for Request {
    fn claims(&self) -> Option<&JwtClaims> {
        self.extensions().get::<JwtClaims>()
    }
}
