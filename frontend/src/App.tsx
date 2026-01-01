import { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { NodePalette } from './components/NodePalette';
import { WorkflowCanvas } from './components/WorkflowCanvas';
import { NodeConfigPanel } from './components/NodeConfigPanel';
import { WorkflowList } from './components/WorkflowList';
import { NewWorkflowModal } from './components/NewWorkflowModal';
import { AISettingsModal } from './components/settings/AISettingsModal';
import { ToastContainer, toast } from './components/common/Toast';
import { Icon } from './components/Icon';
import { useWorkflowStore } from './stores/workflowStore';
import { useAuthStore } from './stores/authStore';
import { NodeTemplate } from './types/workflow';
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
  const [showWorkflowList, setShowWorkflowList] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showAISettings, setShowAISettings] = useState(false);
  
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
          saveWorkflow();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveWorkflow]);

  const handleDragStart = useCallback((event: React.DragEvent, template: NodeTemplate) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleNodeDoubleClick = useCallback((template: NodeTemplate) => {
    // Add node at center of canvas when double-clicked
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
    setShowWorkflowList(false);
  }, [createWorkflow]);

  const handleSave = useCallback(() => {
    saveWorkflow();
    toast.success('工作流已保存');
  }, [saveWorkflow]);

  const handleRun = useCallback(() => {
    if (isExecuting) {
      stopExecution();
    } else {
      startExecution();
      // Simulate execution for demo
      setTimeout(() => stopExecution(), 3000);
    }
  }, [isExecuting, startExecution, stopExecution]);

  const selectedNode = useMemo(() => {
    return workflow?.nodes.find(n => n.id === selectedNodeId);
  }, [workflow?.nodes, selectedNodeId]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header
        onNewWorkflow={handleNewWorkflow}
        onSave={handleSave}
        onRun={handleRun}
        onOpenSettings={() => setShowAISettings(true)}
      />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Node Palette */}
        <NodePalette 
          onDragStart={handleDragStart} 
          onNodeDoubleClick={handleNodeDoubleClick}
        />
        
        {/* Center: Canvas */}
        <div className="flex-1 relative">
          {workflow ? (
            <WorkflowCanvas onNodeSelect={handleNodeSelect} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
                  <Icon name="Rocket" size={40} color="white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">
                  开始构建你的AI工作流
                </h2>功能
                <p className="text-gray-500 mb-4">
                  选择一个现有工作流或创建新的工作流
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowWorkflowList(true)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center gap-1"
                  >
                    <Icon name="FolderOpen" size={16} />
                    打开工作流
                  </button>
                  <button
                    onClick={handleNewWorkflow}
                    className="px-4 py-2 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 flex items-center gap-1"
                  >
                    <Icon name="Plus" size={16} />
                    新建工作流
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onClose={() => selectNode(null)}
        />
      )}
      {showWorkflowList && (
        <WorkflowList
          workflows={workflows}
          currentWorkflowId={workflow?.id || null}
          onSelect={(w) => {
            setWorkflow(w);
            setShowWorkflowList(false);
          }}
          onDelete={deleteWorkflow}
          onNew={() => {
            setShowWorkflowList(false);
            setShowNewModal(true);
          }}
          onClose={() => setShowWorkflowList(false)}
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

      {/* Toast notifications */}
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
