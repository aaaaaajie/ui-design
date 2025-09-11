import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HomePage from './pages/HomePage';
import Collections from './pages/Collections';
import FieldInterface from './pages/FieldInterface';
import ApiComponent from './components/ApiComponent';
import './App.css';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <ConfigProvider locale={zhCN}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/field-interface" element={<FieldInterface />} />
          <Route path="/api-tester" element={<ApiComponent />} />
          <Route path="/admin" element={<AdminDashboard />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}

export default App;
