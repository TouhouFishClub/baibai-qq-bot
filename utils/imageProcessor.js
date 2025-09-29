/**
 * 图片处理工具
 * 提供图片压缩、格式转换等功能
 */

const fs = require('fs');
const path = require('path');

// 尝试加载sharp，如果失败则使用降级模式
let sharp = null;
let sharpAvailable = false;

try {
  sharp = require('sharp');
  sharpAvailable = true;
  console.log('Sharp图片处理库已加载，支持图片压缩功能');
} catch (error) {
  console.warn('Sharp图片处理库未安装，图片压缩功能将被禁用');
  console.warn('如需启用图片压缩，请运行: npm install sharp');
}

/**
 * 图片压缩配置
 */
const COMPRESSION_CONFIG = {
  // 最大文件大小 (字节) - 5MB
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // 最大宽度
  MAX_WIDTH: 2048,
  // 最大高度  
  MAX_HEIGHT: 2048,
  // JPEG质量 (1-100)
  JPEG_QUALITY: 85,
  // PNG压缩级别 (0-9)
  PNG_COMPRESSION: 8,
  // WebP质量 (1-100)
  WEBP_QUALITY: 85
};

/**
 * 检查文件是否需要压缩
 * @param {string} filePath - 文件路径
 * @returns {Promise<boolean>} 是否需要压缩
 */
