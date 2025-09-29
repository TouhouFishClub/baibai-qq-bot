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
 * 图片压缩配置 - 优化为高质量保真压缩
 */
const COMPRESSION_CONFIG = {
  // 最大文件大小 (字节) - 8MB
  MAX_FILE_SIZE: 8 * 1024 * 1024,
  // 最大宽度 - 4096px (适应各种宽度)
  MAX_WIDTH: 4096,
  // 最大高度 - 20000px (支持长截图)
  MAX_HEIGHT: 20000,
  // 最大总像素数 - 5000万像素 (更合理的限制)
  MAX_TOTAL_PIXELS: 50 * 1024 * 1024,
  // 长宽比限制 - 最大30:1 (支持极长截图)
  MAX_ASPECT_RATIO: 30,
  // JPEG质量 (1-100)
  JPEG_QUALITY: 95,
  // PNG压缩级别 (0-9)
  PNG_COMPRESSION: 6,
  // WebP质量 (1-100)
  WEBP_QUALITY: 95,
  // 启用渐进式JPEG
  PROGRESSIVE_JPEG: true,
  // PNG优化选项
  PNG_OPTIMIZE: true,
  // 是否保留元数据
  KEEP_METADATA: false
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
    const fileSizeMB = fileSizeBytes / 1024 / 1024;
    
    console.log(`图片文件大小: ${fileSizeMB.toFixed(2)}MB`);
    
    // 只有明显过大的文件才压缩
    if (fileSizeBytes > COMPRESSION_CONFIG.MAX_FILE_SIZE) {
      console.log(`图片过大 (${fileSizeMB.toFixed(2)}MB > ${COMPRESSION_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)，需要压缩`);
      return true;
    }
    
    // 如果sharp可用，检查图片尺寸和像素数
    if (sharpAvailable) {
      try {
        const metadata = await sharp(filePath).metadata();
        const totalPixels = metadata.width * metadata.height;
        const aspectRatio = Math.max(metadata.width / metadata.height, metadata.height / metadata.width);
        
        console.log(`图片尺寸: ${metadata.width}x${metadata.height}, 像素: ${(totalPixels / 1024 / 1024).toFixed(1)}M, 长宽比: ${aspectRatio.toFixed(1)}:1`);
        
        // 检查总像素数（主要限制因素）
        if (totalPixels > COMPRESSION_CONFIG.MAX_TOTAL_PIXELS) {
          console.log(`图片像素过多 (${(totalPixels / 1024 / 1024).toFixed(1)}M > ${COMPRESSION_CONFIG.MAX_TOTAL_PIXELS / 1024 / 1024}M)，需要优化`);
          return true;
        }
        
        // 检查单边尺寸（防止极端情况）
        if (metadata.width > COMPRESSION_CONFIG.MAX_WIDTH) {
          console.log(`图片宽度过大 (${metadata.width}px > ${COMPRESSION_CONFIG.MAX_WIDTH}px)，需要优化`);
          return true;
        }
        
        if (metadata.height > COMPRESSION_CONFIG.MAX_HEIGHT) {
          console.log(`图片高度过大 (${metadata.height}px > ${COMPRESSION_CONFIG.MAX_HEIGHT}px)，需要优化`);
          return true;
        }
        
        // 检查长宽比（防止过于极端的长条图）
        if (aspectRatio > COMPRESSION_CONFIG.MAX_ASPECT_RATIO) {
          console.log(`图片长宽比过大 (${aspectRatio.toFixed(1)}:1 > ${COMPRESSION_CONFIG.MAX_ASPECT_RATIO}:1)，需要优化`);
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
 * 根据原始文件大小动态调整压缩质量
 * @param {number} originalSizeMB - 原始文件大小(MB)
 * @param {string} format - 图片格式
 * @returns {object} 动态压缩配置
 */
function getDynamicCompressionConfig(originalSizeMB, format) {
  let quality = COMPRESSION_CONFIG.JPEG_QUALITY;
  let compressionLevel = COMPRESSION_CONFIG.PNG_COMPRESSION;
  
  if (originalSizeMB <= 2) {
    // 小文件：几乎无损
    quality = 98;
    compressionLevel = 3;
  } else if (originalSizeMB <= 5) {
    // 中等文件：高质量
    quality = 95;
    compressionLevel = 5;
  } else if (originalSizeMB <= 10) {
    // 大文件：平衡质量和大小
    quality = 90;
    compressionLevel = 6;
  } else {
    // 超大文件：适度压缩
    quality = 85;
    compressionLevel = 7;
  }
  
  console.log(`动态质量设置: ${originalSizeMB.toFixed(1)}MB -> ${format}质量${quality}`);
  
  return { quality, compressionLevel };
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
    console.log(`开始高质量压缩图片: ${inputPath} -> ${outputPath}`);
    
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const originalSizeMB = fs.statSync(inputPath).size / 1024 / 1024;
    
    console.log(`原始图片信息: ${metadata.width}x${metadata.height}, 格式: ${metadata.format}, 大小: ${originalSizeMB.toFixed(2)}MB`);
    
    // 获取动态压缩配置
    const dynamicConfig = getDynamicCompressionConfig(originalSizeMB, metadata.format);
    
    let pipeline = image;
    
    // 智能尺寸调整策略
    let needResize = false;
    let newWidth = metadata.width;
    let newHeight = metadata.height;
    const totalPixels = metadata.width * metadata.height;
    const aspectRatio = Math.max(metadata.width / metadata.height, metadata.height / metadata.width);
    
    console.log(`分析图片: ${metadata.width}x${metadata.height}, 像素${(totalPixels/1024/1024).toFixed(1)}M, 长宽比${aspectRatio.toFixed(1)}:1`);
    
    // 策略1: 基于总像素数的智能缩放
    if (totalPixels > COMPRESSION_CONFIG.MAX_TOTAL_PIXELS) {
      needResize = true;
      const pixelRatio = Math.sqrt(COMPRESSION_CONFIG.MAX_TOTAL_PIXELS / totalPixels);
      newWidth = Math.round(metadata.width * pixelRatio);
      newHeight = Math.round(metadata.height * pixelRatio);
      console.log(`基于像素数缩放: 比例${(pixelRatio*100).toFixed(1)}% -> ${newWidth}x${newHeight}`);
    }
    // 策略2: 单边尺寸限制（但保持长宽比）
    else if (metadata.width > COMPRESSION_CONFIG.MAX_WIDTH || metadata.height > COMPRESSION_CONFIG.MAX_HEIGHT) {
      needResize = true;
      const widthRatio = COMPRESSION_CONFIG.MAX_WIDTH / metadata.width;
      const heightRatio = COMPRESSION_CONFIG.MAX_HEIGHT / metadata.height;
      const ratio = Math.min(widthRatio, heightRatio);
      
      newWidth = Math.round(metadata.width * ratio);
      newHeight = Math.round(metadata.height * ratio);
      console.log(`基于尺寸限制缩放: 比例${(ratio*100).toFixed(1)}% -> ${newWidth}x${newHeight}`);
    }
    // 策略3: 极端长宽比处理
    else if (aspectRatio > COMPRESSION_CONFIG.MAX_ASPECT_RATIO) {
      needResize = true;
      // 对于长条图，适度缩小较长的一边
      if (metadata.height > metadata.width) {
        // 竖长图：限制高度，保持宽度
        const maxAllowedHeight = metadata.width * COMPRESSION_CONFIG.MAX_ASPECT_RATIO;
        if (metadata.height > maxAllowedHeight) {
          const ratio = maxAllowedHeight / metadata.height;
          newWidth = Math.round(metadata.width * ratio);
          newHeight = Math.round(metadata.height * ratio);
          console.log(`长条图优化: 限制高度比例${(ratio*100).toFixed(1)}% -> ${newWidth}x${newHeight}`);
        }
      } else {
        // 横长图：限制宽度，保持高度
        const maxAllowedWidth = metadata.height * COMPRESSION_CONFIG.MAX_ASPECT_RATIO;
        if (metadata.width > maxAllowedWidth) {
          const ratio = maxAllowedWidth / metadata.width;
          newWidth = Math.round(metadata.width * ratio);
          newHeight = Math.round(metadata.height * ratio);
          console.log(`宽条图优化: 限制宽度比例${(ratio*100).toFixed(1)}% -> ${newWidth}x${newHeight}`);
        }
      }
    }
    
    // 执行尺寸调整
    if (needResize) {
      pipeline = pipeline.resize({
        width: newWidth,
        height: newHeight,
        fit: 'inside',
        withoutEnlargement: true,
        // 使用高质量的重采样算法
        kernel: sharp.kernel.lanczos3
      });
      
      const finalPixels = newWidth * newHeight;
      const reductionRatio = ((totalPixels - finalPixels) / totalPixels * 100).toFixed(1);
      console.log(`尺寸调整完成: ${metadata.width}x${metadata.height} -> ${newWidth}x${newHeight} (像素减少${reductionRatio}%)`);
    } else {
      console.log(`图片尺寸合适，无需调整: ${metadata.width}x${metadata.height}`);
    }
    
    // 根据原始格式和文件大小选择最佳压缩方式
    switch (metadata.format) {
      case 'jpeg':
      case 'jpg':
        pipeline = pipeline.jpeg({
          quality: dynamicConfig.quality,
          progressive: COMPRESSION_CONFIG.PROGRESSIVE_JPEG,
          mozjpeg: true,
          // 高质量色度子采样
          chromaSubsampling: '4:4:4',
          // 优化霍夫曼表
          optimiseScans: true,
          // 保留更多细节
          trellisQuantisation: true,
          overshootDeringing: true,
          // 保持更多色彩信息
          optimiseCoding: true
        });
        console.log(`JPEG压缩设置: 质量${dynamicConfig.quality}, 4:4:4子采样`);
        break;
        
      case 'png':
        // PNG特殊处理：小文件尝试无损，大文件适度压缩
        const pngOptions = {
          compressionLevel: dynamicConfig.compressionLevel,
          progressive: true,
          palette: COMPRESSION_CONFIG.PNG_OPTIMIZE,
          effort: 10
        };
        
        // 小文件尝试保持完全无损
        if (originalSizeMB <= 3) {
          pngOptions.quality = 100;
          pngOptions.compressionLevel = Math.min(dynamicConfig.compressionLevel, 4);
          console.log(`PNG无损压缩: 级别${pngOptions.compressionLevel}`);
        } else {
          pngOptions.quality = 95;
          console.log(`PNG高质量压缩: 级别${dynamicConfig.compressionLevel}, 质量95`);
        }
        
        pipeline = pipeline.png(pngOptions);
        break;
        
      case 'webp':
        // WebP：小文件接近无损，大文件高质量
        const webpQuality = originalSizeMB <= 3 ? 98 : dynamicConfig.quality;
        pipeline = pipeline.webp({
          quality: webpQuality,
          lossless: originalSizeMB <= 1, // 1MB以下尝试无损
          effort: 6,
          alphaQuality: 100,
          // 保持更多细节
          smartSubsample: false
        });
        console.log(`WebP压缩设置: 质量${webpQuality}, 无损${originalSizeMB <= 1}`);
        break;
        
      default:
        // 对于其他格式，使用动态质量JPEG
        pipeline = pipeline.jpeg({
          quality: dynamicConfig.quality,
          progressive: COMPRESSION_CONFIG.PROGRESSIVE_JPEG,
          mozjpeg: true,
          chromaSubsampling: '4:4:4',
          optimiseScans: true,
          trellisQuantisation: true,
          overshootDeringing: true,
          optimiseCoding: true
        });
        console.log(`未知格式 ${metadata.format}，转换为高质量JPEG (质量${dynamicConfig.quality})`);
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
