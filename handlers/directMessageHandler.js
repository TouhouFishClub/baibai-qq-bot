/**
 * 私信消息处理器
 * 处理QQ私信和频道私信消息
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendTextToC2C, sendTextToDirectMessage } = require('../services/messageService');

/**
 * 检查用户是否为管理员
 * @param {string} userId - 用户ID
 * @returns {boolean} 是否为管理员
 */
function isAdminUser(userId) {
  try {
    const configPath = path.join(__dirname, '../config/channel.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return config.admin_user === userId;
  } catch (error) {
    console.error('读取配置文件错误:', error);
    return false;
  }
}

/**
 * 获取群组配置
 * @returns {object} 配置对象
 */
function getChannelConfig() {
  try {
    const configPath = path.join(__dirname, '../config/channel.json');
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('读取配置文件错误:', error);
    return {};
  }
}

/**
 * 处理QQ私信消息 (C2C_MESSAGE_CREATE事件)
 */
async function handleC2CMessage(eventData) {
  try {
    console.log('处理QQ私信消息:', eventData);
    
    // 获取消息内容和相关信息
    const { content, author, id: messageId } = eventData;
    const userId = author.user_openid || author.union_openid;
    
    // 检查是否有文本内容
    if (!content) {
      console.log('收到无文本内容的QQ私信消息，忽略处理');
      return;
    }
    
    // 消息内容预处理
    const trimmedContent = content.trim();
    console.log('处理QQ私信消息内容:', trimmedContent);
    
    // 定义有效的命令前缀（不包含uni，uni作为默认处理）
    const validPrefixes = ['mbi', 'mbd', 'opt', 'meu'];
    
    // 检查消息是否以有效前缀开头（不区分大小写）
    let isValidCommand = false;
    let commandPrefix = '';
    let actualContent = '';
    
    // 处理以/开头的情况
    if (trimmedContent.startsWith('/')) {
      const contentWithoutSlash = trimmedContent.substring(1);
      for (const prefix of validPrefixes) {
        if (contentWithoutSlash.toLowerCase().startsWith(prefix.toLowerCase())) {
          isValidCommand = true;
          commandPrefix = prefix;
          actualContent = contentWithoutSlash.substring(prefix.length).trim();
          break;
        }
      }
    } else {
      // 处理直接以前缀开头的情况
      for (const prefix of validPrefixes) {
        if (trimmedContent.toLowerCase().startsWith(prefix.toLowerCase())) {
          isValidCommand = true;
          commandPrefix = prefix;
          actualContent = trimmedContent.substring(prefix.length).trim();
          break;
        }
      }
    }
    
    // 如果不是有效命令，则作为uni命令处理
    if (!isValidCommand) {
      commandPrefix = 'uni';
      actualContent = trimmedContent;
    }
    
    console.log(`QQ私信命令解析: 前缀=${commandPrefix}, 内容=${actualContent}`);
    
    // 检查uni命令是否包含管道符号，如果包含则需要管理员权限
    if (commandPrefix === 'uni' && actualContent.includes('|')) {
      if (!isAdminUser(userId)) {
        console.log(`用户 ${userId} 尝试使用管理员功能（uni包含|），但不是管理员`);
        await sendFilteredTextToC2C(userId, '此功能仅限管理员使用', null, messageId);
        return;
      }
      console.log(`管理员 ${userId} 使用包含|的uni命令`);
    }
    
    // 获取配置信息，用于调用openapi时获取group参数
    const config = getChannelConfig();
    const groupId = config.channel_exchange_group;
    
    // 调用openapi处理命令
    try {
      const apiResponse = await callOpenAPI(commandPrefix, actualContent, userId, groupId);
      
      // 发送回复 - 使用原始消息ID作为被动消息
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToC2C(apiResponse.data, userId, messageId);
      }
      // 如果没有返回结果，静默处理，不发送回复
    } catch (apiError) {
      console.error('调用OpenAPI错误:', apiError);
      await sendFilteredTextToC2C(userId, '处理请求时发生错误，请稍后再试', null, messageId);
    }
    
  } catch (error) {
    console.error('处理QQ私信消息错误:', error);
  }
}

/**
 * 处理频道私信消息 (DIRECT_MESSAGE_CREATE事件)
 */
