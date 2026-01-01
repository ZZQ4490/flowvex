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

  return (
    <div className="h-full overflow-auto bg-gray-50">
      <div className="max-w-5xl mx-auto p-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            欢迎回来{user?.name ? `，${user.name}` : ''} 👋
          </h1>
          <p className="text-gray-500">管理你的工作流，开始自动化之旅</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Icon name="Workflow" size={20} className="text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">工作流</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={20} className="text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.published}</div>
                <div className="text-sm text-gray-500">已发布</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="Boxes" size={20} className="text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.totalNodes}</div>
                <div className="text-sm text-gray-500">节点</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={handleNewWorkflow}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Icon name="Plus" size={18} />
            新建工作流
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
            <Icon name="Upload" size={18} />
            导入
          </button>
        </div>

        {/* Recent Workflows */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">最近工作流</h2>
          
          {recentWorkflows.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Icon name="Inbox" size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">还没有工作流</p>
              <button
                onClick={handleNewWorkflow}
                className="text-indigo-600 hover:text-indigo-700 font-medium"
              >
                创建第一个工作流 →
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">名称</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">节点</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase">更新时间</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {recentWorkflows.map(workflow => (
                    <tr
                      key={workflow.id}
                      onClick={() => handleOpenWorkflow(workflow)}
                      className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Icon name="Workflow" size={16} color="white" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{workflow.name}</div>
                            {workflow.description && (
                              <div className="text-sm text-gray-500 truncate max-w-xs">{workflow.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${
                          workflow.status === 'published'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            workflow.status === 'published' ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          {workflow.status === 'published' ? '已发布' : '草稿'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-600">
                        {workflow.nodes?.length || 0}
                      </td>
                      <td className="px-5 py-4 text-gray-500 text-sm">
                        {formatDate(workflow.updated_at)}
                      </td>
                      <td className="px-5 py-4">
                        <Icon name="ChevronRight" size={16} className="text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
