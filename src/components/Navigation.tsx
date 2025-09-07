import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Home, Edit3, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ProfileForm } from './ProfileForm'

export function Navigation() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [showProfileForm, setShowProfileForm] = useState(false)

  const isActive = (path: string) => {
    return location.pathname === path
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="text-2xl font-bold text-gray-900">
              Платформа духовного опыта
            </Link>
            
            <nav className="flex items-center space-x-6">
              <Link
                to="/feed"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/feed')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Лента</span>
              </Link>
              
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Edit3 className="h-4 w-4" />
                <span>Мои статьи</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={() => setShowProfileForm(true)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
              title="Редактировать профиль"
            >
              <Settings className="h-4 w-4" />
              <span>Профиль</span>
            </button>
            <button
              onClick={signOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Profile Form Modal */}
      {showProfileForm && (
        <ProfileForm onClose={() => setShowProfileForm(false)} />
      )}
    </header>
  )
}
