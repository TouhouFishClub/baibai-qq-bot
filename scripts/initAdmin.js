/**
 * 初始化管理员账户脚本
 * 用于设置默认管理员密码和生成环境变量配置
 */

const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

async function initAdmin() {
    try {
        // 从环境变量读取配置，如果没有则使用默认值
        const username = process.env.ADMIN_USERNAME || 'admin';
        const password = process.env.ADMIN_PASSWORD || 'admin123';
        const displayName = process.env.ADMIN_DISPLAY_NAME || '系统管理员';
        const role = process.env.ADMIN_ROLE || 'admin';
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        console.log('=== 管理员账户初始化 ===');
        console.log(`用户名: ${username}`);
        console.log(`密码: ${password}`);
        console.log(`显示名称: ${displayName}`);
        console.log(`角色: ${role}`);
        console.log('\n哈希后的密码:');
        console.log(hashedPassword);
        
        // 生成环境变量配置示例
        const envConfig = `# QQ机器人管理员认证系统环境变量配置
# 复制此文件为 .env 并修改相应的值

# 服务器配置
PORT=3000
NODE_ENV=development

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# 管理员账户配置
ADMIN_USERNAME=${username}
ADMIN_PASSWORD=${password}
ADMIN_DISPLAY_NAME=${displayName}
ADMIN_ROLE=${role}

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
        
        // 写入环境变量配置文件
        const envPath = path.join(__dirname, '..', '.env');
        fs.writeFileSync(envPath, envConfig);
        
        console.log('\n✅ 环境变量配置文件已生成: .env');
        console.log('⚠️  注意：首次使用后请立即修改默认密码！');
        console.log('💡 提示：可以通过修改 .env 文件来更改管理员账户信息');
        
    } catch (error) {
        console.error('初始化失败:', error.message);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    initAdmin();
}

module.exports = { initAdmin };
