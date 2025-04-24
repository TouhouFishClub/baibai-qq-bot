/**
 * Webhook控制器
 * 处理QQ机器人的事件订阅与通知
 */

const { handleValidation } = require('../handlers/validationHandler');
const { handleDispatchEvent } = require('../events/eventDispatcher');
const { OP_CODE } = require('../utils/constants');

/**
 * 处理来自QQ机器人平台的Webhook请求
 */
exports.handleWebhook = async (req, res) => {
  try {
    const payload = req.body;
    const botAppId = req.headers['x-bot-appid'];
    
    console.log('收到QQ Webhook请求:', JSON.stringify(payload));
    console.log('Bot AppId:', botAppId);
    
    if (!payload) {
      return res.status(400).json({ error: '无效的请求负载' });
    }
    
    // 根据不同的opcode处理不同类型的事件
    switch (payload.op) {
      case OP_CODE.CALLBACK_VALIDATION:
        // 处理回调地址验证
        await handleValidation(payload, res);
        break;
        
      case OP_CODE.DISPATCH:
        // 处理事件推送
        await handleDispatchEvent(payload, res);
        break;
        
      default:
        console.log(`未处理的OpCode: ${payload.op}`);
        // 对于其他未处理的op code，返回成功以避免QQ平台重试
        res.json({ 
          code: 0, 
          message: '成功接收，但未处理该类型事件'
        });
    }
    
  } catch (error) {
    console.error('Webhook处理错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      error: error.message
    });
  }
};