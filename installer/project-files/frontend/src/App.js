import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [analytics, setAnalytics] = useState({});
  const [apiKeys, setApiKeys] = useState([]);
  const [generatedContent, setGeneratedContent] = useState([]);
  const [contentForm, setContentForm] = useState({
    topics: '',
    language: 'english',
    tone: 'professional',
    length: 'medium'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
    fetchAnalytics();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const response = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(response.data);
        setIsAuthenticated(true);
        if (response.data.is_admin) {
          fetchApiKeys();
        }
      } catch (error) {
        localStorage.removeItem('token');
      }
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
  };

  const fetchApiKeys = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API}/admin/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApiKeys(response.data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
    }
  };

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API}/content`);
      setGeneratedContent(response.data);
    } catch (error) {
      console.error('Failed to fetch content:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/auth/login`, loginForm);
      localStorage.setItem('token', response.data.access_token);
      setUser(response.data.user);
      setIsAuthenticated(true);
      if (response.data.user.is_admin) {
        fetchApiKeys();
      }
    } catch (error) {
      alert('Login failed: ' + error.response?.data?.detail);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setActiveTab('dashboard');
  };

  const createAdmin = async () => {
    try {
      const response = await axios.post(`${API}/auth/create-admin`);
      alert(`Admin created!\nUsername: ${response.data.username}\nPassword: ${response.data.password}`);
    } catch (error) {
      alert('Failed to create admin: ' + error.response?.data?.detail);
    }
  };

  const generateContent = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      alert('Please login first');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post(`${API}/generate`, {
        ...contentForm,
        topics: contentForm.topics.split(',').map(t => t.trim()).filter(Boolean)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Content generated successfully!');
      fetchContent();
    } catch (error) {
      alert('Content generation failed: ' + error.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    const provider = prompt('Provider (gemini/openai/anthropic):');
    const model = prompt('Model name:');
    const apiKey = prompt('API Key:');
    
    if (!provider || !model || !apiKey) return;

    const token = localStorage.getItem('token');
    try {
      await axios.post(`${API}/admin/api-keys`, {
        provider,
        model,
        api_key: apiKey,
        priority: 1,
        max_requests_per_day: 1000
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('API key added successfully!');
      fetchApiKeys();
    } catch (error) {
      alert('Failed to add API key: ' + error.response?.data?.detail);
    }
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1>🤖 TechPulse AI</h1>
            <p>Professional AI Content Generation Platform</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                placeholder="Enter username"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                placeholder="Enter password"
                required
              />
            </div>
            
            <button type="submit" className="login-btn">Login</button>
          </form>
          
          <div className="login-footer">
            <div className="admin-info">
              <h3>Default Admin Credentials:</h3>
              <p><strong>Username:</strong> admin</p>
              <p><strong>Password:</strong> admin123!@#TechPulse</p>
            </div>
            
            <button onClick={createAdmin} className="create-admin-btn">
              Create Admin User
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Application
  return (
    <div className="app">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="nav-icon">🤖</span>
          <span className="nav-title">TechPulse AI</span>
          <span className="nav-version">v1.1.0</span>
        </div>
        
        <div className="nav-menu">
          <button 
            className={activeTab === 'dashboard' ? 'nav-link active' : 'nav-link'}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          
          <button 
            className={activeTab === 'generate' ? 'nav-link active' : 'nav-link'}
            onClick={() => setActiveTab('generate')}
          >
            🤖 Generate Content
          </button>
          
          {user?.is_admin && (
            <button 
              className={activeTab === 'admin' ? 'nav-link active' : 'nav-link'}
              onClick={() => setActiveTab('admin')}
            >
              👑 Admin Panel
            </button>
          )}
          
          <div className="nav-user">
            <span>Hello, {user?.full_name}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </nav>

      <main className="main-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard">
            <div className="dashboard-header">
              <h1>Dashboard</h1>
              <p>Welcome to TechPulse AI Platform</p>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>Total Users</h3>
                  <p className="stat-number">{analytics.system?.total_users || 0}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">🔑</div>
                <div className="stat-info">
                  <h3>API Keys</h3>
                  <p className="stat-number">{analytics.system?.active_api_keys || 0}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📝</div>
                <div className="stat-info">
                  <h3>Generated Content</h3>
                  <p className="stat-number">{analytics.content?.total_generated || 0}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-info">
                  <h3>SEO Score</h3>
                  <p className="stat-number">{analytics.content?.avg_seo_score || 0}%</p>
                </div>
              </div>
            </div>
            
            <div className="features-section">
              <h2>Platform Features</h2>
              <div className="features-grid">
                <div className="feature-item">
                  <h3>🤖 AI Content Generation</h3>
                  <p>Generate professional content in multiple languages</p>
                </div>
                
                <div className="feature-item">
                  <h3>🔑 API Key Management</h3>
                  <p>Manage multiple AI providers with automatic failover</p>
                </div>
                
                <div className="feature-item">
                  <h3>🌐 Multi-language Support</h3>
                  <p>Content generation in English, Hindi, and Bangla</p>
                </div>
                
                <div className="feature-item">
                  <h3>📊 SEO Optimization</h3>
                  <p>100% SEO score with proper keywords and tags</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'generate' && (
          <div className="generate-content">
            <div className="section-header">
              <h1>AI Content Generator</h1>
              <p>Generate professional articles using AI</p>
            </div>
            
            <form onSubmit={generateContent} className="content-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Topics (comma-separated)</label>
                  <textarea
                    value={contentForm.topics}
                    onChange={(e) => setContentForm({...contentForm, topics: e.target.value})}
                    placeholder="AI, Machine Learning, Technology..."
                    rows="3"
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Language</label>
                  <select
                    value={contentForm.language}
                    onChange={(e) => setContentForm({...contentForm, language: e.target.value})}
                  >
                    <option value="english">🇺🇸 English</option>
                    <option value="hindi">🇮🇳 Hindi</option>
                    <option value="bangla">🇧🇩 Bangla</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Tone</label>
                  <select
                    value={contentForm.tone}
                    onChange={(e) => setContentForm({...contentForm, tone: e.target.value})}
                  >
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Length</label>
                  <select
                    value={contentForm.length}
                    onChange={(e) => setContentForm({...contentForm, length: e.target.value})}
                  >
                    <option value="short">Short (500 words)</option>
                    <option value="medium">Medium (1200 words)</option>
                    <option value="long">Long (2000 words)</option>
                  </select>
                </div>
              </div>
              
              <button type="submit" className="generate-btn" disabled={loading}>
                {loading ? '🔄 Generating...' : '🤖 Generate Content'}
              </button>
            </form>
            
            <div className="content-list">
              <div className="section-header">
                <h2>Generated Content</h2>
                <button onClick={fetchContent} className="refresh-btn">🔄 Refresh</button>
              </div>
              
              <div className="content-items">
                {generatedContent.map((item) => (
                  <div key={item.id} className="content-item">
                    <h3>{item.title}</h3>
                    <p className="content-summary">{item.summary}</p>
                    <div className="content-meta">
                      <span className="meta-item">📝 {item.word_count} words</span>
                      <span className="meta-item">🌐 {item.language}</span>
                      <span className="meta-item">📊 SEO: {item.seo_score}%</span>
                      <span className="meta-item">🎭 {item.tone}</span>
                    </div>
                    <div className="content-keywords">
                      {item.keywords.slice(0, 5).map((keyword, index) => (
                        <span key={index} className="keyword-tag">{keyword}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'admin' && user?.is_admin && (
          <div className="admin-panel">
            <div className="section-header">
              <h1>Admin Panel</h1>
              <p>Platform management and configuration</p>
            </div>
            
            <div className="admin-section">
              <div className="section-header">
                <h2>API Key Management</h2>
                <button onClick={addApiKey} className="add-btn">+ Add API Key</button>
              </div>
              
              <div className="api-keys-list">
                {apiKeys.map((key) => (
                  <div key={key.id} className="api-key-item">
                    <div className="key-info">
                      <h3>{key.provider} - {key.model}</h3>
                      <p>API Key: {key.api_key}</p>
                      <div className="key-meta">
                        <span>Priority: {key.priority}</span>
                        <span>Usage: {key.current_usage}/{key.max_requests_per_day}</span>
                        <span className={key.is_active ? 'status-active' : 'status-inactive'}>
                          {key.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                
                {apiKeys.length === 0 && (
                  <div className="empty-state">
                    <p>No API keys configured</p>
                    <p>Add your first API key to enable content generation</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="admin-section">
              <h2>System Information</h2>
              <div className="system-info">
                <div className="info-item">
                  <strong>Platform Version:</strong> 1.1.0
                </div>
                <div className="info-item">
                  <strong>Database Status:</strong> Connected
                </div>
                <div className="info-item">
                  <strong>System Status:</strong> {analytics.system?.status || 'Unknown'}
                </div>
                <div className="info-item">
                  <strong>Uptime:</strong> {analytics.performance?.uptime || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;