import logger from '../../utils/logger.js';

/**
 * 报告渲染器
 * 负责将报告数据渲染为不同格式（Markdown、HTML、JSON等）
 */
export class ReportRenderer {
  constructor(config = {}) {
    this.config = {
      outputFormat: 'markdown', // markdown, html, json, plain
      includeMetadata: true,
      includeTableOfContents: true,
      enableStyling: true,
      ...config
    };
    
    this.templates = new Map();
    this.initializeTemplates();
  }

  /**
   * 初始化渲染模板
   */
  initializeTemplates() {
    // Markdown模板
    this.templates.set('markdown', {
      document: {
        header: (title, metadata) => `# ${title}\n\n${this.renderMetadataMarkdown(metadata)}\n\n`,
        footer: () => `\n---\n\n*报告生成时间: ${new Date().toLocaleString('zh-CN')}*\n`,
        sectionSeparator: '\n\n---\n\n'
      },
      section: {
        header: (title, level = 2) => `${'#'.repeat(level)} ${title}\n\n`,
        content: (content) => `${content}\n\n`,
        subsection: (title, content, level = 3) => `${'#'.repeat(level)} ${title}\n\n${content}\n\n`
      },
      elements: {
        paragraph: (text) => `${text}\n\n`,
        list: (items) => items.map(item => `- ${item}`).join('\n') + '\n\n',
        orderedList: (items) => items.map((item, index) => `${index + 1}. ${item}`).join('\n') + '\n\n',
        table: (headers, rows) => this.renderMarkdownTable(headers, rows),
        quote: (text) => `> ${text}\n\n`,
        code: (code, language = '') => `\`\`\`${language}\n${code}\n\`\`\`\n\n`,
        bold: (text) => `**${text}**`,
        italic: (text) => `*${text}*`,
        link: (text, url) => `[${text}](${url})`
      }
    });

    // HTML模板
    this.templates.set('html', {
      document: {
        header: (title, metadata) => `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>${this.getDefaultCSS()}</style>
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>${title}</h1>
            ${this.renderMetadataHTML(metadata)}
        </header>
        <main class="report-content">
`,
        footer: () => `
        </main>
        <footer class="report-footer">
            <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        </footer>
    </div>
</body>
</html>
`,
        sectionSeparator: '<hr class="section-separator">'
      },
      section: {
        header: (title, level = 2) => `<h${level} class="section-title">${title}</h${level}>`,
        content: (content) => `<div class="section-content">${content}</div>`,
        subsection: (title, content, level = 3) => `<h${level} class="subsection-title">${title}</h${level}><div class="subsection-content">${content}</div>`
      },
      elements: {
        paragraph: (text) => `<p>${text}</p>`,
        list: (items) => `<ul>${items.map(item => `<li>${item}</li>`).join('')}</ul>`,
        orderedList: (items) => `<ol>${items.map(item => `<li>${item}</li>`).join('')}</ol>`,
        table: (headers, rows) => this.renderHTMLTable(headers, rows),
        quote: (text) => `<blockquote>${text}</blockquote>`,
        code: (code, language = '') => `<pre><code class="language-${language}">${this.escapeHTML(code)}</code></pre>`,
        bold: (text) => `<strong>${text}</strong>`,
        italic: (text) => `<em>${text}</em>`,
        link: (text, url) => `<a href="${url}" target="_blank">${text}</a>`
      }
    });
  }

  /**
   * 渲染完整报告
   */
  render(reportData, format = null) {
    const outputFormat = format || this.config.outputFormat;
    
    try {
      switch (outputFormat) {
        case 'markdown':
          return this.renderMarkdown(reportData);
        case 'html':
          return this.renderHTML(reportData);
        case 'json':
          return this.renderJSON(reportData);
        case 'plain':
          return this.renderPlainText(reportData);
        default:
          throw new Error(`不支持的输出格式: ${outputFormat}`);
      }
    } catch (error) {
      logger.error('报告渲染失败:', error);
      throw error;
    }
  }

