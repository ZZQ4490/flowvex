// Agent 工具节点配置组件
import React from 'react';
import { WorkflowNode } from '../../types/workflow';
import { Icon } from '../Icon';

interface AgentToolConfigProps {
  node: WorkflowNode;
  onConfigChange: (key: string, value: any) => void;
}

export const AgentToolConfig: React.FC<AgentToolConfigProps> = ({
  node,
  onConfigChange,
}) => {
  const config = node.data.config;
  const toolType = config.toolType || 'custom';

  const renderToolSpecificConfig = () => {
    switch (toolType) {
      case 'web_search':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">最大结果数</label>
              <input
                type="number"
                value={config.maxResults || 5}
                onChange={(e) => onConfigChange('maxResults', parseInt(e.target.value))}
                min={1}
                max={20}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'http_request':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">允许的 HTTP 方法</label>
              <div className="flex flex-wrap gap-2">
                {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => (
                  <label key={method} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={(config.allowedMethods || ['GET', 'POST']).includes(method)}
                      onChange={(e) => {
                        const methods = config.allowedMethods || ['GET', 'POST'];
                        if (e.target.checked) {
                          onConfigChange('allowedMethods', [...methods, method]);
                        } else {
                          onConfigChange('allowedMethods', methods.filter((m: string) => m !== method));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-500"
                    />
                    <span className="text-sm text-gray-600">{method}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">超时时间 (ms)</label>
              <input
                type="number"
                value={config.timeout || 30000}
                onChange={(e) => onConfigChange('timeout', parseInt(e.target.value))}
                min={1000}
                max={120000}
                step={1000}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'scrape_webpage':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">最大内容长度</label>
              <input
                type="number"
                value={config.maxContentLength || 10000}
                onChange={(e) => onConfigChange('maxContentLength', parseInt(e.target.value))}
                min={1000}
                max={100000}
                step={1000}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      case 'execute_code':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">允许的 API</label>
              <div className="flex flex-wrap gap-2">
                {['Math', 'JSON', 'Date', 'String', 'Array', 'Object'].map(api => (
                  <label key={api} className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={(config.allowedAPIs || ['Math', 'JSON', 'Date']).includes(api)}
                      onChange={(e) => {
                        const apis = config.allowedAPIs || ['Math', 'JSON', 'Date'];
                        if (e.target.checked) {
                          onConfigChange('allowedAPIs', [...apis, api]);
                        } else {
                          onConfigChange('allowedAPIs', apis.filter((a: string) => a !== api));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-500"
                    />
                    <span className="text-sm text-gray-600">{api}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'read_file':
      case 'write_file':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">允许的文件扩展名</label>
              <input
                type="text"
                value={(config.allowedExtensions || []).join(', ')}
                onChange={(e) => onConfigChange('allowedExtensions', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder=".txt, .json, .md"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">用逗号分隔</p>
            </div>
            {toolType === 'write_file' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">最大文件大小 (KB)</label>
                <input
                  type="number"
                  value={(config.maxFileSize || 1024 * 1024) / 1024}
                  onChange={(e) => onConfigChange('maxFileSize', parseInt(e.target.value) * 1024)}
                  min={1}
                  max={10240}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">工具名称</label>
              <input
                type="text"
                value={config.name || ''}
                onChange={(e) => onConfigChange('name', e.target.value)}
                placeholder="my_custom_tool"
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">工具描述</label>
              <textarea
                value={config.description || ''}
                onChange={(e) => onConfigChange('description', e.target.value)}
                placeholder="描述这个工具的功能..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">执行代码</label>
              <textarea
                value={config.code || '// 工具执行代码\nreturn { result: "success" };'}
                onChange={(e) => onConfigChange('code', e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getToolIcon = () => {
    const icons: Record<string, string> = {
      web_search: 'Search',
      http_request: 'Globe',
      scrape_webpage: 'FileSearch',
      execute_code: 'Code',
      read_file: 'FileText',
      write_file: 'FilePlus',
      custom: 'Wrench',
    };
    return icons[toolType] || 'Wrench';
  };

  const getToolLabel = () => {
    const labels: Record<string, string> = {
      web_search: '网络搜索',
      http_request: 'HTTP 请求',
      scrape_webpage: '网页爬取',
      execute_code: '代码执行',
      read_file: '文件读取',
      write_file: '文件写入',
      custom: '自定义工具',
    };
    return labels[toolType] || '工具';
  };

  return (
    <div className="space-y-4">
      {/* 工具头部 */}
      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <Icon name={getToolIcon()} size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{getToolLabel()}</h4>
            <p className="text-xs text-gray-600">Agent 可调用的工具</p>
          </div>
        </div>
      </div>

      {/* 启用开关 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">启用此工具</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled !== false}
            onChange={(e) => onConfigChange('enabled', e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>

      {/* 工具特定配置 */}
      {renderToolSpecificConfig()}

      {/* 输出说明 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-2">输出</div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
            #tool
          </span>
          <span className="text-xs text-gray-500">→ 连接到 AI Agent 的工具输入</span>
        </div>
      </div>
    </div>
  );
};

export default AgentToolConfig;
