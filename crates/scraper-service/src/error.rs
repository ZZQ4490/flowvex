//! 爬虫服务错误类型

use thiserror::Error;

/// 爬虫服务错误
#[derive(Debug, Error)]
pub enum ScraperError {
    #[error("浏览器池已满")]
    PoolExhausted,
    
    #[error("上下文不存在: {0}")]
    ContextNotFound(String),
    
    #[error("上下文已失效: {0}")]
    ContextInvalid(String),
    
    #[error("导航失败: {0}")]
    NavigationFailed(String),
    
    #[error("选择器超时: {0}")]
    SelectorTimeout(String),
    
    #[error("元素未找到: {0}")]
    ElementNotFound(String),
    
    #[error("元素不可点击: {0}")]
    ElementNotClickable(String),
    
    #[error("无效的输入元素: {0}")]
    InvalidInputElement(String),
    
    #[error("脚本执行错误: {0}")]
    ScriptError(String),
    
    #[error("截图失败: {0}")]
    ScreenshotFailed(String),
    
    #[error("无效的URL: {0}")]
    InvalidUrl(String),
    
    #[error("无效的选择器: {0}")]
    InvalidSelector(String),
    
    #[error("操作超时: {0}")]
    Timeout(String),
    
    #[error("内部错误: {0}")]
    Internal(String),
}

impl ScraperError {
    /// 获取错误码
    pub fn code(&self) -> &'static str {
        match self {
            ScraperError::PoolExhausted => "SCRAPER_008",
            ScraperError::ContextNotFound(_) => "SCRAPER_007",
            ScraperError::ContextInvalid(_) => "SCRAPER_007",
            ScraperError::NavigationFailed(_) => "SCRAPER_001",
            ScraperError::SelectorTimeout(_) => "SCRAPER_002",
            ScraperError::ElementNotFound(_) => "SCRAPER_003",
            ScraperError::ElementNotClickable(_) => "SCRAPER_004",
            ScraperError::InvalidInputElement(_) => "SCRAPER_005",
            ScraperError::ScriptError(_) => "SCRAPER_006",
            ScraperError::ScreenshotFailed(_) => "SCRAPER_009",
            ScraperError::InvalidUrl(_) => "SCRAPER_010",
            ScraperError::InvalidSelector(_) => "SCRAPER_011",
            ScraperError::Timeout(_) => "SCRAPER_012",
            ScraperError::Internal(_) => "SCRAPER_999",
        }
    }
}

/// 将 ScraperError 转换为 JSON 响应
impl From<ScraperError> for serde_json::Value {
    fn from(err: ScraperError) -> Self {
        serde_json::json!({
            "error": true,
            "code": err.code(),
            "message": err.to_string(),
        })
    }
}
