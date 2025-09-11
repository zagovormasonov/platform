import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRefresh } from '../contexts/RefreshContext'
import { supabase } from '../lib/supabase'
import { X, Save, User, Mail, FileText, Globe, Github, Linkedin, Twitter, Instagram, MessageCircle } from 'lucide-react'

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  website_url: string | null
  github_url: string | null
  linkedin_url: string | null
  twitter_url: string | null
  instagram_url: string | null
  telegram_url: string | null
  created_at: string
  updated_at: string
}

interface ProfileFormProps {
  onClose: () => void
}

export function ProfileForm({ onClose }: ProfileFormProps) {
  const { user } = useAuth()
  const { triggerRefresh } = useRefresh()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Ошибка загрузки профиля:', error)
        setError('Не удалось загрузить профиль')
        return
      }

      setProfile(data)
      setFullName(data.full_name || '')
      setBio(data.bio || '')
      setWebsiteUrl(data.website_url || '')
      setGithubUrl(data.github_url || '')
      setLinkedinUrl(data.linkedin_url || '')
      setTwitterUrl(data.twitter_url || '')
      setInstagramUrl(data.instagram_url || '')
      setTelegramUrl(data.telegram_url || '')
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err)
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          website_url: websiteUrl.trim() || null,
          github_url: githubUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          twitter_url: twitterUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          telegram_url: telegramUrl.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) {
        setError(error.message)
        return
      }

      setMessage('Профиль успешно обновлен')
      
      // Обновляем локальное состояние
      setProfile({
        ...profile,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        website_url: websiteUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        telegram_url: telegramUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })

      // Триггерим обновление данных в других компонентах
      triggerRefresh()

      // Закрываем форму через 1.5 секунды
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err) {
      setError('Произошла неожиданная ошибка')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка профиля...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Редактировать профиль
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Email (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email адрес
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="input-field pl-10 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Email нельзя изменить
              </p>
            </div>

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Полное имя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Введите ваше полное имя"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Это имя будет отображаться как автор ваших статей
              </p>
            </div>

            {/* Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
                О себе
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input-field pl-10 min-h-[100px] resize-y"
                  placeholder="Расскажите о себе..."
                  rows={4}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Краткое описание о себе (необязательно)
              </p>
            </div>

            {/* Social Links */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Ссылки на ресурсы</h3>
              
              {/* Website */}
              <div>
                <label htmlFor="websiteUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Веб-сайт
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="websiteUrl"
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="input-field pl-10"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              {/* GitHub */}
              <div>
                <label htmlFor="githubUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub
                </label>
                <div className="relative">
                  <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="githubUrl"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    className="input-field pl-10"
                    placeholder="https://github.com/username"
                  />
                </div>
              </div>

              {/* LinkedIn */}
              <div>
                <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn
                </label>
                <div className="relative">
                  <Linkedin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="linkedinUrl"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    className="input-field pl-10"
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>
              </div>

              {/* Twitter */}
              <div>
                <label htmlFor="twitterUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter
                </label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="twitterUrl"
                    type="url"
                    value={twitterUrl}
                    onChange={(e) => setTwitterUrl(e.target.value)}
                    className="input-field pl-10"
                    placeholder="https://twitter.com/username"
                  />
                </div>
              </div>

              {/* Instagram */}
              <div>
                <label htmlFor="instagramUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Instagram
                </label>
                <div className="relative">
                  <Instagram className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="instagramUrl"
                    type="url"
                    value={instagramUrl}
                    onChange={(e) => setInstagramUrl(e.target.value)}
                    className="input-field pl-10"
                    placeholder="https://instagram.com/username"
                  />
                </div>
              </div>

              {/* Telegram */}
              <div>
                <label htmlFor="telegramUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Telegram
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    id="telegramUrl"
                    type="url"
                    value={telegramUrl}
                    onChange={(e) => setTelegramUrl(e.target.value)}
                    className="input-field pl-10"
                    placeholder="https://t.me/username"
                  />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {message && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Сохранение...' : 'Сохранить'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
