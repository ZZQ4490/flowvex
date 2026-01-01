import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { useWorkflowStore } from '../stores/workflowStore';
import { Workflow } from '../types/workflow';

interface SidebarProps {
  onNewWorkflow?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewWorkflow }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workflows, workflow, setWorkflow, loadWorkflows } = useWorkflowStore();

  React.useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleWorkflowClick = (w: Workflow) => {
    setWorkflow(w);
    navigate('/editor');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 h-full bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <Logo size="md" variant="light" />
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1">
        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive('/') 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Icon name="Home" size={18} />
          <span className="font-medium">主页</span>
        </button>

        <button
          onClick={() => navigate('/editor')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            isActive('/editor') 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Icon name="Workflow" size={18} />
          <span className="font-medium">编辑器</span>
        </button>
      </nav>

      {/* Workflows Section */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-gray-800 mt-2">
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            我的工作流
          </span>
          <button
            onClick={onNewWorkflow}
            className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-500 hover:text-white"
            title="新建工作流"
          >
            <Icon name="Plus" size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
          {workflows.length === 0 ? (
            <div className="px-3 py-8 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-800 rounded-xl flex items-center justify-center">
                <Icon name="Inbox" size={24} className="text-gray-600" />
              </div>
              <p className="text-sm text-gray-500 mb-3">暂无工作流</p>
              <button
                onClick={onNewWorkflow}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                创建第一个
              </button>
            </div>
          ) : (
            workflows.map(w => (
              <button
                key={w.id}
                onClick={() => handleWorkflowClick(w)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${
                  workflow?.id === w.id
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-200'
                }`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  w.status === 'published' ? 'bg-green-500' : 'bg-gray-600'
                }`} />
                <span className="flex-1 text-sm truncate text-left">{w.name}</span>
                <span className="text-xs text-gray-600 group-hover:text-gray-500">
                  {w.nodes?.length || 0}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-3 border-t border-gray-800">
        <button className="w-full flex items-center gap-3 px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white rounded-lg transition-colors">
          <Icon name="Settings" size={18} />
          <span className="text-sm">设置</span>
        </button>
      </div>
    </div>
  );
};