  /**
   * 渲染Markdown格式
   */
  renderMarkdown(reportData) {
    const template = this.templates.get('markdown');
    let content = '';

    // 文档头部
    content += template.document.header(reportData.title, reportData.metadata);

    // 目录（如果启用）
    if (this.config.includeTableOfContents) {
      content += this.renderTableOfContents(reportData.sections, 'markdown');
    }

    // 渲染章节
    reportData.sections.forEach((section, index) => {
      if (index > 0) {
        content += template.document.sectionSeparator;
      }
      content += this.renderSectionMarkdown(section, template);
    });

    // 文档尾部
    content += template.document.footer();

    return content;
  }

  /**
   * 渲染HTML格式
   */
  renderHTML(reportData) {
    const template = this.templates.get('html');
    let content = '';

    // 文档头部
    content += template.document.header(reportData.title, reportData.metadata);

    // 目录（如果启用）
    if (this.config.includeTableOfContents) {
      content += this.renderTableOfContents(reportData.sections, 'html');
    }

    // 渲染章节
    reportData.sections.forEach((section, index) => {
      if (index > 0) {
        content += template.document.sectionSeparator;
      }
      content += this.renderSectionHTML(section, template);
    });

    // 文档尾部
    content += template.document.footer();

    return content;
  }

  /**
   * 渲染JSON格式
   */
  renderJSON(reportData) {
    const jsonData = {
      title: reportData.title,
      metadata: reportData.metadata,
      sections: reportData.sections.map(section => ({
        id: section.id,
        title: section.title,
        content: section.content,
        order: section.order,
        wordCount: section.content ? section.content.length : 0
      })),
      generatedAt: new Date().toISOString(),
      format: 'json',
      version: '1.0'
    };

    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * 渲染纯文本格式
   */
  renderPlainText(reportData) {
    let content = '';

    // 标题
    content += `${reportData.title}\n`;
    content += '='.repeat(reportData.title.length) + '\n\n';

    // 元数据
    if (this.config.includeMetadata && reportData.metadata) {
      content += this.renderMetadataPlainText(reportData.metadata);
      content += '\n\n';
    }

    // 章节
    reportData.sections.forEach((section, index) => {
      if (index > 0) {
        content += '\n' + '-'.repeat(50) + '\n\n';
      }
      
      content += `${section.title}\n`;
      content += '-'.repeat(section.title.length) + '\n\n';
      content += `${section.content}\n\n`;
    });

    // 尾部
    content += '\n' + '='.repeat(50) + '\n';
    content += `报告生成时间: ${new Date().toLocaleString('zh-CN')}\n`;

    return content;
  }

  /**
   * 渲染Markdown章节
   */
  renderSectionMarkdown(section, template) {
    let content = '';
    
    // 章节标题
    content += template.section.header(section.title);
    
    // 处理章节内容
    const processedContent = this.processContentMarkdown(section.content);
    content += template.section.content(processedContent);
    
    return content;
  }

  /**
   * 渲染HTML章节
   */
  renderSectionHTML(section, template) {
    let content = '';
    
    // 章节标题
    content += template.section.header(section.title);
    
    // 处理章节内容
    const processedContent = this.processContentHTML(section.content);
    content += template.section.content(processedContent);
    
    return content;
  }

  /**
   * 处理Markdown内容
   */
  processContentMarkdown(content) {
    if (!content) return '';
    
    // 保持原有的Markdown格式
    return content;
  }

  /**
   * 处理HTML内容
   */
  processContentHTML(content) {
    if (!content) return '';
    
    // 将Markdown转换为HTML
    let html = content;
    
    // 转换标题
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // 转换段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p><h([1-6])>/g, '<h$1>');
    html = html.replace(/<\/h([1-6])><\/p>/g, '</h$1>');
    
    // 转换列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    
    // 转换粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // 清理空段落
    html = html.replace(/<p>\s*<\/p>/g, '');
    
    return html;
  }

  /**
   * 渲染目录
   */
  renderTableOfContents(sections, format) {
    let toc = '';
    
    if (format === 'markdown') {
      toc += '## 目录\n\n';
      sections.forEach((section, index) => {
        const anchor = section.id || `section-${index + 1}`;
        toc += `${index + 1}. [${section.title}](#${anchor})\n`;
      });
      toc += '\n---\n\n';
    } else if (format === 'html') {
      toc += '<nav class="table-of-contents">';
      toc += '<h2>目录</h2>';
      toc += '<ol>';
      sections.forEach((section, index) => {
        const anchor = section.id || `section-${index + 1}`;
        toc += `<li><a href="#${anchor}">${section.title}</a></li>`;
      });
      toc += '</ol>';
      toc += '</nav>';
    }
    
    return toc;
  }

  /**
   * 渲染元数据
   */
  renderMetadataMarkdown(metadata) {
    if (!metadata || !this.config.includeMetadata) return '';
    
    let meta = '**报告信息**\n\n';
    
    if (metadata.generatedAt) {
      meta += `- **生成时间**: ${new Date(metadata.generatedAt).toLocaleString('zh-CN')}\n`;
    }
    if (metadata.wordCount) {
      meta += `- **字数统计**: ${metadata.wordCount} 字\n`;
    }
    if (metadata.sectionCount) {
      meta += `- **章节数量**: ${metadata.sectionCount} 章\n`;
    }
    if (metadata.dataPoints) {
      meta += `- **数据点**: ${metadata.dataPoints} 个\n`;
    }
    if (metadata.confidence) {
      meta += `- **分析置信度**: ${(metadata.confidence * 100).toFixed(1)}%\n`;
    }
    
    return meta;
  }

  renderMetadataHTML(metadata) {
    if (!metadata || !this.config.includeMetadata) return '';
    
    let meta = '<div class="report-metadata">';
    meta += '<h3>报告信息</h3>';
    meta += '<dl>';
    
    if (metadata.generatedAt) {
      meta += `<dt>生成时间</dt><dd>${new Date(metadata.generatedAt).toLocaleString('zh-CN')}</dd>`;
    }
    if (metadata.wordCount) {
      meta += `<dt>字数统计</dt><dd>${metadata.wordCount} 字</dd>`;
    }
    if (metadata.sectionCount) {
      meta += `<dt>章节数量</dt><dd>${metadata.sectionCount} 章</dd>`;
    }
    if (metadata.dataPoints) {
      meta += `<dt>数据点</dt><dd>${metadata.dataPoints} 个</dd>`;
    }
    if (metadata.confidence) {
      meta += `<dt>分析置信度</dt><dd>${(metadata.confidence * 100).toFixed(1)}%</dd>`;
    }
    
    meta += '</dl></div>';
    return meta;
  }

  renderMetadataPlainText(metadata) {
    if (!metadata || !this.config.includeMetadata) return '';
    
    let meta = '报告信息:\n';
    
    if (metadata.generatedAt) {
      meta += `生成时间: ${new Date(metadata.generatedAt).toLocaleString('zh-CN')}\n`;
    }
    if (metadata.wordCount) {
      meta += `字数统计: ${metadata.wordCount} 字\n`;
    }
    if (metadata.sectionCount) {
      meta += `章节数量: ${metadata.sectionCount} 章\n`;
    }
    
    return meta;
  }

  /**
   * 渲染Markdown表格
   */
  renderMarkdownTable(headers, rows) {
    if (!headers || !rows || rows.length === 0) return '';
    
    let table = '';
    
    // 表头
    table += '| ' + headers.join(' | ') + ' |\n';
    table += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
    
    // 表格数据
    rows.forEach(row => {
      table += '| ' + row.join(' | ') + ' |\n';
    });
    
    return table + '\n';
  }

  /**
   * 渲染HTML表格
   */
  renderHTMLTable(headers, rows) {
    if (!headers || !rows || rows.length === 0) return '';
    
    let table = '<table class="data-table">';
    
    // 表头
    table += '<thead><tr>';
    headers.forEach(header => {
      table += `<th>${this.escapeHTML(header)}</th>`;
    });
    table += '</tr></thead>';
    
    // 表格数据
    table += '<tbody>';
    rows.forEach(row => {
      table += '<tr>';
      row.forEach(cell => {
        table += `<td>${this.escapeHTML(String(cell))}</td>`;
      });
      table += '</tr>';
    });
    table += '</tbody>';
    
    table += '</table>';
    return table;
  }

  /**
   * 获取默认CSS样式
   */
  getDefaultCSS() {
    return `
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
        background-color: #fafafa;
      }
      
      .report-container {
        background: white;
        padding: 40px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .report-header {
        border-bottom: 2px solid #1890ff;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .report-header h1 {
        color: #1890ff;
        margin: 0 0 15px 0;
        font-size: 2.2em;
      }
      
      .report-metadata {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 6px;
        border-left: 4px solid #1890ff;
      }
      
      .report-metadata h3 {
        margin: 0 0 10px 0;
        color: #1890ff;
      }
      
      .report-metadata dl {
        margin: 0;
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: 8px;
      }
      
      .report-metadata dt {
        font-weight: 600;
        color: #666;
      }
      
      .report-metadata dd {
        margin: 0;
        color: #333;
      }
      
      .table-of-contents {
        background: #f8f9fa;
        padding: 20px;
        border-radius: 6px;
        margin: 20px 0;
      }
      
      .table-of-contents h2 {
        margin: 0 0 15px 0;
        color: #1890ff;
      }
      
      .table-of-contents ol {
        margin: 0;
        padding-left: 20px;
      }
      
      .table-of-contents a {
        color: #1890ff;
        text-decoration: none;
      }
      
      .table-of-contents a:hover {
        text-decoration: underline;
      }
      
      .section-separator {
        border: none;
        border-top: 1px solid #e8e8e8;
        margin: 40px 0;
      }
      
      .section-title {
        color: #1890ff;
        border-bottom: 1px solid #e8e8e8;
        padding-bottom: 10px;
        margin: 30px 0 20px 0;
      }
      
      .subsection-title {
        color: #666;
        margin: 25px 0 15px 0;
      }
      
      .section-content {
        margin-bottom: 30px;
      }
      
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin: 20px 0;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .data-table th,
      .data-table td {
        padding: 12px 15px;
        text-align: left;
        border-bottom: 1px solid #e8e8e8;
      }
      
      .data-table th {
        background-color: #1890ff;
        color: white;
        font-weight: 600;
      }
      
      .data-table tr:hover {
        background-color: #f8f9fa;
      }
      
      blockquote {
        border-left: 4px solid #1890ff;
        margin: 20px 0;
        padding: 10px 20px;
        background: #f8f9fa;
        color: #666;
      }
      
      pre {
        background: #f6f8fa;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
        padding: 16px;
        overflow-x: auto;
      }
      
      code {
        background: #f6f8fa;
        padding: 2px 4px;
        border-radius: 3px;
        font-family: 'SF Mono', Monaco, 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
      }
      
      .report-footer {
        border-top: 1px solid #e8e8e8;
        padding-top: 20px;
        margin-top: 40px;
        text-align: center;
        color: #666;
        font-size: 0.9em;
      }
    `;
  }

  /**
   * HTML转义
   */
  escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 设置渲染配置
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取支持的格式列表
   */
  getSupportedFormats() {
    return ['markdown', 'html', 'json', 'plain'];
  }

  /**
   * 验证报告数据格式
   */
  validateReportData(reportData) {
    if (!reportData || typeof reportData !== 'object') {
      throw new Error('报告数据必须是一个对象');
    }
    
    if (!reportData.title || typeof reportData.title !== 'string') {
      throw new Error('报告必须包含标题');
    }
    
    if (!reportData.sections || !Array.isArray(reportData.sections)) {
      throw new Error('报告必须包含章节数组');
    }
    
    reportData.sections.forEach((section, index) => {
      if (!section.title) {
        throw new Error(`第${index + 1}个章节缺少标题`);
      }
      if (!section.content) {
        throw new Error(`第${index + 1}个章节缺少内容`);
      }
    });
    
    return true;
  }
}