#!/usr/bin/env node

/**
 * 测试推送记录文件自动生成
 * 验证当pushed_records.json不存在时，系统是否会自动创建
 */

const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const RECORDS_FILE = path.join(DATA_DIR, 'pushed_records.json');
const CONFIGS_FILE = path.join(DATA_DIR, 'push_configs.json');

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
 * 备份现有文件
 */
async function backupFile(filePath, backupPath) {
  if (await fileExists(filePath)) {
    const content = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(backupPath, content);
    console.log(`✓ 已备份: ${filePath} -> ${backupPath}`);
    return true;
  }
  return false;
}

/**
 * 恢复备份文件
 */
async function restoreFile(filePath, backupPath) {
  if (await fileExists(backupPath)) {
    const content = await fs.readFile(backupPath, 'utf8');
    await fs.writeFile(filePath, content);
    console.log(`✓ 已恢复: ${backupPath} -> ${filePath}`);
    return true;
  }
  return false;
}

/**
 * 删除文件
 */
async function deleteFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`✓ 已删除: ${filePath}`);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(`⚠ 文件不存在: ${filePath}`);
      return true;
    }
    console.error(`✗ 删除文件失败: ${filePath}`, error.message);
    return false;
  }
}

/**
 * 测试自动生成功能
 */
async function testAutoGeneration() {
  console.log('🧪 测试推送记录文件自动生成功能\n');
  
  try {
    // 1. 备份现有文件
    console.log('1. 备份现有文件...');
    const recordsBackup = RECORDS_FILE + '.backup';
    const configsBackup = CONFIGS_FILE + '.backup';
    
    const hasRecordsBackup = await backupFile(RECORDS_FILE, recordsBackup);
    const hasConfigsBackup = await backupFile(CONFIGS_FILE, configsBackup);
    
    // 2. 删除推送记录文件
    console.log('\n2. 删除推送记录文件...');
    await deleteFile(RECORDS_FILE);
    
    // 3. 检查当前状态
    console.log('\n3. 检查当前状态...');
    const recordsExist = await fileExists(RECORDS_FILE);
    const configsExist = await fileExists(CONFIGS_FILE);
    
    console.log(`- 推送记录文件: ${recordsExist ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`- 推送配置文件: ${configsExist ? '✅ 存在' : '❌ 不存在'}`);
    
    if (!configsExist) {
      console.log('\n⚠ 推送配置文件不存在，无法进行测试');
      console.log('请先运行: node scripts/setup-push-config.js');
      return;
    }
    
    // 4. 模拟推送操作（通过修改文件内容）
    console.log('\n4. 模拟推送操作...');
    if (configsExist) {
      const configContent = await fs.readFile(CONFIGS_FILE, 'utf8');
      const configs = JSON.parse(configContent);
      
      if (configs.length > 0) {
        const config = configs[0];
        console.log(`- 找到配置: ${config.name} (${config.id})`);
        
        // 模拟推送记录
        const mockRecords = {
          [config.id]: ["test_post_id_1", "test_post_id_2"]
        };
        
        // 写入模拟记录
        await fs.writeFile(RECORDS_FILE, JSON.stringify(mockRecords, null, 2));
        console.log('✓ 已创建模拟推送记录');
        
        // 检查文件是否被创建
        const newRecordsExist = await fileExists(RECORDS_FILE);
        console.log(`- 推送记录文件现在: ${newRecordsExist ? '✅ 存在' : '❌ 不存在'}`);
        
        if (newRecordsExist) {
          const content = await fs.readFile(RECORDS_FILE, 'utf8');
          console.log('- 文件内容:', content);
        }
      }
    }
    
    // 5. 恢复备份文件
    console.log('\n5. 恢复备份文件...');
    if (hasRecordsBackup) {
      await restoreFile(RECORDS_FILE, recordsBackup);
      await deleteFile(recordsBackup);
    }
    if (hasConfigsBackup) {
      await restoreFile(CONFIGS_FILE, configsBackup);
      await deleteFile(configsBackup);
    }
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error.message);
    
    // 尝试恢复备份
    console.log('\n🔄 尝试恢复备份文件...');
    try {
      if (await fileExists(RECORDS_FILE + '.backup')) {
        await restoreFile(RECORDS_FILE, RECORDS_FILE + '.backup');
        await deleteFile(RECORDS_FILE + '.backup');
      }
      if (await fileExists(CONFIGS_FILE + '.backup')) {
        await restoreFile(CONFIGS_FILE, CONFIGS_FILE + '.backup');
        await deleteFile(CONFIGS_FILE + '.backup');
      }
    } catch (restoreError) {
      console.error('恢复备份失败:', restoreError.message);
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testAutoGeneration().then(() => {
    console.log('\n🎉 测试脚本执行完毕');
    process.exit(0);
  }).catch(error => {
    console.error('测试失败:', error.message);
    process.exit(1);
  });
}

module.exports = { testAutoGeneration };
