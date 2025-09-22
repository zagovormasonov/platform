import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Lock, Eye, EyeOff, UserCheck, Users } from 'lucide-react'

interface AuthFormProps {
  mode: 'signin' | 'signup'
  onToggleMode: () => void
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const { signIn, signUp } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [userType, setUserType] = useState<'user' | 'expert'>('user')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'signup') {
        const { error } = await signUp(email, password, fullName, userType)
        if (error) {
          setError(error.message)
        } else {
          setMessage('Проверьте вашу почту для подтверждения регистрации')
          // Переключаем на режим "Войти" после успешной регистрации
          setTimeout(() => {
            onToggleMode()
          }, 2000) // Переключаем через 2 секунды
        }
      } else {
        const { error } = await signIn(email, password)
        if (error) {
          setError(error.message)
        }
      }
    } catch (err) {
      setError('Произошла неожиданная ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-600">
            <User className="h-6 w-6 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            {mode === 'signin' ? 'Вход в систему' : 'Регистрация'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {mode === 'signin' 
              ? 'Добро пожаловать в Centerra SoulSynergy' 
              : 'Присоединяйтесь к сообществу в Centerra SoulSynergy'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Полное имя
                  </label>
                  <div className="mt-1 relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required={mode === 'signup'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Введите ваше полное имя"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Тип аккаунта
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setUserType('user')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        userType === 'user'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Users className="h-6 w-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Пользователь</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Ищу духовные практики
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserType('expert')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        userType === 'expert'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <UserCheck className="h-6 w-6 mx-auto mb-2" />
                      <div className="text-sm font-medium">Эксперт</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Предоставляю услуги
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email адрес
              </label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Введите ваш email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-600">{message}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Загрузка...' : (mode === 'signin' ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={onToggleMode}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              {mode === 'signin' 
                ? 'Нет аккаунта? Зарегистрироваться' 
                : 'Уже есть аккаунт? Войти'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
