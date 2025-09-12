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
  onUnreadCountUpdate?: (count: number) => void
}

export function ChatModal({ isOpen, onClose, recipientId, recipientName, onUnreadCountUpdate }: ChatModalProps) {
  const { user } = useAuth()
  const [chats, setChats] = useState<Chat[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown')
  const [scrollPosition, setScrollPosition] = useState<number>(0)
  const [shouldPreserveScroll, setShouldPreserveScroll] = useState(false)
  const [isNewMessage, setIsNewMessage] = useState(false)
  const [lastMessageCount, setLastMessageCount] = useState<number>(0)
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
      
      // Добавляем периодическое обновление как fallback (каждые 10 секунд)
      const interval = setInterval(() => {
        console.log('🔄 Периодическое обновление сообщений (fallback)')
        fetchMessages(currentChatId, true) // Передаем флаг периодического обновления
      }, 10000)
      
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

  const handleScroll = () => {
    const messagesContainer = document.getElementById('messages-container')
    if (messagesContainer) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50 // Уменьшили порог
      
      // Если пользователь не внизу, сохраняем позицию для следующего обновления
      if (!isAtBottom) {
        setScrollPosition(scrollTop)
        setShouldPreserveScroll(true)
        console.log('📍 Пользователь листает чат, сохраняем позицию:', scrollTop)
      } else {
        setShouldPreserveScroll(false)
        console.log('📍 Пользователь внизу чата')
      }
    }
  }

  const restoreScrollIfNeeded = () => {
    if (shouldPreserveScroll) {
      const messagesContainer = document.getElementById('messages-container')
      if (messagesContainer) {
        // Проверяем, что пользователь действительно не внизу
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
        
        if (!isAtBottom) {
          messagesContainer.scrollTop = scrollPosition
          setShouldPreserveScroll(false)
        }
      }
    }
  }

  useEffect(() => {
    // Автоматическая прокрутка только если это новое сообщение
    if (isNewMessage) {
      scrollToBottom()
      setIsNewMessage(false) // Сбрасываем флаг после прокрутки
    } else if (!shouldPreserveScroll) {
      // Если пользователь был внизу, но это не новое сообщение - восстанавливаем позицию
      restoreScrollIfNeeded()
    }
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
          participant_2_profile:profiles!chats_participant_2_fkey(id, full_name, avatar_url),
          last_message:messages!chats_last_message_id_fkey(id, content, created_at, sender_id)
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки чатов:', error)
        return
      }

      console.log('Загружены чаты с последними сообщениями:', data)
      setChats(data || [])
    } catch (err) {
      console.error('Ошибка загрузки чатов:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateUnreadCount = () => {
    if (!user || !onUnreadCountUpdate) return

    // Подсчитываем чаты с непрочитанными сообщениями
    let unreadCount = 0
    chats.forEach(chat => {
      if (chat.last_message && chat.last_message.sender_id !== user.id) {
        unreadCount++
      }
    })

    onUnreadCountUpdate(unreadCount)
  }

  useEffect(() => {
    updateUnreadCount()
  }, [chats, user, onUnreadCountUpdate])

  const fetchMessages = async (chatId: string, isPeriodicUpdate = false) => {
    console.log('Загрузка сообщений для чата:', chatId, isPeriodicUpdate ? '(периодическое обновление)' : '')
    
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

      const newMessageCount = data?.length || 0
      
      // При периодическом обновлении проверяем, есть ли изменения
      if (isPeriodicUpdate && newMessageCount === lastMessageCount) {
        console.log('🔄 Нет новых сообщений, пропускаем обновление')
        return
      }

      console.log('Загружены сообщения:', data)
      setMessages(data || [])
      setLastMessageCount(newMessageCount)
      
      // Устанавливаем флаг нового сообщения только если это не периодическое обновление
      if (!isPeriodicUpdate) {
        setIsNewMessage(true)
      }
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
            setLastMessageCount(updated.length) // Обновляем счетчик
            return updated
          })
          
          // Устанавливаем флаг нового сообщения для автоматической прокрутки
          setIsNewMessage(true)
          
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

  const getCurrentChatPartner = () => {
    if (!currentChatId || !user) return null
    const currentChat = chats.find(c => c.id === currentChatId)
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
          {activeTab === 'chat' && currentChatId && (
            <div className="flex-1 flex flex-col">
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setActiveTab('chats')}
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
                      <h3 className="font-medium text-gray-900">
                        {getCurrentChatPartner()?.full_name || recipientName || 'Пользователь'}
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
              <div 
                id="messages-container" 
                className="flex-1 overflow-y-auto p-4 space-y-4"
                onScroll={handleScroll}
              >
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-end space-x-2 ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Аватар для сообщений от других пользователей */}
                    {message.sender_id !== user?.id && (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                        {message.sender_profile?.avatar_url ? (
                          <img
                            src={message.sender_profile.avatar_url}
                            alt={message.sender_profile.full_name || 'Пользователь'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    )}
                    
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
