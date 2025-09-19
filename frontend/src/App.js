import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import { 
  Bot, 
  Rss, 
  FileText, 
  Settings, 
  BarChart3, 
  Search, 
  Plus, 
  Play, 
  Share2, 
  Globe,
  BookOpen,
  Zap,
  TrendingUp,
  Eye,
  Clock,
  Star,
  Download,
  Languages,
  Target,
  Loader,
  ChevronRight,
  Check,
  X,
  Smartphone,
  Monitor,
  Chrome,
  User,
  LogIn,
  LogOut,
  Menu,
  ChevronLeft,
  Home,
  Newspaper,
  Heart,
  Tag,
  Calendar,
  ExternalLink,
  ArrowRight,
  ChevronDown,
  Filter,
  Flame,
  Award
} from 'lucide-react';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { toast, Toaster } from 'sonner';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        username,
        password
      });
      
      const { access_token, user: userData } = response.data;
      localStorage.setItem('token', access_token);
      setToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      await axios.post(`${API}/auth/register`, userData);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      isAuthenticated: !!user,
      isAdmin: user?.is_admin || false 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Login Component
const LoginForm = ({ onClose }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(formData.username, formData.password);
    
    if (result.success) {
      toast.success('Logged in successfully!');
      onClose();
      navigate('/admin');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Username</label>
        <Input
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
          placeholder="Enter username"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Password</label>
        <Input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
          placeholder="Enter password"
          required
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600">
        {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <LogIn className="w-4 h-4 mr-2" />}
        Login
      </Button>
      <div className="text-center text-sm text-gray-600">
        <p>Admin credentials:</p>
        <p><strong>Username:</strong> admin | <strong>Password:</strong> admin123!@#TechPulse</p>
      </div>
    </form>
  );
};

