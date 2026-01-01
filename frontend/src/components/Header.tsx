import React from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { Icon } from './Icon';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';

interface HeaderProps {
  onNewWorkflow: () => void;
  onSave: () => void;
  onRun: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNewWorkflow, onSave, onRun, onOpenSettings }) => {
  const { workflow, isExecuting, undo, redo, undoStack, redoStack } = useWorkflowStore();

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
      {/* Left: Logo & Workflow Name */}
      <div className="flex items-center gap-4">
        <Logo size="md" />
        
        {workflow && (
          <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
            <span className="text-gray-600">{workflow.name}</span>
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              workflow.status === 'published' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              {workflow.status === 'published' ? '已发布' : '草稿'}
            </span>
          </div>
        )}
      </div>

      {/* Center: Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="撤销 (Ctrl+Z)"
        >
          <Icon name="Undo2" size={18} />
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="重做 (Ctrl+Y)"
        >
          <Icon name="Redo2" size={18} />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSettings}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-md"
          title="AI 模型设置"
        >
          <Icon name="Settings" size={18} />
        </button>
        <div className="w-px h-6 bg-gray-200" />
        <button
          onClick={onNewWorkflow}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md flex items-center gap-1"
        >
          <Icon name="Plus" size={16} />
          新建
        </button>
        <button
          onClick={onSave}
          disabled={!workflow}
          className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 flex items-center gap-1"
        >
          <Icon name="Save" size={16} />
          保存
        </button>
        <button
          onClick={onRun}
          disabled={!workflow || isExecuting}
          className={`px-4 py-1.5 text-sm text-white rounded-md flex items-center gap-1 ${
            isExecuting 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
          } disabled:opacity-50`}
        >
          {isExecuting ? (
            <>
              <Icon name="Loader2" size={16} className="animate-spin" />
              停止
            </>
          ) : (
            <>
              <Icon name="Play" size={16} />
              运行
            </>
          )}
        </button>
        <div className="w-px h-6 bg-gray-200 ml-2" />
        <UserMenu />
      </div>
    </header>
  );
};
