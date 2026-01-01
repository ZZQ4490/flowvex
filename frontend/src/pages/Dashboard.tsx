import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../stores/workflowStore';
import { useAuthStore } from '../stores/authStore';
import { Icon } from '../components/Icon';
import { Workflow } from '../types/workflow';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { workflows, setWorkflow, createWorkflow } = useWorkflowStore();
  const { user } = useAuthStore();

  // 计算统计数据
  const stats = useMemo(() => {
    const total = workflows.length;
    const published = workflows.filter(w => w.status === 'published').length;
    const totalNodes = workflows.reduce((sum, w) => sum + (w.nodes?.length || 0), 0);
    return { total, published, totalNodes };
  }, [workflows]);

  // 最近的工作流
  const recentWorkflows = useMemo(() => {
    return [...workflows]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 8);
  }, [workflows]);

  const handleOpenWorkflow = (workflow: Workflow) => {
    setWorkflow(workflow);
    navigate('/editor');
  };

  const handleNewWorkflow = () => {
    createWorkflow('新工作流', '');
    navigate('/editor');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <div className="h-full overflow-auto" style={{ background: 'var(--bg-secondary)' }}>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            {getGreeting()}{user?.name ? `，${user.name}` : ''} 👋
          </h1>
          <p className="text-gray-500">开始构建你的智能工作流</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                <Icon name="Workflow" size={24} color="white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">工作流</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Icon name="CheckCircle" size={24} color="white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{stats.published}</div>
                <div className="text-sm text-gray-500">已发布</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <Icon name="Boxes" size={24} color="white" />
              </div>
              <div>
                <div className="text-3xl font-bold text-gray-900">{stats.totalNodes}</div>
                <div className="text-sm text-gray-500">节点</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleNewWorkflow}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm shadow-primary-600/25"
          >
            <Icon name="Plus" size={18} />
            新建工作流
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium">
            <Icon name="Upload" size={18} />
            导入
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-colors font-medium">
            <Icon name="FileText" size={18} />
            模板
          </button>
        </div>

        {/* Recent Workflows */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">最近工作流</h2>
            {workflows.length > 8 && (
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                查看全部 →
              </button>
            )}
          </div>
          
          {recentWorkflows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200/80 p-16 text-center shadow-sm">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Icon name="Inbox" size={32} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">还没有工作流</h3>
              <p className="text-gray-500 mb-6">创建你的第一个工作流，开始自动化之旅</p>
              <button
                onClick={handleNewWorkflow}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <Icon name="Plus" size={18} />
                创建工作流
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {recentWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  onClick={() => handleOpenWorkflow(workflow)}
                  className="bg-white rounded-xl border border-gray-200/80 p-5 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Icon name="Workflow" size={20} color="white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                          {workflow.name}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${
                          workflow.status === 'published'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {workflow.status === 'published' ? '已发布' : '草稿'}
                        </span>
                      </div>
                      {workflow.description && (
                        <p className="text-sm text-gray-500 truncate mb-2">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Icon name="Boxes" size={12} />
                          {workflow.nodes?.length || 0} 节点
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="Clock" size={12} />
                          {formatDate(workflow.updated_at)}
                        </span>
                      </div>
                    </div>
                    <Icon name="ChevronRight" size={18} className="text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
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
