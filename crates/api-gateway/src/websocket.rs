use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::{broadcast, RwLock};
use tracing::{error, info, warn};
use uuid::Uuid;

use crate::server::AppState;

/// WebSocket connection manager
#[derive(Clone)]
pub struct WebSocketManager {
    /// Broadcast channel for sending updates to all connected clients
    tx: broadcast::Sender<WorkflowUpdate>,
    /// Track active connections
    connections: Arc<RwLock<Vec<Uuid>>>,
}

impl WebSocketManager {
    /// Create a new WebSocket manager
    pub fn new() -> Self {
        let (tx, _) = broadcast::channel(100);
        Self {
            tx,
            connections: Arc::new(RwLock::new(Vec::new())),
        }
    }

    /// Get the number of active connections
    pub async fn connection_count(&self) -> usize {
        self.connections.read().await.len()
    }

    /// Broadcast a workflow update to all connected clients
    pub async fn broadcast_update(&self, update: WorkflowUpdate) {
        if let Err(e) = self.tx.send(update) {
            warn!("Failed to broadcast update: {}", e);
        }
    }

    /// Register a new connection
    async fn register_connection(&self, connection_id: Uuid) {
        self.connections.write().await.push(connection_id);
        let count = self.connection_count().await;
        info!(
            connection_id = %connection_id,
            total_connections = count,
            "WebSocket connection registered"
        );
    }

    /// Unregister a connection
    async fn unregister_connection(&self, connection_id: Uuid) {
        self.connections.write().await.retain(|id| *id != connection_id);
        let count = self.connection_count().await;
        info!(
            connection_id = %connection_id,
            total_connections = count,
            "WebSocket connection unregistered"
        );
    }
}

impl Default for WebSocketManager {
    fn default() -> Self {
        Self::new()
    }
}

/// Workflow update message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowUpdate {
    pub workflow_id: Uuid,
    pub execution_id: Uuid,
    pub status: WorkflowStatus,
    pub current_node: Option<Uuid>,
    pub progress: f32,
    pub message: Option<String>,
    pub timestamp: i64,
}

/// Workflow execution status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WorkflowStatus {
    Queued,
    Running,
    Paused,
    Completed,
    Failed,
    Cancelled,
}

/// WebSocket handler
pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

/// Handle WebSocket connection
async fn handle_socket(socket: WebSocket, state: AppState) {
    let connection_id = Uuid::new_v4();
    let ws_manager = state.ws_manager.clone();

    // Register connection
    ws_manager.register_connection(connection_id).await;

    // Split socket into sender and receiver
    let (mut sender, mut receiver) = socket.split();

    // Subscribe to broadcast channel
    let mut rx = ws_manager.tx.subscribe();

    // Spawn task to send updates to client
    let send_task = tokio::spawn(async move {
        while let Ok(update) = rx.recv().await {
            let message = match serde_json::to_string(&update) {
                Ok(json) => Message::Text(json),
                Err(e) => {
                    error!("Failed to serialize update: {}", e);
                    continue;
                }
            };

            if sender.send(message).await.is_err() {
                break;
            }
        }
    });

    // Spawn task to receive messages from client
    let recv_task = tokio::spawn(async move {
        while let Some(msg) = receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    info!(
                        connection_id = %connection_id,
                        message = %text,
                        "Received WebSocket message"
                    );
                    // Handle client messages (e.g., subscribe to specific workflows)
                }
                Ok(Message::Close(_)) => {
                    info!(
                        connection_id = %connection_id,
                        "WebSocket connection closed by client"
                    );
                    break;
                }
                Ok(Message::Ping(_data)) => {
                    // Respond to ping with pong
                    info!(
                        connection_id = %connection_id,
                        "Received ping, sending pong"
                    );
                }
                Ok(Message::Pong(_)) => {
                    // Pong received
                }
                Ok(Message::Binary(_)) => {
                    warn!(
                        connection_id = %connection_id,
                        "Received binary message, ignoring"
                    );
                }
                Err(e) => {
                    error!(
                        connection_id = %connection_id,
                        error = %e,
                        "WebSocket error"
                    );
                    break;
                }
            }
        }
    });

    // Wait for either task to complete
    tokio::select! {
        _ = send_task => {},
        _ = recv_task => {},
    }

    // Unregister connection
    ws_manager.unregister_connection(connection_id).await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_websocket_manager_creation() {
        let manager = WebSocketManager::new();
        assert_eq!(manager.connection_count().await, 0);
    }

    #[tokio::test]
    async fn test_connection_registration() {
        let manager = WebSocketManager::new();
        let conn_id = Uuid::new_v4();

        manager.register_connection(conn_id).await;
        assert_eq!(manager.connection_count().await, 1);

        manager.unregister_connection(conn_id).await;
        assert_eq!(manager.connection_count().await, 0);
    }

    #[tokio::test]
    async fn test_broadcast_update() {
        let manager = WebSocketManager::new();
        let mut rx = manager.tx.subscribe();

        let update = WorkflowUpdate {
            workflow_id: Uuid::new_v4(),
            execution_id: Uuid::new_v4(),
            status: WorkflowStatus::Running,
            current_node: Some(Uuid::new_v4()),
            progress: 0.5,
            message: Some("Processing node".to_string()),
            timestamp: chrono::Utc::now().timestamp(),
        };

        manager.broadcast_update(update.clone()).await;

        let received = rx.recv().await.unwrap();
        assert_eq!(received.workflow_id, update.workflow_id);
        assert_eq!(received.execution_id, update.execution_id);
    }
}
