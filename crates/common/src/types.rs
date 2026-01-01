use serde::{Deserialize, Serialize};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

// Basic types
pub type JsonValue = serde_json::Value;

// Workflow types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workflow {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
    pub variables: HashMap<String, JsonValue>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Node {
    pub id: Uuid,
    pub node_type: NodeType,
    pub config: NodeConfig,
    pub position: Position,
    pub inputs: Vec<Port>,
    pub outputs: Vec<Port>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum NodeType {
    Trigger { trigger_type: TriggerType },
    Action { action_type: ActionType },
    Condition { condition_type: ConditionType },
    Loop { loop_type: LoopType },
    AI { ai_type: AINodeType },
    Custom { config: CustomNodeConfig },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TriggerType {
    Webhook,
    Schedule,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    Http,
    Email,
    Database,
    Integration,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConditionType {
    If,
    Switch,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum LoopType {
    ForEach,
    While,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AINodeType {
    TextGeneration,
    ToolCalling,
    Classification,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomNodeConfig {
    pub language: String,
    pub code: String,
    pub dependencies: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeConfig {
    pub parameters: HashMap<String, JsonValue>,
}

impl Default for NodeConfig {
    fn default() -> Self {
        Self {
            parameters: HashMap::new(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Port {
    pub id: String,
    pub name: String,
    pub data_type: DataType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DataType {
    String,
    Number,
    Boolean,
    Object,
    Array,
    Any,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Edge {
    pub id: Uuid,
    pub source: Uuid,
    pub source_handle: String,
    pub target: Uuid,
    pub target_handle: String,
}

// Execution types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionContext {
    pub execution_id: Uuid,
    pub workflow_id: Uuid,
    pub variables: HashMap<String, JsonValue>,
    pub state: ExecutionState,
    pub started_at: DateTime<Utc>,
    pub current_node: Option<Uuid>,
}

// ExecutionContext with Arc<RwLock> for concurrent access
#[derive(Debug, Clone)]
pub struct ConcurrentExecutionContext {
    pub execution_id: Uuid,
    pub workflow_id: Uuid,
    pub variables: Arc<RwLock<HashMap<String, JsonValue>>>,
    pub state: ExecutionState,
    pub started_at: DateTime<Utc>,
    pub current_node: Option<Uuid>,
}

impl ConcurrentExecutionContext {
    pub fn new(execution_id: Uuid, workflow_id: Uuid) -> Self {
        Self {
            execution_id,
            workflow_id,
            variables: Arc::new(RwLock::new(HashMap::new())),
            state: ExecutionState::Pending,
            started_at: Utc::now(),
            current_node: None,
        }
    }

    pub fn from_context(ctx: ExecutionContext) -> Self {
        Self {
            execution_id: ctx.execution_id,
            workflow_id: ctx.workflow_id,
            variables: Arc::new(RwLock::new(ctx.variables)),
            state: ctx.state,
            started_at: ctx.started_at,
            current_node: ctx.current_node,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExecutionState {
    Pending,
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub execution_id: Uuid,
    pub state: ExecutionState,
    pub completed_at: Option<DateTime<Utc>>,
    pub error: Option<String>,
    pub output: Option<JsonValue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeExecutionState {
    pub node_id: Uuid,
    pub state: ExecutionState,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub input: Option<JsonValue>,
    pub output: Option<JsonValue>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<ValidationError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub node_id: Option<Uuid>,
    pub message: String,
    pub error_type: ValidationErrorType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ValidationErrorType {
    MissingRequiredField,
    InvalidConnection,
    CyclicDependency,
    InvalidConfiguration,
    TypeMismatch,
}

// API Gateway types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiRequest {
    pub id: Uuid,
    pub provider: String,
    pub endpoint: String,
    pub method: HttpMethod,
    pub headers: HashMap<String, String>,
    pub body: Option<JsonValue>,
    pub priority: Priority,
    pub workflow_id: Uuid,
    pub node_id: Uuid,
    #[serde(with = "duration_serde")]
    pub timeout: std::time::Duration,
    pub retry_config: RetryConfig,
}

// Custom serialization for Duration
mod duration_serde {
    use serde::{Deserialize, Deserializer, Serialize, Serializer};
    use std::time::Duration;

    pub fn serialize<S>(duration: &Duration, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        duration.as_millis().serialize(serializer)
    }

    pub fn deserialize<'de, D>(deserializer: D) -> Result<Duration, D::Error>
    where
        D: Deserializer<'de>,
    {
        let millis = u64::deserialize(deserializer)?;
        Ok(Duration::from_millis(millis))
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum HttpMethod {
    GET,
    POST,
    PUT,
    PATCH,
    DELETE,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum Priority {
    Critical = 0,
    High = 1,
    Normal = 2,
    Low = 3,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub max_retries: u32,
    pub initial_delay_ms: u64,
    pub max_delay_ms: u64,
    pub backoff_multiplier: f64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay_ms: 100,
            max_delay_ms: 30000,
            backoff_multiplier: 2.0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse {
    pub request_id: Uuid,
    pub status_code: u16,
    pub headers: HashMap<String, String>,
    pub body: Option<JsonValue>,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub name: String,
    pub api_keys: Vec<ApiKeyConfig>,
    pub rate_limit: RateLimitConfig,
    pub cache_ttl: Option<std::time::Duration>,
    pub failover_providers: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitConfig {
    pub requests_per_second: u32,
    pub requests_per_minute: u32,
    pub requests_per_hour: u32,
    pub concurrent_limit: u32,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            requests_per_second: 10,
            requests_per_minute: 100,
            requests_per_hour: 1000,
            concurrent_limit: 10,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiKeyConfig {
    pub key: String,
    pub weight: u32,
    pub enabled: bool,
    pub usage_count: u64,
}

impl Default for ApiKeyConfig {
    fn default() -> Self {
        Self {
            key: String::new(),
            weight: 1,
            enabled: true,
            usage_count: 0,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderMetrics {
    pub provider: String,
    pub total_requests: u64,
    pub successful_requests: u64,
    pub failed_requests: u64,
    pub average_latency_ms: f64,
    pub error_rate: f64,
    pub total_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStatus {
    pub critical_count: usize,
    pub high_count: usize,
    pub normal_count: usize,
    pub low_count: usize,
    pub total_count: usize,
    pub processing_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedResponse {
    pub response: ApiResponse,
    pub cached_at: DateTime<Utc>,
    #[serde(with = "duration_serde")]
    pub ttl: std::time::Duration,
}

impl CachedResponse {
    pub fn is_expired(&self) -> bool {
        let elapsed = Utc::now().signed_duration_since(self.cached_at);
        elapsed.num_milliseconds() as u64 > self.ttl.as_millis() as u64
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum LoadBalanceStrategy {
    RoundRobin,
    Weighted,
    LeastConnections,
}

// RBAC types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Role {
    Admin,
    Manager,
    User,
    Viewer,
    Custom(String),
}

impl Role {
    pub fn as_str(&self) -> &str {
        match self {
            Role::Admin => "admin",
            Role::Manager => "manager",
            Role::User => "user",
            Role::Viewer => "viewer",
            Role::Custom(name) => name.as_str(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub resource: ResourceType,
    pub action: ActionType2,
    pub scope: Scope,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ResourceType {
    Workflow,
    Template,
    Integration,
    User,
    AuditLog,
    Settings,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ActionType2 {
    Create,
    Read,
    Update,
    Delete,
    Execute,
    Share,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Scope {
    Own,
    Team,
    Organization,
    All,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: Uuid,  // user_id
    pub role: Role,
    pub permissions: Vec<String>,
    pub exp: i64,   // expiration timestamp
    pub iat: i64,   // issued at timestamp
    pub organization_id: Option<Uuid>,
}

impl JwtClaims {
    pub fn new(user_id: Uuid, role: Role, permissions: Vec<String>, expires_in_seconds: i64) -> Self {
        let now = Utc::now().timestamp();
        Self {
            sub: user_id,
            role,
            permissions,
            exp: now + expires_in_seconds,
            iat: now,
            organization_id: None,
        }
    }

    pub fn is_expired(&self) -> bool {
        Utc::now().timestamp() > self.exp
    }
}

// Audit types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: Uuid,
    pub user_id: Uuid,
    pub action: AuditAction,
    pub resource_type: ResourceType,
    pub resource_id: Uuid,
    pub ip_address: String,
    pub user_agent: String,
    pub timestamp: DateTime<Utc>,
    pub result: AuditResult,
    pub details: JsonValue,
    pub is_security_sensitive: bool,
}

impl AuditLog {
    pub fn new(
        user_id: Uuid,
        action: AuditAction,
        resource_type: ResourceType,
        resource_id: Uuid,
        ip_address: String,
        user_agent: String,
        result: AuditResult,
    ) -> Self {
        let is_security_sensitive = matches!(
            action,
            AuditAction::Login
                | AuditAction::Logout
                | AuditAction::PermissionChange
                | AuditAction::ConfigChange
        );

        Self {
            id: Uuid::new_v4(),
            user_id,
            action,
            resource_type,
            resource_id,
            ip_address,
            user_agent,
            timestamp: Utc::now(),
            result,
            details: serde_json::json!({}),
            is_security_sensitive,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditAction {
    Create,
    Read,
    Update,
    Delete,
    Execute,
    Login,
    Logout,
    PermissionChange,
    ConfigChange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditResult {
    Success,
    Failure(String),
    Denied,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditFilter {
    pub user_id: Option<Uuid>,
    pub action: Option<AuditAction>,
    pub resource_type: Option<ResourceType>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub security_only: bool,
}

impl Default for AuditFilter {
    fn default() -> Self {
        Self {
            user_id: None,
            action: None,
            resource_type: None,
            start_time: None,
            end_time: None,
            security_only: false,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum ExportFormat {
    Json,
    Csv,
}
