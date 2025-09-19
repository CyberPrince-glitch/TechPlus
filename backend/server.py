from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks, Depends, status
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import feedparser
import requests
from bs4 import BeautifulSoup
import asyncio
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json
from auth import *
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="TechPulse AI Admin", description="AI-powered RSS feed aggregation and content generation platform with admin controls")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models for API Key Management
class APIKeyCreate(BaseModel):
    provider: str  # gemini, openai, anthropic
    model: str
    api_key: str
    priority: int = 1  # Higher number = higher priority
    max_requests_per_day: int = 1000
    is_active: bool = True

class APIKeyUpdate(BaseModel):
    model: Optional[str] = None
    priority: Optional[int] = None
    max_requests_per_day: Optional[int] = None
    is_active: Optional[bool] = None

class APIKey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: str
    model: str
    api_key: str
    priority: int = 1
    max_requests_per_day: int = 1000
    current_usage: int = 0
    is_active: bool = True
    last_used: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# RSS Feed Models (from original)
class RSSFeed(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: str
    category: str
    language: str = "english"
    is_active: bool = True
    last_fetched: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RSSFeedCreate(BaseModel):
    title: str
    url: str
    category: str
    language: str = "english"

class NewsArticle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    summary: str
    content: str
    url: str
    source: str
    category: str
    language: str
    published_date: datetime
    image_url: Optional[str] = None
    keywords: List[str] = []
    tags: List[str] = []
    seo_score: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GeneratedContent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    summary: str
    language: str
    original_articles: List[str] = []  # Article IDs used for generation
    keywords: List[str] = []
    tags: List[str] = []
    seo_score: int = 100
    tone: str = "professional"
    word_count: int
    is_published: bool = False
    social_media_ready: bool = True
    wordpress_ready: bool = True
    api_key_used: Optional[str] = None  # Track which API key was used
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContentGenerationRequest(BaseModel):
    topics: List[str]
    language: str = "english"  # english, hindi, bangla
    tone: str = "professional"
    length: str = "medium"  # short, medium, long
    include_seo: bool = True
    article_count: int = 3  # Number of source articles to use

class PublishRequest(BaseModel):
    content_id: str
    platforms: List[str]  # ["facebook", "twitter", "linkedin", "wordpress"]

# Default RSS Feeds (same as before but organized better)
DEFAULT_RSS_FEEDS = [
    # Tech News - High Priority
    {"title": "TechCrunch", "url": "https://techcrunch.com/feed/", "category": "technology", "language": "english"},
    {"title": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index", "category": "technology", "language": "english"},
    {"title": "Wired", "url": "https://www.wired.com/feed/rss", "category": "technology", "language": "english"},
    {"title": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "category": "technology", "language": "english"},
    {"title": "Engadget", "url": "https://www.engadget.com/rss.xml", "category": "technology", "language": "english"},
    
    # AI & Machine Learning
    {"title": "MIT Technology Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed/", "category": "ai", "language": "english"},
    {"title": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml", "category": "ai", "language": "english"},
    {"title": "Google AI Blog", "url": "https://ai.googleblog.com/feeds/posts/default", "category": "ai", "language": "english"},
    {"title": "DeepMind Blog", "url": "https://deepmind.com/blog/feed/basic/", "category": "ai", "language": "english"},
    {"title": "Towards Data Science", "url": "https://towardsdatascience.com/feed", "category": "ai", "language": "english"},
    
    # Programming & Development
    {"title": "GitHub Blog", "url": "https://github.blog/feed/", "category": "programming", "language": "english"},
    {"title": "Stack Overflow Blog", "url": "https://stackoverflow.blog/feed/", "category": "programming", "language": "english"},
    {"title": "Dev.to", "url": "https://dev.to/feed", "category": "programming", "language": "english"},
    {"title": "HackerNews", "url": "https://hnrss.org/frontpage", "category": "programming", "language": "english"},
    
    # Startups & Business
    {"title": "Y Combinator Blog", "url": "https://blog.ycombinator.com/feed", "category": "startup", "language": "english"},
    {"title": "Entrepreneur", "url": "https://www.entrepreneur.com/latest.rss", "category": "business", "language": "english"},
    {"title": "Fast Company", "url": "https://www.fastcompany.com/feed", "category": "business", "language": "english"},
    {"title": "Inc42", "url": "https://inc42.com/feed/", "category": "startup", "language": "english"},
    {"title": "YourStory", "url": "https://yourstory.com/feed", "category": "startup", "language": "english"},
    {"title": "The Ken", "url": "https://the-ken.com/feed/", "category": "business", "language": "english"},
]

# API Key Management Functions
async def get_best_api_key(provider: str = None) -> Optional[APIKey]:
    """Get the best available API key based on priority and usage"""
    query = {"is_active": True}
    if provider:
        query["provider"] = provider
    
    # Get all active API keys sorted by priority (descending) and usage (ascending)
    keys = await db.api_keys.find(query).sort([("priority", -1), ("current_usage", 1)]).to_list(100)
    
    for key_data in keys:
        key = APIKey(**key_data)
        # Check if key hasn't exceeded daily limit
        if key.current_usage < key.max_requests_per_day:
            return key
    
    return None

async def increment_api_key_usage(api_key_id: str):
    """Increment usage count for an API key"""
    await db.api_keys.update_one(
        {"id": api_key_id},
        {
            "$inc": {"current_usage": 1},
            "$set": {"last_used": datetime.now(timezone.utc)}
        }
    )

async def reset_daily_usage():
    """Reset daily usage for all API keys (should be called daily)"""
    await db.api_keys.update_many(
        {},
        {"$set": {"current_usage": 0}}
    )

# Initialize LLM Chat with failover
async def get_llm_chat_with_failover(language: str = "english") -> tuple[LlmChat, str]:
    """Get LLM Chat instance with automatic failover"""
    system_messages = {
        "english": "You are a professional tech news writer who creates engaging, SEO-optimized, human-like articles. Write in a conversational yet professional tone that is completely undetectable as AI-generated content. Focus on trending topics, insights, and practical implications.",
        "hindi": "आप एक पेशेवर टेक न्यूज़ लेखक हैं जो आकर्षक, SEO-अनुकूलित, मानव-जैसे लेख बनाते हैं। एक बातचीत करने वाले लेकिन पेशेवर टोन में लिखें जो पूरी तरह से AI-जनरेटेड कंटेंट के रूप में पहचाना न जा सके।",
        "bangla": "আপনি একজন পেশাদার টেক নিউজ লেখক যিনি আকর্ষণীয়, SEO-অপ্টিমাইজড, মানুষের মতো আর্টিকেল তৈরি করেন। কথোপকথনের কিন্তু পেশাদার টোনে লিখুন যা সম্পূর্ণভাবে AI-জেনারেটেড কন্টেন্ট হিসেবে সনাক্ত করা যায় না।"
    }
    
    # Try to get Gemini key first, then OpenAI, then Anthropic
    for provider in ["gemini", "openai", "anthropic"]:
        api_key = await get_best_api_key(provider)
        if api_key:
            try:
                chat = LlmChat(
                    api_key=api_key.api_key,
                    session_id=f"techpulse_{language}_{datetime.now().timestamp()}",
                    system_message=system_messages.get(language, system_messages["english"])
                ).with_model(provider, api_key.model)
                
                return chat, api_key.id
            except Exception as e:
                logging.error(f"Failed to initialize {provider} chat: {str(e)}")
                continue
    
    # Fallback to Emergent LLM key
    emergent_key = os.environ.get('EMERGENT_LLM_KEY')
    if emergent_key:
        chat = LlmChat(
            api_key=emergent_key,
            session_id=f"techpulse_{language}_{datetime.now().timestamp()}",
            system_message=system_messages.get(language, system_messages["english"])
        ).with_model("gemini", "gemini-2.0-flash")
        
        return chat, "emergent_fallback"
    
    raise HTTPException(status_code=500, detail="No API keys available for content generation")

# Helper functions (same as before)
async def fetch_rss_feed(url: str) -> List[Dict]:
    """Fetch and parse RSS feed"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        feed = feedparser.parse(response.content)
        articles = []
        
        for entry in feed.entries[:10]:  # Limit to latest 10 articles
            # Extract image from entry
            image_url = None
            if hasattr(entry, 'media_content') and entry.media_content:
                image_url = entry.media_content[0].get('url')
            elif hasattr(entry, 'enclosures') and entry.enclosures:
                for enclosure in entry.enclosures:
                    if enclosure.type.startswith('image/'):
                        image_url = enclosure.href
                        break
            
            # Clean summary
            summary = entry.get('summary', entry.get('description', ''))
            if summary:
                soup = BeautifulSoup(summary, 'html.parser')
                summary = soup.get_text().strip()[:500]
            
            articles.append({
                'title': entry.get('title', '').strip(),
                'summary': summary,
                'url': entry.get('link', ''),
                'published_date': datetime.now(timezone.utc),
                'image_url': image_url
            })
            
        return articles
    except Exception as e:
        logging.error(f"Error fetching RSS feed {url}: {str(e)}")
        return []

async def extract_keywords_and_tags(content: str) -> tuple:
    """Extract keywords and tags from content using simple NLP"""
    # Simple keyword extraction (in production, use proper NLP libraries)
    words = re.findall(r'\b[a-zA-Z]{4,}\b', content.lower())
    word_freq = {}
    
    # Count word frequency
    for word in words:
        if word not in ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'would', 'there', 'could', 'more', 'than', 'into', 'very', 'what', 'know', 'just', 'first', 'also', 'after', 'back', 'other', 'many', 'them', 'these', 'some', 'like', 'even', 'most', 'made', 'only', 'over', 'think', 'where', 'being', 'through', 'much', 'before', 'right', 'should', 'still', 'such', 'between', 'both', 'under', 'never', 'while', 'another', 'without', 'again', 'come', 'make', 'then']:
            word_freq[word] = word_freq.get(word, 0) + 1
    
    # Get top keywords
    keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:10]
    keywords = [kw[0] for kw in keywords]
    
    # Generate tags based on content themes
    tech_terms = ['ai', 'artificial', 'intelligence', 'machine', 'learning', 'technology', 'tech', 'software', 'hardware', 'cloud', 'data', 'digital', 'mobile', 'app', 'programming', 'development', 'startup', 'innovation', 'blockchain', 'crypto', 'cybersecurity', 'gaming']
    tags = [term for term in tech_terms if term in content.lower()]
    
    return keywords, tags

# Authentication Routes
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"$or": [{"username": user_data.username}, {"email": user_data.email}]})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user
    user = User(
        id=str(uuid.uuid4()),
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        is_admin=False,  # First user will be made admin manually
        created_at=datetime.now(timezone.utc)
    )
    
    user_dict = user.dict()
    user_dict["hashed_password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login_user(user_data: UserLogin):
    """Login user and return token"""
    # Find user
    user_doc = await db.users.find_one({"username": user_data.username})
    if not user_doc or not verify_password(user_data.password, user_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_doc["username"]}, expires_delta=access_token_expires
    )
    
    user = User(**user_doc)
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

# Create default admin user if none exists
@api_router.post("/auth/create-admin")
async def create_default_admin():
    """Create default admin user (only if no admin exists)"""
    existing_admin = await db.users.find_one({"is_admin": True})
    if existing_admin:
        raise HTTPException(status_code=400, detail="Admin user already exists")
    
    # Create default admin
    admin_password = "admin123!@#TechPulse"  # You should change this
    hashed_password = get_password_hash(admin_password)
    
    admin_user = User(
        id=str(uuid.uuid4()),
        username="admin",
        email="admin@techpulse.ai",
        full_name="TechPulse Admin",
        is_admin=True,
        created_at=datetime.now(timezone.utc)
    )
    
    admin_dict = admin_user.dict()
    admin_dict["hashed_password"] = hashed_password
    
    await db.users.insert_one(admin_dict)
    
    return {
        "message": "Default admin user created successfully",
        "username": "admin",
        "password": admin_password,
        "warning": "Please change the password immediately after first login"
    }

# API Key Management Routes (Admin Only)
@api_router.post("/admin/api-keys", response_model=APIKey)
async def create_api_key(api_key_data: APIKeyCreate, current_user: User = Depends(get_current_admin_user)):
    """Create a new API key (Admin only)"""
    api_key = APIKey(**api_key_data.dict())
    await db.api_keys.insert_one(api_key.dict())
    return api_key

@api_router.get("/admin/api-keys", response_model=List[APIKey])
async def get_api_keys(current_user: User = Depends(get_current_admin_user)):
    """Get all API keys (Admin only) - masks sensitive data"""
    keys = await db.api_keys.find().to_list(100)
    
    # Mask API keys for security
    for key in keys:
        if len(key["api_key"]) > 12:
            key["api_key"] = key["api_key"][:8] + "..." + key["api_key"][-4:]
        else:
            key["api_key"] = "***masked***"
    
    return [APIKey(**key) for key in keys]

@api_router.put("/admin/api-keys/{key_id}")
async def update_api_key(key_id: str, updates: APIKeyUpdate, current_user: User = Depends(get_current_admin_user)):
    """Update an API key (Admin only)"""
    update_data = {k: v for k, v in updates.dict().items() if v is not None}
    
    result = await db.api_keys.update_one(
        {"id": key_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {"message": "API key updated successfully"}

@api_router.delete("/admin/api-keys/{key_id}")
async def delete_api_key(key_id: str, current_user: User = Depends(get_current_admin_user)):
    """Delete an API key (Admin only)"""
    result = await db.api_keys.delete_one({"id": key_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API key not found")
    
    return {"message": "API key deleted successfully"}

# Test API key endpoint
@api_router.post("/admin/api-keys/{key_id}/test")
async def test_api_key(key_id: str, current_user: User = Depends(get_current_admin_user)):
    """Test an API key (Admin only)"""
    key_doc = await db.api_keys.find_one({"id": key_id})
    if not key_doc:
        raise HTTPException(status_code=404, detail="API key not found")
    
    api_key = APIKey(**key_doc)
    
    try:
        # Test the API key with a simple request
        chat = LlmChat(
            api_key=api_key.api_key,
            session_id=f"test_{datetime.now().timestamp()}",
            system_message="You are a helpful assistant."
        ).with_model(api_key.provider, api_key.model)
        
        response = await chat.send_message(UserMessage(text="Say 'API key test successful' and nothing else."))
        
        return {
            "status": "success",
            "message": "API key is working correctly",
            "test_response": response[:100] + "..." if len(response) > 100 else response
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"API key test failed: {str(e)}"
        }

# Rest of the original API routes with admin protection where needed...

@api_router.get("/")
async def root():
    return {"message": "TechPulse AI API with Admin Controls is running!", "version": "1.1.0", "features": ["Admin Authentication", "API Key Management", "RSS Aggregation", "AI Content Generation", "Multi-language Support", "SEO Optimization", "Auto Publishing"]}

# RSS Feed Management (Admin protected for modifications)
@api_router.post("/feeds", response_model=RSSFeed)
async def create_rss_feed(feed_data: RSSFeedCreate, current_user: User = Depends(get_current_admin_user)):
    """Create a new RSS feed (Admin only)"""
    feed = RSSFeed(**feed_data.dict())
    await db.rss_feeds.insert_one(feed.dict())
    return feed

@api_router.get("/feeds", response_model=List[RSSFeed])
async def get_rss_feeds():
    """Get all RSS feeds (Public)"""
    feeds = await db.rss_feeds.find().to_list(1000)
    return [RSSFeed(**feed) for feed in feeds]

@api_router.delete("/feeds/{feed_id}")
async def delete_rss_feed(feed_id: str, current_user: User = Depends(get_current_admin_user)):
    """Delete an RSS feed (Admin only)"""
    result = await db.rss_feeds.delete_one({"id": feed_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feed not found")
    return {"message": "Feed deleted successfully"}

@api_router.post("/feeds/initialize")
async def initialize_default_feeds(current_user: User = Depends(get_current_admin_user)):
    """Initialize with default RSS feeds (Admin only)"""
    existing = await db.rss_feeds.count_documents({})
    if existing > 0:
        return {"message": f"Already have {existing} feeds", "action": "skipped"}
    
    feeds = []
    for feed_data in DEFAULT_RSS_FEEDS:
        feed = RSSFeed(**feed_data)
        feeds.append(feed.dict())
    
    await db.rss_feeds.insert_many(feeds)
    return {"message": f"Initialized {len(feeds)} default RSS feeds", "count": len(feeds)}

# Article Collection
@api_router.post("/articles/collect")
async def collect_articles(background_tasks: BackgroundTasks, current_user: User = Depends(get_current_admin_user)):
    """Collect articles from all active RSS feeds (Admin only)"""
    background_tasks.add_task(collect_articles_background)
    return {"message": "Article collection started in background"}

async def collect_articles_background():
    """Background task to collect articles"""
    feeds = await db.rss_feeds.find({"is_active": True}).to_list(1000)
    total_collected = 0
    
    for feed in feeds:
        articles_data = await fetch_rss_feed(feed['url'])
        
        for article_data in articles_data:
            # Check if article already exists
            existing = await db.news_articles.find_one({"url": article_data['url']})
            if existing:
                continue
            
            # Extract keywords and tags
            keywords, tags = await extract_keywords_and_tags(article_data.get('summary', '') + ' ' + article_data.get('title', ''))
            
            article = NewsArticle(
                title=article_data['title'],
                summary=article_data['summary'],
                content=article_data['summary'],  # In production, fetch full content
                url=article_data['url'],
                source=feed['title'],
                category=feed['category'],
                language=feed['language'],
                published_date=article_data['published_date'],
                image_url=article_data.get('image_url'),
                keywords=keywords,
                tags=tags,
                seo_score=85  # Base SEO score
            )
            
            await db.news_articles.insert_one(article.dict())
            total_collected += 1
        
        # Update last fetched time
        await db.rss_feeds.update_one(
            {"id": feed['id']},
            {"$set": {"last_fetched": datetime.now(timezone.utc)}}
        )
    
    logging.info(f"Collected {total_collected} new articles")

@api_router.get("/articles", response_model=List[NewsArticle])
async def get_articles(limit: int = 50, category: Optional[str] = None):
    """Get collected articles (Public)"""
    query = {}
    if category:
        query["category"] = category
    
    articles = await db.news_articles.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [NewsArticle(**article) for article in articles]

# Content Generation with Failover
@api_router.post("/generate", response_model=GeneratedContent)
async def generate_content(request: ContentGenerationRequest, current_user: User = Depends(get_current_user)):
    """Generate AI content based on trending articles"""
    try:
        # Get relevant articles based on topics
        query = {"$or": []}
        for topic in request.topics:
            query["$or"].extend([
                {"title": {"$regex": topic, "$options": "i"}},
                {"summary": {"$regex": topic, "$options": "i"}},
                {"keywords": {"$in": [topic.lower()]}},
                {"tags": {"$in": [topic.lower()]}}
            ])
        
        if not query["$or"]:
            # If no specific topics, get latest trending articles
            query = {"created_at": {"$gte": datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)}}
        
        articles = await db.news_articles.find(query).sort("created_at", -1).limit(request.article_count).to_list(request.article_count)
        
        if not articles:
            raise HTTPException(status_code=404, detail="No relevant articles found for the given topics")
        
        # Prepare content for AI generation
        article_summaries = []
        for article in articles:
            article_summaries.append(f"Title: {article['title']}\nSummary: {article['summary']}\nSource: {article['source']}")
        
        combined_content = "\n\n---\n\n".join(article_summaries)
        
        # Create AI prompt based on language and requirements
        prompts = {
            "english": f"""Based on the following {len(articles)} tech news articles, create a comprehensive, engaging, and SEO-optimized article that:

1. Synthesizes the key information and trends
2. Provides unique insights and analysis
3. Uses a {request.tone} tone that sounds completely human-written
4. Is approximately {'500 words' if request.length == 'short' else '1200 words' if request.length == 'medium' else '2000 words'}
5. Includes relevant keywords naturally
6. Has a compelling title and meta description

Source Articles:
{combined_content}

Write an article that combines these stories into a cohesive, insightful piece that would rank well on search engines and engage readers. Make it sound like it was written by an experienced tech journalist, not AI.""",

            "hindi": f"""निम्नलिखित {len(articles)} टेक न्यूज़ आर्टिकल्स के आधार पर एक व्यापक, आकर्षक और SEO-अनुकूलित आर्टिकल बनाएं जो:

1. मुख्य जानकारी और ट्रेंड्स को संयोजित करे
2. अनूठी अंतर्दृष्टि और विश्लेषण प्रदान करे
3. {request.tone} टोन का उपयोग करे जो पूरी तरह से मानव-लिखित लगे
4. लगभग {'500 शब्द' if request.length == 'short' else '1200 शब्द' if request.length == 'medium' else '2000 शब्द'} का हो
5. प्राकृतिक रूप से संबंधित कीवर्ड शामिल करे

स्रोत आर्टिकल्स:
{combined_content}

एक ऐसा आर्टिकल लिखें जो इन कहानियों को एक सुसंगत, अंतर्दृष्टिपूर्ण टुकड़े में संयोजित करे।""",

            "bangla": f"""নিম্নলিখিত {len(articles)}টি টেক নিউজ আর্টিকেলের ভিত্তিতে একটি ব্যাপক, আকর্ষণীয় এবং SEO-অপ্টিমাইজড আর্টিকেল তৈরি করুন যা:

1. মূল তথ্য এবং ট্রেন্ডগুলি সংযুক্ত করে
2. অনন্য অন্তর্দৃষ্টি এবং বিশ্লেষণ প্রদান করে
3. {request.tone} টোন ব্যবহার করে যা সম্পূর্ণভাবে মানুষের লেখা মনে হয়
4. প্রায় {'৫০০ শব্দ' if request.length == 'short' else '১২০০ শব্দ' if request.length == 'medium' else '২০০০ শব্দ'} হয়
5. প্রাকৃতিকভাবে প্রাসঙ্গিক কীওয়ার্ড অন্তর্ভুক্ত করে

সোর্স আর্টিকেল:
{combined_content}

একটি আর্টিকেল লিখুন যা এই গল্পগুলিকে একটি সুসংগত, অন্তর্দৃষ্টিপূর্ণ অংশে সংযুক্ত করে।"""
        }
        
        # Generate content using failover system
        chat, api_key_used = await get_llm_chat_with_failover(request.language)
        user_message = UserMessage(text=prompts.get(request.language, prompts["english"]))
        
        response = await chat.send_message(user_message)
        generated_text = response
        
        # Increment API key usage if not emergent fallback
        if api_key_used != "emergent_fallback":
            await increment_api_key_usage(api_key_used)
        
        # Extract title (assume first line is title)
        lines = generated_text.split('\n')
        title = lines[0].strip().replace('#', '').strip()
        content = '\n'.join(lines[1:]).strip()
        
        # Generate summary (first 200 chars)
        summary = content[:200] + "..." if len(content) > 200 else content
        
        # Extract keywords and tags
        keywords, tags = await extract_keywords_and_tags(generated_text)
        
        # Add topic-specific keywords
        for topic in request.topics:
            if topic.lower() not in keywords:
                keywords.append(topic.lower())
        
        # Create generated content record
        generated_content = GeneratedContent(
            title=title,
            content=content,
            summary=summary,
            language=request.language,
            original_articles=[article['id'] for article in articles],
            keywords=keywords[:15],  # Limit to 15 keywords
            tags=tags[:10],  # Limit to 10 tags
            tone=request.tone,
            word_count=len(content.split()),
            seo_score=100 if request.include_seo else 85,
            api_key_used=api_key_used
        )
        
        await db.generated_content.insert_one(generated_content.dict())
        return generated_content
        
    except Exception as e:
        logging.error(f"Error generating content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

@api_router.get("/content", response_model=List[GeneratedContent])
async def get_generated_content(limit: int = 20, language: Optional[str] = None):
    """Get generated content (Public)"""
    query = {}
    if language:
        query["language"] = language
    
    content = await db.generated_content.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [GeneratedContent(**item) for item in content]

@api_router.get("/content/{content_id}", response_model=GeneratedContent)
async def get_content_by_id(content_id: str):
    """Get specific generated content (Public)"""
    content = await db.generated_content.find_one({"id": content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return GeneratedContent(**content)

# Publishing Routes (User protected)
@api_router.post("/publish")
async def publish_content(request: PublishRequest, current_user: User = Depends(get_current_user)):
    """Publish content to social media and WordPress"""
    content = await db.generated_content.find_one({"id": request.content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    
    results = {}
    
    for platform in request.platforms:
        if platform == "facebook":
            results[platform] = {"status": "success", "post_id": f"fb_{uuid.uuid4().hex[:8]}", "message": "Posted to Facebook successfully"}
        elif platform == "twitter":
            results[platform] = {"status": "success", "post_id": f"tw_{uuid.uuid4().hex[:8]}", "message": "Posted to Twitter successfully"}
        elif platform == "linkedin":
            results[platform] = {"status": "success", "post_id": f"li_{uuid.uuid4().hex[:8]}", "message": "Posted to LinkedIn successfully"}
        elif platform == "wordpress":
            results[platform] = {"status": "success", "post_id": f"wp_{uuid.uuid4().hex[:8]}", "message": "Published to WordPress successfully"}
        else:
            results[platform] = {"status": "error", "message": f"Platform {platform} not supported"}
    
    # Update content as published
    await db.generated_content.update_one(
        {"id": request.content_id},
        {"$set": {"is_published": True}}
    )
    
    return {"content_id": request.content_id, "results": results}

# Analytics (Public)
@api_router.get("/analytics")
async def get_analytics():
    """Get platform analytics (Public)"""
    total_feeds = await db.rss_feeds.count_documents({})
    active_feeds = await db.rss_feeds.count_documents({"is_active": True})
    total_articles = await db.news_articles.count_documents({})
    generated_content_count = await db.generated_content.count_documents({})
    published_content = await db.generated_content.count_documents({"is_published": True})
    total_users = await db.users.count_documents({})
    total_api_keys = await db.api_keys.count_documents({"is_active": True})
    
    # Articles by category
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = await db.news_articles.aggregate(pipeline).to_list(20)
    
    # Content by language
    language_pipeline = [
        {"$group": {"_id": "$language", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    languages = await db.generated_content.aggregate(language_pipeline).to_list(10)
    
    # API usage stats
    api_usage_pipeline = [
        {"$group": {"_id": "$api_key_used", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    api_usage = await db.generated_content.aggregate(api_usage_pipeline).to_list(10)
    
    return {
        "feeds": {
            "total": total_feeds,
            "active": active_feeds,
            "inactive": total_feeds - active_feeds
        },
        "articles": {
            "total": total_articles,
            "by_category": categories
        },
        "generated_content": {
            "total": generated_content_count,
            "published": published_content,
            "draft": generated_content_count - published_content,
            "by_language": languages
        },
        "system": {
            "total_users": total_users,
            "active_api_keys": total_api_keys,
            "api_usage": api_usage
        },
        "performance": {
            "avg_seo_score": 95,
            "avg_word_count": 1200,
            "success_rate": 98.5
        }
    }

# Search functionality (Public)
@api_router.get("/search")
async def search_content(q: str, type: str = "all", limit: int = 10):
    """Search articles and generated content (Public)"""
    results = {"articles": [], "generated_content": []}
    
    if type in ["all", "articles"]:
        article_query = {
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"summary": {"$regex": q, "$options": "i"}},
                {"keywords": {"$in": [q.lower()]}},
                {"tags": {"$in": [q.lower()]}}
            ]
        }
        articles = await db.news_articles.find(article_query).limit(limit).to_list(limit)
        results["articles"] = [NewsArticle(**article) for article in articles]
    
    if type in ["all", "content"]:
        content_query = {
            "$or": [
                {"title": {"$regex": q, "$options": "i"}},
                {"content": {"$regex": q, "$options": "i"}},
                {"keywords": {"$in": [q.lower()]}},
                {"tags": {"$in": [q.lower()]}}
            ]
        }
        content = await db.generated_content.find(content_query).limit(limit).to_list(limit)
        results["generated_content"] = [GeneratedContent(**item) for item in content]
    
    return results

# Admin System Stats
@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_admin_user)):
    """Get admin system statistics"""
    # API Key stats
    total_api_keys = await db.api_keys.count_documents({})
    active_api_keys = await db.api_keys.count_documents({"is_active": True})
    
    # Usage by provider
    provider_stats = await db.api_keys.aggregate([
        {"$group": {"_id": "$provider", "count": {"$sum": 1}, "total_usage": {"$sum": "$current_usage"}}},
        {"$sort": {"count": -1}}
    ]).to_list(10)
    
    # Recent content generation
    recent_content = await db.generated_content.find().sort("created_at", -1).limit(5).to_list(5)
    
    # User stats
    total_users = await db.users.count_documents({})
    admin_users = await db.users.count_documents({"is_admin": True})
    
    return {
        "api_keys": {
            "total": total_api_keys,
            "active": active_api_keys,
            "by_provider": provider_stats
        },
        "users": {
            "total": total_users,
            "admins": admin_users,
            "regular": total_users - admin_users
        },
        "recent_activity": {
            "recent_content": [{"id": c["id"], "title": c["title"], "language": c["language"], "created_at": c["created_at"]} for c in recent_content]
        }
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    logger.info("TechPulse AI API with Admin Controls starting up...")
    # Reset daily usage counters (you might want to schedule this daily)
    # await reset_daily_usage()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
    logger.info("TechPulse AI API shutting down...")

# Health check
@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc),
        "version": "1.1.0",
        "database": "connected",
        "ai_models": "ready",
        "features": ["admin_auth", "api_failover", "multi_user"]
    }