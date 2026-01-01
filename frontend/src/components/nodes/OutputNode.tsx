import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../../types/workflow';
import { useWorkflowStore } from '../../stores/workflowStore';
import { useVariableStore } from '../../stores/variableStore';
import { Icon } from '../Icon';

interface OutputNodeProps extends NodeProps<NodeData> {
  color: string;
}

// 检测数据类型
const detectDataType = (data: any): 'text' | 'image' | 'file' | 'files' | 'json' | 'unknown' => {
  if (!data) return 'unknown';
  
  // 检查是否是文件数组
  if (Array.isArray(data) && data.length > 0 && data[0]?.name && data[0]?.path) {
    return 'files';
  }
  
  // 检查是否是单个文件
  if (typeof data === 'object' && data.name && data.path) {
    return 'file';
  }
  
  // 检查是否是图片 (base64 或 URL)
  if (typeof data === 'string') {
    if (data.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(data)) {
      return 'image';
    }
    // 检查是否是 JSON 字符串
    try {
      JSON.parse(data);
      return 'json';
    } catch {
      return 'text';
    }
  }
  
  // 对象或数组
  if (typeof data === 'object') {
    return 'json';
  }
  
  return 'text';
};

// 文本显示组件
const TextDisplay: React.FC<{ content: string; maxHeight?: number }> = ({ content, maxHeight = 200 }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 500;
  
  return (
    <div className="relative">
      <div 
        className={`text-sm text-gray-700 whitespace-pre-wrap break-words overflow-auto ${!expanded && isLong ? 'line-clamp-6' : ''}`}
        style={{ maxHeight: expanded ? 'none' : maxHeight }}
      >
        {content}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700"
        >
          {expanded ? '收起' : '展开全部'}
        </button>
      )}
    </div>
  );
};

// 图片显示组件
const ImageDisplay: React.FC<{ src: string }> = ({ src }) => {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div className="flex items-center justify-center h-32 bg-gray-100 rounded text-gray-400 text-sm">
        <Icon name="ImageOff" size={24} className="mr-2" />
        图片加载失败
      </div>
    );
  }
  
  return (
    <img 
      src={src} 
      alt="输出图片"
      className="max-w-full max-h-64 rounded shadow-sm"
      onError={() => setError(true)}
    />
  );
};

// 文件显示组件
const FileDisplay: React.FC<{ file: { name: string; path: string; size?: number } }> = ({ file }) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
        <Icon name="File" size={20} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-800 truncate">{file.name}</div>
        {file.size && (
          <div className="text-xs text-gray-500">{formatSize(file.size)}</div>
        )}
      </div>
      <a
        href={file.path}
        download={file.name}
        className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <Icon name="Download" size={16} />
      </a>
    </div>
  );
};

// 文件列表显示组件
const FilesDisplay: React.FC<{ files: Array<{ name: string; path: string; size?: number }> }> = ({ files }) => {
  return (
    <div className="space-y-2">
      {files.map((file, i) => (
        <FileDisplay key={i} file={file} />
      ))}
    </div>
  );
};

// JSON 显示组件
const JsonDisplay: React.FC<{ data: any }> = ({ data }) => {
  const [expanded, setExpanded] = useState(false);
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  const isLong = jsonStr.length > 300;
  
  return (
    <div className="relative">
      <pre 
        className={`text-xs font-mono bg-gray-900 text-green-400 p-3 rounded-lg overflow-auto ${!expanded && isLong ? 'max-h-32' : 'max-h-96'}`}
      >
        {jsonStr}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-500 hover:text-blue-700"
        >
          {expanded ? '收起' : '展开全部'}
        </button>
      )}
    </div>
  );
};

