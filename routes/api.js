const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const authMiddleware = require('../middlewares/auth');

// 基础状态路由
router.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// 消息相关路由 - 使用认证中间件
router.post('/message', authMiddleware.apiKeyAuth, messageController.handleMessage);
router.get('/message/history', authMiddleware.apiKeyAuth, messageController.getMessageHistory);

// 开放测试路由 - 不需要认证
router.post('/test/echo', (req, res) => {
  const { content } = req.body;
  res.json({
    success: true,
    message: '回音测试',
    received: content,
    timestamp: new Date().toISOString()
  });
});

module.exports = router; 