import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { LogOut, Home, Edit3, Users, Search, UserCheck, Eye } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ProfileForm } from './ProfileForm'
import { ExpertSearch } from './ExpertSearch'
import { UserProfile } from './UserProfile'

export function Navigation() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showExpertSearch, setShowExpertSearch] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [userType, setUserType] = useState<'user' | 'expert' | null>(null)

  const isActive = (path: string) => {
    return location.pathname === path
  }

  useEffect(() => {
    if (user) {
      fetchUserType()
    }
  }, [user])

  const fetchUserType = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Ошибка загрузки типа пользователя:', error)
        return
      }

      setUserType(data.user_type)
    } catch (err) {
      console.error('Ошибка загрузки типа пользователя:', err)
    }
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
              
              <button
                onClick={() => setShowExpertSearch(true)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Search className="h-4 w-4" />
                <span>Поиск экспертов</span>
              </button>
              
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
              
              <Link
                to="/friends"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/friends')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Users className="h-4 w-4" />
                <span>Друзья</span>
              </Link>
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {userType === 'expert' ? (
                <UserCheck className="h-4 w-4 text-blue-600" />
              ) : (
                <Users className="h-4 w-4 text-gray-400" />
              )}
              <span className="text-sm text-gray-600">
                {user?.email}
              </span>
            </div>
            <button
              onClick={() => setShowUserProfile(true)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Eye className="h-4 w-4" />
              <span>Мой профиль</span>
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
      
      {/* Expert Search Modal */}
      {showExpertSearch && (
        <ExpertSearch onClose={() => setShowExpertSearch(false)} />
      )}
      
      {showUserProfile && user && (
        <UserProfile 
          userId={user.id} 
          onClose={() => setShowUserProfile(false)} 
        />
      )}
    </header>
  )
}
