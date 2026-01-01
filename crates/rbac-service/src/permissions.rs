use common::types::{Permission, ResourceType, ActionType2, Scope};
use std::sync::Arc;
use uuid::Uuid;

use crate::roles::RoleManager;

/// Permission checker for validating user permissions
pub struct PermissionChecker {
    role_manager: Arc<RoleManager>,
}

impl PermissionChecker {
    pub fn new(role_manager: Arc<RoleManager>) -> Self {
        Self { role_manager }
    }

    /// Check if a user has a specific permission
    pub async fn check_permission(
        &self,
        user_id: Uuid,
        required_permission: &Permission,
        resource_owner_id: Option<Uuid>,
        resource_team_id: Option<Uuid>,
        user_team_id: Option<Uuid>,
    ) -> bool {
        let user_permissions = self.role_manager.get_user_permissions(user_id).await;

        for permission in user_permissions {
            if self.matches_permission(&permission, required_permission, user_id, resource_owner_id, resource_team_id, user_team_id) {
                return true;
            }
        }

        false
    }

    /// Check if a permission matches the required permission
    fn matches_permission(
        &self,
        permission: &Permission,
        required: &Permission,
        user_id: Uuid,
        resource_owner_id: Option<Uuid>,
        resource_team_id: Option<Uuid>,
        user_team_id: Option<Uuid>,
    ) -> bool {
        // Check resource type
        if permission.resource != required.resource {
            return false;
        }

        // Check action
        if permission.action != required.action {
            return false;
        }

        // Check scope
        match permission.scope {
            Scope::All => true,
            Scope::Organization => {
                // For now, treat organization same as team
                self.check_team_scope(resource_team_id, user_team_id)
            }
            Scope::Team => self.check_team_scope(resource_team_id, user_team_id),
            Scope::Own => self.check_own_scope(user_id, resource_owner_id),
        }
    }

    fn check_own_scope(&self, user_id: Uuid, resource_owner_id: Option<Uuid>) -> bool {
        resource_owner_id.map(|owner| owner == user_id).unwrap_or(false)
    }

    fn check_team_scope(
        &self,
        resource_team_id: Option<Uuid>,
        user_team_id: Option<Uuid>,
    ) -> bool {
        match (resource_team_id, user_team_id) {
            (Some(resource_team), Some(user_team)) => resource_team == user_team,
            _ => false,
        }
    }

    /// Check if user can perform action on resource
    pub async fn can_perform_action(
        &self,
        user_id: Uuid,
        resource: ResourceType,
        action: ActionType2,
        resource_owner_id: Option<Uuid>,
        resource_team_id: Option<Uuid>,
        user_team_id: Option<Uuid>,
    ) -> bool {
        let required_permission = Permission {
            resource,
            action,
            scope: Scope::Own, // Will be checked against actual scope
        };

        self.check_permission(
            user_id,
            &required_permission,
            resource_owner_id,
            resource_team_id,
            user_team_id,
        )
        .await
    }

    /// Require permission or return error
    pub async fn require_permission(
        &self,
        user_id: Uuid,
        required_permission: &Permission,
        resource_owner_id: Option<Uuid>,
        resource_team_id: Option<Uuid>,
        user_team_id: Option<Uuid>,
    ) -> Result<(), PermissionError> {
        if self
            .check_permission(
                user_id,
                required_permission,
                resource_owner_id,
                resource_team_id,
                user_team_id,
            )
            .await
        {
            Ok(())
        } else {
            Err(PermissionError::PermissionDenied)
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum PermissionError {
    #[error("Permission denied")]
    PermissionDenied,
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::Role;

    #[tokio::test]
    async fn test_admin_has_all_permissions() {
        let role_manager = Arc::new(RoleManager::new());
        let checker = PermissionChecker::new(role_manager.clone());
        let user_id = Uuid::new_v4();

        role_manager.assign_role(user_id, Role::Admin).await.unwrap();

        let can_create = checker
            .can_perform_action(
                user_id,
                ResourceType::Workflow,
                ActionType2::Create,
                None,
                None,
                None,
            )
            .await;

        assert!(can_create);
    }

    #[tokio::test]
    async fn test_user_can_access_own_resources() {
        let role_manager = Arc::new(RoleManager::new());
        let checker = PermissionChecker::new(role_manager.clone());
        let user_id = Uuid::new_v4();

        role_manager.assign_role(user_id, Role::User).await.unwrap();

        let can_read = checker
            .can_perform_action(
                user_id,
                ResourceType::Workflow,
                ActionType2::Read,
                Some(user_id), // User owns the resource
                None,
                None,
            )
            .await;

        assert!(can_read);
    }

    #[tokio::test]
    async fn test_user_cannot_access_others_resources() {
        let role_manager = Arc::new(RoleManager::new());
        let checker = PermissionChecker::new(role_manager.clone());
        let user_id = Uuid::new_v4();
        let other_user_id = Uuid::new_v4();

        role_manager.assign_role(user_id, Role::User).await.unwrap();

        let can_read = checker
            .can_perform_action(
                user_id,
                ResourceType::Workflow,
                ActionType2::Read,
                Some(other_user_id), // Other user owns the resource
                None,
                None,
            )
            .await;

        assert!(!can_read);
    }

    #[tokio::test]
    async fn test_viewer_cannot_create() {
        let role_manager = Arc::new(RoleManager::new());
        let checker = PermissionChecker::new(role_manager.clone());
        let user_id = Uuid::new_v4();

        role_manager.assign_role(user_id, Role::Viewer).await.unwrap();

        let can_create = checker
            .can_perform_action(
                user_id,
                ResourceType::Workflow,
                ActionType2::Create,
                None,
                None,
                None,
            )
            .await;

        assert!(!can_create);
    }
}

