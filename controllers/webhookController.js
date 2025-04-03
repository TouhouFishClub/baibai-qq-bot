/**
 * Webhook控制器
 * 处理QQ机器人的事件订阅与通知
 */

const ed25519 = require('ed25519');
const config = require('../src/config');

// OpCode常量
const OP_CODE = {
  DISPATCH: 0,
  HEARTBEAT: 1,
  IDENTIFY: 2,
  RESUME: 6,
  RECONNECT: 7,
  INVALID_SESSION: 9,
  HELLO: 10,
  HEARTBEAT_ACK: 11,
  HTTP_CALLBACK_ACK: 12,
  CALLBACK_VALIDATION: 13
};

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

/**
 * 处理回调地址验证
 */
async function handleValidation(payload, res) {
  try {
    if (!payload.d) {
      return res.status(400).json({ error: '无效的验证请求' });
    }
    
    const validationData = payload.d;
    const plainToken = validationData.plain_token;
    const eventTs = validationData.event_ts;
    
    console.log('处理回调地址验证 - 令牌:', plainToken);
    console.log('处理回调地址验证 - 时间戳:', eventTs);
    
    // 获取机器人密钥
    const botSecret = config.qqBot.secret;
    
    // 生成签名
    const signature = generateSignature(botSecret, eventTs, plainToken);
    
    console.log('生成的签名:', signature);
    
    // 返回验证响应 - 注意格式必须完全符合QQ机器人要求
    return res.json({
      plain_token: plainToken,
      signature: signature
    });
    
  } catch (error) {
    console.error('验证处理错误:', error);
    // 即使错误也要返回一个有效的响应格式，避免验证失败
    return res.status(500).json({ 
      error: '验证处理失败',
      message: error.message
    });
  }
}

/**
 * 处理分发事件
 */
async function handleDispatchEvent(payload, res) {
  try {
    if (!payload.t || !payload.d) {
      return res.status(400).json({ error: '无效的事件格式' });
    }
    
    const eventType = payload.t;
    const eventData = payload.d;
    
    console.log(`收到事件: ${eventType}`, JSON.stringify(eventData));
    
    // 根据不同的事件类型处理不同的逻辑
    switch (eventType) {
      case 'AT_MESSAGE_CREATE':
        // 处理@机器人消息
        await handleAtMessage(eventData);
        break;
        
      case 'DIRECT_MESSAGE_CREATE':
        // 处理私聊消息
        await handleDirectMessage(eventData);
        break;
        
      case 'GROUP_ADD_ROBOT':
        // 处理机器人被添加到群
        await handleGroupAddRobot(eventData);
        break;
        
      // 可以添加更多事件类型的处理...
        
      default:
        console.log(`未处理的事件类型: ${eventType}`);
    }
    
    // 返回HTTP回调确认
    return res.json({
      op: OP_CODE.HTTP_CALLBACK_ACK
    });
    
  } catch (error) {
    console.error('事件处理错误:', error);
    return res.status(500).json({
      code: 500,
      message: '事件处理失败',
      error: error.message
    });
  }
}

/**
 * 处理@机器人消息
 */
async function handleAtMessage(eventData) {
  // 这里实现@机器人消息的处理逻辑
  console.log('处理@机器人消息:', eventData);
  // TODO: 实现消息响应逻辑
}

/**
 * 处理私聊消息
 */
async function handleDirectMessage(eventData) {
  // 这里实现私聊消息的处理逻辑
  console.log('处理私聊消息:', eventData);
  // TODO: 实现消息响应逻辑
}

/**
 * 处理机器人被添加到群
 */
async function handleGroupAddRobot(eventData) {
  // 这里实现机器人被添加到群的处理逻辑
  console.log('处理机器人被添加到群:', eventData);
  // TODO: 实现群欢迎消息等逻辑
}

/**
 * 生成签名
 * 使用Ed25519算法，按照QQ机器人文档要求计算签名
 * @param {string} botSecret - 机器人密钥
 * @param {string} eventTs - 事件时间戳
 * @param {string} plainToken - 明文令牌
 * @returns {string} 十六进制格式的签名
 */
function generateSignature(botSecret, eventTs, plainToken) {
  try {
    // 确保bot secret足够长度
    let seed = botSecret;
    while (seed.length < 32) {
      seed = seed.repeat(2);
    }
    seed = seed.substring(0, 32);
    
    // 将密钥转换为Buffer
    const seedBuffer = Buffer.from(seed);
    
    // 创建密钥对
    const keyPair = ed25519.MakeKeypair(seedBuffer);
    
    // 构造消息 - 时间戳 + 明文令牌
    const message = Buffer.from(eventTs + plainToken);
    
    // 使用私钥签名
    const signature = ed25519.Sign(message, keyPair.privateKey);
    
    // 将签名转换为十六进制字符串
    return signature.toString('hex');
    
  } catch (error) {
    console.error('生成签名错误:', error);
    throw error;
  }
} 