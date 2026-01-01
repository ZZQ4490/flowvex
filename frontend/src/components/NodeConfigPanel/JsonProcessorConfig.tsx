// src/components/NodeConfigPanel/JsonProcessorConfig.tsx
// JSON处理器配置组件 - 可视化按钮操作面板

import React, { useState, useMemo } from 'react';
import { WorkflowNode } from '../../types/workflow';
import { Icon } from '../Icon';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { callAIModel } from '../../services/aiService';

interface OutputField {
  id: string;
  name: string;
  path: string;
  description?: string;
}

interface JsonProcessorConfigProps {
  node: WorkflowNode;
  onConfigChange: (key: string, value: any) => void;
}

interface JsonTreeNode {
  key: string;
  path: string;
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';
  value?: any;
  children?: JsonTreeNode[];
  arrayLength?: number;
}

export const JsonProcessorConfig: React.FC<JsonProcessorConfigProps> = ({
  node,
  onConfigChange,
}) => {
  const { updateNodeOutputs, nodeOutputs, workflow } = useWorkflowStore();
  const { getEnabledModels, getModelById, getProviderById, defaultModelId } = useAISettingsStore();
  const config = node.data.config;
  const outputFields: OutputField[] = config.outputFields || [
    { id: 'field_1', name: '字段1', path: '', description: '' },
  ];

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sampleJson, setSampleJson] = useState('');
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']));
  
  // AI 生成相关状态
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string>(defaultModelId || '');
  
  const enabledModels = getEnabledModels('chat');

  const upstreamData = useMemo(() => {
    if (!workflow) return null;
    const incomingEdge = workflow.edges.find(e => e.target === node.id);
    if (!incomingEdge) return null;
    return nodeOutputs[incomingEdge.source] || null;
  }, [workflow, node.id, nodeOutputs]);

  const jsonData = parsedJson || upstreamData;

  const handleParseSample = () => {
    try {
      setParsedJson(JSON.parse(sampleJson));
      setParseError(null);
      setExpandedPaths(new Set(['']));
    } catch {
      setParseError('JSON格式错误');
      setParsedJson(null);
    }
  };

  const buildJsonTree = (data: any, path = '', key = 'root'): JsonTreeNode | null => {
    if (data === null) return { key, path, type: 'null', value: null };
    if (Array.isArray(data)) {
      return {
        key, path, type: 'array', arrayLength: data.length,
        children: data.slice(0, 20).map((item, idx) => 
          buildJsonTree(item, path ? `${path}[${idx}]` : `[${idx}]`, `[${idx}]`)
        ).filter(Boolean) as JsonTreeNode[],
      };
    }
    if (typeof data === 'object') {
      return {
        key, path, type: 'object',
        children: Object.keys(data).slice(0, 50).map(k => 
          buildJsonTree(data[k], path ? `${path}.${k}` : k, k)
        ).filter(Boolean) as JsonTreeNode[],
      };
    }
    return { key, path, type: typeof data as any, value: data };
  };

  const jsonTree = jsonData ? buildJsonTree(jsonData) : null;

  const handleAddFieldFromPath = (path: string, name: string) => {
    const newFields = [...outputFields, { id: `field_${Date.now()}`, name, path, description: '' }];
    onConfigChange('outputFields', newFields);
    updateOutputPorts(newFields);
  };

  const handleAddField = () => {
    const newFields = [...outputFields, { id: `field_${Date.now()}`, name: `字段${outputFields.length + 1}`, path: '', description: '' }];
    onConfigChange('outputFields', newFields);
    updateOutputPorts(newFields);
  };

  const handleRemoveField = (fieldId: string) => {
    if (outputFields.length <= 1) return;
    const newFields = outputFields.filter(f => f.id !== fieldId);
    onConfigChange('outputFields', newFields);
    updateOutputPorts(newFields);
  };

  const handleFieldChange = (fieldId: string, key: keyof OutputField, value: string) => {
    const newFields = outputFields.map(f => f.id === fieldId ? { ...f, [key]: value } : f);
    onConfigChange('outputFields', newFields);
    if (key === 'name') updateOutputPorts(newFields);
  };

  const updateOutputPorts = (fields: OutputField[]) => {
    updateNodeOutputs(node.id, fields.map(f => ({
      id: f.id, name: f.name || f.id, data_type: 'Any', dataType: 'Any',
      required: false, multiple: false, description: `提取路径: ${f.path}`,
    })));
  };

  // AI 生成解析规则
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      setAiError('请输入需求描述');
      return;
    }
    
    if (!selectedModelId) {
      setAiError('请先在设置中配置 AI 模型');
      return;
    }
    
    const model = getModelById(selectedModelId);
    if (!model) {
      setAiError('所选模型不存在');
      return;
    }
    
    const provider = getProviderById(model.providerId);
    if (!provider) {
      setAiError('模型提供商配置不存在');
      return;
    }
    
    setAiGenerating(true);
    setAiError(null);
    
    // 构建 JSON 结构描述
    const jsonSample = jsonData ? JSON.stringify(jsonData, null, 2).slice(0, 3000) : '(无示例数据)';
    
    const systemPrompt = `你是一个 JSON 数据解析专家。用户会给你一段 JSON 数据示例和他们的需求，你需要生成对应的字段提取规则。

请严格按照以下 JSON 格式返回结果，不要包含任何其他文字：
{
  "fields": [
    {
      "name": "字段名称",
      "path": "JSON路径表达式",
      "description": "字段说明"
    }
  ]
}

JSON路径规则：
- 使用点号访问对象属性：data.title
- 使用方括号访问数组元素：results[0]
- 使用 [*] 提取数组中所有元素的某个属性：results[*].title
- 嵌套访问：data.items[0].name

示例：
- 提取所有文章标题：results[*].title
- 提取第一条结果的内容：results[0].content
- 提取嵌套数据：data.response.items[*].name`;

    const userPrompt = `JSON 数据示例：
\`\`\`json
${jsonSample}
\`\`\`

用户需求：${aiPrompt}

请根据上述 JSON 结构和用户需求，生成字段提取规则。`;

    try {
      const result = await callAIModel(provider, model, {
        systemPrompt,
        userPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });
      
      if (!result.success) {
        throw new Error(result.error || 'AI 调用失败');
      }
      
      // 解析 AI 返回的 JSON
      const responseText = result.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI 返回格式错误，无法解析');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.fields || !Array.isArray(parsed.fields)) {
        throw new Error('AI 返回的字段格式不正确');
      }
      
      // 生成新的输出字段
      const newFields: OutputField[] = parsed.fields.map((f: any, idx: number) => ({
        id: `field_${Date.now()}_${idx}`,
        name: f.name || `字段${idx + 1}`,
        path: f.path || '',
        description: f.description || '',
      }));
      
      if (newFields.length === 0) {
        throw new Error('AI 未生成任何字段');
      }
      
      // 更新配置
      onConfigChange('outputFields', newFields);
      updateOutputPorts(newFields);
      
      setShowAIDialog(false);
      setAiPrompt('');
      
    } catch (error) {
      setAiError(error instanceof Error ? error.message : '生成失败');
    } finally {
      setAiGenerating(false);
    }
  };

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    newExpanded.has(path) ? newExpanded.delete(path) : newExpanded.add(path);
    setExpandedPaths(newExpanded);
  };

  const expandAll = () => {
    if (!jsonTree) return;
    const allPaths = new Set<string>(['']);
    const collect = (n: JsonTreeNode) => { allPaths.add(n.path); n.children?.forEach(collect); };
    collect(jsonTree);
    setExpandedPaths(allPaths);
  };

  const isPathSelected = (path: string) => outputFields.some(f => f.path === path);

  const typeColors: Record<string, string> = {
    string: 'text-green-600', number: 'text-blue-600', boolean: 'text-amber-600',
    null: 'text-gray-400', object: 'text-orange-600', array: 'text-purple-600',
  };
  const typeIcons: Record<string, string> = {
    string: 'Type', number: 'Hash', boolean: 'ToggleLeft',
    null: 'Circle', object: 'Braces', array: 'List',
  };

  const renderTreeNode = (n: JsonTreeNode, depth = 0, fullscreen = false): React.ReactNode => {
    const isExpanded = expandedPaths.has(n.path);
    const hasChildren = n.children && n.children.length > 0;
    const isSelected = isPathSelected(n.path);

    return (
      <div key={n.path || 'root'}>
        <div 
          className={`flex items-center gap-1 py-1.5 px-2 rounded hover:bg-gray-100 group ${isSelected ? 'bg-purple-50' : ''}`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(n.path)} className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600">
              <Icon name={isExpanded ? 'ChevronDown' : 'ChevronRight'} size={14} />
            </button>
          ) : <span className="w-5" />}
          
          <Icon name={typeIcons[n.type]} size={fullscreen ? 16 : 14} className={typeColors[n.type]} />
          <span className={`font-medium text-gray-700 ${fullscreen ? 'text-base' : 'text-sm'}`}>{n.key}</span>
          {n.type === 'array' && <span className="text-xs text-purple-500">[{n.arrayLength}]</span>}
          
          {n.value !== undefined && (
            <span className={`${fullscreen ? 'text-sm max-w-96' : 'text-xs max-w-32'} truncate ${typeColors[n.type]}`}>
              {n.type === 'string' ? `"${String(n.value).slice(0, fullscreen ? 100 : 30)}..."` : String(n.value)}
            </span>
          )}
          
          {n.path && (
            <button
              onClick={() => handleAddFieldFromPath(n.path, n.key.replace(/^\[|\]$/g, '') || '字段')}
              disabled={isSelected}
              className={`ml-auto px-2 py-1 ${fullscreen ? 'text-sm' : 'text-xs'} rounded ${
                isSelected ? 'bg-purple-100 text-purple-400' : 'bg-purple-500 text-white hover:bg-purple-600 opacity-0 group-hover:opacity-100'
              }`}
            >
              {isSelected ? '已添加' : '+ 添加'}
            </button>
          )}
        </div>
        {hasChildren && isExpanded && n.children!.map(c => renderTreeNode(c, depth + 1, fullscreen))}
      </div>
    );
  };

  const quickButtons = [
    { label: '所有文章内容', path: 'results[*].content', icon: 'FileText' },
    { label: '所有标题', path: 'results[*].title', icon: 'Heading' },
    { label: '所有URL', path: 'results[*].url', icon: 'Link' },
    { label: '截图数据', path: 'screenshot', icon: 'Image' },
    { label: '第一条结果', path: 'results[0]', icon: 'ListOrdered' },
    { label: '深度爬取结果', path: 'deepScrapeResults', icon: 'Layers' },
  ];

  return (
    <div className="space-y-4">
      {/* AI 生成对话框 */}
      {showAIDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Icon name="Sparkles" size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">AI 生成解析规则</h2>
                  <p className="text-sm text-gray-500">描述你想提取的数据</p>
                </div>
              </div>
              <button onClick={() => setShowAIDialog(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <Icon name="X" size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              {/* 模型选择 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">选择 AI 模型</label>
                {enabledModels.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-700">
                      ⚠️ 未配置 AI 模型，请先在设置中添加 AI 提供商和模型
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedModelId}
                    onChange={(e) => setSelectedModelId(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">选择模型...</option>
                    {enabledModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.providerName} - {m.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* JSON 预览 */}
              {jsonData && (
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">当前 JSON 数据预览</label>
                  <div className="p-2 bg-gray-50 rounded-lg border max-h-32 overflow-y-auto">
                    <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap">
                      {JSON.stringify(jsonData, null, 2).slice(0, 500)}
                      {JSON.stringify(jsonData, null, 2).length > 500 && '...'}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* 需求输入 */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">描述你的需求</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="例如：提取所有模型的名称、价格和上下文长度"
                  rows={4}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
              
              {/* 示例提示 */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 font-medium mb-2">💡 示例需求：</p>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• 提取所有文章的标题和链接</li>
                  <li>• 获取每个模型的名称、价格、上下文窗口大小</li>
                  <li>• 提取搜索结果中的标题、描述和URL</li>
                  <li>• 获取第一条数据的详细信息</li>
                </ul>
              </div>
              
              {/* 错误提示 */}
              {aiError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{aiError}</p>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => setShowAIDialog(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleAIGenerate}
                disabled={aiGenerating || !selectedModelId || !aiPrompt.trim()}
                className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg flex items-center gap-2"
              >
                {aiGenerating ? (
                  <>
                    <Icon name="Loader2" size={14} className="animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Icon name="Sparkles" size={14} />
                    生成规则
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全屏模态框 */}
      {isFullscreen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-xl shadow-2xl w-[90vw] h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Icon name="Braces" size={20} className="text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">JSON数据结构浏览器</h2>
                  <p className="text-sm text-gray-500">点击字段添加到输出端口</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={expandAll} className="px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg">全部展开</button>
                <button onClick={() => setExpandedPaths(new Set(['']))} className="px-3 py-1.5 text-sm hover:bg-gray-100 rounded-lg">全部折叠</button>
                <button onClick={() => setIsFullscreen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <Icon name="X" size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 overflow-auto p-4 bg-gray-50">
                {jsonTree ? (
                  <div className="bg-white rounded-lg border min-h-full">{renderTreeNode(jsonTree, 0, true)}</div>
                ) : (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <Icon name="FileJson" size={48} className="text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">暂无JSON数据</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-80 border-l bg-white flex flex-col">
                <div className="p-4 border-b">
                  <h3 className="text-sm font-semibold mb-3">快捷提取</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {quickButtons.map((btn, i) => (
                      <button key={i} onClick={() => handleAddFieldFromPath(btn.path, btn.label)} disabled={isPathSelected(btn.path)}
                        className={`px-2 py-2 text-xs rounded-lg border flex items-center gap-1.5 ${isPathSelected(btn.path) ? 'bg-gray-100 text-gray-400' : 'hover:bg-purple-50'}`}>
                        <Icon name={btn.icon} size={12} className={isPathSelected(btn.path) ? 'text-gray-400' : 'text-purple-500'} />
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">已选字段 ({outputFields.length})</h3>
                    <button onClick={handleAddField} className="text-xs text-purple-600">+ 手动添加</button>
                  </div>
                  <div className="space-y-2">
                    {outputFields.map((f, i) => (
                      <div key={f.id} className="p-2 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-purple-100 rounded text-xs font-medium text-purple-600 flex items-center justify-center">{i + 1}</span>
                            <input value={f.name} onChange={e => handleFieldChange(f.id, 'name', e.target.value)}
                              className="px-1.5 py-0.5 border rounded text-sm w-24 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                          </div>
                          {outputFields.length > 1 && (
                            <button onClick={() => handleRemoveField(f.id)} className="p-1 hover:bg-red-50 rounded">
                              <Icon name="X" size={12} className="text-red-400" />
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 font-mono truncate pl-7">{f.path || '(未设置)'}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {!upstreamData && (
                  <div className="p-4 border-t">
                    <h3 className="text-sm font-semibold mb-2">粘贴示例JSON</h3>
                    <textarea value={sampleJson} onChange={e => setSampleJson(e.target.value)} placeholder='{"results": [...]}' rows={4}
                      className="w-full px-2 py-1.5 border rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" />
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={handleParseSample} disabled={!sampleJson.trim()}
                        className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-xs rounded-lg">解析</button>
                      {parseError && <span className="text-xs text-red-500">{parseError}</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 说明 + AI 生成按钮 */}
      <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
              <Icon name="Split" size={20} className="text-purple-500" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-800">JSON处理器</h4>
              <p className="text-xs text-gray-600">点击字段自动创建输出端口</p>
            </div>
          </div>
          <button
            onClick={() => setShowAIDialog(true)}
            className="px-3 py-2 text-sm bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg flex items-center gap-1.5 shadow-md transition-all hover:shadow-lg"
          >
            <Icon name="Sparkles" size={16} />
            AI 生成规则
          </button>
        </div>
      </div>

      {/* 快捷提取 */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">快捷提取</label>
        <div className="grid grid-cols-2 gap-2">
          {quickButtons.slice(0, 4).map((btn, i) => (
            <button key={i} onClick={() => handleAddFieldFromPath(btn.path, btn.label)} disabled={isPathSelected(btn.path)}
              className={`px-3 py-2 text-xs rounded-lg border flex items-center gap-2 ${isPathSelected(btn.path) ? 'bg-gray-100 text-gray-400' : 'hover:bg-purple-50'}`}>
              <Icon name={btn.icon} size={14} className={isPathSelected(btn.path) ? 'text-gray-400' : 'text-purple-500'} />
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* JSON数据结构 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">JSON数据结构</label>
          <div className="flex items-center gap-2">
            {upstreamData && <span className="text-xs text-green-600 flex items-center gap-1"><Icon name="CheckCircle" size={12} />已获取</span>}
          </div>
        </div>
        
        {!upstreamData && !parsedJson && (
          <div className="space-y-2">
            <textarea value={sampleJson} onChange={e => setSampleJson(e.target.value)} placeholder='粘贴示例JSON...' rows={3}
              className="w-full px-3 py-2 border rounded-lg font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500" />
            <button onClick={handleParseSample} disabled={!sampleJson.trim()}
              className="px-3 py-1.5 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white text-xs rounded-lg">解析JSON</button>
          </div>
        )}

        {jsonTree ? (
          <div className="relative border rounded-lg bg-white">
            {/* 全屏按钮 - 右上角 */}
            <button 
              onClick={() => setIsFullscreen(true)} 
              className="absolute top-2 right-2 z-10 p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-md shadow-sm flex items-center gap-1"
              title="全屏查看"
            >
              <Icon name="Maximize2" size={14} />
            </button>
            <div className="max-h-48 overflow-y-auto pt-1">
              {renderTreeNode(jsonTree)}
            </div>
          </div>
        ) : !sampleJson && (
          <div className="p-4 bg-gray-50 rounded-lg text-center cursor-pointer hover:bg-gray-100 border-2 border-dashed border-gray-200" onClick={() => setIsFullscreen(true)}>
            <Icon name="FileJson" size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">暂无数据</p>
            <p className="text-xs text-gray-400 mt-1">运行工作流后数据将显示在这里</p>
          </div>
        )}
      </div>

      {/* 输出端口 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">输出端口 ({outputFields.length})</label>
          <button onClick={handleAddField} className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg flex items-center gap-1">
            <Icon name="Plus" size={12} />手动添加
          </button>
        </div>
        <div className="space-y-2">
          {outputFields.map((f, i) => (
            <div key={f.id} className="p-2 bg-white border rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-purple-100 rounded flex items-center justify-center">
                  <span className="text-xs font-medium text-purple-600">{i + 1}</span>
                </div>
                <input value={f.name} onChange={e => handleFieldChange(f.id, 'name', e.target.value)} placeholder="名称"
                  className="px-2 py-1 border rounded text-sm w-24 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                <span className="text-xs text-gray-400 font-mono truncate max-w-32">{f.path || '...'}</span>
              </div>
              {outputFields.length > 1 && (
                <button onClick={() => handleRemoveField(f.id)} className="p-1 hover:bg-red-50 rounded">
                  <Icon name="Trash2" size={12} className="text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default JsonProcessorConfig;
