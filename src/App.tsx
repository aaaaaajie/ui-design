import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HomePage from './pages/HomePage';
import Collections from './pages/Collections';
import FieldInterface from './pages/FieldInterface';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/field-interface" element={<FieldInterface />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
