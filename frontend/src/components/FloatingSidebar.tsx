import React, { useState } from 'react';
import { Icon } from './Icon';
import { Workflow } from '../types/workflow';

interface FloatingSidebarProps {
  workflows: Workflow[];
  currentWorkflowId: string | null;
  onSelectWorkflow: (workflow: Workflow) => void;
  onNewWorkflow: () => void;
  onDeleteWorkflow: (id: string) => void;
  onToggleNodePalette: () => void;
  isNodePaletteOpen: boolean;
  hasUnsavedChanges?: boolean;
  onSaveWorkflow?: () => void;
}

export const FloatingSidebar: React.FC<FloatingSidebarProps> = ({
  workflows,
  currentWorkflowId,
  onSelectWorkflow,
  onNewWorkflow,
  onDeleteWorkflow,
  onToggleNodePalette,
  isNodePaletteOpen,
  hasUnsavedChanges = false,
  onSaveWorkflow,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState<Workflow | null>(null);

  const handleWorkflowClick = (workflow: Workflow) => {
    if (workflow.id === currentWorkflowId) return;
    
    if (hasUnsavedChanges) {
      setShowConfirmDialog(workflow);
    } else {
      onSelectWorkflow(workflow);
    }
  };

  const handleConfirmSwitch = (save: boolean) => {
    if (save && onSaveWorkflow) {
      onSaveWorkflow();
    }
    if (showConfirmDialog) {
      onSelectWorkflow(showConfirmDialog);
    }
    setShowConfirmDialog(null);
  };

  return (
    <>
      {/* Floating Sidebar */}
      <div 
        className={`fixed left-4 top-20 z-40 transition-all duration-300 ${
          isExpanded ? 'w-64' : 'w-12'
        }`}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Toggle Node Palette Button */}
          <button
            onClick={onToggleNodePalette}
            className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
              isNodePaletteOpen ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600'
            }`}
            title="节点面板"
          >
            <Icon name="Layers" size={20} className="flex-shrink-0" />
            {isExpanded && <span className="text-sm font-medium">节点面板</span>}
            {isExpanded && (
              <Icon 
                name={isNodePaletteOpen ? 'ChevronLeft' : 'ChevronRight'} 
                size={16} 
                className="ml-auto" 
              />
            )}
          </button>

          {/* Workflows Section */}
          <div className="max-h-80 overflow-y-auto">
            <div className={`px-3 py-2 text-xs font-medium text-gray-400 uppercase tracking-wider ${
              isExpanded ? '' : 'hidden'
            }`}>
              工作流
            </div>
            
            {workflows.map(workflow => (
              <button
                key={workflow.id}
                onClick={() => handleWorkflowClick(workflow)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors group ${
                  workflow.id === currentWorkflowId 
                    ? 'bg-indigo-50 text-indigo-600 border-l-2 border-indigo-500' 
                    : 'text-gray-600'
                }`}
                title={workflow.name}
              >
                <Icon 
                  name="GitBranch" 
                  size={18} 
                  className={`flex-shrink-0 ${
                    workflow.id === currentWorkflowId ? 'text-indigo-500' : 'text-gray-400'
                  }`} 
                />
                {isExpanded && (
                  <>
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium truncate">{workflow.name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {workflow.nodes?.length || 0} 节点
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWorkflow(workflow.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-500 transition-all"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </>
                )}
              </button>
            ))}

            {workflows.length === 0 && isExpanded && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                暂无工作流
              </div>
            )}
          </div>

          {/* New Workflow Button */}
          <button
            onClick={onNewWorkflow}
            className="w-full flex items-center gap-3 px-3 py-3 hover:bg-indigo-50 text-indigo-600 transition-colors border-t border-gray-100"
            title="新建工作流"
          >
            <Icon name="Plus" size={20} className="flex-shrink-0" />
            {isExpanded && <span className="text-sm font-medium">新建工作流</span>}
          </button>
        </div>
      </div>

      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
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
                onClick={() => setShowConfirmDialog(null)}
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
