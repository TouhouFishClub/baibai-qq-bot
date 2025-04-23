const ed25519 = require('ed25519');

/**
 * 生成Ed25519密钥对
 * @param {string} secret - 密钥种子
 * @returns {Object} 包含公钥和私钥的对象
 */
function generateKeyPair(secret) {
  // 确保secret足够长度
  let seed = secret;
  while (seed.length < 32) {
    seed = seed.repeat(2);
  }
  seed = seed.slice(0, 32);
  
  // 生成密钥对
  return ed25519.MakeKeypair(Buffer.from(seed));
}

/**
 * 生成签名
 * @param {string} secret - 密钥种子
 * @param {string} message - 要签名的消息
 * @returns {string} 十六进制格式的签名
 */
function generateSignature(secret, message) {
  const keyPair = generateKeyPair(secret);
  const signature = ed25519.Sign(Buffer.from(message), keyPair.privateKey);
  return signature.toString('hex');
}

/**
 * 验证签名
 * @param {string} secret - 密钥种子
 * @param {string} message - 原始消息
 * @param {string} signature - 十六进制格式的签名
 * @returns {boolean} 签名是否有效
 */
function verifySignature(secret, message, signature) {
  const keyPair = generateKeyPair(secret);
  const signatureBuffer = Buffer.from(signature, 'hex');
  return ed25519.Verify(
    Buffer.from(message),
    signatureBuffer,
    keyPair.publicKey
  );
}

module.exports = {
  generateKeyPair,
  generateSignature,
  verifySignature
}; 