use common::types::Workflow;
use common::ParseError;
use std::collections::{HashMap, HashSet, VecDeque};
use uuid::Uuid;

/// Workflow parser implementation
/// Responsible for parsing workflow definitions, analyzing node dependencies, and detecting cycles
pub struct WorkflowParser;

impl WorkflowParser {
    pub fn new() -> Self {
        Self
    }

    /// Parse a workflow definition from JSON string
    pub fn parse(&self, definition: &str) -> Result<Workflow, ParseError> {
        // Parse JSON into Workflow struct
        let workflow: Workflow = serde_json::from_str(definition)
            .map_err(|e| ParseError::InvalidJson(e.to_string()))?;

        // Validate basic structure
        self.validate_structure(&workflow)?;

        // Analyze dependencies
        self.analyze_dependencies(&workflow)?;

        // Detect cycles
        self.detect_cycles(&workflow)?;

        Ok(workflow)
    }

    /// Validate basic workflow structure
    fn validate_structure(&self, workflow: &Workflow) -> Result<(), ParseError> {
        // Check if workflow has at least one node
        if workflow.nodes.is_empty() {
            return Err(ParseError::EmptyWorkflow);
        }

        // Check for duplicate node IDs
        let mut node_ids = HashSet::new();
        for node in &workflow.nodes {
            if !node_ids.insert(node.id) {
                return Err(ParseError::DuplicateNodeId(node.id));
            }
        }

        // Validate edges reference existing nodes
        for edge in &workflow.edges {
            if !node_ids.contains(&edge.source) {
                return Err(ParseError::InvalidEdgeSource(edge.source));
            }
            if !node_ids.contains(&edge.target) {
                return Err(ParseError::InvalidEdgeTarget(edge.target));
            }
        }

        Ok(())
    }

    /// Analyze node dependencies and build dependency graph
    fn analyze_dependencies(&self, workflow: &Workflow) -> Result<(), ParseError> {
        let mut dependency_graph: HashMap<Uuid, Vec<Uuid>> = HashMap::new();

        // Build adjacency list
        for edge in &workflow.edges {
            dependency_graph
                .entry(edge.target)
                .or_insert_with(Vec::new)
                .push(edge.source);
        }

        // Verify all nodes are reachable or are starting points
        let node_ids: HashSet<Uuid> = workflow.nodes.iter().map(|n| n.id).collect();
        
        // Find nodes with no incoming edges (starting points)
        let mut has_incoming: HashSet<Uuid> = HashSet::new();
        for edge in &workflow.edges {
            has_incoming.insert(edge.target);
        }

        let starting_nodes: Vec<Uuid> = node_ids
            .iter()
            .filter(|id| !has_incoming.contains(id))
            .copied()
            .collect();

        if starting_nodes.is_empty() {
            return Err(ParseError::NoStartingNode);
        }

        Ok(())
    }

    /// Detect cycles in the workflow DAG using DFS
    fn detect_cycles(&self, workflow: &Workflow) -> Result<(), ParseError> {
        let mut adjacency_list: HashMap<Uuid, Vec<Uuid>> = HashMap::new();

        // Build adjacency list (source -> targets)
        for edge in &workflow.edges {
            adjacency_list
                .entry(edge.source)
                .or_insert_with(Vec::new)
                .push(edge.target);
        }

        let mut visited = HashSet::new();
        let mut rec_stack = HashSet::new();

        // Run DFS from each node
        for node in &workflow.nodes {
            if !visited.contains(&node.id) {
                if self.has_cycle_dfs(
                    node.id,
                    &adjacency_list,
                    &mut visited,
                    &mut rec_stack,
                )? {
                    return Err(ParseError::CycleDetected(node.id));
                }
            }
        }

        Ok(())
    }

    /// DFS helper to detect cycles
    fn has_cycle_dfs(
        &self,
        node_id: Uuid,
        adjacency_list: &HashMap<Uuid, Vec<Uuid>>,
        visited: &mut HashSet<Uuid>,
        rec_stack: &mut HashSet<Uuid>,
    ) -> Result<bool, ParseError> {
        visited.insert(node_id);
        rec_stack.insert(node_id);

        // Visit all neighbors
        if let Some(neighbors) = adjacency_list.get(&node_id) {
            for &neighbor in neighbors {
                if !visited.contains(&neighbor) {
                    if self.has_cycle_dfs(neighbor, adjacency_list, visited, rec_stack)? {
                        return Ok(true);
                    }
                } else if rec_stack.contains(&neighbor) {
                    // Back edge found - cycle detected
                    return Ok(true);
                }
            }
        }

        rec_stack.remove(&node_id);
        Ok(false)
    }

