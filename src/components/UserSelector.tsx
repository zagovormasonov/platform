import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Search, User, X } from 'lucide-react'

interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
}

interface UserSelectorProps {
  isOpen: boolean
  onClose: () => void
  onUserSelect: (userId: string, userName: string) => void
}

export function UserSelector({ isOpen, onClose, onUserSelect }: UserSelectorProps) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers(searchQuery)
    } else {
      setSearchResults([])
    }
  }, [searchQuery])

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

  const handleUserSelect = (profile: Profile) => {
    const userName = profile.full_name || profile.email || 'Пользователь'
    onUserSelect(profile.id, userName)
    onClose()
  }

  const handleClose = () => {
    setSearchQuery('')
    setSearchResults([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Выберите пользователя для чата</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {searchLoading ? (
            <div className="p-4 text-center text-gray-500">
              Поиск...
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-1 p-2">
              {searchResults.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => handleUserSelect(profile)}
                  className="w-full flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
                >
                  <div className="flex-shrink-0">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || 'Пользователь'}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {profile.full_name || 'Без имени'}
                    </p>
                    {profile.email && (
                      <p className="text-sm text-gray-500 truncate">
                        {profile.email}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchQuery.trim() ? (
            <div className="p-4 text-center text-gray-500">
              Пользователи не найдены
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              Введите имя или email для поиска
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  )
}
