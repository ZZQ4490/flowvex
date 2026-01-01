// Agent 资源节点配置组件
import React, { useRef } from 'react';
import { WorkflowNode } from '../../types/workflow';
import { Icon } from '../Icon';
import { VariableInput } from '../common/VariableInput';

interface AgentResourceConfigProps {
  node: WorkflowNode;
  onConfigChange: (key: string, value: any) => void;
}

export const AgentResourceConfig: React.FC<AgentResourceConfigProps> = ({
  node,
  onConfigChange,
}) => {
  const config = node.data.config;
  const resourceType = config.resourceType || 'text';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onConfigChange('fileName', file.name);
    onConfigChange('fileSize', file.size);
    onConfigChange('fileType', file.type || 'auto');

    // 对于图片，转换为 base64
    if (resourceType === 'image' && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        onConfigChange('imageBase64', reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // 对于文本文件，读取内容
      if (file.type.startsWith('text/') || 
          ['.txt', '.json', '.md', '.csv', '.xml'].some(ext => file.name.endsWith(ext))) {
        const reader = new FileReader();
        reader.onload = () => {
          onConfigChange('fileContent', reader.result as string);
        };
        reader.readAsText(file);
      }
    }
  };

  const renderResourceSpecificConfig = () => {
    switch (resourceType) {
      case 'text':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">资源名称</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => onConfigChange('name', e.target.value)}
                placeholder="例如: 产品说明书"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">文本内容</label>
              <textarea
                value={config.content || ''}
                onChange={(e) => onConfigChange('content', e.target.value)}
                placeholder="输入文本内容..."
                rows={6}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">描述 (可选)</label>
              <input
                type="text"
                value={config.description || ''}
                onChange={(e) => onConfigChange('description', e.target.value)}
                placeholder="描述这个资源的用途"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        );

      case 'file':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">资源名称</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => onConfigChange('name', e.target.value)}
                placeholder="例如: 配置文件"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">上传文件</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".txt,.json,.md,.csv,.xml,.yaml,.yml"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-colors flex flex-col items-center gap-2"
              >
                <Icon name="Upload" size={24} className="text-gray-400" />
                <span className="text-sm text-gray-600">点击上传文件</span>
                <span className="text-xs text-gray-400">支持 txt, json, md, csv, xml, yaml</span>
              </button>
              {config.fileName && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Icon name="FileCheck" size={16} className="text-green-500" />
                  <span className="text-sm text-green-700">{config.fileName}</span>
                  <span className="text-xs text-green-500">({(config.fileSize / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">资源名称</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => onConfigChange('name', e.target.value)}
                placeholder="例如: 产品图片"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">图片来源</label>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={() => onConfigChange('imageSource', 'upload')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                    config.imageSource !== 'url' 
                      ? 'bg-pink-100 border-pink-300 text-pink-700' 
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  上传图片
                </button>
                <button
                  onClick={() => onConfigChange('imageSource', 'url')}
                  className={`flex-1 px-3 py-2 text-sm rounded-lg border ${
                    config.imageSource === 'url' 
                      ? 'bg-pink-100 border-pink-300 text-pink-700' 
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  图片 URL
                </button>
              </div>
              
              {config.imageSource === 'url' ? (
                <input
                  type="text"
                  value={config.imageUrl || ''}
                  onChange={(e) => onConfigChange('imageUrl', e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-pink-400 hover:bg-pink-50 transition-colors flex flex-col items-center gap-2"
                  >
                    <Icon name="Image" size={24} className="text-gray-400" />
                    <span className="text-sm text-gray-600">点击上传图片</span>
                    <span className="text-xs text-gray-400">支持 jpg, png, gif, webp</span>
                  </button>
                </>
              )}
              
              {config.imageBase64 && (
                <div className="mt-2">
                  <img 
                    src={config.imageBase64} 
                    alt="预览" 
                    className="max-w-full h-32 object-contain rounded-lg border"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">描述 (可选)</label>
              <input
                type="text"
                value={config.description || ''}
                onChange={(e) => onConfigChange('description', e.target.value)}
                placeholder="描述图片内容"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
              />
            </div>
          </div>
        );

      case 'url':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">资源名称</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => onConfigChange('name', e.target.value)}
                placeholder="例如: 参考文档"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">URL 地址</label>
              <input
                type="text"
                value={config.url || ''}
                onChange={(e) => onConfigChange('url', e.target.value)}
                placeholder="https://example.com/document"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="fetchContent"
                checked={config.fetchContent !== false}
                onChange={(e) => onConfigChange('fetchContent', e.target.checked)}
                className="rounded border-gray-300 text-cyan-500"
              />
              <label htmlFor="fetchContent" className="text-sm text-gray-700">
                自动获取网页内容
              </label>
            </div>
          </div>
        );

      case 'data':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">资源名称</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => onConfigChange('name', e.target.value)}
                placeholder="例如: 爬取数据"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">描述</label>
              <VariableInput
                value={config.description || ''}
                onChange={(value) => onConfigChange('description', value)}
                placeholder="描述数据内容，可使用 # 引用变量"
                multiline
                rows={3}
                nodeId={node.id}
              />
            </div>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Icon name="Info" size={14} className="text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-700">
                  将此节点的"数据输入"端口连接到上游节点，数据将自动作为资源传递给 Agent
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getResourceIcon = () => {
    const icons: Record<string, string> = {
      text: 'FileText',
      file: 'File',
      image: 'Image',
      url: 'Link',
      data: 'Database',
    };
    return icons[resourceType] || 'File';
  };

  const getResourceColor = () => {
    const colors: Record<string, { from: string; to: string; border: string }> = {
      text: { from: 'from-purple-50', to: 'to-violet-50', border: 'border-purple-200' },
      file: { from: 'from-purple-50', to: 'to-indigo-50', border: 'border-purple-200' },
      image: { from: 'from-pink-50', to: 'to-rose-50', border: 'border-pink-200' },
      url: { from: 'from-cyan-50', to: 'to-blue-50', border: 'border-cyan-200' },
      data: { from: 'from-amber-50', to: 'to-orange-50', border: 'border-amber-200' },
    };
    return colors[resourceType] || colors.text;
  };

  const color = getResourceColor();

  return (
    <div className="space-y-4">
      {/* 资源头部 */}
      <div className={`p-3 bg-gradient-to-br ${color.from} ${color.to} rounded-lg border ${color.border}`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg">
            <Icon name={getResourceIcon()} size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{node.data.label}</h4>
            <p className="text-xs text-gray-600">提供给 Agent 的资源</p>
          </div>
        </div>
      </div>

      {/* 资源特定配置 */}
      {renderResourceSpecificConfig()}

      {/* 输出说明 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-2">输出</div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
            #resource
          </span>
          <span className="text-xs text-gray-500">→ 连接到 AI Agent 的资源输入</span>
        </div>
      </div>
    </div>
  );
};

export default AgentResourceConfig;
