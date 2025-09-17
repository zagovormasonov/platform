import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  timestamp: string;
  type: string;
}

interface UseWebSocketChatProps {
  userId: string | null;
  onUnreadCountUpdate?: (count: number) => void;
}

export function useWebSocketChat({ userId, onUnreadCountUpdate }: UseWebSocketChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Map<string, ChatMessage[]>>(new Map());
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Функция подключения к WebSocket
  const connect = useCallback(() => {
    if (!userId) return;

    try {
      const ws = new WebSocket(`ws://localhost:8080?userId=${userId}`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Запрашиваем количество непрочитанных сообщений
        ws.send(JSON.stringify({
          type: 'get_unread_count'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'connected':
              console.log('Connected to chat server');
              break;
              
            case 'chat_history':
              // Получаем историю сообщений чата
              setMessages(prev => {
                const newMessages = new Map(prev);
                newMessages.set(message.chatId, message.messages);
                return newMessages;
              });
              break;
              
            case 'new_message':
              // Получаем новое сообщение
              const newMessage = message.message as ChatMessage;
              setMessages(prev => {
                const newMessages = new Map(prev);
                const chatMessages = newMessages.get(newMessage.chatId) || [];
                newMessages.set(newMessage.chatId, [...chatMessages, newMessage]);
                return newMessages;
              });
              
              // Обновляем счетчик непрочитанных сообщений
              if (newMessage.senderId !== userId) {
                setUnreadCount(prev => prev + 1);
                if (onUnreadCountUpdate) {
                  onUnreadCountUpdate(unreadCount + 1);
                }
              }
              break;
              
            case 'message_sent':
              console.log('Message sent successfully:', message.messageId);
              break;
              
            case 'unread_count':
              setUnreadCount(message.count);
              if (onUnreadCountUpdate) {
                onUnreadCountUpdate(message.count);
              }
              break;
              
            case 'chat_read':
              // Чат отмечен как прочитанный
              console.log(`Chat ${message.chatId} marked as read by ${message.userId}`);
              break;
              
            case 'error':
              console.error('WebSocket error:', message.message);
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Автоматическое переподключение через 3 секунды
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  }, [userId, onUnreadCountUpdate, unreadCount]);

  // Функция отправки сообщения
  const sendMessage = useCallback((chatId: string, content: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'send_message',
        chatId: chatId,
        content: content
      }));
      return true;
    }
    return false;
  }, []);

  // Функция присоединения к чату
  const joinChat = useCallback((chatId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'join_chat',
        chatId: chatId
      }));
      setCurrentChatId(chatId);
      return true;
    }
    return false;
  }, []);

  // Функция отметки чата как прочитанного
  const markChatAsRead = useCallback((chatId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'mark_chat_read',
        chatId: chatId
      }));
      
      // Обновляем счетчик локально
      const chatMessages = messages.get(chatId) || [];
      const unreadMessages = chatMessages.filter(msg => msg.senderId !== userId);
      const newUnreadCount = Math.max(0, unreadCount - unreadMessages.length);
      
      setUnreadCount(newUnreadCount);
      if (onUnreadCountUpdate) {
        onUnreadCountUpdate(newUnreadCount);
      }
      
      return true;
    }
    return false;
  }, [wsRef, messages, unreadCount, userId, onUnreadCountUpdate]);

  // Подключение при монтировании компонента
  useEffect(() => {
    if (userId) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [userId, connect]);

  return {
    isConnected,
    messages,
    unreadCount,
    currentChatId,
    sendMessage,
    joinChat,
    markChatAsRead,
    setCurrentChatId
  };
}

