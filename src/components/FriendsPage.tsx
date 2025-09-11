import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Check, 
  X, 
  Clock, 
  ArrowLeft,
  Search,
  User
} from 'lucide-react'
import { UserProfile } from './UserProfile'
import { PageLayout } from './PageLayout'

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

interface Friendship {
  id: string
  user_id: string
  friend_id: string
  status: string
  created_at: string
  updated_at: string
}

interface FriendRequest extends Friendship {
  profiles: Profile
}

interface FriendsPageProps {
  onBack?: () => void
}

export function FriendsPage({ onBack }: FriendsPageProps) {
  const { user } = useAuth()
  const [friends, setFriends] = useState<FriendRequest[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchFriendsData()
    }
  }, [user])

  const fetchFriendsData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // Загружаем друзей (принятые заявки)
      const { data: friendsData, error: friendsError } = await supabase
        .from('friendships')
        .select(`
          *,
          profiles!friendships_friend_id_fkey (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'accepted')

      if (friendsError) {
        console.error('Ошибка загрузки друзей:', friendsError)
      } else {
        setFriends(friendsData || [])
      }

      // Загружаем входящие заявки
      const { data: pendingData, error: pendingError } = await supabase
        .from('friendships')
        .select(`
          *,
          profiles!friendships_user_id_fkey (*)
        `)
        .eq('friend_id', user.id)
        .eq('status', 'pending')

      if (pendingError) {
        console.error('Ошибка загрузки входящих заявок:', pendingError)
      } else {
        setPendingRequests(pendingData || [])
      }

      // Загружаем исходящие заявки
      const { data: sentData, error: sentError } = await supabase
        .from('friendships')
        .select(`
          *,
          profiles!friendships_friend_id_fkey (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')

      if (sentError) {
        console.error('Ошибка загрузки исходящих заявок:', sentError)
      } else {
        setSentRequests(sentData || [])
      }

    } catch (err) {
      console.error('Ошибка загрузки данных друзей:', err)
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) {
      setSearchResults([])
      return
    }

    setSearchLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10)

      if (error) {
        console.error('Ошибка поиска пользователей:', error)
        return
      }

      setSearchResults(data || [])
    } catch (err) {
      console.error('Ошибка поиска пользователей:', err)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    searchUsers(query)
  }

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId)

      if (error) {
        console.error('Ошибка принятия заявки:', error)
        return
      }

      fetchFriendsData()
    } catch (err) {
      console.error('Ошибка принятия заявки:', err)
    }
  }

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) {
        console.error('Ошибка отклонения заявки:', error)
        return
      }

      fetchFriendsData()
    } catch (err) {
      console.error('Ошибка отклонения заявки:', err)
    }
  }

  const handleCancelRequest = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) {
        console.error('Ошибка отмены заявки:', error)
        return
      }

      fetchFriendsData()
    } catch (err) {
      console.error('Ошибка отмены заявки:', err)
    }
  }

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId)

      if (error) {
        console.error('Ошибка удаления из друзей:', error)
        return
      }

      fetchFriendsData()
    } catch (err) {
      console.error('Ошибка удаления из друзей:', err)
    }
  }

  const getAuthorName = (profile: Profile) => {
    if (profile.full_name && profile.full_name.trim()) {
      return profile.full_name
    }
    
    if (profile.email) {
      return profile.email.split('@')[0]
    }
    
    return 'Неизвестный пользователь'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка друзей...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-red-100">
            <Users className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Ошибка загрузки</h3>
          <p className="mt-2 text-gray-600">{error}</p>
          <button
            onClick={fetchFriendsData}
            className="mt-4 btn-primary"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <PageLayout>
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
          <h1 className="text-3xl font-bold text-gray-900">Друзья</h1>
        </div>

        {/* Search */}
        <div className="card mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Поиск пользователей</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              className="input-field pl-10"
              placeholder="Поиск по имени или email..."
            />
          </div>
          
          {searchLoading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          )}
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      {profile.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={getAuthorName(profile)}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getAuthorName(profile)}</p>
                      <p className="text-sm text-gray-500">{profile.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUserId(profile.id)}
                    className="btn-primary text-sm"
                  >
                    Посмотреть профиль
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Входящие заявки ({pendingRequests.length})
            </h2>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {request.profiles.avatar_url ? (
                        <img
                          src={request.profiles.avatar_url}
                          alt={getAuthorName(request.profiles)}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getAuthorName(request.profiles)}</p>
                      <p className="text-sm text-gray-500">{request.profiles.email}</p>
                      <p className="text-xs text-gray-400">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      className="btn-primary flex items-center space-x-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>Принять</span>
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <X className="h-4 w-4" />
                      <span>Отклонить</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sent Requests */}
        {sentRequests.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Исходящие заявки ({sentRequests.length})
            </h2>
            <div className="space-y-4">
              {sentRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {request.profiles.avatar_url ? (
                        <img
                          src={request.profiles.avatar_url}
                          alt={getAuthorName(request.profiles)}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getAuthorName(request.profiles)}</p>
                      <p className="text-sm text-gray-500">{request.profiles.email}</p>
                      <p className="text-xs text-gray-400">{formatDate(request.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Ожидает</span>
                    <button
                      onClick={() => handleCancelRequest(request.id)}
                      className="btn-secondary text-sm"
                    >
                      Отменить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friends */}
        <div className="card">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Друзья ({friends.length})
          </h2>
          
          {friends.length === 0 ? (
            <div className="text-center py-8">
              <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-gray-100">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Пока нет друзей</h3>
              <p className="mt-2 text-gray-600">
                Найдите пользователей и добавьте их в друзья
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {friends.map((friend) => (
                <div key={friend.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                      {friend.profiles.avatar_url ? (
                        <img
                          src={friend.profiles.avatar_url}
                          alt={getAuthorName(friend.profiles)}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{getAuthorName(friend.profiles)}</p>
                      <p className="text-sm text-gray-500">{friend.profiles.email}</p>
                      <p className="text-xs text-gray-400">Друзья с {formatDate(friend.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setSelectedUserId(friend.profiles.id)}
                      className="btn-primary text-sm"
                    >
                      Профиль
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="btn-secondary text-sm"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  )
}
