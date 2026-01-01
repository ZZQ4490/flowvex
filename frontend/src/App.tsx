import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { FloatingNodePalette } from './components/FloatingNodePalette';
import { FloatingSidebar } from './components/FloatingSidebar';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import { NewWorkflowModal } from './components/NewWorkflowModal';
import { AISettingsModal } from './components/settings/AISettingsModal';
import { ToastContainer, toast } from './components/common/Toast';
import { Icon } from './components/Icon';
import { useWorkflowStore } from './stores/workflowStore';
import { useAuthStore } from './stores/authStore';
import { NodeTemplate, Workflow } from './types/workflow';
import { AuthPage } from './pages/AuthPage';

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);
  
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Icon name="Loader2" size={40} className="animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
};

// Main workflow editor component
const WorkflowEditor: React.FC = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedState, setLastSavedState] = useState<string | null>(null);
  
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
    startExecution,
    stopExecution,
    isExecuting,
    undo,
    redo,
  } = useWorkflowStore();

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Track unsaved changes
  useEffect(() => {
    if (workflow) {
      const currentState = JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges });
      if (lastSavedState === null) {
        setLastSavedState(currentState);
      } else {
        setHasUnsavedChanges(currentState !== lastSavedState);
      }
    }
  }, [workflow?.nodes, workflow?.edges, lastSavedState]);

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
  }, [undo, redo]);

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
    setLastSavedState(null);
    setHasUnsavedChanges(false);
  }, [createWorkflow]);

  const handleSave = useCallback(() => {
    saveWorkflow();
    if (workflow) {
      setLastSavedState(JSON.stringify({ nodes: workflow.nodes, edges: workflow.edges }));
    }
    setHasUnsavedChanges(false);
    toast.success('工作流已保存');
  }, [saveWorkflow, workflow]);

  const handleSwitchWorkflow = useCallback((w: Workflow) => {
    setWorkflow(w);
    setLastSavedState(JSON.stringify({ nodes: w.nodes, edges: w.edges }));
    setHasUnsavedChanges(false);
  }, [setWorkflow]);

  const handleRun = useCallback(() => {
    if (isExecuting) {
      stopExecution();
    } else {
      startExecution();
      setTimeout(() => stopExecution(), 3000);
    }
  }, [isExecuting, startExecution, stopExecution]);

  const selectedNode = useMemo(() => {
    return workflow?.nodes.find(n => n.id === selectedNodeId);
  }, [workflow?.nodes, selectedNodeId]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <Header
        onNewWorkflow={handleNewWorkflow}
        onSave={handleSave}
        onRun={handleRun}
        onOpenSettings={() => setShowAISettings(true)}
        onSwitchWorkflow={handleSwitchWorkflow}
        hasUnsavedChanges={hasUnsavedChanges}
      />
      
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
          hasUnsavedChanges={hasUnsavedChanges}
          onSaveWorkflow={handleSave}
        />

        {/* Floating Node Palette */}
        <FloatingNodePalette
          isOpen={showNodePalette}
          onClose={() => setShowNodePalette(false)}
          onDragStart={handleDragStart}
          onNodeDoubleClick={handleNodeDoubleClick}
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

      {showAISettings && (
        <AISettingsModal onClose={() => setShowAISettings(false)} />
      )}

      <ToastContainer />
    </div>
  );
};

// Main App with routing
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <WorkflowEditor />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
