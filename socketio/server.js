import { Server } from 'socket.io';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './config/database.js';

// Загрузка переменных окружения
dotenv.config();

// Создаем HTTP сервер
const server = http.createServer();

// Создаем Socket.IO сервер с CORS настройками
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Хранилище активных пользователей
const activeUsers = new Map();
// Хранилище комнат чатов
const chatRooms = new Map();

// Middleware для аутентификации
io.use(async (socket, next) => {
  try {
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      return next(new Error('User ID required'));
    }

    // Проверка существования пользователя в базе данных
    const result = await query(
      'SELECT id, full_name FROM profiles WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return next(new Error('User not found'));
    }

    socket.userId = userId;
    socket.userName = result.rows[0].full_name;
    next();
  } catch (error) {
    console.error('Ошибка аутентификации Socket.IO:', error);
    next(new Error('Authentication failed'));
  }
});

// Обработка подключения
io.on('connection', (socket) => {
  const userId = socket.userId;
  const userName = socket.userName;
  
  console.log(`👤 Пользователь ${userName} (${userId}) подключился`);
  
  // Сохраняем информацию о пользователе
  activeUsers.set(userId, {
    socketId: socket.id,
    userName: userName,
    connectedAt: new Date(),
    currentChat: null
  });

  // Уведомляем пользователя об успешном подключении
  socket.emit('connected', {
    userId: userId,
    userName: userName,
    timestamp: new Date().toISOString()
  });

  // Уведомляем всех о том, что пользователь онлайн
  socket.broadcast.emit('user_online', {
    userId: userId,
    userName: userName,
    timestamp: new Date().toISOString()
  });

  // Присоединение к чату
  socket.on('join_chat', async (data) => {
    try {
      const { chatId } = data;
      console.log(`📱 Пользователь ${userName} присоединяется к чату ${chatId}`);
      
      // Проверяем, является ли пользователь участником чата
      const participantResult = await query(
        'SELECT id FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      );

      if (participantResult.rows.length === 0) {
        socket.emit('error', {
          message: 'Вы не являетесь участником этого чата',
          code: 'NOT_PARTICIPANT'
        });
        return;
      }
      
      // Присоединяемся к комнате чата
      socket.join(`chat_${chatId}`);
      
      // Обновляем информацию о текущем чате пользователя
      const userInfo = activeUsers.get(userId);
      if (userInfo) {
        userInfo.currentChat = chatId;
      }
      
      // Инициализируем комнату если её нет
      if (!chatRooms.has(chatId)) {
        chatRooms.set(chatId, {
          id: chatId,
          participants: new Set(),
          createdAt: new Date()
        });
      }
      
      // Добавляем пользователя в комнату
      chatRooms.get(chatId).participants.add(userId);
      
      // Получаем историю сообщений
      const messagesResult = await query(
        `SELECT m.id, m.content, m.message_type, m.created_at, m.reply_to,
                p.id as sender_id, p.full_name as sender_name, p.avatar_url as sender_avatar
         FROM messages m
         JOIN profiles p ON m.sender_id = p.id
         WHERE m.chat_id = $1
         ORDER BY m.created_at ASC
         LIMIT 50`,
        [chatId]
      );
      
      // Отправляем историю сообщений
      socket.emit('chat_history', {
        chatId: chatId,
        messages: messagesResult.rows
      });
      
      // Уведомляем участников чата о присоединении
      socket.to(`chat_${chatId}`).emit('user_joined_chat', {
        userId: userId,
        userName: userName,
        chatId: chatId,
        timestamp: new Date().toISOString()
      });
      
      // Отправляем подтверждение
      socket.emit('joined_chat', {
        chatId: chatId,
        participants: Array.from(chatRooms.get(chatId).participants),
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Ошибка присоединения к чату:', error);
      socket.emit('error', {
        message: 'Ошибка присоединения к чату',
        code: 'JOIN_ERROR'
      });
    }
  });

  // Отправка сообщения
  socket.on('send_message', async (data) => {
    try {
      const { chatId, content, messageType = 'text', replyTo } = data;
      console.log(`💬 Пользователь ${userName} отправляет сообщение в чат ${chatId}`);
      
      // Проверяем, что пользователь в этом чате
      if (!socket.rooms.has(`chat_${chatId}`)) {
        socket.emit('error', {
          message: 'Вы не состоите в этом чате',
          code: 'NOT_IN_CHAT'
        });
        return;
      }
      
      // Сохраняем сообщение в базе данных
      const messageResult = await query(
        `INSERT INTO messages (id, chat_id, sender_id, content, message_type, reply_to, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW())
         RETURNING id, created_at`,
        [chatId, userId, content, messageType, replyTo || null]
      );
      
      const messageId = messageResult.rows[0].id;
      const createdAt = messageResult.rows[0].created_at;
      
      const message = {
        id: messageId,
        chatId: chatId,
        senderId: userId,
        senderName: userName,
        content: content,
        messageType: messageType,
        replyTo: replyTo || null,
        timestamp: createdAt,
        isRead: false
      };
      
      // Отправляем сообщение всем участникам чата
      io.to(`chat_${chatId}`).emit('new_message', message);
      
      // Отправляем подтверждение отправителю
      socket.emit('message_sent', {
        messageId: messageId,
        timestamp: createdAt
      });
      
      console.log(`✅ Сообщение ${messageId} отправлено в чат ${chatId}`);
      
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      socket.emit('error', {
        message: 'Ошибка отправки сообщения',
        code: 'SEND_ERROR'
      });
    }
  });

  // Отметка сообщений как прочитанных
  socket.on('mark_messages_read', async (data) => {
    try {
      const { chatId, messageIds } = data;
      console.log(`👁️ Пользователь ${userName} отмечает сообщения как прочитанные в чате ${chatId}`);
      
      // Сохраняем отметки о прочтении в базе данных
      if (messageIds && messageIds.length > 0) {
        for (const messageId of messageIds) {
          await query(
            `INSERT INTO message_reads (message_id, user_id, read_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (message_id, user_id) DO NOTHING`,
            [messageId, userId]
          );
        }
      }
      
      // Уведомляем других участников чата
      socket.to(`chat_${chatId}`).emit('messages_read', {
        chatId: chatId,
        userId: userId,
        userName: userName,
        messageIds: messageIds,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Ошибка отметки сообщений как прочитанных:', error);
    }
  });

  // Получение списка активных пользователей
  socket.on('get_active_users', () => {
    const users = Array.from(activeUsers.values()).map(user => ({
      userId: user.socketId,
      userName: user.userName,
      connectedAt: user.connectedAt
    }));
    
    socket.emit('active_users', {
      users: users,
      count: users.length,
      timestamp: new Date().toISOString()
    });
  });

  // Получение информации о чате
  socket.on('get_chat_info', async (data) => {
    try {
      const { chatId } = data;
      
      const chatResult = await query(
        `SELECT c.id, c.name, c.type, c.created_at,
                COUNT(cp.user_id) as participant_count
         FROM chats c
         LEFT JOIN chat_participants cp ON c.id = cp.chat_id
         WHERE c.id = $1
         GROUP BY c.id, c.name, c.type, c.created_at`,
        [chatId]
      );
      
      if (chatResult.rows.length > 0) {
        const chat = chatResult.rows[0];
        const inMemoryChat = chatRooms.get(chatId);
        
        socket.emit('chat_info', {
          chatId: chatId,
          name: chat.name,
          type: chat.type,
          participantCount: parseInt(chat.participant_count),
          activeParticipants: inMemoryChat ? inMemoryChat.participants.size : 0,
          createdAt: chat.created_at,
          isActive: inMemoryChat ? inMemoryChat.participants.size > 0 : false
        });
      } else {
        socket.emit('error', {
          message: 'Чат не найден',
          code: 'CHAT_NOT_FOUND'
        });
      }
      
    } catch (error) {
      console.error('Ошибка получения информации о чате:', error);
      socket.emit('error', {
        message: 'Ошибка получения информации о чате',
        code: 'CHAT_INFO_ERROR'
      });
    }
  });

  // Пинг для проверки соединения
  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date().toISOString()
    });
  });

  // Покидание чата
  socket.on('leave_chat', (data) => {
    const { chatId } = data;
    console.log(`🚪 Пользователь ${userName} покидает чат ${chatId}`);
    
    socket.leave(`chat_${chatId}`);
    
    // Удаляем пользователя из комнаты
    const chat = chatRooms.get(chatId);
    if (chat) {
      chat.participants.delete(userId);
      
      // Если в чате никого не осталось, удаляем комнату
      if (chat.participants.size === 0) {
        chatRooms.delete(chatId);
        console.log(`🗑️ Комната чата ${chatId} удалена (нет участников)`);
      }
    }
    
    // Обновляем информацию о текущем чате пользователя
    const userInfo = activeUsers.get(userId);
    if (userInfo) {
      userInfo.currentChat = null;
    }
    
    // Уведомляем участников чата о выходе
    socket.to(`chat_${chatId}`).emit('user_left_chat', {
      userId: userId,
      userName: userName,
      chatId: chatId,
      timestamp: new Date().toISOString()
    });
    
    socket.emit('left_chat', {
      chatId: chatId,
      timestamp: new Date().toISOString()
    });
  });

  // Обработка отключения
  socket.on('disconnect', (reason) => {
    console.log(`👋 Пользователь ${userName} (${userId}) отключился. Причина: ${reason}`);
    
    // Удаляем пользователя из всех чатов
    chatRooms.forEach((chat, chatId) => {
      if (chat.participants.has(userId)) {
        chat.participants.delete(userId);
        
        // Уведомляем участников чата об отключении
        socket.to(`chat_${chatId}`).emit('user_disconnected', {
          userId: userId,
          userName: userName,
          chatId: chatId,
          timestamp: new Date().toISOString()
        });
        
        // Если в чате никого не осталось, удаляем комнату
        if (chat.participants.size === 0) {
          chatRooms.delete(chatId);
          console.log(`🗑️ Комната чата ${chatId} удалена (нет участников)`);
        }
      }
    });
    
    // Удаляем пользователя из активных
    activeUsers.delete(userId);
    
    // Уведомляем всех о том, что пользователь офлайн
    socket.broadcast.emit('user_offline', {
      userId: userId,
      userName: userName,
      timestamp: new Date().toISOString()
    });
  });

  // Обработка ошибок
  socket.on('error', (error) => {
    console.error(`❌ Ошибка Socket.IO для пользователя ${userName} (${userId}):`, error);
  });
});

// Периодическая очистка неактивных комнат
setInterval(() => {
  const now = new Date();
  chatRooms.forEach((chat, chatId) => {
    if (chat.participants.size === 0) {
      chatRooms.delete(chatId);
      console.log(`🧹 Очистка: удалена неактивная комната ${chatId}`);
    }
  });
}, 300000); // Каждые 5 минут

// Статистика сервера
setInterval(() => {
  console.log(`📊 Статистика: ${activeUsers.size} активных пользователей, ${chatRooms.size} активных чатов`);
}, 60000); // Каждую минуту

// Запуск сервера
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO сервер запущен на порту ${PORT}`);
  console.log(`🌐 CORS настроен для: ${process.env.CORS_ORIGIN || 'http://localhost:3000'}`);
  console.log(`🔗 URL для подключения: ${process.env.NODE_ENV === 'production' ? process.env.CORS_ORIGIN : 'http://localhost:3002'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, завершение работы...');
  server.close(() => {
    console.log('✅ Сервер закрыт');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Получен SIGINT, завершение работы...');
  server.close(() => {
    console.log('✅ Сервер закрыт');
    process.exit(0);
  });
});

export { io, server };
