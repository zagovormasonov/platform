// Middleware для обработки ошибок
export const errorHandler = (err, req, res, next) => {
  console.error('Ошибка:', err);

  // Ошибки валидации
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Ошибка валидации',
      details: err.details || err.message
    });
  }

  // Ошибки базы данных
  if (err.code === '23505') { // unique_violation
    return res.status(409).json({
      error: 'Конфликт данных',
      message: 'Запись с такими данными уже существует'
    });
  }

  if (err.code === '23503') { // foreign_key_violation
    return res.status(400).json({
      error: 'Ошибка внешнего ключа',
      message: 'Связанная запись не найдена'
    });
  }

  if (err.code === '23502') { // not_null_violation
    return res.status(400).json({
      error: 'Обязательное поле не заполнено',
      message: err.message
    });
  }

  // Ошибки JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Недействительный токен'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Токен истек'
    });
  }

  // Ошибки загрузки файлов
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'Файл слишком большой',
      message: 'Максимальный размер файла: 5MB'
    });
  }

  // Ошибки по умолчанию
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Внутренняя ошибка сервера';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware для обработки 404
export const notFound = (req, res, next) => {
  const error = new Error(`Маршрут не найден - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};
