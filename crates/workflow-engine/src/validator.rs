use common::types::{Workflow, Node, NodeType, DataType};
use std::collections::{HashMap, HashSet};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

#[derive(Debug)]
pub enum ValidationError {
    NodeNotFound(Uuid),
    PortNotFound(Uuid, String),
    NoOutputPorts(Uuid),
    NoInputPorts(Uuid),
    IncompatibleTypes {
        source: Uuid,
        target: Uuid,
        source_type: DataType,
        target_type: DataType,
    },
    MissingRequiredField(Uuid, String),
    NoTriggerNode,
    UnreachableNodes(Vec<Uuid>),
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::NodeNotFound(id) => write!(f, "Node not found: {}", id),
            ValidationError::PortNotFound(id, port) => write!(f, "Port '{}' not found on node {}", port, id),
            ValidationError::NoOutputPorts(id) => write!(f, "Node {} has no output ports", id),
            ValidationError::NoInputPorts(id) => write!(f, "Node {} has no input ports", id),
            ValidationError::IncompatibleTypes { source, target, source_type, target_type } => {
                write!(f, "Incompatible types: source node {} ({:?}) -> target node {} ({:?})", 
                    source, source_type, target, target_type)
            }
            ValidationError::MissingRequiredField(id, field) => {
                write!(f, "Missing required field '{}' on node {}", field, id)
            }
            ValidationError::NoTriggerNode => write!(f, "No trigger node found in workflow"),
            ValidationError::UnreachableNodes(nodes) => {
                write!(f, "Unreachable nodes: {:?}", nodes)
            }
        }
    }
}

impl std::error::Error for ValidationError {}

/// Workflow validator implementation
/// Responsible for validating node configurations, connection types, and required fields
pub struct WorkflowValidator;

impl WorkflowValidator {
    pub fn new() -> Self {
        Self
    }

    /// Validate a complete workflow
    pub fn validate(&self, workflow: &Workflow) -> Result<ValidationResult, ValidationError> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate all nodes
        for node in &workflow.nodes {
            match self.validate_node(node) {
                Ok(result) => {
                    errors.extend(result.errors);
                    warnings.extend(result.warnings);
                }
                Err(e) => errors.push(format!("Node {} validation failed: {}", node.id, e)),
            }
        }

        // Validate all connections
        let node_map: HashMap<Uuid, &Node> = workflow
            .nodes
            .iter()
            .map(|n| (n.id, n))
            .collect();

        for edge in &workflow.edges {
            if let Err(e) = self.validate_connection(edge, &node_map) {
                errors.push(format!("Connection validation failed: {}", e));
            }
        }

        // Check for isolated nodes (nodes with no connections)
        for node in &workflow.nodes {
            if !self.is_trigger_node(node) && !self.has_connections(node.id, workflow) {
                warnings.push(format!("Node {} is isolated (no connections)", node.id));
            }
        }

