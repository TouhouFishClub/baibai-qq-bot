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
    
    // 获取访问令牌
    const tokenResponse = await axios.post(
      `${QQ_API_BASE_URL}/token`, 
      qs.stringify({
        grant_type: 'client_credentials',
        client_id: appId,
        client_secret: appSecret
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (!tokenResponse.data || !tokenResponse.data.access_token) {
      throw new Error('获取访问令牌失败: ' + JSON.stringify(tokenResponse.data));
    }
    
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
          'Authorization': `Bearer ${accessToken}`
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

module.exports = {
  sendGroupMessage,
  sendTextToGroup,
  sendMarkdownToGroup,
  sendMediaToGroup
}; 