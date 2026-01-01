// src/constants/scraperNodeTemplates.ts
// 爬虫节点模板定义

import { NodeTemplate } from '../types/workflow';

// 爬虫节点的通用颜色
const SCRAPER_COLOR = '#06b6d4';

export const scraperNodeTemplates: NodeTemplate[] = [
  // ==================== Phase 1 - 基础节点 ====================
  
  // 打开网页
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'OpenPage' } as any,
    label: '打开网页',
    description: '打开指定 URL，支持深度爬取',
    icon: 'Globe',
    color: SCRAPER_COLOR,
    defaultConfig: {
      url: '',
      waitForLoad: true,
      timeout: 30000,
      headless: true,
      userAgent: '',
      viewport: { width: 1280, height: 720 },
      // 深度爬取配置
      enableDeepScrape: false,
      deepScrape: {
        linkSelector: 'a[href]',
        contentSelector: 'article, .content, .article, main, #content, body',
        maxLinks: 10,
        filterPattern: '',
      },
    },
    inputs: [
      { id: 'url', name: 'URL', data_type: 'String', dataType: 'String', required: false, multiple: false, description: '要打开的网页地址' }
    ],
    outputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false, description: '用于后续爬虫操作的浏览器上下文' },
      { id: 'title', name: '页面标题', data_type: 'String', dataType: 'String', required: true, multiple: false },
      { id: 'url', name: '当前URL', data_type: 'String', dataType: 'String', required: true, multiple: false },
      { id: 'deepScrapeResults', name: '深度爬取结果', data_type: 'Array', dataType: { type: 'Array', itemType: { type: 'Object' } }, required: false, multiple: false, description: '启用深度爬取时返回的文章列表' },
    ],
  },
  
  // 获取文本
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'GetText' } as any,
    label: '获取文本',
    description: '从元素中提取文本内容',
    icon: 'Type',
    color: SCRAPER_COLOR,
    defaultConfig: {
      selector: '',
      findBy: 'cssSelector',
      multiple: false,
      waitForSelector: true,
      waitTimeout: 5000,
      includeHtml: false,
      useTextContent: true,
      regex: '',
      prefixText: '',
      suffixText: '',
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '选择器', data_type: 'String', dataType: 'String', required: false, multiple: false, description: 'CSS选择器或XPath' },
    ],
    outputs: [
      { id: 'text', name: '提取文本', data_type: 'String', dataType: 'String', required: true, multiple: false },
      { id: 'texts', name: '文本列表', data_type: 'Array', dataType: { type: 'Array', itemType: 'String' }, required: true, multiple: false },
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },
  
  // 获取属性
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'GetAttribute' } as any,
    label: '获取属性',
    description: '提取元素的属性值 (href, src 等)',
    icon: 'Brackets',
    color: SCRAPER_COLOR,
    defaultConfig: {
      selector: '',
      findBy: 'cssSelector',
      attributeName: 'href',
      multiple: false,
      waitForSelector: true,
      waitTimeout: 5000,
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '选择器', data_type: 'String', dataType: 'String', required: false, multiple: false },
    ],
    outputs: [
      { id: 'value', name: '属性值', data_type: 'String', dataType: 'String', required: true, multiple: false },
      { id: 'values', name: '属性值列表', data_type: 'Array', dataType: { type: 'Array', itemType: 'String' }, required: true, multiple: false },
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },

  // ==================== Phase 2 - 交互节点 ====================
  
  // 点击元素
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'Click' } as any,
    label: '点击元素',
    description: '模拟点击操作',
    icon: 'MousePointer',
    color: SCRAPER_COLOR,
    defaultConfig: {
      selector: '',
      findBy: 'cssSelector',
      waitForSelector: true,
      waitTimeout: 5000,
      waitForNavigation: false,
      delay: 0,
      clickCount: 1,
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '选择器', data_type: 'String', dataType: 'String', required: false, multiple: false },
    ],
    outputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },
  
  // 输入文本
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'Input' } as any,
    label: '输入文本',
    description: '在输入框中填写文本',
    icon: 'FormInput',
    color: SCRAPER_COLOR,
    defaultConfig: {
      selector: '',
      findBy: 'cssSelector',
      value: '',
      clearBefore: true,
      delay: 0,
      pressEnter: false,
      waitForSelector: true,
      waitTimeout: 5000,
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '选择器', data_type: 'String', dataType: 'String', required: false, multiple: false },
      { id: 'value', name: '输入值', data_type: 'String', dataType: 'String', required: false, multiple: false },
    ],
    outputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },
  
  // 滚动页面
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'Scroll' } as any,
    label: '滚动页面',
    description: '滚动页面加载更多内容',
    icon: 'ArrowDownUp',
    color: SCRAPER_COLOR,
    defaultConfig: {
      mode: 'pixels',
      scrollY: 500,
      scrollX: 0,
      smooth: true,
      waitAfter: 1000,
      selector: '',
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
    outputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },
  
  // 等待元素
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'Wait' } as any,
    label: '等待元素',
    description: '等待元素出现或消失',
    icon: 'Clock',
    color: SCRAPER_COLOR,
    defaultConfig: {
      selector: '',
      findBy: 'cssSelector',
      condition: 'visible',
      timeout: 30000,
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '选择器', data_type: 'String', dataType: 'String', required: false, multiple: false },
    ],
    outputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'found', name: '是否找到', data_type: 'Boolean', dataType: 'Boolean', required: true, multiple: false },
    ],
  },

  // ==================== Phase 3 - 高级节点 ====================
  
  // 循环元素
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'LoopElements' } as any,
    label: '循环元素',
    description: '遍历匹配的元素列表',
    icon: 'Repeat',
    color: SCRAPER_COLOR,
    defaultConfig: {
      selector: '',
      findBy: 'cssSelector',
      maxIterations: 100,
      delayBetween: 0,
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '选择器', data_type: 'String', dataType: 'String', required: false, multiple: false },
    ],
    outputs: [
      { id: 'element', name: '当前元素', data_type: 'Any', dataType: 'HTMLElement', required: true, multiple: false },
      { id: 'index', name: '索引', data_type: 'Number', dataType: 'Number', required: true, multiple: false },
      { id: 'total', name: '总数', data_type: 'Number', dataType: 'Number', required: true, multiple: false },
      { id: 'results', name: '聚合结果', data_type: 'Array', dataType: { type: 'Array', itemType: 'Any' }, required: true, multiple: false },
    ],
  },
  
  // 执行脚本
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'ExecuteScript' } as any,
    label: '执行脚本',
    description: '在页面中执行自定义 JavaScript',
    icon: 'Code',
    color: SCRAPER_COLOR,
    defaultConfig: {
      code: '// 返回值将作为输出\nreturn document.title;',
      timeout: 30000,
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'args', name: '参数', data_type: 'Any', dataType: 'Any', required: false, multiple: false },
    ],
    outputs: [
      { id: 'result', name: '执行结果', data_type: 'Any', dataType: 'Any', required: true, multiple: false },
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },
  
  // 截图
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'Screenshot' } as any,
    label: '截图',
    description: '保存页面截图',
    icon: 'Camera',
    color: SCRAPER_COLOR,
    defaultConfig: {
      mode: 'viewport',
      format: 'png',
      quality: 100,
      selector: '',
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '元素选择器', data_type: 'String', dataType: 'String', required: false, multiple: false },
    ],
    outputs: [
      { id: 'image', name: '图片数据', data_type: 'String', dataType: 'String', required: true, multiple: false, description: 'Base64编码的图片' },
      { id: 'width', name: '宽度', data_type: 'Number', dataType: 'Number', required: true, multiple: false },
      { id: 'height', name: '高度', data_type: 'Number', dataType: 'Number', required: true, multiple: false },
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },
  
  // 关闭页面
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'ClosePage' } as any,
    label: '关闭页面',
    description: '关闭浏览器页面，释放资源',
    icon: 'X',
    color: SCRAPER_COLOR,
    defaultConfig: {
      closeType: 'tab',
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
    outputs: [],
  },
  
  // ==================== Phase 4 - 深度爬取节点 ====================
  
  // 获取链接列表
  {
    type: 'scraper',
    nodeType: { type: 'Action', action_type: 'Scraper' as any, scraper_type: 'GetLinks' } as any,
    label: '获取链接',
    description: '提取页面上的所有链接（标题+URL）',
    icon: 'Link',
    color: SCRAPER_COLOR,
    defaultConfig: {
      selector: 'a[href]',
      limit: 50,
      includeText: true,
      waitForSelector: true,
      waitTimeout: 5000,
    },
    inputs: [
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
      { id: 'selector', name: '链接选择器', data_type: 'String', dataType: 'String', required: false, multiple: false, description: '用于筛选链接的CSS选择器' },
    ],
    outputs: [
      { id: 'links', name: '链接列表', data_type: 'Array', dataType: { type: 'Array', itemType: { type: 'Object' } }, required: true, multiple: false, description: '包含url和text的对象数组' },
      { id: 'count', name: '链接数量', data_type: 'Number', dataType: 'Number', required: true, multiple: false },
      { id: 'context', name: '浏览器上下文', data_type: 'Any', dataType: 'BrowserContext', required: true, multiple: false },
    ],
  },
];

// 导出爬虫节点分类
export const scraperNodeCategory = {
  id: 'scraper',
  name: '网页爬虫',
  icon: 'Bug',
  nodes: scraperNodeTemplates,
};

export default scraperNodeTemplates;
