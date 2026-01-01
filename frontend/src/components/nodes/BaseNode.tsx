import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/workflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import { Icon } from '../Icon';
import { NodeExecutionResult } from './NodeExecutionResult';

interface BaseNodeProps extends NodeProps<NodeData> {
  color: string;
}

// 数据类型对应的颜色 - 参考 ComfyUI 的类型颜色系统
const dataTypeColors: Record<string, string> = {
  String: '#22c55e',   // green
  Number: '#3b82f6',   // blue
  Boolean: '#f59e0b',  // amber
  Object: '#a855f7',   // purple
  Array: '#ec4899',    // pink
  Any: '#64748b',      // slate
};

const BaseNode: React.FC<BaseNodeProps> = ({ id, data, selected, color }) => {
  const executionState = useWorkflowStore((s) => s.executionState[id]);
  const nodeOutput = useWorkflowStore((s) => s.nodeOutputs?.[id]);
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);

  // 获取输入输出端点
  const inputs = data.inputs || [];
  const outputs = data.outputs || [];

  // 计算节点高度 - 基于端口数量
  const portCount = Math.max(inputs.length, outputs.length, 1);
  const nodeBodyHeight = Math.max(40, portCount * 28 + 16);

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
    <div style={{ minWidth: 220, maxWidth: 320 }}>
      <div
        className={`
          relative bg-white rounded-xl shadow-lg border border-gray-200
          transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
          ${getStatusStyles()}
        `}
      >
      {/* Header - Dify 风格的紧凑头部 */}
      <div 
        className="px-3 py-2 rounded-t-xl flex items-center gap-2"
        style={{ backgroundColor: color }}
      >
        <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name={data.icon || 'Circle'} size={14} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">{data.label}</div>
        </div>
        
        {/* 执行状态指示器 */}
        {executionState && executionState !== 'idle' && (
          <div className="flex-shrink-0">
            {executionState === 'running' && (
              <Icon name="Loader2" size={14} color="white" className="animate-spin" />
            )}
            {executionState === 'success' && (
              <Icon name="Check" size={14} color="white" />
            )}
            {executionState === 'error' && (
              <Icon name="X" size={14} color="white" />
            )}
          </div>
        )}
      </div>

      {/* Body - 端口区域 */}
      <div 
        className="relative px-1 py-2"
        style={{ minHeight: nodeBodyHeight }}
      >
        {/* 左侧输入端口 */}
        <div className="absolute left-0 top-2 bottom-2 flex flex-col justify-around">
          {inputs.length === 0 ? (
            <div className="relative flex items-center h-7">
              <Handle
                type="target"
                position={Position.Left}
                id="input"
                className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white !-left-1.5"
              />
            </div>
          ) : (
            inputs.map((input) => (
              <div
                key={input.id}
                className="relative flex items-center h-7 group"
                onMouseEnter={() => setHoveredHandle(`input-${input.id}`)}
                onMouseLeave={() => setHoveredHandle(null)}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={input.id}
                  className="!w-3 !h-3 !border-2 !border-white !-left-1.5 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: dataTypeColors[input.data_type || 'Any'] || dataTypeColors.Any }}
                />
                {/* 端口标签 */}
                <span 
                  className="ml-3 text-xs text-gray-500 truncate max-w-[80px]"
                  title={`${input.name} (${input.data_type})`}
                >
                  {input.name}
                </span>
                
                {/* Hover Tooltip */}
                {hoveredHandle === `input-${input.id}` && (
                  <div className="absolute left-6 z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                    <span className="font-medium">{input.name}</span>
                    <span className="ml-1 text-gray-400">({input.data_type})</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 右侧输出端口 */}
        <div className="absolute right-0 top-2 bottom-2 flex flex-col justify-around">
          {outputs.length === 0 ? (
            <div className="relative flex items-center justify-end h-7">
              <Handle
                type="source"
                position={Position.Right}
                id="output"
                className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white !-right-1.5"
              />
            </div>
          ) : (
            outputs.map((output) => (
              <div
                key={output.id}
                className="relative flex items-center justify-end h-7 group"
                onMouseEnter={() => setHoveredHandle(`output-${output.id}`)}
                onMouseLeave={() => setHoveredHandle(null)}
              >
                {/* 端口标签 */}
                <span 
                  className="mr-3 text-xs text-gray-500 truncate max-w-[80px]"
                  title={`${output.name} (${output.data_type})`}
                >
                  {output.name}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.id}
                  className="!w-3 !h-3 !border-2 !border-white !-right-1.5 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: dataTypeColors[output.data_type || 'Any'] || dataTypeColors.Any }}
                />
                
                {/* Hover Tooltip */}
                {hoveredHandle === `output-${output.id}` && (
                  <div className="absolute right-6 z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                    <span className="font-medium">{output.name}</span>
                    <span className="ml-1 text-gray-400">({output.data_type})</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* 中间区域 - 简短描述或状态 */}
        {(inputs.length === 0 && outputs.length === 0) && data.description && (
          <div className="px-3 py-1">
            <p className="text-xs text-gray-400 text-center truncate">{data.description}</p>
          </div>
        )}
      </div>

      {/* 底部状态栏 - 仅在有输出时显示 */}
      {nodeOutput && executionState === 'success' && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="truncate">
              {typeof nodeOutput === 'object' && nodeOutput.text 
                ? nodeOutput.text.slice(0, 30) + '...'
                : '执行完成'}
            </span>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {executionState === 'error' && nodeOutput?.error && (
        <div className="px-3 py-1.5 border-t border-red-100 bg-red-50 rounded-b-xl">
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <Icon name="AlertCircle" size={12} />
            <span className="truncate">{nodeOutput.error}</span>
          </div>
        </div>
      )}
      </div>

      {/* 执行结果显示 */}
      <NodeExecutionResult 
        output={nodeOutput}
        executionState={executionState || 'idle'}
      />
    </div>
  );
};

export default memo(BaseNode);
