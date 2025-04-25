/**
 * 事件分发处理器
 * 根据不同的事件类型分发到对应的处理器
 */

const { handleGroupAtMessage } = require('../handlers/groupMessageHandler');
const { OP_CODE, EVENT_TYPE } = require('../utils/constants');

/**
 * 处理分发事件
 */
async function handleDispatchEvent(payload, res) {
  try {
    if (!payload.t || !payload.d) {
      return res.status(400).json({ error: '无效的事件格式' });
    }
    
    const eventType = payload.t;
    const eventData = payload.d;
    
    console.log(`收到事件: ${eventType}`, JSON.stringify(eventData));
    
    // 根据不同的事件类型处理不同的逻辑
    switch (eventType) {
      case EVENT_TYPE.GROUP_AT_MESSAGE_CREATE:
        // 处理群@消息
        await handleGroupAtMessage(eventData);
        break;
        
      // TODO: 添加其他事件类型的处理
      // case EVENT_TYPE.DIRECT_MESSAGE_CREATE:
      //   await handleDirectMessage(eventData);
      //   break;
        
      default:
        console.log(`未处理的事件类型: ${eventType}`);
    }
    
    // 返回HTTP回调确认


    console.log('=== 事件处理完成 ===\n\n\n\n\n\n\n');
    return res.json({
      id: payload.id,
      op: OP_CODE.HTTP_CALLBACK_ACK
    });
    
  } catch (error) {
    console.error('事件处理错误:', error);
    return res.status(500).json({
      code: 500,
      message: '事件处理失败',
      error: error.message
    });
  }
}

module.exports = {
  handleDispatchEvent
}; 