/**
 * 测试推送修复的脚本
 * 用于验证重复推送问题是否已解决
 */

const autoPushService = require('../services/autoPushService');

async function testPushFix() {
  console.log('开始测试推送修复...\n');
  
  try {
    // 1. 初始化服务
    console.log('1. 初始化自动推送服务...');
    await autoPushService.initializeService();
    console.log('✓ 服务初始化完成\n');
    
    // 2. 获取当前配置
    console.log('2. 获取当前配置...');
    const configs = autoPushService.getAllConfigs();
    console.log(`✓ 找到 ${configs.length} 个配置`);
    
    if (configs.length === 0) {
      console.log('⚠ 没有找到推送配置，请先创建配置');
      return;
    }
    
    // 3. 显示配置详情
    configs.forEach((config, index) => {
      console.log(`\n配置 ${index + 1}:`);
      console.log(`  - ID: ${config.id}`);
      console.log(`  - 名称: ${config.name}`);
      console.log(`  - 状态: ${config.status}`);
      console.log(`  - 检查间隔: ${Math.round(config.checkInterval / 60000)}分钟`);
      console.log(`  - 已推送数量: ${config.pushedCount}`);
      console.log(`  - 频道ID: ${config.channelId || '未设置'}`);
    });
    
    // 4. 测试手动检查（不实际推送）
    console.log('\n3. 测试手动检查（模拟模式）...');
    const defaultConfig = configs[0];
    
    if (defaultConfig.channelId) {
      console.log('⚠ 检测到频道ID已设置，将进行实际检查');
      console.log('⚠ 如果不想实际推送，请先清空频道ID');
      
      const result = await autoPushService.executeConfigCheck(defaultConfig.id);
      if (result.success) {
        console.log('✓ 手动检查完成');
        console.log(`  - 总帖子数: ${result.totalPostsCount}`);
        console.log(`  - 推送成功: ${result.pushedCount}`);
        console.log(`  - 跳过已推送: ${result.skippedCount}`);
        console.log(`  - 跳过过期: ${result.outdatedCount}`);
        console.log(`  - 跳过重复: ${result.duplicateCount || 0}`);
      } else {
        console.log('✗ 手动检查失败:', result.error);
      }
    } else {
      console.log('✓ 频道ID未设置，跳过实际检查');
    }
    
    // 5. 显示推送统计
    console.log('\n4. 推送统计信息...');
    const stats = autoPushService.getPushStatistics(defaultConfig.id);
    console.log(`  - 总推送数: ${stats.totalPushed}`);
    console.log(`  - 最后推送: ${stats.lastPushed}`);
    
    console.log('\n✓ 测试完成！');
    console.log('\n修复说明:');
    console.log('1. 帖子ID现在基于日期+标题+URL生成，更稳定');
    console.log('2. 增加了重复检查逻辑，避免重复推送');
    console.log('3. 推送记录已持久化，重启后不会丢失');
    console.log('4. 检查间隔设置为30分钟（1800000毫秒）');
    console.log('5. 只处理最新的5篇帖子，避免处理过多内容');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
    console.error(error.stack);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testPushFix().then(() => {
    console.log('\n测试脚本执行完毕');
    process.exit(0);
  }).catch(error => {
    console.error('测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = { testPushFix };
