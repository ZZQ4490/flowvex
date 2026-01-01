// src/components/ElementPicker.tsx
// 可视化元素选择器 - 通过后端 Playwright 实现

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from './Icon';

interface ElementInfo {
  selector: string;
  tagName: string;
  text: string;
  matchCount: number;
  rect?: { x: number; y: number; width: number; height: number };
}

interface ElementPickerProps {
  url: string;
  onSelectElement: (selector: string, elementInfo: {
    tagName: string;
    text: string;
    attributes: Record<string, string>;
  }) => void;
  onClose: () => void;
}

const API_BASE_URL = 'http://localhost:3001';

export const ElementPicker: React.FC<ElementPickerProps> = ({
  url,
  onSelectElement,
  onClose,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('正在启动浏览器...');
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [elements, setElements] = useState<ElementInfo[]>([]);
  const [selectedElement, setSelectedElement] = useState<ElementInfo | null>(null);
  const [hoveredElement, setHoveredElement] = useState<ElementInfo | null>(null);
  const [contextId, setContextId] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 1280, height: 720 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('all');
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
      
      setLoadingStatus('正在分析页面元素...');
      
      // 2. 获取页面元素
      const elementsResponse = await fetch(`${API_BASE_URL}/api/scraper/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: { type: 'getElements' },
          context_id: ctxId,
          config: {},
        }),
      });
      
      const elementsData = await elementsResponse.json();
      if (elementsData.success && Array.isArray(elementsData.data)) {
        setElements(elementsData.data);
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

  // 处理鼠标在截图上移动
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || elements.length === 0) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageSize.width / rect.width;
    const scaleY = imageSize.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // 找到鼠标位置下最小的元素
    let bestMatch: ElementInfo | null = null;
    let bestArea = Infinity;
    
    for (const el of elements) {
      if (!el.rect) continue;
      if (x >= el.rect.x && x <= el.rect.x + el.rect.width &&
          y >= el.rect.y && y <= el.rect.y + el.rect.height) {
        const area = el.rect.width * el.rect.height;
        if (area < bestArea) {
          bestArea = area;
          bestMatch = el;
        }
      }
    }
    
    setHoveredElement(bestMatch);
  };

  // 处理点击选择元素
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (hoveredElement) {
      setSelectedElement(hoveredElement);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedElement) {
      onSelectElement(selectedElement.selector, {
        tagName: selectedElement.tagName,
        text: selectedElement.text,
        attributes: {},
      });
      cleanup();
      onClose();
    }
  };

  // 从列表中选择元素
  const handleSelectFromList = (element: ElementInfo) => {
    setSelectedElement(element);
  };

  // 过滤元素
  const filteredElements = elements.filter(el => {
    const matchesSearch = searchQuery === '' || 
      el.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      el.selector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = filterTag === 'all' || el.tagName === filterTag;
    return matchesSearch && matchesTag;
  });

  // 获取所有标签类型
  const tagTypes = ['all', ...new Set(elements.map(el => el.tagName))];

  // 计算高亮框位置
  const getHighlightStyle = (el: ElementInfo | null) => {
    if (!el?.rect || !imageRef.current) return {};
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = rect.width / imageSize.width;
    const scaleY = rect.height / imageSize.height;
    
    return {
      left: `${el.rect.x * scaleX}px`,
      top: `${el.rect.y * scaleY}px`,
      width: `${el.rect.width * scaleX}px`,
      height: `${el.rect.height * scaleY}px`,
    };
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Icon name="MousePointer" size={20} className="text-cyan-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">选择页面元素</h2>
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
              id="waitForDynamic"
              checked={waitForDynamic}
              onChange={(e) => setWaitForDynamic(e.target.checked)}
              className="rounded border-amber-300 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="waitForDynamic" className="text-sm text-amber-800">
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
            💡 如果页面内容显示不完整，请勾选此选项并增加等待时间
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Screenshot Preview */}
          <div className="flex-1 relative bg-gray-100 overflow-auto" ref={containerRef}>
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="text-center">
                  <Icon name="Loader2" size={48} className="text-cyan-500 animate-spin mx-auto mb-3" />
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
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
                  >
                    重试
                  </button>
                </div>
              </div>
            ) : screenshot ? (
              <div 
                className="relative inline-block cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredElement(null)}
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
                {/* Hover highlight */}
                {hoveredElement?.rect && (
                  <div
                    className="absolute border-2 border-cyan-500 bg-cyan-500/10 pointer-events-none transition-all duration-75"
                    style={getHighlightStyle(hoveredElement)}
                  >
                    <div className="absolute -top-7 left-0 bg-cyan-500 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                      &lt;{hoveredElement.tagName}&gt; {hoveredElement.text.slice(0, 30)}
                    </div>
                  </div>
                )}
                {/* Selected highlight */}
                {selectedElement?.rect && selectedElement !== hoveredElement && (
                  <div
                    className="absolute border-2 border-green-500 bg-green-500/10 pointer-events-none"
                    style={getHighlightStyle(selectedElement)}
                  />
                )}
              </div>
            ) : null}
          </div>

          {/* Right: Element List & Info */}
          <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
            {/* Search & Filter */}
            <div className="p-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索元素文本或选择器..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {tagTypes.slice(0, 10).map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFilterTag(tag)}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      filterTag === tag 
                        ? 'bg-cyan-100 text-cyan-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tag === 'all' ? '全部' : tag}
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-400">
                共 {filteredElements.length} 个元素
              </div>
            </div>

            {/* Element List */}
            <div className="flex-1 overflow-y-auto">
              {filteredElements.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {isLoading ? '正在分析页面元素...' : '没有匹配的元素'}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredElements.map((el, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectFromList(el)}
                      onMouseEnter={() => setHoveredElement(el)}
                      onMouseLeave={() => setHoveredElement(null)}
                      className={`w-full p-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedElement === el ? 'bg-cyan-50 border-l-2 border-cyan-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-mono">
                          {el.tagName}
                        </span>
                        {el.matchCount > 1 && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            ×{el.matchCount}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 truncate">
                        {el.text || <span className="text-gray-400 italic">无文本</span>}
                      </p>
                      <p className="text-xs text-gray-400 font-mono truncate mt-1">
                        {el.selector}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Element Info */}
            {selectedElement && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="CheckCircle" size={16} className="text-green-500" />
                  <span className="text-sm font-medium text-gray-900">已选择元素</span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div>
                    <label className="text-xs text-gray-500">选择器</label>
                    <div className="p-2 bg-white rounded border border-gray-200 mt-1">
                      <code className="text-xs text-gray-900 font-mono break-all">
                        {selectedElement.selector}
                      </code>
                    </div>
                  </div>
                  
                  {selectedElement.text && (
                    <div>
                      <label className="text-xs text-gray-500">文本内容</label>
                      <p className="text-sm text-gray-700 mt-1 line-clamp-2">
                        {selectedElement.text}
                      </p>
                    </div>
                  )}
                  
                  {selectedElement.matchCount > 1 && (
                    <div className="p-2 bg-amber-50 rounded border border-amber-200">
                      <p className="text-xs text-amber-700">
                        ⚠️ 此选择器匹配 {selectedElement.matchCount} 个元素，
                        勾选"提取多个元素"可获取全部
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
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

export default ElementPicker;
