// src/components/LinkPicker.tsx
// 可视化链接选择器 - 用于深度爬取的链接选择

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from './Icon';

interface LinkInfo {
  selector: string;
  text: string;
  url: string;
  matchCount: number;
  rect?: { x: number; y: number; width: number; height: number };
}

interface LinkPickerProps {
  url: string;
  onSelectLink: (selector: string, links: Array<{text: string, url: string}>) => void;
  onClose: () => void;
}

const API_BASE_URL = 'http://localhost:3001';

export const LinkPicker: React.FC<LinkPickerProps> = ({
  url,
  onSelectLink,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('正在启动浏览器...');
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [links, setLinks] = useState<LinkInfo[]>([]);
  const [selectedLink, setSelectedLink] = useState<LinkInfo | null>(null);
  const [hoveredLink, setHoveredLink] = useState<LinkInfo | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 1280, height: 720 });
  const [searchQuery, setSearchQuery] = useState('');
  const [matchedLinks, setMatchedLinks] = useState<Array<{text: string, url: string}>>([]);
  const [waitForDynamic, setWaitForDynamic] = useState(true);
  const [extraWaitTime, setExtraWaitTime] = useState(3000);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 加载页面
  const loadPage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStatus('正在打开页面...');
    
    try {
      // 1. 打开页面（支持等待动态内容）
      const openResponse = await fetch(`${API_BASE_URL}/api/scraper/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { type: 'openPage', url },
          config: { 
            headless: true, 
            timeout: 30000,
            // 等待动态内容加载
            waitForNetworkIdle: waitForDynamic,
            waitAfterLoad: waitForDynamic ? extraWaitTime : 0,
          },
        }),
      });
      
      const openData = await openResponse.json();
      if (!openData.success) {
        throw new Error(openData.error || '无法打开页面');
      }
      
      const ctxId = openData.context_id;
      setContextId(ctxId);
      setLoadingStatus(waitForDynamic ? '等待动态内容加载...' : '正在截图...');
      
      // 设置截图
      if (openData.data?.screenshot) {
        setScreenshot(`data:image/png;base64,${openData.data.screenshot}`);
      }
      
      setLoadingStatus('正在分析页面链接...');
      
      // 2. 获取页面链接元素
      const linksResponse = await fetch(`${API_BASE_URL}/api/scraper/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { type: 'getLinkElements' },
          context_id: ctxId,
          config: {},
        }),
      });
      
      const linksData = await linksResponse.json();
      if (linksData.success && Array.isArray(linksData.data)) {
        setLinks(linksData.data);
      }
      
      setIsLoading(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载页面失败');
      setIsLoading(false);
    }
  }, [url, waitForDynamic, extraWaitTime]);

  // 关闭浏览器上下文
  const cleanup = useCallback(async () => {
    if (contextId) {
      try {
        await fetch(`${API_BASE_URL}/api/scraper/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: { type: 'closePage' },
            context_id: contextId,
            config: {},
          }),
        });
      } catch (e) {
        console.error('Failed to close browser context:', e);
      }
    }
  }, [contextId]);

  useEffect(() => {
    loadPage();
    return () => { cleanup(); };
  }, []);

  // 当选择链接时，获取所有匹配的链接
  useEffect(() => {
    if (selectedLink) {
      // 找出所有使用相同选择器的链接
      const matched = links
        .filter(l => l.selector === selectedLink.selector)
        .map(l => ({ text: l.text, url: l.url }));
      setMatchedLinks(matched);
    } else {
      setMatchedLinks([]);
    }
  }, [selectedLink, links]);

  // 处理鼠标在截图上移动
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || links.length === 0) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageSize.width / rect.width;
    const scaleY = imageSize.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // 找到鼠标位置下最小的链接元素
    let bestMatch: LinkInfo | null = null;
    let bestArea = Infinity;
    
    for (const link of links) {
      if (!link.rect) continue;
      if (x >= link.rect.x && x <= link.rect.x + link.rect.width &&
          y >= link.rect.y && y <= link.rect.y + link.rect.height) {
        const area = link.rect.width * link.rect.height;
        if (area < bestArea) {
          bestArea = area;
          bestMatch = link;
        }
      }
    }
    
    setHoveredLink(bestMatch);
  };

  // 处理点击选择链接
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (hoveredLink) {
      setSelectedLink(hoveredLink);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedLink) {
      onSelectLink(selectedLink.selector, matchedLinks);
      cleanup();
      onClose();
    }
  };

  // 从列表中选择链接
  const handleSelectFromList = (link: LinkInfo) => {
    setSelectedLink(link);
  };

  // 过滤链接
  const filteredLinks = links.filter(link => {
    if (searchQuery === '') return true;
    const query = searchQuery.toLowerCase();
    return link.text.toLowerCase().includes(query) || 
           link.url.toLowerCase().includes(query);
  });

  // 按选择器分组链接
  const groupedLinks = filteredLinks.reduce((acc, link) => {
    if (!acc[link.selector]) {
      acc[link.selector] = [];
    }
    acc[link.selector].push(link);
    return acc;
  }, {} as Record<string, LinkInfo[]>);

  // 计算高亮框位置
  const getHighlightStyle = (link: LinkInfo | null) => {
    if (!link?.rect || !imageRef.current) return {};
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / imageSize.width;
    const scaleY = rect.height / imageSize.height;
    
    return {
      left: `${link.rect.x * scaleX}px`,
      top: `${link.rect.y * scaleY}px`,
      width: `${link.rect.width * scaleX}px`,
      height: `${link.rect.height * scaleY}px`,
    };
  };

  // 高亮所有匹配选择器的链接
  const getMatchingLinks = (selector: string) => {
    return links.filter(l => l.selector === selector);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Icon name="Link" size={20} className="text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">选择页面链接</h2>
              <p className="text-sm text-gray-500 truncate max-w-md">{url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { cleanup(); loadPage(); }}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <Icon name="RefreshCw" size={14} className={isLoading ? 'animate-spin' : ''} />
              刷新
            </button>
            <button
              onClick={() => { cleanup(); onClose(); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon name="X" size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* 动态内容等待设置 */}
        <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="waitForDynamicLink"
              checked={waitForDynamic}
              onChange={(e) => setWaitForDynamic(e.target.checked)}
              className="rounded border-amber-300 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="waitForDynamicLink" className="text-sm text-amber-800">
              等待动态内容（SPA/React/Vue）
            </label>
          </div>
          {waitForDynamic && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-amber-700">额外等待:</label>
              <select
                value={extraWaitTime}
                onChange={(e) => setExtraWaitTime(Number(e.target.value))}
                className="px-2 py-1 text-sm border border-amber-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value={1000}>1秒</option>
                <option value={2000}>2秒</option>
                <option value={3000}>3秒</option>
                <option value={5000}>5秒</option>
                <option value={8000}>8秒</option>
                <option value={10000}>10秒</option>
              </select>
            </div>
          )}
          <span className="text-xs text-amber-600">
            💡 如果链接列表显示不完整，请勾选此选项并增加等待时间
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Screenshot Preview */}
          <div className="flex-1 relative bg-gray-100 overflow-auto" ref={containerRef}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="text-center">
                  <Icon name="Loader2" size={48} className="text-purple-500 animate-spin mx-auto mb-3" />
                  <p className="text-gray-600 font-medium">{loadingStatus}</p>
                  <p className="text-sm text-gray-400 mt-1">首次加载可能需要几秒钟</p>
                </div>
              </div>
            ) : error ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center p-6">
                  <Icon name="AlertCircle" size={48} className="text-red-400 mx-auto mb-3" />
                  <p className="text-gray-900 font-medium mb-2">加载失败</p>
                  <p className="text-sm text-gray-500 mb-4">{error}</p>
                  <button
                    onClick={loadPage}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                  >
                    重试
                  </button>
                </div>
              </div>
            ) : screenshot ? (
              <div 
                className="relative inline-block cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredLink(null)}
                onClick={handleClick}
              >
                <img 
                  ref={imageRef}
                  src={screenshot} 
                  alt="Page screenshot"
                  className="max-w-full"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
                  }}
                />
                {/* 高亮所有匹配选择器的链接 */}
                {selectedLink && getMatchingLinks(selectedLink.selector).map((link, idx) => (
                  link.rect && (
                    <div
                      key={idx}
                      className="absolute border-2 border-green-500 bg-green-500/10 pointer-events-none"
                      style={getHighlightStyle(link)}
                    />
                  )
                ))}
                {/* Hover highlight */}
                {hoveredLink?.rect && hoveredLink !== selectedLink && (
                  <div
                    className="absolute border-2 border-purple-500 bg-purple-500/10 pointer-events-none transition-all duration-75"
                    style={getHighlightStyle(hoveredLink)}
                  >
                    <div className="absolute -top-7 left-0 bg-purple-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                      <Icon name="Link" size={10} className="inline mr-1" />
                      {hoveredLink.text.slice(0, 30) || '(无文本)'}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Right: Link List & Info */}
          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
            {/* Search */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索链接文本或URL..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="text-xs text-gray-400">
                共 {filteredLinks.length} 个链接，{Object.keys(groupedLinks).length} 种类型
              </div>
            </div>

            {/* Link List */}
            <div className="flex-1 overflow-y-auto">
              {filteredLinks.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {isLoading ? '正在分析页面链接...' : '没有找到链接'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredLinks.map((link, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectFromList(link)}
                      onMouseEnter={() => setHoveredLink(link)}
                      onMouseLeave={() => setHoveredLink(null)}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedLink?.selector === link.selector ? 'bg-purple-50 border-l-2 border-purple-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon name="Link" size={12} className="text-purple-400" />
                        {link.matchCount > 1 && (
                          <span className="text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                            ×{link.matchCount} 个相似链接
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {link.text || <span className="text-gray-400 italic">无文本</span>}
                      </p>
                      <p className="text-xs text-blue-500 truncate mt-1">
                        {link.url}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Link Info */}
            {selectedLink && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="CheckCircle" size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-900">已选择链接类型</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div>
                    <label className="text-xs text-gray-500">选择器</label>
                    <div className="p-2 bg-white rounded border border-gray-200 mt-1">
                      <code className="text-xs text-gray-900 font-mono break-all">
                        {selectedLink.selector}
                      </code>
                    </div>
                  </div>
                  
                  {matchedLinks.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500">匹配的链接 ({matchedLinks.length}个)</label>
                      <div className="mt-1 max-h-32 overflow-y-auto border border-gray-200 rounded bg-white">
                        {matchedLinks.slice(0, 10).map((link, idx) => (
                          <div key={idx} className="px-2 py-1.5 border-b border-gray-100 last:border-0">
                            <p className="text-xs text-gray-700 truncate">{link.text || '(无文本)'}</p>
                            <p className="text-xs text-blue-400 truncate">{link.url}</p>
                          </div>
                        ))}
                        {matchedLinks.length > 10 && (
                          <div className="px-2 py-1.5 text-xs text-gray-400 text-center">
                            还有 {matchedLinks.length - 10} 个链接...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedLink.matchCount > 1 && (
                    <div className="p-2 bg-purple-50 rounded border border-purple-200">
                      <p className="text-xs text-purple-700">
                        ✨ 此选择器匹配 {selectedLink.matchCount} 个链接，
                        深度爬取将自动抓取所有匹配链接的内容
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="Check" size={16} />
                  使用此选择器
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkPicker;
