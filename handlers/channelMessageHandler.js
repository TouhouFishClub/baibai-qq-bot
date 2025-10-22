/**
 * 频道消息处理器
 * 处理频道中@机器人的消息 (AT_MESSAGE_CREATE事件)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendTextToChannel, sendImageToChannel } = require('../services/messageService');
const { processBase64Image, getImageInfo } = require('../utils/imageProcessor');
const logger = require('../utils/logger');

/**
 * 处理频道@机器人消息
 */
async function handleChannelAtMessage(eventData, eventType = null) {
  try {
    // 获取消息内容和相关信息
    // 注意：频道消息的数据结构与群聊消息不同
    const { content, author, member, channel_id, guild_id, id: messageId, attachments } = eventData;
    
    // 获取用户名称用于日志
    const userName = (member && member.nick) || author.username || '未知用户';
    
    // 检查是否有文本内容，如果没有则直接忽略
    if (!content) {
      logger.debug('收到无文本内容的消息，忽略处理');
      return;
    }
    
    // 消息内容预处理（去除@机器人标记和前后空格）
    // AT_MESSAGE_CREATE格式：<@!927784118400615010> /meu 释魂 手里剑
    // MESSAGE_CREATE格式：meu 释魂 手里剑
    let trimmedContent = content.trim();
    
    // 检查是否包含@机器人标记
    const containsAtBot = /<@!\d+>/.test(trimmedContent);
    
    // 如果是MESSAGE_CREATE事件且包含@机器人标记，则跳过处理
    // 因为这种情况下也会收到AT_MESSAGE_CREATE事件，避免重复处理
    if (eventType === 'MESSAGE_CREATE' && containsAtBot) {
      logger.debug('MESSAGE_CREATE事件包含@机器人标记，跳过处理');
      return;
    }
    
    // 移除@机器人的标记（格式：<@!机器人ID>），如果存在的话
    trimmedContent = trimmedContent.replace(/<@!\d+>\s*/g, '').trim();
    
    // 记录收到的消息
    logger.message('频道', userName, trimmedContent);
    
    // 定义有效的命令前缀（不包含uni，uni作为默认处理）
    const validPrefixes = ['mbi', 'mbd', 'opt', 'meu'];
    
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
      // 命令处理日志将在API调用后显示
      
      // 构建API请求
      const apiResponse = await callOpenAPI(commandPrefix, actualContent, author, member, guild_id);
      
      // 发送回复
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToChannel(apiResponse.data, channel_id, messageId);
      }
    } else {
      // 使用uni接口处理未匹配命令
      
      // 检查是否包含管道符号，如果包含则需要管理员权限
      if (trimmedContent.includes('|')) {
        const channelConfig = getChannelConfig();
        const adminUserId = channelConfig.admin_user;
        
        if (author.id !== adminUserId) {
          logger.warn(`非管理员用户尝试使用管理员功能`);
          await sendTextToChannel(
            channel_id, 
            '此功能仅限管理员使用',
            null,
            messageId
          );
          return;
        }
        
        logger.debug(`管理员使用管理功能`);
      }
      
      // 未匹配到特定命令的消息都通过uni接口处理
      const apiResponse = await callOpenAPI('uni', trimmedContent, author, member, guild_id);
      
      // 发送回复
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToChannel(apiResponse.data, channel_id, messageId);
      }
    }
  } catch (error) {
    logger.error('处理频道@消息失败', error.message);
  }
}

/**
 * 发送回复到频道
 * @param {object} responseData - API响应数据
 * @param {string} channelId - 频道ID
 * @param {string} messageId - 用户消息ID
 */
async function sendReplyToChannel(responseData, channelId, messageId) {
  try {
    if (responseData.type === "image" && responseData.base64 && responseData.path) {
      // 处理图片消息
      // 创建临时图片目录
      const tempImageDir = path.join(__dirname, '../public/temp_images');
      if (!fs.existsSync(tempImageDir)) {
        fs.mkdirSync(tempImageDir, { recursive: true });
      }
      
      // 获取文件名并处理中文字符
      const originalFileName = path.basename(responseData.path);
      const fileName = originalFileName;
      const imagePath = path.join(tempImageDir, fileName);
      
      // 使用图片处理器处理base64图片（包含压缩）
      const processSuccess = await processBase64Image(responseData.base64, imagePath);
      
      if (!processSuccess) {
        logger.error('图片处理失败，跳过发送');
        return;
      }
      
      // 获取绝对URL路径并进行URL编码
      const serverHost = process.env.SERVER_HOST || 'http://localhost:3000';
      const encodedFileName = encodeURIComponent(fileName);
      const imageUrl = `${serverHost}/temp_images/${encodedFileName}`;
      
      // 暂时先发送文本消息，调试认证问题
      if (responseData.message) {
        // 先发送文本消息，然后发送图片
        // 转换CQ码格式
        const convertedMessage = convertCQCodeToQQFormat(responseData.message);
        await sendTextToChannel(channelId, convertedMessage, null, messageId);
        // 然后尝试发送图片
        try {
          await sendImageToChannel(channelId, imageUrl, '', null, messageId);
        } catch (imgError) {
          logger.error('发送图片失败，但文本已发送', imgError.message);
        }
      } else {
        // 只发送图片
        await sendImageToChannel(channelId, imageUrl, '', null, messageId);
      }
      
    } else if (responseData.type === "text" && responseData.message) {
      // 处理文本消息
      // 转换CQ码格式
      const convertedMessage = convertCQCodeToQQFormat(responseData.message);
      await sendTextToChannel(channelId, convertedMessage, null, messageId);
    }
  } catch (error) {
    logger.error('发送频道回复失败', error.message);
  }
}

