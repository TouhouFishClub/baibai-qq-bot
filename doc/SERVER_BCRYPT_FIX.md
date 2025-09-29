# 服务器bcrypt模块修复指南

## 问题描述

远端服务器启动时出现bcrypt模块加载错误：

```
Error: Cannot find module '/data/project/baibai-qq-bot/node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node'
```

这是因为bcrypt是一个包含原生代码的模块，需要在目标平台上编译。

## 快速修复方案

### 方案1: 使用自动修复脚本

在服务器上运行：

```bash
# 上传修复脚本到服务器
node scripts/fix-bcrypt-server.js
```

或使用shell脚本：

```bash
chmod +x scripts/fix-bcrypt-server.sh
./scripts/fix-bcrypt-server.sh
```

### 方案2: 手动修复 (推荐)

#### 2.1 使用pnpm重新安装

```bash
# 进入项目目录
cd /data/project/baibai-qq-bot

# 移除并重新安装bcrypt
pnpm remove bcrypt
pnpm install bcrypt

# 或者重新编译
pnpm rebuild bcrypt
```

#### 2.2 使用npm重新安装

```bash
# 如果pnpm有问题，切换到npm
npm uninstall bcrypt
npm install bcrypt

# 或者重新编译
npm rebuild bcrypt
```

#### 2.3 完全重新安装依赖

```bash
# 清理所有依赖
rm -rf node_modules
rm -rf pnpm-lock.yaml  # 或 package-lock.json

# 重新安装
pnpm install  # 或 npm install
```

### 方案3: 检查系统依赖

bcrypt需要编译工具，确保服务器有：

#### Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install build-essential python3
```

#### CentOS/RHEL:
```bash
sudo yum groupinstall "Development Tools"
sudo yum install python3
```

#### Alpine Linux:
```bash
apk add --no-cache make gcc g++ python3
```

### 方案4: 使用替代方案

如果编译持续失败，可以使用纯JS实现：

#### 4.1 安装bcryptjs

```bash
pnpm remove bcrypt
pnpm install bcryptjs
```

#### 4.2 修改代码

需要修改以下文件中的bcrypt引用：

**routes/adminAuthRoutes.js:**
```javascript
// 修改前
const bcrypt = require('bcrypt');

// 修改后  
const bcrypt = require('bcryptjs');
```

**scripts/initAdmin.js 和 scripts/manageAdmin.js:**
```javascript
// 同样的修改
const bcrypt = require('bcryptjs');
```

> **注意**: bcryptjs是纯JS实现，性能略低于bcrypt，但兼容性更好。

## 验证修复结果

修复后，检查bcrypt模块：

```bash
# 检查模块是否存在
ls -la node_modules/.pnpm/bcrypt@*/node_modules/bcrypt/lib/binding/napi-v3/
# 或
ls -la node_modules/bcrypt/lib/binding/napi-v3/

# 测试导入
node -e "console.log('bcrypt test:', require('bcrypt').hashSync('test', 10))"
```

## 启动应用

修复完成后重启应用：

```bash
# 使用pm2重启
pm2 restart baibai-qq-bot

# 或直接启动
npm start
```

## 预防措施

为避免将来出现类似问题：

### 1. 使用.nvmrc固定Node.js版本

创建 `.nvmrc` 文件：
```
20.11.1
```

### 2. 锁定bcrypt版本

在 `package.json` 中：
```json
{
  "dependencies": {
    "bcrypt": "5.1.1"
  }
}
```

### 3. 添加构建脚本

在 `package.json` 中添加：
```json
{
  "scripts": {
    "rebuild": "npm rebuild",
    "postinstall": "npm rebuild bcrypt"
  }
}
```

## 常见问题

### Q: 为什么本地正常，服务器有问题？
A: bcrypt包含原生代码，需要在目标平台编译。本地和服务器的系统架构不同。

### Q: pnpm和npm有什么区别？
A: pnpm使用硬链接节省空间，但有时原生模块的路径解析会有问题。

### Q: 可以预编译吗？
A: 不建议。原生模块必须在目标平台编译才能保证兼容性。

### Q: bcryptjs性能如何？
A: bcryptjs比bcrypt慢约30%，但对于一般应用足够使用。

## 联系支持

如果问题持续存在：

1. 检查Node.js版本是否与bcrypt兼容
2. 检查系统架构 (`uname -a`)
3. 查看完整的错误日志
4. 考虑使用Docker容器化部署
