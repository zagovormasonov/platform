import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useSocketChat } from '../hooks/useSocketChat'
import { Send, X, MessageCircle, User, Wifi, WifiOff, AlertCircle } from 'lucide-react'

interface Chat {
  id: string
  participant_1: string
  participant_2: string
  created_at: string
  updated_at: string
  last_message_id: string | null
  participant_1_profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  participant_2_profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  last_message?: {
    id: string
    content: string
    created_at: string
    sender_id: string
  }
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId?: string
  recipientName?: string
  onUnreadCountUpdate?: (count: number) => void
  onLastViewedTimesUpdate?: (lastViewedTimes: Map<string, string>) => void
}

export function ChatModalSocketIO({ isOpen, onClose, recipientId, recipientName, onUnreadCountUpdate, onLastViewedTimesUpdate }: ChatModalProps) {
  const { user } = useAuth()
  const {
    isConnected,
    messages: socketMessages,
    activeUsers,
    connectionStatus,
    joinChat,
    leaveChat,
    sendMessage,
    markMessagesRead,
    getActiveUsers,
    ping
  } = useSocketChat()

  const [chats, setChats] = useState<Chat[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [isNewMessage, setIsNewMessage] = useState(false)
  const [lastViewedTimes, setLastViewedTimes] = useState<Map<string, string>>(new Map())
  const [activeTab, setActiveTab] = useState<'chats' | 'chat'>('chats')
  const [localCurrentChatId, setLocalCurrentChatId] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Загружаем время последнего просмотра из localStorage при инициализации
  useEffect(() => {
    if (user) {
      const savedTimes = localStorage.getItem(`lastViewedTimes_${user.id}`)
      if (savedTimes) {
        try {
          const parsedTimes = JSON.parse(savedTimes)
          setLastViewedTimes(new Map(Object.entries(parsedTimes)))
        } catch (err) {
          console.error('Ошибка загрузки времени просмотра из localStorage:', err)
        }
      }
    }
  }, [user])

  // Сохраняем время последнего просмотра в localStorage при изменении
  useEffect(() => {
    if (user && lastViewedTimes.size > 0) {
      const timesObject = Object.fromEntries(lastViewedTimes)
      localStorage.setItem(`lastViewedTimes_${user.id}`, JSON.stringify(timesObject))
    }
  }, [lastViewedTimes, user])

  // Загружаем чаты при открытии модального окна
  useEffect(() => {
    if (isOpen && user) {
      fetchChats()
      if (isConnected) {
        getActiveUsers()
      }
    }
  }, [isOpen, user, isConnected])

  // Присоединяемся к чату при смене localCurrentChatId
  useEffect(() => {
    if (localCurrentChatId && isConnected) {
      joinChat(localCurrentChatId)
      markChatAsRead(localCurrentChatId)
    }
  }, [localCurrentChatId, isConnected])

  // Обработка новых сообщений от Socket.IO
  useEffect(() => {
    if (socketMessages.length > 0) {
      setIsNewMessage(true)
    }
  }, [socketMessages])

  // Автоматическая прокрутка при новых сообщениях
  useEffect(() => {
    if (isNewMessage) {
      scrollToBottom()
      setIsNewMessage(false)
    }
  }, [socketMessages, isNewMessage])

  // Обработка автоматического чата с получателем
  useEffect(() => {
    if (recipientId && user && isOpen) {
      startChatWithUser(recipientId)
    }
  }, [recipientId, user, isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }


  const fetchChats = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          participant_1_profile:profiles!chats_participant_1_fkey(id, full_name, avatar_url),
          participant_2_profile:profiles!chats_participant_2_fkey(id, full_name, avatar_url),
          last_message:messages!chats_last_message_id_fkey(id, content, created_at, sender_id)
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки чатов:', error)
        return
      }

      setChats(data || [])
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateUnreadCount = () => {
    if (!user || !onUnreadCountUpdate) return

    let unreadCount = 0
    chats.forEach(chat => {
      const lastViewedTime = lastViewedTimes.get(chat.id)
      
      const unreadMessages = socketMessages.filter(message => {
        if (message.chatId !== chat.id || message.senderId === user.id) {
          return false
        }
        
        if (!lastViewedTime) {
          return true
        }
        
        return new Date(message.timestamp) > new Date(lastViewedTime)
      })
      
      unreadCount += unreadMessages.length
    })

    onUnreadCountUpdate(unreadCount)
  }

  const markChatAsRead = (chatId: string) => {
    const now = new Date().toISOString()
    setLastViewedTimes(prev => new Map(prev).set(chatId, now))
    
    // Отмечаем сообщения как прочитанные через Socket.IO
    const unreadMessageIds = socketMessages
      .filter(msg => msg.chatId === chatId && msg.senderId !== user?.id && !msg.isRead)
      .map(msg => msg.id)
    
    if (unreadMessageIds.length > 0) {
      markMessagesRead(chatId, unreadMessageIds)
    }
    
    updateUnreadCount()
  }

  useEffect(() => {
    updateUnreadCount()
  }, [chats, socketMessages, lastViewedTimes, user, onUnreadCountUpdate])

  useEffect(() => {
    if (onLastViewedTimesUpdate) {
      onLastViewedTimesUpdate(lastViewedTimes)
    }
  }, [lastViewedTimes, onLastViewedTimesUpdate])

  const startChatWithUser = async (recipientId: string) => {
    if (!user) return

    try {
      const { data, error } = await supabase.rpc('get_or_create_chat', {
        user1_id: user.id,
        user2_id: recipientId
      })

      if (error) {
        console.error('Ошибка создания чата:', error)
        alert(`Ошибка создания чата: ${error.message}`)
        return
      }

      const chatId = data
      setLocalCurrentChatId(chatId)
      setActiveTab('chat')
      
      markChatAsRead(chatId)
    } catch (err) {
      console.error('Ошибка создания чата:', err)
      alert('Произошла ошибка при создании чата')
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !localCurrentChatId || !user || sending || !isConnected) return

    try {
      setSending(true)
      await sendMessage(localCurrentChatId, newMessage.trim())
      setNewMessage('')
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err)
      alert('Произошла ошибка при отправке сообщения')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const getChatPartner = (chat: Chat) => {
    if (!user) return null
    return chat.participant_1 === user.id ? chat.participant_2_profile : chat.participant_1_profile
  }

  const getCurrentChatPartner = () => {
    if (!localCurrentChatId || !user) return null
    const currentChat = chats.find(c => c.id === localCurrentChatId)
    return currentChat ? getChatPartner(currentChat) : null
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <WifiOff className="h-4 w-4 text-gray-500" />
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢 Socket.IO подключен'
      case 'connecting':
        return '🟡 Подключение...'
      case 'disconnected':
        return '🔴 Socket.IO отключен'
      case 'error':
        return '❌ Ошибка подключения'
      default:
        return '⚪ Неизвестно'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === 'chats' ? 'Чаты (Socket.IO)' : 'Чат (Socket.IO)'}
            </h2>
            <div className="flex items-center space-x-1">
              {getConnectionStatusIcon()}
              <span className="text-xs text-gray-500">
                {activeUsers.length} онлайн
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={ping}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Проверить соединение"
            >
              🏓
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
            {/* Chats List */}
            {activeTab === 'chats' && (
              <div className="w-full md:w-80 border-r bg-gray-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Ваши чаты</h3>
                    <div className="text-xs text-gray-500">
                      {getConnectionStatusText()}
                    </div>
                  </div>
                  
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600">Загрузка чатов...</p>
                    </div>
                  ) : chats.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>У вас пока нет чатов</p>
                      <p className="text-sm">Начните общение с другим пользователем</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {chats.map((chat) => {
                        const partner = getChatPartner(chat)
                        if (!partner) return null

                        return (
                          <div
                            key={chat.id}
                            onClick={() => {
                              setLocalCurrentChatId(chat.id)
                              setActiveTab('chat')
                              markChatAsRead(chat.id)
                            }}
                            className="p-3 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-shadow"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                {partner.avatar_url ? (
                                  <img
                                    src={partner.avatar_url}
                                    alt={partner.full_name || 'Пользователь'}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <User className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900 truncate">
                                    {partner.full_name || 'Пользователь'}
                                  </h4>
                                  {activeUsers.includes(partner.id) && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Онлайн"></div>
                                  )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">
                                  {chat.last_message?.content || 'Нет сообщений'}
                                </p>
                              </div>
                              <div className="text-xs text-gray-400">
                                {chat.last_message ? formatTime(chat.last_message.created_at) : formatTime(chat.created_at)}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            {activeTab === 'chat' && localCurrentChatId && (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Chat Header */}
                <div className="p-4 border-b bg-gray-50 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => {
                          leaveChat(localCurrentChatId)
                          setActiveTab('chats')
                        }}
                        className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        ← Назад
                      </button>
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                        {getCurrentChatPartner()?.avatar_url ? (
                          <img
                            src={getCurrentChatPartner()?.avatar_url || ''}
                            alt={getCurrentChatPartner()?.full_name || 'Пользователь'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {getCurrentChatPartner()?.full_name || recipientName || 'Пользователь'}
                          </h3>
                          {activeUsers.includes(getCurrentChatPartner()?.id || '') && (
                            <div className="w-2 h-2 bg-green-500 rounded-full" title="Онлайн"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {getConnectionStatusText()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div 
                  id="messages-container" 
                  className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
                >
                  {socketMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex items-end space-x-2 ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* Аватар для сообщений от других пользователей */}
                      {message.senderId !== user?.id && (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          <User className="h-4 w-4 text-gray-400" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] px-4 py-2 rounded-lg break-words ${
                          message.senderId === user?.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={`text-xs mt-1 ${
                          message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t bg-gray-50 flex-shrink-0">
                  <div className="flex space-x-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder={isConnected ? "Введите сообщение..." : "Подключение к серверу..."}
                      className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      disabled={sending || !isConnected}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending || !isConnected}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span className="hidden sm:inline">Отправить</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
