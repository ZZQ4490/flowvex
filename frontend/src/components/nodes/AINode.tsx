import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/workflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useAISettingsStore } from '../../stores/aiSettingsStore';
import { Icon } from '../Icon';
import { AgentStep } from '../../services/agentExecutor';

interface AINodeProps extends NodeProps<NodeData> {
  color: string;
}

// 数据类型颜色
const dataTypeColors: Record<string, string> = {
  String: '#22c55e',
  Number: '#3b82f6',
  Boolean: '#f59e0b',
  Object: '#a855f7',
  Array: '#ec4899',
  Any: '#64748b',
};

// 工具图标映射
const toolIcons: Record<string, string> = {
  get_current_time: 'Clock',
  web_search: 'Search',
  http_request: 'Globe',
  scrape_webpage: 'FileSearch',
  execute_code: 'Code',
  read_file: 'FileText',
  write_file: 'FilePlus',
  list_files: 'FolderOpen',
  delete_file: 'Trash2',
  thinking: 'Brain',
  response: 'MessageSquare',
};

// 执行步骤组件
const ExecutionStep: React.FC<{ step: AgentStep; index: number }> = ({ step, index }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getStepIcon = () => {
    if (step.type === 'thinking') return 'Brain';
    if (step.type === 'tool_call') return toolIcons[step.toolName || ''] || 'Wrench';
    if (step.type === 'tool_result') return 'CheckCircle';
    if (step.type === 'response') return 'MessageSquare';
    if (step.type === 'error') return 'AlertCircle';
    return 'Circle';
  };
  
  const getStepColor = () => {
    if (step.type === 'thinking') return 'text-purple-500 bg-purple-50';
    if (step.type === 'tool_call') return 'text-blue-500 bg-blue-50';
    if (step.type === 'tool_result') return 'text-green-500 bg-green-50';
    if (step.type === 'response') return 'text-indigo-500 bg-indigo-50';
    if (step.type === 'error') return 'text-red-500 bg-red-50';
    return 'text-gray-500 bg-gray-50';
  };
  
  const getStepTitle = () => {
    if (step.type === 'thinking') return '思考中...';
    if (step.type === 'tool_call') return `调用 ${step.toolName}`;
    if (step.type === 'tool_result') return '工具返回';
    if (step.type === 'response') return 'AI 回复';
    if (step.type === 'error') return '错误';
    return step.type;
  };

  return (
    <div className="flex items-start gap-2 py-1.5">
      {/* 连接线 */}
      <div className="flex flex-col items-center">
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getStepColor()}`}>
          <Icon name={getStepIcon()} size={12} />
        </div>
        {index < 10 && <div className="w-0.5 h-4 bg-gray-200" />}
      </div>
      
      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div 
          className="text-xs font-medium text-gray-700 cursor-pointer hover:text-blue-600"
          onClick={() => setExpanded(!expanded)}
        >
          {getStepTitle()}
          {step.content && !expanded && (
            <span className="ml-1 text-gray-400 font-normal truncate">
              {step.content.slice(0, 30)}...
            </span>
          )}
        </div>
        {expanded && step.content && (
          <div className="mt-1 text-xs text-gray-600 bg-gray-50 rounded p-2 max-h-32 overflow-auto">
            <pre className="whitespace-pre-wrap font-mono text-[10px]">{step.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

// 文件输出组件
const FileOutput: React.FC<{ files: Array<{ name: string; path: string; size?: number }> }> = ({ files }) => {
  return (
    <div className="space-y-1">
      {files.map((file, i) => (
        <div key={i} className="flex items-center gap-2 p-1.5 bg-gray-50 rounded text-xs">
          <Icon name="File" size={12} className="text-blue-500" />
          <span className="flex-1 truncate text-gray-700">{file.name}</span>
          <a 
            href={file.path} 
            download={file.name}
            className="text-blue-500 hover:text-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            <Icon name="Download" size={12} />
          </a>
        </div>
      ))}
    </div>
  );
};

const AINodeComponent: React.FC<AINodeProps> = ({ id, data, selected, color }) => {
  const executionState = useWorkflowStore((s) => s.executionState[id]);
  const nodeOutput = useWorkflowStore((s) => s.nodeOutputs?.[id]);
  const workflow = useWorkflowStore((s) => s.workflow);
  const { getModelById } = useAISettingsStore();
  const [hoveredHandle, setHoveredHandle] = useState<string | null>(null);
  const [showAllSteps, setShowAllSteps] = useState(false);

  const inputs = data.inputs || [];
  const outputs = data.outputs || [];

  // 从 store 获取最新的 modelId
  const nodeFromStore = workflow?.nodes.find(n => n.id === id);
  const modelId = nodeFromStore?.data.config?.modelId || data.config?.modelId;
  const model = modelId ? getModelById(modelId) : null;

  // 获取执行步骤
  const steps: AgentStep[] = nodeOutput?.steps || [];
  const files = nodeOutput?.files || [];
  const hasOutput = steps.length > 0 || files.length > 0 || nodeOutput?.text;

  // 计算节点高度
  const portCount = Math.max(inputs.length, outputs.length, 1);
  const nodeBodyHeight = Math.max(48, portCount * 28 + 16);

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

  // 显示的步骤数量
  const displaySteps = showAllSteps ? steps : steps.slice(0, 3);

  return (
    <div className="flex items-start gap-2">
      {/* 主节点 */}
      <div
        className={`
          relative bg-white rounded-xl shadow-lg border border-gray-200
          transition-all duration-200
          ${selected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
          ${getStatusStyles()}
        `}
        style={{ minWidth: 220, maxWidth: 280 }}
      >
        {/* Header */}
        <div 
          className="px-3 py-2 rounded-t-xl flex items-center gap-2"
          style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}
        >
          <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon name={data.icon || 'Bot'} size={14} color="white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium text-sm truncate">{data.label}</div>
            {model && (
              <div className="text-white/70 text-[10px] truncate flex items-center gap-1">
                <Icon name="Cpu" size={8} />
                {model.modelId}
              </div>
            )}
          </div>
          
          {/* 执行状态 */}
          {executionState && executionState !== 'idle' && (
            <div className="flex-shrink-0">
              {executionState === 'running' && (
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <Icon name="Loader2" size={12} color="white" className="animate-spin" />
                </div>
              )}
              {executionState === 'success' && (
                <div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center">
                  <Icon name="Check" size={12} color="white" />
                </div>
              )}
              {executionState === 'error' && (
                <div className="w-5 h-5 rounded-full bg-red-400 flex items-center justify-center">
                  <Icon name="X" size={12} color="white" />
                </div>
              )}
            </div>
          )}
        </div>

        {/* 未配置模型警告 */}
        {!model && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-100">
            <div className="flex items-center gap-1.5 text-xs text-amber-600">
              <Icon name="AlertTriangle" size={12} />
              <span>未配置模型</span>
            </div>
          </div>
        )}

        {/* Body - 端口区域 */}
        <div className="relative px-1 py-2" style={{ minHeight: nodeBodyHeight }}>
          {/* 左侧输入端口 */}
          <div className="absolute left-0 top-2 bottom-2 flex flex-col justify-around">
            {inputs.map((input) => (
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
                <span className="ml-3 text-xs text-gray-500 truncate max-w-[80px]">
                  {input.name}
                </span>
                {hoveredHandle === `input-${input.id}` && (
                  <div className="absolute left-6 z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                    <span className="font-medium">{input.name}</span>
                    <span className="ml-1 text-gray-400">({input.data_type})</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 右侧输出端口 */}
          <div className="absolute right-0 top-2 bottom-2 flex flex-col justify-around">
            {outputs.map((output) => (
              <div
                key={output.id}
                className="relative flex items-center justify-end h-7 group"
                onMouseEnter={() => setHoveredHandle(`output-${output.id}`)}
                onMouseLeave={() => setHoveredHandle(null)}
              >
                <span className="mr-3 text-xs text-gray-500 truncate max-w-[80px]">
                  {output.name}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={output.id}
                  className="!w-3 !h-3 !border-2 !border-white !-right-1.5 transition-transform group-hover:scale-125"
                  style={{ backgroundColor: dataTypeColors[output.data_type || 'Any'] || dataTypeColors.Any }}
                />
                {hoveredHandle === `output-${output.id}` && (
                  <div className="absolute right-6 z-50 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap">
                    <span className="font-medium">{output.name}</span>
                    <span className="ml-1 text-gray-400">({output.data_type})</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 底部状态栏 */}
        {nodeOutput && executionState === 'success' && (
          <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-gray-500">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span>{steps.length} 步完成</span>
              </div>
              {nodeOutput.usage && (
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="flex items-center gap-0.5">
                    <Icon name="Zap" size={10} />
                    {nodeOutput.usage.totalTokens}
                  </span>
                </div>
              )}
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

      {/* 右侧执行结果面板 */}
      {hasOutput && (
        <div 
          className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 max-w-[280px] nodrag"
          style={{ minWidth: 200 }}
        >
          {/* 执行步骤 */}
          {steps.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-700">执行过程</span>
                {steps.length > 3 && (
                  <button
                    onClick={() => setShowAllSteps(!showAllSteps)}
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    {showAllSteps ? '收起' : `展开全部 (${steps.length})`}
                  </button>
                )}
              </div>
              <div className="space-y-0">
                {displaySteps.map((step, i) => (
                  <ExecutionStep key={i} step={step} index={i} />
                ))}
              </div>
            </div>
          )}

          {/* 文件输出 */}
          {files.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-2">
                文件输出 ({files.length})
              </div>
              <FileOutput files={files} />
            </div>
          )}

          {/* 文本输出预览 */}
          {nodeOutput?.text && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">输出</div>
              <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 max-h-24 overflow-auto">
                {nodeOutput.text.slice(0, 200)}
                {nodeOutput.text.length > 200 && '...'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(AINodeComponent);
