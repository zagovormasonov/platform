import { Server } from 'socket.io'
import http from 'http'
import cors from 'cors'

// Создаем HTTP сервер
const server = http.createServer();

// Создаем Socket.IO сервер с CORS настройками
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000", 
      "https://platform-ruby-kappa.vercel.app",
      "https://vercel.app",
      "https://*.vercel.app"
    ],
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
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error('User ID required'));
  }
  socket.userId = userId;
  next();
});

// Обработка подключения
io.on('connection', (socket) => {
  const userId = socket.userId;
  console.log(`👤 Пользователь ${userId} подключился`);
  
  // Сохраняем информацию о пользователе
  activeUsers.set(userId, {
    socketId: socket.id,
    connectedAt: new Date(),
    currentChat: null
  });

  // Уведомляем пользователя об успешном подключении
  socket.emit('connected', {
    userId: userId,
    timestamp: new Date().toISOString()
  });

  // Уведомляем всех о том, что пользователь онлайн
  socket.broadcast.emit('user_online', {
    userId: userId,
    timestamp: new Date().toISOString()
  });

  // Присоединение к чату
  socket.on('join_chat', (data) => {
    const { chatId } = data;
    console.log(`📱 Пользователь ${userId} присоединяется к чату ${chatId}`);
    
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
    
    // Уведомляем участников чата о присоединении
    socket.to(`chat_${chatId}`).emit('user_joined_chat', {
      userId: userId,
      chatId: chatId,
      timestamp: new Date().toISOString()
    });
    
    // Отправляем подтверждение
    socket.emit('joined_chat', {
      chatId: chatId,
      participants: Array.from(chatRooms.get(chatId).participants),
      timestamp: new Date().toISOString()
    });
  });

  // Отправка сообщения
  socket.on('send_message', (data) => {
    const { chatId, content, messageType = 'text' } = data;
    console.log(`💬 Пользователь ${userId} отправляет сообщение в чат ${chatId}`);
    
    // Проверяем, что пользователь в этом чате
    if (!socket.rooms.has(`chat_${chatId}`)) {
      socket.emit('error', {
        message: 'Вы не состоите в этом чате',
        code: 'NOT_IN_CHAT'
      });
      return;
    }
    
    const message = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chatId: chatId,
      senderId: userId,
      content: content,
      messageType: messageType,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    
    // Отправляем сообщение всем участникам чата
    io.to(`chat_${chatId}`).emit('new_message', message);
    
    // Отправляем подтверждение отправителю
    socket.emit('message_sent', {
      messageId: message.id,
      timestamp: message.timestamp
    });
    
    console.log(`✅ Сообщение ${message.id} отправлено в чат ${chatId}`);
  });

  // Отметка сообщений как прочитанных
  socket.on('mark_messages_read', (data) => {
    const { chatId, messageIds } = data;
    console.log(`👁️ Пользователь ${userId} отмечает сообщения как прочитанные в чате ${chatId}`);
    
    // Уведомляем других участников чата
    socket.to(`chat_${chatId}`).emit('messages_read', {
      chatId: chatId,
      userId: userId,
      messageIds: messageIds,
      timestamp: new Date().toISOString()
    });
  });

  // Получение списка активных пользователей
  socket.on('get_active_users', () => {
    const users = Array.from(activeUsers.keys());
    socket.emit('active_users', {
      users: users,
      count: users.length,
      timestamp: new Date().toISOString()
    });
  });

  // Получение информации о чате
  socket.on('get_chat_info', (data) => {
    const { chatId } = data;
    const chat = chatRooms.get(chatId);
    
    if (chat) {
      socket.emit('chat_info', {
        chatId: chatId,
        participants: Array.from(chat.participants),
        createdAt: chat.createdAt,
        isActive: chat.participants.size > 0
      });
    } else {
      socket.emit('error', {
        message: 'Чат не найден',
        code: 'CHAT_NOT_FOUND'
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
    console.log(`🚪 Пользователь ${userId} покидает чат ${chatId}`);
    
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
    console.log(`👋 Пользователь ${userId} отключился. Причина: ${reason}`);
    
    // Удаляем пользователя из всех чатов
    chatRooms.forEach((chat, chatId) => {
      if (chat.participants.has(userId)) {
        chat.participants.delete(userId);
        
        // Уведомляем участников чата об отключении
        socket.to(`chat_${chatId}`).emit('user_disconnected', {
          userId: userId,
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
      timestamp: new Date().toISOString()
    });
  });

  // Обработка ошибок
  socket.on('error', (error) => {
    console.error(`❌ Ошибка Socket.IO для пользователя ${userId}:`, error);
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
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Socket.IO сервер запущен на порту ${PORT}`);
  console.log(`🌐 CORS настроен для: https://platform-ruby-kappa.vercel.app`);
  console.log(`🔗 URL для подключения: ${process.env.NODE_ENV === 'production' ? 'https://platform-ruby-kappa.vercel.app' : 'http://localhost:3001'}`);
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

export { io, server }
