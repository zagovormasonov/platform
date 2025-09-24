import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { apiClient } from '../lib/api'
import { Plus, Edit, Trash2, Eye, EyeOff, UserCheck, Users, AlertCircle } from 'lucide-react'
import { ArticleForm } from './ArticleForm'
import { PageLayout } from './PageLayout'

interface Article {
  id: string
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

interface Profile {
  id: string
  is_expert: boolean
  full_name: string | null
}

export function Dashboard() {
  const { user } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showArticleForm, setShowArticleForm] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)

  useEffect(() => {
    fetchProfile()
    fetchArticles()
  }, [])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const response = await apiClient.getProfile()
      
      if (response.error) {
        console.error('Ошибка загрузки профиля:', response.error)
        return
      }

      setProfile((response as any).data?.data as Profile)
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error)
    }
  }

  const fetchArticles = async () => {
    if (!user) return

    try {
      const response = await apiClient.getMyArticles()
      
      if (response.error) {
        console.error('Ошибка загрузки статей:', response.error)
        return
      }

      setArticles((response.data as Article[]) || [])
    } catch (error) {
      console.error('Ошибка загрузки статей:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту статью?')) return

    try {
      const response = await apiClient.deleteArticle(articleId)

      if (response.error) {
        console.error('Ошибка удаления статьи:', response.error)
        return
      }

      setArticles(articles.filter(article => article.id !== articleId))
    } catch (error) {
      console.error('Ошибка удаления статьи:', error)
    }
  }

  const handleTogglePublish = async (article: Article) => {
    try {
      const response = await apiClient.updateArticle(article.id, { 
        published: !article.published 
      })

      if (response.error) {
        console.error('Ошибка обновления статьи:', response.error)
        return
      }

      setArticles(Array.isArray(articles) ? articles.map(a => 
        a.id === article.id ? { ...a, published: !a.published } : a
      ) : [])
    } catch (error) {
      console.error('Ошибка обновления статьи:', error)
    }
  }

  const handleArticleSaved = (article: Article) => {
    if (editingArticle) {
      setArticles(Array.isArray(articles) ? articles.map(a => a.id === article.id ? article : a) : [])
      setEditingArticle(null)
    } else {
      setArticles(Array.isArray(articles) ? [article, ...articles] : [article])
    }
    setShowArticleForm(false)
  }

  const handleEditArticle = (article: Article) => {
    setEditingArticle(article)
    setShowArticleForm(true)
  }

  const handleCloseForm = () => {
    setShowArticleForm(false)
    setEditingArticle(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка...</p>
        </div>
      </div>
    )
  }

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Type Info */}
        {profile && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-3">
              {profile.is_expert ? (
                <UserCheck className="h-6 w-6 text-blue-600" />
              ) : (
                <Users className="h-6 w-6 text-blue-600" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-blue-900">
                  {profile.is_expert ? 'Эксперт' : 'Пользователь'}
                </h3>
                <p className="text-sm text-blue-700">
                  {profile.is_expert 
                    ? 'Вы можете создавать статьи и получать заявки от клиентов'
                    : 'Вы можете искать экспертов и оставлять отзывы'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Мои статьи</h2>
            {profile?.is_expert ? (
              <button
                onClick={() => setShowArticleForm(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Создать статью</span>
              </button>
            ) : (
              <div className="flex items-center space-x-2 text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Только эксперты могут создавать статьи</span>
              </div>
            )}
          </div>

          {/* Articles List */}
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
                <Edit className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Пока нет статей</h3>
              <p className="mt-2 text-gray-600">
                {profile?.is_expert 
                  ? 'Создайте свою первую статью, чтобы поделиться духовным опытом'
                  : 'Только эксперты могут создавать статьи. Станьте экспертом, чтобы делиться знаниями!'
                }
              </p>
              {profile?.is_expert && (
                <button
                  onClick={() => setShowArticleForm(true)}
                  className="mt-4 btn-primary"
                >
                  Создать статью
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6">
              {Array.isArray(articles) ? articles.map((article) => (
                <div key={article.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {article.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {article.content ? article.content.substring(0, 200) + '...' : 'Содержание недоступно'}
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          Создано: {new Date(article.created_at).toLocaleDateString('ru-RU')}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          article.published 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {article.published ? 'Опубликовано' : 'Черновик'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleTogglePublish(article)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title={article.published ? 'Снять с публикации' : 'Опубликовать'}
                      >
                        {article.published ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEditArticle(article)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteArticle(article.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )) : []}
            </div>
          )}
        </div>
      </div>

      {/* Article Form Modal */}
      {showArticleForm && profile?.is_expert && (
        <ArticleForm
          article={editingArticle}
          onSave={handleArticleSaved}
          onClose={handleCloseForm}
        />
      )}
    </PageLayout>
  )
}
