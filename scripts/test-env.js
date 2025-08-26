/**
 * 测试环境变量加载的脚本
 * 验证管理员账户配置是否正确读取
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../config.env') });

console.log('=== 环境变量测试 ===\n');

// 检查关键环境变量
const envVars = {
  'PORT': process.env.PORT,
  'NODE_ENV': process.env.NODE_ENV,
  'JWT_SECRET': process.env.JWT_SECRET,
  'ADMIN_USERNAME': process.env.ADMIN_USERNAME,
  'ADMIN_PASSWORD': process.env.ADMIN_PASSWORD,
  'ADMIN_DISPLAY_NAME': process.env.ADMIN_DISPLAY_NAME,
  'ADMIN_ROLE': process.env.ADMIN_ROLE
};

console.log('当前环境变量值:');
for (const [key, value] of Object.entries(envVars)) {
  if (key === 'ADMIN_PASSWORD') {
    // 密码只显示长度，不显示实际值
    console.log(`${key}: ${value ? '*'.repeat(value.length) : 'undefined'} (长度: ${value ? value.length : 0})`);
  } else {
    console.log(`${key}: ${value || 'undefined'}`);
  }
}

console.log('\n=== 验证结果 ===');

// 验证必要的环境变量
let allValid = true;

if (!process.env.ADMIN_USERNAME) {
  console.log('❌ ADMIN_USERNAME 未设置');
  allValid = false;
} else {
  console.log('✅ ADMIN_USERNAME 已设置');
}

if (!process.env.ADMIN_PASSWORD) {
  console.log('❌ ADMIN_PASSWORD 未设置');
  allValid = false;
} else {
  console.log('✅ ADMIN_PASSWORD 已设置');
}

if (!process.env.JWT_SECRET) {
  console.log('❌ JWT_SECRET 未设置');
  allValid = false;
} else {
  console.log('✅ JWT_SECRET 已设置');
}

if (!process.env.PORT) {
  console.log('❌ PORT 未设置，将使用默认值');
} else {
  console.log('✅ PORT 已设置');
}

console.log('\n=== 测试环境变量读取 ===');

// 尝试从当前目录的 .env 文件读取
try {
  const envPath = path.join(__dirname, '../.env');
  console.log(`尝试读取 .env 文件: ${envPath}`);
  
  const fs = require('fs');
  if (fs.existsSync(envPath)) {
    console.log('✅ .env 文件存在');
    
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`包含 ${lines.length} 个环境变量配置`);
    
    // 检查是否有重复的环境变量
    const envKeys = lines.map(line => line.split('=')[0].trim());
    const duplicates = envKeys.filter((key, index) => envKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      console.log('⚠️  发现重复的环境变量:', duplicates);
    }
  } else {
    console.log('❌ .env 文件不存在');
  }
} catch (error) {
  console.log('❌ 读取 .env 文件失败:', error.message);
}

// 测试从 config.env 文件读取
try {
  const configEnvPath = path.join(__dirname, '../config.env');
  console.log(`\n尝试读取 config.env 文件: ${configEnvPath}`);
  
  const fs = require('fs');
  if (fs.existsSync(configEnvPath)) {
    console.log('✅ config.env 文件存在');
    
    const envContent = fs.readFileSync(configEnvPath, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    console.log(`包含 ${lines.length} 个环境变量配置`);
  } else {
    console.log('❌ config.env 文件不存在');
  }
} catch (error) {
  console.log('❌ 读取 config.env 文件失败:', error.message);
}

console.log('\n=== 总结 ===');
if (allValid) {
  console.log('✅ 所有必要的环境变量都已正确设置');
  console.log('💡 如果仍然登录失败，请检查：');
  console.log('   1. 服务器是否重启以加载新的环境变量');
  console.log('   2. 前端是否正确发送登录请求');
  console.log('   3. 网络请求是否有错误');
} else {
  console.log('❌ 部分环境变量未正确设置');
  console.log('💡 请检查 config.env 文件或创建 .env 文件');
}
