#!/bin/bash
# 修复远端服务器bcrypt模块问题的脚本

echo "🔧 开始修复bcrypt模块问题..."

# 检查当前环境
echo "📋 当前环境信息:"
echo "Node版本: $(node --version)"
echo "包管理器: $(which pnpm || echo 'npm')"
echo "系统: $(uname -a)"

# 方法1: 重新编译bcrypt
echo ""
echo "🔨 方法1: 重新编译bcrypt模块..."
if command -v pnpm &> /dev/null; then
    echo "使用pnpm重新安装bcrypt..."
    pnpm remove bcrypt
    pnpm install bcrypt
else
    echo "使用npm重新安装bcrypt..."
    npm uninstall bcrypt
    npm install bcrypt
fi

# 检查编译结果
if [ -f "node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node" ] || [ -f "node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node" ]; then
    echo "✅ bcrypt模块编译成功"
    exit 0
fi

echo ""
echo "⚠️  方法1失败，尝试方法2..."

# 方法2: 使用npm rebuild
echo "🔨 方法2: 使用rebuild重新编译..."
if command -v pnpm &> /dev/null; then
    pnpm rebuild bcrypt
else
    npm rebuild bcrypt
fi

# 再次检查
if [ -f "node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node" ] || [ -f "node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node" ]; then
    echo "✅ bcrypt模块重新编译成功"
    exit 0
fi

echo ""
echo "⚠️  方法2失败，尝试方法3..."

# 方法3: 清理缓存并重新安装
echo "🔨 方法3: 清理缓存并重新安装..."
if command -v pnpm &> /dev/null; then
    pnpm store prune
    rm -rf node_modules
    rm -rf pnpm-lock.yaml
    pnpm install
else
    npm cache clean --force
    rm -rf node_modules
    rm -rf package-lock.json
    npm install
fi

# 最终检查
if [ -f "node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node" ] || [ -f "node_modules/bcrypt/lib/binding/napi-v3/bcrypt_lib.node" ]; then
    echo "✅ bcrypt模块最终修复成功"
    echo "🎉 现在可以启动应用了"
else
    echo "❌ 所有方法都失败了"
    echo ""
    echo "💡 手动解决方案:"
    echo "1. 检查是否有构建工具: gcc, make, python"
    echo "2. 尝试安装构建依赖: apt-get install build-essential (Ubuntu/Debian)"
    echo "3. 或使用预编译版本: npm install bcrypt --no-optional"
    echo "4. 考虑替换为bcryptjs (纯JS实现): npm install bcryptjs"
    exit 1
fi
