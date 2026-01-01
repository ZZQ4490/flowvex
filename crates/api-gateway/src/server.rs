use axum::{
    extract::Request,
    http::StatusCode,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post, put, delete},
    Json, Router,
};
use serde_json::json;
use std::sync::Arc;
use std::time::Instant;
use tower_http::{
    compression::CompressionLayer,
    cors::CorsLayer,
    trace::{DefaultMakeSpan, DefaultOnResponse, TraceLayer},
};
use tracing::{info, Level};
use uuid::Uuid;

use rbac_service::{JwtManager, AuthMiddleware};
use crate::websocket::{websocket_handler, WebSocketManager};
use crate::file_service::{
    FileServiceConfig,
    list_files, upload_file, read_file, write_file, delete_file,
};
use crate::user_service::{
    UserServiceState,
    register_handler, login_handler, get_me_handler,
    update_profile_handler, change_password_handler,
};

/// Server configuration
#[derive(Clone)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub jwt_secret: String,
    pub jwt_expiration_hours: i64,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "0.0.0.0".to_string(),
            port: 8080,
            jwt_secret: "your-secret-key-change-in-production".to_string(),
            jwt_expiration_hours: 24,
        }
    }
}

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub jwt_manager: Arc<JwtManager>,
    pub ws_manager: WebSocketManager,
}

/// Create and configure the HTTP server
pub fn create_server(config: ServerConfig) -> Router {
    // Initialize JWT manager
    let jwt_manager = Arc::new(JwtManager::new(
        &config.jwt_secret,
        config.jwt_expiration_hours,
    ));

    // Initialize WebSocket manager
    let ws_manager = WebSocketManager::new();

    // Initialize file service config
    let file_config = FileServiceConfig::default();

    // Initialize user service state
    let user_state = UserServiceState::new(jwt_manager.clone());

    // Create application state
    let app_state = AppState {
        jwt_manager: jwt_manager.clone(),
        ws_manager: ws_manager.clone(),
    };

    // Create auth middleware
    let auth_middleware = AuthMiddleware::new(jwt_manager);

    // Build router with public routes
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/ws", get(websocket_handler));

    // Auth routes (public)
    let auth_routes = Router::new()
        .route("/api/v1/auth/register", post(register_handler))
        .route("/api/v1/auth/login", post(login_handler))
        .route("/api/v1/auth/me", get(get_me_handler))
        .route("/api/v1/auth/profile", put(update_profile_handler))
        .route("/api/v1/auth/password", put(change_password_handler))
        .with_state(user_state);

    // File service routes (public for now, can add auth later)
    let file_routes = Router::new()
        .route("/api/v1/files", get(list_files))
        .route("/api/v1/files", post(upload_file))
        .route("/api/v1/files/write", post(write_file))
        .route("/api/v1/files/:filename", get(read_file))
        .route("/api/v1/files/:filename", delete(delete_file))
        .with_state(file_config);

    // Build router with protected routes
    let protected_routes = Router::new()
        .route("/api/v1/workflows", get(list_workflows))
        .route("/api/v1/workflows", post(create_workflow))
        .route_layer(middleware::from_fn_with_state(
            auth_middleware.clone(),
            AuthMiddleware::auth_middleware,
        ));

    // Combine routes
    let app = Router::new()
        .merge(public_routes)
        .merge(auth_routes)
        .merge(file_routes)
        .merge(protected_routes)
        .layer(middleware::from_fn(request_logging_middleware))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                .on_response(DefaultOnResponse::new().level(Level::INFO)),
        )
        .layer(CompressionLayer::new())
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    app
}

/// Request logging middleware
async fn request_logging_middleware(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let request_id = Uuid::new_v4();
    
    // Add request ID to extensions
    let mut req = req;
    req.extensions_mut().insert(request_id);
    
    let start = Instant::now();
    
    info!(
        request_id = %request_id,
        method = %method,
        uri = %uri,
        "Incoming request"
    );

    let response = next.run(req).await;
    
    let duration = start.elapsed();
    let status = response.status();
    
    info!(
        request_id = %request_id,
        method = %method,
        uri = %uri,
        status = %status,
        duration_ms = %duration.as_millis(),
        "Request completed"
    );

    response
}

/// Health check endpoint
async fn health_check() -> impl IntoResponse {
    Json(json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}

/// List workflows handler (placeholder)
async fn list_workflows() -> impl IntoResponse {
    Json(json!({
        "workflows": [],
        "total": 0,
    }))
}

/// Create workflow handler (placeholder)
async fn create_workflow() -> impl IntoResponse {
    (
        StatusCode::NOT_IMPLEMENTED,
        Json(json!({
            "error": {
                "code": "NOT_IMPLEMENTED",
                "message": "Create workflow endpoint not yet implemented",
            }
        })),
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    #[tokio::test]
    async fn test_health_check() {
        let config = ServerConfig::default();
        let app = create_server(config);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/health")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn test_protected_route_without_auth() {
        let config = ServerConfig::default();
        let app = create_server(config);

        let response = app
            .oneshot(
                Request::builder()
                    .uri("/api/v1/workflows")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    }
}
