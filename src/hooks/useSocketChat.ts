import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from '../contexts/AuthContext'

interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  messageType: string
  timestamp: string
  isRead: boolean
}

interface SocketChatHook {
  socket: Socket | null
  isConnected: boolean
  currentChatId: string | null
  messages: Message[]
  activeUsers: string[]
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  joinChat: (chatId: string) => void
  leaveChat: (chatId: string) => void
  sendMessage: (chatId: string, content: string, messageType?: string) => Promise<void>
  markMessagesRead: (chatId: string, messageIds: string[]) => void
  getActiveUsers: () => void
  getChatInfo: (chatId: string) => void
  ping: () => void
}

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'https://platform-ruby-kappa.vercel.app' 
  : 'http://localhost:3001'

export function useSocketChat(): SocketChatHook {
  const { user } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeUsers, setActiveUsers] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  const messagesRef = useRef<Message[]>([])
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  // Обновляем ref при изменении messages
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Инициализация Socket.IO соединения
  useEffect(() => {
    if (!user?.id) return

    console.log('🔌 Инициализация Socket.IO соединения для пользователя:', user.id)
    
    const newSocket = io(SOCKET_URL, {
      auth: {
        userId: user.id
      },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    })

    // Обработка подключения
    newSocket.on('connect', () => {
      console.log('✅ Socket.IO подключен:', newSocket.id)
      setIsConnected(true)
      setConnectionStatus('connected')
      reconnectAttempts.current = 0
    })

    // Обработка отключения
    newSocket.on('disconnect', (reason: string) => {
      console.log('❌ Socket.IO отключен:', reason)
      setIsConnected(false)
      setConnectionStatus('disconnected')
      
      // Автоматическое переподключение
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++
        console.log(`🔄 Попытка переподключения ${reconnectAttempts.current}/${maxReconnectAttempts}`)
        setTimeout(() => {
          newSocket.connect()
        }, 2000 * reconnectAttempts.current)
      }
    })

    // Обработка ошибок подключения
    newSocket.on('connect_error', (error: Error) => {
      console.error('❌ Ошибка подключения Socket.IO:', error)
      setConnectionStatus('error')
      
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++
        setTimeout(() => {
          newSocket.connect()
        }, 3000 * reconnectAttempts.current)
      }
    })

    // Подтверждение подключения от сервера
    newSocket.on('connected', (data: any) => {
      console.log('🎉 Подтверждение подключения от сервера:', data)
      setConnectionStatus('connected')
    })

    // Новое сообщение
    newSocket.on('new_message', (message: Message) => {
      console.log('📨 Получено новое сообщение:', message)
      setMessages(prev => {
        const updated = [...prev, message]
        messagesRef.current = updated
        return updated
      })
    })

    // Сообщение отправлено
    newSocket.on('message_sent', (data: any) => {
      console.log('✅ Сообщение отправлено:', data)
    })

    // Пользователь присоединился к чату
    newSocket.on('user_joined_chat', (data: any) => {
      console.log('👋 Пользователь присоединился к чату:', data)
    })

    // Пользователь покинул чат
    newSocket.on('user_left_chat', (data: any) => {
      console.log('👋 Пользователь покинул чат:', data)
    })

    // Пользователь отключился
    newSocket.on('user_disconnected', (data: any) => {
      console.log('🔌 Пользователь отключился:', data)
    })

    // Сообщения отмечены как прочитанные
    newSocket.on('messages_read', (data: any) => {
      console.log('👁️ Сообщения отмечены как прочитанные:', data)
    })

    // Активные пользователи
    newSocket.on('active_users', (data: any) => {
      console.log('👥 Активные пользователи:', data)
      setActiveUsers(data.users)
    })

    // Информация о чате
    newSocket.on('chat_info', (data: any) => {
      console.log('ℹ️ Информация о чате:', data)
    })

    // Пользователь онлайн
    newSocket.on('user_online', (data: any) => {
      console.log('🟢 Пользователь онлайн:', data)
    })

    // Пользователь офлайн
    newSocket.on('user_offline', (data: any) => {
      console.log('🔴 Пользователь офлайн:', data)
    })

    // Ответ на пинг
    newSocket.on('pong', (data: any) => {
      console.log('🏓 Pong получен:', data)
    })

    // Ошибки
    newSocket.on('error', (error: any) => {
      console.error('❌ Ошибка Socket.IO:', error)
    })

    setSocket(newSocket)
    setConnectionStatus('connecting')

    return () => {
      console.log('🧹 Очистка Socket.IO соединения')
      newSocket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [user?.id])

  // Функция присоединения к чату
  const joinChat = useCallback((chatId: string) => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket не подключен, невозможно присоединиться к чату')
      return
    }

    console.log('📱 Присоединение к чату:', chatId)
    socket.emit('join_chat', { chatId })
    setCurrentChatId(chatId)
    
    // Очищаем сообщения при смене чата
    setMessages([])
  }, [socket, isConnected])

  // Функция выхода из чата
  const leaveChat = useCallback((chatId: string) => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket не подключен, невозможно покинуть чат')
      return
    }

    console.log('🚪 Выход из чата:', chatId)
    socket.emit('leave_chat', { chatId })
    
    if (currentChatId === chatId) {
      setCurrentChatId(null)
      setMessages([])
    }
  }, [socket, isConnected, currentChatId])

  // Функция отправки сообщения
  const sendMessage = useCallback(async (chatId: string, content: string, messageType: string = 'text') => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket не подключен, невозможно отправить сообщение')
      throw new Error('Socket не подключен')
    }

    if (!content.trim()) {
      throw new Error('Сообщение не может быть пустым')
    }

    console.log('💬 Отправка сообщения в чат:', chatId)
    
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Таймаут отправки сообщения'))
      }, 10000)

      const handleMessageSent = (data: any) => {
        clearTimeout(timeout)
        socket.off('message_sent', handleMessageSent)
        console.log('✅ Сообщение успешно отправлено:', data)
        resolve()
      }

      const handleError = (error: any) => {
        clearTimeout(timeout)
        socket.off('message_sent', handleMessageSent)
        socket.off('error', handleError)
        console.error('❌ Ошибка отправки сообщения:', error)
        reject(error)
      }

      socket.on('message_sent', handleMessageSent)
      socket.on('error', handleError)
      
      socket.emit('send_message', {
        chatId,
        content: content.trim(),
        messageType
      })
    })
  }, [socket, isConnected])

  // Функция отметки сообщений как прочитанных
  const markMessagesRead = useCallback((chatId: string, messageIds: string[]) => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket не подключен, невозможно отметить сообщения как прочитанные')
      return
    }

    console.log('👁️ Отметка сообщений как прочитанных:', { chatId, messageIds })
    socket.emit('mark_messages_read', { chatId, messageIds })
  }, [socket, isConnected])

  // Функция получения активных пользователей
  const getActiveUsers = useCallback(() => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket не подключен, невозможно получить активных пользователей')
      return
    }

    console.log('👥 Запрос активных пользователей')
    socket.emit('get_active_users')
  }, [socket, isConnected])

  // Функция получения информации о чате
  const getChatInfo = useCallback((chatId: string) => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket не подключен, невозможно получить информацию о чате')
      return
    }

    console.log('ℹ️ Запрос информации о чате:', chatId)
    socket.emit('get_chat_info', { chatId })
  }, [socket, isConnected])

  // Функция пинга
  const ping = useCallback(() => {
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket не подключен, невозможно отправить пинг')
      return
    }

    console.log('🏓 Отправка пинга')
    socket.emit('ping')
  }, [socket, isConnected])

  return {
    socket,
    isConnected,
    currentChatId,
    messages,
    activeUsers,
    connectionStatus,
    joinChat,
    leaveChat,
    sendMessage,
    markMessagesRead,
    getActiveUsers,
    getChatInfo,
    ping
  }
}
