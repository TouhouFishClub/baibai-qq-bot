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
    const signature = req.headers['x-signature-ed25519'];
    const timestamp = req.headers['x-signature-timestamp'];
    const botSecret = process.env.QQ_BOT_SECRET;

    if (!signature || !timestamp || !botSecret) {
      return res.status(401).json({ error: '缺少必要的签名信息' });
    }

    // 生成seed
    let seed = botSecret;
    while (seed.length < 32) {
      seed = seed.repeat(2);
    }
    seed = seed.slice(0, 32);

    // 生成密钥对
    const keyPair = crypto.generateKeyPairSync('ed25519', {
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      seed: Buffer.from(seed)
    });

    // 构建签名消息
    const body = JSON.stringify(req.body);
    const message = timestamp + body;

    // 验证签名
    const isValid = crypto.verify(
      null,
      Buffer.from(message),
      keyPair.publicKey,
      Buffer.from(signature, 'hex')
    );

    if (!isValid) {
      return res.status(401).json({ error: '签名验证失败' });
    }

    next();
  } catch (error) {
    console.error('签名验证错误:', error);
    return res.status(500).json({ error: '签名验证过程出错' });
  }
};

module.exports = verifySignature; 