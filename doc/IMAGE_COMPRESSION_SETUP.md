# 图片压缩功能配置指南

## 功能概述

QQ机器人现在支持自动图片压缩功能，可以在上传前自动压缩过大的图片，避免因图片过大导致的上传失败。

## 支持场景

- ✅ **QQ群聊** - 自动压缩后上传获取file_info
- ✅ **QQ私信** - 自动压缩后上传获取file_info  
- ✅ **频道消息** - 自动压缩后生成图片URL
- ✅ **频道私信** - 自动压缩后生成图片URL

## 压缩规则

### 触发条件
图片满足以下任一条件时将被压缩：
- 文件大小 > 5MB
- 图片宽度 > 2048px
- 图片高度 > 2048px

### 压缩配置
- **最大尺寸**: 2048x2048 (保持宽高比)
- **JPEG质量**: 85%
- **PNG压缩**: 级别8
- **WebP质量**: 85%
- **格式转换**: 未知格式自动转为JPEG

## 安装图片处理库

### 方法一：使用脚本安装（推荐）
```bash
npm run install-sharp
# 或
npm run setup-image-compression
```

### 方法二：手动安装
```bash
npm install sharp
```

### 方法三：如果网络有问题
```bash
# 设置代理
npm config set proxy http://your-proxy:port
npm install sharp

# 或使用淘宝镜像
npm install sharp --registry=https://registry.npm.taobao.org
```

## 运行模式

### 完整模式（推荐）
- ✅ Sharp库已安装
- ✅ 支持图片压缩
- ✅ 支持尺寸检测
- ✅ 支持格式转换

启动时显示：
```
Sharp图片处理库已加载，支持图片压缩功能
```

### 降级模式
- ❌ Sharp库未安装
- ❌ 无法压缩图片
- ✅ 基本功能正常
- ⚠️ 大图片可能上传失败

启动时显示：
```
Sharp图片处理库未安装，图片压缩功能将被禁用
如需启用图片压缩，请运行: npm install sharp
```

## 使用效果

### 压缩前
```
原始图片信息: 4096x3072, 格式: jpeg, 大小: 8.5MB
```

### 压缩后
```
最终图片信息: 2048x1536, 格式: jpeg, 大小: 1.2MB
图片压缩完成: 1.2MB (压缩率: 85.9%)
```

## 日志输出

启用压缩功能后，您将看到详细的处理日志：

```
图片文件大小: 8.50MB
图片过大 (8.50MB > 5MB)，需要压缩
开始压缩图片: /path/to/input.jpg -> /path/to/output.jpg
原始图片信息: 4096x3072, 格式: jpeg, 大小: 8.50MB
调整图片尺寸到最大 2048x2048
图片压缩完成: 1.20MB (压缩率: 85.9%)
QQ群聊最终图片信息: 2048x1536, jpeg, 1.2MB
```

## 故障排除

### 1. Sharp安装失败
```bash
# 清理缓存重试
npm cache clean --force
npm install sharp
```

### 2. 网络问题
```bash
# 使用代理
npm config set proxy http://127.0.0.1:1080
npm install sharp
```

### 3. 编译错误
Sharp需要编译原生模块，确保：
- Node.js版本 >= 12
- 系统有构建工具（Windows需要Visual Studio Build Tools）

### 4. 内存不足
如果处理大图片时内存不足，可以调整Node.js内存限制：
```bash
node --max-old-space-size=4096 src/index.js
```

## 配置调整

如需修改压缩参数，编辑 `utils/imageProcessor.js`：

```javascript
const COMPRESSION_CONFIG = {
  MAX_FILE_SIZE: 5 * 1024 * 1024,    // 最大文件大小
  MAX_WIDTH: 2048,                   // 最大宽度
  MAX_HEIGHT: 2048,                  // 最大高度
  JPEG_QUALITY: 85,                  // JPEG质量
  PNG_COMPRESSION: 8,                // PNG压缩级别
  WEBP_QUALITY: 85                   // WebP质量
};
```

## 性能影响

- **CPU使用**: 压缩过程会占用CPU资源
- **内存使用**: 处理大图片时会占用更多内存
- **处理时间**: 压缩一张8MB图片通常需要1-3秒
- **存储空间**: 临时文件会占用磁盘空间（处理完成后自动清理）

## 建议

1. **生产环境**: 建议安装Sharp以获得最佳体验
2. **开发环境**: 可以在降级模式下开发，功能不受影响
3. **服务器部署**: 确保服务器有足够的CPU和内存资源
4. **监控**: 关注日志中的压缩统计信息，必要时调整参数
