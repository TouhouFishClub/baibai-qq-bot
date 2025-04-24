/**
 * Webhook控制器
 * 处理QQ机器人的事件订阅与通知
 */

const { generateSignature } = require('../utils/signature');
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
    console.log('======')
    
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
    
    // 获取机器人密钥 - 使用环境变量
    const botSecret = process.env.QQ_BOT_SECRET;
    if (!botSecret) {
      throw new Error('未配置QQ_BOT_SECRET环境变量');
    }
    
    // 生成签名 - 使用 event_ts + plain_token 格式
    const message = eventTs + plainToken;
    const signature = generateSignature(botSecret, message);
    
    console.log('生成的签名:', signature);
    
    // 返回验证响应
    return res.json({
      plain_token: plainToken,
      signature: signature
    });
    
  } catch (error) {
    console.error('验证处理错误:', error);
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
      case 'GROUP_AT_MESSAGE_CREATE':
        // 处理私聊消息
        await handleGroupAtMessage(eventData);
        break;

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
async function handleGroupAtMessage(eventData) {
  try {
    console.log('处理群中@机器人消息:', eventData);
    
    // 获取消息内容和相关信息
    const { content, author, group_id, id: messageId } = eventData;
    
    // 消息内容预处理（去除前后空格）
    const trimmedContent = content.trim();
    
    // 定义有效的命令前缀
    const validPrefixes = ['mbi', 'mbd', 'opt', 'meu', 'mbtv', 'mbcd'];
    
    // 检查消息是否以有效前缀开头（不区分大小写）
    let isValidCommand = false;
    let commandPrefix = '';
    let actualContent = '';
    
    // 处理以/开头的情况
    if (trimmedContent.startsWith('/')) {
      const withoutSlash = trimmedContent.substring(1).trim();
      
      for (const prefix of validPrefixes) {
        const regexPattern = new RegExp(`^${prefix}`, 'i');
        if (regexPattern.test(withoutSlash)) {
          isValidCommand = true;
          commandPrefix = prefix.toLowerCase();
          
          // 提取命令后的实际内容
          const prefixLength = prefix.length;
          actualContent = withoutSlash.substring(prefixLength).trim();
          break;
        }
      }
    } else {
      // 处理直接以命令前缀开头的情况
      for (const prefix of validPrefixes) {
        const regexPattern = new RegExp(`^${prefix}`, 'i');
        if (regexPattern.test(trimmedContent)) {
          isValidCommand = true;
          commandPrefix = prefix.toLowerCase();
          
          // 提取命令后的实际内容
          const prefixLength = prefix.length;
          actualContent = trimmedContent.substring(prefixLength).trim();
          break;
        }
      }
    }
    
    if (isValidCommand) {
      console.log(`收到有效命令: ${commandPrefix}`);
      console.log(`命令内容: ${actualContent}`);
      
      // 构建API请求
      await callOpenAPI(commandPrefix, actualContent, author.id, group_id);
    } else {
      console.log('收到非命令消息，忽略处理');
    }
  } catch (error) {
    console.error('处理群聊@消息失败:', error);
  }
}

/**
 * 调用外部OpenAPI接口
 * @param {string} command - 命令类型 (mbi, mbd, opt等)
 * @param {string} content - 实际内容
 * @param {string} userId - 用户ID
 * @param {string} groupId - 群组ID
 */
async function callOpenAPI(command, content, userId, groupId) {
  try {
    if (!content) {
      console.log(`命令 ${command} 内容为空，不执行API调用`);
      return;
    }
    
    const axios = require('axios');
    
    // 从环境变量中获取API基础URL
    const API_BASE_URL = process.env.API_BASE_URL;
    
    if (!API_BASE_URL) {
      throw new Error('未配置API_BASE_URL环境变量');
    }
    
    // 构建请求参数
    const params = { content };
    
    // 根据不同命令添加不同的参数(暂不使用)
    // switch (command) {
    //   case 'opt':
    //   case 'mbtv':
    //   case 'mbcd':
    //     params.from = userId;
    //     break;
    //   case 'meu':
    //     params.from = userId;
    //     params.groupid = groupId;
    //     break;
    // }
    
    // 发送请求
    console.log(`发送API请求: ${API_BASE_URL}/openapi/${command}`, params);
    
    const response = await axios.get(`${API_BASE_URL}/openapi/${command}`, { params });
    
    console.log(`API响应结果:`, response.data);
    
    // 这里可以添加处理API响应并发送消息到群的逻辑
    // 例如：
    // await sendGroupReply(groupId, userId, response.data.message || JSON.stringify(response.data));
    
    return response.data;
  } catch (error) {
    console.error(`API请求失败 (${command}):`, error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
      console.error('响应状态:', error.response.status);
    }
  }
}