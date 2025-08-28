import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// 延迟加载依赖库，避免初始化时出现问题
let pdfLib = null;
let mammothLib = null;
let xlsxLib = null;
let pptxLib = null;

async function loadPdfLib() {
  if (!pdfLib) {
    try {
      pdfLib = await import('pdf-parse');
    } catch (error) {
      console.error('无法加载pdf-parse库:', error.message);
      throw new Error('PDF解析功能不可用，请确保已安装pdf-parse库');
    }
  }
  return pdfLib.default || pdfLib;
}

async function loadMammothLib() {
  if (!mammothLib) {
    try {
      mammothLib = await import('mammoth');
    } catch (error) {
      console.error('无法加载mammoth库:', error.message);
      throw new Error('Word文档解析功能不可用，请确保已安装mammoth库');
    }
  }
  return mammothLib.default || mammothLib;
}

async function loadXlsxLib() {
  if (!xlsxLib) {
    try {
      xlsxLib = await import('xlsx');
    } catch (error) {
      console.error('无法加载xlsx库:', error.message);
      throw new Error('Excel文档解析功能不可用，请确保已安装xlsx库');
    }
  }
  return xlsxLib.default || xlsxLib;
}

async function loadPptxLib() {
  if (!pptxLib) {
    try {
      pptxLib = await import('node-pptx');
    } catch (error) {
      console.error('无法加载node-pptx库:', error.message);
      throw new Error('PPT文档解析功能不可用，请确保已安装node-pptx库');
    }
  }
  return pptxLib.default || pptxLib;
}

/**
 * 文件操作工具模块
 * 提供文件的增删改查功能，默认在用户的 .nexus-mind 目录下操作
 */

// 获取默认工作目录
function getDefaultWorkDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.nexus-mind');
}

// 确保目录存在
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

// 获取绝对路径
function getAbsolutePath(relativePath, workDir = null) {
  const baseDir = workDir || getDefaultWorkDir();
  return path.isAbsolute(relativePath) ? relativePath : path.join(baseDir, relativePath);
}

