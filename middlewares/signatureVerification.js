const crypto = require('crypto');
const { createHash } = require('crypto');

/**
 * 验证请求签名
 * @param {Object} req - Express请求对象
 * @param {Object} res - Express响应对象
 * @param {Function} next - Express next函数
 */
const verifySignature = (req, res, next) => {
  try {
    console.log('=== 签名验证调试信息 ===');
    console.log('请求头:', req.headers);
    console.log('请求体:', req.body);
    
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const botSecret = process.env.QQ_BOT_SECRET;

    console.log('签名信息:', {
      signature: signature ? '已提供' : '未提供',
      timestamp: timestamp ? '已提供' : '未提供',
      botSecret: botSecret ? '已配置' : '未配置'
    });

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

    // 生成seed
    let seed = botSecret;
    while (seed.length < 32) {
      seed = seed.repeat(2);
    }
    seed = seed.slice(0, 32);

    console.log('生成的seed:', seed);

    // 生成密钥对
    const keyPair = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      seed: Buffer.from(seed)
    });

    // 构建签名消息
    const body = JSON.stringify(req.body);
    const message = timestamp + body;

    console.log('签名消息:', {
      timestamp,
      body,
      message
    });

    // 验证签名
    const isValid = crypto.verify(
      null,
      Buffer.from(message),
      keyPair.publicKey,
      Buffer.from(signature, 'hex')
    );

    console.log('签名验证结果:', isValid ? '通过' : '失败');

    if (!isValid) {
      return res.status(401).json({ 
        error: '签名验证失败',
        details: '提供的签名与计算出的签名不匹配'
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

module.exports = verifySignature; 