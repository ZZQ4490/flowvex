import { useState, useEffect, useCallback, useMemo } from 'react';
import { FloatingNodePalette } from '../components/FloatingNodePalette';
import { WorkflowCanvas } from '../components/WorkflowCanvas';
import { NodeConfigPanel } from '../components/NodeConfigPanel';
import { Icon } from '../components/Icon';
import { useWorkflowStore } from '../stores/workflowStore';
import { NodeTemplate } from '../types/workflow';
import { toast } from '../components/common/Toast';

export const WorkflowEditor: React.FC = () => {
  const [showNodePalette, setShowNodePalette] = useState(true);
  
  const {
    workflow,
    selectedNodeId,
    loadWorkflows,
    saveWorkflow,
    selectNode,
    undo,
    redo,
    undoStack,
    redoStack,
    isExecuting,
    stopExecution,
    runWorkflow,
  } = useWorkflowStore();

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

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

  const handleSave = useCallback(() => {
    saveWorkflow();
    toast.success('工作流已保存');
  }, [saveWorkflow]);

  const handleRun = useCallback(async () => {
    if (isExecuting) {
      stopExecution();
    } else {
      await runWorkflow();
    }
  }, [isExecuting, runWorkflow, stopExecution]);

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

  if (!workflow) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: 'var(--canvas-bg)' }}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-gray-200 rounded-2xl flex items-center justify-center">
            <Icon name="MousePointerClick" size={40} className="text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            选择一个工作流
          </h2>
          <p className="text-gray-500">
            从左侧选择一个工作流开始编辑
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--canvas-bg)' }}>
      {/* Editor Toolbar */}
      <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          {/* Node Palette Toggle */}
          <button
            onClick={() => setShowNodePalette(!showNodePalette)}
            className={`p-2 rounded-lg transition-colors ${
              showNodePalette 
                ? 'bg-primary-50 text-primary-600' 
                : 'hover:bg-gray-100 text-gray-500'
            }`}
            title="节点面板"
          >
            <Icon name="Layers" size={18} />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="撤销 (Ctrl+Z)"
            >
              <Icon name="Undo2" size={18} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="重做 (Ctrl+Y)"
            >
              <Icon name="Redo2" size={18} />
            </button>
          </div>

          <div className="w-px h-6 bg-gray-200 mx-1" />

          {/* Workflow Info */}
          <div className="flex items-center gap-2 px-2">
            <span className="text-sm font-medium text-gray-700">{workflow.name}</span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              workflow.status === 'published'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-gray-100 text-gray-600'
            }`}>
              {workflow.status === 'published' ? '已发布' : '草稿'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save */}
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Icon name="Save" size={16} />
            保存
          </button>
          
          {/* Run */}
          <button
            onClick={handleRun}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm text-white rounded-lg transition-colors font-medium ${
              isExecuting 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-primary-600 hover:bg-primary-700 shadow-sm shadow-primary-600/25'
            }`}
          >
            {isExecuting ? (
              <>
                <Icon name="Square" size={14} />
                停止
              </>
            ) : (
              <>
                <Icon name="Play" size={14} />
                运行
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Floating Node Palette */}
        <FloatingNodePalette
          isOpen={showNodePalette}
          onClose={() => setShowNodePalette(false)}
          onDragStart={handleDragStart}
          onNodeDoubleClick={handleNodeDoubleClick}
        />
        
        {/* Canvas */}
        <WorkflowCanvas onNodeSelect={handleNodeSelect} />
      </div>

      {/* Floating Config Panel */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => selectNode(null)}
        />
      )}
    </div>
  );
};
