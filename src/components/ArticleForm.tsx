import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { X, Save, Eye, Upload, Tag, Plus, Trash2 } from 'lucide-react'

interface Article {
  id: string
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
  image_url?: string | null
  tags?: string[] | null
  views_count?: number | null
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
  const [imageUrl, setImageUrl] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (article) {
      setTitle(article.title)
      setContent(article.content)
      setPublished(article.published)
      setImageUrl(article.image_url || '')
      setTags(article.tags || [])
    }
  }, [article])

  const addTag = () => {
    if (newTag.trim() && tags.length < 5 && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index))
  }

  const uploadImage = async (file: File) => {
    if (!user) return

    try {
      setUploading(true)
      setError('')

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error } = await supabase.storage
        .from('articles')
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from('articles')
        .getPublicUrl(fileName)

      setImageUrl(publicUrl)
    } catch (error: any) {
      console.error('Ошибка загрузки изображения:', error)
      setError('Не удалось загрузить изображение: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Проверяем размер файла (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Размер файла не должен превышать 5MB')
        return
      }
      
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите изображение')
        return
      }
      
      uploadImage(file)
    }
  }

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
            image_url: imageUrl || null,
            tags: tags.length > 0 ? tags : null
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
            image_url: imageUrl || null,
            tags: tags.length > 0 ? tags : null
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

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Изображение статьи
                </label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg transition-colors">
                    <Upload className="h-4 w-4" />
                    <span className="text-sm">
                      {uploading ? 'Загрузка...' : 'Выбрать изображение'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {imageUrl && (
                  <div className="mt-3">
                    <img
                      src={imageUrl}
                      alt="Превью изображения"
                      className="h-32 w-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Теги (максимум 5)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="flex items-center space-x-1 px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                    >
                      <Tag className="h-3 w-3" />
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {tags.length < 5 && (
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Добавить тег"
                      className="flex-1 input-field"
                    />
                    <button
                      type="button"
                      onClick={addTag}
                      disabled={!newTag.trim() || tags.includes(newTag.trim())}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
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
