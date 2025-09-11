import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, MapPin, Star, Users, Filter, Phone, Globe, MessageCircle, ChevronDown, ChevronUp, X } from 'lucide-react'

interface Expert {
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
  categories: Array<{
    category: {
      id: string
      name: string
    }
  }>
}

interface Category {
  id: string
  name: string
}

interface ExpertSearchProps {
  onClose: () => void
}

export function ExpertSearch({ onClose }: ExpertSearchProps) {
  const [experts, setExperts] = useState<Expert[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCity, setSelectedCity] = useState('')
  const [sortBy, setSortBy] = useState<'rating' | 'newest' | 'requests'>('rating')
  const [requestReason, setRequestReason] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [cities, setCities] = useState<string[]>([])

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
    fetchExperts()
    fetchCategories()
  }, [])

  useEffect(() => {
    fetchExperts()
  }, [selectedCategory, selectedCity, sortBy])

  const fetchExperts = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('profiles')
        .select(`
          *,
          categories:expert_categories(
            category:categories(*)
          )
        `)
        .eq('user_type', 'expert')
        .not('city', 'is', null) // Только эксперты с указанным городом

      // Фильтр по категории
      if (selectedCategory) {
        query = query.contains('categories', [{ category_id: selectedCategory }])
      }

      // Фильтр по городу
      if (selectedCity) {
        query = query.ilike('city', `%${selectedCity}%`)
      }

      // Сортировка
      switch (sortBy) {
        case 'rating':
          query = query.order('rating', { ascending: false })
          break
        case 'newest':
          query = query.order('created_at', { ascending: false })
          break
        case 'requests':
          query = query.order('total_requests', { ascending: false })
          break
      }

      const { data, error } = await query

      if (error) {
        console.error('Ошибка загрузки экспертов:', error)
        return
      }

      setExperts(data || [])
      
      // Собираем уникальные города
      const uniqueCities = [...new Set(data?.map(expert => expert.city).filter(Boolean))]
      setCities(uniqueCities as string[])
    } catch (err) {
      console.error('Ошибка загрузки экспертов:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Ошибка загрузки категорий:', error)
        return
      }

      setCategories(data || [])
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err)
    }
  }

  const filteredExperts = experts.filter(expert => {
    if (!searchTerm) return true
    
    const searchLower = searchTerm.toLowerCase()
    return (
      expert.full_name?.toLowerCase().includes(searchLower) ||
      expert.bio?.toLowerCase().includes(searchLower) ||
      expert.description?.toLowerCase().includes(searchLower) ||
      expert.city?.toLowerCase().includes(searchLower) ||
      expert.categories?.some(cat => 
        cat.category.name.toLowerCase().includes(searchLower)
      )
    )
  })

  const handleRequestExpert = async (expertId: string) => {
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
          request_reason: requestReason || null,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Поиск экспертов
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-full">
          {/* Filters Sidebar */}
          <div className="w-80 border-r bg-gray-50 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Поиск
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Имя, описание, город..."
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Направление деятельности
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-field"
                >
                  <option value="">Все направления</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* City Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Город
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="input-field"
                >
                  <option value="">Все города</option>
                  {cities.map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Сортировка
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="input-field"
                >
                  <option value="rating">По рейтингу</option>
                  <option value="newest">Новые</option>
                  <option value="requests">По количеству заявок</option>
                </select>
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
                  <option value="">Любая причина</option>
                  {requestReasons.map(reason => (
                    <option key={reason} value={reason}>
                      {reason.charAt(0).toUpperCase() + reason.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1 p-6 overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Загрузка экспертов...</p>
              </div>
            ) : filteredExperts.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Эксперты не найдены</p>
                <p className="text-sm text-gray-500 mt-2">
                  Попробуйте изменить параметры поиска
                </p>
              </div>
            ) : (
              <div className="grid gap-6">
                {filteredExperts.map((expert) => (
                  <div key={expert.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                            {expert.avatar_url ? (
                              <img
                                src={expert.avatar_url}
                                alt={expert.full_name || 'Эксперт'}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <Users className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {expert.full_name || 'Эксперт'}
                            </h3>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              {expert.city && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{expert.city}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Star className="h-4 w-4 text-yellow-400" />
                                <span>{expert.rating.toFixed(1)} ({expert.total_reviews})</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {expert.description && (
                          <p className="text-gray-700 mb-3 line-clamp-3">
                            {expert.description}
                          </p>
                        )}

                        {/* Categories */}
                        {expert.categories && expert.categories.length > 0 && (
                          <div className="mb-4">
                            <div className="flex flex-wrap gap-2">
                              {expert.categories.map((cat, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                >
                                  {cat.category.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Service Types */}
                        <div className="flex items-center space-x-4 mb-4">
                          {expert.accepts_online && (
                            <div className="flex items-center space-x-1 text-green-600">
                              <Globe className="h-4 w-4" />
                              <span className="text-sm">Онлайн</span>
                            </div>
                          )}
                          {expert.accepts_offline && (
                            <div className="flex items-center space-x-1 text-blue-600">
                              <MapPin className="h-4 w-4" />
                              <span className="text-sm">Оффлайн</span>
                            </div>
                          )}
                        </div>

                        {/* Contact Info */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          {expert.phone && (
                            <div className="flex items-center space-x-1">
                              <Phone className="h-4 w-4" />
                              <span>{expert.phone}</span>
                            </div>
                          )}
                          {expert.website_url && (
                            <a
                              href={expert.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                            >
                              <Globe className="h-4 w-4" />
                              <span>Сайт</span>
                            </a>
                          )}
                          {expert.telegram_url && (
                            <a
                              href={expert.telegram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>Telegram</span>
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="ml-6">
                        <button
                          onClick={() => handleRequestExpert(expert.id)}
                          className="btn-primary"
                        >
                          Отправить заявку
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
