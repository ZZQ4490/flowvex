use common::types::{Permission, ResourceType, ActionType2, Scope};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

// Re-export Role from common
pub use common::types::Role;

/// Role manager for managing roles and permissions
pub struct RoleManager {
    role_permissions: Arc<RwLock<HashMap<String, Vec<Permission>>>>,
    user_roles: Arc<RwLock<HashMap<Uuid, Role>>>,
}

impl RoleManager {
    pub fn new() -> Self {
        let mut manager = Self {
            role_permissions: Arc::new(RwLock::new(HashMap::new())),
            user_roles: Arc::new(RwLock::new(HashMap::new())),
        };
        
        // Initialize default role permissions
        manager.initialize_default_permissions();
        manager
    }

    fn initialize_default_permissions(&mut self) {
        let default_permissions = Self::get_default_role_permissions();
        let mut perms = self.role_permissions.blocking_write();
        for (role, permissions) in default_permissions {
            perms.insert(role, permissions);
        }
    }

    /// Get default permissions for built-in roles
    fn get_default_role_permissions() -> HashMap<String, Vec<Permission>> {
        let mut permissions = HashMap::new();

        // Admin - full access to everything
        permissions.insert(
            "admin".to_string(),
            vec![
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Create,
                    scope: Scope::All,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Read,
                    scope: Scope::All,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Update,
                    scope: Scope::All,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Delete,
                    scope: Scope::All,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Execute,
                    scope: Scope::All,
                },
                Permission {
                    resource: ResourceType::User,
                    action: ActionType2::Create,
                    scope: Scope::All,
                },
                Permission {
                    resource: ResourceType::User,
                    action: ActionType2::Update,
                    scope: Scope::All,
                },
                Permission {
                    resource: ResourceType::Settings,
                    action: ActionType2::Update,
                    scope: Scope::All,
                },
            ],
        );

        // Manager - can manage team resources
        permissions.insert(
            "manager".to_string(),
            vec![
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Create,
                    scope: Scope::Team,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Read,
                    scope: Scope::Team,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Update,
                    scope: Scope::Team,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Delete,
                    scope: Scope::Team,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Execute,
                    scope: Scope::Team,
                },
                Permission {
                    resource: ResourceType::Template,
                    action: ActionType2::Create,
                    scope: Scope::Team,
                },
            ],
        );

        // User - can manage own resources
        permissions.insert(
            "user".to_string(),
            vec![
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Create,
                    scope: Scope::Own,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Read,
                    scope: Scope::Own,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Update,
                    scope: Scope::Own,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Delete,
                    scope: Scope::Own,
                },
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Execute,
                    scope: Scope::Own,
                },
                Permission {
                    resource: ResourceType::Integration,
                    action: ActionType2::Create,
                    scope: Scope::Own,
                },
            ],
        );

        // Viewer - read-only access
        permissions.insert(
            "viewer".to_string(),
            vec![
                Permission {
                    resource: ResourceType::Workflow,
                    action: ActionType2::Read,
                    scope: Scope::Team,
                },
                Permission {
                    resource: ResourceType::Template,
                    action: ActionType2::Read,
                    scope: Scope::All,
                },
            ],
        );

        permissions
    }

    /// Assign a role to a user
    pub async fn assign_role(&self, user_id: Uuid, role: Role) -> Result<(), RbacError> {
        let mut user_roles = self.user_roles.write().await;
        user_roles.insert(user_id, role);
        Ok(())
    }

    /// Get user's role
    pub async fn get_user_role(&self, user_id: Uuid) -> Option<Role> {
        let user_roles = self.user_roles.read().await;
        user_roles.get(&user_id).cloned()
    }

    /// Create a custom role with specific permissions
    pub async fn create_custom_role(
        &self,
        name: String,
        permissions: Vec<Permission>,
    ) -> Result<Role, RbacError> {
        let mut role_permissions = self.role_permissions.write().await;
        
        if role_permissions.contains_key(&name) {
            return Err(RbacError::RoleAlreadyExists(name));
        }

        role_permissions.insert(name.clone(), permissions);
        Ok(Role::Custom(name))
    }

    /// Get permissions for a role
    pub async fn get_role_permissions(&self, role: &Role) -> Vec<Permission> {
        let role_permissions = self.role_permissions.read().await;
        role_permissions
            .get(role.as_str())
            .cloned()
            .unwrap_or_default()
    }

    /// Get all permissions for a user
    pub async fn get_user_permissions(&self, user_id: Uuid) -> Vec<Permission> {
        if let Some(role) = self.get_user_role(user_id).await {
            self.get_role_permissions(&role).await
        } else {
            Vec::new()
        }
    }

    /// Update permissions for a custom role
    pub async fn update_role_permissions(
        &self,
        role_name: &str,
        permissions: Vec<Permission>,
    ) -> Result<(), RbacError> {
        let mut role_permissions = self.role_permissions.write().await;
        
        if !role_permissions.contains_key(role_name) {
            return Err(RbacError::RoleNotFound(role_name.to_string()));
        }

        role_permissions.insert(role_name.to_string(), permissions);
        Ok(())
    }
}

impl Default for RoleManager {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, thiserror::Error)]
pub enum RbacError {
    #[error("Role already exists: {0}")]
    RoleAlreadyExists(String),

    #[error("Role not found: {0}")]
    RoleNotFound(String),

    #[error("Permission denied")]
    PermissionDenied,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_assign_role() {
        let manager = RoleManager::new();
        let user_id = Uuid::new_v4();

        manager.assign_role(user_id, Role::Admin).await.unwrap();
        let role = manager.get_user_role(user_id).await;
        assert_eq!(role, Some(Role::Admin));
    }

    #[tokio::test]
    async fn test_get_role_permissions() {
        let manager = RoleManager::new();
        let permissions = manager.get_role_permissions(&Role::Admin).await;
        assert!(!permissions.is_empty());
    }

    #[tokio::test]
    async fn test_create_custom_role() {
        let manager = RoleManager::new();
        let permissions = vec![Permission {
            resource: ResourceType::Workflow,
            action: ActionType2::Read,
            scope: Scope::Own,
        }];

        let role = manager
            .create_custom_role("custom".to_string(), permissions)
            .await
            .unwrap();

        assert_eq!(role, Role::Custom("custom".to_string()));
    }
}
