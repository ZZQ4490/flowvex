// src/services/scraperApi.ts
// 爬虫服务 API 客户端

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ScraperRequest {
  action: ScraperAction;
  contextId?: string;
  config: Record<string, any>;
}

export type ScraperAction = 
  | { type: 'openPage'; url: string }
  | { type: 'closePage' }
  | { type: 'getText'; selector: string; findBy?: 'cssSelector' | 'xpath' }
  | { type: 'getAttribute'; selector: string; attribute: string; findBy?: 'cssSelector' | 'xpath' }
  | { type: 'click'; selector: string; findBy?: 'cssSelector' | 'xpath' }
  | { type: 'input'; selector: string; value: string; findBy?: 'cssSelector' | 'xpath' }
  | { type: 'scroll'; mode: ScrollMode }
  | { type: 'wait'; selector: string; condition: WaitCondition; findBy?: 'cssSelector' | 'xpath' }
  | { type: 'loopElements'; selector: string; findBy?: 'cssSelector' | 'xpath' }
  | { type: 'executeScript'; code: string }
  | { type: 'screenshot'; mode: ScreenshotMode };

export type ScrollMode = 
  | { type: 'pixels'; x: number; y: number }
  | { type: 'element'; selector: string }
  | { type: 'bottom' }
  | { type: 'top' };

export type WaitCondition = 'visible' | 'hidden' | 'attached' | 'detached';

export type ScreenshotMode = 
  | { type: 'fullPage' }
  | { type: 'viewport' }
  | { type: 'element'; selector: string };

export interface ScraperResponse {
  success: boolean;
  contextId?: string;
  data: any;
  error?: string;
}

/**
 * 执行爬虫动作
 */
export async function executeScraperAction(request: ScraperRequest): Promise<ScraperResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scraper/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: request.action,
        context_id: request.contextId,
        config: request.config,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        contextId: request.contextId,
        data: null,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      contextId: data.context_id,
      data: data.data,
      error: data.error,
    };
  } catch (error) {
    return {
      success: false,
      contextId: request.contextId,
      data: null,
      error: error instanceof Error ? error.message : '网络请求失败',
    };
  }
}

// 便捷方法

/**
 * 打开网页
 */
export async function openPage(
  url: string, 
  config: { headless?: boolean; timeout?: number; userAgent?: string } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'openPage', url },
    config,
  });
}

/**
 * 关闭页面
 */
export async function closePage(contextId: string): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'closePage' },
    contextId,
    config: {},
  });
}

/**
 * 获取文本
 */
export async function getText(
  contextId: string,
  selector: string,
  config: { findBy?: 'cssSelector' | 'xpath'; multiple?: boolean; includeHtml?: boolean } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'getText', selector, findBy: config.findBy },
    contextId,
    config,
  });
}

/**
 * 获取属性
 */
export async function getAttribute(
  contextId: string,
  selector: string,
  attribute: string,
  config: { findBy?: 'cssSelector' | 'xpath'; multiple?: boolean } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'getAttribute', selector, attribute, findBy: config.findBy },
    contextId,
    config,
  });
}

/**
 * 点击元素
 */
export async function clickElement(
  contextId: string,
  selector: string,
  config: { findBy?: 'cssSelector' | 'xpath'; waitForNavigation?: boolean } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'click', selector, findBy: config.findBy },
    contextId,
    config,
  });
}

/**
 * 输入文本
 */
export async function inputText(
  contextId: string,
  selector: string,
  value: string,
  config: { findBy?: 'cssSelector' | 'xpath'; clearBefore?: boolean; pressEnter?: boolean } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'input', selector, value, findBy: config.findBy },
    contextId,
    config,
  });
}

/**
 * 滚动页面
 */
export async function scrollPage(
  contextId: string,
  mode: ScrollMode,
  config: { smooth?: boolean; waitAfter?: number } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'scroll', mode },
    contextId,
    config,
  });
}

/**
 * 等待元素
 */
export async function waitForElement(
  contextId: string,
  selector: string,
  condition: WaitCondition = 'visible',
  config: { findBy?: 'cssSelector' | 'xpath'; timeout?: number } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'wait', selector, condition, findBy: config.findBy },
    contextId,
    config,
  });
}

/**
 * 执行脚本
 */
export async function executeScript(
  contextId: string,
  code: string,
  config: { timeout?: number } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'executeScript', code },
    contextId,
    config,
  });
}

/**
 * 截图
 */
export async function takeScreenshot(
  contextId: string,
  mode: ScreenshotMode = { type: 'viewport' },
  config: { format?: 'png' | 'jpeg'; quality?: number } = {}
): Promise<ScraperResponse> {
  return executeScraperAction({
    action: { type: 'screenshot', mode },
    contextId,
    config,
  });
}

export default {
  executeScraperAction,
  openPage,
  closePage,
  getText,
  getAttribute,
  clickElement,
  inputText,
  scrollPage,
  waitForElement,
  executeScript,
  takeScreenshot,
};
