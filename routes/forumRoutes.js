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
  publishTextThread 
} = require('../services/forumService');

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
