// Scraper Server - 高性能 Playwright 爬虫服务
// 特性：浏览器复用、指纹防护、速度优化

import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// 启用 Stealth 插件绑过检测
chromium.use(StealthPlugin());

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 全局浏览器实例（复用）
let browser = null;
let browserReady = false;

// 存储页面上下文
const contexts = new Map();

// 浏览器启动配置 - 极限优化
const BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--no-first-run',
  '--no-zygote',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-extensions-with-background-pages',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-extensions',
  '--disable-features=TranslateUI',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-popup-blocking',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-sync',
  '--enable-features=NetworkService,NetworkServiceInProcess',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  '--no-default-browser-check',
  '--password-store=basic',
  '--use-mock-keychain',
];

// 预启动浏览器
async function initBrowser() {
  if (browser && browserReady) return browser;
  
  console.log('🚀 预启动浏览器...');
  const startTime = Date.now();
  
  browser = await chromium.launch({
    headless: true,
    args: BROWSER_ARGS,
  });
  
  browserReady = true;
  console.log(`✅ 浏览器启动完成 (${Date.now() - startTime}ms)`);
  
  // 监听浏览器关闭
  browser.on('disconnected', () => {
    browserReady = false;
    browser = null;
    console.log('⚠️ 浏览器已断开，将在下次请求时重启');
  });
  
  return browser;
}

// 服务启动时预热浏览器
initBrowser().catch(console.error);

// 生成上下文ID
function generateContextId() {
  return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 创建带指纹防护的上下文
async function createStealthContext(config = {}) {
  const browser = await initBrowser();
  
  // 随机 User-Agent
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ];
  
  const context = await browser.newContext({
    viewport: config.viewport || { width: 1280, height: 720 },
    userAgent: config.userAgent || userAgents[Math.floor(Math.random() * userAgents.length)],
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    // 指纹防护
    deviceScaleFactor: 1,
    hasTouch: false,
    isMobile: false,
    javaScriptEnabled: true,
    // 绕过 WebDriver 检测
    bypassCSP: true,
  });
  
  // 注入反检测脚本
  await context.addInitScript(() => {
    // 隐藏 webdriver
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    
    // 伪造 plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // 伪造 languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['zh-CN', 'zh', 'en'],
    });
    
    // 伪造 platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });
    
    // 隐藏自动化特征
    window.chrome = { runtime: {} };
    
    // 伪造 permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  
  return context;
}