async function handleDirectMessage(eventData) {
  try {
    console.log('处理频道私信消息:', eventData);
    
    // 获取消息内容和相关信息
    const { content, author, guild_id, id: messageId } = eventData;
    const userId = author.id;
    
    // 检查是否有文本内容
    if (!content) {
      console.log('收到无文本内容的频道私信消息，忽略处理');
      return;
    }
    
    // 消息内容预处理
    const trimmedContent = content.trim();
    console.log('处理频道私信消息内容:', trimmedContent);
    
    // 定义有效的命令前缀（不包含uni，uni作为默认处理）
    const validPrefixes = ['mbi', 'mbd', 'opt', 'meu'];
    
    // 检查消息是否以有效前缀开头（不区分大小写）
    let isValidCommand = false;
    let commandPrefix = '';
    let actualContent = '';
    
    // 处理以/开头的情况
    if (trimmedContent.startsWith('/')) {
      const contentWithoutSlash = trimmedContent.substring(1);
      for (const prefix of validPrefixes) {
        if (contentWithoutSlash.toLowerCase().startsWith(prefix.toLowerCase())) {
          isValidCommand = true;
          commandPrefix = prefix;
          actualContent = contentWithoutSlash.substring(prefix.length).trim();
          break;
        }
      }
    } else {
      // 处理直接以前缀开头的情况
      for (const prefix of validPrefixes) {
        if (trimmedContent.toLowerCase().startsWith(prefix.toLowerCase())) {
          isValidCommand = true;
          commandPrefix = prefix;
          actualContent = trimmedContent.substring(prefix.length).trim();
          break;
        }
      }
    }
    
    // 如果不是有效命令，则作为uni命令处理
    if (!isValidCommand) {
      commandPrefix = 'uni';
      actualContent = trimmedContent;
    }
    
    console.log(`频道私信命令解析: 前缀=${commandPrefix}, 内容=${actualContent}`);
    
    // 检查uni命令是否包含管道符号，如果包含则需要管理员权限
    if (commandPrefix === 'uni' && actualContent.includes('|')) {
      if (!isAdminUser(userId)) {
        console.log(`用户 ${userId} 尝试使用管理员功能（uni包含|），但不是管理员`);
        await sendTextToDirectMessage(guild_id, '此功能仅限管理员使用');
        return;
      }
      console.log(`管理员 ${userId} 使用包含|的uni命令`);
    }
    
    // 获取配置信息，用于调用openapi时获取group参数
    const config = getChannelConfig();
    const groupId = config.channel_exchange_group;
    
    // 调用openapi处理命令
    try {
      const apiResponse = await callOpenAPI(commandPrefix, actualContent, userId, groupId, author.username);
      
      // 发送回复 - 使用原始消息ID作为被动消息
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToDirectMessage(apiResponse.data, guild_id, messageId);
      }
      // 如果没有返回结果，静默处理，不发送回复
    } catch (apiError) {
      console.error('调用OpenAPI错误:', apiError);
      await sendTextToDirectMessage(guild_id, '处理请求时发生错误，请稍后再试', null, messageId);
    }
    
  } catch (error) {
    console.error('处理频道私信消息错误:', error);
  }
}

/**
 * 调用OpenAPI处理命令
 * @param {string} command - 命令类型
 * @param {string} content - 命令内容
 * @param {string} userId - 用户ID
 * @param {string} groupId - 群组ID
 * @param {string} [userName] - 用户名 (可选)
 * @returns {Promise<string>} API返回结果
 */
async function callOpenAPI(command, content, userId, groupId, userName = null) {
  try {
    if (!content) {
      console.log(`命令 ${command} 内容为空，不执行API调用`);
      return;
    }
    
    // 从环境变量中获取API基础URL
    const API_BASE_URL = process.env.API_BASE_URL;
    
    if (!API_BASE_URL) {
      throw new Error('未配置API_BASE_URL环境变量');
    }
    
    // 构建请求参数 - 对content进行URL编码，避免特殊字符造成问题
    const params = { 
      content: encodeURIComponent(content)
    };
    
    // 根据不同命令添加不同的参数
    switch (command) {
      case 'opt':
        params.from = userId;
        break;
      case 'meu':
        params.from = userId;
        params.groupid = groupId;
        break;
      case 'uni':
        params.group = groupId;
        params.from = userId;
        // 使用传入的用户名，如果没有则使用默认格式
        params.name = userName || `OPENAPI-${userId}`;
        // 默认群组名称为 OPENAPI-群组ID
        params.groupName = `OPENAPI-${groupId}`;
        break;
    }
    
    // 发送请求
    console.log(`发送API请求: ${API_BASE_URL}/openapi/${command}`, params);
    
    const response = await axios.get(`${API_BASE_URL}/openapi/${command}`, { params });
    
    console.log(`API响应结果:`, response.data);
    
    return response.data;
  } catch (error) {
    console.error(`API请求失败 (${command}):`, error.message);
    if (error.response) {
      console.error('响应数据:', error.response.data);
      console.error('响应状态:', error.response.status);
    }
    throw error;
  }
}

/**
 * 过滤掉CQ at代码（用于私信场景）
 * @param {string} message - 原始消息
 * @returns {string} 过滤后的消息
 */
