#!/usr/bin/env node

/**
 * 推送配置快速设置脚本
 * 帮助用户快速初始化推送配置文件
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const CONFIGS_FILE = path.join(DATA_DIR, 'push_configs.json');
const RECORDS_FILE = path.join(DATA_DIR, 'pushed_records.json');
const CONFIGS_EXAMPLE = path.join(DATA_DIR, 'push_configs.example.json');
const RECORDS_EXAMPLE = path.join(DATA_DIR, 'pushed_records.example.json');

/**
 * 确保数据目录存在
 */
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('✓ 创建数据目录:', DATA_DIR);
  }
}

/**
 * 检查文件是否存在
 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 复制示例文件
 */
async function copyExampleFiles() {
  try {
    // 检查示例文件是否存在
    if (!(await fileExists(CONFIGS_EXAMPLE))) {
      console.log('⚠ 示例配置文件不存在，跳过复制');
      return false;
    }
    
    if (!(await fileExists(RECORDS_EXAMPLE))) {
      console.log('⚠ 示例记录文件不存在，跳过复制');
      return false;
    }
    
    // 复制配置文件
    if (!(await fileExists(CONFIGS_FILE))) {
      const configContent = await fs.readFile(CONFIGS_EXAMPLE, 'utf8');
      await fs.writeFile(CONFIGS_FILE, configContent);
      console.log('✓ 创建推送配置文件:', CONFIGS_FILE);
    } else {
      console.log('⚠ 推送配置文件已存在，跳过创建');
    }
    
    // 复制记录文件
    if (!(await fileExists(RECORDS_FILE))) {
      const recordsContent = await fs.readFile(RECORDS_EXAMPLE, 'utf8');
      await fs.writeFile(RECORDS_FILE, recordsContent);
      console.log('✓ 创建推送记录文件:', RECORDS_FILE);
    } else {
      console.log('⚠ 推送记录文件已存在，跳过创建');
    }
    
    return true;
  } catch (error) {
    console.error('✗ 复制示例文件失败:', error.message);
    return false;
  }
}

/**
 * 显示配置说明
 */
function showConfigInstructions() {
  console.log('\n📋 配置说明:');
  console.log('1. 编辑 data/push_configs.json 文件');
  console.log('2. 设置你的频道ID (channelId)');
  console.log('3. 根据需要调整检查间隔 (checkInterval)');
  console.log('4. 重启服务以加载新配置');
  console.log('\n📖 详细说明请查看: doc/PUSH_CONFIG_SETUP.md');
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 推送配置快速设置脚本\n');
  
  try {
    // 1. 确保数据目录存在
    await ensureDataDir();
    
    // 2. 复制示例文件
    const copySuccess = await copyExampleFiles();
    
    if (copySuccess) {
      console.log('\n✅ 配置文件设置完成！');
      showConfigInstructions();
    } else {
      console.log('\n⚠️ 部分文件设置失败，请手动检查');
    }
    
    // 3. 显示当前状态
    console.log('\n📊 当前状态:');
    console.log(`- 配置文件: ${await fileExists(CONFIGS_FILE) ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`- 记录文件: ${await fileExists(RECORDS_FILE) ? '✅ 存在' : '❌ 不存在'}`);
    
  } catch (error) {
    console.error('\n❌ 设置过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().then(() => {
    console.log('\n🎉 设置脚本执行完毕');
    process.exit(0);
  }).catch(error => {
    console.error('设置失败:', error.message);
    process.exit(1);
  });
}

module.exports = { main, copyExampleFiles, ensureDataDir };
