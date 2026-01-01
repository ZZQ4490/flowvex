use thiserror::Error;
use uuid::Uuid;

pub type Result<T> = std::result::Result<T, PlatformError>;

#[derive(Debug, Error)]
pub enum PlatformError {
    #[error("Workflow error: {0}")]
    Workflow(#[from] WorkflowError),
    
    #[error("Parse error: {0}")]
    Parse(#[from] ParseError),
    
    #[error("API Gateway error: {0}")]
    ApiGateway(#[from] GatewayError),
    
    #[error("Integration error: {0}")]
    Integration(#[from] IntegrationError),
    
    #[error("Authentication error: {0}")]
    Auth(#[from] AuthError),
    
    #[error("Permission denied: {0}")]
    Permission(String),
    
    #[error("Validation error: {0}")]
    Validation(String),
    
    #[error("Database error: {0}")]
    Database(String),
    
    #[error("Internal error: {0}")]
    Internal(String),
}

#[derive(Debug, Error)]
pub enum ParseError {
    #[error("Invalid JSON: {0}")]
    InvalidJson(String),
    
    #[error("Empty workflow")]
    EmptyWorkflow,
    
    #[error("Duplicate node ID: {0}")]
    DuplicateNodeId(Uuid),
    
    #[error("Invalid edge source: {0}")]
    InvalidEdgeSource(Uuid),
    
    #[error("Invalid edge target: {0}")]
    InvalidEdgeTarget(Uuid),
    
    #[error("No starting node found")]
    NoStartingNode,
    
    #[error("Cycle detected at node: {0}")]
    CycleDetected(Uuid),
}

#[derive(Debug, Error)]
pub enum WorkflowError {
    #[error("Node not found: {0}")]
    NodeNotFound(String),
    
    #[error("Invalid connection: {0} -> {1}")]
    InvalidConnection(String, String),
    
    #[error("Execution timeout after {0} seconds")]
    Timeout(u64),
    
    #[error("Node execution failed: {0}, reason: {1}")]
    NodeExecutionFailed(String, String),
    
    #[error("Workflow validation failed: {0}")]
    ValidationFailed(String),
}

#[derive(Debug, Error)]
pub enum GatewayError {
    #[error("Rate limit exceeded for provider: {0}")]
    RateLimitExceeded(String),
    
    #[error("Provider unavailable: {0}")]
    ProviderUnavailable(String),
    
    #[error("Request timeout after {0}ms")]
    Timeout(u64),
    
    #[error("All retries exhausted for request: {0}")]
    RetriesExhausted(String),
    
    #[error("Invalid API key for provider: {0}")]
    InvalidApiKey(String),
    
    #[error("Failover failed, no backup providers available")]
    FailoverFailed,
}

#[derive(Debug, Error)]
pub enum IntegrationError {
    #[error("Integration not found: {0}")]
    NotFound(String),
    
    #[error("Invalid credentials")]
    InvalidCredentials,
    
    #[error("OAuth2 error: {0}")]
    OAuth2(String),
    
    #[error("API call failed: {0}")]
    ApiCallFailed(String),
}

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid token")]
    InvalidToken,
    
    #[error("Token expired")]
    TokenExpired,
    
    #[error("Invalid credentials")]
    InvalidCredentials,
    
    #[error("User not found")]
    UserNotFound,
}
