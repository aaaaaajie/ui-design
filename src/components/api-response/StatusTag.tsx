import { Space, Tag, Typography } from 'antd';
import type { ResponseData } from './types';

const { Text } = Typography;

export default function StatusTag({ resp }: { resp: ResponseData }) {
  const code = resp?.status;
  const ok = typeof code === 'number' && code >= 200 && code < 300;
  return (
    <Space size={8}>
      <Tag color={ok ? 'green' : 'red'}>{code ?? 'N/A'}</Tag>
      <Text>{resp?.statusText || (ok ? 'OK' : 'Error')}</Text>
      {resp?.timestamp ? <Text type="secondary">at {resp.timestamp}</Text> : null}
    </Space>
  );
}
