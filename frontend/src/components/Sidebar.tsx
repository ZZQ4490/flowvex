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
  const isCollapsed = false; // 暂时固定为展开状态

  React.useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleWorkflowClick = (w: Workflow) => {
    setWorkflow(w);
    navigate('/editor');
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { id: 'overview', path: '/', icon: 'LayoutDashboard', label: 'Overview' },
    { id: 'personal', path: '/personal', icon: 'User', label: 'Personal' },
  ];

  const bottomItems = [
    { id: 'templates', path: '/templates', icon: 'Package', label: 'Templates' },
    { id: 'settings', path: '/settings', icon: 'Settings', label: 'Settings' },
  ];

  return (
    <div 
      className={`h-full flex flex-col bg-[#1a1a1a] border-r border-[#2a2a2a] transition-all duration-200 ${
        isCollapsed ? 'w-12' : 'w-[200px]'
      }`}
    >
      {/* Header */}
      <div className={`h-11 flex items-center border-b border-[#2a2a2a] ${
        isCollapsed ? 'justify-center px-2' : 'px-3 gap-2'
      }`}>
        <Logo size="sm" showText={!isCollapsed} variant="light" />
        {!isCollapsed && (
          <div className="flex items-center gap-1 ml-auto">
            <button className="p-1 text-gray-600 hover:text-gray-400 hover:bg-[#262626] rounded transition-colors">
              <Icon name="Copy" size={14} />
            </button>
            <button 
              onClick={onNewWorkflow}
              className="p-1 text-gray-600 hover:text-gray-400 hover:bg-[#262626] rounded transition-colors"
            >
              <Icon name="Plus" size={14} />
            </button>
            <button className="p-1 text-gray-600 hover:text-gray-400 hover:bg-[#262626] rounded transition-colors">
              <Icon name="Search" size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`py-2 ${isCollapsed ? 'px-1.5' : 'px-2'}`}>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`w-full flex items-center gap-2 rounded transition-colors mb-0.5 ${
              isCollapsed ? 'justify-center p-2' : 'px-2 py-1.5'
            } ${
              isActive(item.path)
                ? 'bg-[#262626] text-white'
                : 'text-gray-500 hover:bg-[#222] hover:text-gray-300'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon name={item.icon} size={16} />
            {!isCollapsed && <span className="text-xs">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Workflows Section */}
      {!isCollapsed && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-[#2a2a2a] mt-1">
          <div className="px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">
              Workflows
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {workflows.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="text-[11px] text-gray-600">No workflows</p>
              </div>
            ) : (
              workflows.slice(0, 10).map(w => (
                <button
                  key={w.id}
                  onClick={() => handleWorkflowClick(w)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors group ${
                    workflow?.id === w.id
                      ? 'bg-[#262626] text-white'
                      : 'text-gray-500 hover:bg-[#222] hover:text-gray-300'
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    w.status === 'published' ? 'bg-emerald-500' : 'bg-gray-600'
                  }`} />
                  <span className="flex-1 text-xs truncate text-left">{w.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom Section */}
      <div className={`border-t border-[#2a2a2a] py-2 ${isCollapsed ? 'px-1.5' : 'px-2'}`}>
        {bottomItems.map(item => (
          <button
            key={item.id}
            onClick={() => item.path !== '/settings' && navigate(item.path)}
            className={`w-full flex items-center gap-2 rounded transition-colors mb-0.5 ${
              isCollapsed ? 'justify-center p-2' : 'px-2 py-1.5'
            } text-gray-500 hover:bg-[#222] hover:text-gray-300`}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon name={item.icon} size={16} />
            {!isCollapsed && <span className="text-xs">{item.label}</span>}
            {!isCollapsed && item.id === 'settings' && (
              <Icon name="ChevronRight" size={12} className="ml-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
