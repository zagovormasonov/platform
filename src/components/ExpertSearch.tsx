// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../lib/api'
import { Search, MapPin, Star, Users, Phone, Globe, MessageCircle, X, Eye, ChevronUp, ChevronDown } from 'lucide-react'
import { ExpertProfile } from './ExpertProfile'

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
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState('')
  const [sortBy, setSortBy] = useState<'rating' | 'newest' | 'requests'>('rating')
  const [requestReason, setRequestReason] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

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
  }, [selectedCategories, selectedCity, sortBy])

  // Функции для скроллинга
  const scrollToTop = () => {
    console.log('Manual scroll to top')
    if (modalRef.current) {
      modalRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
      console.log('Manually scrolled to top')
    }
  }

  const scrollToBottom = () => {
    console.log('Manual scroll to bottom')
    if (modalRef.current) {
      modalRef.current.scrollTo({
        top: modalRef.current.scrollHeight,
        behavior: 'smooth'
      })
      console.log('Manually scrolled to bottom')
    }
  }

  // Функции для управления множественным выбором категорий
  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const clearAllCategories = () => {
    setSelectedCategories([])
  }

  const fetchExperts = async () => {
    try {
      setLoading(true)
      
      // Загружаем экспертов через API
      const response = await apiClient.getExperts({
        city: selectedCity || undefined,
        category: selectedCategories.length > 0 ? selectedCategories[0] : undefined,
        limit: 20
      })

      if (response.error) {
        console.error('Ошибка загрузки экспертов:', response.error)
        setError('Не удалось загрузить экспертов')
        return
      }

      const experts = response.data || []
      
      // Сортируем экспертов
      let sortedExperts = [...experts]
      switch (sortBy) {
        case 'rating':
          sortedExperts.sort((a, b) => (b.rating || 0) - (a.rating || 0))
          break
        case 'newest':
          sortedExperts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          break
        case 'requests':
          sortedExperts.sort((a, b) => (b.total_requests || 0) - (a.total_requests || 0))
          break
        default:
          sortedExperts.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
      }

      setExperts(sortedExperts)
      
      // Собираем уникальные города
      const uniqueCities = [...new Set(experts.map(expert => expert.city).filter(Boolean))]
      setCities(uniqueCities as string[])
    } catch (err) {
      console.error('Ошибка загрузки экспертов:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const response = await apiClient.getCategories()

      if (response.error) {
        console.error('Ошибка загрузки категорий:', response.error)
        return
      }

      setCategories(response.data || [])
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err)
    }
  }

  const filteredExperts = experts.filter(expert => {
    // Если нет поискового запроса и не выбраны фильтры, не показываем экспертов
    if (!searchTerm && selectedCategories.length === 0 && !selectedCity && !requestReason) {
      return false
    }
    
    // Если есть поисковый запрос, проверяем по нему
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = (
        expert.full_name?.toLowerCase().includes(searchLower) ||
        expert.bio?.toLowerCase().includes(searchLower) ||
        expert.description?.toLowerCase().includes(searchLower) ||
        expert.city?.toLowerCase().includes(searchLower) ||
        expert.categories?.some(cat => 
          cat.category.name.toLowerCase().includes(searchLower)
        )
      )
      
      // Если есть поисковый запрос, но он не совпадает, не показываем
      if (!matchesSearch) return false
    }
    
    // Дополнительная проверка: если выбраны категории, убеждаемся что эксперт работает хотя бы в одной из них
    if (selectedCategories.length > 0) {
      const hasSelectedCategory = expert.categories?.some(cat => 
        selectedCategories.includes(cat.category.id)
      )
      if (!hasSelectedCategory) {
        return false
      }
    }
    
    return true
  })

  // Автоматический скроллинг при изменении результатов
  useEffect(() => {
    if (modalRef.current && filteredExperts.length > 0) {
      console.log('Auto-scrolling to top, filteredExperts.length:', filteredExperts.length)
      // Небольшая задержка для корректного рендеринга
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollTo({
            top: 0,
            behavior: 'smooth'
          })
          console.log('Scrolled to top')
        }
      }, 100)
    }
  }, [filteredExperts])

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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="flex items-center justify-center min-h-screen px-2 sm:px-4 py-20">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onScroll={() => console.log('Modal scrolled')}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
              Поиск экспертов
            </h2>
            {!loading && filteredExperts.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                Найдено экспертов: {filteredExperts.length}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-80 border-r bg-gray-50 p-4 sm:p-6">
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
                    placeholder="Введите имя эксперта, описание или город..."
                  />
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Направления деятельности
                  </label>
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={clearAllCategories}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Очистить все
                    </button>
                  )}
                </div>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => toggleCategory(category.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
                    </label>
                  ))}
                </div>
                {selectedCategories.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      Выбрано: {selectedCategories.length} направлений
                    </p>
                  </div>
                )}
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
          <div 
            ref={resultsRef} 
            className="flex-1 p-4 sm:p-6"
          >
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Загрузка экспертов...</p>
              </div>
            ) : filteredExperts.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  {!searchTerm && selectedCategories.length === 0 && !selectedCity && !requestReason
                    ? 'Введите поисковый запрос или выберите фильтры для поиска экспертов'
                    : 'Эксперты не найдены'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {!searchTerm && selectedCategories.length === 0 && !selectedCity && !requestReason
                    ? 'Используйте поисковую строку или фильтры слева'
                    : 'Попробуйте изменить параметры поиска'
                  }
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {filteredExperts.map((expert) => (
                  <div key={expert.id} className="border rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
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
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900">
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

                      <div className="mt-4 sm:mt-0 sm:ml-6 flex flex-col space-y-2">
                        <button
                          onClick={() => setSelectedExpertId(expert.id)}
                          className="btn-secondary flex items-center space-x-2"
                        >
                          <Eye className="h-4 w-4" />
                          <span>Посмотреть профиль</span>
                        </button>
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
            
            {/* Кнопки скроллинга */}
            {!loading && filteredExperts.length > 2 && (
              <div className="flex justify-center space-x-4 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={scrollToTop}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  <ChevronUp className="h-4 w-4" />
                  <span>В начало</span>
                </button>
                <button
                  onClick={scrollToBottom}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                >
                  <ChevronDown className="h-4 w-4" />
                  <span>В конец</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Expert Profile Modal */}
      {selectedExpertId && (
        <ExpertProfile
          expertId={selectedExpertId}
          onClose={() => setSelectedExpertId(null)}
        />
      )}
      </div>
    </div>
  )
}
