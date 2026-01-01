import React from 'react';
import { Workflow } from '../types/workflow';
import { Icon } from './Icon';

interface WorkflowListProps {
  workflows: Workflow[];
  currentWorkflowId: string | null;
  onSelect: (workflow: Workflow) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onClose?: () => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  currentWorkflowId,
  onSelect,
  onDelete,
  onNew,
  onClose,
}) => {
  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">我的工作流</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onNew}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 flex items-center gap-1"
            >
              <Icon name="Plus" size={16} />
              新建工作流
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <Icon name="X" size={20} />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {workflows.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                <Icon name="FileText" size={32} className="text-gray-400" />
              </div>
              <p>还没有工作流</p>
              <p className="text-sm mt-2">点击上方按钮创建第一个工作流</p>
            </div>
          ) : (
            <div className="space-y-2">
              {workflows.map(workflow => (
                <div
                  key={workflow.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    workflow.id === currentWorkflowId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => onSelect(workflow)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800">{workflow.name}</h3>
                      {workflow.description && (
                        <p className="text-sm text-gray-500 mt-1">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span>{workflow.nodes.length} 个节点</span>
                        <span>更新于 {new Date(workflow.updated_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        workflow.status === 'published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {workflow.status === 'published' ? '已发布' : '草稿'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(workflow.id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                      >
                        <Icon name="Trash2" size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
