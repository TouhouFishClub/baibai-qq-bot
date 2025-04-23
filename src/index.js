const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./config');
require('dotenv').config();

// 引入中间件
const verifySignature = require('../middlewares/signatureVerification');

// 引入路由
const apiRoutes = require('../routes/api');
const webhookController = require('../controllers/webhookController');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || config.server.port;

// 中间件
if (config.security.enableCors) {
  const corsOptions = {
    origin: config.security.allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-api-key', 'x-signature-ed25519', 'x-signature-timestamp']
  };
  app.use(cors(corsOptions));
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 简单的请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// 路由
app.use('/api', apiRoutes);

// QQ Webhook 路由 - 使用签名验证中间件
app.post('/qq/webhook', verifySignature, webhookController.handleWebhook);

// 测试路由 - 输出请求参数
app.all('/qq/test', (req, res) => {
  console.log('=== 请求头信息 ===');
  console.log('Headers:', req.headers);
  console.log('\n=== 请求体信息 ===');
  console.log('Body:', req.body);
  console.log('\n=== 请求参数 ===');
  console.log('Query:', req.query);
  console.log('\n=== 完整请求信息 ===');
  console.log('Request:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body,
    query: req.query
  });
  
  res.json({
    message: '请求信息已记录到控制台',
    timestamp: new Date().toISOString(),
    method: req.method
  });
});

// 基础路由
app.get('/', (req, res) => {
  res.json({ 
    message: `欢迎使用${config.qqBot.name} QQ机器人API服务`,
    environment: config.server.environment,
    version: '1.0.0'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ error: '未找到请求的资源' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: config.server.environment === 'development' ? err.message : '请联系管理员'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`环境: ${config.server.environment}`);
  console.log(`机器人名称: ${config.qqBot.name}`);
  console.log(`QQ Webhook 路径: http://localhost:${PORT}/qq/webhook`);
});

module.exports = app; 