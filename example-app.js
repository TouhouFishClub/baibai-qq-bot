/**
 * 示例应用文件
 * 展示如何集成管理员认证系统
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

// 导入路由
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const autoPushRoutesProtected = require('./routes/autoPushRoutesProtected');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 路由
app.use('/admin', adminAuthRoutes);
app.use('/auto-push', autoPushRoutesProtected);

// 根路径重定向到登录页面
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在',
        error: 'NOT_FOUND'
    });
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('应用错误:', error);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_ERROR'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 服务器启动成功！`);
    console.log(`📍 端口: ${PORT}`);
    console.log(`🌐 登录页面: http://localhost:${PORT}/login.html`);
    console.log(`🔧 管理页面: http://localhost:${PORT}/admin.html`);
    console.log(`📚 账户信息: ${process.env.ADMIN_USERNAME || 'admin'} / ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    console.log(`⚠️  请及时修改默认密码！`);
    console.log(`💡 使用 "node scripts/manageAdmin.js config" 修改账户信息`);
});

module.exports = app;
