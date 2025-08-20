/**
 * 论坛相关路由
 * 处理帖子发表等功能
 */

const express = require('express');
const router = express.Router();
const { 
  publishExampleThread,
  publishThread,
  publishMarkdownThread,
  publishTextThread,
  getChannelInfo,
  getGuildsList,
  getChannelsList
} = require('../services/forumService');

/**
 * 获取机器人所在的频道服务器列表
 * GET /put/guilds
 */
router.get('/guilds', async (req, res) => {
  try {
    console.log('收到获取频道服务器列表请求');
    
    const guildsList = await getGuildsList();
    
    res.json({
      success: true,
      message: '成功获取频道服务器列表',
      data: guildsList
    });
    
  } catch (error) {
    console.error('获取频道服务器列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '无法获取频道服务器列表，请检查机器人权限'
    });
  }
});

/**
 * 获取指定频道服务器下的子频道列表
 * GET /put/channels?guild_id=xxx
 */
router.get('/channels', async (req, res) => {
  try {
    const { guild_id } = req.query;
    
    if (!guild_id) {
      return res.status(400).json({
        success: false,
        error: '缺少guild_id参数',
        message: '请在查询参数中提供guild_id，例如: /put/channels?guild_id=频道服务器ID'
      });
    }
    
    console.log(`收到获取子频道列表请求，频道服务器ID: ${guild_id}`);
    
    const channelsList = await getChannelsList(guild_id);
    
    res.json({
      success: true,
      message: '成功获取子频道列表',
      data: channelsList
    });
    
  } catch (error) {
    console.error('获取子频道列表失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '无法获取子频道列表，请检查频道服务器ID是否正确'
    });
  }
});

/**
 * 调试路由 - 获取频道信息
 * GET /put/debug?channel_id=xxx
 */
router.get('/debug', async (req, res) => {
  try {
    const { channel_id } = req.query;
    
    if (!channel_id) {
      return res.status(400).json({
        success: false,
        error: '缺少channel_id参数',
        message: '请在查询参数中提供channel_id，例如: /put/debug?channel_id=频道ID'
      });
    }
    
    console.log(`收到调试请求，频道ID: ${channel_id}`);
    
    // 尝试获取频道信息
    const channelInfo = await getChannelInfo(channel_id);
    
    res.json({
      success: true,
      message: '成功获取频道信息',
      data: channelInfo
    });
    
  } catch (error) {
    console.error('获取频道信息失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '无法获取频道信息，可能频道不存在或机器人无权限访问'
    });
  }
});

/**
 * 测试发帖功能 - 发送示例帖子
 * GET /put/test?channel_id=xxx
 */
router.get('/test', async (req, res) => {
  try {
    const { channel_id } = req.query;
    
    if (!channel_id) {
      return res.status(400).json({
        success: false,
        error: '缺少channel_id参数',
        message: '请在查询参数中提供channel_id，例如: /put/test?channel_id=频道ID'
      });
    }
    
    console.log(`收到测试发帖请求，频道ID: ${channel_id}`);
    
    // 先尝试获取频道信息进行验证
    try {
      const channelInfo = await getChannelInfo(channel_id);
      console.log('频道验证成功，频道信息:', channelInfo);
    } catch (debugError) {
      console.warn('频道信息获取失败，但继续尝试发帖:', debugError.message);
    }
    
    // 调用发帖服务发送示例帖子
    const result = await publishExampleThread(channel_id);
    
    res.json({
      success: true,
      message: '示例帖子发送成功',
      data: result
    });
    
  } catch (error) {
    console.error('测试发帖失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '发帖失败，请检查频道ID是否正确以及机器人是否有发帖权限'
    });
  }
});

/**
 * 自定义发帖功能
 * POST /put/custom
 * Body: {
 *   "channel_id": "频道ID",
 *   "title": "帖子标题", 
 *   "content": "帖子内容",
 *   "format": 1-4 (可选，默认为2-HTML)
 * }
 */
router.post('/custom', async (req, res) => {
  try {
    const { channel_id, title, content, format = 2 } = req.body;
    
    if (!channel_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数',
        message: '请提供channel_id、title和content参数'
      });
    }
    
    console.log(`收到自定义发帖请求，频道ID: ${channel_id}, 标题: ${title}`);
    
    // 调用发帖服务
    const result = await publishThread(channel_id, title, content, format);
    
    res.json({
      success: true,
      message: '帖子发送成功',
      data: result
    });
    
  } catch (error) {
    console.error('自定义发帖失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '发帖失败，请检查参数是否正确以及机器人是否有发帖权限'
    });
  }
});

/**
 * 发表Markdown格式帖子
 * POST /put/markdown
 * Body: {
 *   "channel_id": "频道ID",
 *   "title": "帖子标题",
 *   "content": "Markdown内容"
 * }
 */
router.post('/markdown', async (req, res) => {
  try {
    const { channel_id, title, content } = req.body;
    
    if (!channel_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数',
        message: '请提供channel_id、title和content参数'
      });
    }
    
    console.log(`收到Markdown发帖请求，频道ID: ${channel_id}, 标题: ${title}`);
    
    // 调用Markdown发帖服务
    const result = await publishMarkdownThread(channel_id, title, content);
    
    res.json({
      success: true,
      message: 'Markdown帖子发送成功',
      data: result
    });
    
  } catch (error) {
    console.error('Markdown发帖失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '发帖失败，请检查参数是否正确以及机器人是否有发帖权限'
    });
  }
});

/**
 * 发表纯文本格式帖子
 * POST /put/text
 * Body: {
 *   "channel_id": "频道ID",
 *   "title": "帖子标题",
 *   "content": "文本内容"
 * }
 */
router.post('/text', async (req, res) => {
  try {
    const { channel_id, title, content } = req.body;
    
    if (!channel_id || !title || !content) {
      return res.status(400).json({
        success: false,
        error: '缺少必需参数',
        message: '请提供channel_id、title和content参数'
      });
    }
    
    console.log(`收到文本发帖请求，频道ID: ${channel_id}, 标题: ${title}`);
    
    // 调用文本发帖服务
    const result = await publishTextThread(channel_id, title, content);
    
    res.json({
      success: true,
      message: '文本帖子发送成功',
      data: result
    });
    
  } catch (error) {
    console.error('文本发帖失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '发帖失败，请检查参数是否正确以及机器人是否有发帖权限'
    });
  }
});

module.exports = router;
