# 图片质量调优指南

## 🎯 新的高质量压缩策略

基于您的反馈，我们已经将图片压缩策略从"积极压缩"调整为"高质量保真"模式。

### 📊 主要改进

#### 1. **更宽松的触发条件**
- 文件大小限制：5MB → **8MB**
- 最大宽度：2048px → **3840px** (4K)
- 最大高度：2048px → **2160px** (4K)
- 新增像素数检查：**1600万像素**

#### 2. **动态质量调整**
根据原始文件大小智能选择压缩参数：

| 文件大小 | JPEG质量 | PNG级别 | 策略 |
|---------|----------|---------|------|
| ≤2MB | 98% | 3 | 几乎无损 |
| 2-5MB | 95% | 5 | 高质量 |
| 5-10MB | 90% | 6 | 平衡 |
| >10MB | 85% | 7 | 适度压缩 |

#### 3. **高质量技术优化**
- **JPEG**: 4:4:4色度子采样 (无色彩损失)
- **PNG**: 小文件完全无损
- **WebP**: 1MB以下无损模式
- **重采样**: Lanczos3算法 (最高质量)

## 🔧 自定义配置

如需进一步调整，编辑 `utils/imageProcessor.js`：

### 调整触发阈值
```javascript
const COMPRESSION_CONFIG = {
  MAX_FILE_SIZE: 8 * 1024 * 1024,    // 8MB，可调整为10MB、12MB等
  MAX_WIDTH: 3840,                   // 4K宽度，可调整为4096
  MAX_HEIGHT: 2160,                  // 4K高度，可调整为2304
  // ...
};
```

### 调整质量参数
```javascript
function getDynamicCompressionConfig(originalSizeMB, format) {
  if (originalSizeMB <= 2) {
    quality = 99;        // 可调整为99甚至100
    compressionLevel = 2; // PNG最低压缩
  }
  // ...
}
```

### 完全禁用压缩
如果希望某些场景不压缩，可以修改 `needsCompression` 函数：

```javascript
async function needsCompression(filePath) {
  // 返回 false 完全禁用压缩
  return false;
}
```

## 📈 质量对比

### 旧策略 vs 新策略

**旧策略 (积极压缩)**:
- 5MB限制，2K分辨率
- 固定85%质量
- 4:2:0色度子采样
- 结果：文件小但可能模糊

**新策略 (高质量保真)**:
- 8MB限制，4K分辨率  
- 动态98-85%质量
- 4:4:4色度子采样
- 结果：保持清晰度，文件适中

### 实际效果预期

**小图片 (≤2MB)**:
- 压缩率：5-15%
- 视觉效果：几乎无差别
- 适用：头像、表情、小图

**中等图片 (2-5MB)**:
- 压缩率：20-35%
- 视觉效果：高质量保持
- 适用：截图、照片

**大图片 (>5MB)**:
- 压缩率：40-70%
- 视觉效果：清晰可读
- 适用：高分辨率图片

## ⚙️ 高级优化选项

### 1. 格式特定优化

**JPEG优化**:
```javascript
pipeline = pipeline.jpeg({
  quality: dynamicConfig.quality,
  progressive: true,           // 渐进式加载
  mozjpeg: true,              // MozJPEG编码器
  chromaSubsampling: '4:4:4', // 无色度子采样
  optimiseScans: true,        // 优化扫描
  trellisQuantisation: true,  // 网格量化
  overshootDeringing: true,   // 减少振铃效应
  optimiseCoding: true        // 优化编码
});
```

**PNG优化**:
```javascript
pipeline = pipeline.png({
  compressionLevel: level,    // 动态压缩级别
  progressive: true,          // 渐进式
  palette: true,             // 调色板优化
  effort: 10,                // 最大努力度
  quality: 100               // 小文件保持100%
});
```

**WebP优化**:
```javascript
pipeline = pipeline.webp({
  quality: quality,           // 动态质量
  lossless: isSmall,         // 小文件无损
  effort: 6,                 // 高努力度
  alphaQuality: 100,         // Alpha通道质量
  smartSubsample: false      // 禁用智能子采样
});
```

### 2. 重采样算法选择

```javascript
// 高质量重采样 (当前使用)
kernel: sharp.kernel.lanczos3

// 其他选项:
kernel: sharp.kernel.lanczos2  // 稍快，质量略低
kernel: sharp.kernel.cubic     // 平衡
kernel: sharp.kernel.mitchell  // 锐化效果
```

### 3. 内存和性能优化

```javascript
// 对于超大图片，可以启用流处理
const image = sharp(inputPath, {
  limitInputPixels: false,    // 不限制输入像素
  sequentialRead: true,       // 顺序读取
  density: 300               // 设置DPI
});
```

## 🚀 使用建议

### 生产环境
1. 使用当前的高质量配置
2. 监控处理时间和内存使用
3. 根据用户反馈微调参数

### 特殊需求
1. **极高质量要求**: 提高所有质量参数到98-100%
2. **存储空间限制**: 降低文件大小阈值到5MB
3. **处理速度优先**: 使用更快的重采样算法

### 监控指标
关注日志中的以下信息：
- 压缩率 (建议≤50%以保持质量)
- 处理时间 (建议≤5秒)
- 最终文件大小 (建议≤10MB)

## 🔍 故障排除

### 图片仍然模糊
1. 检查原图质量是否本身较低
2. 提高质量参数到99%
3. 禁用尺寸调整 (设置更大的MAX_WIDTH/HEIGHT)

### 文件太大
1. 降低质量参数
2. 启用更积极的尺寸调整
3. 考虑转换为WebP格式

### 处理太慢
1. 降低effort参数
2. 使用更快的重采样算法
3. 增加服务器内存和CPU

通过这些优化，您的机器人现在应该能够提供高质量的图片处理，既保持清晰度又控制文件大小！
