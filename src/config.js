/**
 * 应用配置文件
 */

module.exports = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development'
  },
  
  // 安全配置
  security: {
    apiKey: process.env.API_KEY || 'baibai-bot-secret-key',
    enableCors: true,
    allowedOrigins: ['*'] // 在生产环境中应该限制为特定域名
  },
  
  // 数据库配置 (示例)
  database: {
    uri: process.env.DB_URI || 'mongodb://localhost:27017/baibai-bot',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  },
  
  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log'
  }
}; 