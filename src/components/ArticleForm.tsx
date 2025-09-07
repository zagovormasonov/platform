import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { X, Save, Eye } from 'lucide-react'

interface Article {
  id: string
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

interface ArticleFormProps {
  article?: Article | null
  onSave: (article: Article) => void
  onClose: () => void
}

export function ArticleForm({ article, onSave, onClose }: ArticleFormProps) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (article) {
      setTitle(article.title)
      setContent(article.content)
      setPublished(article.published)
    }
  }, [article])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setError('')

    try {
      if (article) {
        // Редактирование существующей статьи
        const { data, error } = await supabase
          .from('articles')
          .update({
            title,
            content,
            published,
            updated_at: new Date().toISOString(),
          })
          .eq('id', article.id)
          .select()
          .single()

        if (error) {
          setError(error.message)
          return
        }

        onSave(data)
      } else {
        // Создание новой статьи
        const { data, error } = await supabase
          .from('articles')
          .insert({
            title,
            content,
            author_id: user.id,
            published,
          })
          .select()
          .single()

        if (error) {
          setError(error.message)
          return
        }

        onSave(data)
      }
    } catch (err) {
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            {article ? 'Редактировать статью' : 'Создать статью'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Заголовок статьи
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-field"
                  placeholder="Введите заголовок статьи"
                />
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                  Содержание статьи
                </label>
                <textarea
                  id="content"
                  required
                  rows={15}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="input-field resize-none"
                  placeholder="Поделитесь своим духовным опытом, инсайтами и открытиями..."
                />
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center">
                <input
                  id="published"
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="published" className="ml-2 block text-sm text-gray-700">
                  Опубликовать статью
                </label>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <div className="text-sm text-gray-500">
              {published ? (
                <span className="flex items-center text-green-600">
                  <Eye className="h-4 w-4 mr-1" />
                  Статья будет опубликована
                </span>
              ) : (
                'Статья будет сохранена как черновик'
              )}
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center space-x-2 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Сохранение...' : 'Сохранить'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
