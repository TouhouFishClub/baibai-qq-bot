/**
 * 群消息处理器
 * 处理群中@机器人的消息
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendTextToGroup, sendMediaToGroup } = require('../services/messageService');

/**
 * 处理@机器人消息
 */
async function handleGroupAtMessage(eventData) {
  try {
    console.log('处理群中@机器人消息:', eventData);
    
    // 获取消息内容和相关信息
    const { content, author, group_id, group_openid, id: messageId } = eventData;
    
    // 消息内容预处理（去除前后空格）
    const trimmedContent = content.trim();
    
    // 定义有效的命令前缀
    const validPrefixes = ['mbi', 'mbd', 'opt', 'meu', 'uni'];
    
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
      const apiResponse = await callOpenAPI(commandPrefix, actualContent, author.id, group_id);
      
      // 发送回复
      if (apiResponse && apiResponse.status === "ok" && apiResponse.data) {
        await sendReplyToGroup(apiResponse.data, group_openid, messageId);
      }
    } else {
      console.log('收到非命令消息，忽略处理');
      // 对非命令消息的回复
      await sendTextToGroup(
        group_openid, 
        '我只能响应特定命令，可用的命令有：mbi, mbd, opt, meu, uni',
        null,
        messageId
      );
    }
  } catch (error) {
    console.error('处理群聊@消息失败:', error);
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
    console.error('发送群聊回复失败:', error);
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
      throw new Error('上传文件失败，未获取到file_info: ' + JSON.stringify(response.data));
    }
    
    console.log('文件上传成功，获取到file_info:', response.data);
    return response.data.file_info;
    
  } catch (error) {
    console.error('上传文件失败:', error.message);
    if (error.response) {
      console.error('API响应:', error.response.data);
      console.error('状态码:', error.response.status);
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
    
    console.log('图文混合消息发送成功:', response.data);
    return response.data;
  } catch (error) {
    console.error('发送图文混合消息失败:', error.message);
    if (error.response) {
      console.error('API响应:', error.response.data);
      console.error('状态码:', error.response.status);
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
        // 默认用户名为 OPENAPI-用户ID
        params.name = `OPENAPI-${userId}`;
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
  }
}

module.exports = {
  handleGroupAtMessage
}; 