    /// Get topological order of nodes (for execution planning)
    pub fn topological_sort(&self, workflow: &Workflow) -> Result<Vec<Uuid>, ParseError> {
        let mut adjacency_list: HashMap<Uuid, Vec<Uuid>> = HashMap::new();
        let mut in_degree: HashMap<Uuid, usize> = HashMap::new();

        // Initialize in-degree for all nodes
        for node in &workflow.nodes {
            in_degree.insert(node.id, 0);
        }

        // Build adjacency list and calculate in-degrees
        for edge in &workflow.edges {
            adjacency_list
                .entry(edge.source)
                .or_insert_with(Vec::new)
                .push(edge.target);
            *in_degree.get_mut(&edge.target).unwrap() += 1;
        }

        // Find all nodes with in-degree 0
        let mut queue: VecDeque<Uuid> = in_degree
            .iter()
            .filter(|(_, &degree)| degree == 0)
            .map(|(&id, _)| id)
            .collect();

        let mut sorted = Vec::new();

        while let Some(node_id) = queue.pop_front() {
            sorted.push(node_id);

            // Reduce in-degree for neighbors
            if let Some(neighbors) = adjacency_list.get(&node_id) {
                for &neighbor in neighbors {
                    let degree = in_degree.get_mut(&neighbor).unwrap();
                    *degree -= 1;
                    if *degree == 0 {
                        queue.push_back(neighbor);
                    }
                }
            }
        }

        // If sorted doesn't contain all nodes, there's a cycle
        if sorted.len() != workflow.nodes.len() {
            return Err(ParseError::CycleDetected(Uuid::nil()));
        }

        Ok(sorted)
    }

    /// Get dependencies for a specific node
    pub fn get_node_dependencies(&self, workflow: &Workflow, node_id: Uuid) -> Vec<Uuid> {
        workflow
            .edges
            .iter()
            .filter(|edge| edge.target == node_id)
            .map(|edge| edge.source)
            .collect()
    }

    /// Get dependents for a specific node (nodes that depend on this node)
    pub fn get_node_dependents(&self, workflow: &Workflow, node_id: Uuid) -> Vec<Uuid> {
        workflow
            .edges
            .iter()
            .filter(|edge| edge.source == node_id)
            .map(|edge| edge.target)
            .collect()
    }
}

impl Default for WorkflowParser {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use common::types::{NodeType, TriggerType, Position, Port, NodeConfig};

    fn create_test_workflow(nodes: Vec<Node>, edges: Vec<Edge>) -> Workflow {
        Workflow {
            id: Uuid::new_v4(),
            name: "Test Workflow".to_string(),
            nodes,
            edges,
            variables: HashMap::new(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    fn create_test_node(id: Uuid) -> Node {
        Node {
            id,
            node_type: NodeType::Trigger(TriggerType::Manual),
            config: NodeConfig::default(),
            position: Position { x: 0.0, y: 0.0 },
            inputs: vec![],
            outputs: vec![],
        }
    }

    #[test]
    fn test_parse_valid_workflow() {
        let parser = WorkflowParser::new();
        let node1 = create_test_node(Uuid::new_v4());
        let node2 = create_test_node(Uuid::new_v4());
        
        let edge = Edge {
            id: Uuid::new_v4(),
            source: node1.id,
            target: node2.id,
            source_handle: None,
            target_handle: None,
        };

        let workflow = create_test_workflow(vec![node1, node2], vec![edge]);
        let json = serde_json::to_string(&workflow).unwrap();
        
        let result = parser.parse(&json);
        assert!(result.is_ok());
    }

    #[test]
    fn test_detect_cycle() {
        let parser = WorkflowParser::new();
        let node1 = create_test_node(Uuid::new_v4());
        let node2 = create_test_node(Uuid::new_v4());
        
        // Create a cycle: node1 -> node2 -> node1
        let edge1 = Edge {
            id: Uuid::new_v4(),
            source: node1.id,
            target: node2.id,
            source_handle: None,
            target_handle: None,
        };
        let edge2 = Edge {
            id: Uuid::new_v4(),
            source: node2.id,
            target: node1.id,
            source_handle: None,
            target_handle: None,
        };

        let workflow = create_test_workflow(vec![node1, node2], vec![edge1, edge2]);
        
        let result = parser.detect_cycles(&workflow);
        assert!(result.is_err());
    }

    #[test]
    fn test_topological_sort() {
        let parser = WorkflowParser::new();
        let node1 = create_test_node(Uuid::new_v4());
        let node2 = create_test_node(Uuid::new_v4());
        let node3 = create_test_node(Uuid::new_v4());
        
        // node1 -> node2 -> node3
        let edge1 = Edge {
            id: Uuid::new_v4(),
            source: node1.id,
            target: node2.id,
            source_handle: None,
            target_handle: None,
        };
        let edge2 = Edge {
            id: Uuid::new_v4(),
            source: node2.id,
            target: node3.id,
            source_handle: None,
            target_handle: None,
        };

        let workflow = create_test_workflow(
            vec![node1.clone(), node2.clone(), node3.clone()],
            vec![edge1, edge2],
        );
        
        let result = parser.topological_sort(&workflow);
        assert!(result.is_ok());
        
        let sorted = result.unwrap();
        assert_eq!(sorted.len(), 3);
        assert_eq!(sorted[0], node1.id);
        assert_eq!(sorted[1], node2.id);
        assert_eq!(sorted[2], node3.id);
    }
}
