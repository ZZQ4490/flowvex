// src/components/nodes/NodeExecutionResult.tsx
// 节点执行结果显示组件 - 在节点下方显示运行结果

import React, { useState } from 'react';
import { Icon } from '../Icon';

interface NodeExecutionResultProps {
  output: any;
  executionState: 'idle' | 'running' | 'success' | 'error';
}

export const NodeExecutionResult: React.FC<NodeExecutionResultProps> = ({
  output,
  executionState,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 不显示空闲状态
  if (executionState === 'idle' || !output) {
    return null;
  }

  // 格式化输出数据
  const formatOutput = (data: any): string => {
    if (data === null || data === undefined) return '';
    
    // 处理错误
    if (data.error) {
      return `错误: ${data.error}`;
    }
    
    // 处理文本输出
    if (typeof data === 'string') return data;
    if (data.text) return data.text;
    if (data.content) return data.content;
    if (data.message) return data.message;
    
    // 处理数组数据
    if (Array.isArray(data)) {
      if (data.length === 0) return '空数组';
      if (data.length <= 3) {
        return JSON.stringify(data, null, 2);
      }
      return `数组 (${data.length} 项)\n${JSON.stringify(data.slice(0, 3), null, 2)}\n...`;
    }
    
    // 处理对象数据
    if (typeof data === 'object') {
      // 特殊处理爬虫数据
      if (data.data && Array.isArray(data.data)) {
        const items = data.data;
        if (items.length === 0) return '未抓取到数据';
        
        const preview = items.slice(0, 3).map((item: any, idx: number) => {
          if (typeof item === 'string') return `${idx + 1}. ${item}`;
          if (item.title) return `${idx + 1}. ${item.title}${item.hot ? ` (${item.hot})` : ''}`;
          return `${idx + 1}. ${JSON.stringify(item)}`;
        }).join('\n');
        
        return `抓取到 ${items.length} 条数据:\n${preview}${items.length > 3 ? '\n...' : ''}`;
      }
      
      // 处理时间数据
      if (data.formatted || data.timestamp) {
        return data.formatted || new Date(data.timestamp).toLocaleString('zh-CN');
      }
      
      // 处理 AI 响应
      if (data.text && data.usage) {
        return `${data.text}\n\n[用量: ${data.usage.totalTokens || 0} tokens]`;
      }
      
      // 默认 JSON 格式化
      const keys = Object.keys(data);
      if (keys.length <= 5) {
        return JSON.stringify(data, null, 2);
      }
      
      // 大对象只显示部分键
      const preview: any = {};
      keys.slice(0, 5).forEach(key => {
        preview[key] = data[key];
      });
      return `${JSON.stringify(preview, null, 2)}\n... (${keys.length - 5} 个字段未显示)`;
    }
    
    return String(data);
  };

  const formattedOutput = formatOutput(output);
  const isLongOutput = formattedOutput.length > 150;
  const displayOutput = isExpanded ? formattedOutput : (
    isLongOutput ? formattedOutput.slice(0, 150) + '...' : formattedOutput
  );

  // 状态样式
  const getStatusStyles = () => {
    switch (executionState) {
      case 'running':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-700',
          icon: 'Loader2',
          iconClass: 'text-blue-500 animate-spin',
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-700',
          icon: 'CheckCircle',
          iconClass: 'text-green-500',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-700',
          icon: 'XCircle',
          iconClass: 'text-red-500',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-700',
          icon: 'Info',
          iconClass: 'text-gray-500',
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div 
      className={`
        mt-2 rounded-lg border ${styles.border} ${styles.bg} 
        overflow-hidden transition-all duration-200
        animate-in fade-in slide-in-from-top-2
      `}
    >
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-current/10">
        <Icon name={styles.icon as any} size={14} className={styles.iconClass} />
        <span className={`text-xs font-medium ${styles.text}`}>
          {executionState === 'running' && '执行中...'}
          {executionState === 'success' && '执行成功'}
          {executionState === 'error' && '执行失败'}
        </span>
        
        {/* 展开/收起按钮 */}
        {isLongOutput && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="ml-auto p-1 hover:bg-white/50 rounded transition-colors"
          >
            <Icon 
              name={isExpanded ? 'ChevronUp' : 'ChevronDown'} 
              size={12} 
              className={styles.text}
            />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2">
        <pre 
          className={`
            text-xs ${styles.text} whitespace-pre-wrap break-words 
            font-mono overflow-x-auto
            ${isExpanded ? 'max-h-[300px]' : 'max-h-[100px]'}
            overflow-y-auto
          `}
        >
          {displayOutput}
        </pre>
      </div>

      {/* Footer - 额外信息 */}
      {output.usage && (
        <div className="px-3 py-1.5 border-t border-current/10 flex items-center gap-3 text-xs">
          <span className={`flex items-center gap-1 ${styles.text}`}>
            <Icon name="Zap" size={10} />
            {output.usage.totalTokens || 0} tokens
          </span>
          {output.latency && (
            <span className={`flex items-center gap-1 ${styles.text}`}>
              <Icon name="Clock" size={10} />
              {output.latency}ms
            </span>
          )}
        </div>
      )}
      
      {output.timestamp && (
        <div className="px-3 py-1.5 border-t border-current/10 text-xs">
          <span className={`flex items-center gap-1 ${styles.text}`}>
            <Icon name="Clock" size={10} />
            {new Date(output.timestamp).toLocaleTimeString('zh-CN')}
          </span>
        </div>
      )}
    </div>
  );
};

export default NodeExecutionResult;
