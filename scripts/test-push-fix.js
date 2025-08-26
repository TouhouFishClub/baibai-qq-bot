/**
 * 测试推送系统修复的脚本
 * 验证推送记录是否能正确保存和加载
 */

const path = require('path');
const fs = require('fs').promises;

// 模拟推送记录
const mockPushedIds = new Map();
mockPushedIds.set('config1', new Set(['post1', 'post2', 'post3']));
mockPushedIds.set('config2', new Set(['post4', 'post5']));

// 数据文件路径
const DATA_DIR = path.join(__dirname, '../data');
const RECORDS_FILE = path.join(DATA_DIR, 'pushed_records.json');

/**
 * 确保数据目录存在
 */
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('创建数据目录:', DATA_DIR);
  }
}

/**
 * 保存推送记录到文件
 */
async function saveRecordsToFile() {
  try {
    await ensureDataDir();
    const recordsData = {};
    for (const [configId, postIds] of mockPushedIds.entries()) {
      recordsData[configId] = Array.from(postIds);
    }
    await fs.writeFile(RECORDS_FILE, JSON.stringify(recordsData, null, 2));
    console.log('推送记录已保存到文件');
    console.log('保存的记录:', recordsData);
  } catch (error) {
    console.error('保存推送记录到文件失败:', error.message);
  }
}

/**
 * 从文件加载推送记录
 */
async function loadRecordsFromFile() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(RECORDS_FILE, 'utf8');
    const records = JSON.parse(data);
    
    const loadedPushedIds = new Map();
    for (const [configId, postIds] of Object.entries(records)) {
      loadedPushedIds.set(configId, new Set(postIds));
    }
    
    console.log(`从文件加载了 ${Object.keys(records).length} 个配置的推送记录`);
    console.log('加载的记录:', records);
    
    // 验证数据是否正确
    for (const [configId, postIds] of mockPushedIds.entries()) {
      const loadedIds = loadedPushedIds.get(configId);
      if (loadedIds && loadedIds.size === postIds.size) {
        console.log(`✓ 配置 ${configId} 的记录加载正确`);
      } else {
        console.log(`✗ 配置 ${configId} 的记录加载失败`);
      }
    }
    
    return loadedPushedIds;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('加载推送记录文件失败:', error.message);
    } else {
      console.log('推送记录文件不存在，使用空记录');
    }
    return new Map();
  }
}

/**
 * 测试推送记录功能
 */
async function testPushRecords() {
  console.log('=== 测试推送记录功能 ===');
  
  // 1. 保存记录
  console.log('\n1. 保存推送记录...');
  await saveRecordsToFile();
  
  // 2. 加载记录
  console.log('\n2. 加载推送记录...');
  const loadedRecords = await loadRecordsFromFile();
  
  // 3. 验证记录
  console.log('\n3. 验证记录完整性...');
  let allCorrect = true;
  
  for (const [configId, postIds] of mockPushedIds.entries()) {
    const loadedIds = loadedRecords.get(configId);
    if (!loadedIds || loadedIds.size !== postIds.size) {
      console.log(`✗ 配置 ${configId} 的记录不完整`);
      allCorrect = false;
    } else {
      // 检查每个帖子ID
      for (const postId of postIds) {
        if (!loadedIds.has(postId)) {
          console.log(`✗ 配置 ${configId} 缺少帖子 ${postId}`);
          allCorrect = false;
        }
      }
    }
  }
  
  if (allCorrect) {
    console.log('\n✓ 所有测试通过！推送记录功能正常');
  } else {
    console.log('\n✗ 测试失败！推送记录功能有问题');
  }
  
  return allCorrect;
}

/**
 * 主函数
 */
async function main() {
  try {
    await testPushRecords();
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  testPushRecords,
  saveRecordsToFile,
  loadRecordsFromFile
};