// Enhanced News Homepage Component
const NewsHomepage = () => {
  const [articles, setArticles] = useState([]);
  const [generatedContent, setGeneratedContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [featuredArticles, setFeaturedArticles] = useState([]);
  const [trendingArticles, setTrendingArticles] = useState([]);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const [articlesRes, contentRes] = await Promise.all([
        axios.get(`${API}/articles?limit=50`).catch(() => ({ data: [] })),
        axios.get(`${API}/content?limit=30`).catch(() => ({ data: [] }))
      ]);
      
      const articlesData = articlesRes.data || [];
      const contentData = contentRes.data || [];
      
      setArticles(articlesData);
      setGeneratedContent(contentData);
      
      // Set featured articles (AI generated content)
      setFeaturedArticles(contentData.slice(0, 6));
      
      // Set trending articles (mix of both)
      const allContent = [...articlesData, ...contentData];
      setTrendingArticles(allContent.sort(() => 0.5 - Math.random()).slice(0, 8));
      
    } catch (error) {
      console.error('Error fetching content:', error);
      setArticles([]);
      setGeneratedContent([]);
      setFeaturedArticles([]);
      setTrendingArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'technology', 'ai', 'programming', 'startup', 'business'];

  const filteredContent = [...articles, ...generatedContent].filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || 
      item.category === selectedCategory ||
      (item.tags && item.tags.includes(selectedCategory));
    
    return matchesSearch && matchesCategory;
  });

  const handleArticleClick = (article) => {
    // Check if it's generated content (has content field) or RSS article (has url)
    if (article.content && article.content.length > article.summary?.length) {
      // Navigate to internal article view for generated content
      navigate(`/article/${article.id}`);
    } else if (article.url) {
      // Open external URL for RSS articles
      window.open(article.url, '_blank');
    } else {
      // Fallback to internal view
      navigate(`/article/${article.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-emerald-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading latest tech news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Hero Section with Slider */}
      <section className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">
              TechPulse
            </h1>
            <p className="text-2xl text-emerald-100 mb-8">AI-Powered Technology News & Insights</p>
            <div className="flex items-center justify-center gap-6 text-emerald-200">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <span>AI Generated</span>
              </div>
              <div className="flex items-center gap-2">
                <Rss className="w-5 h-5" />
                <span>Real-time RSS</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                <span>Trending Topics</span>
              </div>
            </div>
          </div>
          
          {/* Featured Articles Carousel */}
          {featuredArticles.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold flex items-center">
                  <Star className="w-8 h-8 mr-3 text-yellow-400" />
                  Featured Stories
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-white hover:bg-white/20"
                  onClick={() => setFavoritesOpen(!favoritesOpen)}
                >
                  {favoritesOpen ? 'Show Less' : 'View All'}
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${favoritesOpen ? 'rotate-180' : ''}`} />
                </Button>
              </div>
              
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${favoritesOpen ? '' : 'lg:grid-cols-3'}`}>
                {(favoritesOpen ? featuredArticles : featuredArticles.slice(0, 3)).map((article, index) => (
                  <Card 
                    key={article.id} 
                    className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 transition-all cursor-pointer group transform hover:scale-105"
                    onClick={() => handleArticleClick(article)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-100 border-yellow-400/30">
                          #{index + 1} Featured
                        </Badge>
                        {article.seo_score && (
                          <Badge variant="outline" className="border-white/30 text-white">
                            SEO: {article.seo_score}%
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-bold text-xl mb-4 line-clamp-2 group-hover:text-yellow-200 transition-colors">
                        {article.title}
                      </h3>
                      <p className="text-emerald-100 text-sm line-clamp-3 mb-6">
                        {article.summary}
                      </p>
                      <div className="flex items-center justify-between text-sm text-emerald-200">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {new Date(article.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex items-center">
                          {article.content ? (
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-100 mr-2">
                              <Bot className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-blue-500/20 text-blue-100 mr-2">
                              <Globe className="w-3 h-3 mr-1" />
                              RSS
                            </Badge>
                          )}
                          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Enhanced Search and Filter Section */}
      <section className="bg-white shadow-lg border-b border-gray-200 py-8 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-6 items-center justify-between">
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search articles, topics, and insights..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-lg border-2 border-gray-200 focus:border-emerald-500 rounded-xl"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 flex-wrap">
              <Filter className="w-5 h-5 text-gray-500" />
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={`${
                    selectedCategory === category 
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                      : "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                  } rounded-full px-4 py-2 transition-all`}
                >
                  <Tag className="w-3 h-3 mr-2" />
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Articles */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center">
                <Newspaper className="w-8 h-8 mr-3 text-emerald-500" />
                Latest News & Articles
              </h2>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 px-4 py-2 text-lg">
                {filteredContent.length} articles
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {filteredContent.map((item) => (
                <Card 
                  key={item.id} 
                  className="hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-lg hover:scale-105"
                  onClick={() => handleArticleClick(item)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <Badge variant="outline" className="text-sm border-emerald-200 text-emerald-700">
                        {item.category || 'General'}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {item.content ? (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                            <Bot className="w-3 h-3 mr-1" />
                            AI Generated
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            <Globe className="w-3 h-3 mr-1" />
                            RSS Feed
                          </Badge>
                        )}
                        {item.seo_score && (
                          <Badge variant="secondary" className="text-xs">
                            SEO: {item.seo_score}%
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-xl mb-4 line-clamp-2 group-hover:text-emerald-600 transition-colors leading-tight">
                      {item.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm line-clamp-3 mb-6 leading-relaxed">
                      {item.summary}
                    </p>
                    
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {item.keywords.slice(0, 4).map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-gray-100 hover:bg-gray-200 transition-colors">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {new Date(item.created_at || item.published_date).toLocaleDateString()}
                        </span>
                        {item.source && (
                          <span className="flex items-center">
                            <Globe className="w-4 h-4 mr-1" />
                            {item.source}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-8 px-3 text-sm hover:bg-emerald-50 hover:text-emerald-700">
                          <Eye className="w-4 h-4 mr-1" />
                          Read More
                        </Button>
                        {!item.content && item.url && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 px-2 text-sm hover:bg-emerald-50 hover:text-emerald-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(item.url, '_blank');
                            }}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredContent.length === 0 && (
              <div className="text-center py-16">
                <BookOpen className="w-24 h-24 text-gray-300 mx-auto mb-6" />
                <h3 className="text-2xl font-medium text-gray-900 mb-4">No articles found</h3>
                <p className="text-gray-500 text-lg">Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>

          {/* Enhanced Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-8 sticky top-40">
              {/* Trending Topics */}
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Flame className="w-6 h-6 mr-3 text-red-500" />
                    Trending Now
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {['Artificial Intelligence', 'Machine Learning', 'Blockchain', 'Web3', 'Cybersecurity', 'Cloud Computing', 'IoT', 'Quantum Computing'].map((topic, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => setSearchTerm(topic)}
                      >
                        <span className="text-sm font-medium group-hover:text-emerald-600">{topic}</span>
                        <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                          {Math.floor(Math.random() * 50) + 10}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Latest AI Generated */}
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Bot className="w-6 h-6 mr-3 text-purple-500" />
                    AI Generated
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generatedContent.slice(0, 5).map((content) => (
                      <div 
                        key={content.id} 
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => handleArticleClick(content)}
                      >
                        <h4 className="font-medium text-sm line-clamp-2 mb-3 group-hover:text-emerald-600">
                          {content.title}
                        </h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center">
                            <Languages className="w-3 h-3 mr-1" />
                            {content.language}
                          </span>
                          <span className="flex items-center">
                            <FileText className="w-3 h-3 mr-1" />
                            {content.word_count} words
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Categories */}
              <Card className="shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <Award className="w-6 h-6 mr-3 text-blue-500" />
                    Top Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories.filter(cat => cat !== 'all').map((category) => (
                      <Button
                        key={category}
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full justify-start h-10 px-3 text-left hover:bg-emerald-50 hover:text-emerald-700 ${
                          selectedCategory === category ? 'bg-emerald-100 text-emerald-700' : ''
                        }`}
                      >
                        <ChevronRight className="w-4 h-4 mr-2" />
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// AI Generator Component
const AIGenerator = () => {
  const [formData, setFormData] = useState({
    topics: '',
    language: 'english',
    tone: 'professional',
    length: 'medium',
    article_count: 3,
    include_seo: true
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishingTo, setPublishingTo] = useState([]);

  const handleGenerate = async () => {
    if (!formData.topics.trim()) {
      toast.error('Please enter at least one topic');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/generate`, {
        ...formData,
        topics: formData.topics.split(',').map(t => t.trim()).filter(Boolean)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedContent(response.data);
      toast.success('Content generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate content');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (platforms) => {
    if (!generatedContent) return;
    
    setPublishingTo(platforms);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/publish`, {
        content_id: generatedContent.id,
        platforms
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Mark as published in database
      await axios.put(`${API}/content/${generatedContent.id}`, {
        is_published: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Content published successfully!');
      console.log('Publishing results:', response.data.results);
    } catch (error) {
      toast.error('Failed to publish content');
    } finally {
      setPublishingTo([]);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-emerald-500" />
            AI Content Generator
          </CardTitle>
          <CardDescription>
            Generate professional tech articles from trending RSS feeds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Topics (comma-separated)</label>
                <Textarea
                  placeholder="AI, Machine Learning, Blockchain, Mobile Apps..."
                  value={formData.topics}
                  onChange={(e) => setFormData({...formData, topics: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="english">🇺🇸 English</SelectItem>
                    <SelectItem value="hindi">🇮🇳 Hindi</SelectItem>
                    <SelectItem value="bangla">🇧🇩 Bangla</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Article Length</label>
                <Select value={formData.length} onValueChange={(value) => setFormData({...formData, length: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short (500 words)</SelectItem>
                    <SelectItem value="medium">Medium (1200 words)</SelectItem>
                    <SelectItem value="long">Long (2000 words)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Writing Tone</label>
                <Select value={formData.tone} onValueChange={(value) => setFormData({...formData, tone: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="conversational">Conversational</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Source Articles</label>
                <Select value={formData.article_count.toString()} onValueChange={(value) => setFormData({...formData, article_count: parseInt(value)})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Articles</SelectItem>
                    <SelectItem value="5">5 Articles</SelectItem>
                    <SelectItem value="7">7 Articles</SelectItem>
                    <SelectItem value="10">10 Articles</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-4">
                <input
                  type="checkbox"
                  id="seo"
                  checked={formData.include_seo}
                  onChange={(e) => setFormData({...formData, include_seo: e.target.checked})}
                  className="rounded"
                />
                <label htmlFor="seo" className="text-sm font-medium">
                  Include SEO optimization
                </label>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Generating Content...
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 mr-2" />
                Generate AI Article
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedContent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Generated Content</span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
                  SEO: {generatedContent.seo_score}%
                </Badge>
                <Badge variant="outline">
                  {generatedContent.word_count} words
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-lg font-bold mb-2">{generatedContent.title}</h3>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 leading-relaxed max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                  {generatedContent.content.substring(0, 1000)}...
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Keywords:</span>
              {generatedContent.keywords.slice(0, 8).map((keyword, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium">Tags:</span>
              {generatedContent.tags.slice(0, 6).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={() => handlePublish(['facebook', 'twitter', 'linkedin'])}
                disabled={publishingTo.length > 0}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {publishingTo.includes('facebook') ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Share2 className="w-4 h-4 mr-2" />
                )}
                Publish to Social Media
              </Button>
              
              <Button 
                onClick={() => handlePublish(['wordpress'])}
                disabled={publishingTo.length > 0}
                variant="outline"
              >
                {publishingTo.includes('wordpress') ? (
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Monitor className="w-4 h-4 mr-2" />
                )}
                Publish to WordPress
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// RSS Management Component
const RSSManagement = () => {
  const [feeds, setFeeds] = useState([]);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feeds');

  useEffect(() => {
    fetchFeeds();
    fetchArticles();
  }, []);

  const fetchFeeds = async () => {
    try {
      const response = await axios.get(`${API}/feeds`);
      setFeeds(response.data);
    } catch (error) {
      console.error('Error fetching feeds:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`${API}/articles?limit=20`);
      setArticles(response.data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rss className="w-5 h-5 text-emerald-500" />
            RSS Feed Management
          </CardTitle>
          <CardDescription>
            Manage your RSS sources and collected articles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="feeds">RSS Feeds ({feeds.length})</TabsTrigger>
              <TabsTrigger value="articles">Articles ({articles.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="feeds" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {feeds.map((feed) => (
                    <Card key={feed.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold truncate">{feed.title}</h4>
                          <Badge 
                            variant={feed.is_active ? "default" : "secondary"}
                            className={feed.is_active ? "bg-emerald-500" : "bg-gray-400"}
                          >
                            {feed.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2 capitalize">{feed.category}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Languages className="w-3 h-3" />
                            {feed.language}
                          </span>
                          {feed.last_fetched && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Last fetched
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="articles" className="space-y-4">
              <div className="space-y-4">
                {articles.map((article) => (
                  <Card key={article.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {article.image_url && (
                          <img 
                            src={article.image_url} 
                            alt={article.title}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold line-clamp-2 hover:text-emerald-600 cursor-pointer">
                              {article.title}
                            </h4>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {article.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                            {article.summary}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{article.source}</span>
                            <div className="flex items-center gap-4">
                              {article.seo_score && (
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3" />
                                  SEO: {article.seo_score}%
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(article.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {article.keywords.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {article.keywords.slice(0, 5).map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const Dashboard = () => {
  const [analytics, setAnalytics] = useState({
    feeds: { total: 0, active: 0 },
    articles: { total: 0, by_category: [] },
    generated_content: { total: 0, published: 0, by_language: [] },
    performance: { avg_seo_score: 0, avg_word_count: 0, success_rate: 0 }
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics`);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const createDefaultAdmin = async () => {
    try {
      const response = await axios.post(`${API}/auth/create-admin`);
      toast.success('Default admin created successfully!');
      toast.info(`Username: ${response.data.username}, Password: ${response.data.password}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create admin');
    }
  };

  const addGeminiKey = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/api-keys`, {
        provider: "gemini",
        model: "gemini-2.0-flash",
        api_key: "AIzaSyD5lsEygNj5nTz2RJ5jK6UKxNG6_fqKF0o",
        priority: 1,
        max_requests_per_day: 1000
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Gemini API key added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add API key');
    }
  };

  const initializeFeeds = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/feeds/initialize`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(response.data.message);
      fetchAnalytics();
    } catch (error) {
      toast.error('Failed to initialize feeds');
    }
  };

  const collectArticles = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/articles/collect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Article collection started in background');
      setTimeout(fetchAnalytics, 3000);
    } catch (error) {
      toast.error('Failed to start article collection');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Message */}
      <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user?.full_name || user?.username}!
          </h2>
          <p className="text-emerald-100">
            {user?.is_admin ? 'Admin Dashboard - Full system control' : 'User Dashboard - Content management'}
          </p>
        </CardContent>
      </Card>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-100 text-sm font-medium">RSS Feeds</p>
                <p className="text-3xl font-bold">{analytics.feeds.active}</p>
                <p className="text-emerald-200 text-xs">Active Sources</p>
              </div>
              <Rss className="w-8 h-8 text-emerald-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Articles</p>
                <p className="text-3xl font-bold">{analytics.articles.total}</p>
                <p className="text-blue-200 text-xs">Collected</p>
              </div>
              <FileText className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">AI Generated</p>
                <p className="text-3xl font-bold">{analytics.generated_content.total}</p>
                <p className="text-purple-200 text-xs">Articles</p>
              </div>
              <Bot className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">SEO Score</p>
                <p className="text-3xl font-bold">{analytics.performance.avg_seo_score}%</p>
                <p className="text-orange-200 text-xs">Average</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-500" />
            Quick Actions
          </CardTitle>
          <CardDescription>
            Get started with TechPulse AI platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {user?.is_admin && (
              <>
                <Button 
                  onClick={createDefaultAdmin}
                  className="h-16 bg-blue-500 hover:bg-blue-600 flex items-center justify-between p-6"
                >
                  <div className="text-left">
                    <div className="font-semibold">Create Admin</div>
                    <div className="text-sm opacity-90">Default admin user</div>
                  </div>
                  <User className="w-5 h-5" />
                </Button>
                
                <Button 
                  onClick={addGeminiKey}
                  className="h-16 bg-purple-500 hover:bg-purple-600 flex items-center justify-between p-6"
                >
                  <div className="text-left">
                    <div className="font-semibold">Add Gemini Key</div>
                    <div className="text-sm opacity-90">Free API integration</div>
                  </div>
                  <Bot className="w-5 h-5" />
                </Button>
              </>
            )}
            
            <Button 
              onClick={initializeFeeds}
              className="h-16 bg-emerald-500 hover:bg-emerald-600 flex items-center justify-between p-6"
            >
              <div className="text-left">
                <div className="font-semibold">Initialize RSS Feeds</div>
                <div className="text-sm opacity-90">Add 50+ trending tech sources</div>
              </div>
              <Plus className="w-5 h-5" />
            </Button>
            
            <Button 
              onClick={collectArticles}
              variant="outline"
              className="h-16 flex items-center justify-between p-6 border-2 hover:bg-slate-50"
            >
              <div className="text-left">
                <div className="font-semibold">Collect Articles</div>
                <div className="text-sm text-gray-600">Fetch latest tech news</div>
              </div>
              <Download className="w-5 h-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Enhanced Article View Component
const ArticleView = () => {
  const { articleId } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (articleId) {
      fetchArticle();
    }
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      // Try to get generated content first
      const response = await axios.get(`${API}/content/${articleId}`);
      setArticle(response.data);
    } catch (error) {
      // If not found in generated content, try articles
      try {
        const articlesResponse = await axios.get(`${API}/articles`);
        const foundArticle = articlesResponse.data.find(a => a.id === articleId);
        if (foundArticle) {
          setArticle(foundArticle);
        } else {
          toast.error('Article not found');
        }
      } catch (err) {
        toast.error('Article not found');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Article not found</h2>
          <Button onClick={() => navigate('/')} className="bg-emerald-500 hover:bg-emerald-600">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <article className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')} 
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 mb-4"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back to Homepage
              </Button>
              
              <div className="flex items-center gap-3 mb-6">
                <Badge variant="outline" className="text-emerald-700 border-emerald-200">
                  {article.language || 'English'}
                </Badge>
                {article.seo_score && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    SEO: {article.seo_score}%
                  </Badge>
                )}
                <Badge variant={article.is_published ? "default" : "outline"} className={article.is_published ? "bg-green-500" : ""}>
                  {article.is_published ? "Published" : "Draft"}
                </Badge>
                {article.content ? (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                    <Bot className="w-3 h-3 mr-1" />
                    AI Generated
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    <Globe className="w-3 h-3 mr-1" />
                    RSS Feed
                  </Badge>
                )}
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-8 leading-tight text-gray-900">
              {article.title}
            </h1>
            
            <div className="flex items-center gap-6 text-gray-600 mb-8 pb-6 border-b border-gray-200">
              <span className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                {new Date(article.created_at || article.published_date).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
              {article.word_count && (
                <span className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  {article.word_count} words
                </span>
              )}
              {article.source && (
                <span className="flex items-center">
                  <Globe className="w-5 h-5 mr-2" />
                  {article.source}
                </span>
              )}
            </div>
            
            <div className="prose prose-lg max-w-none">
              <div className="text-lg leading-relaxed whitespace-pre-wrap text-gray-800">
                {article.content || article.summary || 'Content not available.'}
              </div>
            </div>
            
            {article.url && !article.content && (
              <div className="mt-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-blue-800 mb-4">This is a preview from an external source. Read the full article:</p>
                <Button 
                  onClick={() => window.open(article.url, '_blank')}
                  className="bg-blue-500 hover:bg-blue-600"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Read Full Article
                </Button>
              </div>
            )}
            
            {article.keywords && article.keywords.length > 0 && (
              <div className="mt-10 pt-8 border-t border-gray-200">
                <h3 className="text-xl font-semibold mb-4">Keywords:</h3>
                <div className="flex flex-wrap gap-2">
                  {article.keywords.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {article.tags && article.tags.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-4">Tags:</h3>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-sm px-3 py-1">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>
      </div>
    </div>
  );
};

// Admin Settings Component
const AdminSettings = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newApiKey, setNewApiKey] = useState({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    api_key: '',
    priority: 1,
    max_requests_per_day: 1000
  });

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/api-keys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApiKeys(response.data);
    } catch (error) {
      toast.error('Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const addApiKey = async () => {
    if (!newApiKey.api_key.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/admin/api-keys`, newApiKey, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('API key added successfully!');
      setNewApiKey({
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        api_key: '',
        priority: 1,
        max_requests_per_day: 1000
      });
      fetchApiKeys();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add API key');
    }
  };

  const testApiKey = async (keyId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/admin/api-keys/${keyId}/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.status === 'success') {
        toast.success('API key is working correctly!');
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('API key test failed');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Manage your AI API keys with automatic failover
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add New API Key */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="font-semibold mb-4">Add New API Key</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Provider</label>
                <Select value={newApiKey.provider} onValueChange={(value) => setNewApiKey({...newApiKey, provider: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini</SelectItem>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Model</label>
                <Input
                  value={newApiKey.model}
                  onChange={(e) => setNewApiKey({...newApiKey, model: e.target.value})}
                  placeholder="e.g., gemini-2.0-flash"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">API Key</label>
                <Input
                  type="password"
                  value={newApiKey.api_key}
                  onChange={(e) => setNewApiKey({...newApiKey, api_key: e.target.value})}
                  placeholder="Enter your API key..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Priority</label>
                <Input
                  type="number"
                  value={newApiKey.priority}
                  onChange={(e) => setNewApiKey({...newApiKey, priority: parseInt(e.target.value)})}
                  min="1"
                  max="10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Daily Limit</label>
                <Input
                  type="number"
                  value={newApiKey.max_requests_per_day}
                  onChange={(e) => setNewApiKey({...newApiKey, max_requests_per_day: parseInt(e.target.value)})}
                  min="1"
                />
              </div>
            </div>
            <Button onClick={addApiKey} className="mt-4 bg-emerald-500 hover:bg-emerald-600">
              <Plus className="w-4 h-4 mr-2" />
              Add API Key
            </Button>
          </div>

          {/* Existing API Keys */}
          <div>
            <h3 className="font-semibold mb-4">Existing API Keys</h3>
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <Card key={key.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant="outline" className="capitalize">
                              {key.provider}
                            </Badge>
                            <Badge variant="secondary">
                              Priority: {key.priority}
                            </Badge>
                            <Badge variant={key.is_active ? "default" : "secondary"}>
                              {key.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>Model:</strong> {key.model}
                          </p>
                          <p className="text-sm text-gray-600 mb-1">
                            <strong>API Key:</strong> {key.api_key}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Usage:</strong> {key.current_usage} / {key.max_requests_per_day} requests today
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testApiKey(key.id)}
                          >
                            <Zap className="w-3 h-3 mr-1" />
                            Test
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            System Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Platform Details</h4>
              <p className="text-sm text-gray-600">Version: v2.0.0</p>
              <p className="text-sm text-gray-600">Backend: FastAPI + MongoDB</p>
              <p className="text-sm text-gray-600">Frontend: React + Tailwind CSS</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">API Endpoints</h4>
              <p className="text-sm text-gray-600">Articles: /api/articles</p>
              <p className="text-sm text-gray-600">Generate: /api/generate</p>
              <p className="text-sm text-gray-600">Admin: /api/admin/*</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const AdminLayout = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('Logged out successfully');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg min-h-screen">
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">TechPulse AI</h1>
                <p className="text-xs text-gray-500">Admin Panel</p>
              </div>
            </div>
          </div>

          <nav className="p-4">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-emerald-100 text-emerald-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                Dashboard
              </button>

              <button
                onClick={() => setActiveTab('generator')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'generator' 
                    ? 'bg-emerald-100 text-emerald-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Bot className="w-5 h-5" />
                AI Generator
              </button>

              <button
                onClick={() => setActiveTab('rss')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === 'rss' 
                    ? 'bg-emerald-100 text-emerald-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Rss className="w-5 h-5" />
                RSS Feeds
              </button>

              {user?.is_admin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === 'admin' 
                      ? 'bg-emerald-100 text-emerald-700 font-medium' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Settings className="w-5 h-5" />
                  Admin Settings
                </button>
              )}
            </div>
            
            <div className="border-t pt-4 mt-4">
              <Button
                onClick={() => navigate('/')}
                variant="ghost"
                className="w-full justify-start"
              >
                <Home className="w-5 h-5 mr-3" />
                Back to Homepage
              </Button>
              
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'generator' && <AIGenerator />}
            {activeTab === 'rss' && <RSSManagement />}
            {activeTab === 'admin' && <AdminSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};

// Header Component for Homepage
const Header = () => {
  const [loginOpen, setLoginOpen] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">TechPulse</h1>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-gray-600 hover:text-emerald-600 transition-colors">
              Home
            </Link>
            <a href="#trending" className="text-gray-600 hover:text-emerald-600 transition-colors">
              Trending
            </a>
            <a href="#categories" className="text-gray-600 hover:text-emerald-600 transition-colors">
              Categories
            </a>
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  Welcome, {user?.username}
                </span>
                <Button
                  onClick={() => navigate('/admin')}
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </div>
            ) : (
              <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600">
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Login to TechPulse AI</DialogTitle>
                    <DialogDescription>
                      Access your admin dashboard and manage content
                    </DialogDescription>
                  </DialogHeader>
                  <LoginForm onClose={() => setLoginOpen(false)} />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={
              <>
                <Header />
                <NewsHomepage />
              </>
            } />
            <Route path="/article/:articleId" element={
              <>
                <Header />
                <ArticleView />
              </>
            } />
            <Route path="/admin" element={<AdminLayout />} />
          </Routes>
          <Toaster position="top-right" />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;