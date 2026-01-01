import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Header } from './components/Header';
import { AISettingsModal } from './components/settings/AISettingsModal';
import { ToastContainer } from './components/common/Toast';
import { useAuthStore } from './stores/authStore';
import { useWorkflowStore } from './stores/workflowStore';
import { AuthPage } from './pages/AuthPage';
import { Dashboard } from './pages/Dashboard';
import { WorkflowEditor } from './pages/WorkflowEditor';
import { Icon } from './components/Icon';

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

// Main app component with header
const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [showAISettings, setShowAISettings] = useState(false);
  const { startExecution, stopExecution, isExecuting, saveWorkflow } = useWorkflowStore();

  const handleRun = useCallback(() => {
    if (isExecuting) {
      stopExecution();
    } else {
      startExecution();
      setTimeout(() => stopExecution(), 3000);
    }
  }, [isExecuting, startExecution, stopExecution]);

  return (
    <div className="h-screen flex flex-col">
      <Header
        onNewWorkflow={() => {}}
        onSave={saveWorkflow}
        onRun={handleRun}
        onOpenSettings={() => setShowAISettings(true)}
      />
      
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {showAISettings && (
        <AISettingsModal onClose={() => setShowAISettings(false)} />
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
