import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  Select, 
  Space, 
  Table, 
  Tag, 
  Progress, 
  Alert, 
  Spin,
  Typography,
  Divider,
  Row,
  Col,
  Statistic,
  List,
  Descriptions
} from 'antd';
import { 
  GlobalOutlined, 
  SearchOutlined, 
  BarChartOutlined, 
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import './WebScraping.css';

const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const WebScraping = () => {
  const [urls, setUrls] = useState('');
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  // 处理URL输入
  const handleUrlsChange = (e) => {
    setUrls(e.target.value);
  };

  // 处理分析类型选择
  const handleAnalysisTypeChange = (value) => {
    setAnalysisType(value);
  };

  // 执行综合投资分析
  const handleComprehensiveAnalysis = async () => {
    if (!urls.trim()) {
      setError('请输入要分析的网页URL');
      return;
    }

    const urlList = urls.split('\n').filter(url => url.trim());
    if (urlList.length === 0) {
      setError('请输入有效的URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);
    setResults(null);

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const response = await fetch('/api/web-scraping/comprehensive-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: urlList,
          analysisType,
          reportType: 'summary',
          includeRecommendations: true
        })
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setResults(data.data);
      } else {
        setError(data.error || '分析失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  // 清理结果
  const handleClear = () => {
    setResults(null);
    setError(null);
    setUrls('');
  };

  // 渲染抓取结果表格
  const renderScrapingResults = (scrapingData) => {
    const columns = [
      {
        title: 'URL',
        dataIndex: 'url',
        key: 'url',
        render: (url) => (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url.length > 50 ? url.substring(0, 50) + '...' : url}
          </a>
        )
      },
      {
        title: '状态',
        dataIndex: 'success',
        key: 'success',
        render: (success) => (
          <Tag color={success ? 'green' : 'red'}>
            {success ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
            {success ? '成功' : '失败'}
          </Tag>
        )
      },
      {
        title: '标题',
        dataIndex: 'data',
        key: 'title',
        render: (data) => data?.title || 'N/A'
      }
    ];

    return (
      <Table 
        columns={columns} 
        dataSource={scrapingData.results} 
        rowKey="url"
        pagination={false}
        size="small"
      />
    );
  };

  // 渲染分析结果
  const renderAnalysisResults = (analysisData) => {
    return (
      <div>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="整体情绪"
              value={analysisData.comprehensiveAdvice?.overallSentiment || 'neutral'}
              valueStyle={{ 
                color: analysisData.comprehensiveAdvice?.overallSentiment === 'positive' ? '#3f8600' : 
                       analysisData.comprehensiveAdvice?.overallSentiment === 'negative' ? '#cf1322' : '#1890ff'
              }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="风险水平"
              value={analysisData.comprehensiveAdvice?.riskLevel || 'medium'}
              valueStyle={{ 
                color: analysisData.comprehensiveAdvice?.riskLevel === 'high' ? '#cf1322' : 
                       analysisData.comprehensiveAdvice?.riskLevel === 'low' ? '#3f8600' : '#faad14'
              }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="置信度"
              value={analysisData.comprehensiveAdvice?.confidence || 0}
              suffix="%"
            />
          </Col>
        </Row>

        <Divider />

        <Title level={4}>仓位配比建议</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="保守型"
                value={analysisData.comprehensiveAdvice?.positionAllocation?.conservative || 0}
                suffix="%"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="平衡型"
                value={analysisData.comprehensiveAdvice?.positionAllocation?.moderate || 0}
                suffix="%"
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small">
              <Statistic
                title="激进型"
                value={analysisData.comprehensiveAdvice?.positionAllocation?.aggressive || 0}
                suffix="%"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
        </Row>

        <Divider />

        <Title level={4}>投资建议</Title>
        <List
          dataSource={analysisData.comprehensiveAdvice?.recommendations || []}
          renderItem={(item, index) => (
            <List.Item>
              <Space>
                <ExclamationCircleOutlined style={{ color: '#1890ff' }} />
                <Text>{item}</Text>
              </Space>
            </List.Item>
          )}
        />
      </div>
    );
  };

  // 渲染详细分析结果
  const renderDetailedResults = (analysisData) => {
    return analysisData.analysisResults?.map((result, index) => (
      <Card key={index} title={`分析结果 ${index + 1}`} style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="URL">{result.url}</Descriptions.Item>
          <Descriptions.Item label="分析类型">{result.analysis?.type}</Descriptions.Item>
          <Descriptions.Item label="情绪">{result.analysis?.sentiment}</Descriptions.Item>
          <Descriptions.Item label="风险水平">{result.analysis?.riskLevel}</Descriptions.Item>
          <Descriptions.Item label="摘要">{result.analysis?.summary}</Descriptions.Item>
        </Descriptions>
        
        {result.analysis?.recommendations && (
          <div style={{ marginTop: 16 }}>
            <Text strong>建议：</Text>
            <List
              size="small"
              dataSource={result.analysis.recommendations}
              renderItem={(item) => (
                <List.Item>
                  <Text>{item}</Text>
                </List.Item>
              )}
            />
          </div>
        )}
      </Card>
    ));
  };

  return (
    <div className="web-scraping-container">
      <Title level={2}>
        <GlobalOutlined /> 网页抓取与投资分析
      </Title>
      
      <Card title="输入配置" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>网页URL列表（每行一个）：</Text>
            <TextArea
              rows={4}
              value={urls}
              onChange={handleUrlsChange}
              placeholder="请输入要分析的网页URL，每行一个
例如：
https://example.com/news1
https://example.com/news2"
            />
          </div>
          
          <div>
            <Text strong>分析类型：</Text>
            <Select
              value={analysisType}
              onChange={handleAnalysisTypeChange}
              style={{ width: 200, marginLeft: 8 }}
            >
              <Option value="comprehensive">综合分析</Option>
              <Option value="technical">技术分析</Option>
              <Option value="fundamental">基本面分析</Option>
              <Option value="basic">基础分析</Option>
            </Select>
          </div>
          
          <Space>
            <Button 
              type="primary" 
              icon={<SearchOutlined />}
              onClick={handleComprehensiveAnalysis}
              loading={isLoading}
              disabled={!urls.trim()}
            >
              开始分析
            </Button>
            <Button onClick={handleClear}>
              清空结果
            </Button>
          </Space>
        </Space>
      </Card>

      {isLoading && (
        <Card style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>正在分析中...</Text>
            <Progress percent={progress} status="active" />
          </Space>
        </Card>
      )}

      {error && (
        <Alert
          message="分析失败"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {results && (
        <div>
          <Card title="抓取结果" style={{ marginBottom: 16 }}>
            {renderScrapingResults(results.scraping)}
          </Card>

          <Card title="投资分析报告" style={{ marginBottom: 16 }}>
            {renderAnalysisResults(results)}
          </Card>

          <Card title="详细分析结果">
            {renderDetailedResults(results)}
          </Card>
        </div>
      )}
    </div>
  );
};

export default WebScraping; 