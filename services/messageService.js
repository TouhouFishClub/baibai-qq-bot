/**
 * 消息服务
 * 负责发送各类消息到QQ平台
 */

const axios = require('axios');
const qs = require('querystring');

// QQ机器人API基础URL
const QQ_API_BASE_URL = 'https://api.sgroup.qq.com';

/**
 * 获取访问令牌
 * @returns {Promise<string>} 访问令牌
 */
async function getAccessToken() {
  try {
    const appId = process.env.QQ_BOT_APP_ID;
    const appSecret = process.env.QQ_BOT_SECRET;
    
    if (!appId || !appSecret) {
      throw new Error('未配置QQ_BOT_APP_ID或QQ_BOT_SECRET环境变量');
    }
    
    // 获取访问令牌 - 使用正确的API地址
    const tokenResponse = await axios.post(
      'https://bots.qq.com/app/getAppAccessToken',
      {
        appId: appId,
        clientSecret: appSecret
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!tokenResponse.data || !tokenResponse.data.access_token) {
      throw new Error('获取访问令牌失败: ' + JSON.stringify(tokenResponse.data));
    }
    
    console.log('成功获取访问令牌，有效期:', tokenResponse.data.expires_in, '秒');
    return tokenResponse.data.access_token;
  } catch (error) {
    console.error('获取访问令牌错误:', error.message);
    if (error.response) {
      console.error('API响应:', error.response.data);
    }
    throw error;
  }
}

/**
 * 发送群聊消息
 * @param {string} groupOpenid - 群聊的openid
 * @param {object} message - 消息内容
 * @param {string} [eventId] - 前置收到的事件ID (可选)
 * @param {string} [msgId] - 前置收到的用户消息ID (可选)
 * @param {number} [msgSeq=1] - 回复消息的序号 (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendGroupMessage(groupOpenid, message, eventId = null, msgId = null, msgSeq = 1) {
  try {
    if (!groupOpenid) {
      throw new Error('缺少群聊openid参数');
    }
    
    if (!message || !message.content) {
      throw new Error('消息内容不能为空');
    }
    
    // 确保msg_type有效
    if (message.msg_type === undefined) {
      message.msg_type = 0; // 默认为文本消息
    }
    
    // 富媒体消息类型需要特殊处理
    if (message.msg_type === 7 && message.content.trim() === '') {
      message.content = ' '; // 富媒体消息content需要有值
    }
    
    // 获取访问令牌
    const accessToken = await getAccessToken();
    
    // 构建请求数据
    const requestData = { ...message };
    
    // 添加可选字段
    if (eventId) requestData.event_id = eventId;
    if (msgId) {
      requestData.msg_id = msgId;
      requestData.msg_seq = msgSeq;
    }
    
    // 发送消息请求
    const response = await axios.post(
      `${QQ_API_BASE_URL}/v2/groups/${groupOpenid}/messages`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `QQBot ${accessToken}`
        }
      }
    );
    
    console.log('群聊消息发送成功:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('发送群聊消息错误:', error.message);
    if (error.response) {
      console.error('API响应:', error.response.data);
      console.error('状态码:', error.response.status);
    }
    throw error;
  }
}

/**
 * 发送文本消息到群聊
 * @param {string} groupOpenid - 群聊的openid
 * @param {string} content - 文本内容
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendTextToGroup(groupOpenid, content, eventId = null, msgId = null) {
  return sendGroupMessage(
    groupOpenid,
    {
      content,
      msg_type: 0 // 文本消息
    },
    eventId,
    msgId
  );
}

/**
 * 发送Markdown消息到群聊
 * @param {string} groupOpenid - 群聊的openid
 * @param {string} content - 占位内容
 * @param {object} markdown - Markdown对象
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendMarkdownToGroup(groupOpenid, content, markdown, eventId = null, msgId = null) {
  return sendGroupMessage(
    groupOpenid,
    {
      content,
      msg_type: 2, // Markdown消息
      markdown
    },
    eventId,
    msgId
  );
}

/**
 * 发送富媒体消息到群聊
 * @param {string} groupOpenid - 群聊的openid
 * @param {object} media - 富媒体对象，包含file_info字段
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendMediaToGroup(groupOpenid, media, eventId = null, msgId = null) {
  if (!media || !media.file_info) {
    throw new Error('富媒体消息必须包含file_info字段');
  }
  
  return sendGroupMessage(
    groupOpenid,
    {
      content: ' ', // 富媒体消息需要内容，即使是空的
      msg_type: 7, // 富媒体消息
      media: {
        file_info: media.file_info
      }
    },
    eventId,
    msgId
  );
}

/**
 * 发送频道消息
 * @param {string} channelId - 频道ID
 * @param {object} messageData - 消息数据
 * @param {string} [eventId] - 前置收到的事件ID (可选)
 * @param {string} [msgId] - 前置收到的用户消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendChannelMessage(channelId, messageData, eventId = null, msgId = null) {
  try {
    if (!channelId) {
      throw new Error('缺少频道ID参数');
    }
    
    // 获取Bot Token - 频道消息可能需要直接使用Bot Token
    const botToken = process.env.QQ_BOT_TOKEN;
    const appId = process.env.QQ_BOT_APP_ID;
    
    if (!botToken) {
      throw new Error('未配置QQ_BOT_TOKEN环境变量');
    }
    
    // 构建请求数据
    const requestData = { ...messageData };
    
    // 添加被动消息字段
    if (eventId) requestData.event_id = eventId;
    if (msgId) requestData.msg_id = msgId;
    
    console.log('发送频道消息请求数据:', requestData);
    console.log('AppId:', appId);
    console.log('BotToken长度:', botToken.length);
    console.log('使用认证格式: Bot', `${appId}.${botToken}`);
    
    // 发送消息请求 - 频道消息使用Bot {app_id}.{bot_token}格式
    const response = await axios.post(
      `${QQ_API_BASE_URL}/channels/${channelId}/messages`,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${appId}.${botToken}`
        }
      }
    );
    
    console.log('频道消息发送成功:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('发送频道消息错误:', error.message);
    if (error.response) {
      console.error('API响应:', error.response.data);
      console.error('状态码:', error.response.status);
    }
    throw error;
  }
}

/**
 * 发送文本消息到频道
 * @param {string} channelId - 频道ID
 * @param {string} content - 文本内容
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendTextToChannel(channelId, content, eventId = null, msgId = null) {
  return sendChannelMessage(
    channelId,
    {
      content // 频道API直接使用content字段，不需要msg_type
    },
    eventId,
    msgId
  );
}

/**
 * 发送Markdown消息到频道
 * @param {string} channelId - 频道ID
 * @param {object} markdown - Markdown对象
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendMarkdownToChannel(channelId, markdown, eventId = null, msgId = null) {
  return sendChannelMessage(
    channelId,
    {
      markdown // 频道API直接使用markdown字段
    },
    eventId,
    msgId
  );
}

/**
 * 发送图片消息到频道
 * @param {string} channelId - 频道ID
 * @param {string} imageUrl - 图片URL
 * @param {string} [content] - 可选的文本内容
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendImageToChannel(channelId, imageUrl, content = '', eventId = null, msgId = null) {
  const messageData = {
    image: imageUrl // 频道API使用image字段直接传URL
  };
  
  // 如果有文本内容，添加到消息中
  if (content && content.trim()) {
    messageData.content = content;
  }
  
  return sendChannelMessage(channelId, messageData, eventId, msgId);
}

/**
 * 发送富媒体消息到频道（兼容旧接口）
 * @param {string} channelId - 频道ID
 * @param {object} media - 富媒体对象，包含file_info字段
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendMediaToChannel(channelId, media, eventId = null, msgId = null) {
  // 对于频道，我们需要将媒体转换为图片URL
  console.warn('sendMediaToChannel: 频道API建议使用sendImageToChannel');
  
  // 这里需要根据具体的media结构来处理
  // 暂时返回错误，建议使用新的图片发送接口
  throw new Error('频道发送富媒体请使用sendImageToChannel，传入图片URL');
}

module.exports = {
  sendGroupMessage,
  sendTextToGroup,
  sendMarkdownToGroup,
  sendMediaToGroup,
  sendChannelMessage,
  sendTextToChannel,
  sendMarkdownToChannel,
  sendImageToChannel,
  sendMediaToChannel
}; 