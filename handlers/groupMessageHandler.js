/**
 * 群消息处理器
 * 处理群中@机器人的消息
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

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
    
    // 从环境变量中获取API基础URL
    const API_BASE_URL = process.env.API_BASE_URL;
    
    if (!API_BASE_URL) {
      throw new Error('未配置API_BASE_URL环境变量');
    }
    
    // 构建请求参数
    const params = { content };
    
    // 根据不同命令添加不同的参数
    switch (command) {
      case 'opt':
      case 'mbtv':
      case 'mbcd':
        params.from = userId;
        break;
      case 'meu':
        params.from = userId;
        params.groupid = groupId;
        break;
    }
    
    // 发送请求
    console.log(`发送API请求: ${API_BASE_URL}/openapi/${command}`, params);
    
    const response = await axios.get(`${API_BASE_URL}/openapi/${command}`, { params });
    
    console.log(`API响应结果:`, response.data);
    
    // 处理API响应
    if (response.data && response.data.status === "ok" && response.data.data) {
      const responseData = response.data.data;
      
      // 如果返回类型是图片，处理图片数据
      if (responseData.type === "image" && responseData.base64 && responseData.path) {
        // 创建临时图片目录
        const tempImageDir = path.join(__dirname, '../public/temp_images');
        if (!fs.existsSync(tempImageDir)) {
          fs.mkdirSync(tempImageDir, { recursive: true });
        }
        
        // 获取文件名
        const fileName = path.basename(responseData.path);
        const imagePath = path.join(tempImageDir, fileName);
        
        // 解码Base64并保存图片
        const imageBuffer = Buffer.from(responseData.base64, 'base64');
        fs.writeFileSync(imagePath, imageBuffer);
        
        console.log(`图片已保存至: ${imagePath}`);
        
        // 构建图片URL
        const imageUrl = `/temp_images/${fileName}`;
        
        // 这里可以添加处理图片URL并发送消息到群的逻辑
        console.log(`图片访问URL: ${imageUrl}`);
        console.log(`图片消息内容: ${responseData.message}`);
      } else if (responseData.type === "text" && responseData.message) {
        // 处理文本消息
        console.log(`文本消息内容: ${responseData.message}`);
      }
    }
    
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