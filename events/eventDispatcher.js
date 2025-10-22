/**
 * 事件分发处理器
 * 根据不同的事件类型分发到对应的处理器
 */

const { handleGroupAtMessage } = require('../handlers/groupMessageHandler');
const { handleChannelAtMessage } = require('../handlers/channelMessageHandler');
const { handleC2CMessage, handleDirectMessage } = require('../handlers/directMessageHandler');
const { OP_CODE, EVENT_TYPE } = require('../utils/constants');
const logger = require('../utils/logger');

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
    
    logger.info(`收到事件: ${eventType}`, { 
      groupId: eventData.group_id, 
      channelId: eventData.channel_id, 
      userId: eventData.author?.id 
    });
    
    // 先发送回调确认，避免超时导致的重复推送
    // 返回HTTP回调确认，必须是op: 12的格式
    res.json({
      op: OP_CODE.HTTP_CALLBACK_ACK
    });
    
    // 然后异步处理事件
    try {
      // 根据不同的事件类型处理不同的逻辑
      switch (eventType) {
        case EVENT_TYPE.AT_MESSAGE_CREATE:
          // 处理频道@消息
          await handleChannelAtMessage(eventData, eventType);
          break;
          
        case EVENT_TYPE.MESSAGE_CREATE:
          // 处理频道普通消息（不需要@）
          await handleChannelAtMessage(eventData, eventType);
          break;
          
        case EVENT_TYPE.GROUP_AT_MESSAGE_CREATE:
          // 处理群@消息
          await handleGroupAtMessage(eventData);
          break;
          
        case EVENT_TYPE.C2C_MESSAGE_CREATE:
          // 处理QQ私信消息
          await handleC2CMessage(eventData);
          break;
          
        case EVENT_TYPE.DIRECT_MESSAGE_CREATE:
          // 处理频道私信消息
          await handleDirectMessage(eventData);
          break;
          
        default:
          logger.warn(`未处理的事件类型: ${eventType}`);
      }
    } catch (processingError) {
      // 事件处理过程中的错误不影响已发送的回调确认
      logger.error('事件处理过程中发生错误', processingError.message);
    }
  } catch (error) {
    logger.error('事件处理错误', error.message);
    // 确保在错误情况下也返回正确的回调确认格式
    return res.status(200).json({
      op: OP_CODE.HTTP_CALLBACK_ACK
    });
  }
}

module.exports = {
  handleDispatchEvent
}; 