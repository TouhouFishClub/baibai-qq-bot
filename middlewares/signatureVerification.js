const { verifySignature } = require('../utils/signature');

/**
 * 验证请求签名
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
const signatureMiddleware = (req, res, next) => {
  try {
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const botSecret = process.env.QQ_BOT_SECRET;

    if (!signature) {
      console.error('错误: 缺少 X-Signature-Ed25519 头');
      return res.status(401).json({ 
        error: '缺少必要的签名信息',
        details: '缺少 X-Signature-Ed25519 头'
      });
    }

    if (!timestamp) {
      console.error('错误: 缺少 X-Signature-Timestamp 头');
      return res.status(401).json({ 
        error: '缺少必要的签名信息',
        details: '缺少 X-Signature-Timestamp 头'
      });
    }

    if (!botSecret) {
      console.error('错误: 未配置 QQ_BOT_SECRET 环境变量');
      return res.status(401).json({ 
        error: '缺少必要的签名信息',
        details: '未配置 QQ_BOT_SECRET 环境变量'
      });
    }

    // 构建签名消息
    const body = JSON.stringify(req.body);
    const message = timestamp + body;

    // 验证签名
    const isValid = verifySignature(botSecret, message, signature);

    if (!isValid) {
      console.error('签名验证失败');
      return res.status(401).json({ 
        error: '签名验证失败',
        details: '提供的签名验证失败'
      });
    }

    next();
  } catch (error) {
    console.error('签名验证错误:', error);
    return res.status(500).json({ 
      error: '签名验证过程出错',
      details: error.message
    });
  }
};

module.exports = signatureMiddleware; 