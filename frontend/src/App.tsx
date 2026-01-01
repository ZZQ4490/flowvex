import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { NewWorkflowModal } from './components/NewWorkflowModal';
import { AISettingsModal } from './components/settings/AISettingsModal';
import { ToastContainer } from './components/common/Toast';
import { Icon } from './components/Icon';
import { useAuthStore } from './stores/authStore';
import { useWorkflowStore } from './stores/workflowStore';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { WorkflowEditor } from './pages/WorkflowEditor';

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

// Main layout with sidebar
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showNewModal, setShowNewModal] = useState(false);
  const { createWorkflow } = useWorkflowStore();

  const handleCreateWorkflow = useCallback((name: string, description?: string) => {
    createWorkflow(name, description);
    setShowNewModal(false);
  }, [createWorkflow]);

  return (
    <div className="h-screen flex bg-gray-100">
      {/* Fixed Sidebar */}
      <Sidebar onNewWorkflow={() => setShowNewModal(true)} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>

      {showNewModal && (
        <NewWorkflowModal
          onClose={() => setShowNewModal(false)}
          onCreate={handleCreateWorkflow}
        />
      )}
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
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/editor"
          element={
            <ProtectedRoute>
              <MainLayout>
                <WorkflowEditor />
              </MainLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
