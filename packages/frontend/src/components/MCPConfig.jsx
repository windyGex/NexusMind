import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Space, 
  Table, 
  Tag, 
  Popconfirm, 
  message, 
  Modal,
  Typography,
  Divider,
  Tooltip,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ApiOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const MCPConfig = () => {
  const [form] = Form.useForm();
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState(null);
  const [testingServer, setTestingServer] = useState(null);

  // 加载MCP服务器配置
  const loadServers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/config');
      if (response.ok) {
        const data = await response.json();
        setServers(data.servers || []);
      } else {
        message.error('加载MCP配置失败');
      }
    } catch (error) {
      console.error('加载MCP配置失败:', error);
      message.error('加载MCP配置失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存MCP服务器配置
  const saveServer = async (values) => {
    try {
      const method = editingServer ? 'PUT' : 'POST';
      const url = editingServer 
        ? `/api/mcp/config/${editingServer.id}` 
        : '/api/mcp/config';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(editingServer ? '更新成功' : '添加成功');
        setModalVisible(false);
        setEditingServer(null);
        form.resetFields();
        await loadServers();
      } else {
        const errorData = await response.json();
        message.error(errorData.message || '保存失败');
      }
    } catch (error) {
      console.error('保存MCP配置失败:', error);
      message.error('保存失败');
    }
  };

  // 删除MCP服务器
  const deleteServer = async (serverId) => {
    try {
      const response = await fetch(`/api/mcp/config/${serverId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('删除成功');
        await loadServers();
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('删除MCP服务器失败:', error);
      message.error('删除失败');
    }
  };

  // 测试MCP服务器连接
  const testConnection = async (server) => {
    setTestingServer(server.id);
    try {
      const response = await fetch(`/api/mcp/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(server),
      });

      const result = await response.json();
      if (result.success) {
        message.success(`连接成功！发现 ${result.toolsCount || 0} 个工具`);
      } else {
        message.error(`连接失败: ${result.error}`);
      }
    } catch (error) {
      console.error('测试连接失败:', error);
      message.error('测试连接失败');
    } finally {
      setTestingServer(null);
    }
  };

  // 重新加载所有MCP服务器
  const reloadAllServers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/mcp/reload', {
        method: 'POST',
      });

      if (response.ok) {
        message.success('重新加载成功');
        await loadServers();
      } else {
        message.error('重新加载失败');
      }
    } catch (error) {
      console.error('重新加载失败:', error);
      message.error('重新加载失败');
    } finally {
      setLoading(false);
    }
  };

  // 打开编辑模态框
  const openEditModal = (server = null) => {
    setEditingServer(server);
    if (server) {
      form.setFieldsValue(server);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  useEffect(() => {
    loadServers();
  }, []);

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Text strong>{text}</Text>
          {record.type === 'streamable-http' && (
            <Tag color="blue" icon={<ThunderboltOutlined />}>流式</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '服务器URL',
      dataIndex: 'serverUrl',
      key: 'serverUrl',
      ellipsis: true,
      render: (url) => (
        <Tooltip title={url}>
          <Text code>{url}</Text>
        </Tooltip>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusConfig = {
          connected: { color: 'success', icon: <CheckCircleOutlined />, text: '已连接' },
          failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: '连接失败' },
          connecting: { color: 'processing', icon: <ApiOutlined />, text: '连接中' },
        };
        const config = statusConfig[status] || { color: 'default', text: '未知' };
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '工具数量',
      dataIndex: 'toolsCount',
      key: 'toolsCount',
      width: 100,
      render: (count) => (
        <Tag color="blue">{count || 0} 个</Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<ApiOutlined />}
            loading={testingServer === record.id}
            onClick={() => testConnection(record)}
          >
            测试
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个MCP服务器吗？"
            onConfirm={() => deleteServer(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Title level={2}>
            <ApiOutlined style={{ marginRight: '8px' }} />
            MCP服务器配置
          </Title>
          <Text type="secondary">
            管理Model Context Protocol (MCP) 服务器连接，配置外部工具和资源
          </Text>
        </div>

        <Alert
          message="配置说明"
          description="MCP服务器提供外部工具和资源。支持标准HTTP和streamable-http两种类型。配置会保存到本地文件中。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <div style={{ marginBottom: '16px' }}>
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openEditModal()}
            >
              添加服务器
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={loading}
              onClick={reloadAllServers}
            >
              重新加载
            </Button>
          </Space>
        </div>

        <Table
          columns={columns}
          dataSource={servers}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title={editingServer ? '编辑MCP服务器' : '添加MCP服务器'}
          open={modalVisible}
          onCancel={() => {
            setModalVisible(false);
            setEditingServer(null);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={saveServer}
          >
            <Form.Item
              name="id"
              label="服务器ID"
              rules={[
                { required: true, message: '请输入服务器ID' },
                { pattern: /^[a-zA-Z0-9_-]+$/, message: 'ID只能包含字母、数字、下划线和横线' }
              ]}
            >
              <Input placeholder="例如: amap, febase" disabled={!!editingServer} />
            </Form.Item>

            <Form.Item
              name="name"
              label="显示名称"
              rules={[{ required: true, message: '请输入显示名称' }]}
            >
              <Input placeholder="例如: 高德地图, 大前端研发" />
            </Form.Item>

            <Form.Item
              name="serverUrl"
              label="服务器URL"
              rules={[
                { required: true, message: '请输入服务器URL' },
                { type: 'url', message: '请输入有效的URL' }
              ]}
            >
              <Input placeholder="https://example.com/mcp" />
            </Form.Item>

            <Form.Item
              name="type"
              label="服务器类型"
              rules={[{ required: true, message: '请选择服务器类型' }]}
              initialValue="standard"
            >
              <Select>
                <Option value="standard">标准HTTP</Option>
                <Option value="streamable-http">流式HTTP</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="apiKey"
              label="API密钥"
              help="可选，某些服务器需要API密钥进行认证"
            >
              <Input.Password placeholder="请输入API密钥（可选）" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  {editingServer ? '更新' : '添加'}
                </Button>
                <Button onClick={() => {
                  setModalVisible(false);
                  setEditingServer(null);
                  form.resetFields();
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default MCPConfig;
