import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../stores/workflowStore';
import { Icon } from '../components/Icon';
import { Workflow } from '../types/workflow';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { workflows, loadWorkflows, setWorkflow, createWorkflow } = useWorkflowStore();

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // 计算统计数据
  const stats = useMemo(() => {
    const total = workflows.length;
    const published = workflows.filter(w => w.status === 'published').length;
    const draft = workflows.filter(w => w.status === 'draft').length;
    const totalNodes = workflows.reduce((sum, w) => sum + (w.nodes?.length || 0), 0);
    
    return { total, published, draft, totalNodes };
  }, [workflows]);

  // 最近的工作流（按更新时间排序）
  const recentWorkflows = useMemo(() => {
    return [...workflows]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);
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
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <h1 className="text-4xl font-bold mb-4">欢迎回来 👋</h1>
          <p className="text-lg text-indigo-100 mb-8">
            开始构建你的智能工作流，让自动化更简单
          </p>
          
          <button
            onClick={handleNewWorkflow}
            className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Icon name="Plus" size={20} />
            创建新工作流
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-6 -mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">总工作流</span>
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Icon name="Workflow" size={20} className="text-indigo-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">已发布</span>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={20} className="text-green-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.published}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">草稿</span>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Icon name="FileEdit" size={20} className="text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.draft}</div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">总节点数</span>
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Icon name="Boxes" size={20} className="text-purple-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-800">{stats.totalNodes}</div>
          </div>
        </div>

        {/* Recent Workflows */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Icon name="Clock" size={20} className="text-gray-500" />
              最近的工作流
            </h2>
          </div>

          {recentWorkflows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                <Icon name="Inbox" size={40} className="text-gray-400" />
              </div>
              <p className="text-gray-500 mb-4">还没有工作流</p>
              <button
                onClick={handleNewWorkflow}
                className="px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                创建第一个工作流
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentWorkflows.map(workflow => (
                <div
                  key={workflow.id}
                  onClick={() => handleOpenWorkflow(workflow)}
                  className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate group-hover:text-indigo-600 transition-colors">
                        {workflow.name}
                      </h3>
                      {workflow.description && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {workflow.description}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full flex-shrink-0 ml-2 ${
                      workflow.status === 'published' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {workflow.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Icon name="Boxes" size={14} />
                      {workflow.nodes?.length || 0} 节点
                    </span>
                    <span className="flex items-center gap-1">
                      <Icon name="GitBranch" size={14} />
                      {workflow.edges?.length || 0} 连接
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Icon name="Clock" size={12} />
                      {formatDate(workflow.updated_at)}
                    </span>
                    <Icon name="ChevronRight" size={14} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Icon name="Zap" size={20} className="text-gray-500" />
            快速开始
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={handleNewWorkflow}
              className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-200 transition-colors">
                <Icon name="Plus" size={24} className="text-indigo-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-1">创建工作流</h3>
              <p className="text-sm text-gray-500">从零开始构建新的自动化流程</p>
            </button>

            <button
              className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-200 transition-colors">
                <Icon name="FileText" size={24} className="text-purple-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-1">使用模板</h3>
              <p className="text-sm text-gray-500">从预设模板快速开始</p>
            </button>

            <button
              className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-3 group-hover:bg-green-200 transition-colors">
                <Icon name="Upload" size={24} className="text-green-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-1">导入工作流</h3>
              <p className="text-sm text-gray-500">导入已有的工作流配置</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
