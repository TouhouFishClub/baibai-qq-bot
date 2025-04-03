# BaiBai QQ机器人服务

一个基于Express的QQ机器人API服务，用于处理QQ消息和提供API接口。

## 功能特点

- RESTful API设计
- 消息处理和响应
- 支持API密钥认证
- 可配置的环境设置
- QQ机器人Webhook事件处理

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 生产环境启动

```bash
npm start
```

## API接口

### 状态检查

```
GET /api/status
```

返回服务器当前状态和时间戳。

### 发送消息

```
POST /api/message
Headers: 
  x-api-key: your-api-key
Body:
  {
    "sender": "123456789",
    "content": "你好",
    "type": "text"
  }
```

### 获取历史消息

```
GET /api/message/history?userId=123456789&limit=10
Headers: 
  x-api-key: your-api-key
```

### 测试接口

```
POST /api/test/echo
Body:
  {
    "content": "测试内容"
  }
```

## QQ机器人Webhook

本服务支持处理QQ机器人平台的事件订阅与通知。配置QQ开放平台的Webhook地址为：

```
http://your-server-ip:3000/qq/webhook
```

支持以下事件类型：

- AT_MESSAGE_CREATE: 机器人被@时的消息
- DIRECT_MESSAGE_CREATE: 私聊消息
- GROUP_ADD_ROBOT: 机器人被添加到群
- 更多事件支持中...

### Webhook数据结构

QQ平台会将事件通过Webhook方式推送到服务器。数据结构（Payload）如下：

```json
{
  "id":"event_id",
  "op": 0,
  "d": {},
  "s": 42,
  "t": "GATEWAY_EVENT_NAME"
}
```

### OpCode含义
- 0: Dispatch - 服务端进行消息推送
- 13: 回调地址验证 - 开放平台对机器人服务端进行验证
- 更多OpCode详见代码...

## 配置项

可以通过环境变量或修改`src/config.js`文件来配置应用：

- `PORT`: 服务器端口
- `NODE_ENV`: 运行环境
- `API_KEY`: API访问密钥
- `BOT_QQ`: 机器人QQ号
- `BOT_NAME`: 机器人名称
- `ADMIN_QQ`: 管理员QQ号
- `QQ_APPID`: QQ机器人appid
- `QQ_SECRET`: QQ机器人secret
- `QQ_TOKEN`: QQ机器人token (如果有)
- `QQ_SANDBOX`: 是否使用沙箱环境（true/false）

## 项目结构

```
baibai-qq-bot/
├── src/
│   ├── index.js       # 入口文件
│   └── config.js      # 配置文件
├── routes/
│   └── api.js         # API路由
├── controllers/
│   ├── messageController.js  # 消息控制器
│   └── webhookController.js  # Webhook控制器
├── middlewares/
│   └── auth.js        # 认证中间件
├── package.json
└── README.md
```

## 开发计划

- [x] 基础API框架
- [x] QQ机器人Webhook支持
- [ ] 集成QQ机器人SDK
- [ ] 添加数据库支持
- [ ] 实现用户管理功能
- [ ] 添加消息队列处理
- [ ] 实现AI回复功能

## 协议

MIT 