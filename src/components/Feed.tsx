import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Calendar, User, Eye } from 'lucide-react'
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
  profiles: {
    full_name: string | null
    email: string
    avatar_url: string | null
  } | null
}

export function Feed() {
  const { refreshTrigger } = useRefresh()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  useEffect(() => {
    fetchPublishedArticles()
  }, [refreshTrigger])

  const fetchPublishedArticles = async () => {
    try {
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
          profiles!articles_author_id_fkey (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })

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
      
      setArticles(typedData)
    } catch (err) {
      console.error('Ошибка загрузки статей:', err)
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <Eye className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={fetchPublishedArticles}
            className="mt-4 btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      </div>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {articles.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
              <Eye className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Пока нет опубликованных статей</h3>
            <p className="mt-2 text-gray-600">
              Статьи появятся здесь, как только пользователи начнут публиковать свои духовные опыты
            </p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-8">
            {articles.map((article) => (
              <article key={article.id} className="card hover:shadow-lg transition-shadow duration-200">
                <div className="mb-4">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                    {article.title}
                  </h2>
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm text-gray-500 mb-4">
                    <button
                      onClick={() => handleAuthorClick(article.author_id)}
                      className="flex items-center space-x-2 hover:text-blue-600 transition-colors"
                    >
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {article.profiles?.avatar_url ? (
                          <img
                            src={article.profiles.avatar_url}
                            alt={getAuthorName(article.profiles)}
                            className="w-8 h-8 object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <span>{getAuthorName(article.profiles)}</span>
                    </button>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(article.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="prose prose-gray max-w-none">
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {article.content}
                  </p>
                </div>
                
                <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Eye className="h-4 w-4" />
                      <span>Опубликовано</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Обновлено: {formatDate(article.updated_at)}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
