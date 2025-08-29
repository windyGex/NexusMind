import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 代码编写工具模块
 * 提供代码生成、文件操作等功能
 */

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
  if (workDir) {
    return path.isAbsolute(relativePath) ? relativePath : path.join(workDir, relativePath);
  }
  
  // 默认工作目录为项目根目录
  const projectRoot = path.join(__dirname, '../../..');
  return path.isAbsolute(relativePath) ? relativePath : path.join(projectRoot, relativePath);
}

/**
 * 代码编写工具定义
 */
export const codeWritingTools = {
  // 创建HTML原型项目
  create_html_prototype: {
    name: 'create_html_prototype',
    description: '创建完整的HTML原型项目，包含多个页面和相关资源文件',
    category: 'code_generation',
    parameters: {
      project_name: {
        type: 'string',
        description: '项目名称'
      },
      pages: {
        type: 'array',
        description: '页面列表',
        items: {
          type: 'string'
        }
      },
      features: {
        type: 'array',
        description: '功能特性列表',
        items: {
          type: 'string'
        }
      },
      output_dir: {
        type: 'string',
        description: '输出目录路径',
        optional: true
      }
    },
    execute: async (args) => {
      const { project_name, pages, features, output_dir } = args;
      
      try {
        // 确定输出目录
        const outputDir = output_dir || path.join(process.cwd(), project_name);
        await ensureDirectoryExists(outputDir);
        
        // 创建页面文件
        const createdFiles = [];
        
        for (const page of pages) {
          const filePath = path.join(outputDir, `${page}.html`);
          const content = generateHTMLTemplate(project_name, page, features);
          
          await fs.writeFile(filePath, content, 'utf8');
          createdFiles.push(filePath);
        }
        
        // 创建样式文件
        const cssPath = path.join(outputDir, 'style.css');
        const cssContent = generateCSSTemplate();
        await fs.writeFile(cssPath, cssContent, 'utf8');
        createdFiles.push(cssPath);
        
        // 创建JavaScript文件
        const jsPath = path.join(outputDir, 'script.js');
        const jsContent = generateJSTemplate();
        await fs.writeFile(jsPath, jsContent, 'utf8');
        createdFiles.push(jsPath);
        
        // 创建README文件
        const readmePath = path.join(outputDir, 'README.md');
        const readmeContent = generateReadmeTemplate(project_name, pages, features);
        await fs.writeFile(readmePath, readmeContent, 'utf8');
        createdFiles.push(readmePath);
        
        return {
          success: true,
          message: `HTML原型项目 "${project_name}" 创建成功`,
          project_name,
          output_dir: outputDir,
          created_files: createdFiles,
          pages_count: pages.length,
          features_count: features.length
        };
      } catch (error) {
        throw new Error(`创建HTML原型项目失败: ${error.message}`);
      }
    }
  },
  
  // 生成单个HTML页面
  generate_html_page: {
    name: 'generate_html_page',
    description: '生成单个HTML页面文件',
    category: 'code_generation',
    parameters: {
      file_path: {
        type: 'string',
        description: '文件路径'
      },
      title: {
        type: 'string',
        description: '页面标题'
      },
      content: {
        type: 'string',
        description: '页面内容（HTML格式）'
      },
      include_css: {
        type: 'boolean',
        description: '是否包含默认CSS样式',
        optional: true,
        default: true
      },
      include_js: {
        type: 'boolean',
        description: '是否包含默认JavaScript',
        optional: true,
        default: true
      }
    },
    execute: async (args) => {
      const { file_path, title, content, include_css = true, include_js = true } = args;
      
      try {
        const absolutePath = getAbsolutePath(file_path);
        const dirPath = path.dirname(absolutePath);
        
        // 确保目录存在
        await ensureDirectoryExists(dirPath);
        
        // 生成HTML内容
        let htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>`;
        
        if (include_css) {
          htmlContent += `
    <link rel="stylesheet" href="style.css">`;
        }
        
        htmlContent += `
</head>
<body>
    <header>
        <h1>${title}</h1>
    </header>
    
    <main>
        ${content}
    </main>
    
    <footer>
        <p>&copy; 2023 ${title}. 保留所有权利。</p>
    </footer>`;
        
        if (include_js) {
          htmlContent += `
    
    <script src="script.js"></script>`;
        }
        
        htmlContent += `
</body>
</html>`;
        
        // 写入文件
        await fs.writeFile(absolutePath, htmlContent, 'utf8');
        
        return {
          success: true,
          message: `HTML页面 "${title}" 创建成功`,
          file_path: absolutePath,
          title,
          size: htmlContent.length
        };
      } catch (error) {
        throw new Error(`生成HTML页面失败: ${error.message}`);
      }
    }
  },
  
  // 创建项目结构
  create_project_structure: {
    name: 'create_project_structure',
    description: '创建项目目录结构',
    category: 'file_operation',
    parameters: {
      project_name: {
        type: 'string',
        description: '项目名称'
      },
      structure: {
        type: 'object',
        description: '目录结构定义',
        additionalProperties: {
          type: 'array',
          items: {
            type: 'string'
          }
        }
      },
      output_dir: {
        type: 'string',
        description: '输出目录路径',
        optional: true
      }
    },
    execute: async (args) => {
      const { project_name, structure, output_dir } = args;
      
      try {
        // 确定输出目录
        const outputDir = output_dir || path.join(process.cwd(), project_name);
        await ensureDirectoryExists(outputDir);
        
        // 创建目录结构
        const createdPaths = [];
        
        for (const [dir, files] of Object.entries(structure)) {
          const dirPath = path.join(outputDir, dir);
          await ensureDirectoryExists(dirPath);
          createdPaths.push(dirPath);
          
          // 创建文件
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            await fs.writeFile(filePath, '', 'utf8');
            createdPaths.push(filePath);
          }
        }
        
        return {
          success: true,
          message: `项目结构 "${project_name}" 创建成功`,
          project_name,
          output_dir: outputDir,
          created_paths: createdPaths
        };
      } catch (error) {
        throw new Error(`创建项目结构失败: ${error.message}`);
      }
    }
  }
};

/**
 * 生成HTML模板
 * @param {string} projectName - 项目名称
 * @param {string} pageName - 页面名称
 * @param {array} features - 功能特性
 * @returns {string} HTML模板内容
 */
function generateHTMLTemplate(projectName, pageName, features) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageName} - ${projectName}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>${projectName}</h1>
        <nav>
            <ul>
                <li><a href="index.html">首页</a></li>
                ${features.map(feature => `<li><a href="#">${feature}</a></li>`).join('\n                ')}
            </ul>
        </nav>
    </header>
    
    <main>
        <section class="content">
            <h2>${pageName}</h2>
            <p>这是${pageName}页面的内容区域。</p>
            
            <div class="features">
                <h3>功能特性</h3>
                <ul>
                    ${features.map(feature => `<li>${feature}</li>`).join('\n                    ')}
                </ul>
            </div>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2023 ${projectName}. 保留所有权利。</p>
    </footer>
    
    <script src="script.js"></script>
</body>
</html>`;
}

/**
 * 生成CSS模板
 * @returns {string} CSS模板内容
 */
function generateCSSTemplate() {
  return `/* 全局样式 */
body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    margin: 0;
    padding: 0;
    background-color: #f5f5f7;
    color: #1d1d1f;
}

header {
    background-color: #fff;
    padding: 1rem;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

header h1 {
    margin: 0;
    color: #333;
}

nav ul {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0 0;
    display: flex;
    gap: 1rem;
}

nav ul li a {
    text-decoration: none;
    color: #666;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    transition: background-color 0.3s;
}

nav ul li a:hover {
    background-color: #f0f0f0;
}

main {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
}

.content {
    background-color: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.features {
    margin-top: 2rem;
    padding: 1rem;
    background-color: #f9f9f9;
    border-radius: 4px;
}

.features h3 {
    margin-top: 0;
}

.features ul {
    columns: 2;
    column-gap: 2rem;
}

footer {
    background-color: #fff;
    padding: 1rem;
    text-align: center;
    margin-top: 2rem;
    border-top: 1px solid #eee;
}`;
}

/**
 * 生成JavaScript模板
 * @returns {string} JavaScript模板内容
 */
function generateJSTemplate() {
  return `// 页面交互逻辑
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成');
    
    // 添加导航交互
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('导航到:', this.textContent);
            // 这里可以添加页面切换逻辑
        });
    });
    
    // 添加按钮交互示例
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('按钮被点击:', this.textContent);
            // 这里可以添加按钮点击处理逻辑
        });
    });
});

// 工具函数
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = \`message message-\${type}\`;
    messageDiv.textContent = message;
    
    // 添加样式
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '20px';
    messageDiv.style.right = '20px';
    messageDiv.style.padding = '10px 20px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.color = 'white';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.zIndex = '1000';
    
    if (type === 'error') {
        messageDiv.style.backgroundColor = '#e74c3c';
    } else if (type === 'success') {
        messageDiv.style.backgroundColor = '#27ae60';
    } else {
        messageDiv.style.backgroundColor = '#3498db';
    }
    
    document.body.appendChild(messageDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        document.body.removeChild(messageDiv);
    }, 3000);
}`;
}

/**
 * 生成README模板
 * @param {string} projectName - 项目名称
 * @param {array} pages - 页面列表
 * @param {array} features - 功能特性
 * @returns {string} README模板内容
 */
function generateReadmeTemplate(projectName, pages, features) {
  return `# ${projectName}

## 项目描述
这是一个使用HTML、CSS和JavaScript构建的原型项目。

## 页面结构
${pages.map(page => `- ${page}.html`).join('\n')}

## 功能特性
${features.map(feature => `- ${feature}`).join('\n')}

## 使用方法
1. 在浏览器中打开任意HTML文件
2. 查看页面效果
3. 修改代码以满足具体需求

## 技术栈
- HTML5
- CSS3
- JavaScript ES6+

## 项目结构
\`\`\`
${projectName}/
├── index.html
${pages.filter(p => p !== 'index').map(page => `├── ${page}.html`).join('\n')}
├── style.css
├── script.js
└── README.md
\`\`\`

## 开发说明
- 所有HTML文件都链接了统一的CSS样式表
- 所有HTML文件都引用了统一的JavaScript文件
- 可以根据需要添加更多页面和功能
`;
}