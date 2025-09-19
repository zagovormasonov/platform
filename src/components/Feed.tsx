import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Eye, Tag, Clock, TrendingUp, Heart, Bookmark } from 'lucide-react'
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
  likes_count?: number | null
  is_liked?: boolean
  is_favorited?: boolean
  profiles: {
    full_name: string | null
    email: string
    avatar_url: string | null
  } | null
}

type SortOption = 'newest' | 'popular'

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

  // Функции для работы с лайками и избранным
  const toggleLike = async (articleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const article = allArticles.find(a => a.id === articleId)
      if (!article) return

      if (article.is_liked) {
        // Убираем лайк
        const { error } = await supabase
          .from('article_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId)

        if (error) throw error

        // Обновляем локальное состояние
        setAllArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, is_liked: false, likes_count: (a.likes_count || 0) - 1 }
            : a
        ))
      } else {
        // Добавляем лайк
        const { error } = await supabase
          .from('article_likes')
          .insert({ user_id: user.id, article_id: articleId })

        if (error) throw error

        // Обновляем локальное состояние
        setAllArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, is_liked: true, likes_count: (a.likes_count || 0) + 1 }
            : a
        ))
      }
    } catch (error) {
      console.error('Ошибка при работе с лайком:', error)
    }
  }

  const toggleFavorite = async (articleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const article = allArticles.find(a => a.id === articleId)
      if (!article) return

      if (article.is_favorited) {
        // Убираем из избранного
        const { error } = await supabase
          .from('article_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('article_id', articleId)

        if (error) throw error

        // Обновляем локальное состояние
        setAllArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, is_favorited: false }
            : a
        ))
      } else {
        // Добавляем в избранное
        const { error } = await supabase
          .from('article_favorites')
          .insert({ user_id: user.id, article_id: articleId })

        if (error) throw error

        // Обновляем локальное состояние
        setAllArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, is_favorited: true }
            : a
        ))
      }
    } catch (error) {
      console.error('Ошибка при работе с избранным:', error)
    }
  }

  // Функция сортировки статей
  const sortArticles = (articles: Article[], sortType: SortOption): Article[] => {
    const sorted = [...articles]
    switch (sortType) {
      case 'newest':
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      case 'popular':
        return sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
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

      const { data: { user } } = await supabase.auth.getUser()

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
          likes_count,
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

      // Если пользователь авторизован, получаем информацию о его лайках и избранном
      let userLikes: string[] = []
      let userFavorites: string[] = []

      if (user) {
        // Получаем лайки пользователя
        const { data: likesData } = await supabase
          .from('article_likes')
          .select('article_id')
          .eq('user_id', user.id)

        userLikes = likesData?.map(like => like.article_id) || []

        // Получаем избранное пользователя
        const { data: favoritesData } = await supabase
          .from('article_favorites')
          .select('article_id')
          .eq('user_id', user.id)

        userFavorites = favoritesData?.map(fav => fav.article_id) || []
      }

      // Приводим данные к правильному типу и добавляем информацию о лайках/избранном
      const typedData = data?.map(article => ({
        ...article,
        is_liked: userLikes.includes(article.id),
        is_favorited: userFavorites.includes(article.id),
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
          backgroundImage: 'url(/enhanced.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          top: '64px' // Отступ под хедер
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10 pt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          {/* Header */}
          <div className="text-center mb-8">
            {/* Title */}
            <h1 className="text-2xl sm:text-4xl font-bold text-white mb-6">
              Новые статьи из мира духовного развития
            </h1>
            
            {/* Sort Controls */}
            <div className="bg-white bg-opacity-10 backdrop-blur-[40px] rounded-lg border border-white border-opacity-20 p-4 inline-flex space-x-2">
              <button
                onClick={() => setSortBy('newest')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  sortBy === 'newest'
                    ? 'bg-white bg-opacity-30 text-white shadow-lg backdrop-blur-sm border border-white border-opacity-40'
                    : 'bg-white bg-opacity-10 text-white text-opacity-80 hover:bg-opacity-20 hover:text-opacity-100'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-1" />
                Новые
              </button>
              <button
                onClick={() => setSortBy('popular')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                  sortBy === 'popular'
                    ? 'bg-white bg-opacity-30 text-white shadow-lg backdrop-blur-sm border border-white border-opacity-40'
                    : 'bg-white bg-opacity-10 text-white text-opacity-80 hover:bg-opacity-20 hover:text-opacity-100'
                }`}
              >
                <TrendingUp className="h-4 w-4 inline mr-1" />
                Популярные
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
            <div className="space-y-6">
              {displayedArticles.map((article) => {
                const isExpanded = expandedArticles.has(article.id)
                
                if (isExpanded) {
                  // Развернутая карточка на всю ширину
                  return (
                    <article 
                      key={article.id} 
                      className="bg-white bg-opacity-10 backdrop-blur-[40px] rounded-lg shadow-2xl border border-white border-opacity-20 w-full transition-all duration-500 overflow-hidden relative"
                      onClick={() => incrementViews(article.id)}
                    >
                      {/* Close Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleArticleExpansion(article.id)
                        }}
                        className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                      >
                        ✕
                      </button>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-8">
                        {/* Левая колонка - изображение */}
                        <div>
                          {article.image_url && (
                            <div className="h-64 lg:h-80 overflow-hidden rounded-lg mb-6">
                              <img
                                src={article.image_url}
                                alt={article.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          
                          {/* Tags */}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {article.tags.slice(0, 5).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-3 py-1 bg-white bg-opacity-20 text-white text-sm rounded-full border border-white border-opacity-30"
                                >
                                  <Tag className="h-4 w-4 inline mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Правая колонка - контент */}
                        <div className="flex flex-col">
                          {/* Title */}
                          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                            {article.title}
                          </h1>
                          
                          {/* Content */}
                          <div className="prose prose-lg max-w-none mb-6 flex-1">
                            <p className="text-white text-opacity-80 leading-relaxed whitespace-pre-wrap">
                              {article.content}
                            </p>
                          </div>
                          
                          {/* Author & Meta */}
                          <div className="flex items-center justify-between text-white text-opacity-70 border-t border-white border-opacity-20 pt-4 mt-auto">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAuthorClick(article.author_id)
                              }}
                              className="flex items-center space-x-3 hover:text-white hover:text-opacity-100 transition-colors"
                            >
                              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden">
                        {article.profiles?.avatar_url ? (
                          <img
                            src={article.profiles.avatar_url}
                            alt={getAuthorName(article.profiles)}
                                    className="w-10 h-10 object-cover"
                          />
                        ) : (
                                  <User className="h-5 w-5 text-white" />
                        )}
                      </div>
                              <span className="text-white text-lg">{getAuthorName(article.profiles)}</span>
                    </button>
                            <div className="flex flex-col items-end space-y-2">
                              {article.views_count && (
                                <div className="flex items-center space-x-2">
                                  <Eye className="h-4 w-4" />
                                  <span>{article.views_count}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                                <span>{new Date(article.created_at).toLocaleDateString('ru-RU')}</span>
                              </div>
                            </div>
                    </div>
                  </div>
                </div>
                    </article>
                  )
                }
                
                return null // Обычные карточки рендерим отдельно
              }).filter(Boolean)}
              
              {/* Сетка обычных карточек */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedArticles
                  .filter(article => !expandedArticles.has(article.id))
                  .map((article) => {
                    
                    return (
                      <article 
                        key={article.id} 
                        className="bg-white bg-opacity-10 backdrop-blur-[40px] rounded-lg shadow-lg hover:shadow-xl transition-all duration-500 overflow-hidden border border-white border-opacity-20"
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
                          <h2 className="text-lg font-bold text-white mb-3 line-clamp-2">
                            {article.title}
                          </h2>
                          
                          {/* Tags */}
                          {article.tags && article.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {article.tags.slice(0, 5).map((tag, tagIndex) => (
                                <span
                                  key={tagIndex}
                                  className="px-2 py-1 bg-white bg-opacity-20 text-white text-xs rounded-full border border-white border-opacity-30"
                                >
                                  <Tag className="h-3 w-3 inline mr-1" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Expand Button */}
                          <div className="mb-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleArticleExpansion(article.id)
                              }}
                              className="text-white hover:text-white text-opacity-70 hover:text-opacity-100 font-medium text-sm bg-white bg-opacity-10 hover:bg-opacity-20 px-3 py-2 rounded-lg transition-all"
                            >
                              Читать полностью
                            </button>
                          </div>
                
                          {/* Author & Meta */}
                          <div className="flex items-start justify-between text-sm text-white text-opacity-70 mb-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAuthorClick(article.author_id)
                              }}
                              className="flex items-center space-x-2 hover:text-white hover:text-opacity-100 transition-colors"
                            >
                              <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden">
                                {article.profiles?.avatar_url ? (
                                  <img
                                    src={article.profiles.avatar_url}
                                    alt={getAuthorName(article.profiles)}
                                    className="w-6 h-6 object-cover"
                                  />
                                ) : (
                                  <User className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <span className="truncate text-white">{getAuthorName(article.profiles)}</span>
                            </button>
                            <div className="flex flex-col space-y-1 text-right">
                              {article.views_count && (
                                <div className="flex items-center justify-end space-x-1">
                                  <Eye className="h-3 w-3" />
                                  <span>{article.views_count}</span>
                                </div>
                              )}
                              <div className="flex items-center justify-end space-x-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(article.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                    </div>
                  </div>
                  
                  {/* Лайки и избранное */}
                  <div className="flex items-center justify-between pt-4 border-t border-white border-opacity-20">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(article.id)
                      }}
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                        article.is_liked
                          ? 'bg-red-500 bg-opacity-20 text-red-300 hover:bg-opacity-30'
                          : 'bg-white bg-opacity-10 text-white text-opacity-70 hover:bg-opacity-20 hover:text-opacity-100'
                      }`}
                    >
                      <Heart className={`h-4 w-4 ${article.is_liked ? 'fill-current' : ''}`} />
                      <span className="text-sm">{article.likes_count || 0}</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleFavorite(article.id)
                      }}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${
                        article.is_favorited
                          ? 'bg-yellow-500 bg-opacity-20 text-yellow-300 hover:bg-opacity-30'
                          : 'bg-white bg-opacity-10 text-white text-opacity-70 hover:bg-opacity-20 hover:text-opacity-100'
                      }`}
                    >
                      <Bookmark className={`h-4 w-4 ${article.is_favorited ? 'fill-current' : ''}`} />
                      <span className="text-sm">В избранное</span>
                    </button>
                  </div>
                </div>
              </article>
                    )
                  })}
              </div>
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
