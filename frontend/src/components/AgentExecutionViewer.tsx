// src/components/AgentExecutionViewer.tsx
// Agent 执行过程查看器

import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icon';
import { AgentStep } from '../services/agentExecutor';

interface AgentExecutionViewerProps {
  steps: AgentStep[];
  isRunning: boolean;
  onClose: () => void;
}

export const AgentExecutionViewer: React.FC<AgentExecutionViewerProps> = ({
  steps,
  isRunning,
  onClose,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  };

  const getStepIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'thinking':
        return { name: 'Brain', color: 'text-purple-500', bg: 'bg-purple-100' };
      case 'tool_call':
        return { name: 'Wrench', color: 'text-blue-500', bg: 'bg-blue-100' };
      case 'tool_result':
        return { name: 'CheckCircle', color: 'text-green-500', bg: 'bg-green-100' };
      case 'response':
        return { name: 'MessageSquare', color: 'text-violet-500', bg: 'bg-violet-100' };
      default:
        return { name: 'Circle', color: 'text-gray-500', bg: 'bg-gray-100' };
    }
  };

  const getStepLabel = (type: AgentStep['type']) => {
    switch (type) {
      case 'thinking':
        return '思考中';
      case 'tool_call':
        return '调用工具';
      case 'tool_result':
        return '工具结果';
      case 'response':
        return '最终响应';
      default:
        return '步骤';
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 z-[200]"
        onClick={onClose}
      />
      
      {/* 查看器面板 */}
      <div className="fixed inset-y-4 right-4 w-[500px] max-w-[90vw] bg-white rounded-2xl shadow-2xl z-[201] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-violet-50 to-purple-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="Bot" size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Agent 执行过程</h3>
              <p className="text-xs text-gray-500">
                {isRunning ? (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    执行中...
                  </span>
                ) : (
                  `共 ${steps.length} 个步骤`
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <Icon name="X" size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Steps List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {steps.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Icon name="Loader2" size={32} className="animate-spin mb-2" />
              <p className="text-sm">等待执行...</p>
            </div>
          ) : (
            steps.map((step, index) => {
              const icon = getStepIcon(step.type);
              const isExpanded = expandedSteps.has(step.id);
              const hasDetails = step.toolArgs || step.toolResult || step.content.length > 100;

              return (
                <div
                  key={step.id}
                  className={`rounded-xl border transition-all ${
                    step.type === 'response'
                      ? 'bg-violet-50 border-violet-200'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div
                    className={`p-3 flex items-start gap-3 ${hasDetails ? 'cursor-pointer' : ''}`}
                    onClick={() => hasDetails && toggleStep(step.id)}
                  >
                    {/* Step Number & Icon */}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
                      <div className={`w-8 h-8 ${icon.bg} rounded-lg flex items-center justify-center`}>
                        <Icon name={icon.name} size={16} className={icon.color} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {getStepLabel(step.type)}
                          {step.toolName && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                              {step.toolName}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatTime(step.timestamp)}
                        </span>
                      </div>
                      
                      <p className={`text-sm text-gray-600 ${!isExpanded && 'line-clamp-2'}`}>
                        {step.content}
                      </p>

                      {hasDetails && (
                        <button className="mt-1 text-xs text-violet-500 hover:text-violet-700 flex items-center gap-1">
                          <Icon name={isExpanded ? 'ChevronUp' : 'ChevronDown'} size={12} />
                          {isExpanded ? '收起' : '展开详情'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 ml-11 space-y-2">
                      {step.toolArgs && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">参数:</div>
                          <pre className="text-xs bg-gray-100 p-2 rounded-lg overflow-x-auto">
                            {JSON.stringify(step.toolArgs, null, 2)}
                          </pre>
                        </div>
                      )}
                      {step.toolResult && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">结果:</div>
                          <pre className="text-xs bg-gray-100 p-2 rounded-lg overflow-x-auto max-h-40">
                            {JSON.stringify(step.toolResult, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Running Indicator */}
          {isRunning && steps.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-500 pl-11">
              <Icon name="Loader2" size={14} className="animate-spin" />
              处理中...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {steps.filter(s => s.type === 'tool_call').length} 次工具调用
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-violet-500 hover:bg-violet-600 text-white rounded-lg text-sm transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AgentExecutionViewer;
