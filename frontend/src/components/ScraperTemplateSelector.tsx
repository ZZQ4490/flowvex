// src/components/ScraperTemplateSelector.tsx
// 爬虫模板选择器 - 让用户轻松选择预设模板

import React, { useState } from 'react';
import { Icon } from './Icon';
import {
  scraperTemplates,
  scraperTemplatesByCategory,
  categoryNames,
  searchTemplates,
  type ScraperTemplate,
} from '../constants/scraperTemplates';

interface ScraperTemplateSelectorProps {
  onSelectTemplate: (template: ScraperTemplate) => void;
  onClose: () => void;
}

export const ScraperTemplateSelector: React.FC<ScraperTemplateSelectorProps> = ({
  onSelectTemplate,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<ScraperTemplate | null>(null);

  // 获取要显示的模板列表
  const getDisplayTemplates = (): ScraperTemplate[] => {
    if (searchKeyword) {
      return searchTemplates(searchKeyword);
    }
    if (selectedCategory === 'all') {
      return scraperTemplates;
    }
    return scraperTemplatesByCategory[selectedCategory as keyof typeof scraperTemplatesByCategory] || [];
  };

  const displayTemplates = getDisplayTemplates();

  // 应用模板
  const handleApplyTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-xl shadow-2xl w-[900px] max-h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">选择爬虫模板</h2>
            <p className="text-sm text-gray-500 mt-1">
              为常见网站提供开箱即用的配置，快速开始数据抓取
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 搜索和分类 */}
        <div className="p-6 border-b border-gray-200">
          {/* 搜索框 */}
          <div className="relative mb-4">
            <Icon
              name="Search"
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索模板..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          {/* 分类标签 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部 ({scraperTemplates.length})
            </button>
            {Object.entries(categoryNames).map(([key, name]) => {
              const count = scraperTemplatesByCategory[key as keyof typeof scraperTemplatesByCategory]?.length || 0;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === key
                      ? 'bg-cyan-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* 模板列表 */}
        <div className="flex-1 overflow-hidden flex">
          {/* 左侧：模板卡片列表 */}
          <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-200">
            {displayTemplates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Icon name="Search" size={48} className="mx-auto mb-3 opacity-30" />
                <p>未找到匹配的模板</p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{template.icon}</div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {template.name}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                            <Icon name="Globe" size={12} />
                            {categoryNames[template.category]}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 右侧：模板详情 */}
          <div className="w-1/2 overflow-y-auto p-6">
            {selectedTemplate ? (
              <div>
                <div className="flex items-start gap-3 mb-4">
                  <div className="text-4xl">{selectedTemplate.icon}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {selectedTemplate.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedTemplate.description}
                    </p>
                  </div>
                </div>

                {/* URL */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    目标网址
                  </label>
                  <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <Icon name="Link" size={14} className="text-gray-400" />
                    <code className="text-xs text-gray-700 flex-1 truncate">
                      {selectedTemplate.url}
                    </code>
                  </div>
                </div>

                {/* 选择器配置 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    选择器配置
                  </label>
                  <div className="space-y-2">
                    {selectedTemplate.selectors.container && (
                      <div className="p-2 bg-blue-50 rounded border border-blue-200">
                        <div className="text-xs font-medium text-blue-700 mb-1">
                          容器选择器
                        </div>
                        <code className="text-xs text-blue-900 font-mono">
                          {selectedTemplate.selectors.container}
                        </code>
                      </div>
                    )}
                    {selectedTemplate.selectors.title && (
                      <div className="p-2 bg-green-50 rounded border border-green-200">
                        <div className="text-xs font-medium text-green-700 mb-1">
                          标题选择器
                        </div>
                        <code className="text-xs text-green-900 font-mono">
                          {selectedTemplate.selectors.title}
                        </code>
                      </div>
                    )}
                    {selectedTemplate.selectors.link && (
                      <div className="p-2 bg-purple-50 rounded border border-purple-200">
                        <div className="text-xs font-medium text-purple-700 mb-1">
                          链接选择器
                        </div>
                        <code className="text-xs text-purple-900 font-mono">
                          {selectedTemplate.selectors.link}
                        </code>
                      </div>
                    )}
                    {selectedTemplate.selectors.custom &&
                      Object.entries(selectedTemplate.selectors.custom).map(([key, value]) => (
                        <div key={key} className="p-2 bg-gray-50 rounded border border-gray-200">
                          <div className="text-xs font-medium text-gray-700 mb-1">
                            {key}
                          </div>
                          <code className="text-xs text-gray-900 font-mono">{value}</code>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 示例数据 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    示例数据
                  </label>
                  <div className="p-3 bg-amber-50 rounded border border-amber-200">
                    <div className="text-sm font-medium text-amber-900 mb-1">
                      {selectedTemplate.example.title}
                    </div>
                    {selectedTemplate.example.description && (
                      <div className="text-xs text-amber-700">
                        {selectedTemplate.example.description}
                      </div>
                    )}
                  </div>
                </div>

                {/* 使用提示 */}
                {selectedTemplate.tips && selectedTemplate.tips.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      使用提示
                    </label>
                    <div className="p-3 bg-cyan-50 rounded border border-cyan-200">
                      <ul className="space-y-1">
                        {selectedTemplate.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-2 text-xs text-cyan-800">
                            <Icon name="Info" size={12} className="mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 应用按钮 */}
                <button
                  onClick={handleApplyTemplate}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="Check" size={18} />
                  应用此模板
                </button>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Icon name="MousePointer" size={48} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">选择一个模板查看详情</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScraperTemplateSelector;
