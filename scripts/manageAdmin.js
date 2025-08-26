#!/usr/bin/env node

/**
 * 管理员账户管理脚本
 * 用于查看、修改和管理员账户配置
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const readline = require('readline');

// 创建命令行交互接口
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 加载环境变量
require('dotenv').config();

// 配置文件路径
const envPath = path.join(__dirname, '..', '.env');
const configPath = path.join(__dirname, '..', 'config.env.example');

/**
 * 显示当前配置
 */
function showCurrentConfig() {
    console.log('\n📋 当前管理员账户配置:');
    console.log('========================');
    console.log(`用户名: ${process.env.ADMIN_USERNAME || 'admin'}`);
    console.log(`密码: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log(`显示名称: ${process.env.ADMIN_DISPLAY_NAME || '系统管理员'}`);
    console.log(`角色: ${process.env.ADMIN_ROLE || 'admin'}`);
    console.log(`JWT密钥: ${process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'}`);
    console.log(`端口: ${process.env.PORT || 3000}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
}

/**
 * 生成新的环境变量配置
 */
function generateEnvConfig(config) {
    return `# QQ机器人管理员认证系统环境变量配置
# 此文件由管理脚本自动生成，请勿手动编辑

# 服务器配置
PORT=${config.PORT || 3000}
NODE_ENV=${config.NODE_ENV || 'development'}

# JWT配置
JWT_SECRET=${config.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'}

# 管理员账户配置
ADMIN_USERNAME=${config.ADMIN_USERNAME || 'admin'}
ADMIN_PASSWORD=${config.ADMIN_PASSWORD || 'admin123'}
ADMIN_DISPLAY_NAME=${config.ADMIN_DISPLAY_NAME || '系统管理员'}
ADMIN_ROLE=${config.ADMIN_ROLE || 'admin'}

# 数据库配置（如果使用数据库存储用户信息）
# DB_HOST=localhost
# DB_PORT=3306
# DB_NAME=qq_bot
# DB_USER=root
# DB_PASSWORD=password

# 其他配置
# LOG_LEVEL=info
# CORS_ORIGIN=http://localhost:3000
`;
}

/**
 * 更新配置文件
 */
function updateConfig(newConfig) {
    try {
        const envConfig = generateEnvConfig(newConfig);
        fs.writeFileSync(envPath, envConfig);
        console.log('✅ 配置文件更新成功！');
        return true;
    } catch (error) {
        console.error('❌ 配置文件更新失败:', error.message);
        return false;
    }
}

/**
 * 生成强密码
 */
function generateStrongPassword(length = 16) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

/**
 * 生成JWT密钥
 */
function generateJWTSecret(length = 64) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let secret = '';
    for (let i = 0; i < length; i++) {
        secret += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return secret;
}

/**
 * 交互式修改配置
 */
async function interactiveConfig() {
    console.log('\n🔧 交互式配置模式');
    console.log('==================');
    
    const newConfig = {};
    
    // 用户名
    const username = await new Promise(resolve => {
        rl.question(`请输入管理员用户名 (当前: ${process.env.ADMIN_USERNAME || 'admin'}): `, (answer) => {
            resolve(answer.trim() || process.env.ADMIN_USERNAME || 'admin');
        });
    });
    newConfig.ADMIN_USERNAME = username;
    
    // 密码
    const password = await new Promise(resolve => {
        rl.question(`请输入管理员密码 (当前: ${process.env.ADMIN_PASSWORD || 'admin123'}): `, (answer) => {
            resolve(answer.trim() || process.env.ADMIN_PASSWORD || 'admin123');
        });
    });
    newConfig.ADMIN_PASSWORD = password;
    
    // 显示名称
    const displayName = await new Promise(resolve => {
        rl.question(`请输入显示名称 (当前: ${process.env.ADMIN_DISPLAY_NAME || '系统管理员'}): `, (answer) => {
            resolve(answer.trim() || process.env.ADMIN_DISPLAY_NAME || '系统管理员');
        });
    });
    newConfig.ADMIN_DISPLAY_NAME = displayName;
    
    // 角色
    const role = await new Promise(resolve => {
        rl.question(`请输入角色 (当前: ${process.env.ADMIN_ROLE || 'admin'}): `, (answer) => {
            resolve(answer.trim() || process.env.ADMIN_ROLE || 'admin');
        });
    });
    newConfig.ADMIN_ROLE = role;
    
    // 端口
    const port = await new Promise(resolve => {
        rl.question(`请输入服务器端口 (当前: ${process.env.PORT || 3000}): `, (answer) => {
            resolve(answer.trim() || process.env.PORT || 3000);
        });
    });
    newConfig.PORT = port;
    
    // 确认更新
    console.log('\n📝 新的配置:');
    console.log('============');
    console.log(`用户名: ${newConfig.ADMIN_USERNAME}`);
    console.log(`密码: ${newConfig.ADMIN_PASSWORD}`);
    console.log(`显示名称: ${newConfig.ADMIN_DISPLAY_NAME}`);
    console.log(`角色: ${newConfig.ADMIN_ROLE}`);
    console.log(`端口: ${newConfig.PORT}`);
    
    const confirm = await new Promise(resolve => {
        rl.question('\n确认更新配置？(y/N): ', (answer) => {
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
    
    if (confirm) {
        updateConfig(newConfig);
    } else {
        console.log('❌ 配置更新已取消');
    }
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log('\n📖 管理员账户管理脚本使用说明');
    console.log('================================');
    console.log('命令:');
    console.log('  show          - 显示当前配置');
    console.log('  config        - 交互式配置');
    console.log('  generate      - 生成强密码和JWT密钥');
    console.log('  help          - 显示此帮助信息');
    console.log('  exit          - 退出脚本');
    console.log('');
    console.log('示例:');
    console.log('  node scripts/manageAdmin.js show');
    console.log('  node scripts/manageAdmin.js config');
    console.log('  node scripts/manageAdmin.js generate');
}

/**
 * 生成强密码和JWT密钥
 */
function generateSecureCredentials() {
    console.log('\n🔐 生成安全凭据');
    console.log('================');
    
    const strongPassword = generateStrongPassword(20);
    const jwtSecret = generateJWTSecret(128);
    
    console.log('强密码 (20位):');
    console.log(strongPassword);
    console.log('\nJWT密钥 (128位):');
    console.log(jwtSecret);
    
    console.log('\n💡 提示:');
    console.log('- 请妥善保管这些凭据');
    console.log('- 可以使用 "config" 命令将这些值设置到配置中');
    console.log('- 建议定期更换这些凭据');
}

/**
 * 主函数
 */
async function main() {
    const command = process.argv[2];
    
    console.log('🔐 QQ机器人管理员账户管理脚本');
    console.log('================================');
    
    switch (command) {
        case 'show':
            showCurrentConfig();
            break;
            
        case 'config':
            await interactiveConfig();
            break;
            
        case 'generate':
            generateSecureCredentials();
            break;
            
        case 'help':
        case '--help':
        case '-h':
            showHelp();
            break;
            
        default:
            if (command) {
                console.log(`❌ 未知命令: ${command}`);
                console.log('使用 "help" 查看可用命令');
            } else {
                showHelp();
                console.log('\n💡 提示: 使用 "node scripts/manageAdmin.js help" 查看详细说明');
            }
    }
    
    rl.close();
}

// 运行主函数
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 脚本执行失败:', error.message);
        rl.close();
        process.exit(1);
    });
}

module.exports = {
    showCurrentConfig,
    updateConfig,
    generateStrongPassword,
    generateJWTSecret,
    interactiveConfig
};

