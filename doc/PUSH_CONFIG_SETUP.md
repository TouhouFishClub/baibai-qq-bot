# 推送系统配置说明

## 配置文件说明

推送系统使用以下配置文件来管理推送设置和记录：

### 1. 推送配置文件 (`data/push_configs.json`)
存储推送配置信息，包括：
- 频道ID
- 检查间隔
- 源网站URL
- 推送格式等

### 2. 推送记录文件 (`data/pushed_records.json`)
记录已经推送过的帖子ID，防止重复推送。

## 初始配置步骤

### 第一步：复制示例文件
```bash
# 复制配置文件
cp data/push_configs.example.json data/push_configs.json

# 复制记录文件
cp data/pushed_records.example.json data/pushed_records.json
```

### 第二步：编辑配置文件
编辑 `data/push_configs.json`，设置你的频道ID：

```json
[
  {
    "id": "my_config",
    "name": "我的洛奇推送",
    "enabled": false,
    "channelId": "你的实际频道ID",
    "checkInterval": 1800000,
    "sourceUrl": "https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html",
    "format": 3,
    "titlePrefix": "[洛奇资讯]",
    "sourceName": "洛奇官网"
  }
]
```

### 第三步：启动推送服务
1. 重启你的服务
2. 在管理页面启用推送配置
3. 或者通过API启动推送

## 配置参数说明

| 参数 | 说明 | 示例值 |
|------|------|--------|
| `id` | 配置唯一标识 | "my_config" |
| `name` | 配置名称 | "我的洛奇推送" |
| `enabled` | 是否启用 | false |
| `channelId` | 目标频道ID | "123456789" |
| `checkInterval` | 检查间隔（毫秒） | 1800000 (30分钟) |
| `sourceUrl` | 源网站URL | "https://luoqi.tiancity.com/..." |
| `format` | 推送格式 | 3 (Markdown) |
| `titlePrefix` | 标题前缀 | "[洛奇资讯]" |
| `sourceName` | 源站名称 | "洛奇官网" |

## 安全注意事项

⚠️ **重要**：这些配置文件包含敏感信息，已添加到 `.gitignore` 中：

- `data/push_configs.json` - 包含频道ID等敏感信息
- `data/pushed_records.json` - 包含推送历史记录
- `data/` 目录 - 整个数据目录

✅ **保留的示例文件**：
- `data/push_configs.example.json` - 配置示例
- `data/pushed_records.example.json` - 记录格式示例

## 故障排除

### 问题：推送记录丢失
**原因**：服务重启后推送记录未正确加载
**解决**：确保服务启动时调用了 `autoPushService.initializeService()`

### 问题：重复推送
**原因**：推送记录未正确保存或加载
**解决**：检查 `data/pushed_records.json` 文件是否存在且格式正确

### 问题：配置不生效
**原因**：配置文件格式错误或路径不正确
**解决**：检查JSON格式，确保文件路径正确

## 测试配置

使用提供的测试脚本验证配置：

```bash
node scripts/test-push-fix.js
```

这将检查：
- 配置文件是否正确加载
- 推送记录是否正确初始化
- 服务是否正常运行
