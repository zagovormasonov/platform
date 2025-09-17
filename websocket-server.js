const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// Создаем HTTP сервер
const server = http.createServer();

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

// Хранилище активных соединений по пользователям
const userConnections = new Map();
// Хранилище чатов
const chats = new Map();
// Хранилище сообщений
const messages = new Map();

// Функция для отправки сообщения пользователю
function sendToUser(userId, message) {
  const connection = userConnections.get(userId);
  if (connection && connection.readyState === WebSocket.OPEN) {
    connection.send(JSON.stringify(message));
  }
}

// Функция для отправки сообщения всем участникам чата
function sendToChatParticipants(chatId, message, excludeUserId = null) {
  const chat = chats.get(chatId);
  if (chat) {
    chat.participants.forEach(userId => {
      if (userId !== excludeUserId) {
        sendToUser(userId, message);
      }
    });
  }
}

// Обработка подключения
wss.on('connection', (ws, req) => {
  const query = url.parse(req.url, true).query;
  const userId = query.userId;
  
  if (!userId) {
    ws.close(1000, 'User ID required');
    return;
  }

  console.log(`User ${userId} connected`);
  
  // Сохраняем соединение пользователя
  userConnections.set(userId, ws);
  
  // Отправляем подтверждение подключения
  ws.send(JSON.stringify({
    type: 'connected',
    userId: userId
  }));

  // Обработка сообщений от клиента
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'join_chat':
          // Пользователь присоединяется к чату
          const chatId = message.chatId;
          
          if (!chats.has(chatId)) {
            chats.set(chatId, {
              id: chatId,
              participants: new Set()
            });
          }
          
          chats.get(chatId).participants.add(userId);
          
          // Отправляем историю сообщений
          const chatMessages = messages.get(chatId) || [];
          ws.send(JSON.stringify({
            type: 'chat_history',
            chatId: chatId,
            messages: chatMessages
          }));
          
          break;
          
        case 'send_message':
          // Отправка сообщения
          const newMessage = {
            id: Date.now().toString(),
            chatId: message.chatId,
            senderId: userId,
            content: message.content,
            timestamp: new Date().toISOString(),
            type: 'text'
          };
          
          // Сохраняем сообщение
          if (!messages.has(message.chatId)) {
            messages.set(message.chatId, []);
          }
          messages.get(message.chatId).push(newMessage);
          
          // Отправляем сообщение всем участникам чата
          sendToChatParticipants(message.chatId, {
            type: 'new_message',
            message: newMessage
          }, userId);
          
          // Отправляем подтверждение отправителю
          ws.send(JSON.stringify({
            type: 'message_sent',
            messageId: newMessage.id
          }));
          
          break;
          
        case 'mark_chat_read':
          // Отметка чата как прочитанного
          sendToChatParticipants(message.chatId, {
            type: 'chat_read',
            chatId: message.chatId,
            userId: userId
          });
          break;
          
        case 'get_unread_count':
          // Получение количества непрочитанных сообщений
          let unreadCount = 0;
          messages.forEach((chatMessages, chatId) => {
            const chat = chats.get(chatId);
            if (chat && chat.participants.has(userId)) {
              // Считаем сообщения от других пользователей
              const unreadMessages = chatMessages.filter(msg => 
                msg.senderId !== userId
              );
              unreadCount += unreadMessages.length;
            }
          });
          
          ws.send(JSON.stringify({
            type: 'unread_count',
            count: unreadCount
          }));
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  // Обработка отключения
  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
    userConnections.delete(userId);
    
    // Удаляем пользователя из всех чатов
    chats.forEach(chat => {
      chat.participants.delete(userId);
    });
  });

  // Обработка ошибок
  ws.on('error', (error) => {
    console.error(`WebSocket error for user ${userId}:`, error);
  });
});

// Запуск сервера
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
