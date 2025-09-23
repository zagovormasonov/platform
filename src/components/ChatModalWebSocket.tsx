// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Send, X, MessageCircle, User, ArrowLeft } from 'lucide-react'

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId?: string
  recipientName?: string
  onUnreadCountUpdate?: (count: number) => void
}

interface Chat {
  id: string
  participant_1: string
  participant_2: string
  created_at: string
  updated_at: string
  participant_1_profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
  participant_2_profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
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

export function ChatModalWebSocket({ isOpen, onClose }: ChatModalProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'chats' | 'chat'>('chats')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [chats, setChats] = useState<Chat[]>([])
  const [loadingChats, setLoadingChats] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Автоматический скролл к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, currentChatId])

  // Загрузка сообщений чата
  const fetchMessages = async (chatId: string) => {
    if (!user) return

    setLoadingMessages(true)
    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select(`
          id,
          chat_id,
          sender_id,
          content,
          message_type,
          is_read,
          created_at,
          sender_profile:profiles!messages_sender_id_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })

      if (messagesError) {
        console.error('Ошибка загрузки сообщений:', messagesError)
        return
      }

      // Обрабатываем данные из Supabase
      const processedMessages = Array.isArray(messagesData) ? messagesData.map((message: any) => ({
        id: message.id,
        chat_id: message.chat_id,
        sender_id: message.sender_id,
        content: message.content,
        message_type: message.message_type,
        is_read: message.is_read,
        created_at: message.created_at,
        sender_profile: Array.isArray(message.sender_profile) 
          ? message.sender_profile[0] 
          : message.sender_profile
      })) : []

      setMessages(processedMessages)
    } catch (error) {
      console.error('Ошибка при загрузке сообщений:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  // Загрузка чатов пользователя
  const fetchChats = async () => {
    if (!user) return

    setLoadingChats(true)
    try {
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select(`
          id,
          participant_1,
          participant_2,
          created_at,
          updated_at,
          participant_1_profile:profiles!chats_participant_1_fkey(
            id,
            full_name,
            avatar_url
          ),
          participant_2_profile:profiles!chats_participant_2_fkey(
            id,
            full_name,
            avatar_url
          )
        `)
        .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
        .order('updated_at', { ascending: false })

      if (chatsError) {
        console.error('Ошибка загрузки чатов:', chatsError)
        return
      }

      // Обрабатываем данные из Supabase
      const processedChats = Array.isArray(chatsData) ? chatsData.map((chat: any) => ({
        id: chat.id,
        participant_1: chat.participant_1,
        participant_2: chat.participant_2,
        created_at: chat.created_at,
        updated_at: chat.updated_at,
        participant_1_profile: Array.isArray(chat.participant_1_profile) 
          ? chat.participant_1_profile[0] 
          : chat.participant_1_profile,
        participant_2_profile: Array.isArray(chat.participant_2_profile) 
          ? chat.participant_2_profile[0] 
          : chat.participant_2_profile
      })) : []

      setChats(processedChats)
    } catch (error) {
      console.error('Ошибка при загрузке чатов:', error)
    } finally {
      setLoadingChats(false)
    }
  }

  // Загружаем чаты при открытии модального окна
  useEffect(() => {
    if (isOpen && activeTab === 'chats') {
      fetchChats()
    }
  }, [isOpen, activeTab, user])

  // Обработка отправки сообщения
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChatId || sending || !user) return

    setSending(true)
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: currentChatId,
          sender_id: user.id,
          content: newMessage.trim(),
          message_type: 'text',
          is_read: false
        })
        .select()
        .single()

      if (error) {
        console.error('Ошибка отправки сообщения:', error)
        alert('Ошибка отправки сообщения')
        return
      }

      setNewMessage('')
      
      // Обновляем список сообщений
      await fetchMessages(currentChatId)
      
      // Обновляем время последнего сообщения в чате
      await supabase
        .from('chats')
        .update({ 
          updated_at: new Date().toISOString(),
          last_message_id: data.id
        })
        .eq('id', currentChatId)

    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error)
      alert('Ошибка при отправке сообщения')
    } finally {
      setSending(false)
    }
  }

  // Обработка нажатия Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Обработка клика по чату
  const handleChatClick = (chatId: string) => {
    setCurrentChatId(chatId)
    setActiveTab('chat')
    fetchMessages(chatId)
  }

  // Обработка возврата к списку чатов
  const handleBackToChats = () => {
    setActiveTab('chats')
    setCurrentChatId(null)
    setMessages([])
  }

  // Получение сообщений текущего чата
  const currentMessages = messages

  // Получение партнера по чату
  const getCurrentChatPartner = () => {
    if (!currentChatId || !user) return null
    
    const chat = chats.find(c => c.id === currentChatId)
    if (!chat) return null

    // Определяем, кто является партнером (не текущий пользователь)
    const partner = chat.participant_1 === user.id 
      ? chat.participant_2_profile 
      : chat.participant_1_profile

    return partner || {
      id: chat.participant_1 === user.id ? chat.participant_2 : chat.participant_1,
      full_name: 'Пользователь',
      avatar_url: null
    }
  }

  // Получение имени партнера для чата
  const getChatPartnerName = (chat: Chat) => {
    if (!user) return 'Пользователь'
    
    const partner = chat.participant_1 === user.id 
      ? chat.participant_2_profile 
      : chat.participant_1_profile

    return partner?.full_name || 'Пользователь'
  }

  // Получение аватара партнера для чата
  const getChatPartnerAvatar = (chat: Chat) => {
    if (!user) return null
    
    const partner = chat.participant_1 === user.id 
      ? chat.participant_2_profile 
      : chat.participant_1_profile

    return partner?.avatar_url
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
      <div className="flex items-center justify-center min-h-screen px-4 py-20">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-3">
            {activeTab === 'chat' && (
              <button
                onClick={handleBackToChats}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            
            {activeTab === 'chats' ? (
              <>
                <MessageCircle className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Чаты</h2>
              </>
            ) : (
              <>
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  {getCurrentChatPartner()?.avatar_url ? (
                    <img
                      src={getCurrentChatPartner()?.avatar_url || ''}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {getCurrentChatPartner()?.full_name || 'Пользователь'}
                  </h2>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-500">Онлайн</span>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {activeTab === 'chats' ? (
            /* Chat List */
            <div className="flex-1 p-4 overflow-y-auto">
              {loadingChats ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-gray-500">Загрузка чатов...</div>
                </div>
              ) : chats.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-center text-gray-500">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>У вас пока нет чатов</p>
                    <p className="text-sm">Начните общение с другими пользователями</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {chats.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleChatClick(chat.id)}
                      className="p-3 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-shadow"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {getChatPartnerAvatar(chat) ? (
                            <img
                              src={getChatPartnerAvatar(chat) || ''}
                              alt={getChatPartnerName(chat)}
                              className="w-10 h-10 object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{getChatPartnerName(chat)}</h3>
                          <p className="text-sm text-gray-500">
                            Последнее сообщение: {new Date(chat.updated_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Chat Messages */
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-gray-500">Загрузка сообщений...</div>
                  </div>
                ) : currentMessages.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center text-gray-500">
                      <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Начните общение</p>
                      <p className="text-sm">Отправьте первое сообщение</p>
                    </div>
                  </div>
                ) : (
                  currentMessages.map((message) => (
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
                          {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Введите сообщение..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={sending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
