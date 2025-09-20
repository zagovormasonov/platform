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
  onLastViewedTimesUpdate?: (lastViewedTimes: Map<string, string>) => void
}

export function ChatModal({ isOpen, onClose, recipientId, recipientName, onUnreadCountUpdate, onLastViewedTimesUpdate }: ChatModalProps) {
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
  const [lastViewedTimes, setLastViewedTimes] = useState<Map<string, string>>(new Map())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'chats' | 'chat'>('chats')

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
      
      // Добавляем более частое периодическое обновление как fallback (каждые 10 секунд)
      const interval = setInterval(() => {
        console.log('🔄 Периодическое обновление сообщений (fallback)')
        fetchMessages(currentChatId, true)
      }, 10000)
      
      // Проверка соединения каждые 30 секунд
      const connectionCheck = setInterval(() => {
        console.log('🔍 Проверка соединения с Supabase')
        supabase
          .from('messages')
          .select('id')
          .limit(1)
          .then(({ error }) => {
            if (error) {
              console.error('❌ Проблема с соединением:', error)
              setRealtimeStatus('disconnected')
            } else {
              console.log('✅ Соединение с Supabase работает')
              if (realtimeStatus === 'disconnected') {
                setRealtimeStatus('connected')
              }
            }
          })
      }, 30000)
      
      return () => {
        unsubscribe()
        clearInterval(interval)
        clearInterval(connectionCheck)
      }
    }
  }, [currentChatId, realtimeStatus])

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

    // Подсчитываем все сообщения от других пользователей во всех чатах
    let unreadCount = 0
    chats.forEach(chat => {
      // Получаем время последнего просмотра чата
      const lastViewedTime = lastViewedTimes.get(chat.id)
      
      // Получаем все сообщения в чате от других пользователей
      const unreadMessages = messages.filter(message => {
        if (message.chat_id !== chat.id || message.sender_id === user.id) {
          return false
        }
        
        // Если чат не был просмотрен, считаем все сообщения непрочитанными
        if (!lastViewedTime) {
          return true
        }
        
        // Считаем непрочитанными только сообщения после последнего просмотра
        return new Date(message.created_at) > new Date(lastViewedTime)
      })
      
      unreadCount += unreadMessages.length
    })

    onUnreadCountUpdate(unreadCount)
  }

  const markChatAsRead = (chatId: string) => {
    // Записываем время просмотра чата
    const now = new Date().toISOString()
    setLastViewedTimes(prev => new Map(prev).set(chatId, now))
    
    // Обновляем счетчик
    updateUnreadCount()
  }

  useEffect(() => {
    updateUnreadCount()
  }, [chats, messages, lastViewedTimes, user, onUnreadCountUpdate])

  useEffect(() => {
    if (onLastViewedTimesUpdate) {
      onLastViewedTimesUpdate(lastViewedTimes)
    }
  }, [lastViewedTimes, onLastViewedTimesUpdate])

  const fetchMessages = async (chatId: string, isPeriodicUpdate = false) => {
    console.log('Загрузка сообщений для чата:', chatId, isPeriodicUpdate ? '(периодическое обновление)' : '')
    
    // Проверяем соединение с Supabase
    try {
      const { error: testError } = await supabase
        .from('messages')
        .select('id')
        .limit(1)
      
      if (testError) {
        console.error('❌ Проблема с соединением Supabase:', testError)
        if (!isPeriodicUpdate) {
          alert('Проблема с соединением. Проверьте интернет-соединение.')
        }
        return
      }
    } catch (err) {
      console.error('❌ Ошибка соединения:', err)
      if (!isPeriodicUpdate) {
        alert('Ошибка соединения с сервером. Проверьте интернет-соединение.')
      }
      return
    }
    
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
        console.log('🔍 Детали ошибки:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Не показываем alert при периодическом обновлении
        if (!isPeriodicUpdate) {
          alert(`Ошибка загрузки сообщений: ${error.message}`)
        }
        return
      }

      const newMessageCount = data?.length || 0
      
      // При периодическом обновлении проверяем, есть ли изменения
      if (isPeriodicUpdate && newMessageCount === lastMessageCount) {
        console.log('🔄 Нет новых сообщений, пропускаем обновление')
        return
      }

      console.log('📥 Загружены сообщения:', data?.length || 0, 'сообщений')
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
    
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3 // Уменьшаем количество попыток
    let reconnectTimeout: NodeJS.Timeout | null = null
    let isSubscribed = false
    
    const createSubscription = () => {
      if (isSubscribed) {
        console.log('⚠️ Подписка уже активна, пропускаем создание новой')
        return null
      }
      
      console.log(`🔄 Попытка подключения ${reconnectAttempts + 1}/${maxReconnectAttempts}`)
      
      const channel = supabase
        .channel(`messages:${chatId}-${Date.now()}`) // Уникальное имя канала
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
            
            // Проверяем, что сообщение еще не добавлено
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id)
              if (exists) {
                console.log('⚠️ Сообщение уже существует, пропускаем')
                return prev
              }
              
              const updated = [...prev, newMessage]
              console.log('📝 Обновляем список сообщений:', updated)
              setLastMessageCount(updated.length)
              return updated
            })
            
            setIsNewMessage(true)
            fetchChats()
            
            // Сбрасываем счетчик переподключений при успешном получении сообщения
            reconnectAttempts = 0
          }
        )
        .subscribe((status) => {
          console.log('📡 Статус подписки Realtime:', status)
          
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime подписка активна')
            setRealtimeStatus('connected')
            reconnectAttempts = 0 // Сбрасываем счетчик при успешном подключении
            isSubscribed = true
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('⚠️ Ошибка Realtime подписки - переходим на fallback режим')
            setRealtimeStatus('disconnected')
            isSubscribed = false
            // Не пытаемся переподключиться при ошибке канала - используем fallback
          } else if (status === 'TIMED_OUT') {
            console.warn('⏰ Realtime подписка истекла - переходим на fallback режим')
            setRealtimeStatus('disconnected')
            isSubscribed = false
            // Не пытаемся переподключиться при таймауте - используем fallback
          } else if (status === 'CLOSED') {
            console.log('🔒 Realtime подписка закрыта')
            setRealtimeStatus('disconnected')
            isSubscribed = false
            attemptReconnect()
          }
        })
      
      return channel
    }
    
    const attemptReconnect = () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++
        const delay = Math.min(5000 * reconnectAttempts, 30000) // Увеличиваем задержки
        
        console.log(`🔄 Переподключение через ${delay}ms (попытка ${reconnectAttempts}/${maxReconnectAttempts})`)
        
        reconnectTimeout = setTimeout(() => {
          createSubscription()
        }, delay)
      } else {
        console.error('❌ Максимальное количество попыток переподключения достигнуто')
        setRealtimeStatus('disconnected')
        console.log('🔄 Переходим на режим периодического обновления')
      }
    }
    
    const channel = createSubscription()
    
    return () => {
      console.log('🔌 Отписываемся от канала:', chatId)
      isSubscribed = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (channel) {
        supabase.removeChannel(channel)
      }
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
      
      // Сбрасываем счетчик для этого чата
      markChatAsRead(chatId)
    } catch (err) {
      console.error('Ошибка создания чата:', err)
      alert('Произошла ошибка при создании чата')
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentChatId || !user || sending) return

    const messageContent = newMessage.trim()

    try {
      setSending(true)
      
      // Добавляем сообщение локально для мгновенного отображения
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        chat_id: currentChatId,
        sender_id: user.id,
        content: messageContent,
        message_type: 'text',
        is_read: false,
        created_at: new Date().toISOString(),
        sender_profile: {
          id: user.id,
          full_name: user.user_metadata?.full_name || 'Вы',
          avatar_url: user.user_metadata?.avatar_url || null
        }
      }
      
      setMessages(prev => [...prev, tempMessage])
      setNewMessage('')
      
      // Отправляем на сервер
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          sender_id: user.id,
          content: messageContent
        })
        .select()

      if (error) {
        console.error('Ошибка отправки сообщения:', error)
        
        // Удаляем временное сообщение при ошибке
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id))
        
        alert(`Ошибка отправки сообщения: ${error.message}`)
        return
      }

      console.log('Сообщение отправлено успешно:', data)
      
      // Заменяем временное сообщение на реальное
      if (data && data[0]) {
        const realMessage = data[0] as Message
        setMessages(prev => 
          prev.map(msg => 
            msg.id === tempMessage.id ? realMessage : msg
          )
        )
      }
      
      // Обновляем список чатов
      fetchChats()
      
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err)
      
      // Удаляем временное сообщение при ошибке
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
      
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
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 min-h-screen overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
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

        <div className="flex-1 flex min-h-0">
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
                            
                            // Сбрасываем счетчик для этого чата
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
            <div className="flex-1 flex flex-col min-h-0">
              {/* Chat Header */}
              <div className="p-4 border-b bg-gray-50 flex-shrink-0">
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
                         realtimeStatus === 'disconnected' ? '🔴 Realtime отключен - используем fallback' : 
                         '🟡 Подключение...'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div 
                id="messages-container" 
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
                onScroll={handleScroll}
              >
                {messages.map((message) => {
                  const isFromCurrentUser = message.sender_id === user?.id
                  const isFromOtherUser = !isFromCurrentUser
                  
                  return (
                  <div
                    key={message.id}
                    className={`flex items-end space-x-2 ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Аватар для сообщений от других пользователей */}
                    {isFromOtherUser && (
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
                      className={`max-w-[85%] sm:max-w-[70%] px-4 py-2 rounded-lg break-words ${
                        isFromCurrentUser
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        isFromCurrentUser ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t bg-gray-50 flex-shrink-0">
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
