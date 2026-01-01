use axum::{
    extract::State,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;

use rbac_service::JwtManager;

/// User model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: Uuid,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub name: String,
    pub role: String,
    pub avatar: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_login_at: Option<DateTime<Utc>>,
    pub is_active: bool,
}

/// User response (without sensitive data)
#[derive(Debug, Clone, Serialize)]
pub struct UserResponse {
    pub id: Uuid,
    pub email: String,
    pub name: String,
    pub role: String,
    pub avatar: Option<String>,
    pub created_at: DateTime<Utc>,
}

impl From<&User> for UserResponse {
    fn from(user: &User) -> Self {
        Self {
            id: user.id,
            email: user.email.clone(),
            name: user.name.clone(),
            role: user.role.clone(),
            avatar: user.avatar.clone(),
            created_at: user.created_at,
        }
    }
}

/// Login request
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

/// Register request
#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub name: String,
}

/// Auth response
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    pub token: Option<String>,
    pub user: Option<UserResponse>,
    pub message: Option<String>,
}

/// Update profile request
#[derive(Debug, Deserialize)]
pub struct UpdateProfileRequest {
    pub name: Option<String>,
    pub avatar: Option<String>,
}

/// Change password request
#[derive(Debug, Deserialize)]
pub struct ChangePasswordRequest {
    pub current_password: String,
    pub new_password: String,
}

/// In-memory user store (for development, replace with database in production)
#[derive(Clone)]
pub struct UserStore {
    users: Arc<RwLock<HashMap<Uuid, User>>>,
    email_index: Arc<RwLock<HashMap<String, Uuid>>>,
}

impl UserStore {
    pub fn new() -> Self {
        Self {
            users: Arc::new(RwLock::new(HashMap::new())),
            email_index: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn create_user(&self, email: String, password_hash: String, name: String) -> Result<User, String> {
        let mut email_index = self.email_index.write().await;
        
        if email_index.contains_key(&email) {
            return Err("邮箱已被注册".to_string());
        }

        let user = User {
            id: Uuid::new_v4(),
            email: email.clone(),
            password_hash,
            name,
            role: "user".to_string(),
            avatar: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_login_at: None,
            is_active: true,
        };

        email_index.insert(email, user.id);
        self.users.write().await.insert(user.id, user.clone());

        Ok(user)
    }

    pub async fn get_user_by_email(&self, email: &str) -> Option<User> {
        let email_index = self.email_index.read().await;
        if let Some(user_id) = email_index.get(email) {
            let users = self.users.read().await;
            return users.get(user_id).cloned();
        }
        None
    }

    pub async fn get_user_by_id(&self, id: Uuid) -> Option<User> {
        let users = self.users.read().await;
        users.get(&id).cloned()
    }

    pub async fn update_user(&self, id: Uuid, updates: impl FnOnce(&mut User)) -> Option<User> {
        let mut users = self.users.write().await;
        if let Some(user) = users.get_mut(&id) {
            updates(user);
            user.updated_at = Utc::now();
            return Some(user.clone());
        }
        None
    }

    pub async fn update_last_login(&self, id: Uuid) {
        let mut users = self.users.write().await;
        if let Some(user) = users.get_mut(&id) {
            user.last_login_at = Some(Utc::now());
        }
    }
}

/// User service state
#[derive(Clone)]
pub struct UserServiceState {
    pub store: UserStore,
    pub jwt_manager: Arc<JwtManager>,
}

impl UserServiceState {
    pub fn new(jwt_manager: Arc<JwtManager>) -> Self {
        Self {
            store: UserStore::new(),
            jwt_manager,
        }
    }

    fn hash_password(&self, password: &str) -> Result<String, String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        argon2
            .hash_password(password.as_bytes(), &salt)
            .map(|h| h.to_string())
            .map_err(|_| "密码加密失败".to_string())
    }

    fn verify_password(&self, password: &str, hash: &str) -> bool {
        if let Ok(parsed_hash) = PasswordHash::new(hash) {
            Argon2::default()
                .verify_password(password.as_bytes(), &parsed_hash)
                .is_ok()
        } else {
            false
        }
    }
}

/// Register handler
pub async fn register_handler(
    State(state): State<UserServiceState>,
    Json(req): Json<RegisterRequest>,
) -> impl IntoResponse {
    // Validate input
    if req.email.is_empty() || !req.email.contains('@') {
        return (
            StatusCode::BAD_REQUEST,
            Json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: Some("无效的邮箱地址".to_string()),
            }),
        );
    }

    if req.password.len() < 6 {
        return (
            StatusCode::BAD_REQUEST,
            Json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: Some("密码长度至少6位".to_string()),
            }),
        );
    }

    if req.name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: Some("用户名不能为空".to_string()),
            }),
        );
    }

    // Hash password
    let password_hash = match state.hash_password(&req.password) {
        Ok(hash) => hash,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: Some(e),
                }),
            );
        }
    };

    // Create user
    let user = match state.store.create_user(req.email, password_hash, req.name).await {
        Ok(user) => user,
        Err(e) => {
            return (
                StatusCode::CONFLICT,
                Json(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: Some(e),
                }),
            );
        }
    };

    // Generate token
    let token = match state.jwt_manager.generate_token(
        user.id,
        common::types::Role::User,
        vec![],
    ) {
        Ok(token) => token,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: Some("生成令牌失败".to_string()),
                }),
            );
        }
    };

    (
        StatusCode::CREATED,
        Json(AuthResponse {
            success: true,
            token: Some(token),
            user: Some(UserResponse::from(&user)),
            message: Some("注册成功".to_string()),
        }),
    )
}

