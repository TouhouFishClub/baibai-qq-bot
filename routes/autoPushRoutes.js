/**
 * 自动推送路由
 * 处理洛奇官网帖子的自动推送功能
 */

const express = require('express');
const router = express.Router();
const {
  setPushConfig,
  getPushConfig,
  startAutoPush,
  stopAutoPush,
  getPushStatus,
  manualPushCheck,
  clearPushedRecords
} = require('../services/autoPushService');

const {
  getLatestPosts,
  getTodayLatestPosts
} = require('../services/crawlerService');

/**
 * 获取推送状态
 * GET /auto-push/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = getPushStatus();
    
    res.json({
      success: true,
      message: '推送状态获取成功',
      data: status
    });
  } catch (error) {
    console.error('获取推送状态失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取推送状态失败'
    });
  }
});

/**
 * 配置自动推送
 * POST /auto-push/config
 * Body: {
 *   "channelId": "频道ID",
 *   "checkInterval": 600000,
 *   "format": 3,
 *   "titlePrefix": "[洛奇资讯]",
 *   "sourceUrl": "https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html"
 * }
 */
router.post('/config', async (req, res) => {
  try {
    const { channelId, checkInterval, format, titlePrefix, sourceUrl } = req.body;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: '缺少频道ID',
        message: '请提供要推送的频道ID'
      });
    }
    
    const config = {
      channelId,
      checkInterval: checkInterval || 10 * 60 * 1000, // 默认10分钟
      format: format || 3, // 默认Markdown
      titlePrefix: titlePrefix || '[洛奇资讯]',
      sourceUrl: sourceUrl || 'https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html'
    };
    
    setPushConfig(config);
    
    res.json({
      success: true,
      message: '推送配置更新成功',
      data: getPushConfig()
    });
    
  } catch (error) {
    console.error('配置推送失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '推送配置失败'
    });
  }
});

/**
 * 启动自动推送
 * POST /auto-push/start
 */
router.post('/start', async (req, res) => {
  try {
    const { config } = req.body;
    
    const result = startAutoPush(config);
    
    if (result) {
      res.json({
        success: true,
        message: '自动推送已启动',
        data: getPushStatus()
      });
    } else {
      res.status(400).json({
        success: false,
        error: '启动失败',
        message: '推送配置不完整，请先配置频道ID'
      });
    }
    
  } catch (error) {
    console.error('启动推送失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '启动自动推送失败'
    });
  }
});

/**
 * 停止自动推送
 * POST /auto-push/stop
 */
router.post('/stop', async (req, res) => {
  try {
    stopAutoPush();
    
    res.json({
      success: true,
      message: '自动推送已停止',
      data: getPushStatus()
    });
    
  } catch (error) {
    console.error('停止推送失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '停止自动推送失败'
    });
  }
});

/**
 * 手动触发推送检查
 * POST /auto-push/manual-check
 */
router.post('/manual-check', async (req, res) => {
  try {
    console.log('收到手动推送检查请求');
    
    const results = await manualPushCheck();
    
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      message: `推送检查完成，成功: ${successCount}，失败: ${failedCount}`,
      data: {
        results: results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failedCount
        }
      }
    });
    
  } catch (error) {
    console.error('手动推送检查失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '手动推送检查失败'
    });
  }
});

/**
 * 测试抓取最新帖子
 * GET /auto-push/test-crawl
 */
router.get('/test-crawl', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    console.log('测试抓取洛奇官网帖子...');
    
    // 获取今日帖子和最新帖子
    const [todayPosts, latestPosts] = await Promise.all([
      getTodayLatestPosts(),
      getLatestPosts(undefined, parseInt(limit))
    ]);
    
    res.json({
      success: true,
      message: '抓取测试完成',
      data: {
        todayPosts: todayPosts,
        latestPosts: latestPosts,
        summary: {
          todayCount: todayPosts.length,
          latestCount: latestPosts.length
        }
      }
    });
    
  } catch (error) {
    console.error('测试抓取失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '抓取测试失败'
    });
  }
});

/**
 * 清除推送记录
 * POST /auto-push/clear-records
 */
router.post('/clear-records', async (req, res) => {
  try {
    clearPushedRecords();
    
    res.json({
      success: true,
      message: '推送记录已清除',
      data: getPushStatus()
    });
    
  } catch (error) {
    console.error('清除记录失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '清除推送记录失败'
    });
  }
});

/**
 * 获取推送配置
 * GET /auto-push/config
 */
router.get('/config', async (req, res) => {
  try {
    const config = getPushConfig();
    
    res.json({
      success: true,
      message: '配置获取成功',
      data: config
    });
    
  } catch (error) {
    console.error('获取配置失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '获取推送配置失败'
    });
  }
});

module.exports = router;
