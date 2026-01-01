import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { UserMenu } from './UserMenu';
import { useWorkflowStore } from '../stores/workflowStore';
import { Workflow } from '../types/workflow';

interface SidebarProps {
  onNewWorkflow?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewWorkflow }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { workflows, workflow, setWorkflow, loadWorkflows, deleteWorkflow } = useWorkflowStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredWorkflow, setHoveredWorkflow] = useState<string | null>(null);

  React.useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleWorkflowClick = (w: Workflow) => {
    setWorkflow(w);
    navigate('/editor');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { id: 'home', path: '/', icon: 'Home', label: '主页' },
    { id: 'editor', path: '/editor', icon: 'Workflow', label: '编辑器' },
  ];

  return (
    <div 
      className={`h-full flex flex-col transition-all duration-300 ease-out ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
      style={{ 
        background: 'linear-gradient(180deg, #101828 0%, #1D2939 100%)',
      }}
    >
      {/* Header */}
      <div className={`h-14 flex items-center border-b border-white/[0.08] ${
        isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
      }`}>
        {isCollapsed ? (
          <Logo size="sm" showText={false} />
        ) : (
          <Logo size="md" variant="light" />
        )}
        
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
          >
            <Icon name="PanelLeftClose" size={18} />
          </button>
        )}
      </div>

      {/* Collapse Toggle (when collapsed) */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="mx-auto mt-3 p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
        >
          <Icon name="PanelLeftOpen" size={18} />
        </button>
      )}

      {/* Navigation */}
      <nav className={`mt-2 ${isCollapsed ? 'px-2' : 'px-3'}`}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-3 rounded-lg transition-all duration-200 mb-1 ${
              isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2.5'
            } ${
              isActive(item.path)
                ? 'bg-white/[0.12] text-white'
                : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon name={item.icon} size={20} />
            {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Divider */}
      <div className={`my-3 ${isCollapsed ? 'mx-3' : 'mx-4'}`}>
        <div className="h-px bg-white/[0.08]" />
      </div>

      {/* Workflows Section */}
      <div className="flex-1 flex flex-col min-h-0">
        {!isCollapsed && (
          <div className="px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              工作流
            </span>
            <button
              onClick={onNewWorkflow}
              className="p-1 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
              title="新建工作流"
            >
              <Icon name="Plus" size={16} />
            </button>
          </div>
        )}

        {isCollapsed && (
          <button
            onClick={onNewWorkflow}
            className="mx-auto p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors mb-2"
            title="新建工作流"
          >
            <Icon name="Plus" size={18} />
          </button>
        )}

        <div className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-2'} pb-2`}>
          {workflows.length === 0 ? (
            !isCollapsed && (
              <div className="px-2 py-6 text-center">
                <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-white/[0.06] flex items-center justify-center">
                  <Icon name="Inbox" size={20} className="text-gray-600" />
                </div>
                <p className="text-xs text-gray-600 mb-2">暂无工作流</p>
                <button
                  onClick={onNewWorkflow}
                  className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
                >
                  创建第一个
                </button>
              </div>
            )
          ) : (
            workflows.map(w => (
              <div
                key={w.id}
                onMouseEnter={() => setHoveredWorkflow(w.id)}
                onMouseLeave={() => setHoveredWorkflow(null)}
                className="relative"
              >
                <button
                  onClick={() => handleWorkflowClick(w)}
                  className={`w-full flex items-center gap-2.5 rounded-lg transition-all duration-200 group ${
                    isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
                  } ${
                    workflow?.id === w.id
                      ? 'bg-white/[0.12] text-white'
                      : 'text-gray-400 hover:bg-white/[0.06] hover:text-gray-200'
                  }`}
                  title={isCollapsed ? w.name : undefined}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    w.status === 'published' ? 'bg-emerald-500' : 'bg-gray-600'
                  }`} />
                  
                  {!isCollapsed && (
                    <>
                      <span className="flex-1 text-sm truncate text-left">{w.name}</span>
                      <span className="text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        {w.nodes?.length || 0}
                      </span>
                    </>
                  )}
                </button>

                {/* Delete button on hover */}
                {!isCollapsed && hoveredWorkflow === w.id && workflow?.id !== w.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteWorkflow(w.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Bottom Section */}
      <div className={`border-t border-white/[0.08] ${isCollapsed ? 'p-2' : 'p-3'}`}>
        {/* Settings */}
        <button 
          className={`w-full flex items-center gap-3 rounded-lg text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors mb-2 ${
            isCollapsed ? 'justify-center p-2.5' : 'px-3 py-2'
          }`}
          title={isCollapsed ? '设置' : undefined}
        >
          <Icon name="Settings" size={20} />
          {!isCollapsed && <span className="text-sm">设置</span>}
        </button>

        {/* User */}
        <div className={`${isCollapsed ? 'flex justify-center' : ''}`}>
          <UserMenu compact={isCollapsed} />
        </div>
      </div>
    </div>
  );
};
