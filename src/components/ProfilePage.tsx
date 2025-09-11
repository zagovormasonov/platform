import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { UserProfile } from './UserProfile'
import { ProfileForm } from './ProfileForm'
import { Edit3, Eye } from 'lucide-react'

export function ProfilePage() {
  const { user } = useAuth()
  const [showProfile, setShowProfile] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)

  if (!user) {
    return <div>Пользователь не найден</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Мой профиль</h1>
          <div className="flex space-x-3">
            <button
              onClick={() => {
                setShowProfile(true)
                setShowEditForm(false)
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showProfile
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Eye className="h-4 w-4" />
              <span>Просмотр</span>
            </button>
            <button
              onClick={() => {
                setShowProfile(false)
                setShowEditForm(true)
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                showEditForm
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Edit3 className="h-4 w-4" />
              <span>Редактировать</span>
            </button>
          </div>
        </div>

        {showProfile && (
          <UserProfile 
            userId={user.id} 
            onClose={() => setShowProfile(false)}
          />
        )}

        {showEditForm && (
          <ProfileForm 
            onClose={() => setShowEditForm(false)}
          />
        )}
      </div>
    </div>
  )
}
