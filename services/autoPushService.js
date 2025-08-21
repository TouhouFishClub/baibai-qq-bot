/**
 * 自动推送服务
 * 负责定时检查并推送洛奇官网的最新帖子到指定频道
 */

const { 
  getLatestPosts, 
  getTodayLatestPosts, 
  formatPostToMarkdown, 
  formatPostToHTML,
  generatePostId
} = require('./crawlerService');

const { 
  publishThread,
  getChannelsList 
} = require('./forumService');

// 存储已推送的帖子ID（内存存储，重启后会清空）
let pushedPostIds = new Set();

// 推送配置
let pushConfig = {
  enabled: false,
  channelId: null,
  checkInterval: 10 * 60 * 1000, // 10分钟检查一次
  sourceUrl: 'https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html',
  format: 3, // 默认使用Markdown格式
  titlePrefix: '[洛奇资讯]'
};

// 定时器ID
let intervalId = null;

/**
 * 设置推送配置
 * @param {Object} config - 推送配置
 */
function setPushConfig(config) {
  pushConfig = { ...pushConfig, ...config };
  console.log('推送配置已更新:', pushConfig);
}

/**
 * 获取推送配置
 * @returns {Object} 当前推送配置
 */
function getPushConfig() {
  return { ...pushConfig };
}

/**
 * 检查频道中是否已存在指定帖子
 * @param {string} channelId - 频道ID
 * @param {string} postId - 帖子ID
 * @returns {Promise<boolean>} 是否已存在
 */
async function checkPostExistsInChannel(channelId, postId) {
  try {
    // 这里应该调用QQ API获取频道中的帖子列表进行检查
    // 由于QQ机器人API暂不支持获取帖子列表，我们使用内存存储来跟踪
    return pushedPostIds.has(postId);
  } catch (error) {
    console.error('检查帖子是否存在失败:', error.message);
    return false;
  }
}

/**
 * 推送单个帖子到频道
 * @param {Object} post - 帖子对象
 * @param {string} channelId - 频道ID
 * @returns {Promise<Object>} 推送结果
 */
async function pushPostToChannel(post, channelId) {
  try {
    // 检查是否已推送过
    if (await checkPostExistsInChannel(channelId, post.id)) {
      console.log(`帖子 "${post.title}" 已存在，跳过推送`);
      return { success: false, reason: 'already_exists' };
    }
    
    // 格式化帖子内容
    const title = `${pushConfig.titlePrefix} ${post.title}`;
    let content;
    
    if (pushConfig.format === 3) {
      content = formatPostToMarkdown(post);
    } else {
      content = formatPostToHTML(post);
    }
    
    console.log(`准备推送帖子: "${title}" 到频道 ${channelId}`);
    
    // 调用发帖API
    const result = await publishThread(channelId, title, content, pushConfig.format);
    
    // 记录已推送的帖子ID
    pushedPostIds.add(post.id);
    
    console.log(`帖子推送成功: ${result.task_id}`);
    return { 
      success: true, 
      data: result,
      post: post
    };
    
  } catch (error) {
    console.error(`推送帖子失败:`, error.message);
    throw error;
  }
}

/**
 * 检查并推送最新帖子
 * @returns {Promise<Array>} 推送结果列表
 */
async function checkAndPushLatestPosts() {
  try {
    if (!pushConfig.enabled || !pushConfig.channelId) {
      console.log('自动推送未启用或未配置频道ID');
      return [];
    }
    
    console.log('开始检查最新帖子...');
    
    // 获取最新帖子（优先获取今日帖子）
    let latestPosts = await getTodayLatestPosts(pushConfig.sourceUrl);
    
    // 如果今日没有新帖子，获取最近的几篇
    if (latestPosts.length === 0) {
      latestPosts = await getLatestPosts(pushConfig.sourceUrl, 3);
    }
    
    if (latestPosts.length === 0) {
      console.log('没有发现新帖子');
      return [];
    }
    
    console.log(`发现 ${latestPosts.length} 篇最新帖子`);
    
    const pushResults = [];
    
    // 逐个推送帖子
    for (const post of latestPosts) {
      try {
        const result = await pushPostToChannel(post, pushConfig.channelId);
        pushResults.push(result);
        
        // 推送间隔，避免频率过高
        if (latestPosts.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
      } catch (error) {
        console.error(`推送帖子 "${post.title}" 失败:`, error.message);
        pushResults.push({
          success: false,
          error: error.message,
          post: post
        });
      }
    }
    
    console.log(`推送检查完成，成功: ${pushResults.filter(r => r.success).length}，失败: ${pushResults.filter(r => !r.success).length}`);
    return pushResults;
    
  } catch (error) {
    console.error('检查推送失败:', error.message);
    throw error;
  }
}

/**
 * 启动自动推送
 * @param {Object} config - 推送配置
 */
function startAutoPush(config) {
  // 更新配置
  if (config) {
    setPushConfig(config);
  }
  
  // 停止现有定时器
  if (intervalId) {
    clearInterval(intervalId);
  }
  
  if (!pushConfig.enabled || !pushConfig.channelId) {
    console.log('自动推送配置不完整，无法启动');
    return false;
  }
  
  console.log(`启动自动推送，检查间隔: ${pushConfig.checkInterval / 1000}秒`);
  
  // 立即执行一次检查
  checkAndPushLatestPosts().catch(error => {
    console.error('初始推送检查失败:', error.message);
  });
  
  // 设置定时检查
  intervalId = setInterval(() => {
    checkAndPushLatestPosts().catch(error => {
      console.error('定时推送检查失败:', error.message);
    });
  }, pushConfig.checkInterval);
  
  pushConfig.enabled = true;
  console.log('自动推送已启动');
  return true;
}

/**
 * 停止自动推送
 */
function stopAutoPush() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  pushConfig.enabled = false;
  console.log('自动推送已停止');
}

/**
 * 获取推送状态
 * @returns {Object} 推送状态信息
 */
function getPushStatus() {
  return {
    enabled: pushConfig.enabled,
    channelId: pushConfig.channelId,
    checkInterval: pushConfig.checkInterval,
    pushedCount: pushedPostIds.size,
    lastCheck: intervalId ? new Date().toISOString() : null,
    config: pushConfig
  };
}

/**
 * 手动触发推送检查
 * @returns {Promise<Array>} 推送结果
 */
async function manualPushCheck() {
  console.log('手动触发推送检查...');
  return await checkAndPushLatestPosts();
}

/**
 * 清除已推送记录
 */
function clearPushedRecords() {
  pushedPostIds.clear();
  console.log('已清除所有推送记录');
}

module.exports = {
  setPushConfig,
  getPushConfig,
  startAutoPush,
  stopAutoPush,
  getPushStatus,
  manualPushCheck,
  clearPushedRecords,
  checkAndPushLatestPosts
};
