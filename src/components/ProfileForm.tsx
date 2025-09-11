import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useRefresh } from '../contexts/RefreshContext'
import { supabase } from '../lib/supabase'
import { X, Save, User, Mail, FileText, Globe, Github, Linkedin, Twitter, Instagram, MessageCircle, MapPin, Phone, Upload } from 'lucide-react'

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
  user_type: 'user' | 'expert'
  phone: string | null
  city: string | null
  description: string | null
  accepts_online: boolean
  accepts_offline: boolean
  rating: number
  total_reviews: number
  total_requests: number
  created_at: string
  updated_at: string
}

interface Category {
  id: string
  name: string
  description: string | null
}

interface ProfileFormProps {
  onClose: () => void
}

export function ProfileForm({ onClose }: ProfileFormProps) {
  const { user } = useAuth()
  const { triggerRefresh } = useRefresh()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [description, setDescription] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [twitterUrl, setTwitterUrl] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [telegramUrl, setTelegramUrl] = useState('')
  const [acceptsOnline, setAcceptsOnline] = useState(false)
  const [acceptsOffline, setAcceptsOffline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      fetchProfile()
      fetchCategories()
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
      setDescription(data.description || '')
      setPhone(data.phone || '')
      setCity(data.city || '')
      setWebsiteUrl(data.website_url || '')
      setGithubUrl(data.github_url || '')
      setLinkedinUrl(data.linkedin_url || '')
      setTwitterUrl(data.twitter_url || '')
      setInstagramUrl(data.instagram_url || '')
      setTelegramUrl(data.telegram_url || '')
      setAcceptsOnline(data.accepts_online || false)
      setAcceptsOffline(data.accepts_offline || false)

      // Если пользователь эксперт, загружаем его категории
      if (data.user_type === 'expert') {
        await fetchExpertCategories(user.id)
      }
    } catch (err) {
      console.error('Ошибка загрузки профиля:', err)
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) {
        console.error('Ошибка загрузки категорий:', error)
        return
      }

      setCategories(data || [])
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err)
    }
  }

  const fetchExpertCategories = async (expertId: string) => {
    try {
      const { data, error } = await supabase
        .from('expert_categories')
        .select(`
          *,
          category:categories(*)
        `)
        .eq('expert_id', expertId)

      if (error) {
        console.error('Ошибка загрузки категорий эксперта:', error)
        return
      }

      setSelectedCategories(data?.map(ec => ec.category_id) || [])
    } catch (err) {
      console.error('Ошибка загрузки категорий эксперта:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      // Обновляем профиль
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          description: description.trim() || null,
          phone: phone.trim() || null,
          city: city.trim() || null,
          website_url: websiteUrl.trim() || null,
          github_url: githubUrl.trim() || null,
          linkedin_url: linkedinUrl.trim() || null,
          twitter_url: twitterUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          telegram_url: telegramUrl.trim() || null,
          accepts_online: acceptsOnline,
          accepts_offline: acceptsOffline,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) {
        setError(profileError.message)
        return
      }

      // Если пользователь эксперт, обновляем категории
      if (profile.user_type === 'expert') {
        // Удаляем старые категории
        const { error: deleteError } = await supabase
          .from('expert_categories')
          .delete()
          .eq('expert_id', user.id)

        if (deleteError) {
          setError(deleteError.message)
          return
        }

        // Добавляем новые категории
        if (selectedCategories.length > 0) {
          const categoryInserts = selectedCategories.map(categoryId => ({
            expert_id: user.id,
            category_id: categoryId
          }))

          const { error: insertError } = await supabase
            .from('expert_categories')
            .insert(categoryInserts)

          if (insertError) {
            setError(insertError.message)
            return
          }
        }
      }

      setMessage('Профиль успешно обновлен')
      
      // Обновляем локальное состояние
      setProfile({
        ...profile,
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        description: description.trim() || null,
        phone: phone.trim() || null,
        city: city.trim() || null,
        website_url: websiteUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        linkedin_url: linkedinUrl.trim() || null,
        twitter_url: twitterUrl.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        telegram_url: telegramUrl.trim() || null,
        accepts_online: acceptsOnline,
        accepts_offline: acceptsOffline,
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

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    // Проверяем размер файла (максимум 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Размер файла не должен превышать 5MB')
      return
    }

    // Проверяем тип файла
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение')
      return
    }

    setUploadingAvatar(true)
    setError('')

    try {
      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Загружаем файл в Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Получаем публичный URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      // Обновляем профиль с новым URL аватара
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Обновляем локальное состояние
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null)
      setMessage('Аватар успешно обновлен!')
      
      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      console.error('Ошибка загрузки аватара:', err)
      setError(err.message || 'Произошла ошибка при загрузке аватара')
    } finally {
      setUploadingAvatar(false)
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
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
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

            {/* Avatar Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Фотография профиля
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Аватар"
                      className="w-16 h-16 object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className={`inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {uploadingAvatar ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">Загрузка...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">Загрузить фото</span>
                      </>
                    )}
                  </label>
                  <p className="mt-1 text-xs text-gray-500">
                    JPG, PNG до 5MB
                  </p>
                </div>
              </div>
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

            {/* Expert-specific fields */}
            {profile?.user_type === 'expert' && (
              <>
                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Описание услуг
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input-field pl-10 min-h-[120px] resize-y"
                      placeholder="Подробно опишите ваши услуги и подход..."
                      rows={5}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Подробное описание ваших услуг и методов работы
                  </p>
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                    Номер телефона
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="input-field pl-10"
                      placeholder="+7 (999) 123-45-67"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Для связи с клиентами
                  </p>
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    Город
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Москва"
                    />
                  </div>
                  <p className="mt-1 text-xs text-red-500">
                    ⚠️ Если вы не укажете город, вас не найдут в поиске
                  </p>
                </div>

                {/* Service Types */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Типы консультаций
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptsOnline}
                        onChange={(e) => setAcceptsOnline(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Онлайн</div>
                        <div className="text-sm text-gray-500">Консультации по видеосвязи</div>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={acceptsOffline}
                        onChange={(e) => setAcceptsOffline(e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">Оффлайн</div>
                        <div className="text-sm text-gray-500">Личные встречи</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Categories */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Направления деятельности
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{category.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Выберите направления, в которых вы работаете
                  </p>
                </div>
              </>
            )}

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
