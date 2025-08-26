/**
 * 测试环境变量加载的脚本
 * 验证QQ机器人配置是否正确加载到process.env中
 */

require('dotenv').config();

console.log('=== 环境变量加载测试 ===\n');

// 检查关键环境变量
const envVars = {
  'PORT': process.env.PORT,
  'NODE_ENV': process.env.NODE_ENV,
  'QQ_BOT_NAME': process.env.QQ_BOT_NAME,
  'QQ_BOT_APP_ID': process.env.QQ_BOT_APP_ID,
  'QQ_BOT_TOKEN': process.env.QQ_BOT_TOKEN,
  'QQ_BOT_SECRET': process.env.QQ_BOT_SECRET,
  'API_BASE_URL': process.env.API_BASE_URL,
  'SERVER_HOST': process.env.SERVER_HOST
};

console.log('当前环境变量值:');
for (const [key, value] of Object.entries(envVars)) {
  if (key === 'QQ_BOT_SECRET' || key === 'QQ_BOT_TOKEN') {
    // 敏感信息只显示长度，不显示实际值
    console.log(`${key}: ${value ? '*'.repeat(value.length) : 'undefined'} (长度: ${value ? value.length : 0})`);
  } else {
    console.log(`${key}: ${value || 'undefined'}`);
  }
}

console.log('\n=== 推送系统关键配置验证 ===');

// 验证推送系统需要的环境变量
const pushSystemRequired = ['QQ_BOT_APP_ID', 'QQ_BOT_SECRET'];
let pushSystemValid = true;

for (const requiredVar of pushSystemRequired) {
  if (!process.env[requiredVar]) {
    console.log(`❌ ${requiredVar} 未设置 - 推送系统无法工作`);
    pushSystemValid = false;
  } else {
    console.log(`✅ ${requiredVar} 已设置`);
  }
}

console.log('\n=== 测试结果 ===');
if (pushSystemValid) {
  console.log('🎉 推送系统环境变量配置完整！');
  console.log('💡 现在应该可以正常推送帖子了');
} else {
  console.log('❌ 推送系统环境变量配置不完整');
  console.log('💡 请检查.env文件配置');
}

console.log('\n🔧 如果仍有问题，请检查：');
console.log('1. 服务器是否重启以加载新的环境变量');
console.log('2. .env文件是否在项目根目录');
console.log('3. 环境变量名称是否正确');
console.log('4. 文件编码是否为UTF-8');
