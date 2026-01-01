//! 爬虫服务类型定义

use serde::{Deserialize, Serialize};

/// 选择器类型
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum SelectorType {
    CssSelector,
    Xpath,
}

impl Default for SelectorType {
    fn default() -> Self {
        SelectorType::CssSelector
    }
}

/// 滚动模式
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ScrollMode {
    Pixels { x: i32, y: i32 },
    Element { selector: String },
    Bottom,
    Top,
}

/// 等待条件
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum WaitCondition {
    Visible,
    Hidden,
    Attached,
    Detached,
}

impl Default for WaitCondition {
    fn default() -> Self {
        WaitCondition::Visible
    }
}

/// 截图模式
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ScreenshotMode {
    FullPage,
    Viewport,
    Element { selector: String },
}

impl Default for ScreenshotMode {
    fn default() -> Self {
        ScreenshotMode::Viewport
    }
}

/// 截图格式
#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ScreenshotFormat {
    Png,
    Jpeg,
}

impl Default for ScreenshotFormat {
    fn default() -> Self {
        ScreenshotFormat::Png
    }
}

/// 视口配置
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Viewport {
    pub width: u32,
    pub height: u32,
}

impl Default for Viewport {
    fn default() -> Self {
        Viewport {
            width: 1280,
            height: 720,
        }
    }
}

/// 提取的文本结果
#[derive(Debug, Clone, Serialize)]
pub struct TextResult {
    pub text: String,
    pub html: Option<String>,
}

/// 提取的属性结果
#[derive(Debug, Clone, Serialize)]
pub struct AttributeResult {
    pub value: Option<String>,
}

/// 截图结果
#[derive(Debug, Clone, Serialize)]
pub struct ScreenshotResult {
    pub data: String,  // Base64 encoded
    pub width: u32,
    pub height: u32,
    pub format: ScreenshotFormat,
}

/// 脚本执行结果
#[derive(Debug, Clone, Serialize)]
pub struct ScriptResult {
    pub value: serde_json::Value,
    pub logs: Vec<String>,
}

/// 循环元素迭代结果
#[derive(Debug, Clone, Serialize)]
pub struct LoopIterationResult {
    pub index: usize,
    pub total: usize,
    pub element_html: String,
}
