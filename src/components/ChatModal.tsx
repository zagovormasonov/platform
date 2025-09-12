import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Send, X, MessageCircle, User } from 'lucide-react'

interface Chat {
  id: string
  participant_1: string
  participant_2: string
  created_at: string
  updated_at: string
  last_message_at: string
  last_message_text: string | null
  last_message_sender_id: string | null
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
}

interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: string
  is_read: boolean
  created_at: string
  sender_profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
}

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId?: string
  recipientName?: string
}

export function ChatModal({ isOpen, onClose, recipientId, recipientName }: ChatModalProps) {
  const { user } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'chats' | 'chat'>('chats')

  useEffect(() => {
    if (isOpen && user) {
      fetchChats()
      
      // Проверяем подключение к Supabase
      console.log('Supabase подключение проверено')
    }
  }, [isOpen, user])

  useEffect(() => {
    if (currentChatId) {
      fetchMessages(currentChatId)
      const unsubscribe = subscribeToMessages(currentChatId)
      
      // Добавляем периодическое обновление как fallback (каждые 3 секунды)
      const interval = setInterval(() => {
        console.log('🔄 Периодическое обновление сообщений (fallback)')
        fetchMessages(currentChatId)
      }, 3000)
      
      return () => {
        unsubscribe()
        clearInterval(interval)
      }
    }
  }, [currentChatId])

  useEffect(() => {
    if (recipientId && user && isOpen) {
      startChatWithUser(recipientId)
    }
  }, [recipientId, user, isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchChats = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('chats')
        .select(`
          *,
          participant_1_profile:profiles!chats_participant_1_fkey(id, full_name, avatar_url),
          participant_2_profile:profiles!chats_participant_2_fkey(id, full_name, avatar_url)
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('last_message_at', { ascending: false })

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

  const fetchMessages = async (chatId: string) => {
    console.log('Загрузка сообщений для чата:', chatId)
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender_profile:profiles!messages_sender_id_fkey(id, full_name, avatar_url)
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Ошибка загрузки сообщений:', error)
        alert(`Ошибка загрузки сообщений: ${error.message}`)
        return
      }

      console.log('Загружены сообщения:', data)
      setMessages(data || [])
      
      // Прокручиваем к последнему сообщению
      setTimeout(() => {
        const messagesContainer = document.getElementById('messages-container')
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }, 50)
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err)
      alert('Произошла ошибка при загрузке сообщений')
    }
  }

  const subscribeToMessages = (chatId: string) => {
    console.log('🔍 Подписка на сообщения для чата:', chatId)
    
    // Проверяем подключение к Supabase
    console.log('🔗 Supabase подключение проверено')
    
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          console.log('📨 Получено новое сообщение через Realtime:', payload)
          const newMessage = payload.new as Message
          
          // Добавляем новое сообщение в список
          setMessages(prev => {
            const updated = [...prev, newMessage]
            console.log('📝 Обновляем список сообщений:', updated)
            return updated
          })
          
          // Прокручиваем к новому сообщению
          setTimeout(() => {
            const messagesContainer = document.getElementById('messages-container')
            if (messagesContainer) {
              messagesContainer.scrollTop = messagesContainer.scrollHeight
            }
          }, 100)
          
          fetchChats() // Обновляем список чатов
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки Realtime:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime подписка активна')
          setRealtimeStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Ошибка Realtime подписки')
          setRealtimeStatus('disconnected')
        } else if (status === 'TIMED_OUT') {
          console.warn('⏰ Realtime подписка истекла')
          setRealtimeStatus('disconnected')
        } else if (status === 'CLOSED') {
          console.warn('🔒 Realtime подписка закрыта')
          setRealtimeStatus('disconnected')
        }
      })

    return () => {
      console.log('🔌 Отписываемся от канала:', chatId)
      supabase.removeChannel(channel)
    }
  }

  const startChatWithUser = async (recipientId: string) => {
    if (!user) return

    console.log('Создание чата с пользователем:', {
      userId: user.id,
      recipientId: recipientId
    })

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

      console.log('Чат создан/найден:', data)
      const chatId = data
      setCurrentChatId(chatId)
      setActiveTab('chat')
    } catch (err) {
      console.error('Ошибка создания чата:', err)
      alert('Произошла ошибка при создании чата')
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChatId || !user || sending) return

    console.log('Отправка сообщения:', {
      message: newMessage.trim(),
      chatId: currentChatId,
      userId: user.id
    })

    try {
      setSending(true)
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          sender_id: user.id,
          content: newMessage.trim()
        })
        .select()

      if (error) {
        console.error('Ошибка отправки сообщения:', error)
        alert(`Ошибка отправки сообщения: ${error.message}`)
        return
      }

      console.log('Сообщение отправлено успешно:', data)
      setNewMessage('')
      
      // Принудительно обновляем сообщения после отправки с небольшой задержкой
      setTimeout(async () => {
        await fetchMessages(currentChatId)
      }, 100)
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
      sendMessage()
    }
  }

  const getChatPartner = (chat: Chat) => {
    if (!user) return null
    return chat.participant_1 === user.id ? chat.participant_2_profile : chat.participant_1_profile
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">
              {activeTab === 'chats' ? 'Чаты' : 'Чат'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Chats List */}
          {activeTab === 'chats' && (
            <div className="w-full md:w-80 border-r bg-gray-50">
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Ваши чаты</h3>
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
                            setCurrentChatId(chat.id)
                            setActiveTab('chat')
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
                              <h4 className="font-medium text-gray-900 truncate">
                                {partner.full_name || 'Пользователь'}
                              </h4>
                              <p className="text-sm text-gray-500 truncate">
                                {chat.last_message_text || 'Нет сообщений'}
                              </p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatTime(chat.last_message_at)}
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
          {activeTab === 'chat' && currentChatId && (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setActiveTab('chats')}
                      className="md:hidden p-2 text-gray-600 hover:text-gray-800"
                    >
                      ← Назад
                    </button>
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {recipientName || 'Пользователь'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {realtimeStatus === 'connected' ? '🟢 Realtime активен' : 
                         realtimeStatus === 'disconnected' ? '🔴 Realtime отключен' : 
                         '🟡 Подключение...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div id="messages-container" className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender_id === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex space-x-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите сообщение..."
                    className="flex-1 resize-none border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
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
