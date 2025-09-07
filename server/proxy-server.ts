import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(express.json({ limit: '5mb' }));

// 允许来自本地 Vite 开发端口的请求
app.use(cors({ origin: true }));

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// 请求转发接口
app.post('/proxy/request', async (req, res) => {
  const {
    method = 'get',
    url,
    headers = {},
    params,
    data,
    timeout = 30000,
    responseType,
  } = (req.body || {}) as {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    params?: any;
    data?: any;
    timeout?: number;
    responseType?: 'json' | 'text' | 'arraybuffer' | 'stream';
  };

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: true, message: 'Invalid url' });
  }

  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: true, message: 'Unsupported protocol' });
    }
  } catch {
    return res.status(400).json({ error: true, message: 'Invalid url' });
  }

  try {
    const axRes = await axios.request({
      method: method as any,
      url,
      headers,
      params,
      data,
      timeout,
      responseType: (responseType as any) || 'json',
      // 不抛错，统一由响应体返回 status
      validateStatus: () => true,
    });

    // 直接透传响应数据和头信息
    return res.json({
      status: axRes.status,
      statusText: axRes.statusText,
      headers: axRes.headers,
      data: axRes.data,
    });
  } catch (err: any) {
    return res.status(200).json({
      error: true,
      message: err?.message || 'Proxy request failed',
    });
  }
});

const port = Number(process.env.PORT || 7071);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Proxy server listening at http://localhost:${port}`);
});
