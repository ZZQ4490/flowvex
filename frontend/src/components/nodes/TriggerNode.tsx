import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/workflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import { Icon } from '../Icon';
import { NodeExecutionResult } from './NodeExecutionResult';

interface TriggerNodeProps extends NodeProps<NodeData> {
  color: string;
}

const TriggerNode: React.FC<TriggerNodeProps> = ({ id, data, selected, color }) => {
  const executionState = useWorkflowStore((s) => s.executionState[id]);
  const runWorkflow = useWorkflowStore((s) => s.runWorkflow);

  const isRunning = executionState === 'running';

  const handleRun = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isRunning && runWorkflow) {
      runWorkflow();
    }
  };

  // 获取触发器类型的描述
  const getTriggerInfo = () => {
    const config = data.config;
    if (data.label === 'Webhook') {
      return { icon: 'Webhook', text: `${config.method || 'POST'} ${config.path || '/webhook'}` };
    }
    if (data.label === '定时触发') {
      return { icon: 'Clock', text: config.cron || '0 * * * *' };
    }
    return { icon: 'Play', text: '手动启动' };
  };

  const triggerInfo = getTriggerInfo();

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
    <div style={{ minWidth: 200, maxWidth: 320 }}>
      <div
        className={`
          relative bg-white rounded-xl shadow-lg border-2 transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
          ${getStatusStyles()}
        `}
        style={{ 
          borderColor: color,
        }}
      >
      {/* 左侧装饰条 - 表示这是起始节点 */}
      <div 
        className="absolute -left-1 top-3 bottom-3 w-1 rounded-full"
        style={{ backgroundColor: color }}
      />

      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon name={data.icon || 'Play'} size={20} className="text-emerald-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800 text-sm">{data.label}</div>
          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Icon name={triggerInfo.icon} size={10} />
            <span className="truncate">{triggerInfo.text}</span>
          </div>
        </div>
        
        {/* 状态指示器 */}
        {executionState && executionState !== 'idle' && (
          <div className="flex-shrink-0">
            {executionState === 'running' && (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <Icon name="Loader2" size={14} className="text-blue-500 animate-spin" />
              </div>
            )}
            {executionState === 'success' && (
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                <Icon name="Check" size={14} className="text-green-500" />
              </div>
            )}
            {executionState === 'error' && (
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center">
                <Icon name="X" size={14} className="text-red-500" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* 运行按钮 - 手动触发时显示 */}
      {data.label === '手动触发' && (
        <div className="px-4 pb-3">
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={`
              w-full py-2 rounded-lg text-sm font-medium
              flex items-center justify-center gap-2
              transition-all duration-200
              ${isRunning 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'text-white hover:opacity-90 active:scale-[0.98]'
              }
            `}
            style={{ backgroundColor: isRunning ? undefined : color }}
          >
            {isRunning ? (
              <>
                <Icon name="Loader2" size={14} className="animate-spin" />
                运行中...
              </>
            ) : (
              <>
                <Icon name="Play" size={14} />
                运行工作流
              </>
            )}
          </button>
        </div>
      )}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!w-3.5 !h-3.5 !bg-emerald-500 !border-2 !border-white !-right-1.5"
      />
      </div>

      {/* 执行结果显示 */}
      <NodeExecutionResult 
        output={useWorkflowStore.getState().nodeOutputs?.[id]}
        executionState={executionState || 'idle'}
      />
    </div>
  );
};

export default memo(TriggerNode);