// 注意：频道API不需要先上传文件获取file_info，直接使用图片URL即可

/**
 * 获取访问令牌
 * @returns {Promise<string>} 访问令牌
 */
async function getAccessToken() {
  const axios = require('axios');
  
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
    
    logger.debug(`获取访问令牌成功，有效期: ${tokenResponse.data.expires_in}秒`);
    return tokenResponse.data.access_token;
  } catch (error) {
    logger.error('获取访问令牌失败', error.message);
    if (error.response) {
      logger.debug('API响应详情', error.response.data);
    }
    throw error;
  }
}

/**
 * 发送图文混合消息到频道（已废弃，请使用sendImageToChannel）
 * @param {string} channelId - 频道ID  
 * @param {string} imageUrl - 图片URL（不再是fileInfo）
 * @param {string} text - 文本内容
 * @param {string} messageId - 回复的消息ID
 */
async function sendMediaWithTextToChannel(channelId, imageUrl, text, messageId) {
  logger.warn('sendMediaWithTextToChannel已废弃，建议使用sendImageToChannel');
  
  // 直接使用新的图片发送接口
  const { sendImageToChannel } = require('../services/messageService');
  return await sendImageToChannel(channelId, imageUrl, text, null, messageId);
}

/**
 * 将CQ码格式转换为QQ机器人API格式
 * @param {string} message - 包含CQ码的消息
 * @returns {string} 转换后的消息
 */
function convertCQCodeToQQFormat(message) {
  if (!message || typeof message !== 'string') {
    return message;
  }
  
  // 将 [CQ:at,qq=用户ID] 转换为 <@!用户ID>
  // 使用 <@!user_id> 格式（带感叹号的版本）
  const atRegex = /\[CQ:at,qq=(\d+)\]/g;
  const convertedMessage = message.replace(atRegex, '<@!$1>');
  
  if (convertedMessage !== message) {
    logger.debug(`CQ码转换: "${message}" -> "${convertedMessage}"`);
  }
  
  return convertedMessage;
}

/**
 * 获取频道配置
 * @returns {object} 频道配置对象
 */
function getChannelConfig() {
  try {
    const configPath = path.join(__dirname, '../config/channel.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    logger.error('读取频道配置文件失败', error.message);
    // 返回默认配置
    return {
      channel_exchange_group: '772195107'
    };
  }
}

/**
 * 调用外部OpenAPI接口
 * @param {string} command - 命令类型 (mbi, mbd, opt等)
 * @param {string} content - 实际内容
 * @param {object} author - 用户信息对象
 * @param {object} member - 成员信息对象
 * @param {string} guildId - 服务器ID（频道所属的服务器）
 */
async function callOpenAPI(command, content, author, member, guildId) {
  try {
    if (!content) {
      logger.warn(`命令 ${command} 内容为空，跳过API调用`);
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
        params.from = author.id;
        break;
      case 'meu':
        params.from = author.id;
        params.groupid = guildId; // 对于频道，使用guild_id作为groupid
        break;
      case 'uni':
        // 对于频道模式，使用channel_exchange_group作为group参数
        const channelConfig = getChannelConfig();
        params.group = channelConfig.channel_exchange_group;
        params.from = author.id;
        // 在频道模式下，使用 username || member.nick 作为用户名
        const userName = author.username || (member && member.nick) || `OPENAPI-${author.id}`;
        params.name = userName;
        logger.debug(`频道模式用户名设置: 最终使用: "${userName}"`);
        // 默认群组名称为 OPENAPI-群组ID
        params.groupName = `OPENAPI-${channelConfig.channel_exchange_group}`;
        break;
    }
    
    // 发送请求
    const response = await axios.get(`${API_BASE_URL}/openapi/${command}`, { params });
    
    // 记录发送的回复
    if (response.data?.status === 'ok' && response.data?.data) {
      const responseData = response.data.data;
      if (responseData.type === 'image') {
        // 截取base64的前20个字符作为标识
        const base64Preview = responseData.base64 ? responseData.base64.substring(0, 20) + '...' : '';
        logger.reply('频道', `[图片:base64=${base64Preview},path=${responseData.path}]`);
        if (responseData.message) {
          logger.reply('频道', responseData.message);
        }
      } else if (responseData.type === 'text') {
        logger.reply('频道', responseData.message);
      }
    }
    
    return response.data;
  } catch (error) {
    logger.error(`API请求失败 (${command})`, error.message);
    if (error.response) {
      logger.debug('API响应详情', { status: error.response.status, data: error.response.data });
    }
  }
}

module.exports = {
  handleChannelAtMessage
};
