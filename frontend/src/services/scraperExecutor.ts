// src/services/scraperExecutor.ts
// 爬虫节点执行器 - 调用后端 Playwright 服务

const API_BASE_URL = 'http://localhost:3001';

interface ScraperResult {
  success: boolean;
  data: any;
  error?: string;
  contextId?: string;
}

// 存储当前工作流的浏览器上下文ID
let currentContextId: string | null = null;

/**
 * 执行爬虫节点
 */
export async function executeScraperNode(
  scraperType: string,
  config: Record<string, any>
): Promise<ScraperResult> {
  try {
    switch (scraperType) {
      case 'OpenPage':
        return await executeOpenPage(config);
      
      case 'GetText':
        return await executeGetText(config);
      
      case 'GetAttribute':
        return await executeGetAttribute(config);
      
      case 'Click':
        return await executeClick(config);
      
      case 'Input':
        return await executeInput(config);
      
      case 'Scroll':
        return await executeScroll(config);
      
      case 'Wait':
        return await executeWait(config);
      
      case 'Screenshot':
        return await executeScreenshot(config);
      
      case 'ExecuteScript':
        return await executeScript(config);
      
      case 'ClosePage':
        return await executeClosePage();
      
      // 深度爬取相关
      case 'GetLinks':
        return await executeGetLinks(config);
      
      case 'DeepScrape':
        return await executeDeepScrape(config);
      
      case 'AutoDeepScrape':
        return await executeAutoDeepScrape(config);
      
      default:
        return { success: false, data: null, error: `Unknown scraper type: ${scraperType}` };
    }
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function callScraperAPI(action: any, config: any = {}): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/scraper/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      context_id: currentContextId,
      config
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function executeOpenPage(config: Record<string, any>): Promise<ScraperResult> {
  const result = await callScraperAPI(
    { type: 'openPage', url: config.url },
    {
      timeout: config.timeout || 30000,
      waitForLoad: config.waitForLoad !== false,
      headless: config.headless !== false,
      userAgent: config.userAgent,
      viewport: config.viewport,
      waitForNetworkIdle: config.waitForNetworkIdle,
      waitAfterLoad: config.waitAfterLoad,
      waitForSelector: config.waitForSelector,
    }
  );
  
  if (result.success) {
    currentContextId = result.context_id;
    
    // 如果启用了深度爬取
    if (config.enableDeepScrape && config.deepScrape) {
      const deepConfig = config.deepScrape;
      
      // 执行深度爬取（复用当前上下文）
      const deepResult = await callScraperAPI(
        { type: 'autoDeepScrape' },
        {
          linkSelector: deepConfig.linkSelector || 'a[href]',
          contentSelector: deepConfig.contentSelector || 'article, .content, main, body',
          maxLinks: deepConfig.maxLinks || 10,
          maxConcurrent: 3,
          timeout: 15000,
          maxContentLength: 5000,
          filterPattern: deepConfig.filterPattern || '',
          reuseContext: true,  // 复用当前上下文
        }
      );
      
      // 注意：不再关闭页面，保持上下文以便后续节点使用
      // 上下文会在工作流结束时或执行 ClosePage 节点时关闭
      
      return {
        success: true,
        contextId: result.context_id,
        data: {
          title: result.data.title,
          url: result.data.url,
          screenshot: result.data.screenshot ? `data:image/png;base64,${result.data.screenshot}` : null,
          contextId: result.context_id,
          // 深度爬取结果
          deepScrapeResults: deepResult.success ? deepResult.data.results : [],
          totalLinks: deepResult.success ? deepResult.data.total : 0,
          successCount: deepResult.success ? deepResult.data.success : 0,
        }
      };
    }
    
    // 普通模式
    return {
      success: true,
      contextId: result.context_id,
      data: {
        title: result.data.title,
        url: result.data.url,
        screenshot: result.data.screenshot ? `data:image/png;base64,${result.data.screenshot}` : null,
        contextId: result.context_id
      }
    };
  }
  
  return { success: false, data: null, error: result.error };
}

async function executeGetText(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文，请先执行"打开网页"节点' };
  }
  
  const result = await callScraperAPI(
    { type: 'getText', selector: config.selector, findBy: config.findBy },
    {
      multiple: config.multiple,
      waitForSelector: config.waitForSelector,
      waitTimeout: config.waitTimeout,
      includeHtml: config.includeHtml
    }
  );
  
  if (result.success) {
    let data = config.multiple ? result.data.texts : result.data.text;
    
    // 应用正则过滤
    if (config.regex && data) {
      const regex = new RegExp(config.regex, 'g');
      if (Array.isArray(data)) {
        data = data.map((t: string) => {
          const matches = t.match(regex);
          return matches ? matches.join('') : t;
        });
      } else {
        const matches = data.match(regex);
        data = matches ? matches.join('') : data;
      }
    }
    
    return {
      success: true,
      contextId: currentContextId,
      data: {
        text: config.multiple ? null : data,
        texts: config.multiple ? data : [data],
        count: result.data.count
      }
    };
  }
  
  return { success: false, data: null, error: result.error };
}

async function executeGetAttribute(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  const result = await callScraperAPI(
    { type: 'getAttribute', selector: config.selector, attribute: config.attributeName },
    {
      multiple: config.multiple,
      waitForSelector: config.waitForSelector,
      waitTimeout: config.waitTimeout
    }
  );
  
  if (result.success) {
    return {
      success: true,
      contextId: currentContextId,
      data: {
        value: config.multiple ? null : result.data.value,
        values: config.multiple ? result.data.values : [result.data.value],
        count: result.data.count
      }
    };
  }
  
  return { success: false, data: null, error: result.error };
}

async function executeClick(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  const result = await callScraperAPI(
    { type: 'click', selector: config.selector },
    {
      waitForNavigation: config.waitForNavigation,
      delay: config.delay
    }
  );
  
  return {
    success: result.success,
    contextId: currentContextId,
    data: result.data,
    error: result.error
  };
}

async function executeInput(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  const result = await callScraperAPI(
    { type: 'input', selector: config.selector, value: config.value },
    {
      clearBefore: config.clearBefore,
      pressEnter: config.pressEnter,
      delay: config.delay
    }
  );
  
  return {
    success: result.success,
    contextId: currentContextId,
    data: result.data,
    error: result.error
  };
}

async function executeScroll(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  let mode: any;
  switch (config.mode) {
    case 'pixels':
      mode = { type: 'pixels', x: config.scrollX || 0, y: config.scrollY || 500 };
      break;
    case 'bottom':
      mode = { type: 'bottom' };
      break;
    case 'top':
      mode = { type: 'top' };
      break;
    case 'element':
      mode = { type: 'element', selector: config.selector };
      break;
    default:
      mode = { type: 'pixels', x: 0, y: 500 };
  }
  
  const result = await callScraperAPI(
    { type: 'scroll', mode },
    { smooth: config.smooth, waitAfter: config.waitAfter }
  );
  
  return {
    success: result.success,
    contextId: currentContextId,
    data: result.data,
    error: result.error
  };
}

async function executeWait(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  const result = await callScraperAPI(
    { type: 'wait', selector: config.selector, condition: config.condition },
    { timeout: config.timeout }
  );
  
  return {
    success: result.success,
    contextId: currentContextId,
    data: result.data,
    error: result.error
  };
}

async function executeScreenshot(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  let mode: any = { type: config.mode || 'viewport' };
  if (config.mode === 'element' && config.selector) {
    mode = { type: 'element', selector: config.selector };
  }
  
  const result = await callScraperAPI(
    { type: 'screenshot', mode },
    { format: config.format, quality: config.quality }
  );
  
  if (result.success) {
    return {
      success: true,
      contextId: currentContextId,
      data: {
        image: `data:image/${config.format || 'png'};base64,${result.data.base64}`,
        base64: result.data.base64
      }
    };
  }
  
  return { success: false, data: null, error: result.error };
}

async function executeScript(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  const result = await callScraperAPI(
    { type: 'executeScript', code: config.code },
    { timeout: config.timeout }
  );
  
  return {
    success: result.success,
    contextId: currentContextId,
    data: result.data,
    error: result.error
  };
}

async function executeClosePage(): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: true, data: { closed: true } };
  }
  
  const result = await callScraperAPI({ type: 'closePage' });
  currentContextId = null;
  
  return {
    success: result.success,
    data: result.data,
    error: result.error
  };
}

