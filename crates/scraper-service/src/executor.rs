//! 爬虫节点执行器

use std::sync::Arc;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::browser::{BrowserPool, BrowserContextId, BrowserContextConfig};
use crate::types::*;
use crate::error::ScraperError;

/// 爬虫节点执行请求
#[derive(Debug, Deserialize)]
pub struct ScraperRequest {
    pub action: ScraperAction,
    pub context_id: Option<String>,
    pub config: Value,
}

/// 爬虫动作类型
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ScraperAction {
    OpenPage { url: String },
    ClosePage,
    GetText { 
        selector: String, 
        #[serde(default)]
        find_by: SelectorType,
    },
    GetAttribute { 
        selector: String, 
        attribute: String,
        #[serde(default)]
        find_by: SelectorType,
    },
    Click { 
        selector: String,
        #[serde(default)]
        find_by: SelectorType,
    },
    Input { 
        selector: String, 
        value: String,
        #[serde(default)]
        find_by: SelectorType,
    },
    Scroll { 
        #[serde(default)]
        mode: ScrollMode,
    },
    Wait { 
        selector: String,
        #[serde(default)]
        condition: WaitCondition,
        #[serde(default)]
        find_by: SelectorType,
    },
    LoopElements { 
        selector: String,
        #[serde(default)]
        find_by: SelectorType,
    },
    ExecuteScript { code: String },
    Screenshot {
        #[serde(default)]
        mode: ScreenshotMode,
    },
}

impl Default for ScrollMode {
    fn default() -> Self {
        ScrollMode::Pixels { x: 0, y: 500 }
    }
}

/// 爬虫节点执行响应
#[derive(Debug, Serialize)]
pub struct ScraperResponse {
    pub success: bool,
    pub context_id: Option<String>,
    pub data: Value,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

impl ScraperResponse {
    pub fn success(context_id: Option<String>, data: Value) -> Self {
        ScraperResponse {
            success: true,
            context_id,
            data,
            error: None,
        }
    }
    
    pub fn error(context_id: Option<String>, error: impl ToString) -> Self {
        ScraperResponse {
            success: false,
            context_id,
            data: Value::Null,
            error: Some(error.to_string()),
        }
    }
}

/// 爬虫执行器
pub struct ScraperExecutor {
    browser_pool: Arc<BrowserPool>,
}

impl ScraperExecutor {
    pub fn new(browser_pool: Arc<BrowserPool>) -> Self {
        ScraperExecutor { browser_pool }
    }
    
    /// 执行爬虫请求
    pub async fn execute(&self, request: ScraperRequest) -> ScraperResponse {
        match request.action {
            ScraperAction::OpenPage { url } => {
                self.execute_open_page(&url, &request.config).await
            }
            ScraperAction::ClosePage => {
                self.execute_close_page(request.context_id.as_deref()).await
            }
            ScraperAction::GetText { selector, find_by } => {
                self.execute_get_text(
                    request.context_id.as_deref(),
                    &selector,
                    find_by,
                    &request.config,
                ).await
            }
            ScraperAction::GetAttribute { selector, attribute, find_by } => {
                self.execute_get_attribute(
                    request.context_id.as_deref(),
                    &selector,
                    &attribute,
                    find_by,
                    &request.config,
                ).await
            }
            ScraperAction::Click { selector, find_by } => {
                self.execute_click(
                    request.context_id.as_deref(),
                    &selector,
                    find_by,
                    &request.config,
                ).await
            }
            ScraperAction::Input { selector, value, find_by } => {
                self.execute_input(
                    request.context_id.as_deref(),
                    &selector,
                    &value,
                    find_by,
                    &request.config,
                ).await
            }
            ScraperAction::Scroll { mode } => {
                self.execute_scroll(
                    request.context_id.as_deref(),
                    mode,
                    &request.config,
                ).await
            }
            ScraperAction::Wait { selector, condition, find_by } => {
                self.execute_wait(
                    request.context_id.as_deref(),
                    &selector,
                    condition,
                    find_by,
                    &request.config,
                ).await
            }
            ScraperAction::LoopElements { selector, find_by } => {
                self.execute_loop_elements(
                    request.context_id.as_deref(),
                    &selector,
                    find_by,
                    &request.config,
                ).await
            }
            ScraperAction::ExecuteScript { code } => {
                self.execute_script(
                    request.context_id.as_deref(),
                    &code,
                    &request.config,
                ).await
            }
            ScraperAction::Screenshot { mode } => {
                self.execute_screenshot(
                    request.context_id.as_deref(),
                    mode,
                    &request.config,
                ).await
            }
        }
    }
    
