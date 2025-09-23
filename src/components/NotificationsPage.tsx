// @ts-nocheck
import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { Bell, BellOff, Calendar, User, Clock, Check, X, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { PageLayout } from './PageLayout'
import { UserProfile } from './UserProfile'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: any
  is_read: boolean
  created_at: string
  updated_at: string
}

export function NotificationsPage() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [updatingBookings, setUpdatingBookings] = useState<Set<string>>(new Set())
  const [toastMessage, setToastMessage] = useState<string>('')
  const [showToast, setShowToast] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [showUserProfile, setShowUserProfile] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError('')

      if (!user) {
        setError('Необходимо авторизоваться')
        return
      }

      const response = await apiClient.getNotifications()

      if (response.error) {
        console.error('Ошибка загрузки уведомлений:', response.error)
        setError('Не удалось загрузить уведомления')
        return
      }

      setNotifications(response.data || [])
    } catch (err) {
      console.error('Ошибка загрузки уведомлений:', err)
      setError('Произошла ошибка при загрузке')
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationIds: string[]) => {
    try {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        notificationIds.forEach(id => newSet.add(id))
        return newSet
      })

      const { error } = await supabase
        .rpc('mark_notifications_as_read', {
          p_notification_ids: notificationIds,
          p_user_id: user!.id
        })

      if (error) throw error

      // Обновляем локальное состояние
      setNotifications(prev => prev.map(notification => 
        notificationIds.includes(notification.id)
          ? { ...notification, is_read: true }
          : notification
      ))
    } catch (error) {
      console.error('Ошибка при пометке как прочитанное:', error)
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        notificationIds.forEach(id => newSet.delete(id))
        return newSet
      })
    }
  }



  // Управление бронированиями
  const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    if (!user) return

    setUpdatingBookings(prev => new Set(prev).add(bookingId))

    try {
      // Обновляем статус бронирования
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .eq('expert_id', user.id) // Проверяем что эксперт управляет своими бронированиями

      if (bookingError) throw bookingError

      // Обновляем доступность слота
      if (status === 'cancelled') {
        // При отмене делаем слот снова доступным
        const { error: slotError } = await supabase
          .from('time_slots')
          .update({ is_available: true })
          .eq('id', (await supabase
            .from('bookings')
            .select('slot_id')
            .eq('id', bookingId)
            .single()
          ).data?.slot_id)

        if (slotError) console.error('Ошибка обновления слота:', slotError)
      }

      // Обновляем уведомление в базе данных
      const notificationToUpdate = notifications.find(n => n.data?.booking_id === bookingId)
      if (notificationToUpdate) {
        const newType = `booking_${status}`
        const newTitle = status === 'confirmed' ? 'Бронирование подтверждено' : 'Бронирование отменено'
        const newMessage = notificationToUpdate.message.replace(
          'запросил(а) бронирование', 
          status === 'confirmed' ? 'подтвердил(а) бронирование' : 'отменил(а) бронирование'
        )

        const { error: notificationError } = await supabase
          .from('notifications')
          .update({
            type: newType,
            title: newTitle,
            message: newMessage,
            is_read: true, // Автоматически помечаем как прочитанное
            updated_at: new Date().toISOString()
          })
          .eq('id', notificationToUpdate.id)

        if (notificationError) {
          console.error('Ошибка обновления уведомления:', notificationError)
        }
      }

      // Показываем тост
      const message = status === 'confirmed' ? 'Бронирование подтверждено' : 'Бронирование отменено'
      showToastNotification(message)

      // Обновляем локальное состояние уведомления
      setNotifications(prev => prev.map(notification => {
        if (notification.data?.booking_id === bookingId) {
          return {
            ...notification,
            type: `booking_${status}`,
            title: status === 'confirmed' ? 'Бронирование подтверждено' : 'Бронирование отменено',
            message: notification.message.replace('запросил(а) бронирование', status === 'confirmed' ? 'подтвердил(а) бронирование' : 'отменил(а) бронирование'),
            is_read: true // Автоматически помечаем как прочитанное
          }
        }
        return notification
      }))

    } catch (error: any) {
      console.error('Ошибка обновления бронирования:', error)
      setError('Ошибка при обновлении бронирования: ' + error.message)
    } finally {
      setUpdatingBookings(prev => {
        const newSet = new Set(prev)
        newSet.delete(bookingId)
        return newSet
      })
    }
  }

  const confirmBooking = (bookingId: string) => updateBookingStatus(bookingId, 'confirmed')
  const cancelBooking = (bookingId: string) => updateBookingStatus(bookingId, 'cancelled')

  // Функция для показа тост-уведомлений
  const showToastNotification = (message: string) => {
    setToastMessage(message)
    setShowToast(true)
    setTimeout(() => {
      setShowToast(false)
      setToastMessage('')
    }, 4000)
  }

  // Функция для перехода в профиль пользователя
  const openUserProfile = (userId: string, userName: string) => {
    console.log('Открытие профиля пользователя:', { userId, userName })
    setSelectedUserId(userId)
    setShowUserProfile(true)
  }

  // Функция для закрытия профиля пользователя
  const closeUserProfile = () => {
    setSelectedUserId(null)
    setShowUserProfile(false)
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'booking_pending':
        return <Calendar className="h-5 w-5 text-yellow-600" />
      case 'booking_confirmed':
        return <Check className="h-5 w-5 text-green-600" />
      case 'booking_cancelled':
        return <X className="h-5 w-5 text-red-600" />
      case 'booking_confirmed_client':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'booking_cancelled_client':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Bell className="h-5 w-5 text-blue-600" />
    }
  }

  const getNotificationColor = (type: string, isRead: boolean) => {
    const baseClasses = isRead 
      ? 'bg-gray-50 border-gray-200' 
      : 'bg-white border-blue-200 shadow-sm'

    switch (type) {
      case 'booking_pending':
        return isRead ? baseClasses : 'bg-yellow-50 border-yellow-200'
      case 'booking_confirmed':
        return isRead ? baseClasses : 'bg-green-50 border-green-200'
      case 'booking_cancelled':
        return isRead ? baseClasses : 'bg-red-50 border-red-200'
      case 'booking_confirmed_client':
        return isRead ? baseClasses : 'bg-green-50 border-green-200'
      case 'booking_cancelled_client':
        return isRead ? baseClasses : 'bg-red-50 border-red-200'
      default:
        return baseClasses
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)
    const diffDays = diffMs / (1000 * 60 * 60 * 24)

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return `${diffMinutes} мин назад`
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)} ч назад`
    } else if (diffDays < 7) {
      return `${Math.floor(diffDays)} дн назад`
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      })
    }
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка уведомлений...</p>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                <BellOff className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h3>
              <p className="mt-2 text-gray-600">{error}</p>
              <button
                onClick={fetchNotifications}
                className="mt-4 btn-primary"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Bell className="h-8 w-8 text-blue-600 mr-3" />
                <h1 className="text-3xl font-bold text-gray-900">Уведомления</h1>
                {unreadCount > 0 && (
                  <span className="ml-3 px-2 py-1 bg-red-500 text-white text-sm font-medium rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            <p className="text-gray-600">
              {notifications.length === 0 
                ? 'У вас пока нет уведомлений' 
                : `Всего уведомлений: ${notifications.length}`
              }
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
                <Bell className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Нет уведомлений</h3>
              <p className="mt-2 text-gray-600">
                Здесь будут отображаться уведомления о бронированиях и других важных событиях
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all ${getNotificationColor(notification.type, notification.is_read)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className={`text-sm font-medium ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          )}
                        </div>
                        
                        <p className={`text-sm ${notification.is_read ? 'text-gray-500' : 'text-gray-700'}`}>
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDate(notification.created_at)}
                          </span>
                          
                          {notification.data?.slot_date && (
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(notification.data.slot_date).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                          
                          {(notification.data?.client_name || notification.data?.expert_name) && (
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              <button
                                onClick={() => {
                                  if (notification.data.client_name) {
                                    openUserProfile(notification.data.client_id, notification.data.client_name)
                                  } else if (notification.data.expert_name) {
                                    openUserProfile(notification.data.expert_id, notification.data.expert_name)
                                  }
                                }}
                                className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                title="Открыть профиль пользователя"
                              >
                                {notification.data.client_name || notification.data.expert_name}
                              </button>
                            </span>
                          )}
                        </div>
                        
                        {/* Кнопки управления бронированием */}
                        {(notification.type === 'booking_pending' || notification.type === 'booking_confirmed') && notification.data?.booking_id && (
                          <div className="flex items-center space-x-2 mt-3">
                            {notification.type === 'booking_pending' && (
                              <button
                                onClick={() => confirmBooking(notification.data.booking_id)}
                                disabled={updatingBookings.has(notification.data.booking_id)}
                                className="flex items-center space-x-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-xs rounded-lg transition-colors"
                                title="Подтвердить бронирование"
                              >
                                <CheckCircle className="h-4 w-4" />
                                <span>{updatingBookings.has(notification.data.booking_id) ? 'Подтверждаем...' : 'Подтвердить'}</span>
                              </button>
                            )}
                            
                            <button
                              onClick={() => cancelBooking(notification.data.booking_id)}
                              disabled={updatingBookings.has(notification.data.booking_id)}
                              className="flex items-center space-x-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs rounded-lg transition-colors"
                              title={notification.type === 'booking_confirmed' ? 'Отменить подтвержденное бронирование' : 'Отменить бронирование'}
                            >
                              <XCircle className="h-4 w-4" />
                              <span>{updatingBookings.has(notification.data.booking_id) ? 'Отменяем...' : 'Отменить'}</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Показываем статус для обработанных бронирований */}
                        {(notification.type === 'booking_confirmed' || notification.type === 'booking_cancelled' || 
                          notification.type === 'booking_confirmed_client' || notification.type === 'booking_cancelled_client') && (
                          <div className="mt-3">
                            <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                              (notification.type === 'booking_confirmed' || notification.type === 'booking_confirmed_client')
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {(notification.type === 'booking_confirmed' || notification.type === 'booking_confirmed_client') ? (
                                <>
                                  <CheckCircle className="h-3 w-3" />
                                  <span>Подтверждено</span>
                                </>
                              ) : (
                                <>
                                  <XCircle className="h-3 w-3" />
                                  <span>Отменено</span>
                                </>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {!notification.is_read && (
                        <button
                          onClick={() => markAsRead([notification.id])}
                          disabled={updatingIds.has(notification.id)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Пометить как прочитанное"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                      
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Тост-уведомление */}
      {showToast && (
        <div className="fixed top-20 right-4 z-[10000] animate-in fade-in duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Модальное окно профиля пользователя */}
      {showUserProfile && selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          onClose={closeUserProfile}
        />
      )}
    </PageLayout>
  )
}
