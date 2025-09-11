import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  User, 
  Mail, 
  Calendar, 
  Globe, 
  Github, 
  Linkedin, 
  Twitter, 
  Instagram, 
  MessageCircle,
  Plus,
  Check,
  X,
  Edit,
  ArrowLeft
} from 'lucide-react'
import { Navigation } from './Navigation'
import { ProfileForm } from './ProfileForm'

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

interface Article {
  id: string
  title: string
  content: string
  published: boolean
  created_at: string
  updated_at: string
}

interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  updated_at: string
}

interface UserProfileProps {
  userId: string
  onBack?: () => void
}

export function UserProfile({ userId, onBack }: UserProfileProps) {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [friendship, setFriendship] = useState<Friendship | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showEditForm, setShowEditForm] = useState(false)
  const [friendshipLoading, setFriendshipLoading] = useState(false)

  useEffect(() => {
    if (userId) {
      fetchUserData()
    }
  }, [userId])

  const fetchUserData = async () => {
    try {
      setLoading(true)
      
      // Загружаем профиль пользователя
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Ошибка загрузки профиля:', profileError)
        setError('Не удалось загрузить профиль пользователя')
        return
      }

      setProfile(profileData)

      // Загружаем статьи пользователя
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select('*')
        .eq('author_id', userId)
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (articlesError) {
        console.error('Ошибка загрузки статей:', articlesError)
      } else {
        setArticles(articlesData || [])
      }

      // Загружаем информацию о дружбе (если пользователь авторизован)
      if (user && user.id !== userId) {
        const { data: friendshipData, error: friendshipError } = await supabase
          .from('friendships')
          .select('*')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`)
          .single()

        if (friendshipError && friendshipError.code !== 'PGRST116') {
          console.error('Ошибка загрузки информации о дружбе:', friendshipError)
        } else {
          setFriendship(friendshipData)
        }
      }

    } catch (err) {
      console.error('Ошибка загрузки данных:', err)
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const handleAddFriend = async () => {
    if (!user || !profile) return

    setFriendshipLoading(true)
    try {
      const { data, error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: profile.id,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Ошибка добавления в друзья:', error)
        return
      }

      setFriendship(data)
    } catch (err) {
      console.error('Ошибка добавления в друзья:', err)
    } finally {
      setFriendshipLoading(false)
    }
  }

  const handleAcceptFriend = async () => {
    if (!friendship) return

    setFriendshipLoading(true)
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendship.id)

      if (error) {
        console.error('Ошибка принятия заявки:', error)
        return
      }

      setFriendship({ ...friendship, status: 'accepted' })
    } catch (err) {
      console.error('Ошибка принятия заявки:', err)
    } finally {
      setFriendshipLoading(false)
    }
  }

  const handleRejectFriend = async () => {
    if (!friendship) return

    setFriendshipLoading(true)
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendship.id)

      if (error) {
        console.error('Ошибка отклонения заявки:', error)
        return
      }

      setFriendship(null)
    } catch (err) {
      console.error('Ошибка отклонения заявки:', err)
    } finally {
      setFriendshipLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'website': return <Globe className="h-5 w-5" />
      case 'github': return <Github className="h-5 w-5" />
      case 'linkedin': return <Linkedin className="h-5 w-5" />
      case 'twitter': return <Twitter className="h-5 w-5" />
      case 'instagram': return <Instagram className="h-5 w-5" />
      case 'telegram': return <MessageCircle className="h-5 w-5" />
      default: return <Globe className="h-5 w-5" />
    }
  }

  const getSocialLinks = () => {
    if (!profile) return []
    
    const links = []
    if (profile.website_url) links.push({ platform: 'website', url: profile.website_url, label: 'Веб-сайт' })
    if (profile.github_url) links.push({ platform: 'github', url: profile.github_url, label: 'GitHub' })
    if (profile.linkedin_url) links.push({ platform: 'linkedin', url: profile.linkedin_url, label: 'LinkedIn' })
    if (profile.twitter_url) links.push({ platform: 'twitter', url: profile.twitter_url, label: 'Twitter' })
    if (profile.instagram_url) links.push({ platform: 'instagram', url: profile.instagram_url, label: 'Instagram' })
    if (profile.telegram_url) links.push({ platform: 'telegram', url: profile.telegram_url, label: 'Telegram' })
    
    return links
  }

  const getAuthorName = () => {
    if (!profile) return 'Неизвестный пользователь'
    
    if (profile.full_name && profile.full_name.trim()) {
      return profile.full_name
    }
    
    if (profile.email) {
      return profile.email.split('@')[0]
    }
    
    return 'Неизвестный пользователь'
  }

  const isOwnProfile = user && profile && user.id === profile.id

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка профиля...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <User className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 btn-primary"
            >
              Назад
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
            <User className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Пользователь не найден</h3>
          <p className="mt-2 text-gray-600">Профиль пользователя не существует</p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 btn-primary"
            >
              Назад
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Назад</span>
            </button>
          )}
        </div>

        {/* Profile Card */}
        <div className="card mb-8">
          <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={getAuthorName()}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-gray-400" />
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {getAuthorName()}
                  </h1>
                  <div className="flex items-center space-x-2 text-gray-500 mt-1">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-500 mt-1">
                    <Calendar className="h-4 w-4" />
                    <span>На платформе с {formatDate(profile.created_at)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {isOwnProfile ? (
                    <button
                      onClick={() => setShowEditForm(true)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Edit className="h-4 w-4" />
                      <span>Редактировать</span>
                    </button>
                  ) : user && (
                    <div className="flex space-x-2">
                      {!friendship && (
                        <button
                          onClick={handleAddFriend}
                          disabled={friendshipLoading}
                          className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                          <span>{friendshipLoading ? 'Добавление...' : 'Добавить в друзья'}</span>
                        </button>
                      )}
                      
                      {friendship?.status === 'pending' && friendship.user_id === user.id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleRejectFriend}
                            disabled={friendshipLoading}
                            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            <span>Отменить</span>
                          </button>
                        </div>
                      )}
                      
                      {friendship?.status === 'pending' && friendship.friend_id === user.id && (
                        <div className="flex space-x-2">
                          <button
                            onClick={handleAcceptFriend}
                            disabled={friendshipLoading}
                            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
                          >
                            <Check className="h-4 w-4" />
                            <span>Принять</span>
                          </button>
                          <button
                            onClick={handleRejectFriend}
                            disabled={friendshipLoading}
                            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
                          >
                            <X className="h-4 w-4" />
                            <span>Отклонить</span>
                          </button>
                        </div>
                      )}
                      
                      {friendship?.status === 'accepted' && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <Check className="h-4 w-4" />
                          <span>Друзья</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="mt-4">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Social Links */}
              {getSocialLinks().length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Ссылки</h3>
                  <div className="flex flex-wrap gap-3">
                    {getSocialLinks().map((link, index) => (
                      <a
                        key={index}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        {getSocialIcon(link.platform)}
                        <span className="text-sm">{link.label}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Articles */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Статьи пользователя ({articles.length})
          </h2>
          
          {articles.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
                <User className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Пока нет статей</h3>
              <p className="mt-2 text-gray-600">
                {isOwnProfile ? 'Вы еще не опубликовали ни одной статьи' : 'Этот пользователь еще не опубликовал ни одной статьи'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {articles.map((article) => (
                <div key={article.id} className="border-b border-gray-100 pb-6 last:border-b-0">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {article.title}
                  </h3>
                  <p className="text-gray-600 mb-3 line-clamp-3">
                    {article.content}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(article.created_at)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>Опубликовано</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Form */}
      {showEditForm && (
        <ProfileForm onClose={() => setShowEditForm(false)} />
      )}
    </div>
  )
}
