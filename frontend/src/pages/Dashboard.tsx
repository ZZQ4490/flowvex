import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflowStore } from '../stores/workflowStore';
import { Icon } from '../components/Icon';
import { Workflow } from '../types/workflow';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { workflows, setWorkflow, createWorkflow, deleteWorkflow } = useWorkflowStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'created'>('updated');

  // 计算统计数据
  const stats = useMemo(() => {
    const total = workflows.length;
    const published = workflows.filter(w => w.status === 'published').length;
    const totalNodes = workflows.reduce((sum, w) => sum + (w.nodes?.length || 0), 0);
    const totalEdges = workflows.reduce((sum, w) => sum + (w.edges?.length || 0), 0);
    return { total, published, totalNodes, totalEdges };
  }, [workflows]);

  // 过滤和排序工作流
  const filteredWorkflows = useMemo(() => {
    let result = [...workflows];
    
    if (searchTerm) {
      result = result.filter(w => 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    result.sort((a, b) => {
      if (sortBy === 'updated') {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      } else if (sortBy === 'created') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    
    return result;
  }, [workflows, searchTerm, sortBy]);

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
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    if (days < 7) return `${days} 天前`;
    return formatDate(dateStr);
  };

  return (
    <div className="h-full overflow-auto bg-[#1a1a1a]">
      <div className="max-w-5xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-medium text-white mb-0.5">Overview</h1>
            <p className="text-xs text-gray-500">All the workflows you have access to</p>
          </div>
          <button
            onClick={handleNewWorkflow}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#ff6d5a] text-white text-xs font-medium rounded hover:bg-[#ff5a45] transition-colors"
          >
            Create workflow
            <Icon name="ChevronDown" size={12} />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="bg-[#262626] rounded-lg border border-[#333] p-4 mb-6">
          <div className="grid grid-cols-5 divide-x divide-[#333]">
            <div className="px-4 first:pl-0">
              <div className="text-[11px] text-gray-500 mb-1">Workflows</div>
              <div className="text-xl font-semibold text-white">{stats.total}</div>
            </div>
            <div className="px-4">
              <div className="text-[11px] text-gray-500 mb-1">Published</div>
              <div className="text-xl font-semibold text-white">{stats.published}</div>
            </div>
            <div className="px-4">
              <div className="text-[11px] text-gray-500 mb-1">Draft</div>
              <div className="text-xl font-semibold text-white">{stats.total - stats.published}</div>
            </div>
            <div className="px-4">
              <div className="text-[11px] text-gray-500 mb-1">Total nodes</div>
              <div className="text-xl font-semibold text-white">{stats.totalNodes}</div>
            </div>
            <div className="px-4">
              <div className="text-[11px] text-gray-500 mb-1">Connections</div>
              <div className="text-xl font-semibold text-white">{stats.totalEdges}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-[#333] mb-4">
          <button className="pb-2 text-xs font-medium text-[#ff6d5a] border-b-2 border-[#ff6d5a]">
            Workflows
          </button>
          <button className="pb-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">
            Templates
          </button>
          <button className="pb-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors">
            Executions
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="relative">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 pl-8 pr-3 py-1.5 text-xs bg-[#262626] border border-[#333] rounded text-white placeholder-gray-500 focus:outline-none focus:border-[#444]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1.5 text-xs bg-[#262626] border border-[#333] rounded text-gray-300 focus:outline-none focus:border-[#444]"
            >
              <option value="updated">Sort by last updated</option>
              <option value="created">Sort by created</option>
              <option value="name">Sort by name</option>
            </select>
            <button className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#333] rounded transition-colors">
              <Icon name="Filter" size={14} />
            </button>
            <button className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-[#333] rounded transition-colors">
              <Icon name="LayoutGrid" size={14} />
            </button>
          </div>
        </div>

        {/* Workflow List */}
        <div className="space-y-2">
          {filteredWorkflows.length === 0 ? (
            <div className="bg-[#262626] rounded-lg border border-[#333] p-12 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-[#333] rounded-lg flex items-center justify-center">
                <Icon name="Inbox" size={24} className="text-gray-600" />
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {searchTerm ? 'No workflows found' : 'No workflows yet'}
              </p>
              {!searchTerm && (
                <button
                  onClick={handleNewWorkflow}
                  className="text-xs text-[#ff6d5a] hover:text-[#ff5a45] transition-colors"
                >
                  Create your first workflow →
                </button>
              )}
            </div>
          ) : (
            filteredWorkflows.map(workflow => (
              <div
                key={workflow.id}
                onClick={() => handleOpenWorkflow(workflow)}
                className="bg-[#262626] rounded-lg border border-[#333] px-4 py-3 hover:border-[#444] hover:bg-[#2a2a2a] transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      workflow.status === 'published' ? 'bg-emerald-500' : 'bg-gray-600'
                    }`} />
                    <div className="min-w-0">
                      <h3 className="text-sm font-medium text-white truncate group-hover:text-[#ff6d5a] transition-colors">
                        {workflow.name}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span>Last updated {formatRelativeTime(workflow.updated_at)}</span>
                        <span>·</span>
                        <span>Created {formatDate(workflow.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-gray-500">
                      {workflow.nodes?.length || 0} nodes
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${
                      workflow.status === 'published'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-gray-500/10 text-gray-400'
                    }`}>
                      {workflow.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: duplicate
                        }}
                        className="p-1 text-gray-500 hover:text-gray-300 hover:bg-[#333] rounded transition-colors"
                      >
                        <Icon name="Copy" size={14} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteWorkflow(workflow.id);
                        }}
                        className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                      <button className="p-1 text-gray-500 hover:text-gray-300 hover:bg-[#333] rounded transition-colors">
                        <Icon name="MoreVertical" size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredWorkflows.length > 0 && (
          <div className="flex items-center justify-end gap-4 mt-4 text-xs text-gray-500">
            <span>Total {filteredWorkflows.length}</span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#333] transition-colors">
                <Icon name="ChevronLeft" size={14} />
              </button>
              <span className="px-2 py-1 bg-[#ff6d5a] text-white rounded text-[11px]">1</span>
              <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#333] transition-colors">
                <Icon name="ChevronRight" size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
