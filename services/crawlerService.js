/**
 * 爬虫服务
 * 负责从洛奇官网抓取最新帖子信息
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 抓取洛奇官网的最新帖子
 * @param {string} url - 洛奇官网URL
 * @returns {Promise<Array>} 帖子列表
 */
async function fetchLuoqiPosts(url = 'https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html') {
  try {
    console.log('开始抓取洛奇官网帖子...');
    
    // 设置请求头，模拟浏览器访问
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000
    });
    
    // 使用cheerio解析HTML
    const $ = cheerio.load(response.data);
    const posts = [];
    
    // 根据网站结构解析帖子信息
    // 寻找包含帖子信息的元素
    $('*').each((index, element) => {
      const text = $(element).text().trim();
      
      // 匹配日期格式 [2025-xx-xx] 的帖子
      const dateMatch = text.match(/\[(\d{4}-\d{2}-\d{2})\](.+)/);
      if (dateMatch) {
        const date = dateMatch[1];
        const title = dateMatch[2].trim();
        
        // 过滤掉空标题和重复项
        if (title && !posts.find(p => p.title === title)) {
          posts.push({
            date: date,
            title: title,
            url: url,
            id: generatePostId(date, title)
          });
        }
      }
    });
    
    // 按日期排序，最新的在前
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`成功抓取到 ${posts.length} 篇帖子`);
    return posts;
    
  } catch (error) {
    console.error('抓取洛奇官网失败:', error.message);
    throw error;
  }
}

/**
 * 生成帖子唯一ID
 * @param {string} date - 日期
 * @param {string} title - 标题
 * @returns {string} 唯一ID
 */
function generatePostId(date, title) {
  // 使用日期和标题的哈希值作为唯一ID
  const crypto = require('crypto');
  return crypto.createHash('md5').update(`${date}-${title}`).digest('hex').substring(0, 16);
}

/**
 * 获取今日最新帖子
 * @param {string} url - 洛奇官网URL
 * @returns {Promise<Array>} 今日帖子列表
 */
async function getTodayLatestPosts(url) {
  try {
    const posts = await fetchLuoqiPosts(url);
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    
    // 筛选今日帖子
    const todayPosts = posts.filter(post => post.date === today);
    
    console.log(`今日共有 ${todayPosts.length} 篇新帖子`);
    return todayPosts;
    
  } catch (error) {
    console.error('获取今日帖子失败:', error.message);
    throw error;
  }
}

/**
 * 获取最新的N篇帖子（不考虑置顶）
 * @param {string} url - 洛奇官网URL
 * @param {number} limit - 限制数量，默认5篇
 * @returns {Promise<Array>} 最新帖子列表
 */
async function getLatestPosts(url, limit = 5) {
  try {
    const posts = await fetchLuoqiPosts(url);
    
    // 过滤掉置顶帖子（通常标题包含"置顶"、"公告"等关键词）
    const filteredPosts = posts.filter(post => {
      const title = post.title.toLowerCase();
      return !title.includes('置顶') && 
             !title.includes('公告') && 
             !title.includes('维护') &&
             !title.includes('停服');
    });
    
    // 返回最新的几篇
    const latestPosts = filteredPosts.slice(0, limit);
    
    console.log(`获取到最新 ${latestPosts.length} 篇帖子（已过滤置顶）`);
    return latestPosts;
    
  } catch (error) {
    console.error('获取最新帖子失败:', error.message);
    throw error;
  }
}

/**
 * 格式化帖子内容为Markdown格式
 * @param {Object} post - 帖子对象
 * @returns {string} Markdown格式的内容
 */
function formatPostToMarkdown(post) {
  return `# ${post.title}

**发布日期**: ${post.date}

**来源**: [洛奇官网](${post.url})

---

> 这是从洛奇官网自动抓取的最新帖子信息。

**帖子ID**: \`${post.id}\`
`;
}

/**
 * 格式化帖子内容为HTML格式
 * @param {Object} post - 帖子对象
 * @returns {string} HTML格式的内容
 */
function formatPostToHTML(post) {
  return `<h1>${post.title}</h1>

<p><strong>发布日期</strong>: ${post.date}</p>

<p><strong>来源</strong>: <a href="${post.url}">洛奇官网</a></p>

<hr>

<blockquote>
<p>这是从洛奇官网自动抓取的最新帖子信息。</p>
</blockquote>

<p><strong>帖子ID</strong>: <code>${post.id}</code></p>
`;
}

module.exports = {
  fetchLuoqiPosts,
  getTodayLatestPosts,
  getLatestPosts,
  formatPostToMarkdown,
  formatPostToHTML,
  generatePostId
};
