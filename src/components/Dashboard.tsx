import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { ArticleForm } from './ArticleForm'
import { Navigation } from './Navigation'

interface Article {
  id: string
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

export function Dashboard() {
  const { user, signOut } = useAuth()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showArticleForm, setShowArticleForm] = useState(false)
  const [editingArticle, setEditingArticle] = useState<Article | null>(null)

  useEffect(() => {
    fetchArticles()
  }, [])

  const fetchArticles = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки статей:', error)
        return
      }

      setArticles(data || [])
    } catch (error) {
      console.error('Ошибка загрузки статей:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteArticle = async (articleId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту статью?')) return

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId)

      if (error) {
        console.error('Ошибка удаления статьи:', error)
        return
      }

      setArticles(articles.filter(article => article.id !== articleId))
    } catch (error) {
      console.error('Ошибка удаления статьи:', error)
    }
  }

  const handleTogglePublish = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ published: !article.published })
        .eq('id', article.id)

      if (error) {
        console.error('Ошибка обновления статьи:', error)
        return
      }

      setArticles(articles.map(a => 
        a.id === article.id ? { ...a, published: !a.published } : a
      ))
    } catch (error) {
      console.error('Ошибка обновления статьи:', error)
    }
  }

  const handleArticleSaved = (article: Article) => {
    if (editingArticle) {
      setArticles(articles.map(a => a.id === article.id ? article : a))
      setEditingArticle(null)
    } else {
      setArticles([article, ...articles])
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Main Content */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Мои статьи</h2>
            <button
              onClick={() => setShowArticleForm(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Создать статью</span>
            </button>
          </div>

          {/* Articles List */}
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
                <Edit className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Пока нет статей</h3>
              <p className="mt-2 text-gray-600">
                Создайте свою первую статью, чтобы поделиться духовным опытом
              </p>
              <button
                onClick={() => setShowArticleForm(true)}
                className="mt-4 btn-primary"
              >
                Создать статью
              </button>
            </div>
          ) : (
            <div className="grid gap-6">
              {articles.map((article) => (
                <div key={article.id} className="card">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {article.title}
                      </h3>
                      <p className="text-gray-600 mb-4 line-clamp-3">
                        {article.content.substring(0, 200)}...
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Article Form Modal */}
      {showArticleForm && (
        <ArticleForm
          article={editingArticle}
          onSave={handleArticleSaved}
          onClose={handleCloseForm}
        />
      )}
    </div>
  )
}
