//! Scraper Service - 网页爬虫服务
//! 
//! 提供浏览器自动化和网页数据提取功能

pub mod browser;
pub mod executor;
pub mod types;
pub mod error;

pub use browser::{BrowserPool, BrowserContext, BrowserContextId, BrowserContextConfig};
pub use executor::{ScraperExecutor, ScraperRequest, ScraperResponse, ScraperAction};
pub use error::ScraperError;
