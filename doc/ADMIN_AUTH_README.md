# 管理员认证系统使用说明

## 概述

为了保护推送数据的安全，我们为QQ机器人管理后台添加了管理员认证系统。只有经过认证的管理员才能访问管理功能和API接口。

## 功能特性

- 🔐 JWT Token认证
- 👤 管理员登录/退出
- 🛡️ API接口保护
- 🔒 安全的密码存储（bcrypt加密）
- ⏰ Token自动过期（默认24小时）

## 文件结构

```
├── public/
│   ├── login.html          # 管理员登录页面
│   └── admin.html          # 受保护的管理页面
├── middlewares/
│   └── authMiddleware.js   # 认证中间件
├── routes/
│   ├── adminAuthRoutes.js           # 管理员认证路由
│   └── autoPushRoutesProtected.js   # 受保护的自动推送路由
└── scripts/
    └── initAdmin.js        # 管理员账户初始化脚本
```

## 安装依赖

```bash
npm install bcrypt jsonwebtoken
```

## 初始化管理员账户

### 1. 运行初始化脚本（推荐）

```bash
node scripts/initAdmin.js
```

脚本会自动：
- 生成密码哈希
- 创建 `.env` 环境变量配置文件
- 设置默认管理员账户

### 2. 手动配置环境变量

复制 `config.env.example` 为 `.env` 并修改管理员账户信息：

```bash
cp config.env.example .env
```

编辑 `.env` 文件中的管理员配置：

```env
ADMIN_USERNAME=your_admin_username
ADMIN_PASSWORD=your_secure_password
ADMIN_DISPLAY_NAME=您的显示名称
ADMIN_ROLE=admin
```

## 使用方法

### 1. 访问登录页面

在浏览器中访问 `/login.html` 进入管理员登录页面。

### 2. 登录凭据

登录凭据来自 `.env` 配置文件：

- **默认用户名**: `admin`
- **默认密码**: `admin123`
- **显示名称**: `系统管理员`
- **角色**: `admin`

可以通过修改 `.env` 文件来自定义这些信息。

### 3. 访问管理页面

登录成功后会自动跳转到 `/admin.html` 管理页面。

### 4. API接口保护

所有需要认证的API接口都需要在请求头中包含JWT Token：

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 安全配置

### 1. 环境变量

建议在 `.env` 文件中设置自定义的JWT密钥：

```env
JWT_SECRET=your-super-secret-jwt-key-here
```

### 2. 修改默认密码

首次使用后，请立即修改默认密码：

#### 方法1：修改环境变量（推荐）

1. 编辑 `.env` 文件中的 `ADMIN_PASSWORD` 字段
2. 重新启动服务器

#### 方法2：重新运行初始化脚本

1. 修改 `scripts/initAdmin.js` 中的默认密码
2. 重新运行 `node scripts/initAdmin.js`
3. 重启服务器

#### 方法3：直接修改环境变量

```bash
export ADMIN_PASSWORD=your_new_password
node example-app.js
```

### 3. 生产环境建议

- 使用强密码策略
- 定期更换JWT密钥
- 启用HTTPS
- 设置合理的Token过期时间
- 记录登录日志

## API接口

### 认证接口

- `POST /admin/login` - 管理员登录
- `POST /admin/verify-token` - 验证Token
- `GET /admin/profile` - 获取用户信息
- `POST /admin/logout` - 退出登录

### 受保护的接口

所有 `/auto-push/*` 接口现在都需要认证才能访问。

## 故障排除

### 1. 登录失败

- 检查用户名和密码是否正确
- 确认密码哈希是否正确更新
- 查看服务器日志中的错误信息

### 2. Token验证失败

- 检查Token是否过期
- 确认请求头格式是否正确
- 验证JWT密钥是否一致

### 3. 页面访问被拒绝

- 确认已正确登录
- 检查localStorage中的token是否存在
- 验证token是否有效

## 注意事项

⚠️ **重要安全提醒**：

1. **首次使用后立即修改默认密码**
2. **不要在代码中硬编码真实的JWT密钥**
3. **定期更换管理员密码**
4. **保护好JWT密钥，不要泄露给他人**
5. **在生产环境中使用HTTPS**

## 技术支持

如果遇到问题，请检查：

1. 控制台错误信息
2. 网络请求状态
3. 服务器日志
4. 浏览器开发者工具

---

**安全第一，谨慎操作！** 🔒
