/**
 * 测试推送逻辑的脚本
 * 验证新的时间检查功能是否正常工作
 */

// 模拟帖子数据
const mockPosts = [
  {
    id: 'post1',
    title: '今天的文章1',
    date: new Date().toISOString().split('T')[0], // 今天
    url: 'https://example.com/post1'
  },
  {
    id: 'post2',
    title: '今天的文章2',
    date: new Date().toISOString().split('T')[0], // 今天
    url: 'https://example.com/post2'
  },
  {
    id: 'post3',
    title: '昨天的文章',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 昨天
    url: 'https://example.com/post3'
  },
  {
    id: 'post4',
    title: '前天的文章',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 前天
    url: 'https://example.com/post4'
  }
];

// 模拟已推送的帖子ID
const pushedPostIds = new Set(['post1']);

console.log('=== 推送逻辑测试 ===\n');

// 获取今天的日期
const today = new Date().toISOString().split('T')[0];
console.log(`今天的日期: ${today}\n`);

console.log('模拟帖子数据:');
mockPosts.forEach(post => {
  const status = pushedPostIds.has(post.id) ? '已推送' : '未推送';
  const isToday = post.date === today ? '今天' : '过期';
  console.log(`- ${post.title} (${post.date}) - ${status} - ${isToday}`);
});

console.log('\n=== 推送逻辑验证 ===');

let pushedCount = 0;
let skippedCount = 0;
let outdatedCount = 0;
const results = [];

for (const post of mockPosts) {
  // 检查是否已推送
  if (pushedPostIds.has(post.id)) {
    console.log(`帖子 "${post.title}" 已推送过，跳过`);
    skippedCount++;
    results.push({ success: false, reason: 'already_pushed', post: post });
    continue;
  }
  
  // 检查文章日期，只推送今天的文章
  if (post.date !== today) {
    console.log(`帖子 "${post.title}" 发布日期为 ${post.date}，不是今天的文章，跳过`);
    outdatedCount++;
    results.push({ success: false, reason: 'outdated', post: post, date: post.date });
    continue;
  }
  
  // 模拟推送成功
  console.log(`帖子 "${post.title}" 符合推送条件，准备推送`);
  pushedCount++;
  results.push({ success: true, post: post });
}

console.log('\n=== 推送结果统计 ===');
console.log(`总帖子数: ${mockPosts.length}`);
console.log(`推送成功: ${pushedCount}`);
console.log(`已推送跳过: ${skippedCount}`);
console.log(`过期跳过: ${outdatedCount}`);

console.log('\n=== 详细结果 ===');
results.forEach((result, index) => {
  const post = result.post;
  if (result.success) {
    console.log(`${index + 1}. ✅ "${post.title}" - 推送成功`);
  } else if (result.reason === 'already_pushed') {
    console.log(`${index + 1}. ⏭️  "${post.title}" - 已推送过，跳过`);
  } else if (result.reason === 'outdated') {
    console.log(`${index + 1}. 📅 "${post.title}" - 过期文章(${result.date})，跳过`);
  }
});

console.log('\n=== 验证结果 ===');

// 验证逻辑
const expectedPushed = 1; // 只有post2符合条件（今天+未推送）
const expectedSkipped = 1; // post1已推送
const expectedOutdated = 2; // post3和post4过期

if (pushedCount === expectedPushed && 
    skippedCount === expectedSkipped && 
    outdatedCount === expectedOutdated) {
  console.log('🎉 推送逻辑验证通过！');
  console.log('✅ 只推送今天的文章');
  console.log('✅ 跳过已推送的文章');
  console.log('✅ 跳过过期文章');
} else {
  console.log('❌ 推送逻辑验证失败！');
  console.log(`期望: 推送=${expectedPushed}, 跳过=${expectedSkipped}, 过期=${expectedOutdated}`);
  console.log(`实际: 推送=${pushedCount}, 跳过=${skippedCount}, 过期=${outdatedCount}`);
}

console.log('\n💡 新的推送逻辑特点:');
console.log('1. 只推送今天发布的文章');
console.log('2. 跳过已经推送过的文章');
console.log('3. 跳过过期文章（昨天、前天等）');
console.log('4. 提供详细的统计信息');
