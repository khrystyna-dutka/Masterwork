// middleware/logger.js - Кастомний логер

const logger = (req, res, next) => {
  const start = Date.now();
  
  // Логування запиту
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  
  // Після відповіді
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '🔴' : '🟢';
    
    console.log(
      `${statusColor} ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`
    );
  });
  
  next();
};

module.exports = logger;
