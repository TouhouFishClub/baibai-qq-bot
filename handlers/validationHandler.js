/**
 * 回调地址验证处理器
 * 处理QQ机器人的回调地址验证请求
 */

const { generateSignature } = require('../utils/signature');

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

module.exports = {
  handleValidation
}; 