const OutputNodeComponent: React.FC<OutputNodeProps> = ({ id, data, selected, color }) => {
  const executionState = useWorkflowStore((s) => s.executionState[id]);
  const nodeOutputs = useWorkflowStore((s) => s.nodeOutputs);
  const workflow = useWorkflowStore((s) => s.workflow);
  const variables = useVariableStore((s) => s.variables);
  
  const config = data.config || {};
  
  // 获取上游节点的输出数据
  const getInputData = () => {
    if (!workflow) return null;
    
    // 找到连接到此节点的边
    const incomingEdge = workflow.edges.find(e => e.target === id);
    if (!incomingEdge) return null;
    
    // 获取源节点的输出
    const sourceOutput = nodeOutputs[incomingEdge.source];
    if (!sourceOutput) return null;
    
    // 如果有指定的输出端口，获取对应的数据
    if (incomingEdge.sourceHandle && sourceOutput[incomingEdge.sourceHandle]) {
      return sourceOutput[incomingEdge.sourceHandle];
    }
    
    // 返回整个输出或特定字段
    if (sourceOutput.text) return sourceOutput.text;
    if (sourceOutput.files) return sourceOutput.files;
    if (sourceOutput.data) return sourceOutput.data;
    
    return sourceOutput;
  };
  
  // 也支持通过变量选择
  const getSelectedVariableData = () => {
    if (!config.selectedVariableId) return null;
    const variable = variables[config.selectedVariableId];
    return variable?.value;
  };
  
  const inputData = getInputData() || getSelectedVariableData();
  const dataType = detectDataType(inputData);
  
  // 渲染内容
  const renderContent = () => {
    if (!inputData) {
      return (
        <div className="flex flex-col items-center justify-center py-6 text-gray-400">
          <Icon name="Inbox" size={32} className="mb-2" />
          <span className="text-sm">等待输入数据...</span>
          <span className="text-xs mt-1">连接上游节点或选择变量</span>
        </div>
      );
    }
    
    switch (dataType) {
      case 'text':
        return <TextDisplay content={String(inputData)} />;
      case 'image':
        return <ImageDisplay src={String(inputData)} />;
      case 'file':
        return <FileDisplay file={inputData as any} />;
      case 'files':
        return <FilesDisplay files={inputData as any} />;
      case 'json':
        return <JsonDisplay data={inputData} />;
      default:
        return <TextDisplay content={String(inputData)} />;
    }
  };
  
  // 获取类型图标
  const getTypeIcon = () => {
    switch (dataType) {
      case 'text': return 'FileText';
      case 'image': return 'Image';
      case 'file': return 'File';
      case 'files': return 'Files';
      case 'json': return 'Braces';
      default: return 'Inbox';
    }
  };
  
  // 获取类型标签
  const getTypeLabel = () => {
    switch (dataType) {
      case 'text': return '文本';
      case 'image': return '图片';
      case 'file': return '文件';
      case 'files': return `${(inputData as any[]).length} 个文件`;
      case 'json': return 'JSON';
      default: return '未知';
    }
  };

  return (
    <div
      className={`
        bg-white rounded-xl shadow-lg border border-gray-200
        transition-all duration-200
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
        ${executionState === 'running' ? 'ring-2 ring-blue-400 ring-offset-1' : ''}
        ${executionState === 'success' ? 'ring-2 ring-green-400 ring-offset-1' : ''}
        ${executionState === 'error' ? 'ring-2 ring-red-400 ring-offset-1' : ''}
      `}
      style={{ minWidth: 280, maxWidth: 400 }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 rounded-t-xl flex items-center gap-2"
        style={{ background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)` }}
      >
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          className="!w-3 !h-3 !border-2 !border-white !-left-1.5"
          style={{ backgroundColor: '#64748b' }}
        />
        
        <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Icon name={data.icon || 'Monitor'} size={14} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium text-sm truncate">{data.label}</div>
        </div>
        
        {/* 数据类型标签 */}
        {inputData && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded text-white text-xs">
            <Icon name={getTypeIcon()} size={10} />
            <span>{getTypeLabel()}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3 nodrag">
        {renderContent()}
      </div>

      {/* Footer - Token 用量等 */}
      {nodeOutputs[id]?.usage && (
        <div className="px-3 py-1.5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-end text-xs text-gray-400">
            <span className="flex items-center gap-0.5">
              <Icon name="Zap" size={10} />
              {nodeOutputs[id].usage.totalTokens} tokens
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(OutputNodeComponent);
