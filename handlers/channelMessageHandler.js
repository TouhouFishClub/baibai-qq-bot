/**
 * 频道消息处理器
 * 处理频道中@机器人的消息 (AT_MESSAGE_CREATE事件)
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendTextToChannel, sendImageToChannel } = require('../services/messageService');

/**
 * 处理频道@机器人消息
 */
async function handleChannelAtMessage(eventData) {
  try {
    console.log('处理频道中@机器人消息:', eventData);
    
    // 获取消息内容和相关信息
    // 注意：频道消息的数据结构与群聊消息不同
    const { content, author, channel_id, guild_id, id: messageId } = eventData;
    
    // 消息内容预处理（去除@机器人标记和前后空格）
    // AT_MESSAGE_CREATE格式：<@!927784118400615010> /meu 释魂 手里剑
    // MESSAGE_CREATE格式：meu 释魂 手里剑
    let trimmedContent = content.trim();
    
    // 移除@机器人的标记（格式：<@!机器人ID>），如果存在的话
    trimmedContent = trimmedContent.replace(/<@!\d+>\s*/g, '').trim();
    
    console.log('处理频道消息内容:', trimmedContent);
    
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
      const apiResponse = await callOpenAPI(commandPrefix, actualContent, author.id, guild_id);
      
      // 发送回复
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToChannel(apiResponse.data, channel_id, messageId);
      }
    } else {
      console.log('收到非命令消息，忽略处理');
      // 对于非命令消息，不发送任何回复，直接忽略
    }
  } catch (error) {
    console.error('处理频道@消息失败:', error);
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
      
      // 解码Base64并保存图片
      const imageBuffer = Buffer.from(responseData.base64, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);
      
      console.log(`图片已保存至: ${imagePath}`);
      
      // 获取绝对URL路径并进行URL编码
      const serverHost = process.env.SERVER_HOST || 'http://localhost:3000';
      const encodedFileName = encodeURIComponent(fileName);
      const imageUrl = `${serverHost}/temp_images/${encodedFileName}`;
      
      console.log(`原始文件名: ${originalFileName}`);
      console.log(`编码后URL: ${imageUrl}`);
      
      // 暂时先发送文本消息，调试认证问题
      if (responseData.message) {
        console.log('临时方案：先发送文本消息，然后发送图片');
        await sendTextToChannel(channelId, responseData.message, null, messageId);
        // 然后尝试发送图片
        try {
          await sendImageToChannel(channelId, imageUrl, '', null, messageId);
        } catch (imgError) {
          console.error('发送图片失败，但文本已发送:', imgError.message);
        }
      } else {
        // 只发送图片
        await sendImageToChannel(channelId, imageUrl, '', null, messageId);
      }
      
    } else if (responseData.type === "text" && responseData.message) {
      // 处理文本消息
      await sendTextToChannel(channelId, responseData.message, null, messageId);
    }
  } catch (error) {
    console.error('发送频道回复失败:', error);
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
 * 发送图文混合消息到频道（已废弃，请使用sendImageToChannel）
 * @param {string} channelId - 频道ID  
 * @param {string} imageUrl - 图片URL（不再是fileInfo）
 * @param {string} text - 文本内容
 * @param {string} messageId - 回复的消息ID
 */
async function sendMediaWithTextToChannel(channelId, imageUrl, text, messageId) {
  console.warn('sendMediaWithTextToChannel已废弃，建议使用sendImageToChannel');
  
  // 直接使用新的图片发送接口
  const { sendImageToChannel } = require('../services/messageService');
  return await sendImageToChannel(channelId, imageUrl, text, null, messageId);
}

/**
 * 调用外部OpenAPI接口
 * @param {string} command - 命令类型 (mbi, mbd, opt等)
 * @param {string} content - 实际内容
 * @param {string} userId - 用户ID
 * @param {string} guildId - 服务器ID（频道所属的服务器）
 */
async function callOpenAPI(command, content, userId, guildId) {
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
      case 'mbtv':
      case 'mbcd':
        params.from = userId;
        break;
      case 'meu':
        params.from = userId;
        params.groupid = guildId; // 对于频道，使用guild_id作为groupid
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
  }
}

module.exports = {
  handleChannelAtMessage
};
