// src/components/NodeConfigPanel/AgentNodeConfig.tsx
// AI Agent 节点配置组件 - 简化版，工具/资源/规则通过节点连接传入

import React, { useState, useMemo } from 'react';
import { WorkflowNode } from '../../types/workflow';
import { Icon } from '../Icon';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { useWorkflowStore } from '../../stores/workflowStore';
import { VariableInput } from '../common/VariableInput';
import { AgentExecutionViewer } from '../AgentExecutionViewer';
import { AgentStep } from '../../services/agentExecutor';

interface AgentNodeConfigProps {
  node: WorkflowNode;
  onConfigChange: (key: string, value: any) => void;
}

export const AgentNodeConfig: React.FC<AgentNodeConfigProps> = ({
  node,
  onConfigChange,
}) => {
  const { getEnabledModels, defaultModelId } = useAISettingsStore();
  const workflow = useWorkflowStore((s) => s.workflow);
  const nodeOutputs = useWorkflowStore((s) => s.nodeOutputs);
  
  // 获取启用的模型列表
  const enabledModels = getEnabledModels('chat');
  
  // 直接从 store 获取最新的节点配置
  const config = useMemo(() => {
    const nodeFromStore = workflow?.nodes.find(n => n.id === node.id);
    return nodeFromStore?.data.config || node.data.config || {};
  }, [workflow?.nodes, node.id, node.data.config]);
  
  const [showExecutionViewer, setShowExecutionViewer] = useState(false);
  
  // 从 nodeOutputs 获取执行步骤
  const executionSteps: AgentStep[] = useMemo(() => {
    const output = nodeOutputs[node.id];
    return output?.steps || [];
  }, [nodeOutputs, node.id]);
  
  // 统计连接的工具、资源、规则数量
  const connectedCounts = useMemo(() => {
    if (!workflow) return { tools: 0, resources: 0, rules: 0 };
    
    const incomingEdges = workflow.edges.filter(e => e.target === node.id);
    let tools = 0, resources = 0, rules = 0;
    
    incomingEdges.forEach(edge => {
      const sourceNode = workflow.nodes.find(n => n.id === edge.source);
      if (sourceNode) {
        if (sourceNode.type === 'agentTool') tools++;
        else if (sourceNode.type === 'agentResource') resources++;
        else if (sourceNode.type === 'agentRule') rules++;
      }
    });
    
    return { tools, resources, rules };
  }, [workflow, node.id]);

  return (
    <div className="space-y-4">
      {/* 头部说明 */}
      <div className="p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg border border-violet-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
            <Icon name="Bot" size={20} className="text-white" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-800">AI Agent</h4>
            <p className="text-xs text-gray-600 mt-0.5">
              自主决策、调用工具、完成复杂任务
            </p>
          </div>
        </div>
      </div>

      {/* 模型选择 */}
      <div>
        <label className="text-sm font-medium text-gray-700 mb-1 block">AI 模型</label>
        {enabledModels.length === 0 ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">⚠️ 请先在设置中配置 AI 模型</p>
          </div>
        ) : (
          <select
            value={config.modelId || defaultModelId || ''}
            onChange={(e) => onConfigChange('modelId', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
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

      {/* 提示词配置 */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">系统提示词</label>
          <textarea
            value={config.systemPrompt || ''}
            onChange={(e) => onConfigChange('systemPrompt', e.target.value)}
            placeholder="定义 Agent 的角色、能力和行为准则..."
            rows={4}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">用户提示词</label>
          <VariableInput
            value={config.userPrompt || ''}
            onChange={(value) => onConfigChange('userPrompt', value)}
            placeholder="描述要完成的任务，可使用 # 引用变量..."
            multiline
            rows={4}
            nodeId={node.id}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            最大执行步数: {config.maxSteps || 10}
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={config.maxSteps || 10}
            onChange={(e) => onConfigChange('maxSteps', parseInt(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>1 步</span>
            <span>20 步</span>
          </div>
        </div>
      </div>

      {/* 输入端口状态 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-2">输入连接</div>
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2 rounded-lg text-center ${connectedCounts.tools > 0 ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Icon name="Wrench" size={16} className={connectedCounts.tools > 0 ? 'text-blue-600 mx-auto' : 'text-gray-400 mx-auto'} />
            <div className={`text-xs mt-1 ${connectedCounts.tools > 0 ? 'text-blue-700 font-medium' : 'text-gray-500'}`}>
              {connectedCounts.tools} 个工具
            </div>
          </div>
          <div className={`p-2 rounded-lg text-center ${connectedCounts.resources > 0 ? 'bg-purple-100' : 'bg-gray-100'}`}>
            <Icon name="FolderOpen" size={16} className={connectedCounts.resources > 0 ? 'text-purple-600 mx-auto' : 'text-gray-400 mx-auto'} />
            <div className={`text-xs mt-1 ${connectedCounts.resources > 0 ? 'text-purple-700 font-medium' : 'text-gray-500'}`}>
              {connectedCounts.resources} 个资源
            </div>
          </div>
          <div className={`p-2 rounded-lg text-center ${connectedCounts.rules > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
            <Icon name="Shield" size={16} className={connectedCounts.rules > 0 ? 'text-red-600 mx-auto' : 'text-gray-400 mx-auto'} />
            <div className={`text-xs mt-1 ${connectedCounts.rules > 0 ? 'text-red-700 font-medium' : 'text-gray-500'}`}>
              {connectedCounts.rules} 个规则
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          从左侧面板拖拽工具/资源/规则节点并连接到此 Agent
        </p>
      </div>

      {/* 输出配置 */}
      <div className="p-3 bg-gray-50 rounded-lg">
        <div className="text-xs text-gray-500 mb-2">输出</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded text-xs font-mono">
            #text
          </span>
          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
            #files
          </span>
          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-mono">
            #steps
          </span>
        </div>
      </div>

      {/* 执行过程查看按钮 */}
      {executionSteps.length > 0 && (
        <button
          onClick={() => setShowExecutionViewer(true)}
          className="w-full px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <Icon name="Eye" size={18} />
          查看执行过程 ({executionSteps.length} 步)
        </button>
      )}

      {/* 执行过程查看器 */}
      {showExecutionViewer && (
        <AgentExecutionViewer
          steps={executionSteps}
          isRunning={false}
          onClose={() => setShowExecutionViewer(false)}
        />
      )}
    </div>
  );
};

export default AgentNodeConfig;