        Ok(ValidationResult {
            valid: errors.is_empty(),
            errors,
            warnings,
        })
    }

    /// Validate a single node configuration
    fn validate_node(&self, node: &Node) -> Result<ValidationResult, ValidationError> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();

        // Validate node type specific requirements
        match &node.node_type {
            NodeType::Trigger { trigger_type: _ } => {
                // Validate trigger configuration
                if node.inputs.len() > 0 {
                    warnings.push(format!(
                        "Trigger node {} has input ports, which is unusual",
                        node.id
                    ));
                }
                if node.outputs.is_empty() {
                    errors.push(format!("Trigger node {} must have at least one output", node.id));
                }
            }
            NodeType::Action { action_type: _ } => {
                // Validate action configuration
                if node.inputs.is_empty() {
                    warnings.push(format!(
                        "Action node {} has no input ports",
                        node.id
                    ));
                }
            }
            NodeType::Condition { condition_type: _ } => {
                // Validate condition configuration
                if node.outputs.len() < 2 {
                    errors.push(format!(
                        "Condition node {} should have at least 2 outputs (true/false branches)",
                        node.id
                    ));
                }
            }
            NodeType::Loop { loop_type: _ } => {
                // Validate loop configuration
                if node.inputs.is_empty() {
                    errors.push(format!("Loop node {} must have at least one input", node.id));
                }
            }
            NodeType::AI { ai_type: _ } => {
                // Validate AI node configuration
                if node.inputs.is_empty() {
                    warnings.push(format!("AI node {} has no inputs", node.id));
                }
            }
            NodeType::Custom { config: custom_config } => {
                // Validate custom node configuration
                if custom_config.code.is_empty() {
                    errors.push(format!("Custom node {} has no code", node.id));
                }
            }
        }

        // Validate required fields in node config
        if let Err(e) = self.validate_required_fields(node) {
            errors.push(format!("Required field validation failed: {}", e));
        }

        // Validate port configurations
        for (idx, port) in node.inputs.iter().enumerate() {
            if port.name.is_empty() {
                errors.push(format!("Input port {} of node {} has no name", idx, node.id));
            }
        }

        for (idx, port) in node.outputs.iter().enumerate() {
            if port.name.is_empty() {
                errors.push(format!("Output port {} of node {} has no name", idx, node.id));
            }
        }

        Ok(ValidationResult {
            valid: errors.is_empty(),
            errors,
            warnings,
        })
    }

    /// Validate connection between two nodes
    fn validate_connection(
        &self,
        edge: &common::types::Edge,
        node_map: &HashMap<Uuid, &Node>,
    ) -> Result<(), ValidationError> {
        let source_node = node_map
            .get(&edge.source)
            .ok_or_else(|| ValidationError::NodeNotFound(edge.source))?;

        let target_node = node_map
            .get(&edge.target)
            .ok_or_else(|| ValidationError::NodeNotFound(edge.target))?;

        // Find the specific ports being connected
        let source_port = if !edge.source_handle.is_empty() {
            source_node
                .outputs
                .iter()
                .find(|p| p.name == edge.source_handle)
                .ok_or_else(|| ValidationError::PortNotFound(edge.source, edge.source_handle.clone()))?
        } else {
            // If no specific handle, use first output port
            source_node
                .outputs
                .first()
                .ok_or_else(|| ValidationError::NoOutputPorts(edge.source))?
        };

        let target_port = if !edge.target_handle.is_empty() {
            target_node
                .inputs
                .iter()
                .find(|p| p.name == edge.target_handle)
                .ok_or_else(|| ValidationError::PortNotFound(edge.target, edge.target_handle.clone()))?
        } else {
            // If no specific handle, use first input port
            target_node
                .inputs
                .first()
                .ok_or_else(|| ValidationError::NoInputPorts(edge.target))?
        };

        // Validate type compatibility
        if !self.are_types_compatible(&source_port.data_type, &target_port.data_type) {
            return Err(ValidationError::IncompatibleTypes {
                source: edge.source,
                target: edge.target,
                source_type: source_port.data_type.clone(),
                target_type: target_port.data_type.clone(),
            });
        }

        Ok(())
    }

    /// Check if two data types are compatible for connection
    fn are_types_compatible(&self, source_type: &DataType, target_type: &DataType) -> bool {
        match (source_type, target_type) {
            // Exact match
            (a, b) if a == b => true,
            // Any type can connect to Any
            (DataType::Any, _) | (_, DataType::Any) => true,
            // String can connect to String
            (DataType::String, DataType::String) => true,
            // Number types are compatible
            (DataType::Number, DataType::Number) => true,
            // Boolean types are compatible
            (DataType::Boolean, DataType::Boolean) => true,
            // Array types are compatible
            (DataType::Array, DataType::Array) => true,
            // Object types are compatible
            (DataType::Object, DataType::Object) => true,
            // Otherwise incompatible
            _ => false,
        }
    }

    /// Validate required fields in node configuration
    fn validate_required_fields(&self, node: &Node) -> Result<(), ValidationError> {
        // Check node-type specific required fields
        match &node.node_type {
            NodeType::Trigger { trigger_type } => {
                // Trigger-specific validation
                match trigger_type {
                    common::types::TriggerType::Webhook => {
                        // Webhook should have URL configured
                        if !node.config.parameters.contains_key("webhook_url") {
                            return Err(ValidationError::MissingRequiredField(
                                node.id,
                                "webhook_url".to_string(),
                            ));
                        }
                    }
                    common::types::TriggerType::Schedule => {
                        // Schedule should have cron expression
                        if !node.config.parameters.contains_key("cron_expression") {
                            return Err(ValidationError::MissingRequiredField(
                                node.id,
                                "cron_expression".to_string(),
                            ));
                        }
                    }
                    _ => {}
                }
            }
            NodeType::AI { ai_type: _ } => {
                // AI nodes should have model and prompt configured
                if !node.config.parameters.contains_key("model") {
                    return Err(ValidationError::MissingRequiredField(
                        node.id,
                        "model".to_string(),
                    ));
                }
                if !node.config.parameters.contains_key("prompt") {
                    return Err(ValidationError::MissingRequiredField(
                        node.id,
                        "prompt".to_string(),
                    ));
                }
            }
            NodeType::Custom { config: custom_config } => {
                // Custom nodes must have language and code
                if custom_config.language.is_empty() {
                    return Err(ValidationError::MissingRequiredField(
                        node.id,
                        "language".to_string(),
                    ));
                }
            }
            _ => {}
        }

        Ok(())
    }

    /// Check if a node is a trigger node
    fn is_trigger_node(&self, node: &Node) -> bool {
        matches!(node.node_type, NodeType::Trigger { .. })
    }

    /// Check if a node has any connections
    fn has_connections(&self, node_id: Uuid, workflow: &Workflow) -> bool {
        workflow
            .edges
            .iter()
            .any(|edge| edge.source == node_id || edge.target == node_id)
    }

    /// Validate that workflow has at least one trigger node
    pub fn validate_has_trigger(&self, workflow: &Workflow) -> Result<(), ValidationError> {
        let has_trigger = workflow
            .nodes
            .iter()
            .any(|node| self.is_trigger_node(node));

        if !has_trigger {
            return Err(ValidationError::NoTriggerNode);
        }

        Ok(())
    }

    /// Validate that all nodes are reachable from trigger nodes
    pub fn validate_reachability(&self, workflow: &Workflow) -> Result<(), ValidationError> {
        let trigger_nodes: Vec<Uuid> = workflow
            .nodes
            .iter()
            .filter(|node| self.is_trigger_node(node))
            .map(|node| node.id)
            .collect();

        if trigger_nodes.is_empty() {
            return Err(ValidationError::NoTriggerNode);
        }

        // Build adjacency list
        let mut adjacency: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        for edge in &workflow.edges {
            adjacency
                .entry(edge.source)
                .or_insert_with(Vec::new)
                .push(edge.target);
        }

        // BFS from all trigger nodes
        let mut reachable = HashSet::new();
        let mut queue = std::collections::VecDeque::new();

        for trigger_id in trigger_nodes {
            queue.push_back(trigger_id);
            reachable.insert(trigger_id);
        }

        while let Some(node_id) = queue.pop_front() {
            if let Some(neighbors) = adjacency.get(&node_id) {
                for &neighbor in neighbors {
                    if reachable.insert(neighbor) {
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        // Check if all nodes are reachable
        let unreachable: Vec<Uuid> = workflow
            .nodes
            .iter()
            .filter(|node| !reachable.contains(&node.id))
            .map(|node| node.id)
            .collect();

        if !unreachable.is_empty() {
            return Err(ValidationError::UnreachableNodes(unreachable));
        }

        Ok(())
    }
}

impl Default for WorkflowValidator {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::{TriggerType, Position, NodeConfig};

    fn create_test_node(id: Uuid, node_type: NodeType) -> Node {
        Node {
            id,
            node_type,
            config: NodeConfig::default(),
            position: Position { x: 0.0, y: 0.0 },
            inputs: vec![],
            outputs: vec![Port {
                id: "output".to_string(),
                name: "output".to_string(),
                data_type: DataType::Any,
            }],
        }
    }

    #[test]
    fn test_validate_valid_workflow() {
        let validator = WorkflowValidator::new();
        let node1 = create_test_node(Uuid::new_v4(), NodeType::Trigger { trigger_type: TriggerType::Manual });
        let node2 = create_test_node(Uuid::new_v4(), NodeType::Action { action_type: common::types::ActionType::Http });

        let workflow = Workflow {
            id: Uuid::new_v4(),
            name: "Test".to_string(),
            description: None,
            nodes: vec![node1.clone(), node2.clone()],
            edges: vec![common::types::Edge {
                id: Uuid::new_v4(),
                source: node1.id,
                source_handle: "output".to_string(),
                target: node2.id,
                target_handle: "input".to_string(),
            }],
            variables: HashMap::new(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        };

        let result = validator.validate(&workflow);
        assert!(result.is_ok());
    }

    #[test]
    fn test_type_compatibility() {
        let validator = WorkflowValidator::new();
        
        assert!(validator.are_types_compatible(&DataType::String, &DataType::String));
        assert!(validator.are_types_compatible(&DataType::Any, &DataType::String));
        assert!(validator.are_types_compatible(&DataType::String, &DataType::Text));
        assert!(!validator.are_types_compatible(&DataType::Number, &DataType::String));
    }
}
