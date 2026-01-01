// src/components/NodeConfigPanel/ScraperNodeConfig.tsx
// 爬虫节点配置组件

import React, { useState, useMemo } from 'react';
import { WorkflowNode } from '../../types/workflow';
import { Icon } from '../Icon';
import { SelectorConfig, WaitOptions } from './SelectorConfig';
import { ScraperTemplateSelector } from '../ScraperTemplateSelector';
import { ScraperTemplate } from '../../constants/scraperTemplates';
import { useWorkflowStore } from '../../stores/workflowStore';
import { LinkPicker } from '../LinkPicker';

interface ScraperNodeConfigProps {
  node: WorkflowNode;
  onConfigChange: (key: string, value: any) => void;
}

// 辅助函数：从工作流中获取上游 OpenPage 节点的 URL
const useUpstreamPageUrl = (nodeId: string): string | undefined => {
  const workflow = useWorkflowStore(state => state.workflow);
  
  return useMemo(() => {
    if (!workflow) return undefined;
    
    // 找到所有指向当前节点的边
    const findUpstreamOpenPageUrl = (currentNodeId: string, visited: Set<string> = new Set()): string | undefined => {
      if (visited.has(currentNodeId)) return undefined;
      visited.add(currentNodeId);
      
      // 找到当前节点
      const currentNode = workflow.nodes.find(n => n.id === currentNodeId);
      if (!currentNode) return undefined;
      
      // 如果当前节点是 OpenPage，返回其 URL
      const scraperType = (currentNode.nodeType as any)?.scraper_type;
      if (scraperType === 'OpenPage' && currentNode.data.config?.url) {
        return currentNode.data.config.url;
      }
      
      // 否则继续向上游查找
      const incomingEdges = workflow.edges.filter(e => e.target === currentNodeId);
      for (const edge of incomingEdges) {
        const url = findUpstreamOpenPageUrl(edge.source, visited);
        if (url) return url;
      }
      
      return undefined;
    };
    
    return findUpstreamOpenPageUrl(nodeId);
  }, [workflow, nodeId]);
};

export const ScraperNodeConfig: React.FC<ScraperNodeConfigProps> = ({
  node,
  onConfigChange,
}) => {
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const config = node.data.config;
  const scraperType = (node.nodeType as any).scraper_type;
  
  // 获取上游 OpenPage 节点的 URL
  const upstreamPageUrl = useUpstreamPageUrl(node.id);

  // 应用模板
  const handleApplyTemplate = (template: ScraperTemplate) => {
    // 根据节点类型应用相应的配置
    if (scraperType === 'OpenPage') {
      onConfigChange('url', template.url);
    } else if (scraperType === 'GetText') {
      onConfigChange('selector', template.selectors.title);
      onConfigChange('multiple', true);
    }
  };

  // 打开网页配置
  if (scraperType === 'OpenPage') {
    return (
      <>
        <OpenPageConfig 
          config={config} 
          onConfigChange={onConfigChange}
          onShowTemplates={() => setShowTemplateSelector(true)}
        />
        {showTemplateSelector && (
          <ScraperTemplateSelector
            onSelectTemplate={handleApplyTemplate}
            onClose={() => setShowTemplateSelector(false)}
          />
        )}
      </>
    );
  }

  // 获取文本配置
  if (scraperType === 'GetText') {
    return (
      <>
        <GetTextConfig 
          config={config} 
          onConfigChange={onConfigChange}
          onShowTemplates={() => setShowTemplateSelector(true)}
          pageUrl={upstreamPageUrl}
        />
        {showTemplateSelector && (
          <ScraperTemplateSelector
            onSelectTemplate={handleApplyTemplate}
            onClose={() => setShowTemplateSelector(false)}
          />
        )}
      </>
    );
  }

  // 获取属性配置
  if (scraperType === 'GetAttribute') {
    return <GetAttributeConfig config={config} onConfigChange={onConfigChange} pageUrl={upstreamPageUrl} />;
  }

  // 点击元素配置
  if (scraperType === 'Click') {
    return <ClickConfig config={config} onConfigChange={onConfigChange} pageUrl={upstreamPageUrl} />;
  }

  // 输入文本配置
  if (scraperType === 'Input') {
    return <InputConfig config={config} onConfigChange={onConfigChange} pageUrl={upstreamPageUrl} />;
  }

  // 滚动页面配置
  if (scraperType === 'Scroll') {
    return <ScrollConfig config={config} onConfigChange={onConfigChange} pageUrl={upstreamPageUrl} />;
  }

  // 等待元素配置
  if (scraperType === 'Wait') {
    return <WaitConfig config={config} onConfigChange={onConfigChange} pageUrl={upstreamPageUrl} />;
  }

  // 循环元素配置
  if (scraperType === 'LoopElements') {
    return <LoopElementsConfig config={config} onConfigChange={onConfigChange} pageUrl={upstreamPageUrl} />;
  }

  // 执行脚本配置
  if (scraperType === 'ExecuteScript') {
    return <ExecuteScriptConfig config={config} onConfigChange={onConfigChange} />;
  }

  // 截图配置
  if (scraperType === 'Screenshot') {
    return <ScreenshotConfig config={config} onConfigChange={onConfigChange} pageUrl={upstreamPageUrl} />;
  }

  // 关闭页面配置
  if (scraperType === 'ClosePage') {
    return <ClosePageConfig config={config} onConfigChange={onConfigChange} />;
  }

  return null;
};

