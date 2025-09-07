import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { RefreshProvider } from './contexts/RefreshContext'
import { AuthForm } from './components/AuthForm'
import { Dashboard } from './components/Dashboard'
import { Feed } from './components/Feed'
import { ProtectedRoute } from './components/ProtectedRoute'

function AppContent() {
  const { user, loading } = useAuth()
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/auth" 
          element={
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AuthForm 
                mode={authMode} 
                onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} 
              />
            )
          } 
        />
        <Route 
          path="/feed" 
          element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/" 
          element={<Navigate to={user ? "/feed" : "/auth"} replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to={user ? "/feed" : "/auth"} replace />} 
        />
      </Routes>
    </Router>
  )
}

function App() {
  return (
    <AuthProvider>
      <RefreshProvider>
        <AppContent />
      </RefreshProvider>
    </AuthProvider>
  )
}

export default App
