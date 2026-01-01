import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/workflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import { Icon } from '../Icon';

interface GroupNodeProps extends NodeProps<NodeData> {
  color?: string;
}

// 数据类型对应的颜色
const dataTypeColors: Record<string, string> = {
  String: '#22c55e',
  Number: '#3b82f6',
  Boolean: '#f59e0b',
  Object: '#a855f7',
  Array: '#ec4899',
  Any: '#64748b',
};

const GroupNode: React.FC<GroupNodeProps> = ({ id, data, selected }) => {
  const executionState = useWorkflowStore((s) => s.executionState[id]);
  const nodeOutput = useWorkflowStore((s) => s.nodeOutputs?.[id]);
  const [isHovered, setIsHovered] = useState(false);

  // 从 config 获取颜色和子节点数量
  const nodeColor = data.config?.color || '#6366f1';
  const subNodeCount = data.config?.subNodeCount || 0;

  // 获取输入输出端点
  const inputs = data.inputs || [{ id: 'input', name: '输入', data_type: 'Any' }];
  const outputs = data.outputs || [{ id: 'output', name: '输出', data_type: 'Any' }];

  // 计算节点高度
  const portCount = Math.max(inputs.length, outputs.length, 1);
  const nodeBodyHeight = Math.max(80, portCount * 28 + 40);

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
        relative bg-white rounded-2xl shadow-lg border-2 border-dashed
        transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
        ${getStatusStyles()}
      `}
      style={{ 
        minWidth: 240, 
        maxWidth: 320,
        borderColor: nodeColor,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 rounded-t-xl flex items-center gap-3"
        style={{ backgroundColor: nodeColor }}
      >
        <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon name="Layers" size={18} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold text-sm truncate">{data.label}</div>
          <div className="text-white/70 text-xs">
            {subNodeCount} 个节点
          </div>
        </div>
        
        {/* 执行状态指示器 */}
        {executionState && executionState !== 'idle' && (
          <div className="flex-shrink-0">
            {executionState === 'running' && (
              <Icon name="Loader2" size={16} color="white" className="animate-spin" />
            )}
            {executionState === 'success' && (
              <Icon name="CheckCircle" size={16} color="white" />
            )}
            {executionState === 'error' && (
              <Icon name="XCircle" size={16} color="white" />
            )}
          </div>
        )}
      </div>

      {/* Body - 端口区域 */}
      <div 
        className="relative px-2 py-3"
        style={{ minHeight: nodeBodyHeight }}
      >
        {/* 左侧输入端口 */}
        <div className="absolute left-0 top-3 bottom-3 flex flex-col justify-around">
          {inputs.map((input) => (
            <div
              key={input.id}
              className="relative flex items-center h-7 group"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={input.id}
                className="!w-3 !h-3 !border-2 !border-white !-left-1.5 transition-transform group-hover:scale-125"
                style={{ backgroundColor: dataTypeColors[input.data_type] || dataTypeColors.Any }}
              />
              <span 
                className="ml-3 text-xs text-gray-500 truncate max-w-[100px]"
                title={`${input.name} (${input.data_type})`}
              >
                {input.name}
              </span>
            </div>
          ))}
        </div>

        {/* 右侧输出端口 */}
        <div className="absolute right-0 top-3 bottom-3 flex flex-col justify-around">
          {outputs.map((output) => (
            <div
              key={output.id}
              className="relative flex items-center justify-end h-7 group"
            >
              <span 
                className="mr-3 text-xs text-gray-500 truncate max-w-[100px]"
                title={`${output.name} (${output.data_type})`}
              >
                {output.name}
              </span>
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                className="!w-3 !h-3 !border-2 !border-white !-right-1.5 transition-transform group-hover:scale-125"
                style={{ backgroundColor: dataTypeColors[output.data_type] || dataTypeColors.Any }}
              />
            </div>
          ))}
        </div>

        {/* 中间区域 - 描述 */}
        {data.description && (
          <div className="px-8 py-2">
            <p className="text-xs text-gray-400 text-center line-clamp-2">{data.description}</p>
          </div>
        )}
      </div>

      {/* 底部操作栏 - hover 时显示 */}
      {isHovered && (
        <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 rounded-b-xl flex items-center justify-center gap-4">
          <button
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
            title="编辑子流程"
          >
            <Icon name="Edit2" size={12} />
            编辑
          </button>
        </div>
      )}

      {/* 执行成功状态 */}
      {!isHovered && nodeOutput && executionState === 'success' && (
        <div className="px-3 py-2 border-t border-gray-100 bg-green-50 rounded-b-xl">
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span>子流程执行完成</span>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {executionState === 'error' && nodeOutput?.error && (
        <div className="px-3 py-2 border-t border-red-100 bg-red-50 rounded-b-xl">
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <Icon name="AlertCircle" size={12} />
            <span className="truncate">{nodeOutput.error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(GroupNode);
