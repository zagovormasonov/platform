// @ts-nocheck
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LogOut, Home, Edit3, Users, Search, Eye, ChevronDown, FileText, User, Menu, X, MessageCircle, Heart, Bookmark, Bell, UserCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ProfileForm } from './ProfileForm'
import { ExpertSearch } from './ExpertSearch'
import { UserProfile } from './UserProfile'
import { ChatModal } from './ChatModal'
import { apiClient } from '../lib/api'

export function Navigation() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [showExpertSearch, setShowExpertSearch] = useState(false)
  const [showUserProfile, setShowUserProfile] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0)
  const [lastViewedTimes, setLastViewedTimes] = useState<Map<string, string>>(new Map())

  // Загружаем время последнего просмотра из localStorage при инициализации
  useEffect(() => {
    if (user) {
      const savedTimes = localStorage.getItem(`lastViewedTimes_${user.id}`)
      if (savedTimes) {
        try {
          const parsedTimes = JSON.parse(savedTimes)
          setLastViewedTimes(new Map(Object.entries(parsedTimes)))
        } catch (err) {
          console.error('Ошибка загрузки времени просмотра из localStorage:', err)
        }
      }
    }
  }, [user])

  // Сохраняем время последнего просмотра в localStorage при изменении
  useEffect(() => {
    if (user && lastViewedTimes.size > 0) {
      const timesObject = Object.fromEntries(lastViewedTimes)
      localStorage.setItem(`lastViewedTimes_${user.id}`, JSON.stringify(timesObject))
    }
  }, [lastViewedTimes, user])

  const isActive = (path: string) => {
    return location.pathname === path
  }

  const handleOpenChat = () => {
    setShowChat(true)
  }

  const updateUnreadCount = (count: number) => {
    setUnreadCount(count)
  }

  // Загрузка уведомлений
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (user) {
        try {
          // Получаем количество непрочитанных через API
          const response = await apiClient.getUnreadCount()
          
          if (response.error) {
            console.error('Ошибка загрузки непрочитанных:', response.error)
            return
          }

          setUnreadCount(response.data?.count || 0)
        } catch (err) {
          console.error('Ошибка загрузки непрочитанных:', err)
        }
      }
    }

    const fetchUnreadNotificationsCount = async () => {
      if (!user) {
        setUnreadNotificationsCount(0)
        return
      }

      try {
        const response = await apiClient.getUnreadCount()

        if (response.error) {
          console.error('Ошибка получения количества уведомлений:', response.error)
          return
        }

        setUnreadNotificationsCount(response.data?.count || 0)
      } catch (err) {
        console.error('Ошибка подсчета непрочитанных уведомлений:', err)
      }
    }

    fetchUnreadCount()
    fetchUnreadNotificationsCount()
  }, [user, lastViewedTimes])

  // Подписка на обновления уведомлений через Realtime
  useEffect(() => {
    if (!user) return

    const updateNotificationsCount = async () => {
      try {
        const response = await apiClient.getUnreadCount()

        if (response.error) {
          console.error('Ошибка получения количества уведомлений:', response.error)
          return
        }

        setUnreadNotificationsCount(response.data?.count || 0)
      } catch (err) {
        console.error('Ошибка подсчета непрочитанных уведомлений:', err)
      }
    }

    // Пока отключаем realtime подписку, так как используем API
    // В будущем можно добавить WebSocket или polling
    const interval = setInterval(updateNotificationsCount, 30000) // Обновляем каждые 30 секунд

    return () => {
      clearInterval(interval)
    }
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
    <header className="bg-black bg-opacity-30 backdrop-blur-[40px] border-b border-white border-opacity-20 fixed top-0 left-0 right-0 z-[9999] shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <img 
              src="/logo4.png" 
              alt="Logo" 
              className="h-10 w-10 object-contain"
            />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-bold text-white">SoulSynergy</span>
              <span className="text-xs text-white text-opacity-70">centerra</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-4">
              <Link
                to="/feed"
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive('/feed')
                    ? 'bg-white bg-opacity-20 text-white border border-white border-opacity-30'
                    : 'text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-15'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Лента</span>
              </Link>
              
              <button
                onClick={() => setShowExpertSearch(true)}
                className="p-2 text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-15 transition-colors rounded-lg"
                title="Поиск экспертов"
              >
                <Search className="h-5 w-5" />
              </button>
              
              <button
                onClick={handleOpenChat}
                className="relative p-2 text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-15 transition-colors rounded-lg"
                title="Чаты"
              >
                <MessageCircle className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              
              <Link
                to="/notifications"
                className="relative p-2 text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-15 transition-colors rounded-lg"
                title="Уведомления"
              >
                <Bell className="h-5 w-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </Link>
            </nav>
            
            {/* Desktop Profile Menu */}
            <div className="relative profile-dropdown">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-15"
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user?.full_name || 'Пользователь'}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-4 w-4" />
                )}
                <span>{user?.full_name || 'Пользователь'}</span>
                {user?.is_expert && (
                  <UserCheck className="h-3 w-3 text-blue-400" />
                )}
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
                  
                  <Link
                    to="/favorites"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span>Избранное</span>
                  </Link>
                  
                  <Link
                    to="/liked"
                    onClick={() => setShowProfileMenu(false)}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Heart className="h-4 w-4" />
                    <span>Понравившиеся</span>
                  </Link>
                  
                  {/* Разделитель */}
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  {/* Кнопка Выйти */}
                  <button
                    onClick={() => {
                      signOut()
                      setShowProfileMenu(false)
                    }}
                    className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Выйти</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden mobile-menu">
            <button
              onClick={() => {
                console.log('Mobile menu button clicked, current state:', showMobileMenu)
                setShowMobileMenu(!showMobileMenu)
              }}
              className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              {showMobileMenu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
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
              
              <Link
                to="/notifications"
                onClick={() => setShowMobileMenu(false)}
                className="relative flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <Bell className="h-4 w-4" />
                <span>Уведомления</span>
                {unreadNotificationsCount > 0 && (
                  <span className="ml-auto bg-orange-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                  </span>
                )}
              </Link>
              
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
              
              <Link
                to="/favorites"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <Bookmark className="h-4 w-4" />
                <span>Избранное</span>
              </Link>
              
              <Link
                to="/liked"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-manipulation"
              >
                <Heart className="h-4 w-4" />
                <span>Понравившиеся</span>
              </Link>
              
              <button
                onClick={() => {
                  signOut()
                  setShowMobileMenu(false)
                }}
                className="flex items-center space-x-2 w-full px-3 py-2 rounded-lg text-sm font-medium text-white text-opacity-90 hover:text-white hover:bg-white hover:bg-opacity-15 touch-manipulation"
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