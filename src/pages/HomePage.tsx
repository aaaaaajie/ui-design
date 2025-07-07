import React from 'react';
import { Card, Space, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { TableOutlined, SettingOutlined } from '@ant-design/icons';

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