async function needsCompression(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const fileSizeBytes = stats.size;
    
    console.log(`图片文件大小: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);
    
    if (fileSizeBytes > COMPRESSION_CONFIG.MAX_FILE_SIZE) {
      console.log(`图片过大 (${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB > ${COMPRESSION_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)，需要压缩`);
      return true;
    }
    
    // 如果sharp可用，检查图片尺寸
    if (sharpAvailable) {
      try {
        const metadata = await sharp(filePath).metadata();
        if (metadata.width > COMPRESSION_CONFIG.MAX_WIDTH || metadata.height > COMPRESSION_CONFIG.MAX_HEIGHT) {
          console.log(`图片尺寸过大 (${metadata.width}x${metadata.height})，需要压缩`);
          return true;
        }
      } catch (sharpError) {
        console.warn('无法获取图片尺寸信息:', sharpError.message);
      }
    }
    
    return false;
  } catch (error) {
    console.error('检查图片是否需要压缩失败:', error);
    return false;
  }
}

/**
 * 压缩图片
 * @param {string} inputPath - 输入文件路径
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<boolean>} 压缩是否成功
 */
async function compressImage(inputPath, outputPath) {
  if (!sharpAvailable) {
    console.warn('Sharp未安装，无法压缩图片，直接复制原文件');
    if (inputPath !== outputPath) {
      fs.copyFileSync(inputPath, outputPath);
    }
    return true;
  }
  
  try {
    console.log(`开始压缩图片: ${inputPath} -> ${outputPath}`);
    
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`原始图片信息: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}, 大小: ${(fs.statSync(inputPath).size / 1024 / 1024).toFixed(2)}MB`);
    
    let pipeline = image;
    
    // 调整尺寸 - 保持宽高比
    if (metadata.width > COMPRESSION_CONFIG.MAX_WIDTH || metadata.height > COMPRESSION_CONFIG.MAX_HEIGHT) {
      pipeline = pipeline.resize({
        width: COMPRESSION_CONFIG.MAX_WIDTH,
        height: COMPRESSION_CONFIG.MAX_HEIGHT,
        fit: 'inside',
        withoutEnlargement: true
      });
      console.log(`调整图片尺寸到最大 ${COMPRESSION_CONFIG.MAX_WIDTH}x${COMPRESSION_CONFIG.MAX_HEIGHT}`);
    }
    
    // 根据原始格式选择压缩方式
    switch (metadata.format) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({
          quality: COMPRESSION_CONFIG.JPEG_QUALITY,
          progressive: true,
          mozjpeg: true
        });
        break;
        
      case 'png':
        pipeline = pipeline.png({
          compressionLevel: COMPRESSION_CONFIG.PNG_COMPRESSION,
          progressive: true
        });
        break;
        
      case 'webp':
        pipeline = pipeline.webp({
          quality: COMPRESSION_CONFIG.WEBP_QUALITY
        });
        break;
        
      default:
        // 对于其他格式，转换为JPEG
        pipeline = pipeline.jpeg({
          quality: COMPRESSION_CONFIG.JPEG_QUALITY,
          progressive: true,
          mozjpeg: true
        });
        console.log(`未知格式 ${metadata.format}，转换为JPEG`);
        break;
    }
    
    // 保存压缩后的图片
    await pipeline.toFile(outputPath);
    
    const compressedSize = fs.statSync(outputPath).size;
    const originalSize = fs.statSync(inputPath).size;
    const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
    
    console.log(`图片压缩完成: ${(compressedSize / 1024 / 1024).toFixed(2)}MB (压缩率: ${compressionRatio}%)`);
    
    return true;
  } catch (error) {
    console.error('图片压缩失败:', error);
    return false;
  }
}

/**
 * 处理图片 - 如果需要则压缩，否则直接复制
 * @param {string} inputPath - 输入文件路径
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<boolean>} 处理是否成功
 */
async function processImage(inputPath, outputPath) {
  try {
    // 检查是否需要压缩
    const needsComp = await needsCompression(inputPath);
    
    if (needsComp) {
      // 需要压缩
      return await compressImage(inputPath, outputPath);
    } else {
      // 不需要压缩，直接复制
      if (inputPath !== outputPath) {
        fs.copyFileSync(inputPath, outputPath);
        console.log(`图片无需压缩，直接复制: ${inputPath} -> ${outputPath}`);
      }
      return true;
    }
  } catch (error) {
    console.error('图片处理失败:', error);
    return false;
  }
}

/**
 * 从base64数据创建并处理图片
 * @param {string} base64Data - base64图片数据
 * @param {string} outputPath - 输出文件路径
 * @returns {Promise<boolean>} 处理是否成功
 */
async function processBase64Image(base64Data, outputPath) {
  try {
    // 创建临时文件
    const tempPath = outputPath + '.temp';
    
    // 解码base64并保存到临时文件
    const imageBuffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(tempPath, imageBuffer);
    
    console.log(`从base64创建临时图片: ${tempPath}`);
    
    // 处理图片
    const success = await processImage(tempPath, outputPath);
    
    // 清理临时文件
    if (fs.existsSync(tempPath) && tempPath !== outputPath) {
      fs.unlinkSync(tempPath);
      console.log(`清理临时文件: ${tempPath}`);
    }
    
    return success;
  } catch (error) {
    console.error('处理base64图片失败:', error);
    return false;
  }
}

/**
 * 获取图片信息
 * @param {string} filePath - 文件路径
 * @returns {Promise<object>} 图片信息
 */
async function getImageInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const result = {
      size: stats.size,
      sizeKB: Math.round(stats.size / 1024),
      sizeMB: Math.round(stats.size / 1024 / 1024 * 100) / 100
    };
    
    if (sharpAvailable) {
      try {
        const metadata = await sharp(filePath).metadata();
        result.width = metadata.width;
        result.height = metadata.height;
        result.format = metadata.format;
      } catch (sharpError) {
        console.warn('无法获取图片尺寸信息:', sharpError.message);
        result.width = '未知';
        result.height = '未知';
        result.format = '未知';
      }
    } else {
      result.width = '未知';
      result.height = '未知';
      result.format = '未知';
    }
    
    return result;
  } catch (error) {
    console.error('获取图片信息失败:', error);
    return null;
  }
}

module.exports = {
  needsCompression,
  compressImage,
  processImage,
  processBase64Image,
  getImageInfo,
  COMPRESSION_CONFIG
};
