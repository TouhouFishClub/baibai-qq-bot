#!/usr/bin/env node

/**
 * 快速启动脚本
 * 用于演示管理员认证系统
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔐 QQ机器人管理员认证系统启动脚本');
console.log('=====================================\n');

// 检查依赖是否安装
function checkDependencies() {
    console.log('📦 检查依赖...');
    
    try {
        require('bcrypt');
        require('jsonwebtoken');
        console.log('✅ 依赖检查通过\n');
        return true;
    } catch (error) {
        console.log('❌ 缺少必要依赖');
        console.log('请运行: npm install bcrypt jsonwebtoken\n');
        return false;
    }
}

// 初始化管理员账户
function initAdmin() {
    console.log('👤 初始化管理员账户...');
    
    try {
        const initScript = path.join(__dirname, 'scripts', 'initAdmin.js');
        if (fs.existsSync(initScript)) {
            const output = execSync(`node "${initScript}"`, { encoding: 'utf8' });
            console.log(output);
            console.log('✅ 管理员账户初始化完成\n');
        } else {
            console.log('⚠️  初始化脚本不存在，请手动运行: node scripts/initAdmin.js\n');
        }
    } catch (error) {
        console.log('❌ 初始化失败:', error.message);
        console.log('请手动运行: node scripts/initAdmin.js\n');
    }
}

// 启动服务器
function startServer() {
    console.log('🚀 启动服务器...');
    
    try {
        const appFile = path.join(__dirname, 'example-app.js');
        if (fs.existsSync(appFile)) {
            console.log('✅ 服务器启动成功！');
            console.log('📍 访问地址: http://localhost:3000');
            console.log('🔐 登录页面: http://localhost:3000/login.html');
            console.log('📚 默认账户: admin / admin123');
            console.log('\n按 Ctrl+C 停止服务器\n');
            
            // 启动服务器
            execSync(`node "${appFile}"`, { stdio: 'inherit' });
        } else {
            console.log('❌ 示例应用文件不存在');
            console.log('请检查文件路径或手动启动服务器\n');
        }
    } catch (error) {
        console.log('❌ 服务器启动失败:', error.message);
    }
}

// 主函数
function main() {
    if (!checkDependencies()) {
        process.exit(1);
    }
    
    initAdmin();
    startServer();
}

// 运行主函数
if (require.main === module) {
    main();
}

module.exports = { main, checkDependencies, initAdmin, startServer };

