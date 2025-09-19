import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWebSocketChat } from '../hooks/useWebSocketChat'
import { Send, X, MessageCircle, User, ArrowLeft } from 'lucide-react'

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
  recipientId?: string
  recipientName?: string
  onUnreadCountUpdate?: (count: number) => void
}

export function ChatModalWebSocket({ isOpen, onClose, recipientId, recipientName, onUnreadCountUpdate }: ChatModalProps) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'chats' | 'chat'>('chats')
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const {
    isConnected,
    messages,
    unreadCount,
    currentChatId,
    sendMessage,
    joinChat,
    markChatAsRead,
    setCurrentChatId
  } = useWebSocketChat({
    userId: user?.id || null,
    onUnreadCountUpdate
  })

  // Автоматический скролл к последнему сообщению
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, currentChatId])

  // Обработка отправки сообщения
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentChatId || sending) return

    setSending(true)
    const success = sendMessage(currentChatId, newMessage.trim())
    
    if (success) {
      setNewMessage('')
    } else {
      alert('Ошибка отправки сообщения')
    }
    
    setSending(false)
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
    joinChat(chatId)
    markChatAsRead(chatId)
  }

  // Обработка возврата к списку чатов
  const handleBackToChats = () => {
    setActiveTab('chats')
    setCurrentChatId(null)
  }

  // Получение сообщений текущего чата
  const currentMessages = currentChatId ? messages.get(currentChatId) || [] : []

  // Получение партнера по чату
  const getCurrentChatPartner = () => {
    if (!currentChatId || !user) return null
    
    // В реальном приложении здесь должна быть логика получения профиля партнера
    // Пока возвращаем заглушку
    return {
      id: recipientId || 'unknown',
      full_name: recipientName || 'Пользователь',
      avatar_url: null
    }
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
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-gray-500">
                      {isConnected ? 'Онлайн' : 'Офлайн'}
                    </span>
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
              <div className="space-y-3">
                {/* Заглушка для демонстрации */}
                <div
                  onClick={() => handleChatClick('demo-chat-1')}
                  className="p-3 bg-white rounded-lg border hover:shadow-md cursor-pointer transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">Демо чат</h3>
                      <p className="text-sm text-gray-500">Нажмите для начала чата</p>
                    </div>
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Chat Messages */
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {currentMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user?.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.senderId === user?.id ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
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