// 辅助函数：格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 文件操作工具定义
export const fileOperationTools = {
  // 创建文件
  create_file: {
    name: 'create_file',
    description: '创建新文件并写入内容。如果文件已存在，可以选择覆盖或追加内容。',
    category: 'file_operation',
    parameters: {
      file_path: {
        type: 'string',
        description: '文件路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径'
      },
      content: {
        type: 'string',
        description: '要写入文件的内容'
      },
      overwrite: {
        type: 'boolean',
        description: '如果文件已存在是否覆盖，默认为true',
        optional: true,
        default: true
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { file_path, content, overwrite = true, work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(file_path, work_dir);
        const dirPath = path.dirname(absolutePath);
        
        // 确保目录存在
        await ensureDirectoryExists(dirPath);
        
        // 检查文件是否已存在
        let fileExists = false;
        try {
          await fs.access(absolutePath);
          fileExists = true;
        } catch (error) {
          // 文件不存在，继续创建
        }
        
        if (fileExists && !overwrite) {
          return {
            success: false,
            message: `文件已存在: ${absolutePath}`,
            file_path: absolutePath,
            action: 'skipped'
          };
        }
        
        // 写入文件
        await fs.writeFile(absolutePath, content, 'utf8');
        
        return {
          success: true,
          message: fileExists ? '文件已覆盖' : '文件已创建',
          file_path: absolutePath,
          size: content.length,
          action: fileExists ? 'overwritten' : 'created'
        };
      } catch (error) {
        throw new Error(`创建文件失败: ${error.message}`);
      }
    }
  },

  // 读取文件
  read_file: {
    name: 'read_file',
    description: '读取文件内容，支持文本文件、PDF、Word、Excel和PPT文件读取。',
    category: 'file_operation',
    parameters: {
      file_path: {
        type: 'string',
        description: '文件路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径'
      },
      encoding: {
        type: 'string',
        description: '文件编码，默认为utf8（仅适用于文本文件）',
        optional: true,
        default: 'utf8'
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { file_path, encoding = 'utf8', work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(file_path, work_dir);
        
        // 检查文件是否存在
        try {
          await fs.access(absolutePath);
        } catch (error) {
          throw new Error(`文件不存在: ${absolutePath}`);
        }
        
        // 获取文件扩展名
        const ext = path.extname(absolutePath).toLowerCase();
        
        let content = '';
        let fileType = 'text';
        
        // 根据文件扩展名选择不同的解析方法
        switch (ext) {
          case '.pdf':
            fileType = 'pdf';
            try {
              const pdfLib = await loadPdfLib();
              const pdfData = await fs.readFile(absolutePath);
              const pdfResult = await pdfLib(pdfData);
              content = pdfResult.text;
            } catch (pdfError) {
              throw new Error(`PDF文件解析失败: ${pdfError.message}`);
            }
            break;
            
          case '.docx':
            fileType = 'word';
            try {
              const mammothLib = await loadMammothLib();
              const wordResult = await mammothLib.extractRawText({ path: absolutePath });
              content = wordResult.value;
            } catch (wordError) {
              throw new Error(`Word文件解析失败: ${wordError.message}`);
            }
            break;
            
          case '.xlsx':
          case '.xls':
            fileType = 'excel';
            try {
              const xlsxLib = await loadXlsxLib();
              const workbook = xlsxLib.readFile(absolutePath);
              const sheetNames = workbook.SheetNames;
              const excelContent = [];
              
              sheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = xlsxLib.utils.sheet_to_json(worksheet, { header: 1 });
                excelContent.push(`Sheet: ${sheetName}\n${JSON.stringify(jsonData, null, 2)}\n`);
              });
              
              content = excelContent.join('\n');
            } catch (excelError) {
              throw new Error(`Excel文件解析失败: ${excelError.message}`);
            }
            break;
            
          case '.pptx':
          case '.ppt':
            fileType = 'powerpoint';
            try {
              // 使用node-pptx库解析PPT文件
              const PPTX = await loadPptxLib();
              const pptx = new PPTX.Composer();
              await pptx.load(absolutePath);
              
              // 提取幻灯片内容
              const slides = pptx.getSlides();
              const slideContents = [];
              
              for (let i = 0; i < slides.length; i++) {
                const slide = slides[i];
                const slideText = [];
                
                // 提取文本内容
                const texts = slide.getTexts();
                texts.forEach(text => {
                  slideText.push(text.value);
                });
                
                slideContents.push(`Slide ${i + 1}:\n${slideText.join('\n')}\n`);
              }
              
              content = slideContents.join('\n');
            } catch (pptError) {
              // 如果node-pptx解析失败，尝试基本的文件信息读取
              content = `PPT文件内容提取功能受限: ${pptError.message}\n文件路径: ${absolutePath}\n文件类型: ${fileType}`;
            }
            break;
            
          default:
            // 默认文本文件处理
            content = await fs.readFile(absolutePath, encoding);
            break;
        }
        
        const stats = await fs.stat(absolutePath);
        
        return {
          success: true,
          content,
          file_path: absolutePath,
          file_type: fileType,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          encoding: ext === '.pdf' || ext === '.docx' || ext === '.xlsx' || ext === '.xls' || ext === '.pptx' || ext === '.ppt' ? 'binary' : encoding
        };
      } catch (error) {
        throw new Error(`读取文件失败: ${error.message}`);
      }
    }
  },

  // 更新文件
  update_file: {
    name: 'update_file',
    description: '更新文件内容，支持追加、覆盖或插入内容。',
    category: 'file_operation',
    parameters: {
      file_path: {
        type: 'string',
        description: '文件路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径'
      },
      content: {
        type: 'string',
        description: '要写入的内容'
      },
      mode: {
        type: 'string',
        description: '更新模式：overwrite(覆盖), append(追加), prepend(前置), insert(插入)',
        optional: true,
        default: 'overwrite'
      },
      position: {
        type: 'number',
        description: '插入位置（仅在insert模式下使用），默认为0',
        optional: true,
        default: 0
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { file_path, content, mode = 'overwrite', position = 0, work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(file_path, work_dir);
        
        // 检查文件是否存在
        let existingContent = '';
        try {
          existingContent = await fs.readFile(absolutePath, 'utf8');
        } catch (error) {
          if (mode === 'overwrite') {
            // 如果文件不存在且是覆盖模式，创建新文件
            const dirPath = path.dirname(absolutePath);
            await ensureDirectoryExists(dirPath);
          } else {
            throw new Error(`文件不存在: ${absolutePath}`);
          }
        }
        
        let newContent;
        switch (mode) {
          case 'overwrite':
            newContent = content;
            break;
          case 'append':
            newContent = existingContent + content;
            break;
          case 'prepend':
            newContent = content + existingContent;
            break;
          case 'insert':
            if (position < 0 || position > existingContent.length) {
              throw new Error(`插入位置无效: ${position}`);
            }
            newContent = existingContent.slice(0, position) + content + existingContent.slice(position);
            break;
          default:
            throw new Error(`不支持的更新模式: ${mode}`);
        }
        
        // 写入文件
        await fs.writeFile(absolutePath, newContent, 'utf8');
        
        return {
          success: true,
          message: `文件已${mode === 'overwrite' ? '覆盖' : mode === 'append' ? '追加' : mode === 'prepend' ? '前置' : '插入'}`,
          file_path: absolutePath,
          original_size: existingContent.length,
          new_size: newContent.length,
          mode
        };
      } catch (error) {
        throw new Error(`更新文件失败: ${error.message}`);
      }
    }
  },

  // 删除文件
  delete_file: {
    name: 'delete_file',
    description: '删除指定文件。',
    category: 'file_operation',
    parameters: {
      file_path: {
        type: 'string',
        description: '文件路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径'
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { file_path, work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(file_path, work_dir);
        
        // 检查文件是否存在
        try {
          await fs.access(absolutePath);
        } catch (error) {
          throw new Error(`文件不存在: ${absolutePath}`);
        }
        
        // 获取文件信息
        const stats = await fs.stat(absolutePath);
        
        // 删除文件
        await fs.unlink(absolutePath);
        
        return {
          success: true,
          message: '文件已删除',
          file_path: absolutePath,
          deleted_size: stats.size,
          deleted_at: new Date().toISOString()
        };
      } catch (error) {
        throw new Error(`删除文件失败: ${error.message}`);
      }
    }
  },

  // 列出目录内容
  list_directory: {
    name: 'list_directory',
    description: '列出指定目录下的文件和子目录。',
    category: 'file_operation',
    parameters: {
      dir_path: {
        type: 'string',
        description: '目录路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径，默认为工作目录',
        optional: true,
        default: '.'
      },
      recursive: {
        type: 'boolean',
        description: '是否递归列出子目录内容',
        optional: true,
        default: false
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { dir_path = '.', recursive = false, work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(dir_path, work_dir);
        
        // 检查目录是否存在
        try {
          await fs.access(absolutePath);
        } catch (error) {
          throw new Error(`目录不存在: ${absolutePath}`);
        }
        
        const stats = await fs.stat(absolutePath);
        if (!stats.isDirectory()) {
          throw new Error(`路径不是目录: ${absolutePath}`);
        }
        
        // 读取目录内容
        const items = await fs.readdir(absolutePath);
        const result = [];
        
        for (const item of items) {
          const itemPath = path.join(absolutePath, item);
          const itemStats = await fs.stat(itemPath);
          
          const itemInfo = {
            name: item,
            path: itemPath,
            is_directory: itemStats.isDirectory(),
            size: itemStats.size,
            created: itemStats.birthtime,
            modified: itemStats.mtime
          };
          
          result.push(itemInfo);
          
          // 如果递归且是目录，则递归列出子目录内容
          if (recursive && itemStats.isDirectory()) {
            const subItems = await fs.readdir(itemPath);
            for (const subItem of subItems) {
              const subItemPath = path.join(itemPath, subItem);
              const subItemStats = await fs.stat(subItemPath);
              
              result.push({
                name: `${item}/${subItem}`,
                path: subItemPath,
                is_directory: subItemStats.isDirectory(),
                size: subItemStats.size,
                created: subItemStats.birthtime,
                modified: subItemStats.mtime
              });
            }
          }
        }
        
        return {
          success: true,
          directory: absolutePath,
          items: result,
          total_count: result.length,
          directories_count: result.filter(item => item.is_directory).length,
          files_count: result.filter(item => !item.is_directory).length
        };
      } catch (error) {
        throw new Error(`列出目录失败: ${error.message}`);
      }
    }
  },

  // 创建目录
  create_directory: {
    name: 'create_directory',
    description: '创建新目录，支持创建多层嵌套目录。',
    category: 'file_operation',
    parameters: {
      dir_path: {
        type: 'string',
        description: '目录路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径'
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { dir_path, work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(dir_path, work_dir);
        
        // 检查目录是否已存在
        try {
          await fs.access(absolutePath);
          const stats = await fs.stat(absolutePath);
          if (stats.isDirectory()) {
            return {
              success: true,
              message: '目录已存在',
              directory: absolutePath,
              action: 'existed'
            };
          }
        } catch (error) {
          // 目录不存在，继续创建
        }
        
        // 创建目录
        await fs.mkdir(absolutePath, { recursive: true });
        
        return {
          success: true,
          message: '目录已创建',
          directory: absolutePath,
          action: 'created'
        };
      } catch (error) {
        throw new Error(`创建目录失败: ${error.message}`);
      }
    }
  },

  // 删除目录
  delete_directory: {
    name: 'delete_directory',
    description: '删除指定目录及其所有内容。',
    category: 'file_operation',
    parameters: {
      dir_path: {
        type: 'string',
        description: '目录路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径'
      },
      recursive: {
        type: 'boolean',
        description: '是否递归删除子目录和文件，默认为true',
        optional: true,
        default: true
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { dir_path, recursive = true, work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(dir_path, work_dir);
        
        // 检查目录是否存在
        try {
          await fs.access(absolutePath);
        } catch (error) {
          throw new Error(`目录不存在: ${absolutePath}`);
        }
        
        const stats = await fs.stat(absolutePath);
        if (!stats.isDirectory()) {
          throw new Error(`路径不是目录: ${absolutePath}`);
        }
        
        // 删除目录
        if (recursive) {
          await fs.rm(absolutePath, { recursive: true, force: true });
        } else {
          await fs.rmdir(absolutePath);
        }
        
        return {
          success: true,
          message: '目录已删除',
          directory: absolutePath,
          recursive,
          deleted_at: new Date().toISOString()
        };
      } catch (error) {
        throw new Error(`删除目录失败: ${error.message}`);
      }
    }
  },

  // 获取文件信息
  get_file_info: {
    name: 'get_file_info',
    description: '获取文件的详细信息，包括大小、创建时间、修改时间等。',
    category: 'file_operation',
    parameters: {
      file_path: {
        type: 'string',
        description: '文件路径，可以是相对路径（相对于.nexus-mind目录）或绝对路径'
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { file_path, work_dir } = args;
      
      try {
        const absolutePath = getAbsolutePath(file_path, work_dir);
        
        // 检查文件是否存在
        try {
          await fs.access(absolutePath);
        } catch (error) {
          throw new Error(`文件不存在: ${absolutePath}`);
        }
        
        // 获取文件信息
        const stats = await fs.stat(absolutePath);
        
        return {
          success: true,
          file_path: absolutePath,
          name: path.basename(absolutePath),
          directory: path.dirname(absolutePath),
          size: stats.size,
          size_formatted: formatFileSize(stats.size),
          is_file: stats.isFile(),
          is_directory: stats.isDirectory(),
          created: stats.birthtime,
          modified: stats.mtime,
          accessed: stats.atime,
          permissions: {
            readable: (stats.mode & fs.constants.R_OK) !== 0,
            writable: (stats.mode & fs.constants.W_OK) !== 0,
            executable: (stats.mode & fs.constants.X_OK) !== 0
          }
        };
      } catch (error) {
        throw new Error(`获取文件信息失败: ${error.message}`);
      }
    }
  }
};

export default fileOperationTools;
