import React, { useState } from 'react';
import { WorkflowNode } from '../types/workflow';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAISettingsStore } from '../stores/aiSettingsStore';
import { useVariableStore } from '../stores/variableStore';
import { Icon } from './Icon';
import { ModelSelector } from './common/ModelSelector';
import { VariableInput } from './common/VariableInput';
import { testModelConnection, TestResult } from '../services/aiTestService';
import { ScraperNodeConfig } from './NodeConfigPanel/ScraperNodeConfig';
import { JsonProcessorConfig } from './NodeConfigPanel/JsonProcessorConfig';
import { AgentNodeConfig } from './NodeConfigPanel/AgentNodeConfig';
import { AgentToolConfig } from './NodeConfigPanel/AgentToolConfig';
import { AgentResourceConfig } from './NodeConfigPanel/AgentResourceConfig';
import { AgentRuleConfig } from './NodeConfigPanel/AgentRuleConfig';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onClose: () => void;
}

export const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose }) => {
  const { updateNodeConfig, removeNode } = useWorkflowStore();
  const { getModelById, getProviderById } = useAISettingsStore();
  const { variables } = useVariableStore();
  
  // Test connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  const handleConfigChange = (key: string, value: any) => {
    updateNodeConfig(node.id, { [key]: value });
    // Clear test result when model changes
    if (key === 'modelId') {
      setTestResult(null);
    }
  };

  const handleDelete = () => {
    removeNode(node.id);
    onClose();
  };

  // Test model connection
  const handleTestConnection = async () => {
    const modelId = node.data.config.modelId;
    if (!modelId) {
      setTestResult({ success: false, message: '请先选择一个模型' });
      return;
    }

    const model = getModelById(modelId);
    if (!model) {
      setTestResult({ success: false, message: '模型配置不存在' });
      return;
    }

    const provider = getProviderById(model.providerId);
    if (!provider) {
      setTestResult({ success: false, message: '提供商配置不存在' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testModelConnection(provider, model);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : '测试失败',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const renderConfigFields = () => {
    const config = node.data.config;
    const nodeType = node.nodeType;

    // Scraper nodes - 使用专门的爬虫配置组件
    if ((nodeType as any).type === 'Scraper' || (nodeType as any).scraper_type) {
      return (
        <ScraperNodeConfig
          node={node}
          onConfigChange={handleConfigChange}
        />
      );
    }

    // JSON处理器节点
    console.log('NodeConfigPanel - node.type:', node.type, 'nodeType:', nodeType);
    if ((nodeType as any).action_type === 'JsonProcessor' || node.type === 'jsonProcessor') {
      console.log('Rendering JsonProcessorConfig');
      return (
        <JsonProcessorConfig
          node={node}
          onConfigChange={handleConfigChange}
        />
      );
    }

    // AI Agent 节点
    if (nodeType.type === 'AI' && (nodeType as any).ai_type === 'Agent') {
      return (
        <AgentNodeConfig
          node={node}
          onConfigChange={handleConfigChange}
        />
      );
    }

    // Agent 工具节点
    if (node.type === 'agentTool') {
      return (
        <AgentToolConfig
          node={node}
          onConfigChange={handleConfigChange}
        />
      );
    }

    // Agent 资源节点
    if (node.type === 'agentResource') {
      return (
        <AgentResourceConfig
          node={node}
          onConfigChange={handleConfigChange}
        />
      );
    }

    // Agent 规则节点
    if (node.type === 'agentRule') {
      return (
        <AgentRuleConfig
          node={node}
          onConfigChange={handleConfigChange}
        />
      );
    }

    // Trigger: Webhook
    if (nodeType.type === 'Trigger' && nodeType.trigger_type === 'Webhook') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">HTTP方法</label>
            <select
              value={config.method || 'POST'}
              onChange={(e) => handleConfigChange('method', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">路径</label>
            <input
              type="text"
              value={config.path || ''}
              onChange={(e) => handleConfigChange('path', e.target.value)}
              placeholder="/webhook/my-endpoint"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      );
    }

    // Trigger: Schedule
    if (nodeType.type === 'Trigger' && nodeType.trigger_type === 'Schedule') {
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Cron表达式</label>
          <input
            type="text"
            value={config.cron || ''}
            onChange={(e) => handleConfigChange('cron', e.target.value)}
            placeholder="0 * * * *"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">例如: 0 * * * * (每小时执行)</p>
        </div>
      );
    }

    // Action: HTTP Request
    if (nodeType.type === 'Action' && nodeType.action_type === 'Http') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">HTTP方法</label>
            <select
              value={config.method || 'GET'}
              onChange={(e) => handleConfigChange('method', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
              type="text"
              value={config.url || ''}
              onChange={(e) => handleConfigChange('url', e.target.value)}
              placeholder="https://api.example.com/endpoint"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">请求头 (JSON)</label>
            <textarea
              value={JSON.stringify(config.headers || {}, null, 2)}
              onChange={(e) => {
                try {
                  handleConfigChange('headers', JSON.parse(e.target.value));
                } catch {}
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">请求体</label>
            <textarea
              value={config.body || ''}
              onChange={(e) => handleConfigChange('body', e.target.value)}
              rows={4}
              placeholder='{"key": "value"}'
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </>
      );
    }

    // AI: Text Generation
    if (nodeType.type === 'AI' && nodeType.ai_type === 'TextGeneration') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <ModelSelector
              value={config.modelId || null}
              onChange={(modelId) => handleConfigChange('modelId', modelId)}
              modelType="chat"
              placeholder="选择 AI 模型"
            />
            <p className="mt-1 text-xs text-gray-500">
              在设置中配置更多模型提供商
            </p>
          </div>
          
          {/* Test Connection Button */}
          {config.modelId && (
            <div className="mb-4">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isTesting ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Icon name="Zap" size={16} />
                    测试模型连接
                  </>
                )}
              </button>
              
              {/* Test Result */}
              {testResult && (
                <div className={`mt-2 p-3 rounded-md text-sm ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <Icon 
                      name={testResult.success ? 'CheckCircle' : 'XCircle'} 
                      size={16} 
                      className={testResult.success ? 'text-green-500 mt-0.5' : 'text-red-500 mt-0.5'} 
                    />
                    <div className="flex-1 min-w-0">
                      <p className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                        {testResult.message}
                      </p>
                      {testResult.latency && (
                        <p className="text-xs text-gray-500 mt-1">
                          响应时间: {testResult.latency}ms
                        </p>
                      )}
                      {testResult.response && (
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          响应: {testResult.response}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">系统提示词</label>
            <textarea
              value={config.systemPrompt || ''}
              onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
              rows={3}
              placeholder="设置 AI 的角色和行为..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">用户提示词</label>
            <VariableInput
              value={config.prompt || ''}
              onChange={(value) => handleConfigChange('prompt', value)}
              placeholder="输入提示词，输入 # 引用上游数据..."
              multiline
              rows={6}
              nodeId={node.id}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Temperature: {config.temperature ?? 0.7}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature ?? 0.7}
              onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>精确</span>
              <span>创意</span>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大输出 Tokens
            </label>
            <input
              type="number"
              value={config.maxTokens || 2048}
              onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
              min={1}
              max={128000}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </>
      );
    }

    // AI: Tool Calling
    if (nodeType.type === 'AI' && nodeType.ai_type === 'ToolCalling') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <ModelSelector
              value={config.modelId || null}
              onChange={(modelId) => handleConfigChange('modelId', modelId)}
              modelType="chat"
              placeholder="选择 AI 模型"
            />
          </div>
          
          {/* Test Connection Button */}
          {config.modelId && (
            <div className="mb-4">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isTesting ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Icon name="Zap" size={16} />
                    测试模型连接
                  </>
                )}
              </button>
              {testResult && (
                <div className={`mt-2 p-3 rounded-md text-sm ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <Icon 
                      name={testResult.success ? 'CheckCircle' : 'XCircle'} 
                      size={16} 
                      className={testResult.success ? 'text-green-500 mt-0.5' : 'text-red-500 mt-0.5'} 
                    />
                    <div className="flex-1">
                      <p className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                        {testResult.message}
                      </p>
                      {testResult.latency && (
                        <p className="text-xs text-gray-500 mt-1">响应时间: {testResult.latency}ms</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">系统提示词</label>
            <textarea
              value={config.systemPrompt || ''}
              onChange={(e) => handleConfigChange('systemPrompt', e.target.value)}
              rows={3}
              placeholder="设置 Agent 的角色和目标..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">可用工具</label>
            <div className="p-3 bg-gray-50 rounded-md text-sm text-gray-500">
              工具配置功能开发中...
            </div>
          </div>
        </>
      );
    }

    // AI: Classification
    if (nodeType.type === 'AI' && nodeType.ai_type === 'Classification') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">模型</label>
            <ModelSelector
              value={config.modelId || null}
              onChange={(modelId) => handleConfigChange('modelId', modelId)}
              modelType="chat"
              placeholder="选择 AI 模型"
            />
          </div>
          
          {/* Test Connection Button */}
          {config.modelId && (
            <div className="mb-4">
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isTesting ? (
                  <>
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    测试中...
                  </>
                ) : (
                  <>
                    <Icon name="Zap" size={16} />
                    测试模型连接
                  </>
                )}
              </button>
              {testResult && (
                <div className={`mt-2 p-3 rounded-md text-sm ${
                  testResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <Icon 
                      name={testResult.success ? 'CheckCircle' : 'XCircle'} 
                      size={16} 
                      className={testResult.success ? 'text-green-500 mt-0.5' : 'text-red-500 mt-0.5'} 
                    />
                    <div className="flex-1">
                      <p className={testResult.success ? 'text-green-700' : 'text-red-700'}>
                        {testResult.message}
                      </p>
                      {testResult.latency && (
                        <p className="text-xs text-gray-500 mt-1">响应时间: {testResult.latency}ms</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">分类类别</label>
            <textarea
              value={config.categories?.join('\n') || ''}
              onChange={(e) => handleConfigChange('categories', e.target.value.split('\n').filter(Boolean))}
              rows={4}
              placeholder="每行一个类别，例如：&#10;正面&#10;负面&#10;中性"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">分类说明</label>
            <textarea
              value={config.instructions || ''}
              onChange={(e) => handleConfigChange('instructions', e.target.value)}
              rows={3}
              placeholder="描述如何进行分类..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </>
      );
    }

    // Condition: If
    if (nodeType.type === 'Condition' && nodeType.condition_type === 'If') {
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">条件表达式</label>
          <VariableInput
            value={config.condition || ''}
            onChange={(value) => handleConfigChange('condition', value)}
            placeholder="例如: #crawler_data.length > 0"
            nodeId={node.id}
          />
          <p className="mt-1 text-xs text-gray-500">使用 JavaScript 表达式，输入 # 引用变量</p>
        </div>
      );
    }

    // 显示文字节点
    if (node.data.label === '显示文字' || node.type === 'display') {
      const allVariables = Object.values(variables);
      const selectedVarId = config.selectedVariableId;
      const selectedVar = selectedVarId ? variables[selectedVarId] : undefined;
      
      return (
        <>
          {/* 变量选择器 - 从节点移到这里 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">选择变量</label>
            {selectedVar ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-md text-sm font-medium truncate">
                  #{selectedVar.name}
                </div>
                <button
                  onClick={() => handleConfigChange('selectedVariableId', null)}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <Icon name="X" size={16} className="text-gray-400" />
                </button>
              </div>
            ) : (
              <select
                value=""
                onChange={(e) => handleConfigChange('selectedVariableId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">选择要显示的变量...</option>
                {allVariables.map(v => (
                  <option key={v.id} value={v.id}>
                    #{v.name} - {v.displayName}
                  </option>
                ))}
              </select>
            )}
            {allVariables.length === 0 && (
              <p className="mt-1 text-xs text-gray-400">暂无可用变量，请先添加其他节点</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">显示格式</label>
            <select
              value={config.format || 'auto'}
              onChange={(e) => handleConfigChange('format', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="auto">自动检测</option>
              <option value="text">纯文本</option>
              <option value="json">JSON格式</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={config.showTokens !== false}
                onChange={(e) => handleConfigChange('showTokens', e.target.checked)}
                className="rounded border-gray-300 text-blue-500 focus:ring-blue-500"
              />
              显示Token用量
            </label>
          </div>

          <div className="p-3 bg-cyan-50 rounded-md">
            <div className="flex items-start gap-2">
              <Icon name="Info" size={14} className="text-cyan-500 mt-0.5" />
              <div className="text-xs text-cyan-700">
                <p className="font-medium">使用说明</p>
                <p className="mt-1">将此节点连接到任意节点的输出，运行工作流后将直接在画布上显示数据内容。</p>
              </div>
            </div>
          </div>
        </>
      );
    }

    // 网页爬虫节点
    if (node.data.label === '网页爬虫') {
      const templates = config.templates || {};
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">抓取模板</label>
            <select
              value={config.template || 'custom'}
              onChange={(e) => {
                const template = e.target.value;
                handleConfigChange('template', template);
                if (template !== 'custom' && templates[template]) {
                  handleConfigChange('url', templates[template].url);
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="custom">自定义</option>
              <option value="baidu_hot">百度热搜榜</option>
              <option value="weibo_hot">微博热搜</option>
            </select>
          </div>
          
          {config.template && config.template !== 'custom' && templates[config.template] && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                <Icon name="Info" size={14} />
                {templates[config.template].name}
              </div>
              <p className="text-xs text-blue-600 mt-1">
                {templates[config.template].description}
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">目标URL</label>
            <input
              type="text"
              value={config.url || ''}
              onChange={(e) => handleConfigChange('url', e.target.value)}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={config.template !== 'custom'}
            />
          </div>

          {config.template === 'custom' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">CSS选择器</label>
              <input
                type="text"
                value={config.selector || ''}
                onChange={(e) => handleConfigChange('selector', e.target.value)}
                placeholder=".item, #content"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">用于提取数据的CSS选择器</p>
            </div>
          )}

          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-500 mb-2">输出变量</div>
            <div className="flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-mono">
                #crawler_data
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-mono">
                #crawler_raw
              </span>
            </div>
          </div>
        </>
      );
    }

    // 时间节点
    if (node.data.label === '时间节点') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">时间格式</label>
            <input
              type="text"
              value={config.format || 'YYYY-MM-DD HH:mm:ss'}
              onChange={(e) => handleConfigChange('format', e.target.value)}
              placeholder="YYYY-MM-DD HH:mm:ss"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Y=年, M=月, D=日, H=时, m=分, s=秒
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">时区</label>
            <select
              value={config.timezone || 'Asia/Shanghai'}
              onChange={(e) => handleConfigChange('timezone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Asia/Shanghai">中国标准时间 (UTC+8)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">美国东部时间</option>
              <option value="Europe/London">伦敦时间</option>
              <option value="Asia/Tokyo">东京时间</option>
            </select>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-500 mb-2">输出变量</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-mono">
                  #time_formatted
                </span>
                <span className="text-xs text-gray-400">格式化时间</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                  #time_timestamp
                </span>
                <span className="text-xs text-gray-400">Unix时间戳</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-mono">
                  #time_iso
                </span>
                <span className="text-xs text-gray-400">ISO格式</span>
              </div>
            </div>
          </div>
        </>
      );
    }

    // 发送邮件节点
    if (node.data.label === '发送邮件') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">邮件服务商</label>
            <select
              value={config.provider || 'gmail'}
              onChange={(e) => handleConfigChange('provider', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
              <option value="smtp">自定义SMTP</option>
            </select>
          </div>

          {config.provider === 'smtp' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">SMTP服务器</label>
                <input
                  type="text"
                  value={config.smtpHost || ''}
                  onChange={(e) => handleConfigChange('smtpHost', e.target.value)}
                  placeholder="smtp.example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">端口</label>
                <input
                  type="number"
                  value={config.smtpPort || 587}
                  onChange={(e) => handleConfigChange('smtpPort', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">收件人</label>
            <VariableInput
              value={config.to || ''}
              onChange={(value) => handleConfigChange('to', value)}
              placeholder="recipient@example.com"
              nodeId={node.id}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">邮件主题</label>
            <VariableInput
              value={config.subject || ''}
              onChange={(value) => handleConfigChange('subject', value)}
              placeholder="邮件主题，可使用 #变量名"
              nodeId={node.id}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">邮件正文</label>
            <VariableInput
              value={config.body || ''}
              onChange={(value) => handleConfigChange('body', value)}
              placeholder="邮件内容，输入 # 插入变量..."
              multiline
              rows={6}
              nodeId={node.id}
            />
            <p className="mt-1 text-xs text-gray-500">
              支持变量插值，如 #ai_output, #time_formatted
            </p>
          </div>

          <div className="mb-4 p-3 bg-amber-50 rounded-md">
            <div className="flex items-start gap-2">
              <Icon name="AlertTriangle" size={14} className="text-amber-500 mt-0.5" />
              <div className="text-xs text-amber-700">
                需要在集成设置中配置邮件服务凭证
              </div>
            </div>
          </div>
        </>
      );
    }

    // JSON解析节点
    if (node.data.label === 'JSON解析') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">操作模式</label>
            <select
              value={config.mode || 'parse'}
              onChange={(e) => handleConfigChange('mode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="parse">解析JSON字符串</option>
              <option value="stringify">转换为JSON字符串</option>
              <option value="transform">JSONPath提取</option>
            </select>
          </div>

          {config.mode === 'transform' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">JSONPath表达式</label>
              <input
                type="text"
                value={config.path || ''}
                onChange={(e) => handleConfigChange('path', e.target.value)}
                placeholder="$.data.items[*].name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <p className="mt-1 text-xs text-gray-500">
                使用JSONPath语法提取数据
              </p>
            </div>
          )}
        </>
      );
    }

    // 文本处理节点
    if (node.data.label === '文本处理') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
            <select
              value={config.operation || 'template'}
              onChange={(e) => handleConfigChange('operation', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="template">模板替换</option>
              <option value="split">分割文本</option>
              <option value="join">合并文本</option>
              <option value="replace">查找替换</option>
            </select>
          </div>

          {config.operation === 'template' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">模板</label>
              <VariableInput
                value={config.template || ''}
                onChange={(value) => handleConfigChange('template', value)}
                placeholder="今日热搜: #crawler_data"
                multiline
                rows={4}
                nodeId={node.id}
              />
            </div>
          )}

          {config.operation === 'split' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">分隔符</label>
              <input
                type="text"
                value={config.delimiter || ''}
                onChange={(e) => handleConfigChange('delimiter', e.target.value)}
                placeholder=","
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          )}

          {config.operation === 'replace' && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">查找</label>
                <input
                  type="text"
                  value={config.find || ''}
                  onChange={(e) => handleConfigChange('find', e.target.value)}
                  placeholder="要查找的文本"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">替换为</label>
                <VariableInput
                  value={config.replaceWith || ''}
                  onChange={(value) => handleConfigChange('replaceWith', value)}
                  placeholder="替换后的文本"
                  nodeId={node.id}
                />
              </div>
            </>
          )}
        </>
      );
    }

    // 数据合并节点
    if (node.data.label === '数据合并') {
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">合并模式</label>
          <select
            value={config.mode || 'object'}
            onChange={(e) => handleConfigChange('mode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="object">对象合并 (Object.assign)</option>
            <option value="array">数组合并 (concat)</option>
            <option value="deep">深度合并</option>
          </select>
          <p className="mt-1 text-xs text-gray-500">
            将多个输入数据源合并为一个输出
          </p>
        </div>
      );
    }

    // Custom: Code
    if (nodeType.type === 'Custom') {
      return (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">语言</label>
            <select
              value={config.language || 'javascript'}
              onChange={(e) => handleConfigChange('language', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">代码</label>
            <textarea
              value={config.code || ''}
              onChange={(e) => handleConfigChange('code', e.target.value)}
              rows={10}
              placeholder="// 输入代码..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>
        </>
      );
    }

    // Default: show raw config
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">配置 (JSON)</label>
        <textarea
          value={JSON.stringify(config, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              Object.keys(parsed).forEach(key => {
                handleConfigChange(key, parsed[key]);
              });
            } catch {}
          }}
          rows={8}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>
    );
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/40 z-[100]"
        onClick={onClose}
      />
      
      {/* 中央对话框 */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl flex flex-col pointer-events-auto"
          style={{ 
            width: 'min(600px, 90vw)', 
            maxHeight: '85vh',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Icon name={node.data.icon || 'Circle'} size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 text-lg">{node.data.label}</h3>
                {node.data.description && (
                  <p className="text-sm text-gray-500">{node.data.description}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Icon name="X" size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Config Form */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderConfigFields()}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50 rounded-b-2xl">
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Icon name="Trash2" size={16} />
              删除节点
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
