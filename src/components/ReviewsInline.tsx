import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Star, Send, User, Calendar } from 'lucide-react'

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

interface ReviewsInlineProps {
  expertId: string
}

export function ReviewsInline({ expertId }: ReviewsInlineProps) {
  const { user } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [requestReason, setRequestReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
        throw error
      }

      setReviews(data || [])
    } catch (err: any) {
      console.error('Ошибка загрузки отзывов:', err)
      setError('Не удалось загрузить отзывы')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !rating) {
      setError('Пожалуйста, поставьте оценку')
      return
    }

    setSubmitting(true)
    setError('')

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
        throw error
      }

      setMessage('Отзыв успешно добавлен!')
      setRating(0)
      setComment('')
      setRequestReason('')
      setShowForm(false)
      
      // Обновляем список отзывов
      await fetchReviews()
    } catch (err: any) {
      console.error('Ошибка добавления отзыва:', err)
      setError(err.message || 'Произошла ошибка при добавлении отзыва')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (currentRating: number, interactive: boolean = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {Array.isArray([1, 2, 3, 4, 5]) ? [1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={interactive && onChange ? () => onChange(star) : undefined}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            }`}
            disabled={!interactive}
          >
            <Star
              className={`h-6 w-6 ${
                star <= currentRating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          </button>
        )) : []}
      </div>
    )
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900">Отзывы</h4>
        {user && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary text-sm"
          >
            {showForm ? 'Отменить' : 'Оставить отзыв'}
          </button>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{message}</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Review Form */}
      {showForm && user && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h5 className="text-lg font-semibold text-gray-900 mb-4">
            Оставить отзыв
          </h5>
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
                {Array.isArray(requestReasons) ? requestReasons.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
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
                rows={4}
                className="input-field"
                placeholder="Расскажите о своем опыте работы с экспертом..."
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
                disabled={submitting}
              >
                Отменить
              </button>
              <button
                type="submit"
                className="btn-primary flex items-center space-x-2"
                disabled={submitting || !rating}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Отправка...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Отправить отзыв</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Пока нет отзывов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.isArray(reviews) ? reviews.map((review) => (
            <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                {/* Avatar */}
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

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="font-medium text-gray-900">
                      {review.client.full_name || 'Анонимный пользователь'}
                    </span>
                    <div className="flex items-center space-x-1 text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">{formatDate(review.created_at)}</span>
                    </div>
                  </div>

                  {/* Rating */}
                  <div className="mb-2">
                    {renderStars(review.rating)}
                  </div>

                  {/* Request Reason */}
                  {review.request_reason && (
                    <div className="mb-2">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {review.request_reason}
                      </span>
                    </div>
                  )}

                  {/* Comment */}
                  {review.comment && (
                    <p className="text-gray-700 whitespace-pre-wrap">
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
  )
}
