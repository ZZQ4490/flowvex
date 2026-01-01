// Agent 规则节点配置组件
import React from 'react';
import { WorkflowNode } from '../../types/workflow';
import { Icon } from '../Icon';

interface AgentRuleConfigProps {
  node: WorkflowNode;
  onConfigChange: (key: string, value: any) => void;
}

export const AgentRuleConfig: React.FC<AgentRuleConfigProps> = ({
  node,
  onConfigChange,
}) => {
  const config = node.data.config;
  const ruleType = config.ruleType || 'custom';

  const handleAddRule = () => {
    const rules = config.rules || [];
    onConfigChange('rules', [...rules, '']);
  };

  const handleUpdateRule = (index: number, value: string) => {
    const rules = [...(config.rules || [])];
    rules[index] = value;
    onConfigChange('rules', rules);
  };

  const handleRemoveRule = (index: number) => {
    const rules = [...(config.rules || [])];
    rules.splice(index, 1);
    onConfigChange('rules', rules);
  };

  const renderRuleSpecificConfig = () => {
    switch (ruleType) {
      case 'behavior':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">优先级</label>
              <select
                value={config.priority || 1}
                onChange={(e) => onConfigChange('priority', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <option value={0}>最高 (0)</option>
                <option value={1}>高 (1)</option>
                <option value={2}>中 (2)</option>
                <option value={3}>低 (3)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">行为规则</label>
                <button
                  onClick={handleAddRule}
                  className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <Icon name="Plus" size={12} />
                  添加规则
                </button>
              </div>
              <div className="space-y-2">
                {(config.rules || []).length === 0 ? (
                  <div className="p-3 bg-gray-50 rounded-lg text-center">
                    <p className="text-sm text-gray-500">暂无规则，点击上方添加</p>
                  </div>
                ) : (
                  (config.rules || []).map((rule: string, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 mt-1">
                        {index + 1}
                      </span>
                      <textarea
                        value={rule}
                        onChange={(e) => handleUpdateRule(index, e.target.value)}
                        placeholder="输入行为规则..."
                        rows={2}
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                      />
                      <button
                        onClick={() => handleRemoveRule(index)}
                        className="p-1 hover:bg-red-50 rounded mt-1"
                      >
                        <Icon name="X" size={14} className="text-red-400" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">
                <strong>示例规则：</strong>
                <br />• 始终使用礼貌和专业的语气
                <br />• 在执行任何操作前先确认用户意图
                <br />• 不要泄露系统内部信息
              </p>
            </div>
          </div>
        );

      case 'format':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">输出格式</label>
              <select
                value={config.outputFormat || 'text'}
                onChange={(e) => onConfigChange('outputFormat', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="text">纯文本</option>
                <option value="markdown">Markdown</option>
                <option value="json">JSON</option>
                <option value="html">HTML</option>
              </select>
            </div>
            {config.outputFormat === 'json' && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">JSON Schema (可选)</label>
                <textarea
                  value={config.schema ? JSON.stringify(config.schema, null, 2) : ''}
                  onChange={(e) => {
                    try {
                      const schema = e.target.value ? JSON.parse(e.target.value) : null;
                      onConfigChange('schema', schema);
                    } catch {}
                  }}
                  placeholder='{\n  "type": "object",\n  "properties": {...}\n}'
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">格式说明</label>
              <textarea
                value={config.formatInstructions || ''}
                onChange={(e) => onConfigChange('formatInstructions', e.target.value)}
                placeholder="描述输出格式的具体要求..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-3">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="ShieldAlert" size={16} className="text-red-500" />
                <span className="text-sm font-medium text-red-700">安全规则 (最高优先级)</span>
              </div>
              <p className="text-xs text-red-600">这些规则将优先于其他所有规则执行</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">禁止话题</label>
              <textarea
                value={(config.blockedTopics || []).join('\n')}
                onChange={(e) => onConfigChange('blockedTopics', e.target.value.split('\n').filter(Boolean))}
                placeholder="每行一个禁止话题&#10;例如：&#10;政治敏感&#10;暴力内容"
                rows={4}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">允许的域名 (留空表示全部允许)</label>
              <textarea
                value={(config.allowedDomains || []).join('\n')}
                onChange={(e) => onConfigChange('allowedDomains', e.target.value.split('\n').filter(Boolean))}
                placeholder="每行一个域名&#10;例如：&#10;example.com&#10;api.example.com"
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">最大输出长度</label>
              <input
                type="number"
                value={config.maxOutputLength || 10000}
                onChange={(e) => onConfigChange('maxOutputLength', parseInt(e.target.value))}
                min={100}
                max={100000}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">优先级</label>
              <select
                value={config.priority || 5}
                onChange={(e) => onConfigChange('priority', parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value={0}>最高 (0)</option>
                <option value={1}>高 (1)</option>
                <option value={2}>中 (2)</option>
                <option value={3}>低 (3)</option>
                <option value={5}>默认 (5)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">规则内容</label>
              <textarea
                value={config.content || ''}
                onChange={(e) => onConfigChange('content', e.target.value)}
                placeholder="输入自定义规则文本...&#10;&#10;可以是任何你希望 Agent 遵守的指令或约束"
                rows={8}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getRuleIcon = () => {
    const icons: Record<string, string> = {
      behavior: 'Shield',
      format: 'FileJson',
      safety: 'ShieldAlert',
      custom: 'ScrollText',
    };
    return icons[ruleType] || 'Shield';
  };

  const getRuleColor = () => {
    const colors: Record<string, { from: string; to: string; border: string; iconBg: string }> = {
      behavior: { from: 'from-red-50', to: 'to-orange-50', border: 'border-red-200', iconBg: 'from-red-500 to-orange-600' },
      format: { from: 'from-purple-50', to: 'to-violet-50', border: 'border-purple-200', iconBg: 'from-purple-500 to-violet-600' },
      safety: { from: 'from-red-50', to: 'to-rose-50', border: 'border-red-200', iconBg: 'from-red-600 to-rose-700' },
      custom: { from: 'from-gray-50', to: 'to-slate-50', border: 'border-gray-200', iconBg: 'from-gray-500 to-slate-600' },
    };
    return colors[ruleType] || colors.custom;
  };

  const color = getRuleColor();

  return (
    <div className="space-y-4">
      {/* 规则头部 */}
      <div className={`p-3 bg-gradient-to-br ${color.from} ${color.to} rounded-lg border ${color.border}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 bg-gradient-to-br ${color.iconBg} rounded-lg flex items-center justify-center shadow-lg`}>
            <Icon name={getRuleIcon()} size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">{node.data.label}</h4>
            <p className="text-xs text-gray-600">Agent 必须遵守的规则</p>
          </div>
        </div>
      </div>

      {/* 规则特定配置 */}
      {renderRuleSpecificConfig()}

      {/* 输出说明 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-2">输出</div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-mono">
            #rules
          </span>
          <span className="text-xs text-gray-500">→ 连接到 AI Agent 的规则输入</span>
        </div>
      </div>
    </div>
  );
};

export default AgentRuleConfig;
