/**
 * 修复远端服务器bcrypt模块问题的Node.js脚本
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复bcrypt模块问题...');

// 检查当前环境
console.log('📋 当前环境信息:');
try {
  console.log('Node版本:', process.version);
  console.log('平台:', process.platform);
  console.log('架构:', process.arch);
  
  // 检查包管理器
  let packageManager = 'npm';
  try {
    execSync('which pnpm', { stdio: 'ignore' });
    packageManager = 'pnpm';
  } catch (e) {
    // pnpm不存在，使用npm
  }
  console.log('包管理器:', packageManager);
} catch (error) {
  console.error('获取环境信息失败:', error.message);
}

// 检查bcrypt模块文件是否存在
function checkBcryptModule() {
  const possiblePaths = [
    'node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node',
    'node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node'
  ];
  
  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      console.log('✅ 找到bcrypt模块:', filePath);
      return true;
    }
  }
  
  console.log('❌ 未找到bcrypt编译文件');
  return false;
}

// 执行命令的封装函数
function runCommand(command, description) {
  console.log(`\n🔨 ${description}...`);
  console.log(`执行命令: ${command}`);
  
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    return true;
  } catch (error) {
    console.error(`❌ 命令执行失败: ${error.message}`);
    return false;
  }
}

async function fixBcrypt() {
  // 检查当前状态
  if (checkBcryptModule()) {
    console.log('✅ bcrypt模块已存在，无需修复');
    return;
  }

  // 检测包管理器
  let packageManager = 'npm';
  try {
    execSync('pnpm --version', { stdio: 'ignore' });
    packageManager = 'pnpm';
  } catch (e) {
    // 使用npm
  }

  console.log(`\n使用包管理器: ${packageManager}`);

  // 方法1: 重新安装bcrypt
  console.log('\n📦 方法1: 重新安装bcrypt模块...');
  let success = false;
  
  if (packageManager === 'pnpm') {
    success = runCommand('pnpm remove bcrypt', '移除bcrypt');
    if (success) {
      success = runCommand('pnpm install bcrypt', '重新安装bcrypt');
    }
  } else {
    success = runCommand('npm uninstall bcrypt', '移除bcrypt');
    if (success) {
      success = runCommand('npm install bcrypt', '重新安装bcrypt');
    }
  }

  if (success && checkBcryptModule()) {
    console.log('✅ 方法1成功 - bcrypt模块修复完成');
    return;
  }

  // 方法2: 使用rebuild
  console.log('\n🔨 方法2: 重新编译bcrypt...');
  if (packageManager === 'pnpm') {
    success = runCommand('pnpm rebuild bcrypt', '重新编译bcrypt');
  } else {
    success = runCommand('npm rebuild bcrypt', '重新编译bcrypt');
  }

  if (success && checkBcryptModule()) {
    console.log('✅ 方法2成功 - bcrypt模块修复完成');
    return;
  }

  // 方法3: 完全重新安装
  console.log('\n🧹 方法3: 完全重新安装依赖...');
  
  if (packageManager === 'pnpm') {
    runCommand('pnpm store prune', '清理pnpm存储');
    if (fs.existsSync('pnpm-lock.yaml')) {
      fs.unlinkSync('pnpm-lock.yaml');
      console.log('删除 pnpm-lock.yaml');
    }
  } else {
    runCommand('npm cache clean --force', '清理npm缓存');
    if (fs.existsSync('package-lock.json')) {
      fs.unlinkSync('package-lock.json');
      console.log('删除 package-lock.json');
    }
  }

  // 删除node_modules
  if (fs.existsSync('node_modules')) {
    console.log('删除 node_modules 目录...');
    fs.rmSync('node_modules', { recursive: true, force: true });
  }

  // 重新安装
  if (packageManager === 'pnpm') {
    success = runCommand('pnpm install', '重新安装所有依赖');
  } else {
    success = runCommand('npm install', '重新安装所有依赖');
  }

  if (success && checkBcryptModule()) {
    console.log('✅ 方法3成功 - bcrypt模块修复完成');
    return;
  }

  // 所有方法都失败了
  console.log('\n❌ 所有自动修复方法都失败了');
  console.log('\n💡 手动解决方案:');
  console.log('1. 检查系统是否有构建工具:');
  console.log('   Ubuntu/Debian: sudo apt-get install build-essential python3');
  console.log('   CentOS/RHEL: sudo yum groupinstall "Development Tools"');
  console.log('   Alpine: apk add --no-cache make gcc g++ python3');
  console.log('');
  console.log('2. 尝试使用预编译版本:');
  console.log('   npm install bcrypt --no-optional');
  console.log('');
  console.log('3. 考虑替换为纯JS实现:');
  console.log('   npm uninstall bcrypt');
  console.log('   npm install bcryptjs');
  console.log('   然后修改代码中的 require("bcrypt") 为 require("bcryptjs")');
  console.log('');
  console.log('4. 检查Node.js版本是否与bcrypt兼容');
  
  process.exit(1);
}

// 运行修复
fixBcrypt().catch(error => {
  console.error('修复过程出错:', error);
  process.exit(1);
});