// 打开网页配置
const OpenPageConfig: React.FC<{ 
  config: any; 
  onConfigChange: (key: string, value: any) => void;
  onShowTemplates: () => void;
}> = ({
  config,
  onConfigChange,
  onShowTemplates,
}) => {
  const [isSelectingLinks, setIsSelectingLinks] = useState(false);
  const [previewLinks, setPreviewLinks] = useState<Array<{text: string, url: string}>>([]);
  const [isLoadingLinks, setIsLoadingLinks] = useState(false);
  const [showLinkPicker, setShowLinkPicker] = useState(false);

  // 处理链接选择器结果
  const handleLinkSelect = (selector: string, links: Array<{text: string, url: string}>) => {
    onConfigChange('deepScrape', { 
      ...config.deepScrape, 
      linkSelector: selector 
    });
    setPreviewLinks(links);
    setIsSelectingLinks(true);
  };

  // 获取页面链接预览
  const handleSelectLinks = async () => {
    if (!config.url) {
      alert('请先输入目标URL');
      return;
    }
    
    setIsLoadingLinks(true);
    try {
      // 调用后端获取链接列表
      const response = await fetch('http://localhost:3001/api/scraper/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { type: 'openPage', url: config.url },
          config: { timeout: 30000, waitForLoad: true }
        })
      });
      const openResult = await response.json();
      
      if (openResult.success) {
        // 获取链接
        const linksResponse = await fetch('http://localhost:3001/api/scraper/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: { type: 'getLinks', selector: config.deepScrape?.linkSelector || 'a[href]' },
            context_id: openResult.context_id,
            config: { limit: 50, includeText: true }
          })
        });
        const linksResult = await linksResponse.json();
        
        if (linksResult.success && linksResult.data?.links) {
          setPreviewLinks(linksResult.data.links.slice(0, 20));
          setIsSelectingLinks(true);
        }
        
        // 关闭页面
        await fetch('http://localhost:3001/api/scraper/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: { type: 'closePage' },
            context_id: openResult.context_id
          })
        });
      }
    } catch (error) {
      console.error('获取链接失败:', error);
      alert('获取链接失败，请确保爬虫服务已启动');
    } finally {
      setIsLoadingLinks(false);
    }
  };

  return (
    <>
      {/* 模板快捷按钮 */}
      <div className="mb-4 p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
            <Icon name="Sparkles" size={20} className="text-cyan-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-gray-900 mb-1">
              快速开始
            </h4>
            <p className="text-xs text-gray-600 mb-2">
              使用预设模板，一键配置常见网站的爬虫
            </p>
            <button
              onClick={onShowTemplates}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1"
            >
              <Icon name="Layout" size={14} />
              选择模板
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">目标 URL</label>
        <input
          type="text"
          value={config.url || ''}
          onChange={(e) => onConfigChange('url', e.target.value)}
          placeholder="https://example.com"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
      </div>

      {/* 深度爬取开关 */}
      <div className="mb-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enableDeepScrape || false}
            onChange={(e) => onConfigChange('enableDeepScrape', e.target.checked)}
            className="rounded border-gray-300 text-purple-500 focus:ring-purple-500"
          />
          <Icon name="Layers" size={16} className="text-purple-500" />
          启用深度爬取
        </label>
        <p className="text-xs text-gray-500 mt-1 ml-6">
          自动抓取页面上的链接，并获取每个链接背后的文章内容
        </p>
      </div>

      {/* 深度爬取配置 */}
      {config.enableDeepScrape && (
        <div className="mb-4 p-3 bg-white border border-purple-200 rounded-lg space-y-3">
          <h4 className="text-sm font-semibold text-purple-700 flex items-center gap-2">
            <Icon name="Settings" size={14} />
            深度爬取设置
          </h4>
          
          {/* 可视化链接选择按钮 */}
          {config.url && (
            <button
              type="button"
              onClick={() => setShowLinkPicker(true)}
              className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Icon name="MousePointer" size={18} />
              <span className="font-medium">点击选择页面链接</span>
              <span className="text-xs opacity-80 ml-1">(推荐)</span>
            </button>
          )}
          
          {/* 链接选择器 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">链接选择器</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={config.deepScrape?.linkSelector || 'a[href]'}
                onChange={(e) => onConfigChange('deepScrape', { 
                  ...config.deepScrape, 
                  linkSelector: e.target.value 
                })}
                placeholder="a[href]"
                className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <button
                onClick={handleSelectLinks}
                disabled={isLoadingLinks || !config.url}
                className="px-2 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-xs rounded flex items-center gap-1 transition-colors"
              >
                {isLoadingLinks ? (
                  <Icon name="Loader2" size={12} className="animate-spin" />
                ) : (
                  <Icon name="Eye" size={12} />
                )}
                预览
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              例如: a[href*="article"], .news-item a
            </p>
          </div>

          {/* 链接预览 */}
          {isSelectingLinks && previewLinks.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-2 py-1.5 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">
                  找到 {previewLinks.length} 个链接
                </span>
                <button
                  onClick={() => setIsSelectingLinks(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {previewLinks.map((link, idx) => (
                  <div 
                    key={idx} 
                    className="px-2 py-1.5 border-b border-gray-100 last:border-0 hover:bg-gray-50"
                  >
                    <div className="text-xs text-gray-700 truncate flex items-center gap-1">
                      <Icon name="Link" size={10} className="text-purple-400 flex-shrink-0" />
                      {link.text || '(无标题)'}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{link.url}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 最大链接数 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">最大抓取数量</label>
            <input
              type="number"
              value={config.deepScrape?.maxLinks || 10}
              onChange={(e) => onConfigChange('deepScrape', { 
                ...config.deepScrape, 
                maxLinks: parseInt(e.target.value) 
              })}
              min={1}
              max={50}
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* 内容选择器 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">文章内容选择器</label>
            <input
              type="text"
              value={config.deepScrape?.contentSelector || 'article, .content, .article, main'}
              onChange={(e) => onConfigChange('deepScrape', { 
                ...config.deepScrape, 
                contentSelector: e.target.value 
              })}
              placeholder="article, .content"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              用于提取文章正文的选择器，多个用逗号分隔
            </p>
          </div>

          {/* URL过滤 */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">URL过滤 (可选)</label>
            <input
              type="text"
              value={config.deepScrape?.filterPattern || ''}
              onChange={(e) => onConfigChange('deepScrape', { 
                ...config.deepScrape, 
                filterPattern: e.target.value 
              })}
              placeholder="例如: /article/|/news/"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs font-mono focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              正则表达式，只爬取匹配的URL
            </p>
          </div>
        </div>
      )}

      {/* LinkPicker 弹窗 */}
      {showLinkPicker && config.url && (
        <LinkPicker
          url={config.url}
          onSelectLink={handleLinkSelect}
          onClose={() => setShowLinkPicker(false)}
        />
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">超时时间 (毫秒)</label>
        <input
          type="number"
          value={config.timeout || 30000}
          onChange={(e) => onConfigChange('timeout', parseInt(e.target.value))}
          min={1000}
          max={120000}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={config.waitForLoad !== false}
            onChange={(e) => onConfigChange('waitForLoad', e.target.checked)}
            className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
          />
          等待页面加载完成
        </label>
      </div>

      <div className="mb-4">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={config.headless !== false}
            onChange={(e) => onConfigChange('headless', e.target.checked)}
            className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
          />
          无头模式 (后台运行)
        </label>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">User Agent (可选)</label>
        <input
          type="text"
          value={config.userAgent || ''}
          onChange={(e) => onConfigChange('userAgent', e.target.value)}
          placeholder="自定义浏览器标识"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
      </div>

      <div className="p-3 bg-cyan-50 rounded-md">
        <div className="flex items-start gap-2">
          <Icon name="Info" size={14} className="text-cyan-500 mt-0.5" />
          <div className="text-xs text-cyan-700">
            <p className="font-medium">输出说明</p>
            {config.enableDeepScrape ? (
              <p className="mt-1">启用深度爬取后，将输出包含标题、URL和文章内容的数组。</p>
            ) : (
              <p className="mt-1">此节点会创建浏览器上下文，后续爬虫节点需要连接此上下文才能操作页面。</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// 获取文本配置
const GetTextConfig: React.FC<{ 
  config: any; 
  onConfigChange: (key: string, value: any) => void;
  onShowTemplates: () => void;
  pageUrl?: string;
}> = ({
  config,
  onConfigChange,
  onShowTemplates,
  pageUrl,
}) => (
  <>
    {/* 模板快捷按钮 */}
    <div className="mb-4 p-3 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-lg border border-cyan-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center">
          <Icon name="Sparkles" size={20} className="text-cyan-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            使用模板
          </h4>
          <p className="text-xs text-gray-600 mb-2">
            从预设模板中获取选择器配置
          </p>
          <button
            onClick={onShowTemplates}
            className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium rounded-md transition-colors flex items-center gap-1"
          >
            <Icon name="Layout" size={14} />
            选择模板
          </button>
        </div>
      </div>
    </div>

    <SelectorConfig
      selector={config.selector || ''}
      findBy={config.findBy || 'cssSelector'}
      onSelectorChange={(v) => onConfigChange('selector', v)}
      onFindByChange={(v) => onConfigChange('findBy', v)}
      helpText="指定要提取文本的元素"
      pageUrl={pageUrl}
    />

    <WaitOptions
      waitForSelector={config.waitForSelector !== false}
      waitTimeout={config.waitTimeout || 5000}
      onWaitForSelectorChange={(v) => onConfigChange('waitForSelector', v)}
      onWaitTimeoutChange={(v) => onConfigChange('waitTimeout', v)}
    />

    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={config.multiple || false}
          onChange={(e) => onConfigChange('multiple', e.target.checked)}
          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
        />
        提取多个元素
      </label>
      <p className="text-xs text-gray-500 mt-1">勾选后将返回所有匹配元素的文本数组</p>
    </div>

    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={config.includeHtml || false}
          onChange={(e) => onConfigChange('includeHtml', e.target.checked)}
          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
        />
        包含 HTML 标签
      </label>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">正则过滤 (可选)</label>
      <input
        type="text"
        value={config.regex || ''}
        onChange={(e) => onConfigChange('regex', e.target.value)}
        placeholder="例如: \d+"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
      />
    </div>
  </>
);

// 获取属性配置
const GetAttributeConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void; pageUrl?: string }> = ({
  config,
  onConfigChange,
  pageUrl,
}) => (
  <>
    <SelectorConfig
      selector={config.selector || ''}
      findBy={config.findBy || 'cssSelector'}
      onSelectorChange={(v) => onConfigChange('selector', v)}
      onFindByChange={(v) => onConfigChange('findBy', v)}
      pageUrl={pageUrl}
    />

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">属性名称</label>
      <input
        type="text"
        value={config.attributeName || 'href'}
        onChange={(e) => onConfigChange('attributeName', e.target.value)}
        placeholder="href, src, data-id..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
      <p className="text-xs text-gray-500 mt-1">常用: href, src, class, id, data-*</p>
    </div>

    <WaitOptions
      waitForSelector={config.waitForSelector !== false}
      waitTimeout={config.waitTimeout || 5000}
      onWaitForSelectorChange={(v) => onConfigChange('waitForSelector', v)}
      onWaitTimeoutChange={(v) => onConfigChange('waitTimeout', v)}
    />

    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={config.multiple || false}
          onChange={(e) => onConfigChange('multiple', e.target.checked)}
          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
        />
        提取多个元素
      </label>
    </div>
  </>
);

// 点击元素配置
const ClickConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void; pageUrl?: string }> = ({
  config,
  onConfigChange,
  pageUrl,
}) => (
  <>
    <SelectorConfig
      selector={config.selector || ''}
      findBy={config.findBy || 'cssSelector'}
      onSelectorChange={(v) => onConfigChange('selector', v)}
      onFindByChange={(v) => onConfigChange('findBy', v)}
      helpText="指定要点击的元素"
      pageUrl={pageUrl}
    />

    <WaitOptions
      waitForSelector={config.waitForSelector !== false}
      waitTimeout={config.waitTimeout || 5000}
      onWaitForSelectorChange={(v) => onConfigChange('waitForSelector', v)}
      onWaitTimeoutChange={(v) => onConfigChange('waitTimeout', v)}
    />

    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={config.waitForNavigation || false}
          onChange={(e) => onConfigChange('waitForNavigation', e.target.checked)}
          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
        />
        等待页面跳转
      </label>
      <p className="text-xs text-gray-500 mt-1">点击后等待页面导航完成</p>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">点击延迟 (毫秒)</label>
      <input
        type="number"
        value={config.delay || 0}
        onChange={(e) => onConfigChange('delay', parseInt(e.target.value))}
        min={0}
        max={5000}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
    </div>
  </>
);

// 输入文本配置
const InputConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void; pageUrl?: string }> = ({
  config,
  onConfigChange,
  pageUrl,
}) => (
  <>
    <SelectorConfig
      selector={config.selector || ''}
      findBy={config.findBy || 'cssSelector'}
      onSelectorChange={(v) => onConfigChange('selector', v)}
      onFindByChange={(v) => onConfigChange('findBy', v)}
      helpText="指定输入框元素"
      pageUrl={pageUrl}
    />

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">输入内容</label>
      <input
        type="text"
        value={config.value || ''}
        onChange={(e) => onConfigChange('value', e.target.value)}
        placeholder="要输入的文本"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
    </div>

    <WaitOptions
      waitForSelector={config.waitForSelector !== false}
      waitTimeout={config.waitTimeout || 5000}
      onWaitForSelectorChange={(v) => onConfigChange('waitForSelector', v)}
      onWaitTimeoutChange={(v) => onConfigChange('waitTimeout', v)}
    />

    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={config.clearBefore !== false}
          onChange={(e) => onConfigChange('clearBefore', e.target.checked)}
          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
        />
        输入前清空
      </label>
    </div>

    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={config.pressEnter || false}
          onChange={(e) => onConfigChange('pressEnter', e.target.checked)}
          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
        />
        输入后按回车
      </label>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">输入延迟 (毫秒/字符)</label>
      <input
        type="number"
        value={config.delay || 0}
        onChange={(e) => onConfigChange('delay', parseInt(e.target.value))}
        min={0}
        max={500}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
      <p className="text-xs text-gray-500 mt-1">模拟人工输入速度</p>
    </div>
  </>
);

// 滚动页面配置
const ScrollConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void; pageUrl?: string }> = ({
  config,
  onConfigChange,
  pageUrl,
}) => (
  <>
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">滚动模式</label>
      <select
        value={config.mode || 'pixels'}
        onChange={(e) => onConfigChange('mode', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="pixels">按像素滚动</option>
        <option value="element">滚动到元素</option>
        <option value="bottom">滚动到底部</option>
        <option value="top">滚动到顶部</option>
      </select>
    </div>

    {config.mode === 'pixels' && (
      <>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">垂直滚动 (像素)</label>
          <input
            type="number"
            value={config.scrollY || 500}
            onChange={(e) => onConfigChange('scrollY', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">水平滚动 (像素)</label>
          <input
            type="number"
            value={config.scrollX || 0}
            onChange={(e) => onConfigChange('scrollX', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
        </div>
      </>
    )}

    {config.mode === 'element' && (
      <SelectorConfig
        selector={config.selector || ''}
        findBy={config.findBy || 'cssSelector'}
        onSelectorChange={(v) => onConfigChange('selector', v)}
        onFindByChange={(v) => onConfigChange('findBy', v)}
        helpText="滚动到此元素可见"
        pageUrl={pageUrl}
      />
    )}

    <div className="mb-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <input
          type="checkbox"
          checked={config.smooth !== false}
          onChange={(e) => onConfigChange('smooth', e.target.checked)}
          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
        />
        平滑滚动
      </label>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">滚动后等待 (毫秒)</label>
      <input
        type="number"
        value={config.waitAfter || 1000}
        onChange={(e) => onConfigChange('waitAfter', parseInt(e.target.value))}
        min={0}
        max={10000}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
      <p className="text-xs text-gray-500 mt-1">等待懒加载内容</p>
    </div>
  </>
);

// 等待元素配置
const WaitConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void; pageUrl?: string }> = ({
  config,
  onConfigChange,
  pageUrl,
}) => (
  <>
    <SelectorConfig
      selector={config.selector || ''}
      findBy={config.findBy || 'cssSelector'}
      onSelectorChange={(v) => onConfigChange('selector', v)}
      onFindByChange={(v) => onConfigChange('findBy', v)}
      helpText="等待此元素满足条件"
      pageUrl={pageUrl}
    />

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">等待条件</label>
      <select
        value={config.condition || 'visible'}
        onChange={(e) => onConfigChange('condition', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="visible">元素可见</option>
        <option value="hidden">元素隐藏</option>
        <option value="attached">元素存在于DOM</option>
        <option value="detached">元素从DOM移除</option>
      </select>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">超时时间 (毫秒)</label>
      <input
        type="number"
        value={config.timeout || 30000}
        onChange={(e) => onConfigChange('timeout', parseInt(e.target.value))}
        min={1000}
        max={120000}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
    </div>
  </>
);

// 循环元素配置
const LoopElementsConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void; pageUrl?: string }> = ({
  config,
  onConfigChange,
  pageUrl,
}) => (
  <>
    <SelectorConfig
      selector={config.selector || ''}
      findBy={config.findBy || 'cssSelector'}
      onSelectorChange={(v) => onConfigChange('selector', v)}
      onFindByChange={(v) => onConfigChange('findBy', v)}
      helpText="匹配要遍历的元素列表"
      pageUrl={pageUrl}
    />

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">最大迭代次数</label>
      <input
        type="number"
        value={config.maxIterations || 100}
        onChange={(e) => onConfigChange('maxIterations', parseInt(e.target.value))}
        min={1}
        max={1000}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
      <p className="text-xs text-gray-500 mt-1">防止无限循环</p>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">迭代间隔 (毫秒)</label>
      <input
        type="number"
        value={config.delayBetween || 0}
        onChange={(e) => onConfigChange('delayBetween', parseInt(e.target.value))}
        min={0}
        max={5000}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
    </div>

    <div className="p-3 bg-cyan-50 rounded-md">
      <div className="flex items-start gap-2">
        <Icon name="Info" size={14} className="text-cyan-500 mt-0.5" />
        <div className="text-xs text-cyan-700">
          <p className="font-medium">输出说明</p>
          <p className="mt-1">每次迭代输出当前元素、索引和总数。循环结束后输出聚合结果数组。</p>
        </div>
      </div>
    </div>
  </>
);

// 执行脚本配置
const ExecuteScriptConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void }> = ({
  config,
  onConfigChange,
}) => (
  <>
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">JavaScript 代码</label>
      <textarea
        value={config.code || '// 返回值将作为输出\nreturn document.title;'}
        onChange={(e) => onConfigChange('code', e.target.value)}
        rows={10}
        placeholder="// 在页面上下文中执行的代码"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
      />
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">执行超时 (毫秒)</label>
      <input
        type="number"
        value={config.timeout || 30000}
        onChange={(e) => onConfigChange('timeout', parseInt(e.target.value))}
        min={1000}
        max={120000}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
      />
    </div>

    <div className="p-3 bg-amber-50 rounded-md">
      <div className="flex items-start gap-2">
        <Icon name="AlertTriangle" size={14} className="text-amber-500 mt-0.5" />
        <div className="text-xs text-amber-700">
          <p className="font-medium">安全提示</p>
          <p className="mt-1">脚本在页面上下文中执行，可访问 document 和 window 对象。请确保代码安全。</p>
        </div>
      </div>
    </div>
  </>
);

// 截图配置
const ScreenshotConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void; pageUrl?: string }> = ({
  config,
  onConfigChange,
  pageUrl,
}) => (
  <>
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">截图模式</label>
      <select
        value={config.mode || 'viewport'}
        onChange={(e) => onConfigChange('mode', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="viewport">当前视口</option>
        <option value="fullPage">整个页面</option>
        <option value="element">指定元素</option>
      </select>
    </div>

    {config.mode === 'element' && (
      <SelectorConfig
        selector={config.selector || ''}
        findBy={config.findBy || 'cssSelector'}
        onSelectorChange={(v) => onConfigChange('selector', v)}
        onFindByChange={(v) => onConfigChange('findBy', v)}
        helpText="截取此元素的图片"
        pageUrl={pageUrl}
      />
    )}

    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">图片格式</label>
      <select
        value={config.format || 'png'}
        onChange={(e) => onConfigChange('format', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="png">PNG (无损)</option>
        <option value="jpeg">JPEG (有损压缩)</option>
      </select>
    </div>

    {config.format === 'jpeg' && (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          图片质量: {config.quality || 100}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={config.quality || 100}
          onChange={(e) => onConfigChange('quality', parseInt(e.target.value))}
          className="w-full accent-cyan-500"
        />
      </div>
    )}
  </>
);

// 关闭页面配置
const ClosePageConfig: React.FC<{ config: any; onConfigChange: (key: string, value: any) => void }> = ({
  config,
  onConfigChange,
}) => (
  <>
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">关闭类型</label>
      <select
        value={config.closeType || 'tab'}
        onChange={(e) => onConfigChange('closeType', e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        <option value="tab">仅关闭标签页</option>
        <option value="browser">关闭整个浏览器</option>
      </select>
    </div>

    <div className="p-3 bg-cyan-50 rounded-md">
      <div className="flex items-start gap-2">
        <Icon name="Info" size={14} className="text-cyan-500 mt-0.5" />
        <div className="text-xs text-cyan-700">
          <p className="font-medium">资源释放</p>
          <p className="mt-1">关闭页面后，浏览器上下文将失效，无法再用于其他爬虫操作。</p>
        </div>
      </div>
    </div>
  </>
);

export default ScraperNodeConfig;
