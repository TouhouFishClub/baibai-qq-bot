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
    
    // 检查某些功能是否需要管理员权限
    const requiresAdmin = ['mbd', 'opt'].includes(commandPrefix);
    if (requiresAdmin && !isAdminUser(userId)) {
      await sendTextToC2C(userId, '此功能仅限管理员使用');
      return;
    }
    
    // 获取配置信息，用于调用openapi时获取group参数
    const config = getChannelConfig();
    const groupId = config.channel_exchange_group;
    
    // 调用openapi处理命令
    try {
      const result = await callOpenAPI(commandPrefix, actualContent, userId, groupId);
      
      if (result && result.trim()) {
        await sendTextToC2C(userId, result);
      } else {
        await sendTextToC2C(userId, '处理完成，但没有返回结果');
      }
    } catch (apiError) {
      console.error('调用OpenAPI错误:', apiError);
      await sendTextToC2C(userId, '处理请求时发生错误，请稍后再试');
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
    
    // 检查某些功能是否需要管理员权限
    const requiresAdmin = ['mbd', 'opt'].includes(commandPrefix);
    if (requiresAdmin && !isAdminUser(userId)) {
      await sendTextToDirectMessage(guild_id, '此功能仅限管理员使用');
      return;
    }
    
    // 获取配置信息，用于调用openapi时获取group参数
    const config = getChannelConfig();
    const groupId = config.channel_exchange_group;
    
    // 调用openapi处理命令
    try {
      const result = await callOpenAPI(commandPrefix, actualContent, userId, groupId);
      
      if (result && result.trim()) {
        await sendTextToDirectMessage(guild_id, result);
      } else {
        await sendTextToDirectMessage(guild_id, '处理完成，但没有返回结果');
      }
    } catch (apiError) {
      console.error('调用OpenAPI错误:', apiError);
      await sendTextToDirectMessage(guild_id, '处理请求时发生错误，请稍后再试');
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
 * @returns {Promise<string>} API返回结果
 */
async function callOpenAPI(command, content, userId, groupId) {
  try {
    console.log(`调用OpenAPI: command=${command}, content=${content}, userId=${userId}, groupId=${groupId}`);
    
    // 构建请求URL
    const baseUrl = process.env.OPENAPI_BASE_URL || 'http://localhost:3000';
    const url = `${baseUrl}/api/openapi`;
    
    // 构建请求数据
    const requestData = {
      command: command,
      content: content,
      user: userId,
      group: groupId
    };
    
    console.log('OpenAPI请求数据:', requestData);
    
    // 发送请求
    const response = await axios.post(url, requestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30秒超时
    });
    
    console.log('OpenAPI响应:', response.data);
    
    // 返回结果
    if (response.data && typeof response.data === 'object') {
      return response.data.result || response.data.message || JSON.stringify(response.data);
    } else {
      return response.data || '';
    }
    
  } catch (error) {
    console.error('OpenAPI调用错误:', error.message);
    if (error.response) {
      console.error('API响应状态:', error.response.status);
      console.error('API响应数据:', error.response.data);
    }
    throw error;
  }
}

module.exports = {
  handleC2CMessage,
  handleDirectMessage
};
