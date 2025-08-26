/**
 * 受保护的自动推送路由
 * 处理洛奇官网帖子的自动推送功能，需要管理员认证
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
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
  getTodayLatestPosts,
  fetchPostDetail
} = require('../services/crawlerService');

// 应用认证中间件到所有路由
router.use(authenticateToken);

/**
 * 获取推送状态
 * GET /auto-push/status
 * Headers: Authorization: Bearer TOKEN
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
 * Headers: Authorization: Bearer TOKEN
 * Body: {
 *   "channelId": "频道ID",
 *   "checkInterval": 600000,
 *   "format": 3,
 *   "titlePrefix": "[洛奇资讯]",
 *   "sourceUrl": "https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html",
 *   "sourceName": "洛奇官网"
 * }
 */
router.post('/config', async (req, res) => {
  try {
    const { channelId, checkInterval, format, titlePrefix, sourceUrl, sourceName } = req.body;
    
    if (!channelId) {
      return res.status(400).json({
        success: false,
        error: '缺少频道ID',
        message: '请提供要推送的频道ID'
      });
    }
    
    // 验证URL格式
    if (sourceUrl) {
      try {
        new URL(sourceUrl);
      } catch (e) {
        return res.status(400).json({
          success: false,
          error: 'URL格式无效',
          message: '请提供有效的源URL'
        });
      }
    }
    
    const config = {
      channelId,
      checkInterval: checkInterval || 10 * 60 * 1000, // 默认10分钟
      format: format || 3, // 默认Markdown
      titlePrefix: titlePrefix || '[洛奇资讯]',
      sourceUrl: sourceUrl || 'https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html',
      sourceName: sourceName || '洛奇官网'
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
 * Headers: Authorization: Bearer TOKEN
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
 * Headers: Authorization: Bearer TOKEN
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
 * Headers: Authorization: Bearer TOKEN
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
 * GET /auto-push/test-crawl?url=xxx&limit=5
 * Headers: Authorization: Bearer TOKEN
 */
router.get('/test-crawl', async (req, res) => {
  try {
    const { limit = 5, url } = req.query;
    const { getPushConfig } = require('../services/autoPushService');
    
    // 使用查询参数中的URL，或配置中的URL，或默认URL
    const testUrl = url || getPushConfig().sourceUrl;
    
    console.log(`测试抓取网站帖子: ${testUrl}`);
    
    // 获取今日帖子和最新帖子
    const [todayPosts, latestPosts] = await Promise.all([
      getTodayLatestPosts(testUrl),
      getLatestPosts(testUrl, parseInt(limit))
    ]);
    
    res.json({
      success: true,
      message: '抓取测试完成',
      data: {
        sourceUrl: testUrl,
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
 * Headers: Authorization: Bearer TOKEN
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
 * Headers: Authorization: Bearer TOKEN
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

/**
 * 测试详情抓取
 * GET /auto-push/test-detail?url=xxx
 * Headers: Authorization: Bearer TOKEN
 */
router.get('/test-detail', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: '缺少URL参数',
        message: '请提供要测试的详情页URL'
      });
    }
    
    console.log(`测试详情抓取: ${url}`);
    
    const detail = await fetchPostDetail(url);
    
    res.json({
      success: true,
      message: '详情抓取测试完成',
      data: {
        url: url,
        title: detail.title,
        textPreview: detail.textContent ? detail.textContent.substring(0, 200) + '...' : '',
        htmlLength: detail.htmlContent ? detail.htmlContent.length : 0,
        hasContent: !!detail.htmlContent
      }
    });
    
  } catch (error) {
    console.error('测试详情抓取失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: '详情抓取测试失败'
    });
  }
});

module.exports = router;

