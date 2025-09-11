import React from 'react';
import { Card, Space, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TableOutlined, SettingOutlined, ApiOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={1} style={{ textAlign: 'center', marginBottom: '48px' }}>
        UI Design System
      </Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card 
          hoverable
          style={{ width: '100%' }}
          cover={
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
            }}>
              <TableOutlined style={{ fontSize: '48px', color: 'white' }} />
            </div>
          }
        >
          <Card.Meta 
            title="Collections Management" 
            description="管理数据集合，支持表格展示、字段配置、导入导出等功能"
          />
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              onClick={() => navigate('/collections')}
              block
            >
              进入 Collections 页面
            </Button>
          </div>
        </Card>

        <Card 
          hoverable
          style={{ width: '100%' }}
          cover={
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' 
            }}>
              <SettingOutlined style={{ fontSize: '48px', color: 'white' }} />
            </div>
          }
        >
          <Card.Meta 
            title="Field Interface Demo" 
            description="字段接口级联选择器交互演示，支持复杂的字段类型配置"
          />
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              onClick={() => navigate('/field-interface')}
              block
            >
              进入 Field Interface 页面
            </Button>
          </div>
        </Card>

        <Card 
          hoverable
          style={{ width: '100%' }}
          cover={
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' 
            }}>
              <ApiOutlined style={{ fontSize: '48px', color: 'white' }} />
            </div>
          }
        >
          <Card.Meta 
            title="API Tester" 
            description="API 接口测试工具，支持发送 HTTP 请求、查看响应、数据转换和 UI 展示"
          />
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              onClick={() => navigate('/api-tester')}
              block
            >
              进入 API 测试工具
            </Button>
          </div>
        </Card>

        <Card 
          hoverable
          style={{ width: '100%' }}
          cover={
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              background: 'linear-gradient(135deg, #1c92d2 0%, #f2fcfe 100%)' 
            }}>
              <TableOutlined style={{ fontSize: '48px', color: 'white' }} />
            </div>
          }
        >
          <Card.Meta 
            title="Admin Dashboard" 
            description="后台管理界面（数据源、集合、系统设置等）"
          />
          <div style={{ marginTop: '16px' }}>
            <Button 
              type="primary" 
              onClick={() => navigate('/admin')}
              block
            >
              进入 管理控制台
            </Button>
          </div>
        </Card>
      </Space>

      <div style={{ marginTop: '48px', textAlign: 'center' }}>
        <Paragraph type="secondary">
          这是一个基于 React + Ant Design 的 UI 设计系统演示项目
        </Paragraph>
      </div>
    </div>
  );
};

export default HomePage;
