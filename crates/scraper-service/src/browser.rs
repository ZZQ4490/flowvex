//! 浏览器上下文管理

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::error::ScraperError;
use crate::types::Viewport;

/// 浏览器上下文 ID
#[derive(Debug, Clone, Hash, Eq, PartialEq)]
pub struct BrowserContextId(pub Uuid);

impl BrowserContextId {
    pub fn new() -> Self {
        BrowserContextId(Uuid::new_v4())
    }
    
    pub fn from_string(s: &str) -> Result<Self, ScraperError> {
        Uuid::parse_str(s)
            .map(BrowserContextId)
            .map_err(|_| ScraperError::ContextNotFound(s.to_string()))
    }
}

impl std::fmt::Display for BrowserContextId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl Default for BrowserContextId {
    fn default() -> Self {
        Self::new()
    }
}

/// 浏览器上下文配置
#[derive(Debug, Clone)]
pub struct BrowserContextConfig {
    pub headless: bool,
    pub user_agent: Option<String>,
    pub viewport: Option<Viewport>,
    pub timeout: u64,
}

impl Default for BrowserContextConfig {
    fn default() -> Self {
        BrowserContextConfig {
            headless: true,
            user_agent: None,
            viewport: Some(Viewport::default()),
            timeout: 30000,
        }
    }
}

/// 浏览器上下文状态
#[derive(Debug, Clone, PartialEq)]
pub enum ContextStatus {
    Active,
    Idle,
    Closed,
}

/// 浏览器上下文
#[derive(Debug)]
pub struct BrowserContext {
    pub id: BrowserContextId,
    pub config: BrowserContextConfig,
    pub current_url: String,
    pub page_title: String,
    pub status: ContextStatus,
    pub created_at: DateTime<Utc>,
    pub last_used_at: DateTime<Utc>,
    // 在实际实现中，这里会有 Playwright 页面句柄
    // page_handle: Option<PlaywrightPage>,
}

impl BrowserContext {
    pub fn new(id: BrowserContextId, config: BrowserContextConfig) -> Self {
        let now = Utc::now();
        BrowserContext {
            id,
            config,
            current_url: String::new(),
            page_title: String::new(),
            status: ContextStatus::Active,
            created_at: now,
            last_used_at: now,
        }
    }
    
    pub fn touch(&mut self) {
        self.last_used_at = Utc::now();
        if self.status == ContextStatus::Idle {
            self.status = ContextStatus::Active;
        }
    }
    
    pub fn is_valid(&self) -> bool {
        self.status != ContextStatus::Closed
    }
    
    pub fn close(&mut self) {
        self.status = ContextStatus::Closed;
    }
}

/// 浏览器池管理器
pub struct BrowserPool {
    contexts: Arc<RwLock<HashMap<BrowserContextId, BrowserContext>>>,
    max_contexts: usize,
    idle_timeout_secs: u64,
}

impl BrowserPool {
    pub fn new(max_contexts: usize, idle_timeout_secs: u64) -> Self {
        BrowserPool {
            contexts: Arc::new(RwLock::new(HashMap::new())),
            max_contexts,
            idle_timeout_secs,
        }
    }
    
    /// 创建新的浏览器上下文
    pub async fn create_context(
        &self,
        config: BrowserContextConfig,
    ) -> Result<BrowserContextId, ScraperError> {
        let contexts = self.contexts.read().await;
        if contexts.len() >= self.max_contexts {
            return Err(ScraperError::PoolExhausted);
        }
        drop(contexts);
        
        let id = BrowserContextId::new();
        let context = BrowserContext::new(id.clone(), config);
        
        let mut contexts = self.contexts.write().await;
        contexts.insert(id.clone(), context);
        
        tracing::info!("Created browser context: {}", id);
        Ok(id)
    }
    
    /// 获取浏览器上下文（可变引用）
    pub async fn get_context_mut(
        &self,
        id: &BrowserContextId,
    ) -> Result<(), ScraperError> {
        let mut contexts = self.contexts.write().await;
        let context = contexts.get_mut(id)
            .ok_or_else(|| ScraperError::ContextNotFound(id.to_string()))?;
        
        if !context.is_valid() {
            return Err(ScraperError::ContextInvalid(id.to_string()));
        }
        
        context.touch();
        Ok(())
    }
    
    /// 检查上下文是否存在且有效
    pub async fn is_context_valid(&self, id: &BrowserContextId) -> bool {
        let contexts = self.contexts.read().await;
        contexts.get(id).map(|c| c.is_valid()).unwrap_or(false)
    }
    
    /// 更新上下文的 URL 和标题
    pub async fn update_context_page(
        &self,
        id: &BrowserContextId,
        url: String,
        title: String,
    ) -> Result<(), ScraperError> {
        let mut contexts = self.contexts.write().await;
        let context = contexts.get_mut(id)
            .ok_or_else(|| ScraperError::ContextNotFound(id.to_string()))?;
        
        context.current_url = url;
        context.page_title = title;
        context.touch();
        Ok(())
    }
    
    /// 关闭浏览器上下文
    pub async fn close_context(&self, id: &BrowserContextId) -> Result<(), ScraperError> {
        let mut contexts = self.contexts.write().await;
        if let Some(context) = contexts.get_mut(id) {
            context.close();
            tracing::info!("Closed browser context: {}", id);
        }
        // 从池中移除
        contexts.remove(id);
        Ok(())
    }
    
    /// 清理空闲上下文
    pub async fn cleanup_idle(&self) -> usize {
        let now = Utc::now();
        let mut contexts = self.contexts.write().await;
        
        let idle_ids: Vec<BrowserContextId> = contexts
            .iter()
            .filter(|(_, ctx)| {
                let idle_secs = (now - ctx.last_used_at).num_seconds() as u64;
                idle_secs > self.idle_timeout_secs
            })
            .map(|(id, _)| id.clone())
            .collect();
        
        let count = idle_ids.len();
        for id in idle_ids {
            if let Some(mut context) = contexts.remove(&id) {
                context.close();
                tracing::info!("Cleaned up idle browser context: {}", id);
            }
        }
        
        count
    }
    
    /// 获取当前上下文数量
    pub async fn context_count(&self) -> usize {
        self.contexts.read().await.len()
    }
    
    /// 获取所有上下文 ID
    pub async fn list_contexts(&self) -> Vec<BrowserContextId> {
        self.contexts.read().await.keys().cloned().collect()
    }
}

impl Default for BrowserPool {
    fn default() -> Self {
        BrowserPool::new(10, 300) // 默认最多10个上下文，5分钟空闲超时
    }
}