// 爬虫执行API
app.post('/api/scraper/execute', async (req, res) => {
  const { action, context_id, config = {} } = req.body;
  const startTime = Date.now();
  
  console.log(`📥 ${action?.type} ${context_id ? `[${context_id.slice(-8)}]` : ''}`);
  
  try {
    let result;
    
    switch (action?.type) {
      case 'openPage': {
        const contextId = generateContextId();
        const context = await createStealthContext(config);
        const page = await context.newPage();
        
        // 速度优化：拦截不必要的资源（可配置）
        if (config.blockResources !== false) {
          await page.route('**/*', (route) => {
            const resourceType = route.request().resourceType();
            // 阻止字体、媒体等非必要资源
            if (['font', 'media'].includes(resourceType)) {
              route.abort();
            } else {
              route.continue();
            }
          });
        }
        
        // 先用 domcontentloaded 快速加载
        await page.goto(action.url, {
          waitUntil: 'domcontentloaded',
          timeout: config.timeout || 30000,
        });
        
        // 等待动态内容加载（SPA支持）- 使用更可靠的方式
        if (config.waitForSelector) {
          console.log(`   等待选择器: ${config.waitForSelector}`);
          await page.waitForSelector(config.waitForSelector, { 
            timeout: config.waitForSelectorTimeout || 10000,
            state: 'visible'
          }).catch(e => console.log(`   选择器等待超时: ${e.message}`));
        }
        
        // 等待网络相对空闲（最多等待指定时间）
        if (config.waitForNetworkIdle) {
          console.log(`   等待网络稳定...`);
          await page.waitForLoadState('domcontentloaded').catch(() => {});
          // 等待一小段时间让初始请求完成
          await new Promise(r => setTimeout(r, 1000));
        }
        
        // 额外等待时间（用于JS渲染）
        if (config.waitAfterLoad && config.waitAfterLoad > 0) {
          console.log(`   额外等待: ${config.waitAfterLoad}ms`);
          await new Promise(r => setTimeout(r, config.waitAfterLoad));
        }
        
        const title = await page.title();
        const currentUrl = page.url();
        
        // 截图
        const screenshot = await page.screenshot({ 
          type: 'png',
          fullPage: false 
        });
        
        contexts.set(contextId, { context, page, createdAt: Date.now() });
        
        result = {
          success: true,
          context_id: contextId,
          data: {
            title,
            url: currentUrl,
            screenshot: screenshot.toString('base64'),
          }
        };
        break;
      }
      
      case 'closePage': {
        const ctx = contexts.get(context_id);
        if (ctx) {
          await ctx.page.close().catch(() => {});
          await ctx.context.close().catch(() => {});
          contexts.delete(context_id);
        }
        result = { success: true, data: { closed: true } };
        break;
      }
      
      case 'getText': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { selector } = action;
        const { multiple = false, waitForSelector = true, waitTimeout = 5000 } = config;
        
        if (waitForSelector) {
          await ctx.page.waitForSelector(selector, { timeout: waitTimeout }).catch(() => {});
        }
        
        let texts;
        if (multiple) {
          texts = await ctx.page.$$eval(selector, els => els.map(el => el.textContent?.trim() || ''));
        } else {
          const text = await ctx.page.$eval(selector, el => el.textContent?.trim() || '').catch(() => '');
          texts = [text];
        }
        
        result = {
          success: true,
          context_id,
          data: { text: texts[0] || '', texts, count: texts.length }
        };
        break;
      }
      
      case 'getAttribute': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { selector, attribute } = action;
        const { multiple = false, waitForSelector = true, waitTimeout = 5000 } = config;
        
        if (waitForSelector) {
          await ctx.page.waitForSelector(selector, { timeout: waitTimeout }).catch(() => {});
        }
        
        let values;
        if (multiple) {
          values = await ctx.page.$$eval(selector, (els, attr) => 
            els.map(el => el.getAttribute(attr) || ''), attribute);
        } else {
          const value = await ctx.page.$eval(selector, (el, attr) => 
            el.getAttribute(attr) || '', attribute).catch(() => '');
          values = [value];
        }
        
        result = {
          success: true,
          context_id,
          data: { value: values[0] || '', values, count: values.length }
        };
        break;
      }
      
      case 'click': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { selector } = action;
        const { waitForNavigation = false, delay = 0 } = config;
        
        if (delay > 0) await new Promise(r => setTimeout(r, delay));
        
        if (waitForNavigation) {
          await Promise.all([
            ctx.page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
            ctx.page.click(selector),
          ]);
        } else {
          await ctx.page.click(selector);
        }
        
        result = { success: true, context_id, data: { clicked: true } };
        break;
      }
      
      case 'input': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { selector, value } = action;
        const { clearBefore = true, pressEnter = false, delay = 0 } = config;
        
        if (clearBefore) {
          await ctx.page.fill(selector, '');
        }
        await ctx.page.type(selector, value, { delay });
        
        if (pressEnter) {
          await ctx.page.press(selector, 'Enter');
        }
        
        result = { success: true, context_id, data: { typed: true } };
        break;
      }
      
      case 'screenshot': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { mode = { type: 'viewport' } } = action;
        const { format = 'png', quality = 100 } = config;
        
        let screenshotOptions = {
          type: format,
          ...(format === 'jpeg' ? { quality } : {}),
        };
        
        if (mode.type === 'fullPage') {
          screenshotOptions.fullPage = true;
        } else if (mode.type === 'element' && mode.selector) {
          const element = await ctx.page.$(mode.selector);
          if (element) {
            const buffer = await element.screenshot(screenshotOptions);
            result = {
              success: true,
              context_id,
              data: { base64: buffer.toString('base64') }
            };
            break;
          }
        }
        
        const buffer = await ctx.page.screenshot(screenshotOptions);
        result = {
          success: true,
          context_id,
          data: { base64: buffer.toString('base64') }
        };
        break;
      }
      
      case 'executeScript': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { code } = action;
        const scriptResult = await ctx.page.evaluate(code);
        
        result = { success: true, context_id, data: scriptResult };
        break;
      }
      
      case 'scroll': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { mode } = action;
        const { smooth = true, waitAfter = 1000 } = config;
        
        if (mode.type === 'pixels') {
          await ctx.page.evaluate(({ x, y, smooth }) => {
            window.scrollBy({ left: x, top: y, behavior: smooth ? 'smooth' : 'auto' });
          }, { x: mode.x || 0, y: mode.y || 0, smooth });
        } else if (mode.type === 'bottom') {
          await ctx.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        } else if (mode.type === 'top') {
          await ctx.page.evaluate(() => window.scrollTo(0, 0));
        } else if (mode.type === 'element' && mode.selector) {
          await ctx.page.$eval(mode.selector, el => el.scrollIntoView({ behavior: 'smooth' }));
        }
        
        if (waitAfter > 0) await new Promise(r => setTimeout(r, waitAfter));
        
        result = { success: true, context_id, data: { scrolled: true } };
        break;
      }
      
      case 'wait': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { selector, condition = 'visible' } = action;
        const { timeout = 30000 } = config;
        
        let found = false;
        try {
          const stateMap = { visible: 'visible', hidden: 'hidden', attached: 'attached', detached: 'detached' };
          await ctx.page.waitForSelector(selector, { state: stateMap[condition] || 'visible', timeout });
          found = true;
        } catch (e) {
          found = false;
        }
        
        result = { success: true, context_id, data: { found } };
        break;
      }
      
      // 获取链接列表（标题+URL）
      case 'getLinks': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { selector } = action;
        const { 
          waitForSelector = true, 
          waitTimeout = 5000,
          limit = 50,
          includeText = true,
          baseUrl = ''
        } = config;
        
        if (waitForSelector && selector) {
          await ctx.page.waitForSelector(selector, { timeout: waitTimeout }).catch(() => {});
        }
        
        const links = await ctx.page.evaluate(({ selector, limit, includeText, baseUrl }) => {
          const elements = selector 
            ? document.querySelectorAll(selector)
            : document.querySelectorAll('a[href]');
          
          const results = [];
          const seenUrls = new Set();
          
          for (const el of elements) {
            if (results.length >= limit) break;
            
            let href = el.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
            
            // 处理相对URL
            try {
              const url = new URL(href, baseUrl || window.location.href);
              href = url.href;
            } catch (e) {
              continue;
            }
            
            // 去重
            if (seenUrls.has(href)) continue;
            seenUrls.add(href);
            
            const text = includeText ? (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200) : '';
            
            results.push({
              url: href,
              text: text,
              title: el.getAttribute('title') || '',
            });
          }
          
          return results;
        }, { selector, limit, includeText, baseUrl: ctx.page.url() });
        
        result = {
          success: true,
          context_id,
          data: { links, count: links.length }
        };
        break;
      }
      
      // 深度爬取 - 批量访问链接并抓取内容（复用当前浏览器上下文）
      case 'deepScrape': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { links } = action; // [{url, text}]
        const { 
          contentSelector = 'article, .content, .article, main, #content, .post-content, .entry-content, body',
          maxConcurrent = 3,
          timeout = 15000,
          maxContentLength = 5000,
          includeMetadata = true,
          reuseContext = true  // 是否复用当前上下文
        } = config;
        
        if (!links || !Array.isArray(links)) {
          throw new Error('links array is required');
        }
        
        const results = [];
        
        // 分批处理，控制并发
        for (let i = 0; i < links.length; i += maxConcurrent) {
          const batch = links.slice(i, i + maxConcurrent);
          
          const batchResults = await Promise.all(batch.map(async (link, idx) => {
            // 复用当前上下文，在同一个 context 中打开新页面
            // 这样可以共享 cookies、localStorage 等状态
            let page;
            let itemContext;
            
            if (reuseContext) {
              // 在当前上下文中创建新页面（共享 session）
              page = await ctx.context.newPage();
            } else {
              // 创建独立上下文
              itemContext = await createStealthContext();
              page = await itemContext.newPage();
            }
            
            try {
              // 速度优化：拦截不必要的资源
              await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['font', 'media', 'image'].includes(resourceType)) {
                  route.abort();
                } else {
                  route.continue();
                }
              });
              
              await page.goto(link.url, {
                waitUntil: 'domcontentloaded',
                timeout,
              });
              
              // 获取页面内容
              const pageData = await page.evaluate(({ contentSelector, maxContentLength, includeMetadata }) => {
                // 尝试多个选择器找到主要内容
                const selectors = contentSelector.split(',').map(s => s.trim());
                let content = '';
                let contentElement = null;
                
                for (const sel of selectors) {
                  try {
                    contentElement = document.querySelector(sel);
                    if (contentElement) {
                      content = contentElement.innerText || contentElement.textContent || '';
                      content = content.trim().replace(/\s+/g, ' ');
                      if (content.length > 100) break; // 找到有效内容
                    }
                  } catch (e) {}
                }
                
                // 如果没找到，用body
                if (!content || content.length < 100) {
                  content = document.body?.innerText || '';
                  content = content.trim().replace(/\s+/g, ' ');
                }
                
                // 截断过长内容
                if (content.length > maxContentLength) {
                  content = content.slice(0, maxContentLength) + '...';
                }
                
                const result = {
                  content,
                  contentLength: content.length,
                };
                
                if (includeMetadata) {
                  result.title = document.title || '';
                  result.description = document.querySelector('meta[name="description"]')?.content || '';
                  result.keywords = document.querySelector('meta[name="keywords"]')?.content || '';
                  result.author = document.querySelector('meta[name="author"]')?.content || '';
                  result.publishTime = document.querySelector('meta[property="article:published_time"]')?.content 
                    || document.querySelector('time')?.getAttribute('datetime') || '';
                }
                
                return result;
              }, { contentSelector, maxContentLength, includeMetadata });
              
              return {
                success: true,
                url: link.url,
                linkText: link.text,
                ...pageData,
              };
              
            } catch (error) {
              return {
                success: false,
                url: link.url,
                linkText: link.text,
                error: error.message,
                content: '',
              };
            } finally {
              // 关闭页面
              await page.close().catch(() => {});
              // 只有使用独立上下文时才关闭上下文
              if (itemContext) {
                await itemContext.close().catch(() => {});
              }
            }
          }));
          
          results.push(...batchResults);
          
          // 进度日志
          console.log(`   深度爬取进度: ${Math.min(i + maxConcurrent, links.length)}/${links.length}`);
        }
        
        const successCount = results.filter(r => r.success).length;
        
        result = {
          success: true,
          context_id,
          data: {
            results,
            total: links.length,
            success: successCount,
            failed: links.length - successCount,
          }
        };
        break;
      }
      
      // 一键深度爬取 - 从当前页面获取链接并批量抓取内容（复用当前上下文）
      case 'autoDeepScrape': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const { 
          linkSelector = 'a[href]',
          contentSelector = 'article, .content, .article, main, #content, body',
          maxLinks = 10,
          maxConcurrent = 3,
          timeout = 15000,
          reuseContext = true,  // 是否复用当前上下文
          maxContentLength = 5000,
          filterPattern = '',  // 正则过滤URL
        } = config;
        
        // 第一步：获取链接
        await ctx.page.waitForSelector(linkSelector, { timeout: 5000 }).catch(() => {});
        
        let links = await ctx.page.evaluate(({ linkSelector, maxLinks, filterPattern }) => {
          const elements = document.querySelectorAll(linkSelector);
          const results = [];
          const seenUrls = new Set();
          const filterRegex = filterPattern ? new RegExp(filterPattern) : null;
          
          for (const el of elements) {
            if (results.length >= maxLinks) break;
            
            let href = el.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) continue;
            
            try {
              const url = new URL(href, window.location.href);
              href = url.href;
            } catch (e) {
              continue;
            }
            
            // URL过滤
            if (filterRegex && !filterRegex.test(href)) continue;
            
            if (seenUrls.has(href)) continue;
            seenUrls.add(href);
            
            const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200);
            if (!text) continue;
            
            results.push({ url: href, text });
          }
          
          return results;
        }, { linkSelector, maxLinks, filterPattern });
        
        console.log(`   找到 ${links.length} 个链接，开始深度爬取...`);
        
        // 第二步：批量爬取内容（复用当前上下文）
        const results = [];
        
        for (let i = 0; i < links.length; i += maxConcurrent) {
          const batch = links.slice(i, i + maxConcurrent);
          
          const batchResults = await Promise.all(batch.map(async (link) => {
            // 复用当前上下文或创建独立上下文
            let page;
            let itemContext;
            
            if (reuseContext) {
              // 在当前上下文中创建新页面（共享 session）
              page = await ctx.context.newPage();
            } else {
              // 创建独立上下文
              itemContext = await createStealthContext();
              page = await itemContext.newPage();
            }
            
            try {
              await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['font', 'media', 'image'].includes(resourceType)) {
                  route.abort();
                } else {
                  route.continue();
                }
              });
              
              await page.goto(link.url, {
                waitUntil: 'domcontentloaded',
                timeout,
              });
              
              const pageData = await page.evaluate(({ contentSelector, maxContentLength }) => {
                const selectors = contentSelector.split(',').map(s => s.trim());
                let content = '';
                
                for (const sel of selectors) {
                  try {
                    const el = document.querySelector(sel);
                    if (el) {
                      content = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
                      if (content.length > 100) break;
                    }
                  } catch (e) {}
                }
                
                if (!content || content.length < 100) {
                  content = (document.body?.innerText || '').trim().replace(/\s+/g, ' ');
                }
                
                if (content.length > maxContentLength) {
                  content = content.slice(0, maxContentLength) + '...';
                }
                
                return {
                  content,
                  title: document.title || '',
                  description: document.querySelector('meta[name="description"]')?.content || '',
                };
              }, { contentSelector, maxContentLength });
              
              return {
                success: true,
                url: link.url,
                linkText: link.text,
                ...pageData,
              };
              
            } catch (error) {
              return {
                success: false,
                url: link.url,
                linkText: link.text,
                error: error.message,
                content: '',
              };
            } finally {
              // 关闭页面
              await page.close().catch(() => {});
              // 只有使用独立上下文时才关闭上下文
              if (itemContext) {
                await itemContext.close().catch(() => {});
              }
            }
          }));
          
          results.push(...batchResults);
          console.log(`   深度爬取进度: ${Math.min(i + maxConcurrent, links.length)}/${links.length}`);
        }
        
        result = {
          success: true,
          context_id,
          data: {
            results,
            total: links.length,
            success: results.filter(r => r.success).length,
          }
        };
        break;
      }
      
      // 获取页面元素列表（用于可视化选择器）
      case 'getElements': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const elements = await ctx.page.evaluate(() => {
          const results = [];
          const seen = new Set();
          
          function generateSelector(el) {
            if (el.id) return '#' + CSS.escape(el.id);
            
            if (el.className && typeof el.className === 'string') {
              const classes = el.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && c.length < 50);
              if (classes.length > 0) {
                const selector = '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
                try {
                  const matches = document.querySelectorAll(selector);
                  if (matches.length <= 20) return selector;
                } catch(e) {}
              }
            }
            
            for (const attr of el.attributes) {
              if (attr.name.startsWith('data-') && attr.value && attr.value.length < 50) {
                try {
                  const selector = `[${attr.name}="${CSS.escape(attr.value)}"]`;
                  const matches = document.querySelectorAll(selector);
                  if (matches.length <= 10) return selector;
                } catch(e) {}
              }
            }
            
            const parent = el.parentElement;
            if (parent) {
              const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
              const index = siblings.indexOf(el) + 1;
              if (siblings.length > 1) {
                return el.tagName.toLowerCase() + ':nth-of-type(' + index + ')';
              }
            }
            
            return el.tagName.toLowerCase();
          }
          
          const selectors = [
            'a', 'button', 'input', 'h1', 'h2', 'h3', 'h4', 'p', 'span', 'li', 'td',
            '[class*="title"]', '[class*="item"]', '[class*="content"]', '[class*="name"]',
            '[class*="hot"]', '[class*="rank"]', '[class*="list"]'
          ];
          
          selectors.forEach(sel => {
            try {
              document.querySelectorAll(sel).forEach(el => {
                const rect = el.getBoundingClientRect();
                if (rect.width < 10 || rect.height < 10) return;
                if (rect.top > window.innerHeight * 5) return;
                
                const selector = generateSelector(el);
                if (seen.has(selector)) return;
                seen.add(selector);
                
                const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 100);
                if (!text) return;
                
                let matchCount = 1;
                try { matchCount = document.querySelectorAll(selector).length; } catch(e) {}
                
                results.push({
                  selector,
                  tagName: el.tagName.toLowerCase(),
                  text,
                  matchCount,
                  rect: {
                    x: Math.round(rect.left + window.scrollX),
                    y: Math.round(rect.top + window.scrollY),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height)
                  }
                });
              });
            } catch (e) {}
          });
          
          results.sort((a, b) => (a.rect?.y || 0) - (b.rect?.y || 0));
          return results.slice(0, 200);
        });
        
        result = { success: true, context_id, data: elements };
        break;
      }
      
      // 获取页面链接元素列表（用于可视化链接选择器）
      case 'getLinkElements': {
        const ctx = contexts.get(context_id);
        if (!ctx) throw new Error('Browser context not found');
        
        const linkElements = await ctx.page.evaluate(() => {
          const results = [];
          const seenUrls = new Map(); // url -> selector
          
          // 生成链接选择器
          function generateLinkSelector(el) {
            // 优先使用父元素的类名 + a
            const parent = el.parentElement;
            if (parent && parent.className && typeof parent.className === 'string') {
              const classes = parent.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && c.length < 50);
              if (classes.length > 0) {
                const selector = '.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.') + ' a';
                try {
                  const matches = document.querySelectorAll(selector);
                  if (matches.length >= 2 && matches.length <= 50) return selector;
                } catch(e) {}
              }
            }
            
            // 使用链接自身的类名
            if (el.className && typeof el.className === 'string') {
              const classes = el.className.trim().split(/\s+/).filter(c => c && !c.includes(':') && c.length < 50);
              if (classes.length > 0) {
                const selector = 'a.' + classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
                try {
                  const matches = document.querySelectorAll(selector);
                  if (matches.length >= 2 && matches.length <= 50) return selector;
                } catch(e) {}
              }
            }
            
            // 使用href属性模式
            const href = el.getAttribute('href') || '';
            if (href) {
              // 提取URL路径模式
              try {
                const url = new URL(href, window.location.href);
                const pathParts = url.pathname.split('/').filter(p => p);
                if (pathParts.length >= 2) {
                  const pattern = '/' + pathParts[0] + '/';
                  const selector = `a[href*="${pattern}"]`;
                  try {
                    const matches = document.querySelectorAll(selector);
                    if (matches.length >= 2 && matches.length <= 50) return selector;
                  } catch(e) {}
                }
              } catch(e) {}
            }
            
            // 默认返回通用选择器
            return 'a[href]';
          }
          
          // 遍历所有链接
          document.querySelectorAll('a[href]').forEach(el => {
            const href = el.getAttribute('href') || '';
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
            
            const rect = el.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) return;
            if (rect.top > window.innerHeight * 5) return;
            
            // 获取完整URL
            let fullUrl = href;
            try {
              fullUrl = new URL(href, window.location.href).href;
            } catch(e) {}
            
            const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 200);
            if (!text) return;
            
            const selector = generateLinkSelector(el);
            
            // 计算匹配数量
            let matchCount = 1;
            try { matchCount = document.querySelectorAll(selector).length; } catch(e) {}
            
            results.push({
              selector,
              text,
              url: fullUrl,
              matchCount,
              rect: {
                x: Math.round(rect.left + window.scrollX),
                y: Math.round(rect.top + window.scrollY),
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              }
            });
          });
          
          // 按位置排序
          results.sort((a, b) => (a.rect?.y || 0) - (b.rect?.y || 0));
          return results.slice(0, 200);
        });
        
        result = { success: true, context_id, data: linkElements };
        break;
      }
      
      default:
        throw new Error(`Unknown action type: ${action?.type}`);
    }
    
    console.log(`✅ ${action?.type} 完成 (${Date.now() - startTime}ms)`);
    res.json(result);
    
  } catch (error) {
    console.error(`❌ ${action?.type} 失败:`, error.message);
    res.json({
      success: false,
      context_id,
      error: error.message,
      data: null
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    browserReady,
    contexts: contexts.size,
    uptime: process.uptime()
  });
});

// 清理所有上下文
app.post('/api/scraper/cleanup', async (req, res) => {
  for (const [id, ctx] of contexts) {
    try {
      await ctx.page.close();
      await ctx.context.close();
    } catch (e) {}
  }
  contexts.clear();
  res.json({ success: true, message: 'All contexts cleaned up' });
});

// 定期清理过期上下文（5分钟）
setInterval(() => {
  const now = Date.now();
  for (const [id, ctx] of contexts) {
    if (now - ctx.createdAt > 5 * 60 * 1000) {
      ctx.page.close().catch(() => {});
      ctx.context.close().catch(() => {});
      contexts.delete(id);
      console.log(`🧹 清理过期上下文: ${id.slice(-8)}`);
    }
  }
}, 60 * 1000);

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 爬虫服务运行在 http://localhost:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/health`);
  console.log(`   特性: 浏览器复用 | 指纹防护 | 速度优化`);
});

// 优雅关闭
process.on('SIGINT', async () => {
  console.log('\n正在关闭...');
  for (const [id, ctx] of contexts) {
    try {
      await ctx.page.close();
      await ctx.context.close();
    } catch (e) {}
  }
  if (browser) await browser.close();
  process.exit(0);
});
