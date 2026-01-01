import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/workflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useVariableStore } from '../../stores/variableStore';
import { Icon } from '../Icon';

interface DisplayNodeProps extends NodeProps<NodeData> {
  color: string;
}

const DisplayNode: React.FC<DisplayNodeProps> = ({ id, data, selected, color }) => {
  const executionState = useWorkflowStore((s) => s.executionState[id]);
  const nodeOutput = useWorkflowStore((s) => s.nodeOutputs?.[id]);
  const variablesMap = useVariableStore((s) => s.variables);
  
  const [isExpanded, setIsExpanded] = useState(false);

  // 获取配置的变量
  const selectedVarId = data.config?.selectedVariableId;
  const selectedVar = selectedVarId ? variablesMap[selectedVarId] : undefined;

  // 格式化显示内容
  const formatDisplayContent = (output: any): string => {
    if (output === null || output === undefined) return '';
    if (typeof output === 'string') return output;
    if (typeof output === 'object') {
      if (output.text) return output.text;
      if (output.content) return output.content;
      if (output.message) return output.message;
      if (output.data) return typeof output.data === 'string' ? output.data : JSON.stringify(output.data, null, 2);
      if (output.error) return `错误: ${output.error}`;
      return JSON.stringify(output, null, 2);
    }
    return String(output);
  };

  // 获取要显示的内容
  const getDisplayContent = () => {
    if (selectedVar && selectedVar.value !== undefined) {
      return formatDisplayContent(selectedVar.value);
    }
    if (nodeOutput) {
      return formatDisplayContent(nodeOutput);
    }
    return '';
  };

  const displayContent = getDisplayContent();
  const hasContent = displayContent.length > 0;
  const isLongContent = displayContent.length > 200;

  // 状态样式
  const getStatusStyles = () => {
    switch (executionState) {
      case 'running':
        return 'ring-2 ring-blue-400 ring-offset-1';
      case 'success':
        return 'ring-2 ring-green-400 ring-offset-1';
      case 'error':
        return 'ring-2 ring-red-400 ring-offset-1';
      default:
        return '';
    }
  };

  return (
    <div
      className={`
        relative bg-white rounded-xl shadow-lg border border-gray-200
        transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
        ${getStatusStyles()}
      `}
      style={{ 
        minWidth: 240,
        maxWidth: isExpanded ? 500 : 320,
      }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 rounded-t-xl flex items-center gap-2 border-b border-gray-100"
        style={{ backgroundColor: `${color}10` }}
      >
        <div 
          className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color }}
        >
          <Icon name={data.icon || 'MessageSquare'} size={14} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-800 text-sm">{data.label}</div>
        </div>
        
        {/* 展开/收起按钮 */}
        {hasContent && isLongContent && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Icon 
              name={isExpanded ? 'Minimize2' : 'Maximize2'} 
              size={14} 
              className="text-gray-400" 
            />
          </button>
        )}
        
        {/* 状态指示器 */}
        {executionState && executionState !== 'idle' && (
          <div className="flex-shrink-0">
            {executionState === 'running' && (
              <Icon name="Loader2" size={14} className="text-blue-500 animate-spin" />
            )}
            {executionState === 'success' && (
              <Icon name="Check" size={14} className="text-green-500" />
            )}
            {executionState === 'error' && (
              <Icon name="X" size={14} className="text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Selected Variable Indicator */}
      {selectedVar && (
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-2 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium truncate">
              #{selectedVar.name}
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="p-3">
        {/* 无内容时的占位 */}
        {!hasContent && (
          <div className="py-4 text-center">
            <div 
              className="w-10 h-10 mx-auto mb-2 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${color}10` }}
            >
              <Icon name="MessageSquare" size={20} className="text-cyan-500" />
            </div>
            <p className="text-xs text-gray-400">
              {selectedVar ? '运行工作流后显示内容' : '请先选择要显示的变量'}
            </p>
          </div>
        )}

        {/* 显示内容 */}
        {hasContent && (
          <div 
            className={`
              bg-gray-50 rounded-lg p-3 text-sm text-gray-700 
              whitespace-pre-wrap break-words overflow-y-auto
              ${isExpanded ? 'max-h-[400px]' : 'max-h-[150px]'}
            `}
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {isExpanded ? displayContent : (
              displayContent.length > 200 
                ? displayContent.slice(0, 200) + '...' 
                : displayContent
            )}
          </div>
        )}

        {/* Token 用量信息 */}
        {nodeOutput?.usage && (
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Icon name="Zap" size={10} />
              {nodeOutput.usage.totalTokens || 0} tokens
            </span>
            {nodeOutput.latency && (
              <span className="flex items-center gap-1">
                <Icon name="Clock" size={10} />
                {nodeOutput.latency}ms
              </span>
            )}
          </div>
        )}
      </div>

      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white !-left-1.5"
      />

      {/* Output Handle (pass-through) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white !-right-1.5"
      />
    </div>
  );
};

export default memo(DisplayNode);
