// @ts-nocheck
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { User, Eye, Tag, Clock, Heart, Bookmark, BookmarkX } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
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

export function FavoritesPage() {
  const { user } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (user) {
      fetchFavoriteArticles()
    }
  }, [user])

  const fetchFavoriteArticles = async () => {
    try {
      setLoading(true)
      setError('')

      if (!user) {
        setError('Необходимо авторизоваться')
        return
      }

      // Получаем избранные статьи пользователя
      const { data, error } = await supabase
        .from('article_favorites')
        .select(`
          article_id,
          articles!inner (
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
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки избранных статей:', error)
        setError('Не удалось загрузить избранные статьи')
        return
      }

      // Получаем лайки пользователя для этих статей
      const articleIds = Array.isArray(data) ? data.map(item => (item.articles as any).id) : []
      let userLikes: string[] = []

      if (articleIds.length > 0) {
        const { data: likesData } = await supabase
          .from('article_likes')
          .select('article_id')
          .eq('user_id', user.id)
          .in('article_id', articleIds)

        userLikes = Array.isArray(likesData) ? likesData.map(like => like.article_id) : []
      }

      // Преобразуем данные
      const typedData = Array.isArray(data) ? data.map(item => {
        const article = (item.articles as any)
        return {
          ...article,
          is_liked: userLikes.includes(article.id),
          is_favorited: true, // Все статьи здесь избранные
          profiles: article.profiles as { full_name: string | null; email: string; avatar_url: string | null } | null
        }
      }) : []

      setArticles(typedData)
    } catch (err) {
      console.error('Ошибка загрузки избранных статей:', err)
      setError('Произошла ошибка при загрузке')
    } finally {
      setLoading(false)
    }
  }

  const toggleLike = async (articleId: string) => {
    try {
      const article = articles.find(a => a.id === articleId)
      if (!article) return

      if (article.is_liked) {
        // Убираем лайк
        const { error } = await supabase
          .from('article_likes')
          .delete()
          .eq('user_id', user!.id)
          .eq('article_id', articleId)

        if (error) throw error

        setArticles(prev => prev.map(a => 
          a.id === articleId 
            ? { ...a, is_liked: false, likes_count: (a.likes_count || 0) - 1 }
            : a
        ))
      } else {
        // Добавляем лайк
        const { error } = await supabase
          .from('article_likes')
          .insert({ user_id: user!.id, article_id: articleId })

        if (error) throw error

        setArticles(prev => prev.map(a => 
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
      // Убираем из избранного (удаляем из списка)
      const { error } = await supabase
        .from('article_favorites')
        .delete()
        .eq('user_id', user!.id)
        .eq('article_id', articleId)

      if (error) throw error

      // Удаляем статью из списка
      setArticles(prev => prev.filter(a => a.id !== articleId))
    } catch (error) {
      console.error('Ошибка при удалении из избранного:', error)
    }
  }

  const handleAuthorClick = (authorId: string) => {
    setSelectedUserId(authorId)
  }

  const getAuthorName = (profiles: { full_name: string | null; email: string; avatar_url: string | null } | null) => {
    return profiles?.full_name || profiles?.email || 'Аноним'
  }

  const getPreviewText = (content: string | null | undefined, isExpanded: boolean) => {
    if (!content) return 'Содержание недоступно'
    if (isExpanded) return content
    return content.length > 200 ? content.substring(0, 200) + '...' : content
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

  if (loading) {
    return (
      <PageLayout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Загрузка избранных статей...</p>
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
                <BookmarkX className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h3>
              <p className="mt-2 text-gray-600">{error}</p>
              <button
                onClick={fetchFavoriteArticles}
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

  return (
    <PageLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Bookmark className="h-8 w-8 text-yellow-500 mr-3" />
              <h1 className="text-3xl font-bold text-gray-900">Избранные статьи</h1>
            </div>
            <p className="text-gray-600">
              {articles.length === 0 ? 'У вас пока нет избранных статей' : `${articles.length} статей в избранном`}
            </p>
          </div>

          {articles.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
                <Bookmark className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Нет избранных статей</h3>
              <p className="mt-2 text-gray-600">
                Добавляйте статьи в избранное, нажимая на кнопку закладки
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => {
                const isExpanded = expandedArticles.has(article.id)
                const previewText = getPreviewText(article.content, isExpanded)
                const shouldShowButton = article.content.length > 200

                return (
                  <article
                    key={article.id}
                    className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
                  >
                    {/* Image */}
                    {article.image_url && (
                      <div className="h-48 overflow-hidden">
                        <img
                          src={article.image_url}
                          alt={article.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      {/* Title */}
                      <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                        {article.title}
                      </h2>
                      
                      {/* Tags */}
                      {article.tags && article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {article.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                            >
                              <Tag className="h-3 w-3 inline mr-1" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Content Preview */}
                      <div className="prose prose-sm max-w-none mb-4">
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {previewText}
                        </p>
                        {shouldShowButton && (
                          <button
                            onClick={() => toggleArticleExpansion(article.id)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm mt-2"
                          >
                            {isExpanded ? 'Свернуть' : 'Развернуть'}
                          </button>
                        )}
                      </div>
                      
                      {/* Author & Meta */}
                      <div className="flex items-start justify-between text-sm text-gray-500 mb-4">
                        <button
                          onClick={() => handleAuthorClick(article.author_id)}
                          className="flex items-center space-x-2 hover:text-gray-700 transition-colors"
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
                      
                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <button
                          onClick={() => toggleLike(article.id)}
                          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all ${
                            article.is_liked
                              ? 'bg-red-100 text-red-600 hover:bg-red-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${article.is_liked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{article.likes_count || 0}</span>
                        </button>
                        
                        <button
                          onClick={() => toggleFavorite(article.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-yellow-100 text-yellow-600 hover:bg-yellow-200 transition-all"
                        >
                          <BookmarkX className="h-4 w-4" />
                          <span className="text-sm">Удалить</span>
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {selectedUserId && (
        <UserProfile
          userId={selectedUserId}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </PageLayout>
  )
}
