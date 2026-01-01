// src/components/NodeConfigPanel/SelectorConfig.tsx
// 选择器配置组件 - 支持 CSS 选择器和 XPath + 可视化选择

import React, { useState } from 'react';
import { Icon } from '../Icon';
import { ElementPicker } from '../ElementPicker';

interface SelectorConfigProps {
  selector: string;
  findBy: 'cssSelector' | 'xpath';
  onSelectorChange: (selector: string) => void;
  onFindByChange: (findBy: 'cssSelector' | 'xpath') => void;
  placeholder?: string;
  label?: string;
  helpText?: string;
  // 新增：用于可视化选择的页面URL
  pageUrl?: string;
}

export const SelectorConfig: React.FC<SelectorConfigProps> = ({
  selector,
  findBy,
  onSelectorChange,
  onFindByChange,
  placeholder,
  label = '选择器',
  helpText,
  pageUrl,
}) => {
  const [showHelp, setShowHelp] = useState(false);
  const [showElementPicker, setShowElementPicker] = useState(false);
  const [selectedElementInfo, setSelectedElementInfo] = useState<{
    tagName: string;
    text: string;
  } | null>(null);

  // 处理可视化选择结果
  const handleElementSelect = (selectedSelector: string, elementInfo: {
    tagName: string;
    text: string;
    attributes: Record<string, string>;
  }) => {
    onSelectorChange(selectedSelector);
    onFindByChange('cssSelector'); // 可视化选择生成的是CSS选择器
    setSelectedElementInfo({
      tagName: elementInfo.tagName,
      text: elementInfo.text,
    });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Icon name="HelpCircle" size={14} />
        </button>
      </div>

      {/* 可视化选择按钮 - 推荐方式 */}
      {pageUrl && (
        <button
          type="button"
          onClick={() => setShowElementPicker(true)}
          className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Icon name="MousePointer" size={18} />
          <span className="font-medium">点击选择页面元素</span>
          <span className="text-xs opacity-80 ml-1">(推荐)</span>
        </button>
      )}

      {/* 已选择元素的预览 */}
      {selectedElementInfo && selector && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Icon name="CheckCircle" size={14} />
            <span>已选择: </span>
            <code className="bg-green-100 px-1.5 py-0.5 rounded text-xs">
              &lt;{selectedElementInfo.tagName}&gt;
            </code>
          </div>
          {selectedElementInfo.text && (
            <p className="mt-1 text-xs text-green-600 truncate">
              内容: {selectedElementInfo.text.slice(0, 50)}...
            </p>
          )}
        </div>
      )}
      
      {/* 选择器类型切换 */}
      <div className="flex mb-2">
        <button
          type="button"
          onClick={() => onFindByChange('cssSelector')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-l-md border transition-colors ${
            findBy === 'cssSelector'
              ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          CSS 选择器
        </button>
        <button
          type="button"
          onClick={() => onFindByChange('xpath')}
          className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-r-md border-t border-r border-b transition-colors ${
            findBy === 'xpath'
              ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
              : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
          }`}
        >
          XPath
        </button>
      </div>
      
      {/* 选择器输入框 */}
      <input
        type="text"
        value={selector}
        onChange={(e) => onSelectorChange(e.target.value)}
        placeholder={placeholder || (findBy === 'cssSelector' ? '.class, #id, tag' : '//div[@class="item"]')}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
      />
      
      {/* 帮助文本 */}
      {helpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}

      {/* 没有pageUrl时的提示 */}
      {!pageUrl && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="flex items-start gap-2">
            <Icon name="AlertCircle" size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              请先在"打开网页"节点中配置URL，然后就可以使用可视化选择功能
            </p>
          </div>
        </div>
      )}

      {/* ElementPicker 弹窗 */}
      {showElementPicker && pageUrl && (
        <ElementPicker
          url={pageUrl}
          onSelectElement={handleElementSelect}
          onClose={() => setShowElementPicker(false)}
        />
      )}
      
      {/* 帮助面板 */}
      {showHelp && (
        <div className="mt-2 p-3 bg-gray-50 rounded-md text-xs">
          {findBy === 'cssSelector' ? (
            <div>
              <p className="font-medium text-gray-700 mb-2">CSS 选择器示例:</p>
              <ul className="space-y-1 text-gray-600">
                <li><code className="bg-gray-200 px-1 rounded">.class-name</code> - 类选择器</li>
                <li><code className="bg-gray-200 px-1 rounded">#element-id</code> - ID选择器</li>
                <li><code className="bg-gray-200 px-1 rounded">div &gt; p</code> - 子元素</li>
                <li><code className="bg-gray-200 px-1 rounded">[data-attr="value"]</code> - 属性选择器</li>
                <li><code className="bg-gray-200 px-1 rounded">ul li:nth-child(2)</code> - 第N个子元素</li>
              </ul>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-700 mb-2">XPath 示例:</p>
              <ul className="space-y-1 text-gray-600">
                <li><code className="bg-gray-200 px-1 rounded">//div[@class="item"]</code> - 类名匹配</li>
                <li><code className="bg-gray-200 px-1 rounded">//a[contains(@href, "link")]</code> - 包含属性</li>
                <li><code className="bg-gray-200 px-1 rounded">//ul/li[2]</code> - 第N个元素</li>
                <li><code className="bg-gray-200 px-1 rounded">//text()</code> - 文本节点</li>
                <li><code className="bg-gray-200 px-1 rounded">//*[contains(text(), "关键词")]</code> - 文本包含</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 等待选项配置
interface WaitOptionsProps {
  waitForSelector: boolean;
  waitTimeout: number;
  onWaitForSelectorChange: (value: boolean) => void;
  onWaitTimeoutChange: (value: number) => void;
}

export const WaitOptions: React.FC<WaitOptionsProps> = ({
  waitForSelector,
  waitTimeout,
  onWaitForSelectorChange,
  onWaitTimeoutChange,
}) => {
  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={waitForSelector}
            onChange={(e) => onWaitForSelectorChange(e.target.checked)}
            className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
          />
          等待元素出现
        </label>
      </div>
      
      {waitForSelector && (
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">超时时间 (毫秒)</label>
          <input
            type="number"
            value={waitTimeout}
            onChange={(e) => onWaitTimeoutChange(parseInt(e.target.value) || 5000)}
            min={0}
            max={60000}
            step={1000}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      )}
    </div>
  );
};

export default SelectorConfig;
