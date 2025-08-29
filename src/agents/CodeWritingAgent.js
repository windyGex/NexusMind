import { Agent } from '../core/Agent.js';
import { LLMClient } from '../core/LLMClient.js';

/**
 * 代码编写类自主Agent
 * 专门用于处理代码生成和文件操作任务
 */
export class CodeWritingAgent extends Agent {
  constructor(options = {}) {
    super({
      name: 'CodeWritingAgent',
      role: '代码编写专家',
      description: '专门负责代码生成、文件操作和原型设计的智能体',
      maxIterations: 10,
      ...options
    });
    
    // 初始化LLM客户端
    this.llmClient = new LLMClient();
    
    // 注册专门的工具
    this.registerCodeWritingTools();
  }
  
  /**
   * 注册代码编写相关工具
   */
  registerCodeWritingTools() {
    // 文件操作工具
    this.tools.registerTool('create_file', {
      name: 'create_file',
      description: '创建新文件并写入内容',
      category: 'file_operation',
      parameters: {
        file_path: {
          type: 'string',
          description: '文件路径'
        },
        content: {
          type: 'string',
          description: '文件内容'
        }
      },
      execute: async (args) => {
        // 实际的文件创建逻辑会在工具模块中实现
        return {
          success: true,
          message: `文件 ${args.file_path} 已创建`,
          file_path: args.file_path
        };
      }
    });
    
    // 代码生成工具
    this.tools.registerTool('generate_html_prototype', {
      name: 'generate_html_prototype',
      description: '生成HTML原型代码',
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
        }
      },
      execute: async (args) => {
        return {
          success: true,
          message: `HTML原型 ${args.project_name} 已生成`,
          pages: args.pages,
          features: args.features
        };
      }
    });
  }
  
  /**
   * 处理代码编写任务
   * @param {string} task - 任务描述
   * @param {object} context - 上下文信息
   */
  async handleCodeWritingTask(task, context = {}) {
    // 思考过程
    const thinking = await this.llmClient.generate({
      prompt: `作为代码编写专家，请分析以下任务并制定实现计划：
任务：${task}
上下文：${JSON.stringify(context, null, 2)}

请按照以下步骤思考：
1. 分析任务需求和目标
2. 确定需要创建的文件结构
3. 制定实现步骤
4. 识别可能遇到的问题和解决方案`,
      options: {
        streaming: false,
        needSendToFrontend: true
      }
    });
    
    console.log('思考过程:', thinking);
    
    // 执行计划
    const result = await this.executeCodeWritingPlan(task, context);
    
    return {
      success: true,
      thinking,
      result
    };
  }
  
  /**
   * 执行代码编写计划
   * @param {string} task - 任务描述
   * @param {object} context - 上下文信息
   */
  async executeCodeWritingPlan(task, context) {
    // 使用LLM生成具体的实现计划
    const plan = await this.llmClient.generate({
      prompt: `基于以下任务和思考，生成具体的代码实现计划：
任务：${task}
上下文：${JSON.stringify(context, null, 2)}

请生成详细的实现步骤，包括：
1. 需要创建的文件列表
2. 每个文件的内容结构
3. 文件之间的关联关系
4. 实现顺序和依赖关系`,
      options: {
        streaming: false,
        needSendToFrontend: true
      }
    });
    
    console.log('执行计划:', plan);
    
    // 模拟执行过程
    const executionResult = {
      filesCreated: [],
      totalTime: '2分钟',
      status: 'completed'
    };
    
    return executionResult;
  }
  
  /**
   * 生成完整的项目结构
   * @param {object} projectSpec - 项目规格说明
   */
  async generateProjectStructure(projectSpec) {
    const { projectName, pages, features } = projectSpec;
    
    // 生成项目根目录
    const projectRoot = `./${projectName}`;
    
    // 生成页面文件
    const pageFiles = pages.map(page => ({
      path: `${projectRoot}/${page}.html`,
      content: this.generatePageTemplate(page, features)
    }));
    
    // 生成样式文件
    const cssFile = {
      path: `${projectRoot}/style.css`,
      content: this.generateCSSTemplate()
    };
    
    // 生成JavaScript文件
    const jsFile = {
      path: `${projectRoot}/script.js`,
      content: this.generateJSTemplate()
    };
    
    // 生成README文件
    const readmeFile = {
      path: `${projectRoot}/README.md`,
      content: this.generateReadmeTemplate(projectName, pages, features)
    };
    
    return {
      projectRoot,
      files: [...pageFiles, cssFile, jsFile, readmeFile]
    };
  }
  
  /**
   * 生成页面模板
   * @param {string} pageName - 页面名称
   * @param {array} features - 功能特性
   */
  generatePageTemplate(pageName, features) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${pageName} - 项目名称</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <h1>${pageName}</h1>
    </header>
    
    <main>
        <section class="content">
            <h2>页面内容</h2>
            <p>这是${pageName}页面的内容区域。</p>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2023 项目名称. 保留所有权利。</p>
    </footer>
    
    <script src="script.js"></script>
</body>
</html>`;
  }
  
  /**
   * 生成CSS模板
   */
  generateCSSTemplate() {
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

main {
    max-width: 1200px;
    margin: 2rem auto;
    padding: 0 1rem;
}

footer {
    background-color: #fff;
    padding: 1rem;
    text-align: center;
    margin-top: 2rem;
}

.content {
    background-color: #fff;
    padding: 2rem;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}`;
  }
  
  /**
   * 生成JavaScript模板
   */
  generateJSTemplate() {
    return `// 页面交互逻辑
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面加载完成');
    
    // 添加交互功能
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('按钮被点击:', this.textContent);
        });
    });
});`;
  }
  
  /**
   * 生成README模板
   * @param {string} projectName - 项目名称
   * @param {array} pages - 页面列表
   * @param {array} features - 功能特性
   */
  generateReadmeTemplate(projectName, pages, features) {
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
`;
  }
}