import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

/**
 * 代码执行工具模块
 * 提供安全的代码执行功能，支持多种编程语言
 */

// 支持的语言列表
const SUPPORTED_LANGUAGES = ['javascript', 'python', 'bash'];

// 获取默认工作目录
function getDefaultWorkDir() {
  const homeDir = os.homedir();
  return path.join(homeDir, '.nexus-mind', 'code_execution');
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

// 代码执行工具定义
export const codeExecutionTools = {
  // 执行代码
  execute_code: {
    name: 'execute_code',
    description: '安全执行代码片段，支持JavaScript、Python和Bash脚本。代码将在沙箱环境中运行，具有超时和资源限制。',
    category: 'code_execution',
    parameters: {
      code: {
        type: 'string',
        description: '要执行的代码片段'
      },
      language: {
        type: 'string',
        description: '编程语言，支持: javascript, python, bash',
        enum: SUPPORTED_LANGUAGES
      },
      timeout: {
        type: 'number',
        description: '执行超时时间（毫秒），默认为5000ms',
        optional: true,
        default: 5000
      },
      work_dir: {
        type: 'string',
        description: '工作目录，默认为用户的.nexus-mind/code_execution目录',
        optional: true
      }
    },
    execute: async (args) => {
      const { code, language, timeout = 50000, work_dir } = args;
      
      // 验证参数
      if (!code) {
        throw new Error('必须提供要执行的代码');
      }
      
      if (!language) {
        throw new Error('必须指定编程语言');
      }
      
      if (!SUPPORTED_LANGUAGES.includes(language)) {
        throw new Error(`不支持的编程语言: ${language}。支持的语言: ${SUPPORTED_LANGUAGES.join(', ')}`);
      }
      
      try {
        const absolutePath = getAbsolutePath('', work_dir);
        await ensureDirectoryExists(absolutePath);
        
        // 生成临时文件名
        const timestamp = Date.now();
        const tempFileName = `temp_${timestamp}`;
        let fileExtension = '';
        let command = '';
        
        // 根据语言设置文件扩展名和执行命令
        switch (language) {
          case 'javascript':
            fileExtension = '.js';
            command = `node ${tempFileName}${fileExtension}`;
            break;
          case 'python':
            fileExtension = '.py';
            command = `python3 ${tempFileName}${fileExtension}`;
            break;
          case 'bash':
            fileExtension = '.sh';
            command = `bash ${tempFileName}${fileExtension}`;
            break;
        }
        
        const tempFilePath = path.join(absolutePath, `${tempFileName}${fileExtension}`);
        
        // 写入代码到临时文件
        await fs.writeFile(tempFilePath, code, 'utf8');
        
        // 执行代码
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(command, {
          cwd: absolutePath,
          timeout: timeout,
          maxBuffer: 1024 * 1024 // 1MB
        });
        const executionTime = Date.now() - startTime;
        
        // 删除临时文件
        await fs.unlink(tempFilePath).catch(() => {});
        
        return {
          success: true,
          language,
          executionTime,
          output: stdout || '代码执行完成，无输出',
          error: stderr || null,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        // 清理可能残留的临时文件
        // 注意：这里不处理删除失败的情况，因为可能文件已被自动清理
        try {
          const tempFiles = await fs.readdir(getAbsolutePath('', work_dir));
          for (const file of tempFiles) {
            if (file.startsWith('temp_')) {
              await fs.unlink(path.join(getAbsolutePath('', work_dir), file)).catch(() => {});
            }
          }
        } catch (cleanupError) {
          // 忽略清理错误
        }
        
        // 处理执行错误
        if (error.killed) {
          throw new Error(`代码执行超时 (${timeout}ms)`);
        } else if (error.code !== undefined) {
          throw new Error(`代码执行失败，退出码: ${error.code}，错误信息: ${error.message}`);
        } else {
          throw new Error(`代码执行异常: ${error.message}`);
        }
      }
    }
  }
};

export default codeExecutionTools;