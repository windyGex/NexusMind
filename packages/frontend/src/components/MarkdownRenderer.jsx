import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

/**
 * Markdown渲染组件
 * 统一处理消息内容的Markdown渲染，包括代码高亮、表格、图片等
 */
const MarkdownRenderer = ({ 
  content, 
  style = {}, 
  showCursor = false,
  className = '',
  isStreaming = false
}) => {
  return (
    <div className={`${className} ${isStreaming ? 'streaming-content' : ''}`} style={style}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img({ node, src, alt, ...props }) {
            return (
              <img
                src={src}
                alt={alt}
                {...props}
                style={{
                  maxWidth: '100%',
                  maxHeight: '400px',
                  height: 'auto',
                  borderRadius: '8px',
                  marginTop: '8px',
                  marginBottom: '8px',
                  display: 'block',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              />
            );
          },
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={tomorrow}
                language={match[1]}
                PreTag="div"
                customStyle={{
                  margin: '12px 0',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code 
                className={className} 
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  border: '1px solid #e1e1e1'
                }}
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return (
              <p style={{ 
                marginBottom: '12px', 
                fontSize: '14px',
                color: '#2c3e50'
              }}>
                {children}
              </p>
            );
          },
          ul({ children }) {
            return (
              <ul style={{ 
                marginLeft: '20px', 
                marginBottom: '12px',
                fontSize: '14px'
              }}>
                {children}
              </ul>
            );
          },
          ol({ children }) {
            return (
              <ol style={{ 
                marginLeft: '20px', 
                marginBottom: '12px',
                fontSize: '14px'
              }}>
                {children}
              </ol>
            );
          },
          h1({ children }) {
            return (
              <h1 style={{ 
                fontSize: '20px', 
                marginBottom: '16px',
                color: '#1a202c',
                borderBottom: '2px solid #e2e8f0',
                paddingBottom: '8px'
              }}>
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 style={{ 
                fontSize: '18px', 
                marginBottom: '14px',
                color: '#2d3748'
              }}>
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '12px',
                color: '#4a5568'
              }}>
                {children}
              </h3>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote style={{
                borderLeft: '4px solid #4299e1',
                paddingLeft: '16px',
                margin: '12px 0',
                backgroundColor: '#f7fafc',
                padding: '12px 16px',
                borderRadius: '0 6px 6px 0',
                fontStyle: 'italic'
              }}>
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div style={{ overflowX: 'auto', margin: '12px 0' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #e2e8f0'
                }}>
                  {children}
                </table>
              </div>
            );
          },
          th({ children }) {
            return (
              <th style={{
                border: '1px solid #e2e8f0',
                padding: '8px 12px',
                backgroundColor: '#f7fafc',
                fontWeight: 'bold',
                fontSize: '13px'
              }}>
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td style={{
                border: '1px solid #e2e8f0',
                padding: '8px 12px',
                fontSize: '13px'
              }}>
                {children}
              </td>
            );
          },
          hr() {
            return (
              <hr style={{
                border: 'none',
                height: '1px',
                backgroundColor: '#e2e8f0',
                margin: '24px 0',
                borderRadius: '1px'
              }} />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
      
      {/* 闪烁光标效果 - 用于流式输出 */}
      {showCursor && (
        <>
          <span 
            style={{
              display: 'inline-block',
              width: '3px',
              height: '14px',
              backgroundColor: '#52c41a',
              marginLeft: '2px',
              animation: 'blink 1s infinite',
              verticalAlign: 'text-bottom'
            }}
          />
          <style>
            {`
              @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
              }
            `}
          </style>
        </>
      )}
    </div>
  );
};

export default MarkdownRenderer;