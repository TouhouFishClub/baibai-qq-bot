# 日志系统精简更新

## 更新内容

本次更新对项目的日志输出进行了全面精简，创建了统一的日志管理系统。

### 主要改进

1. **创建统一日志工具** (`utils/logger.js`)
   - 支持不同级别的日志输出 (ERROR, WARN, INFO, DEBUG)
   - 自动添加时间戳
   - 可通过环境变量 `LOG_LEVEL` 控制日志级别

2. **精简日志输出**
   - 移除了过于详细的调试信息
   - 只保留重要的业务信息
   - 错误信息更加简洁明了

3. **专用日志函数**
   - `logger.service()` - 服务启动和状态信息
   - `logger.api()` - API请求日志
   - `logger.push()` - 推送操作日志
   - `logger.command()` - 命令处理日志
   - `logger.message()` - 用户消息日志
   - `logger.reply()` - 机器人回复日志

4. **统一的消息格式**
   - 用户消息：`[时间] [平台][用户名] 消息内容`
   - 机器人回复：`[时间] [平台][发送] 回复内容`
   - 图片消息：`[时间] [平台][发送] [图片:base64=预览...,path=文件路径]`

### 日志级别说明

- **ERROR**: 错误信息，总是显示
- **WARN**: 警告信息
- **INFO**: 一般信息（默认级别）
- **DEBUG**: 调试信息，仅在开发时显示

### 环境变量配置

在 `.env` 文件中设置日志级别：

```bash
# 生产环境推荐使用 INFO 或 WARN
LOG_LEVEL=INFO

# 开发环境可以使用 DEBUG
LOG_LEVEL=DEBUG
```

### 更新的文件

- `utils/logger.js` - 新增统一日志工具
- `handlers/groupMessageHandler.js` - 精简群消息处理日志
- `services/messageService.js` - 精简消息服务日志
- `middlewares/signatureVerification.js` - 精简签名验证日志
- `utils/imageProcessor.js` - 精简图片处理日志
- `services/autoPushService.js` - 精简推送服务日志
- `events/eventDispatcher.js` - 精简事件分发日志
- `controllers/webhookController.js` - 精简Webhook日志
- `src/index.js` - 精简主服务器日志

### 日志输出示例

**之前**（过于详细）:
```
2025-10-22T03:32:21.832Z - POST /qq/webhook
签名验证调试信息:
- 事件类型: GROUP_AT_MESSAGE_CREATE
- 时间戳: 1761103941
- 使用原始请求体: true
- 请求体长度: 628
- 签名消息长度: 638
收到QQ Webhook请求: {"op":0,"id":"GROUP_AT_MESSAGE_CREATE:..."}
处理群中@机器人消息: {...}
收到有效命令: mbi
命令内容: 毁坏
发送API请求: http://flanb.msharebox.com:10086/openapi/mbi {...}
API响应结果: {...}
从base64创建临时图片: /data/project/baibai-qq-bot/public/temp_images/31672.png.temp
图片文件大小: 0.10MB
图片尺寸: 400x584, 像素: 0.2M, 长宽比: 1.5:1
图片无需压缩，直接复制: /data/project/baibai-qq-bot/public/temp_images/31672.png.temp -> /data/project/baibai-qq-bot/public/temp_images/31672.png
清理临时文件: /data/project/baibai-qq-bot/public/temp_images/31672.png.temp
图片处理完成: /data/project/baibai-qq-bot/public/temp_images/31672.png
最终图片信息: 400x584, png, 0.1MB
原始文件名: 31672.png
编码后URL: https://flandre.com.cn/baibai//temp_images/31672.png
```

**现在**（简洁明了）:
```
[2025-10-22 11:32:21] API: POST /qq/webhook
[2025-10-22 11:32:21] INFO: 收到事件: GROUP_AT_MESSAGE_CREATE
[2025-10-22 11:32:21] [频道][芙兰朵露·斯卡雷特] 1+1
[2025-10-22 11:32:21] [频道][发送] 1+1=2
[2025-10-22 11:32:21] [频道][芙兰朵露·斯卡雷特] opt 求道者
[2025-10-22 11:32:21] [频道][发送] [图片:base64=iVBORw0KGgoAAAANSUhE...,path=send/mabi/31609.png]
[2025-10-22 11:32:21] [频道][发送] 查询到复数释放卷，请选择：...
```

### 优势

1. **可读性更强** - 重要信息一目了然
2. **性能更好** - 减少不必要的字符串操作和输出
3. **便于维护** - 统一的日志格式和管理
4. **灵活配置** - 可根据环境调整日志级别
5. **问题定位** - 保留关键错误信息，便于排查问题

## 使用建议

- 生产环境建议设置 `LOG_LEVEL=INFO` 或 `LOG_LEVEL=WARN`
- 开发环境可以设置 `LOG_LEVEL=DEBUG` 查看详细信息
- 如需查看API响应详情，可临时调整为DEBUG级别

