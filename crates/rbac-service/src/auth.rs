use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use common::error::{AuthError, Result};
use sqlx::{PgPool, Row};
use std::sync::Arc;
use uuid::Uuid;

use crate::{jwt::JwtManager, roles::{Role, RoleManager}};

/// Authentication service for user login and registration
pub struct AuthService {
    pool: PgPool,
    jwt_manager: Arc<JwtManager>,
    role_manager: Arc<RoleManager>,
}

impl AuthService {
    pub fn new(pool: PgPool, jwt_manager: Arc<JwtManager>, role_manager: Arc<RoleManager>) -> Self {
        Self {
            pool,
            jwt_manager,
            role_manager,
        }
    }

    /// Hash a password using Argon2
    pub fn hash_password(&self, password: &str) -> Result<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|_| AuthError::InvalidCredentials)?;

        Ok(password_hash.to_string())
    }

    /// Verify a password against a hash
    pub fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|_| AuthError::InvalidCredentials)?;

        let argon2 = Argon2::default();
        Ok(argon2
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    /// Register a new user
    pub async fn register(
        &self,
        email: &str,
        password: &str,
        name: &str,
        role: Role,
    ) -> Result<(Uuid, String)> {
        let password_hash = self.hash_password(password)?;
        let user_id = Uuid::new_v4();

        // Insert user into database
        sqlx::query(
            r#"
            INSERT INTO users (id, email, password_hash, name, role, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            "#,
        )
        .bind(user_id)
        .bind(email)
        .bind(&password_hash)
        .bind(name)
        .bind(role.as_str())
        .execute(&self.pool)
        .await
        .map_err(|_| AuthError::UserNotFound)?;

        // Assign role in role manager
        self.role_manager.assign_role(user_id, role.clone()).await
            .map_err(|_| AuthError::InvalidCredentials)?;

        // Get permissions for the role
        let permissions = self.role_manager.get_role_permissions(&role).await;
        let permission_strings: Vec<String> = permissions
            .iter()
            .map(|p| format!("{}:{}:{:?}", 
                match p.resource {
                    common::types::ResourceType::Workflow => "workflow",
                    common::types::ResourceType::Template => "template",
                    common::types::ResourceType::Integration => "integration",
                    common::types::ResourceType::User => "user",
                    common::types::ResourceType::AuditLog => "audit_log",
                    common::types::ResourceType::Settings => "settings",
                },
                match p.action {
                    common::types::ActionType2::Create => "create",
                    common::types::ActionType2::Read => "read",
                    common::types::ActionType2::Update => "update",
                    common::types::ActionType2::Delete => "delete",
                    common::types::ActionType2::Execute => "execute",
                    common::types::ActionType2::Share => "share",
                },
                p.scope
            ))
            .collect();

        // Generate JWT token
        let token = self.jwt_manager.generate_token(user_id, role, permission_strings)?;

        Ok((user_id, token))
    }

    /// Login a user
    pub async fn login(&self, email: &str, password: &str) -> Result<(Uuid, String)> {
        // Fetch user from database
        let row = sqlx::query(
            r#"
            SELECT id, password_hash, role
            FROM users
            WHERE email = $1 AND deleted_at IS NULL
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
        .map_err(|_| AuthError::UserNotFound)?
        .ok_or(AuthError::UserNotFound)?;

        let user_id: Uuid = row.get("id");
        let password_hash: String = row.get("password_hash");
        let role_str: String = row.get("role");

        // Verify password
        if !self.verify_password(password, &password_hash)? {
            return Err(AuthError::InvalidCredentials.into());
        }

        // Parse role
        let role = match role_str.as_str() {
            "admin" => Role::Admin,
            "manager" => Role::Manager,
            "user" => Role::User,
            "viewer" => Role::Viewer,
            custom => Role::Custom(custom.to_string()),
        };

        // Get permissions for the role
        let permissions = self.role_manager.get_role_permissions(&role).await;
        let permission_strings: Vec<String> = permissions
            .iter()
            .map(|p| format!("{}:{}:{:?}", 
                match p.resource {
                    common::types::ResourceType::Workflow => "workflow",
                    common::types::ResourceType::Template => "template",
                    common::types::ResourceType::Integration => "integration",
                    common::types::ResourceType::User => "user",
                    common::types::ResourceType::AuditLog => "audit_log",
                    common::types::ResourceType::Settings => "settings",
                },
                match p.action {
                    common::types::ActionType2::Create => "create",
                    common::types::ActionType2::Read => "read",
                    common::types::ActionType2::Update => "update",
                    common::types::ActionType2::Delete => "delete",
                    common::types::ActionType2::Execute => "execute",
                    common::types::ActionType2::Share => "share",
                },
                p.scope
            ))
            .collect();

        // Generate JWT token
        let token = self.jwt_manager.generate_token(user_id, role, permission_strings)?;

        Ok((user_id, token))
    }

    /// Change user role
    pub async fn change_user_role(&self, user_id: Uuid, new_role: Role) -> Result<()> {
        // Update in database
        sqlx::query(
            r#"
            UPDATE users
            SET role = $1, updated_at = NOW()
            WHERE id = $2
            "#,
        )
        .bind(new_role.as_str())
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|_| AuthError::UserNotFound)?;

        // Update in role manager
        self.role_manager.assign_role(user_id, new_role).await
            .map_err(|_| AuthError::InvalidCredentials)?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify_password() {
        let pool = PgPool::connect_lazy("postgresql://localhost/test").unwrap();
        let jwt_manager = Arc::new(JwtManager::new("secret", 24));
        let role_manager = Arc::new(RoleManager::new());
        let service = AuthService::new(pool, jwt_manager, role_manager);

        let password = "my_secure_password";
        let hash = service.hash_password(password).unwrap();

        assert!(service.verify_password(password, &hash).unwrap());
        assert!(!service.verify_password("wrong_password", &hash).unwrap());
    }
}

