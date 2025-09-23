import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Star, X, Send, User, Calendar } from 'lucide-react'

interface Review {
  id: string
  expert_id: string
  client_id: string
  rating: number
  comment: string | null
  request_reason: string | null
  created_at: string
  client: {
    full_name: string | null
    avatar_url: string | null
  }
}

interface ReviewsProps {
  expertId: string
  onClose?: () => void
}

export function Reviews({ expertId, onClose }: ReviewsProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const requestReasons = [
    'здоровье',
    'психическое',
    'физическое',
    'раскрытие способностей',
    'наставничество',
    'предсказания',
    'самопознание'
  ]

  useEffect(() => {
    fetchReviews()
  }, [expertId])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          client:profiles!reviews_client_id_fkey(
            full_name,
            avatar_url
          )
        `)
        .eq('expert_id', expertId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки отзывов:', error)
        return
      }

      setReviews(data || [])
    } catch (err) {
      console.error('Ошибка загрузки отзывов:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || rating === 0) return

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          expert_id: expertId,
          client_id: user.id,
          rating,
          comment: comment.trim() || null,
          request_reason: requestReason || null
        })

      if (error) {
        console.error('Ошибка отправки отзыва:', error)
        alert('Не удалось отправить отзыв')
        return
      }

      // Обновляем список отзывов
      await fetchReviews()
      
      // Сбрасываем форму
      setRating(0)
      setComment('')
      setRequestReason('')
      setShowForm(false)
      
      alert('Отзыв успешно отправлен!')
    } catch (err) {
      console.error('Ошибка отправки отзыва:', err)
      alert('Произошла ошибка при отправке отзыва')
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderStars = (rating: number, interactive: boolean = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {Array.isArray([1, 2, 3, 4, 5]) ? [1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive ? () => onRatingChange?.(star) : undefined}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } transition-transform`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        )) : []}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="flex items-center justify-center min-h-screen px-4 py-20">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Отзывы
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Add Review Button */}
          {user && (
            <div className="mb-6">
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn-primary"
              >
                {showForm ? 'Отменить' : 'Оставить отзыв'}
              </button>
            </div>
          )}

          {/* Review Form */}
          {showForm && user && (
            <div className="mb-8 p-6 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Оставить отзыв
              </h3>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Оценка *
                  </label>
                  {renderStars(rating, true, setRating)}
                </div>

                {/* Request Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Причина обращения
                  </label>
                  <select
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Выберите причину</option>
                    {Array.isArray(requestReasons) ? requestReasons.map(reason => (
                      <option key={reason} value={reason}>
                        {reason.charAt(0).toUpperCase() + reason.slice(1)}
                      </option>
                    )) : []}
                  </select>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Комментарий
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="input-field min-h-[100px] resize-y"
                    placeholder="Расскажите о вашем опыте..."
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    type="submit"
                    disabled={submitting || rating === 0}
                    className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                    <span>{submitting ? 'Отправка...' : 'Отправить отзыв'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="btn-secondary"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Reviews List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка отзывов...</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Пока нет отзывов</p>
              <p className="text-sm text-gray-500 mt-2">
                Станьте первым, кто оставит отзыв об этом эксперте
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Array.isArray(reviews) ? reviews.map((review) => (
                <div key={review.id} className="border rounded-lg p-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                      {review.client.avatar_url ? (
                        <img
                          src={review.client.avatar_url}
                          alt={review.client.full_name || 'Пользователь'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {review.client.full_name || 'Анонимный пользователь'}
                          </h4>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(review.created_at)}</span>
                            {review.request_reason && (
                              <>
                                <span>•</span>
                                <span className="capitalize">{review.request_reason}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {renderStars(review.rating)}
                          <span className="text-sm text-gray-500">
                            {review.rating}/5
                          </span>
                        </div>
                      </div>
                      
                      {review.comment && (
                        <p className="text-gray-700 mt-3">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )) : []}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
