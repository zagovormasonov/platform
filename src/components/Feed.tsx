import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, User, Eye, Tag, Clock, TrendingUp } from 'lucide-react'
import { useRefresh } from '../contexts/RefreshContext'
import { UserProfile } from './UserProfile'
import { PageLayout } from './PageLayout'

interface Article {
  id: string
  title: string
  content: string
  author_id: string
  published: boolean
  created_at: string
  updated_at: string
  image_url?: string | null
  tags?: string[] | null
  views_count?: number | null
  profiles: {
    full_name: string | null
    email: string
    avatar_url: string | null
  } | null
}

type SortOption = 'newest' | 'popular' | 'oldest'

export function Feed() {
  const { refreshTrigger } = useRefresh()
  const [allArticles, setAllArticles] = useState<Article[]>([]) // Все загруженные статьи
  const [displayedArticles, setDisplayedArticles] = useState<Article[]>([]) // Отображаемые статьи
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [hasMore, setHasMore] = useState(true)
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())
  const [displayCount, setDisplayCount] = useState(30) // Сколько статей показывать
  
  const ARTICLES_PER_PAGE = 30

  // Функция сортировки статей
  const sortArticles = (articles: Article[], sortType: SortOption): Article[] => {
    const sorted = [...articles]
    switch (sortType) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'popular':
        return sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default:
        return sorted
    }
  }

  // Обновление отображаемых статей при изменении сортировки или количества
  useEffect(() => {
    if (allArticles.length > 0) {
      const sorted = sortArticles(allArticles, sortBy)
      setDisplayedArticles(sorted.slice(0, displayCount))
      setHasMore(displayCount < allArticles.length)
    }
  }, [allArticles, sortBy, displayCount])

  // Загрузка статей только при изменении refreshTrigger
  useEffect(() => {
    setAllArticles([])
    setDisplayCount(30)
    setHasMore(true)
    fetchPublishedArticles()
  }, [refreshTrigger])

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop
          >= document.documentElement.offsetHeight - 1000) {
        if (!loading && hasMore) {
          // Показываем больше статей из уже загруженных
          setDisplayCount(prev => prev + ARTICLES_PER_PAGE)
        }
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loading, hasMore])

  const fetchPublishedArticles = async () => {
    try {
      setLoading(true)
      setError('')

      // Загружаем ВСЕ опубликованные статьи (без пагинации)
      const { data, error } = await supabase
        .from('articles')
        .select(`
          id,
          title,
          content,
          author_id,
          published,
          created_at,
          updated_at,
          image_url,
          tags,
          views_count,
          profiles!articles_author_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false }) // По умолчанию сортируем по новизне

      if (error) {
        console.error('Ошибка загрузки статей:', error)
        setError('Не удалось загрузить статьи')
        return
      }

      // Приводим данные к правильному типу
      const typedData = data?.map(article => ({
        ...article,
        profiles: (article.profiles as any) as { full_name: string | null; email: string; avatar_url: string | null } | null
      })) || []
      
      setAllArticles(typedData)
      
    } catch (err) {
      console.error('Ошибка загрузки статей:', err)
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }


  const getAuthorName = (profiles: { full_name: string | null; email: string } | null) => {
    if (!profiles) {
      return 'Неизвестный автор'
    }
    
    if (profiles.full_name && profiles.full_name.trim()) {
      return profiles.full_name
    }
    
    if (profiles.email) {
      return profiles.email.split('@')[0]
    }
    
    return 'Неизвестный автор'
  }

  const handleAuthorClick = (authorId: string) => {
    setSelectedUserId(authorId)
  }

  const toggleArticleExpansion = (articleId: string) => {
    setExpandedArticles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(articleId)) {
        newSet.delete(articleId)
      } else {
        newSet.add(articleId)
      }
      return newSet
    })
  }

  const getPreviewText = (content: string, isExpanded: boolean) => {
    if (isExpanded || content.length <= 200) {
      return content
    }
    return content.substring(0, 200) + '...'
  }

  const incrementViews = async (articleId: string) => {
    try {
      await supabase.rpc('increment_article_views', { article_id: articleId })
    } catch (error) {
      console.error('Ошибка увеличения просмотров:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка статей...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center bg-white bg-opacity-90 rounded-lg p-8 shadow-lg">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
              <Eye className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h3>
            <p className="mt-2 text-gray-600">{error}</p>
            <button
              onClick={() => fetchPublishedArticles()}
              className="mt-4 btn-primary"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </PageLayout>
    )
  }

  // Если выбран пользователь, показываем его профиль
  if (selectedUserId) {
    return (
      <UserProfile 
        userId={selectedUserId} 
        onBack={() => setSelectedUserId(null)} 
      />
    )
  }

  return (
    <PageLayout>
      {/* Background Image - под навигацией */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/space.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          top: '64px' // Отступ под хедер
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-4">
              Новые статьи из мира духовного развития
            </h1>
            
            {/* Sort Controls */}
            <div className="flex justify-center space-x-2 mb-6">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'newest'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-1" />
                Новые
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'popular'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Популярные
              </button>
              <button
                onClick={() => setSortBy('oldest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  sortBy === 'oldest'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-1" />
                Старые
              </button>
            </div>
          </div>

          {displayedArticles.length === 0 && !loading ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-white bg-opacity-20">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">Пока нет опубликованных статей</h3>
              <p className="mt-2 text-gray-200">
                Статьи появятся здесь, как только пользователи начнут публиковать свои материалы
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedArticles.map((article) => {
                const isExpanded = expandedArticles.has(article.id)
                const previewText = getPreviewText(article.content, isExpanded)
                const shouldShowButton = article.content.length > 200
                
                return (
                  <article 
                    key={article.id} 
                    className="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
                    onClick={() => incrementViews(article.id)}
                  >
                    {/* Article Image */}
                    {article.image_url && (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      {/* Title */}
                      <h2 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
                        {article.title}
                      </h2>
                      
                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.tags.slice(0, 5).map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded-full"
                            >
                              <Tag className="h-3 w-3 inline mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Content Preview */}
                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {previewText}
                        </p>
                        {shouldShowButton && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleArticleExpansion(article.id)
                            }}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm mt-2"
                          >
                            {isExpanded ? 'Свернуть' : 'Развернуть'}
                          </button>
                        )}
                      </div>
                      
                      {/* Author & Meta */}
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAuthorClick(article.author_id)
                          }}
                          className="flex items-center space-x-2 hover:text-indigo-600 transition-colors"
                        >
                          <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                            {article.profiles?.avatar_url ? (
                              <img
                                src={article.profiles.avatar_url}
                                alt={getAuthorName(article.profiles)}
                                className="w-6 h-6 object-cover"
                              />
                            ) : (
                              <User className="h-3 w-3 text-gray-400" />
                            )}
                          </div>
                          <span className="truncate">{getAuthorName(article.profiles)}</span>
                        </button>
                        <div className="flex items-center space-x-3">
                          {article.views_count && (
                            <div className="flex items-center space-x-1">
                              <Eye className="h-3 w-3" />
                              <span>{article.views_count}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(article.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          
          {/* Loading More - показываем только при начальной загрузке */}
          {loading && displayedArticles.length === 0 && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
              <p className="mt-2 text-white">Загрузка статей...</p>
            </div>
          )}
          
          {/* No More Articles */}
          {!hasMore && displayedArticles.length > 0 && displayedArticles.length === allArticles.length && (
            <div className="text-center py-8">
              <p className="text-gray-200">Больше статей нет</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