// ==================== 深度爬取相关函数 ====================

async function executeGetLinks(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文，请先执行"打开网页"节点' };
  }
  
  const result = await callScraperAPI(
    { type: 'getLinks', selector: config.selector },
    {
      limit: config.limit || 50,
      includeText: config.includeText !== false,
      waitForSelector: config.waitForSelector,
      waitTimeout: config.waitTimeout
    }
  );
  
  if (result.success) {
    return {
      success: true,
      contextId: currentContextId,
      data: {
        links: result.data.links,
        count: result.data.count
      }
    };
  }
  
  return { success: false, data: null, error: result.error };
}

async function executeDeepScrape(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文' };
  }
  
  // links 应该从上游节点传入
  const links = config.links || [];
  
  if (!links.length) {
    return { success: false, data: null, error: '没有提供链接列表，请先使用"获取链接"节点' };
  }
  
  const result = await callScraperAPI(
    { type: 'deepScrape', links },
    {
      contentSelector: config.contentSelector || 'article, .content, main, body',
      maxConcurrent: config.maxConcurrent || 3,
      timeout: config.timeout || 15000,
      maxContentLength: config.maxContentLength || 5000,
      includeMetadata: config.includeMetadata !== false
    }
  );
  
  if (result.success) {
    return {
      success: true,
      contextId: currentContextId,
      data: {
        results: result.data.results,
        total: result.data.total,
        success: result.data.success,
        failed: result.data.failed
      }
    };
  }
  
  return { success: false, data: null, error: result.error };
}

async function executeAutoDeepScrape(config: Record<string, any>): Promise<ScraperResult> {
  if (!currentContextId) {
    return { success: false, data: null, error: '没有可用的浏览器上下文，请先执行"打开网页"节点' };
  }
  
  const result = await callScraperAPI(
    { type: 'autoDeepScrape' },
    {
      linkSelector: config.linkSelector || 'a[href]',
      contentSelector: config.contentSelector || 'article, .content, main, body',
      maxLinks: config.maxLinks || 10,
      maxConcurrent: config.maxConcurrent || 3,
      timeout: config.timeout || 15000,
      maxContentLength: config.maxContentLength || 5000,
      filterPattern: config.filterPattern || ''
    }
  );
  
  if (result.success) {
    return {
      success: true,
      contextId: currentContextId,
      data: {
        results: result.data.results,
        total: result.data.total,
        success: result.data.success
      }
    };
  }
  
  return { success: false, data: null, error: result.error };
}

/**
 * 清理当前上下文
 */
export function clearCurrentContext() {
  currentContextId = null;
}

/**
 * 获取当前上下文ID
 */
export function getCurrentContextId(): string | null {
  return currentContextId;
}

/**
 * 检查爬虫服务是否可用
 */
export async function checkScraperServiceHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    return response.ok;
  } catch {
    return false;
  }
}
