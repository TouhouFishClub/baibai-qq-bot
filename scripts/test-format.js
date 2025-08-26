/**
 * 测试帖子格式化效果的脚本
 * 验证修复后的格式化结构
 */

const { formatPostToMarkdown, formatPostToHTML } = require('../services/crawlerService');

// 模拟帖子数据
const mockPost = {
  id: 'test123',
  title: '测试帖子标题',
  date: '2025-08-26',
  url: 'https://luoqi.tiancity.com/test-article.html'
};

// 模拟详情内容
const mockDetail = {
  textContent: '这是一段测试的帖子内容，用来验证格式化效果。内容应该显示在正文部分，而标题、日期和来源信息应该按照新的结构排列。',
  htmlContent: '<p>这是一段测试的帖子内容，用来验证格式化效果。</p><p>内容应该显示在正文部分，而标题、日期和来源信息应该按照新的结构排列。</p>'
};

console.log('=== 帖子格式化测试 ===\n');

// 测试Markdown格式
console.log('📝 Markdown格式（有详情内容）:');
console.log('---');
const markdownWithDetail = formatPostToMarkdown(mockPost, '洛奇官网', mockDetail);
console.log(markdownWithDetail);
console.log('\n');

console.log('📝 Markdown格式（无详情内容）:');
console.log('---');
const markdownWithoutDetail = formatPostToMarkdown(mockPost, '洛奇官网');
console.log(markdownWithoutDetail);
console.log('\n');

// 测试HTML格式
console.log('🌐 HTML格式（有详情内容）:');
console.log('---');
const htmlWithDetail = formatPostToHTML(mockPost, '洛奇官网', mockDetail);
console.log(htmlWithDetail);
console.log('\n');

console.log('🌐 HTML格式（无详情内容）:');
console.log('---');
const htmlWithoutDetail = formatPostToHTML(mockPost, '洛奇官网');
console.log(htmlWithoutDetail);
console.log('\n');

// 验证修复效果
console.log('=== 修复效果验证 ===');

const checks = [
  {
    name: '移除重复标题',
    check: (content) => !content.includes('# 测试帖子标题') && !content.includes('<h1>测试帖子标题</h1>'),
    passed: true
  },
  {
    name: '日期在正文下面',
    check: (content) => {
      // 检查日期是否在正文内容之后
      const contentStart = content.indexOf('测试的帖子内容') !== -1 ? content.indexOf('测试的帖子内容') : content.indexOf('这是从洛奇官网');
      const datePos = content.indexOf('发布日期');
      return datePos > contentStart;
    },
    passed: true
  },
  {
    name: '来源在日期下面',
    check: (content) => {
      // 更精确的检查：查找格式化后的来源标签
      const datePos = content.indexOf('**发布日期**');
      const sourcePos = content.indexOf('**来源**');
      
      // 对于HTML格式，查找对应的标签
      if (datePos === -1) {
        const htmlDatePos = content.indexOf('<strong>发布日期</strong>');
        const htmlSourcePos = content.indexOf('<strong>来源</strong>');
        return htmlDatePos !== -1 && htmlSourcePos !== -1 && htmlSourcePos > htmlDatePos;
      }
      
      return datePos !== -1 && sourcePos !== -1 && sourcePos > datePos;
    },
    passed: true
  },
  {
    name: '移除帖子ID',
    check: (content) => !content.includes('test123'),
    passed: true
  },
  {
    name: '移除重复的查看原文链接',
    check: (content) => !content.includes('查看原文') && !content.includes('原文链接'),
    passed: true
  }
];

// 检查所有格式
const allFormats = [
  { name: 'Markdown(有详情)', content: markdownWithDetail },
  { name: 'Markdown(无详情)', content: markdownWithoutDetail },
  { name: 'HTML(有详情)', content: htmlWithDetail },
  { name: 'HTML(无详情)', content: htmlWithoutDetail }
];

allFormats.forEach(format => {
  console.log(`\n🔍 检查 ${format.name}:`);
  
  checks.forEach(check => {
    const result = check.check(format.content);
    if (result) {
      console.log(`  ✅ ${check.name}`);
    } else {
      console.log(`  ❌ ${check.name}`);
      check.passed = false;
      
      // 添加调试信息
      if (check.name === '来源在日期下面') {
        const datePos = format.content.indexOf('发布日期');
        const sourcePos = format.content.indexOf('来源');
        console.log(`     调试: 日期位置=${datePos}, 来源位置=${sourcePos}`);
      }
    }
  });
});

// 总结
const allPassed = checks.every(check => check.passed);
console.log('\n=== 总结 ===');
if (allPassed) {
  console.log('🎉 所有检查都通过了！帖子格式化结构修复成功。');
} else {
  console.log('⚠️  部分检查未通过，需要进一步修复。');
}

console.log('\n💡 修复后的结构特点:');
console.log('1. 正文内容直接显示，没有重复标题');
console.log('2. 发布日期在正文下面');
console.log('3. 来源信息在日期下面');
console.log('4. 不显示帖子ID');
console.log('5. 避免重复的链接信息');
