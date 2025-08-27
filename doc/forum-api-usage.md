# QQ机器人论坛发帖功能使用说明

## 概述
基于QQ机器人官方API实现的频道论坛发帖功能，支持多种格式的帖子发表，提供完整的Web管理界面。

## 前置条件
1. 确保已配置环境变量：
   - `QQ_BOT_APP_ID`: 机器人应用ID
   - `QQ_BOT_SECRET`: 机器人应用密钥

2. 机器人需要具备以下权限：
   - 频道论坛发帖权限
   - 公域机器人暂不支持，仅私域机器人可用

## 🎯 **管理页面**（推荐使用）

访问 `http://localhost:3000/admin` 打开Web管理界面，包含以下功能：

### 特性
- 📝 **双编辑器支持**：Markdown和HTML富文本编辑器
- 🎨 **实时预览**：边写边看效果
- 📋 **频道选择器**：自动加载机器人可用的频道
- ✅ **智能验证**：参数验证和错误提示
- 🎯 **一键发布**：选择频道，编写内容，一键发布

### 使用步骤
1. 打开管理页面：`http://localhost:3000/admin`
2. 点击"加载频道服务器"获取可用频道
3. 选择要发布文章的论坛频道
4. 输入文章标题
5. 选择编辑器类型（Markdown或HTML）
6. 编写文章内容
7. 预览确认后点击"发布文章"

## 📋 **API接口列表**

### 1. API状态检查
**路径**: `GET /put/status`  
**用途**: 检查API服务状态和机器人认证

**响应**:
```json
{
  "success": true,
  "message": "API服务正常",
  "data": {
    "status": "healthy",
    "timestamp": "2025-08-20T09:00:00.000Z",
    "token_status": "valid"
  }
}
```

### 2. 获取频道服务器列表
**路径**: `GET /put/guilds`  
**用途**: 获取机器人加入的所有频道服务器

**响应**:
```json
{
  "success": true,
  "message": "成功获取频道服务器列表",
  "data": [
    {
      "id": "12148009036197945045",
      "name": "百百测试频道",
      "member_count": 3,
      "max_members": 30
    }
  ]
}
```

### 3. 获取子频道列表
**路径**: `GET /put/channels?guild_id=频道服务器ID`  
**用途**: 获取指定频道服务器下的所有子频道

**响应**:
```json
{
  "success": true,
  "message": "成功获取子频道列表",
  "data": [
    {
      "id": "703749592",
      "name": "讨论板",
      "type": 10007,
      "guild_id": "7376925271024095172"
    }
  ]
}
```

**注意**: 只有`type: 10007`的频道支持论坛发帖功能

### 2. 自定义发帖
**路径**: `POST /put/custom`  
**Content-Type**: `application/json`

**请求体**:
```json
{
  "channel_id": "频道ID",
  "title": "帖子标题",
  "content": "帖子内容",
  "format": 2
}
```

**format参数说明**:
- `1`: 普通文本
- `2`: HTML (默认)
- `3`: Markdown  
- `4`: JSON格式

### 3. Markdown格式发帖
**路径**: `POST /put/markdown`  
**Content-Type**: `application/json`

**请求体**:
```json
{
  "channel_id": "频道ID",
  "title": "帖子标题",
  "content": "# 标题\n\n这是**Markdown**内容"
}
```

### 4. 纯文本格式发帖
**路径**: `POST /put/text`  
**Content-Type**: `application/json`

**请求体**:
```json
{
  "channel_id": "频道ID", 
  "title": "帖子标题",
  "content": "这是纯文本内容"
}
```

## 示例帖子内容
测试接口 `/put/test` 会发送以下示例内容：

**标题**: `title`

**内容** (HTML格式):
```html
<html lang="en-US">
<body>
  <a href="https://bot.q.qq.com/wiki" title="QQ机器人文档Title">QQ机器人文档</a>
  <ul>
    <li>主动消息：发送消息时，未填msg_id字段的消息。</li>
    <li>被动消息：发送消息时，填充了msg_id字段的消息。</li>
  </ul>
</body>
</html>
```

## 错误处理
所有API都会返回统一的错误格式：

```json
{
  "success": false,
  "error": "错误信息",
  "message": "用户友好的错误说明"
}
```

常见错误：
- `400`: 缺少必需参数
- `500`: 服务器内部错误，可能是权限不足或频道ID错误

## 使用步骤
1. 启动服务器: `npm start` 或 `npm run dev`
2. 获取频道ID (在QQ频道中右键复制频道ID)
3. 调用相应的API接口
4. 检查返回的`task_id`确认发帖成功

## 注意事项
1. 私域机器人需要先从频道移除，然后重新添加才能生效
2. 频道ID是必需参数，确保使用正确的频道ID
3. 机器人需要在目标频道中并具有发帖权限
4. API返回的是任务ID，实际发帖可能需要一些时间处理
