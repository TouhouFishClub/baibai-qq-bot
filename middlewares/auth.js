/**
 * 认证中间件
 * 用于验证请求的有效性
 */

// 简单的API密钥验证中间件
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // 这里应该从配置或数据库中获取有效的API密钥进行比对
  // 这里使用一个简单的示例密钥
  const validApiKey = 'baibai-bot-secret-key';
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: '未授权访问，请提供有效的API密钥'
    });
  }
  
  // 验证通过，继续处理请求
  next();
};

// 检查请求来源合法性的中间件
const checkOrigin = (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // 这里可以添加来源验证逻辑
  // 例如：检查特定的QQ群号、服务器IP等
  
  // 示例中暂不做实际验证，直接放行
  next();
};

module.exports = {
  apiKeyAuth,
  checkOrigin
}; 