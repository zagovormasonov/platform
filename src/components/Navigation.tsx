import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Home, Edit3, Users, Search, Eye, ChevronDown, FileText, User, Menu, X, MessageCircle } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ProfileForm } from './ProfileForm'
import { ExpertSearch } from './ExpertSearch'
import { UserProfile } from './UserProfile'
import { ChatModal } from './ChatModal'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
}

export function Navigation() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showExpertSearch, setShowExpertSearch] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const handleOpenChat = () => {
    setShowChat(true)
  }

  const updateUnreadCount = (count: number) => {
    setUnreadCount(count)
  }

  // Загрузка профиля пользователя
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', user.id)
            .single()

          if (error) {
            console.error('Ошибка загрузки профиля:', error)
            return
          }

          setUserProfile(data)
        } catch (err) {
          console.error('Ошибка загрузки профиля:', err)
        }
      }
    }

    const fetchUnreadCount = async () => {
      if (user) {
        try {
          // Получаем все чаты пользователя
          const { data: chats, error: chatsError } = await supabase
            .from('chats')
            .select('id')
            .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)

          if (chatsError) {
            console.error('Ошибка загрузки чатов:', chatsError)
            return
          }

          if (!chats || chats.length === 0) {
            setUnreadCount(0)
            return
          }

          // Получаем все сообщения от других пользователей во всех чатах
          const chatIds = chats.map(chat => chat.id)
          const { data: messages, error: messagesError } = await supabase
            .from('messages')
            .select('id')
            .in('chat_id', chatIds)
            .neq('sender_id', user.id) // Только сообщения от других пользователей

          if (messagesError) {
            console.error('Ошибка загрузки сообщений:', messagesError)
            return
          }

          setUnreadCount(messages?.length || 0)
        } catch (err) {
          console.error('Ошибка подсчета непрочитанных сообщений:', err)
        }
      }
    }

    fetchUserProfile()
    fetchUnreadCount()
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      
      if (showProfileMenu && !target.closest('.profile-dropdown')) {
        console.log('Closing profile menu due to outside click')
        setShowProfileMenu(false)
      }
      
      if (showMobileMenu && !target.closest('.mobile-menu')) {
        console.log('Closing mobile menu due to outside click')
        setShowMobileMenu(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showProfileMenu) {
          setShowProfileMenu(false)
        }
        if (showMobileMenu) {
          setShowMobileMenu(false)
        }
      }
    }

    if (showProfileMenu || showMobileMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showProfileMenu, showMobileMenu])

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="text-lg sm:text-xl font-bold text-gray-900">
            Spiritual Platform
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-4">
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
                className="p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                title="Поиск экспертов"
              >
                <Search className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleOpenChat}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                title="Чаты"
              >
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </nav>
            
            {/* Desktop Profile Menu */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                {userProfile?.avatar_url ? (
                  <img
                    src={userProfile.avatar_url}
                    alt={userProfile.full_name || 'Пользователь'}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>Мой профиль</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              
              {/* Desktop Dropdown Menu */}
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowUserProfile(true)
                      setShowProfileMenu(false)
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Просмотр профиля</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowProfileForm(true)
                      setShowProfileMenu(false)
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Редактировать профиль</span>
                  </button>
                  
                  <Link
                    to="/dashboard"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Мои статьи</span>
                  </Link>
                  
                  <Link
                    to="/friends"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Users className="h-4 w-4" />
                    <span>Друзья</span>
                  </Link>
                </div>
              )}
            </div>
            
            <button
              onClick={signOut}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
            >
              <LogOut className="h-4 w-4" />
              <span>Выйти</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden mobile-menu">
            <button
              onClick={() => {
                console.log('Mobile menu button clicked, current state:', showMobileMenu)
                setShowMobileMenu(!showMobileMenu)
              }}
              className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden border-t border-gray-200 py-4 mobile-menu">
            <div className="space-y-2">
              <Link
                to="/feed"
                onClick={() => setShowMobileMenu(false)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                  isActive('/feed')
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Лента</span>
              </Link>
              
              <button
                onClick={() => {
                  console.log('Mobile menu: Opening ExpertSearch')
                  setShowExpertSearch(true)
                  setShowMobileMenu(false)
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <Search className="h-4 w-4" />
                <span>Поиск экспертов</span>
              </button>
              
              <button
                onClick={() => {
                  handleOpenChat()
                  setShowMobileMenu(false)
                }}
                className="relative flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <MessageCircle className="h-4 w-4" />
                <span>Чаты</span>
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              <button
                onClick={() => {
                  console.log('Mobile menu: Opening UserProfile')
                  setShowUserProfile(true)
                  setShowMobileMenu(false)
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <Eye className="h-4 w-4" />
                <span>Просмотр профиля</span>
              </button>
              
              <button
                onClick={() => {
                  console.log('Mobile menu: Opening ProfileForm')
                  setShowProfileForm(true)
                  setShowMobileMenu(false)
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <Edit3 className="h-4 w-4" />
                <span>Редактировать профиль</span>
              </button>
              
              <Link
                to="/dashboard"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <FileText className="h-4 w-4" />
                <span>Мои статьи</span>
              </Link>
              
              <Link
                to="/friends"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <Users className="h-4 w-4" />
                <span>Друзья</span>
              </Link>
              
              <button
                onClick={() => {
                  signOut()
                  setShowMobileMenu(false)
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <LogOut className="h-4 w-4" />
                <span>Выйти</span>
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showProfileForm && (
        <ProfileForm onClose={() => setShowProfileForm(false)} />
      )}
      
      {showExpertSearch && (
        <ExpertSearch onClose={() => setShowExpertSearch(false)} />
      )}
      
      {showUserProfile && user && (
        <UserProfile 
          userId={user.id} 
          onClose={() => setShowUserProfile(false)} 
        />
      )}
      
      {showChat && (
        <ChatModal
          isOpen={showChat}
          onClose={() => setShowChat(false)}
          onUnreadCountUpdate={updateUnreadCount}
        />
      )}
    </header>
  )
}