function filterCQAtCodes(message) {
  if (!message) return '';
  
  // 过滤掉 [CQ:at,qq=xxx] 格式的at代码
  return message.replace(/\[CQ:at,qq=\d+\]/g, '').trim();
}

/**
 * 发送过滤后的文本消息到QQ私信
 * @param {string} userOpenid - 用户openid
 * @param {string} message - 原始消息
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 */
async function sendFilteredTextToC2C(userOpenid, message, eventId = null, msgId = null) {
  const filteredMessage = filterCQAtCodes(message);
  if (filteredMessage.trim()) {
    await sendTextToC2C(userOpenid, filteredMessage, eventId, msgId);
  }
  // 如果过滤后消息为空，则不发送
}

/**
 * 发送回复到QQ私信
 * @param {object} responseData - API响应数据
 * @param {string} userOpenid - 用户openid
 * @param {string} messageId - 用户消息ID
 */
async function sendReplyToC2C(responseData, userOpenid, messageId) {
  try {
    if (responseData.type === "image" && responseData.base64 && responseData.path) {
      // 处理图片消息 - QQ私信需要先上传获取file_info，类似群聊
      // 创建临时图片目录
      const tempImageDir = path.join(__dirname, '../public/temp_images');
      if (!fs.existsSync(tempImageDir)) {
        fs.mkdirSync(tempImageDir, { recursive: true });
      }
      
      // 获取文件名并处理中文字符
      const originalFileName = path.basename(responseData.path);
      const fileName = originalFileName;
      const imagePath = path.join(tempImageDir, fileName);
      
      // 解码Base64并保存图片
      const imageBuffer = Buffer.from(responseData.base64, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);
      
      console.log(`QQ私信图片已保存至: ${imagePath}`);
      
      // 获取绝对URL路径并进行URL编码
      const serverHost = process.env.SERVER_HOST || 'http://localhost:3000';
      const encodedFileName = encodeURIComponent(fileName);
      const imageUrl = `${serverHost}/temp_images/${encodedFileName}`;
      
      console.log(`QQ私信图片URL: ${imageUrl}`);
      
      // 调用QQ API上传图片，获取file_info
      const fileInfo = await uploadFileForC2C(userOpenid, imageUrl, 1); // 1表示图片类型
      
      // 如果有文本消息，使用图文混合消息
      if (responseData.message) {
        // 过滤CQ at代码后发送图文混合消息
        const filteredMessage = filterCQAtCodes(responseData.message);
        if (filteredMessage.trim()) {
          await sendMediaWithTextToC2C(userOpenid, fileInfo, filteredMessage, messageId);
        } else {
          // 如果文本被过滤完了，只发送图片
          const { sendC2CMessage } = require('../services/messageService');
          await sendC2CMessage(userOpenid, {
            content: ' ', // 富媒体消息content需要有值
            msg_type: 7,   // 富媒体消息类型
            media: {
              file_info: fileInfo
            }
          }, null, messageId);
        }
      } else {
        // 只有图片，没有文本
        const { sendC2CMessage } = require('../services/messageService');
        await sendC2CMessage(userOpenid, {
          content: ' ', // 富媒体消息content需要有值
          msg_type: 7,   // 富媒体消息类型
          media: {
            file_info: fileInfo
          }
        }, null, messageId);
      }
      
    } else if (responseData.type === "text" && responseData.message) {
      // 处理文本消息 - 过滤掉CQ at代码
      const filteredMessage = filterCQAtCodes(responseData.message);
      if (filteredMessage.trim()) {
        await sendTextToC2C(userOpenid, filteredMessage, null, messageId);
      }
      // 如果过滤后消息为空，则不发送
    }
  } catch (error) {
    console.error('发送QQ私信回复失败:', error);
  }
}

/**
 * 发送回复到频道私信
 * @param {object} responseData - API响应数据
 * @param {string} guildId - 频道服务器ID
 * @param {string} messageId - 用户消息ID
 */
