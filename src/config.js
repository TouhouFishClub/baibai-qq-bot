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
  
  // QQ机器人配置
  qqBot: {
    qq: process.env.BOT_QQ || '10000', // 机器人QQ号
    name: process.env.BOT_NAME || 'BaiBai',
    adminQQ: process.env.ADMIN_QQ || '10001', // 管理员QQ号
    appid: process.env.QQ_APPID || '11111111', // QQ机器人appid
    secret: process.env.QQ_SECRET || 'DG5g3B4j9X2KOErG', // QQ机器人secret
    token: process.env.QQ_TOKEN, // QQ机器人token (如果有)
    sandbox: process.env.QQ_SANDBOX === 'true' // 是否使用沙箱环境
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