    /// 验证并获取上下文 ID
    fn validate_context_id(&self, context_id: Option<&str>) -> Result<BrowserContextId, ScraperError> {
        let id_str = context_id.ok_or_else(|| {
            ScraperError::ContextNotFound("缺少浏览器上下文".to_string())
        })?;
        BrowserContextId::from_string(id_str)
    }

    /// 执行打开网页
    async fn execute_open_page(&self, url: &str, config: &Value) -> ScraperResponse {
        // 验证 URL
        if url.is_empty() {
            return ScraperResponse::error(None, ScraperError::InvalidUrl("URL 不能为空".to_string()));
        }
        
        // 解析配置
        let browser_config = BrowserContextConfig {
            headless: config.get("headless").and_then(|v| v.as_bool()).unwrap_or(true),
            user_agent: config.get("userAgent").and_then(|v| v.as_str()).map(String::from),
            viewport: config.get("viewport").and_then(|v| {
                Some(Viewport {
                    width: v.get("width")?.as_u64()? as u32,
                    height: v.get("height")?.as_u64()? as u32,
                })
            }),
            timeout: config.get("timeout").and_then(|v| v.as_u64()).unwrap_or(30000),
        };
        
        // 创建浏览器上下文
        match self.browser_pool.create_context(browser_config).await {
            Ok(context_id) => {
                // 在实际实现中，这里会导航到 URL
                // 模拟导航成功
                let _ = self.browser_pool.update_context_page(
                    &context_id,
                    url.to_string(),
                    "Page Title".to_string(), // 实际实现会获取真实标题
                ).await;
                
                ScraperResponse::success(
                    Some(context_id.to_string()),
                    serde_json::json!({
                        "title": "Page Title",
                        "url": url,
                    }),
                )
            }
            Err(e) => ScraperResponse::error(None, e),
        }
    }
    
    /// 执行关闭页面
    async fn execute_close_page(&self, context_id: Option<&str>) -> ScraperResponse {
        match self.validate_context_id(context_id) {
            Ok(ctx_id) => {
                match self.browser_pool.close_context(&ctx_id).await {
                    Ok(_) => ScraperResponse::success(None, serde_json::json!({ "closed": true })),
                    Err(e) => ScraperResponse::error(context_id.map(String::from), e),
                }
            }
            Err(e) => ScraperResponse::error(context_id.map(String::from), e),
        }
    }
    
    /// 执行获取文本
    async fn execute_get_text(
        &self,
        context_id: Option<&str>,
        selector: &str,
        _find_by: SelectorType,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        // 验证上下文有效性
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let multiple = config.get("multiple").and_then(|v| v.as_bool()).unwrap_or(false);
        let _include_html = config.get("includeHtml").and_then(|v| v.as_bool()).unwrap_or(false);
        
        // 在实际实现中，这里会执行选择器查询
        // 模拟返回结果
        let texts = vec!["Sample text 1".to_string(), "Sample text 2".to_string()];
        
        let data = if multiple {
            serde_json::json!({
                "texts": texts,
                "count": texts.len(),
            })
        } else {
            serde_json::json!({
                "text": texts.first().unwrap_or(&String::new()),
            })
        };
        
        ScraperResponse::success(context_id.map(String::from), data)
    }
    
    /// 执行获取属性
    async fn execute_get_attribute(
        &self,
        context_id: Option<&str>,
        selector: &str,
        attribute: &str,
        _find_by: SelectorType,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let multiple = config.get("multiple").and_then(|v| v.as_bool()).unwrap_or(false);
        
        // 模拟返回结果
        let values = vec!["https://example.com".to_string()];
        
        let data = if multiple {
            serde_json::json!({
                "values": values,
                "count": values.len(),
            })
        } else {
            serde_json::json!({
                "value": values.first(),
            })
        };
        
        ScraperResponse::success(context_id.map(String::from), data)
    }

    /// 执行点击
    async fn execute_click(
        &self,
        context_id: Option<&str>,
        selector: &str,
        _find_by: SelectorType,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let _wait_for_navigation = config.get("waitForNavigation")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        
        // 在实际实现中，这里会执行点击操作
        // 模拟成功
        ScraperResponse::success(
            context_id.map(String::from),
            serde_json::json!({ "clicked": true }),
        )
    }
    
    /// 执行输入
    async fn execute_input(
        &self,
        context_id: Option<&str>,
        selector: &str,
        value: &str,
        _find_by: SelectorType,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let _clear_before = config.get("clearBefore")
            .and_then(|v| v.as_bool())
            .unwrap_or(true);
        let _press_enter = config.get("pressEnter")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);
        
        // 模拟成功
        ScraperResponse::success(
            context_id.map(String::from),
            serde_json::json!({ "typed": true, "value": value }),
        )
    }
    
