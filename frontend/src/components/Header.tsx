import React, { useState, useRef, useEffect } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { Icon } from './Icon';
import { UserMenu } from './UserMenu';
import { Logo } from './Logo';
import { Workflow } from '../types/workflow';

interface HeaderProps {
  onNewWorkflow: () => void;
  onSave: () => void;
  onRun: () => void;
  onOpenSettings?: () => void;
  onSwitchWorkflow?: (workflow: Workflow) => void;
  hasUnsavedChanges?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ 
  onNewWorkflow, 
  onSave, 
  onRun, 
  onOpenSettings,
  onSwitchWorkflow,
  hasUnsavedChanges = false,
}) => {
  const { workflow, workflows, isExecuting, undo, redo, undoStack, redoStack } = useWorkflowStore();
  const [showWorkflowDropdown, setShowWorkflowDropdown] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState<Workflow | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowWorkflowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWorkflowSelect = (w: Workflow) => {
    if (w.id === workflow?.id) {
      setShowWorkflowDropdown(false);
      return;
    }
    
    if (hasUnsavedChanges) {
      setShowSaveConfirm(w);
    } else {
      onSwitchWorkflow?.(w);
      setShowWorkflowDropdown(false);
    }
  };

  const handleConfirmSwitch = (save: boolean) => {
    if (save) {
      onSave();
    }
    if (showSaveConfirm) {
      onSwitchWorkflow?.(showSaveConfirm);
    }
    setShowSaveConfirm(null);
    setShowWorkflowDropdown(false);
  };

  return (
    <>
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 relative z-50">
        {/* Left: Logo & Workflow Selector */}
        <div className="flex items-center gap-4">
          <Logo size="md" />
          
          {/* Workflow Selector Dropdown */}
          <div className="relative ml-4 pl-4 border-l border-gray-200" ref={dropdownRef}>
            <button
              onClick={() => setShowWorkflowDropdown(!showWorkflowDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              {workflow ? (
                <>
                  <Icon name="GitBranch" size={16} className="text-indigo-500" />
                  <span className="text-gray-700 font-medium max-w-40 truncate">
                    {workflow.name}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="w-2 h-2 bg-amber-400 rounded-full" title="有未保存的更改" />
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    workflow.status === 'published' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {workflow.status === 'published' ? '已发布' : '草稿'}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">选择工作流</span>
              )}
              <Icon 
                name="ChevronDown" 
                size={16} 
                className={`text-gray-400 transition-transform ${showWorkflowDropdown ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Dropdown Menu */}
            {showWorkflowDropdown && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-xl border border-gray-200 py-2 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  我的工作流
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {workflows.map(w => (
                    <button
                      key={w.id}
                      onClick={() => handleWorkflowSelect(w)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors ${
                        w.id === workflow?.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <Icon 
                        name="GitBranch" 
                        size={16} 
                        className={w.id === workflow?.id ? 'text-indigo-500' : 'text-gray-400'} 
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className={`text-sm font-medium truncate ${
                          w.id === workflow?.id ? 'text-indigo-600' : 'text-gray-700'
                        }`}>
                          {w.name}
                        </div>
                        <div className="text-xs text-gray-400">
                          {w.nodes?.length || 0} 节点 · {w.status === 'published' ? '已发布' : '草稿'}
                        </div>
                      </div>
                      {w.id === workflow?.id && (
                        <Icon name="Check" size={16} className="text-indigo-500" />
                      )}
                    </button>
                  ))}
                  {workflows.length === 0 && (
                    <div className="px-3 py-4 text-sm text-gray-400 text-center">
                      暂无工作流
                    </div>
                  )}
                </div>
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setShowWorkflowDropdown(false);
                      onNewWorkflow();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-indigo-50 text-indigo-600 transition-colors"
                  >
                    <Icon name="Plus" size={16} />
                    <span className="text-sm font-medium">新建工作流</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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

    {/* Save Confirm Dialog */}
    {showSaveConfirm && (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-xl shadow-2xl p-6 w-96 animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Icon name="AlertTriangle" size={20} className="text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">未保存的更改</h3>
              <p className="text-sm text-gray-500">切换前是否保存当前工作流？</p>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowSaveConfirm(null)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={() => handleConfirmSwitch(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              不保存
            </button>
            <button
              onClick={() => handleConfirmSwitch(true)}
              className="px-4 py-2 text-sm text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors"
            >
              保存并切换
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};
