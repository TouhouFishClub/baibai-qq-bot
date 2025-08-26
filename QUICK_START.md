# 🚀 快速开始指南

## 📋 前置要求

- Node.js 12.0.0 或更高版本
- npm 或 yarn 包管理器

## ⚡ 快速安装

### 1. 安装依赖

```bash
npm install bcrypt jsonwebtoken
```

### 2. 初始化管理员账户

```bash
node scripts/initAdmin.js
```

### 3. 启动演示服务器

```bash
node start-auth-demo.js
```

或者直接运行：

```bash
node example-app.js
```

## 🌐 访问地址

- **登录页面**: http://localhost:3000/login.html
- **管理页面**: http://localhost:3000/admin.html
- **账户信息**: 来自 `.env` 配置文件（默认：`admin` / `admin123`）

## 🔧 配置说明

### 环境变量配置

#### 方法1：使用初始化脚本（推荐）

运行初始化脚本会自动生成 `.env` 文件：

```bash
node scripts/initAdmin.js
```

#### 方法2：手动配置

复制 `config.env.example` 为 `.env` 并修改配置：

```bash
cp config.env.example .env
```

然后编辑 `.env` 文件中的管理员账户信息：

```env
# 管理员账户配置
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
ADMIN_DISPLAY_NAME=您的显示名称
ADMIN_ROLE=admin
```

### 修改管理员账户信息

#### 方法1：使用管理脚本（推荐）

```bash
# 查看当前配置
node scripts/manageAdmin.js show

# 交互式修改配置
node scripts/manageAdmin.js config

# 生成强密码和JWT密钥
node scripts/manageAdmin.js generate
```

#### 方法2：手动编辑配置文件

1. 编辑 `.env` 文件中的相关配置
2. 重新启动服务器

#### 方法3：重新运行初始化脚本

```bash
node scripts/initAdmin.js
```

## 📁 文件说明

| 文件 | 说明 |
|------|------|
| `public/login.html` | 管理员登录页面 |
| `public/admin.html` | 受保护的管理页面 |
| `middlewares/authMiddleware.js` | JWT认证中间件 |
| `routes/adminAuthRoutes.js` | 管理员认证API |
| `routes/autoPushRoutesProtected.js` | 受保护的推送API |
| `scripts/initAdmin.js` | 管理员账户初始化 |
| `scripts/manageAdmin.js` | 管理员账户管理脚本 |
| `example-app.js` | 示例应用 |
| `start-auth-demo.js` | 快速启动脚本 |

## 🛡️ 安全特性

- ✅ JWT Token认证
- ✅ bcrypt密码加密
- ✅ API接口保护
- ✅ 自动Token过期
- ✅ 安全的会话管理

## ⚠️ 重要提醒

1. **首次使用后立即修改默认密码**
2. **生产环境中使用强JWT密钥**
3. **启用HTTPS保护**
4. **定期更换管理员密码**

## 🆘 常见问题

### Q: 登录失败怎么办？
A: 检查用户名密码是否正确，确认密码哈希是否更新

### Q: Token验证失败？
A: 检查Token是否过期，确认JWT密钥是否一致

### Q: 页面访问被拒绝？
A: 确认已正确登录，检查localStorage中的token

## 📞 技术支持

如有问题，请检查：
- 控制台错误信息
- 网络请求状态
- 服务器日志
- 浏览器开发者工具

---

**🎯 目标：保护推送数据安全，只允许授权管理员访问！**
