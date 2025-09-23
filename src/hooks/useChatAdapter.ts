// @ts-nocheck
import { useSocketChat } from './useSocketChat'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { useState, useCallback } from 'react'

interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  messageType: string
  timestamp: string
  isRead: boolean
}

interface ChatAdapterHook {
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
  adapterType: 'socketio' | 'supabase'
}

export function useChatAdapter(): ChatAdapterHook {
  const { user } = useAuth()
  const isProduction = process.env.NODE_ENV === 'production'
  
  // Используем Socket.IO для разработки, Supabase для продакшна
  const socketChat = useSocketChat()
  
  // Состояние для Supabase режима
  const [supabaseMessages, setSupabaseMessages] = useState<Message[]>([])
  const [supabaseConnected, setSupabaseConnected] = useState(false)
  const [supabaseCurrentChatId, setSupabaseCurrentChatId] = useState<string | null>(null)

  // Supabase функции
  const fetchSupabaseMessages = async (chatId: string) => {
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
        return
      }

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        chatId: msg.chat_id,
        senderId: msg.sender_id,
        content: msg.content,
        messageType: msg.message_type || 'text',
        timestamp: msg.created_at,
        isRead: msg.is_read
      }))

      setSupabaseMessages(formattedMessages)
    } catch (err) {
      console.error('Ошибка загрузки сообщений:', err)
    }
  }

  const subscribeToSupabaseMessages = (chatId: string) => {
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
          const newMessage = payload.new as any
          const formattedMessage: Message = {
            id: newMessage.id,
            chatId: newMessage.chat_id,
            senderId: newMessage.sender_id,
            content: newMessage.content,
            messageType: newMessage.message_type || 'text',
            timestamp: newMessage.created_at,
            isRead: newMessage.is_read
          }
          
          setSupabaseMessages(prev => [...prev, formattedMessage])
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setSupabaseConnected(true)
        } else {
          setSupabaseConnected(false)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const sendSupabaseMessage = async (chatId: string, content: string, messageType: string = 'text') => {
    if (!user) throw new Error('Пользователь не авторизован')

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: user.id,
        content: content,
        message_type: messageType
      })
      .select()

    if (error) {
      throw new Error(`Ошибка отправки сообщения: ${error.message}`)
    }

    return data
  }

  // Адаптер функции
  const joinChat = useCallback((chatId: string) => {
    if (isProduction) {
      setSupabaseCurrentChatId(chatId)
      fetchSupabaseMessages(chatId)
      subscribeToSupabaseMessages(chatId)
    } else {
      socketChat.joinChat(chatId)
    }
  }, [isProduction, socketChat])

  const leaveChat = useCallback((chatId: string) => {
    if (isProduction) {
      setSupabaseCurrentChatId(null)
      setSupabaseMessages([])
    } else {
      socketChat.leaveChat(chatId)
    }
  }, [isProduction, socketChat])

  const sendMessage = useCallback(async (chatId: string, content: string, messageType: string = 'text') => {
    if (isProduction) {
      await sendSupabaseMessage(chatId, content, messageType)
    } else {
      await socketChat.sendMessage(chatId, content, messageType)
    }
  }, [isProduction, socketChat])

  const markMessagesRead = useCallback((chatId: string, messageIds: string[]) => {
    if (isProduction) {
      // Supabase не требует специальной отметки о прочтении
      console.log('Отметка сообщений как прочитанных (Supabase режим)')
    } else {
      socketChat.markMessagesRead(chatId, messageIds)
    }
  }, [isProduction, socketChat])

  const getActiveUsers = useCallback(() => {
    if (!isProduction) {
      socketChat.getActiveUsers()
    } else {
      console.log('Получение активных пользователей (Supabase режим)')
    }
  }, [isProduction, socketChat])

  const getChatInfo = useCallback((chatId: string) => {
    if (!isProduction) {
      socketChat.getChatInfo(chatId)
    } else {
      console.log('Получение информации о чате (Supabase режим)')
    }
  }, [isProduction, socketChat])

  const ping = useCallback(() => {
    if (!isProduction) {
      socketChat.ping()
    } else {
      console.log('Ping (Supabase режим)')
    }
  }, [isProduction, socketChat])

  // Возвращаем соответствующие данные в зависимости от режима
  if (isProduction) {
    return {
      isConnected: supabaseConnected,
      currentChatId: supabaseCurrentChatId,
      messages: supabaseMessages,
      activeUsers: [], // Supabase не предоставляет эту информацию
      connectionStatus: supabaseConnected ? 'connected' : 'disconnected',
      joinChat,
      leaveChat,
      sendMessage,
      markMessagesRead,
      getActiveUsers,
      getChatInfo,
      ping,
      adapterType: 'supabase' as const
    }
  } else {
    return {
      isConnected: socketChat.isConnected,
      currentChatId: socketChat.currentChatId,
      messages: socketChat.messages,
      activeUsers: socketChat.activeUsers,
      connectionStatus: socketChat.connectionStatus,
      joinChat,
      leaveChat,
      sendMessage,
      markMessagesRead,
      getActiveUsers,
      getChatInfo,
      ping,
      adapterType: 'socketio' as const
    }
  }
}