/// Login handler
pub async fn login_handler(
    State(state): State<UserServiceState>,
    Json(req): Json<LoginRequest>,
) -> impl IntoResponse {
    // Find user by email
    let user = match state.store.get_user_by_email(&req.email).await {
        Some(user) => user,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: Some("邮箱或密码错误".to_string()),
                }),
            );
        }
    };

    // Verify password
    if !state.verify_password(&req.password, &user.password_hash) {
        return (
            StatusCode::UNAUTHORIZED,
            Json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: Some("邮箱或密码错误".to_string()),
            }),
        );
    }

    // Check if user is active
    if !user.is_active {
        return (
            StatusCode::FORBIDDEN,
            Json(AuthResponse {
                success: false,
                token: None,
                user: None,
                message: Some("账户已被禁用".to_string()),
            }),
        );
    }

    // Update last login
    state.store.update_last_login(user.id).await;

    // Generate token
    let role = match user.role.as_str() {
        "admin" => common::types::Role::Admin,
        "manager" => common::types::Role::Manager,
        "viewer" => common::types::Role::Viewer,
        _ => common::types::Role::User,
    };

    let token = match state.jwt_manager.generate_token(user.id, role, vec![]) {
        Ok(token) => token,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(AuthResponse {
                    success: false,
                    token: None,
                    user: None,
                    message: Some("生成令牌失败".to_string()),
                }),
            );
        }
    };

    (
        StatusCode::OK,
        Json(AuthResponse {
            success: true,
            token: Some(token),
            user: Some(UserResponse::from(&user)),
            message: Some("登录成功".to_string()),
        }),
    )
}

/// Get current user handler
pub async fn get_me_handler(
    State(state): State<UserServiceState>,
    headers: axum::http::HeaderMap,
) -> impl IntoResponse {
    // Extract token from Authorization header
    let token = match headers.get("Authorization") {
        Some(value) => {
            let value = value.to_str().unwrap_or("");
            if value.starts_with("Bearer ") {
                &value[7..]
            } else {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "无效的认证头"
                    })),
                );
            }
        }
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "未提供认证令牌"
                })),
            );
        }
    };

    // Validate token
    let claims = match state.jwt_manager.validate_token(token) {
        Ok(claims) => claims,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "令牌无效或已过期"
                })),
            );
        }
    };

    // Get user
    let user = match state.store.get_user_by_id(claims.sub).await {
        Some(user) => user,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "用户不存在"
                })),
            );
        }
    };

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "user": UserResponse::from(&user)
        })),
    )
}

/// Update profile handler
pub async fn update_profile_handler(
    State(state): State<UserServiceState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProfileRequest>,
) -> impl IntoResponse {
    // Extract and validate token
    let token = match headers.get("Authorization") {
        Some(value) => {
            let value = value.to_str().unwrap_or("");
            if value.starts_with("Bearer ") {
                &value[7..]
            } else {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "无效的认证头"
                    })),
                );
            }
        }
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "未提供认证令牌"
                })),
            );
        }
    };

    let claims = match state.jwt_manager.validate_token(token) {
        Ok(claims) => claims,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "令牌无效或已过期"
                })),
            );
        }
    };

    // Update user
    let user = match state.store.update_user(claims.sub, |user| {
        if let Some(name) = &req.name {
            user.name = name.clone();
        }
        if let Some(avatar) = &req.avatar {
            user.avatar = Some(avatar.clone());
        }
    }).await {
        Some(user) => user,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "用户不存在"
                })),
            );
        }
    };

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "user": UserResponse::from(&user),
            "message": "更新成功"
        })),
    )
}

/// Change password handler
pub async fn change_password_handler(
    State(state): State<UserServiceState>,
    headers: axum::http::HeaderMap,
    Json(req): Json<ChangePasswordRequest>,
) -> impl IntoResponse {
    // Extract and validate token
    let token = match headers.get("Authorization") {
        Some(value) => {
            let value = value.to_str().unwrap_or("");
            if value.starts_with("Bearer ") {
                &value[7..]
            } else {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({
                        "success": false,
                        "message": "无效的认证头"
                    })),
                );
            }
        }
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "未提供认证令牌"
                })),
            );
        }
    };

    let claims = match state.jwt_manager.validate_token(token) {
        Ok(claims) => claims,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({
                    "success": false,
                    "message": "令牌无效或已过期"
                })),
            );
        }
    };

    // Get current user
    let user = match state.store.get_user_by_id(claims.sub).await {
        Some(user) => user,
        None => {
            return (
                StatusCode::NOT_FOUND,
                Json(serde_json::json!({
                    "success": false,
                    "message": "用户不存在"
                })),
            );
        }
    };

    // Verify current password
    if !state.verify_password(&req.current_password, &user.password_hash) {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "当前密码错误"
            })),
        );
    }

    // Validate new password
    if req.new_password.len() < 6 {
        return (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({
                "success": false,
                "message": "新密码长度至少6位"
            })),
        );
    }

    // Hash new password
    let new_hash = match state.hash_password(&req.new_password) {
        Ok(hash) => hash,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({
                    "success": false,
                    "message": "密码加密失败"
                })),
            );
        }
    };

    // Update password
    state.store.update_user(claims.sub, |user| {
        user.password_hash = new_hash;
    }).await;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "success": true,
            "message": "密码修改成功"
        })),
    )
}
