import { useState, useEffect } from 'react'
import { apiClient } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { X, User, Mail, MapPin, Phone, Globe, MessageCircle, Star, Users, Calendar, Award } from 'lucide-react'
import { ReviewsInline } from './ReviewsInline'
import { ChatButton } from './ChatButton'
import { ExpertCalendar } from './ExpertCalendar'

interface UserProfileProps {
  userId: string
  onClose?: () => void
  onBack?: () => void
}

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  website_url: string | null
  github_url: string | null
  linkedin_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  telegram_url: string | null
  user_type: 'user' | 'expert'
  phone: string | null
  city: string | null
  description: string | null
  accepts_online: boolean
  accepts_offline: boolean
  rating: number | null
  total_reviews: number
  total_requests: number
  created_at: string
  categories?: Array<{
    category: {
  id: string
      name: string
      description: string
    }
  }>
}

interface Service {
  id: string
  service_name: string
  service_description: string | null
  price: number
  currency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export function UserProfile({ userId, onClose, onBack }: UserProfileProps) {
  const handleClose = onClose || onBack || (() => {})
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [userId])

  useEffect(() => {
    if (profile?.user_type === 'expert') {
      fetchServices()
    }
  }, [profile])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await apiClient.getProfile(userId)
      
      if (response.error) {
        throw new Error(response.error)
      }

      setProfile(response.data as Profile)
    } catch (err: any) {
      console.error('Ошибка загрузки профиля:', err)
      setError('Не удалось загрузить профиль пользователя')
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    if (!profile) return

    try {
      const response = await apiClient.getExpertServices(profile.id)
      
      if (response.error) {
        console.error('Ошибка загрузки услуг:', response.error)
        return
      }

      setServices((response.data as Service[]) || [])
    } catch (err) {
      console.error('Ошибка загрузки услуг:', err)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="flex items-center justify-center min-h-screen px-4 py-20">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
        <div className="flex items-center justify-center min-h-screen px-4 py-20">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Ошибка</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <p className="text-gray-600 mb-4">{error || 'Профиль не найден'}</p>
            <button
            onClick={handleClose}
            className="w-full btn-primary"
            >
            Закрыть
            </button>
        </div>
        </div>
      </div>
    )
  }

  const isExpert = profile.user_type === 'expert'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 py-20">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
            Профиль {isExpert ? 'эксперта' : 'пользователя'}
          </h2>
            <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            >
            <X className="h-6 w-6" />
            </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)] sm:max-h-[calc(90vh-80px)]">
          <div className="p-4 sm:p-6">
            {/* Profile Header */}
            <div className="flex flex-col sm:flex-row sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6 sm:mb-8">
            {/* Avatar */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Аватар"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-cover"
                  />
                ) : (
                  <User className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                )}
            </div>

              {/* Basic Info */}
            <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 text-center sm:text-left">
                  {profile.full_name || 'Без имени'}
                </h3>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0 mb-4">
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{profile.email}</span>
                  </div>
                  
                  {profile.city && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm">{profile.city}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">На платформе с {formatDate(profile.created_at)}</span>
                  </div>
                </div>

                {/* User Type Badge */}
                <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium mb-4">
                  {isExpert ? (
                    <>
                      <Award className="h-4 w-4 text-purple-600" />
                      <span className="text-purple-800 bg-purple-100 px-2 py-1 rounded-full">
                        Эксперт
                      </span>
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-blue-600" />
                      <span className="text-blue-800 bg-blue-100 px-2 py-1 rounded-full">
                        Пользователь
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Button */}
            {user && user.id !== profile.id && (
              <div className="flex justify-center mb-6">
                <ChatButton
                  recipientId={profile.id}
                  recipientName={profile.full_name || 'Пользователь'}
                  className="w-full sm:w-auto"
                />
              </div>
            )}

            {/* Expert-specific sections */}
            {isExpert && (
              <>
                {/* Rating and Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-600" />
                      <span className="font-semibold text-yellow-800">Рейтинг</span>
                    </div>
                    <div className="text-2xl font-bold text-yellow-900">
                      {profile.rating ? profile.rating.toFixed(1) : 'Нет оценок'}
                    </div>
                    <div className="text-sm text-yellow-700">
                      {profile.total_reviews} отзывов
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Users className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800">Заявки</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">
                      {profile.total_requests}
                    </div>
                    <div className="text-sm text-green-700">
                      обращений
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Globe className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-blue-800">Консультации</span>
                        </div>
                    <div className="space-y-1">
                      {profile.accepts_online && (
                        <div className="text-sm text-blue-700">✓ Онлайн</div>
                      )}
                      {profile.accepts_offline && (
                        <div className="text-sm text-blue-700">✓ Оффлайн</div>
                      )}
                      {!profile.accepts_online && !profile.accepts_offline && (
                        <div className="text-sm text-gray-500">Не указано</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Categories */}
                {profile.categories && profile.categories.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Направления деятельности</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Array.isArray(profile.categories) ? profile.categories.map((cat) => (
                        <div
                          key={cat.category.id}
                          className="bg-purple-50 border border-purple-200 rounded-lg p-3"
                        >
                          <div className="font-medium text-purple-900">
                            {cat.category.name}
                          </div>
                          <div className="text-sm text-purple-700 mt-1">
                            {cat.category.description}
                          </div>
                        </div>
                      )) : []}
                    </div>
                  </div>
                )}

                {/* Description */}
                {profile.description && (
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Описание услуг</h4>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {profile.description}
                      </p>
                </div>
              </div>
                )}

                {/* Services */}
                {services.length > 0 && (
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Услуги и цены</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.isArray(services) ? services.map((service) => (
                        <div
                          key={service.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold text-gray-900 text-lg">
                              {service.service_name}
                            </h5>
                            <div className="flex items-center space-x-1 text-green-600 font-bold">
                              <span className="text-lg">₽</span>
                              <span className="text-xl">{service.price.toLocaleString()}</span>
                            </div>
                          </div>
                          {service.service_description && (
                            <p className="text-gray-600 text-sm mb-3">
                              {service.service_description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {formatDate(service.created_at)}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Активна
                            </span>
                          </div>
                        </div>
                      )) : []}
                    </div>
                  </div>
                )}

                {/* Expert Calendar */}
                <div className="mb-8">
                  <ExpertCalendar 
                    expertId={userId} 
                    viewMode={user?.id === userId ? 'expert' : 'client'} 
                  />
                </div>
              </>
            )}

              {/* Bio */}
              {profile.bio && (
              <div className="mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">О себе</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Контактная информация</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profile.phone && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <Phone className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">Телефон</div>
                      <a
                        href={`tel:${profile.phone}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {profile.phone}
                      </a>
                    </div>
                </div>
              )}

                {profile.website_url && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <Globe className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">Сайт</div>
                      <a
                        href={profile.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {profile.website_url}
                      </a>
                    </div>
                </div>
              )}

                {profile.telegram_url && (
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <MessageCircle className="h-5 w-5 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">Telegram</div>
                      <a
                        href={profile.telegram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {profile.telegram_url}
                      </a>
                    </div>
                  </div>
                )}
                </div>
            </div>

            {/* Reviews (only for experts) */}
            {isExpert && (
              <div>
                <ReviewsInline expertId={profile.id} />
            </div>
          )}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}