/**
 * 群消息处理器
 * 处理群中@机器人的消息
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendTextToGroup, sendMediaToGroup } = require('../services/messageService');
const { processBase64Image, getImageInfo } = require('../utils/imageProcessor');
const logger = require('../utils/logger');

/**
 * 处理@机器人消息
 */
async function handleGroupAtMessage(eventData) {
  try {
    logger.debug('处理群中@机器人消息', { groupId: eventData.group_id, content: eventData.content });
    
    // 获取消息内容和相关信息
    const { content, author, group_id, group_openid, id: messageId } = eventData;
    
    // 消息内容预处理（去除前后空格）
    const trimmedContent = content.trim();
    
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
      logger.command(commandPrefix, actualContent);
      
      // 构建API请求
      const apiResponse = await callOpenAPI(commandPrefix, actualContent, author.id, group_id);
      
      // 发送回复
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToGroup(apiResponse.data, group_openid, messageId);
      }
    } else {
      logger.debug('使用uni接口处理未匹配命令');
      
      // 未匹配到特定命令的消息都通过uni接口处理
      const apiResponse = await callOpenAPI('uni', trimmedContent, author.id, group_id);
      
      // 发送回复
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToGroup(apiResponse.data, group_openid, messageId);
      }
    }
  } catch (error) {
    logger.error('处理群聊@消息失败', error.message);
  }
}

/**
 * 发送回复到群聊
 * @param {object} responseData - API响应数据
 * @param {string} groupOpenid - 群聊openid
 * @param {string} messageId - 用户消息ID
 */
async function sendReplyToGroup(responseData, groupOpenid, messageId) {
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
      
      // 显示图片信息
      const imageInfo = await getImageInfo(imagePath);
      if (imageInfo) {
        logger.info(`图片处理完成: ${imageInfo.width}x${imageInfo.height}, ${imageInfo.format}, ${imageInfo.sizeMB}MB`);
      }
      
      // 获取绝对URL路径并进行URL编码
      const serverHost = process.env.SERVER_HOST || 'http://localhost:3000';
      const encodedFileName = encodeURIComponent(fileName);
      const imageUrl = `${serverHost}/temp_images/${encodedFileName}`;
      
      // 调用QQ API上传图片，获取file_info
      const fileInfo = await uploadFileForGroup(groupOpenid, imageUrl, 1); // 1表示图片类型
      
      // 如果有文本消息，使用图文混合消息
      if (responseData.message) {
        // 构建图文混合消息
        await sendMediaWithText(groupOpenid, fileInfo, responseData.message, messageId);
      } else {
        // 只有图片，没有文本
        await sendMediaToGroup(groupOpenid, { file_info: fileInfo }, null, messageId);
      }
      
    } else if (responseData.type === "text" && responseData.message) {
      // 处理文本消息
      await sendTextToGroup(groupOpenid, responseData.message, null, messageId);
    }
  } catch (error) {
    logger.error('发送群聊回复失败', error.message);
  }
}

/**
 * 上传文件获取file_info
 * @param {string} groupOpenid - 群聊的openid
 * @param {string} url - 文件URL
 * @param {number} fileType - 文件类型（1:图片, 2:视频, 3:语音, 4:文件）
 * @returns {Promise<string>} file_info
 */
async function uploadFileForGroup(groupOpenid, url, fileType) {
  try {
    const axios = require('axios');
    const QQ_API_BASE_URL = 'https://api.sgroup.qq.com';
    
    // 获取访问令牌
    const accessToken = await getAccessToken();
    
    // 构建上传文件请求
    const response = await axios.post(
      `${QQ_API_BASE_URL}/v2/groups/${groupOpenid}/files`,
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
      throw new Error('上传文件失败，未获取到file_info');
    }
    
    logger.info('文件上传成功');
    return response.data.file_info;
    
  } catch (error) {
    logger.error('上传文件失败', error.message);
    if (error.response) {
      logger.debug('API响应详情', { status: error.response.status, data: error.response.data });
    }
    throw error;
  }
}

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
 * 发送图文混合消息
 * @param {string} groupOpenid - 群聊的openid 
 * @param {string} fileInfo - 文件信息
 * @param {string} text - 文本内容
 * @param {string} messageId - 回复的消息ID
 */
async function sendMediaWithText(groupOpenid, fileInfo, text, messageId) {
  try {
    const axios = require('axios');
    const QQ_API_BASE_URL = 'https://api.sgroup.qq.com';
    
    // 获取访问令牌
    const accessToken = await getAccessToken();
    
    // 构建图文混合消息
    const message = {
      content: text, // 文本内容放在content中
      msg_type: 7,   // 富媒体消息类型
      media: {
        file_info: fileInfo
      },
      msg_id: messageId
    };
    
    // 发送消息请求
    const response = await axios.post(
      `${QQ_API_BASE_URL}/v2/groups/${groupOpenid}/messages`,
      message,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `QQBot ${accessToken}`
        }
      }
    );
    
    logger.info('图文混合消息发送成功');
    return response.data;
  } catch (error) {
    logger.error('发送图文混合消息失败', error.message);
    if (error.response) {
      logger.debug('API响应详情', { status: error.response.status, data: error.response.data });
    }
    throw error;
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
        params.from = userId;
        break;
      case 'meu':
        params.from = userId;
        params.groupid = groupId;
        break;
      case 'uni':
        params.group = groupId;
        params.from = userId;
        // 默认用户名为 OPENAPI-用户ID
        params.name = `OPENAPI-${userId}`;
        // 默认群组名称为 OPENAPI-群组ID
        params.groupName = `OPENAPI-${groupId}`;
        break;
    }
    
    // 发送请求
    logger.api('GET', `/openapi/${command}`);
    
    const response = await axios.get(`${API_BASE_URL}/openapi/${command}`, { params });
    
    const result = response.data?.status === 'ok' ? '成功' : '失败';
    logger.command(command, content, result);
    
    return response.data;
  } catch (error) {
    logger.error(`API请求失败 (${command})`, error.message);
    logger.command(command, content, '失败');
    if (error.response) {
      logger.debug('API响应详情', { status: error.response.status, data: error.response.data });
    }
  }
}

module.exports = {
  handleGroupAtMessage
}; 