    /// 执行滚动
    async fn execute_scroll(
        &self,
        context_id: Option<&str>,
        mode: ScrollMode,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        // 模拟成功
        let scroll_info = match mode {
            ScrollMode::Pixels { x, y } => serde_json::json!({ "scrolledX": x, "scrolledY": y }),
            ScrollMode::Element { selector } => serde_json::json!({ "scrolledTo": selector }),
            ScrollMode::Bottom => serde_json::json!({ "scrolledTo": "bottom" }),
            ScrollMode::Top => serde_json::json!({ "scrolledTo": "top" }),
        };
        
        ScraperResponse::success(context_id.map(String::from), scroll_info)
    }
    
    /// 执行等待
    async fn execute_wait(
        &self,
        context_id: Option<&str>,
        selector: &str,
        condition: WaitCondition,
        _find_by: SelectorType,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let _timeout = config.get("timeout")
            .and_then(|v| v.as_u64())
            .unwrap_or(30000);
        
        // 模拟成功
        ScraperResponse::success(
            context_id.map(String::from),
            serde_json::json!({
                "found": true,
                "condition": format!("{:?}", condition),
            }),
        )
    }

    /// 执行循环元素
    async fn execute_loop_elements(
        &self,
        context_id: Option<&str>,
        selector: &str,
        _find_by: SelectorType,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let max_iterations = config.get("maxIterations")
            .and_then(|v| v.as_u64())
            .unwrap_or(100) as usize;
        
        // 模拟返回元素列表
        let elements: Vec<serde_json::Value> = (0..3.min(max_iterations))
            .map(|i| serde_json::json!({
                "index": i,
                "html": format!("<div>Element {}</div>", i),
            }))
            .collect();
        
        ScraperResponse::success(
            context_id.map(String::from),
            serde_json::json!({
                "elements": elements,
                "total": elements.len(),
            }),
        )
    }
    
    /// 执行脚本
    async fn execute_script(
        &self,
        context_id: Option<&str>,
        code: &str,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let _timeout = config.get("timeout")
            .and_then(|v| v.as_u64())
            .unwrap_or(30000);
        
        // 在实际实现中，这里会在页面上下文中执行脚本
        // 模拟返回结果
        ScraperResponse::success(
            context_id.map(String::from),
            serde_json::json!({
                "result": "Script executed successfully",
                "logs": [],
            }),
        )
    }
    
    /// 执行截图
    async fn execute_screenshot(
        &self,
        context_id: Option<&str>,
        mode: ScreenshotMode,
        config: &Value,
    ) -> ScraperResponse {
        let ctx_id = match self.validate_context_id(context_id) {
            Ok(id) => id,
            Err(e) => return ScraperResponse::error(context_id.map(String::from), e),
        };
        
        if !self.browser_pool.is_context_valid(&ctx_id).await {
            return ScraperResponse::error(
                context_id.map(String::from),
                ScraperError::ContextInvalid(ctx_id.to_string()),
            );
        }
        
        let format = config.get("format")
            .and_then(|v| v.as_str())
            .unwrap_or("png");
        let _quality = config.get("quality")
            .and_then(|v| v.as_u64())
            .unwrap_or(100) as u8;
        
        // 模拟返回截图数据
        ScraperResponse::success(
            context_id.map(String::from),
            serde_json::json!({
                "data": "base64_encoded_image_data_placeholder",
                "width": 1280,
                "height": 720,
                "format": format,
            }),
        )
    }
}

impl Default for ScraperExecutor {
    fn default() -> Self {
        ScraperExecutor::new(Arc::new(BrowserPool::default()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_open_page() {
        let executor = ScraperExecutor::default();
        let request = ScraperRequest {
            action: ScraperAction::OpenPage { 
                url: "https://example.com".to_string() 
            },
            context_id: None,
            config: serde_json::json!({}),
        };
        
        let response = executor.execute(request).await;
        assert!(response.success);
        assert!(response.context_id.is_some());
    }
    
    #[tokio::test]
    async fn test_close_page() {
        let executor = ScraperExecutor::default();
        
        // 先打开页面
        let open_request = ScraperRequest {
            action: ScraperAction::OpenPage { 
                url: "https://example.com".to_string() 
            },
            context_id: None,
            config: serde_json::json!({}),
        };
        let open_response = executor.execute(open_request).await;
        let context_id = open_response.context_id;
        
        // 关闭页面
        let close_request = ScraperRequest {
            action: ScraperAction::ClosePage,
            context_id,
            config: serde_json::json!({}),
        };
        let close_response = executor.execute(close_request).await;
        assert!(close_response.success);
    }
}
