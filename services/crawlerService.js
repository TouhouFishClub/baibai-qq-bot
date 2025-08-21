/**
 * 爬虫服务
 * 负责从洛奇官网抓取最新帖子信息
 */

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * 抓取洛奇官网的帖子列表
 * @param {string} url - 洛奇官网列表页URL
 * @returns {Promise<Array>} 帖子列表
 */
async function fetchLuoqiPosts(url = 'https://luoqi.tiancity.com/homepage/article/Class_232_Time_1.html') {
  try {
    console.log(`开始抓取洛奇官网帖子: ${url}`);
    
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
      timeout: 30000,
      responseType: 'arraybuffer' // 获取原始字节数据
    });
    
    // 检测并处理编码
    let htmlContent;
    const buffer = Buffer.from(response.data);
    
    // 尝试从Content-Type头获取编码
    const contentType = response.headers['content-type'];
    let encoding = 'utf8'; // 默认编码
    
    if (contentType) {
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch) {
        encoding = charsetMatch[1].toLowerCase();
        console.log(`检测到页面编码: ${encoding}`);
      }
    }
    
    // 尝试从HTML meta标签获取编码
    const htmlStart = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    const metaCharsetMatch = htmlStart.match(/<meta[^>]+charset[^>]*content[^>]*=["']?([^"'>;]+)/i) ||
                            htmlStart.match(/<meta[^>]+content[^>]*charset[^>]*=["']?([^"'>;]+)/i) ||
                            htmlStart.match(/<meta[^>]+charset[^>]*=["']?([^"'>;]+)/i);
    
    if (metaCharsetMatch) {
      const metaEncoding = metaCharsetMatch[1].toLowerCase();
      console.log(`HTML meta标签编码: ${metaEncoding}`);
      if (metaEncoding.includes('gb') || metaEncoding.includes('gbk') || metaEncoding.includes('gb2312')) {
        encoding = 'gbk';
      } else if (metaEncoding.includes('utf-8') || metaEncoding.includes('utf8')) {
        encoding = 'utf8';
      }
    }
    
    // 根据检测到的编码转换文本
    if (encoding === 'gbk' || encoding === 'gb2312') {
      // 需要安装iconv-lite来处理GBK编码
      try {
        const iconv = require('iconv-lite');
        htmlContent = iconv.decode(buffer, 'gbk');
        console.log('使用GBK编码解析页面');
      } catch (err) {
        console.warn('iconv-lite未安装，使用UTF-8解析');
        htmlContent = buffer.toString('utf8');
      }
    } else {
      htmlContent = buffer.toString('utf8');
      console.log('使用UTF-8编码解析页面');
    }
    
    const $ = cheerio.load(htmlContent);
    const posts = [];
    
    // 解析洛奇官网的帖子列表结构
    // 格式: <ul class="newsList"><li><p><strong>【游戏】</strong><span>[2025-08-20]</span><a href="...">标题</a></p></li>...
    $('.newsList li').each((index, element) => {
      const $li = $(element);
      const $p = $li.find('p');
      const $category = $p.find('strong');
      const $span = $p.find('span');
      const $link = $p.find('a');
      
      if ($link.length > 0 && $span.length > 0) {
        const title = $link.text().trim();
        const href = $link.attr('href');
        const dateText = $span.text().trim();
        const category = $category.text().trim();
        
        // 提取日期 [YYYY-MM-DD] 格式
        const dateMatch = dateText.match(/\[(\d{4}-\d{2}-\d{2})\]/);
        
        if (title && href && dateMatch) {
          const date = dateMatch[1];
          
          // 处理相对URL
          let fullUrl = href;
          if (href.startsWith('//')) {
            fullUrl = `https:${href}`;
          } else if (href.startsWith('/')) {
            fullUrl = `https://luoqi.tiancity.com${href}`;
          } else if (!href.startsWith('http')) {
            // 相对路径
            const baseUrl = new URL(url);
            fullUrl = new URL(href, baseUrl.origin).toString();
          }
          
          // 只处理洛奇官网的链接（排除17173等外链）
          if (fullUrl.includes('luoqi.tiancity.com')) {
            posts.push({
              id: generatePostId(date, title),
              title: title,
              date: date,
              url: fullUrl,
              category: category,
              isSticky: title.includes('置顶') || title.includes('公告')
            });
          }
        }
      }
    });
    
    // 按日期排序，最新的在前
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log(`成功抓取到 ${posts.length} 篇帖子`);
    console.log(`最新帖子: ${posts.slice(0, 3).map(p => `${p.title} (${p.date})`).join(', ')}`);
    
    return posts;
    
  } catch (error) {
    console.error(`抓取洛奇官网失败 (${url}):`, error.message);
    throw error;
  }
}

/**
 * 获取帖子详情内容
 * @param {string} detailUrl - 详情页URL
 * @returns {Promise<Object>} 详情内容
 */
async function fetchPostDetail(detailUrl) {
  try {
    console.log(`获取帖子详情: ${detailUrl}`);
    
    const response = await axios.get(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 30000,
      responseType: 'arraybuffer' // 获取原始字节数据
    });
    
    // 检测并处理编码（与列表页相同的逻辑）
    let detailHtmlContent;
    const buffer = Buffer.from(response.data);
    
    const contentType = response.headers['content-type'];
    let encoding = 'utf8';
    
    if (contentType) {
      const charsetMatch = contentType.match(/charset=([^;]+)/i);
      if (charsetMatch) {
        encoding = charsetMatch[1].toLowerCase();
      }
    }
    
    const htmlStart = buffer.toString('utf8', 0, Math.min(1000, buffer.length));
    const metaCharsetMatch = htmlStart.match(/<meta[^>]+charset[^>]*content[^>]*=["']?([^"'>;]+)/i) ||
                            htmlStart.match(/<meta[^>]+content[^>]*charset[^>]*=["']?([^"'>;]+)/i) ||
                            htmlStart.match(/<meta[^>]+charset[^>]*=["']?([^"'>;]+)/i);
    
    if (metaCharsetMatch) {
      const metaEncoding = metaCharsetMatch[1].toLowerCase();
      if (metaEncoding.includes('gb') || metaEncoding.includes('gbk') || metaEncoding.includes('gb2312')) {
        encoding = 'gbk';
      }
    }
    
    if (encoding === 'gbk' || encoding === 'gb2312') {
      try {
        const iconv = require('iconv-lite');
        detailHtmlContent = iconv.decode(buffer, 'gbk');
      } catch (err) {
        detailHtmlContent = buffer.toString('utf8');
      }
    } else {
      detailHtmlContent = buffer.toString('utf8');
    }
    
    const $ = cheerio.load(detailHtmlContent);
    
    // 获取标题：.newCon > .aur > h2
    const title = $('.newCon .aur h2').text().trim();
    
    // 获取内容：#newscontent
    const $content = $('#newscontent');
    
    // 移除分享按钮和其他无关元素
    $content.find('.clearfix').remove(); // 移除分享相关的div
    $content.find('a[id*="sina"], a[id*="qq"], a[id*="baidu"]').remove(); // 移除分享链接
    
    // 获取清理后的HTML内容
    const htmlContent = $content.html();
    
    // 获取纯文本内容（用于预览）
    const textContent = $content.text().trim();
    
    console.log(`成功获取详情，标题: ${title}`);
    
    return {
      title: title,
      htmlContent: htmlContent,
      textContent: textContent,
      url: detailUrl
    };
    
  } catch (error) {
    console.error(`获取详情失败 (${detailUrl}):`, error.message);
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
 * @param {string} url - 网站URL
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
 * @param {string} url - 网站URL
 * @param {number} limit - 限制数量，默认5篇
 * @returns {Promise<Array>} 最新帖子列表
 */
async function getLatestPosts(url, limit = 5) {
  try {
    const posts = await fetchLuoqiPosts(url);
    
    // 过滤掉置顶帖子
    const filteredPosts = posts.filter(post => !post.isSticky);
    
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
 * @param {string} sourceName - 源站名称
 * @param {Object} detail - 详情内容（可选）
 * @returns {string} Markdown格式的内容
 */
function formatPostToMarkdown(post, sourceName = '洛奇官网', detail = null) {
  let content = `# ${post.title}

**发布日期**: ${post.date}

**来源**: [${sourceName}](${post.url})

---

`;

  if (detail && detail.textContent) {
    // 使用详情内容
    content += `${detail.textContent.substring(0, 500)}...

> 查看完整内容请访问：[原文链接](${post.url})

`;
  } else {
    // 使用基本信息
    content += `> 这是从${sourceName}自动抓取的最新帖子信息。

`;
  }

  content += `**帖子ID**: \`${post.id}\``;
  
  return content;
}

/**
 * 格式化帖子内容为HTML格式
 * @param {Object} post - 帖子对象
 * @param {string} sourceName - 源站名称
 * @param {Object} detail - 详情内容（可选）
 * @returns {string} HTML格式的内容
 */
function formatPostToHTML(post, sourceName = '洛奇官网', detail = null) {
  let content = `<h1>${post.title}</h1>

<p><strong>发布日期</strong>: ${post.date}</p>

<p><strong>来源</strong>: <a href="${post.url}">${sourceName}</a></p>

<hr>

`;

  if (detail && detail.htmlContent) {
    // 使用详情HTML内容
    content += `<div class="post-content">
${detail.htmlContent}
</div>

<hr>

<p><a href="${post.url}">查看原文</a></p>

`;
  } else {
    // 使用基本信息
    content += `<blockquote>
<p>这是从${sourceName}自动抓取的最新帖子信息。</p>
</blockquote>

`;
  }

  content += `<p><strong>帖子ID</strong>: <code>${post.id}</code></p>`;
  
  return content;
}

module.exports = {
  fetchLuoqiPosts,
  fetchPostDetail,
  getTodayLatestPosts,
  getLatestPosts,
  formatPostToMarkdown,
  formatPostToHTML,
  generatePostId
};