async function sendReplyToDirectMessage(responseData, guildId, messageId) {
  try {
    if (responseData.type === "image" && responseData.base64 && responseData.path) {
      // 处理图片消息 - 频道私信直接使用图片URL，类似频道
      // 创建临时图片目录
      const tempImageDir = path.join(__dirname, '../public/temp_images');
      if (!fs.existsSync(tempImageDir)) {
        fs.mkdirSync(tempImageDir, { recursive: true });
      }
      
      // 获取文件名并处理中文字符
      const originalFileName = path.basename(responseData.path);
      const fileName = originalFileName;
      const imagePath = path.join(tempImageDir, fileName);
      
      // 解码Base64并保存图片
      const imageBuffer = Buffer.from(responseData.base64, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);
      
      console.log(`频道私信图片已保存至: ${imagePath}`);
      
      // 获取绝对URL路径并进行URL编码
      const serverHost = process.env.SERVER_HOST || 'http://localhost:3000';
      const encodedFileName = encodeURIComponent(fileName);
      const imageUrl = `${serverHost}/temp_images/${encodedFileName}`;
      
      console.log(`频道私信图片URL: ${imageUrl}`);
      
      // 频道私信使用类似频道的方式发送图片
      if (responseData.message) {
        // 过滤CQ at代码后发送文本和图片
        const filteredMessage = filterCQAtCodes(responseData.message);
        if (filteredMessage.trim()) {
          console.log('频道私信：先发送文本消息，然后发送图片');
          // 先发送过滤后的文本
          await sendTextToDirectMessage(guildId, filteredMessage, null, messageId);
        }
        // 然后尝试发送图片
        try {
          await sendImageToDirectMessage(guildId, imageUrl, '', null, messageId);
        } catch (imgError) {
          console.error('发送频道私信图片失败:', imgError.message);
        }
      } else {
        // 只发送图片
        await sendImageToDirectMessage(guildId, imageUrl, '', null, messageId);
      }
      
    } else if (responseData.type === "text" && responseData.message) {
      // 处理文本消息 - 过滤掉CQ at代码
      const filteredMessage = filterCQAtCodes(responseData.message);
      if (filteredMessage.trim()) {
        await sendTextToDirectMessage(guildId, filteredMessage, null, messageId);
      }
      // 如果过滤后消息为空，则不发送
    }
  } catch (error) {
    console.error('发送频道私信回复失败:', error);
  }
}

/**
 * 上传文件获取file_info (用于QQ私信)
 * @param {string} userOpenid - 用户的openid
 * @param {string} url - 文件URL
 * @param {number} fileType - 文件类型（1:图片, 2:视频, 3:语音, 4:文件）
 * @returns {Promise<string>} file_info
 */
async function uploadFileForC2C(userOpenid, url, fileType) {
  try {
    const QQ_API_BASE_URL = 'https://api.sgroup.qq.com';
    
    // 获取访问令牌
    const { getAccessToken } = require('../services/messageService');
    const accessToken = await getAccessToken();
    
    // 构建上传文件请求 - QQ私信使用用户API
    const response = await axios.post(
      `${QQ_API_BASE_URL}/v2/users/${userOpenid}/files`,
      {
        file_type: fileType,
        url: url,
        srv_send_msg: false // 不直接发送，仅获取file_info
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `QQBot ${accessToken}`
        }
      }
    );
    
    if (!response.data || !response.data.file_info) {
      throw new Error('上传QQ私信文件失败，未获取到file_info: ' + JSON.stringify(response.data));
    }
    
    console.log('QQ私信文件上传成功，获取到file_info:', response.data);
    return response.data.file_info;
    
  } catch (error) {
    console.error('上传QQ私信文件失败:', error.message);
    if (error.response) {
      console.error('API响应:', error.response.data);
      console.error('状态码:', error.response.status);
    }
    throw error;
  }
}

/**
 * 发送图文混合消息到QQ私信
 * @param {string} userOpenid - 用户的openid 
 * @param {string} fileInfo - 文件信息
 * @param {string} text - 文本内容
 * @param {string} messageId - 回复的消息ID
 */
async function sendMediaWithTextToC2C(userOpenid, fileInfo, text, messageId) {
  try {
    const { sendC2CMessage } = require('../services/messageService');
    
    // 构建图文混合消息
    await sendC2CMessage(userOpenid, {
      content: text, // 文本内容放在content中
      msg_type: 7,   // 富媒体消息类型
      media: {
        file_info: fileInfo
      }
    }, null, messageId);
    
    console.log('QQ私信图文混合消息发送成功');
  } catch (error) {
    console.error('发送QQ私信图文混合消息失败:', error.message);
    throw error;
  }
}

/**
 * 发送图片消息到频道私信
 * @param {string} guildId - 频道服务器ID
 * @param {string} imageUrl - 图片URL
 * @param {string} [content] - 可选的文本内容
 * @param {string} [eventId] - 前置事件ID (可选)
 * @param {string} [msgId] - 前置消息ID (可选)
 * @returns {Promise<object>} 发送结果
 */
async function sendImageToDirectMessage(guildId, imageUrl, content = '', eventId = null, msgId = null) {
  const { sendDirectMessage } = require('../services/messageService');
  
  const messageData = {
    image: imageUrl // 频道私信API使用image字段直接传URL，类似频道
  };
  
  // 如果有文本内容，添加到消息中
  if (content && content.trim()) {
    messageData.content = content;
  }
  
  return sendDirectMessage(guildId, messageData, eventId, msgId);
}

module.exports = {
  handleC2CMessage,
  handleDirectMessage
};
