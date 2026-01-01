import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingNodePalette } from '../components/FloatingNodePalette';
import { FloatingSidebar } from '../components/FloatingSidebar';
import { WorkflowCanvas } from '../components/WorkflowCanvas';
import { NodeConfigPanel } from '../components/NodeConfigPanel';
import { NewWorkflowModal } from '../components/NewWorkflowModal';
import { Icon } from '../components/Icon';
import { useWorkflowStore } from '../stores/workflowStore';
import { NodeTemplate } from '../types/workflow';
import { toast } from '../components/common/Toast';

export const WorkflowEditor: React.FC = () => {
  const navigate = useNavigate();
  const [showNewModal, setShowNewModal] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  const {
    workflow,
    workflows,
    selectedNodeId,
    loadWorkflows,
    setWorkflow,
    createWorkflow,
    saveWorkflow,
    deleteWorkflow,
    selectNode,
    undo,
    redo,
  } = useWorkflowStore();

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // 如果没有工作流，跳转到主页
  useEffect(() => {
    if (!workflow && workflows.length === 0) {
      navigate('/');
    }
  }, [workflow, workflows, navigate]);

  const handleDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleNodeDoubleClick = useCallback((template: NodeTemplate) => {
    const { addNode } = useWorkflowStore.getState();
    addNode(template, { x: 400, y: 300 });
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    selectNode(nodeId);
  }, [selectNode]);

  const handleNewWorkflow = useCallback(() => {
    setShowNewModal(true);
  }, []);

  const handleCreateWorkflow = useCallback((name: string, description?: string) => {
    createWorkflow(name, description);
    setShowNewModal(false);
  }, [createWorkflow]);

  const handleSave = useCallback(() => {
    saveWorkflow();
    toast.success('工作流已保存');
  }, [saveWorkflow]);

  const handleSwitchWorkflow = useCallback((w: any) => {
    setWorkflow(w);
  }, [setWorkflow]);

  const handleBackToDashboard = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const selectedNode = useMemo(() => {
    return workflow?.nodes.find(n => n.id === selectedNodeId);
  }, [workflow?.nodes, selectedNodeId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        } else if (e.key === 's') {
          e.preventDefault();
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleSave]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Editor Header */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToDashboard}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="返回主页"
          >
            <Icon name="ArrowLeft" size={20} className="text-gray-600" />
          </button>
          
          {workflow && (
            <div className="flex items-center gap-2">
              <Icon name="GitBranch" size={16} className="text-indigo-500" />
              <span className="text-gray-700 font-medium">{workflow.name}</span>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                workflow.status === 'published' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {workflow.status === 'published' ? '已发布' : '草稿'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!workflow}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-md disabled:opacity-50 flex items-center gap-1"
          >
            <Icon name="Save" size={16} />
            保存
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden">
        {/* Floating Sidebar */}
        <FloatingSidebar
          workflows={workflows}
          currentWorkflowId={workflow?.id || null}
          onSelectWorkflow={handleSwitchWorkflow}
          onNewWorkflow={handleNewWorkflow}
          onDeleteWorkflow={deleteWorkflow}
          onToggleNodePalette={() => setShowNodePalette(!showNodePalette)}
          isNodePaletteOpen={showNodePalette}
          onExpandChange={setSidebarExpanded}
        />

        {/* Floating Node Palette */}
        <FloatingNodePalette
          isOpen={showNodePalette}
          onClose={() => setShowNodePalette(false)}
          onDragStart={handleDragStart}
          onNodeDoubleClick={handleNodeDoubleClick}
          sidebarExpanded={sidebarExpanded}
        />
        
        {/* Canvas - Full Width */}
        <div className="w-full h-full">
          {workflow ? (
            <WorkflowCanvas onNodeSelect={handleNodeSelect} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Icon name="Rocket" size={40} color="white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  开始构建你的AI工作流
                </h2>
                <p className="text-gray-500 mb-4">
                  从左侧选择一个工作流或创建新的工作流
                </p>
                <button
                  onClick={handleNewWorkflow}
                  className="px-6 py-2.5 text-sm text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 flex items-center gap-2 mx-auto shadow-md hover:shadow-lg transition-all"
                >
                  <Icon name="Plus" size={18} />
                  新建工作流
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Config Panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => selectNode(null)}
        />
      )}

      {showNewModal && (
        <NewWorkflowModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateWorkflow}
        />
      )}
    </div>
  );
};
