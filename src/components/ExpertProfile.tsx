import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Star, MapPin, Phone, Globe, MessageCircle, Users, Calendar, X, MessageSquare } from 'lucide-react'
import { Reviews } from './Reviews'

interface ExpertProfile {
  id: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  description: string | null
  city: string | null
  phone: string | null
  accepts_online: boolean
  accepts_offline: boolean
  rating: number
  total_reviews: number
  total_requests: number
  website_url: string | null
  telegram_url: string | null
  created_at: string
  categories: Array<{
    category: {
      id: string
      name: string
    }
  }>
}

interface ExpertProfileProps {
  expertId: string
  onClose: () => void
}

export function ExpertProfile({ expertId, onClose }: ExpertProfileProps) {
  const [expert, setExpert] = useState<ExpertProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showReviews, setShowReviews] = useState(false)

  useEffect(() => {
    fetchExpert()
  }, [expertId])

  const fetchExpert = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          categories:expert_categories(
            category:categories(*)
          )
        `)
        .eq('id', expertId)
        .eq('user_type', 'expert')
        .single()

      if (error) {
        console.error('Ошибка загрузки профиля эксперта:', error)
        return
      }

      setExpert(data)
    } catch (err) {
      console.error('Ошибка загрузки профиля эксперта:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRequestExpert = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('Необходимо войти в систему для отправки заявки')
        return
      }

      const { error } = await supabase
        .from('expert_requests')
        .insert({
          expert_id: expertId,
          client_id: user.id,
          message: `Заявка от пользователя ${user.email}`,
          status: 'pending'
        })

      if (error) {
        console.error('Ошибка отправки заявки:', error)
        alert('Не удалось отправить заявку')
        return
      }

      alert('Заявка успешно отправлена!')
    } catch (err) {
      console.error('Ошибка отправки заявки:', err)
      alert('Произошла ошибка при отправке заявки')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка профиля...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!expert) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Эксперт не найден</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold text-gray-900">
              Профиль эксперта
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Expert Info */}
            <div className="flex items-start space-x-6 mb-8">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                {expert.avatar_url ? (
                  <img
                    src={expert.avatar_url}
                    alt={expert.full_name || 'Эксперт'}
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <Users className="h-12 w-12 text-gray-400" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {expert.full_name || 'Эксперт'}
                </h3>
                
                <div className="flex items-center space-x-6 mb-4">
                  {expert.city && (
                    <div className="flex items-center space-x-1 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>{expert.city}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>На платформе с {formatDate(expert.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    {renderStars(expert.rating)}
                    <span className="text-lg font-semibold text-gray-900">
                      {expert.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-500">
                      ({expert.total_reviews} отзывов)
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1 text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>{expert.total_requests} заявок</span>
                  </div>
                </div>

                {/* Service Types */}
                <div className="flex items-center space-x-4 mb-4">
                  {expert.accepts_online && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Globe className="h-4 w-4" />
                      <span className="text-sm font-medium">Онлайн</span>
                    </div>
                  )}
                  {expert.accepts_offline && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <MapPin className="h-4 w-4" />
                      <span className="text-sm font-medium">Оффлайн</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <button
                  onClick={handleRequestExpert}
                  className="btn-primary"
                >
                  Отправить заявку
                </button>
                <button
                  onClick={() => setShowReviews(true)}
                  className="btn-secondary flex items-center space-x-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Отзывы</span>
                </button>
              </div>
            </div>

            {/* Bio */}
            {expert.bio && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">О себе</h4>
                <p className="text-gray-700">{expert.bio}</p>
              </div>
            )}

            {/* Description */}
            {expert.description && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Описание услуг</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{expert.description}</p>
              </div>
            )}

            {/* Categories */}
            {expert.categories && expert.categories.length > 0 && (
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Направления деятельности</h4>
                <div className="flex flex-wrap gap-2">
                  {expert.categories.map((cat, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {cat.category.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Контакты</h4>
              <div className="space-y-2">
                {expert.phone && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>{expert.phone}</span>
                  </div>
                )}
                {expert.website_url && (
                  <a
                    href={expert.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Веб-сайт</span>
                  </a>
                )}
                {expert.telegram_url && (
                  <a
                    href={expert.telegram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Telegram</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Modal */}
      {showReviews && (
        <Reviews
          expertId={expertId}
          onClose={() => setShowReviews(false)}
        />
      )}
    </>
  )
}
