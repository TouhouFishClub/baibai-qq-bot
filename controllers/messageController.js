/**
 * 消息控制器
 * 处理与消息相关的业务逻辑
 */

// 处理接收到的消息
exports.handleMessage = async (req, res) => {
  try {
    const { sender, content, type } = req.body;
    
    // 这里可以添加消息处理逻辑
    // 例如：分析消息内容、调用AI服务、查询数据库等
    
    // 示例：简单的回复逻辑
    let reply = '';
    
    if (content.includes('你好')) {
      reply = '你好！我是BaiBai机器人，有什么可以帮助你的吗？';
    } else if (content.includes('帮助')) {
      reply = '我可以回答问题、查询信息，或者陪你聊天。请告诉我你需要什么帮助。';
    } else {
      reply = '收到你的消息了，我会尽快处理。';
    }
    
    return res.status(200).json({
      success: true,
      message: '消息处理成功',
      reply
    });
    
  } catch (error) {
    console.error('消息处理错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
};

// 获取历史消息
exports.getMessageHistory = async (req, res) => {
  try {
    const { userId, limit = 10 } = req.query;
    
    // 这里应该从数据库获取历史消息
    // 示例返回
    const mockHistory = [
      { id: 1, sender: userId, content: '你好', timestamp: new Date(Date.now() - 3600000) },
      { id: 2, sender: 'bot', content: '你好！有什么可以帮助你的吗？', timestamp: new Date(Date.now() - 3590000) }
    ];
    
    return res.status(200).json({
      success: true,
      data: mockHistory
    });
    
  } catch (error) {
    console.error('获取历史消息错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}; 