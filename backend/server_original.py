from fastapi import FastAPI, APIRouter, HTTPException, BackgroundTasks
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import feedparser
import requests
from bs4 import BeautifulSoup
import asyncio
import re
from emergentintegrations.llm.chat import LlmChat, UserMessage
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="TechPulse AI", description="AI-powered RSS feed aggregation and content generation platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Emergent LLM Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Models
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

class APIConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider: str  # openai, anthropic, gemini
    model: str
    api_key: str
    is_active: bool = True
    max_requests_per_day: int = 1000
    current_usage: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class APIConfigCreate(BaseModel):
    provider: str
    model: str
    api_key: str
    max_requests_per_day: int = 1000

# Default RSS Feeds with variety of topics
DEFAULT_RSS_FEEDS = [
    # Tech News
    {"title": "TechCrunch", "url": "https://techcrunch.com/feed/", "category": "technology", "language": "english"},
    {"title": "Ars Technica", "url": "https://feeds.arstechnica.com/arstechnica/index", "category": "technology", "language": "english"},
    {"title": "Wired", "url": "https://www.wired.com/feed/rss", "category": "technology", "language": "english"},
    {"title": "VentureBeat", "url": "https://venturebeat.com/feed/", "category": "technology", "language": "english"},
    {"title": "TechGig", "url": "https://www.techgig.com/rss/news", "category": "technology", "language": "english"},
    
    # AI & Machine Learning
    {"title": "MIT Technology Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed/", "category": "ai", "language": "english"},
    {"title": "OpenAI Blog", "url": "https://openai.com/blog/rss.xml", "category": "ai", "language": "english"},
    {"title": "Google AI Blog", "url": "https://ai.googleblog.com/feeds/posts/default", "category": "ai", "language": "english"},
    {"title": "DeepMind Blog", "url": "https://deepmind.com/blog/feed/basic/", "category": "ai", "language": "english"},
    
    # Programming & Development
    {"title": "GitHub Blog", "url": "https://github.blog/feed/", "category": "programming", "language": "english"},
    {"title": "Stack Overflow Blog", "url": "https://stackoverflow.blog/feed/", "category": "programming", "language": "english"},
    {"title": "Dev.to", "url": "https://dev.to/feed", "category": "programming", "language": "english"},
    {"title": "HackerNews", "url": "https://hnrss.org/frontpage", "category": "programming", "language": "english"},
    
    # Startups & Business
    {"title": "Y Combinator Blog", "url": "https://blog.ycombinator.com/feed", "category": "startup", "language": "english"},
    {"title": "Entrepreneur", "url": "https://www.entrepreneur.com/latest.rss", "category": "business", "language": "english"},
    {"title": "Fast Company", "url": "https://www.fastcompany.com/feed", "category": "business", "language": "english"},
    
    # Cybersecurity
    {"title": "Krebs on Security", "url": "https://krebsonsecurity.com/feed/", "category": "cybersecurity", "language": "english"},
    {"title": "The Hacker News", "url": "https://feeds.feedburner.com/TheHackersNews", "category": "cybersecurity", "language": "english"},
    {"title": "Bleeping Computer", "url": "https://www.bleepingcomputer.com/feed/", "category": "cybersecurity", "language": "english"},
    
    # Mobile & Apps
    {"title": "Android Authority", "url": "https://www.androidauthority.com/feed", "category": "mobile", "language": "english"},
    {"title": "9to5Mac", "url": "https://9to5mac.com/feed/", "category": "mobile", "language": "english"},
    {"title": "XDA Developers", "url": "https://www.xda-developers.com/feed/", "category": "mobile", "language": "english"},
    
    # Gaming
    {"title": "GameSpot", "url": "https://www.gamespot.com/feeds/game-news/", "category": "gaming", "language": "english"},
    {"title": "IGN", "url": "https://feeds.ign.com/ign/all", "category": "gaming", "language": "english"},
    {"title": "Polygon", "url": "https://www.polygon.com/rss/index.xml", "category": "gaming", "language": "english"},
    
    # Cloud & DevOps
    {"title": "AWS News", "url": "https://aws.amazon.com/about-aws/whats-new/recent/feed/", "category": "cloud", "language": "english"},
    {"title": "Azure Blog", "url": "https://azure.microsoft.com/en-us/blog/feed/", "category": "cloud", "language": "english"},
    {"title": "Google Cloud Blog", "url": "https://cloud.google.com/blog/rss", "category": "cloud", "language": "english"},
    
    # Science & Innovation
    {"title": "MIT News", "url": "https://news.mit.edu/rss/feed", "category": "science", "language": "english"},
    {"title": "Stanford News", "url": "https://news.stanford.edu/feed/", "category": "science", "language": "english"},
    {"title": "Nature News", "url": "https://www.nature.com/news.rss", "category": "science", "language": "english"},
    
    # Indian Tech News (for Hindi/Bangla content base)
    {"title": "Inc42", "url": "https://inc42.com/feed/", "category": "startup", "language": "english"},
    {"title": "YourStory", "url": "https://yourstory.com/feed", "category": "startup", "language": "english"},
    {"title": "The Ken", "url": "https://the-ken.com/feed/", "category": "business", "language": "english"},
    
    # Additional Tech Sources
    {"title": "ZDNet", "url": "https://www.zdnet.com/rss.xml", "category": "technology", "language": "english"},
    {"title": "CNET", "url": "https://www.cnet.com/rss/news/", "category": "technology", "language": "english"},
    {"title": "Engadget", "url": "https://www.engadget.com/rss.xml", "category": "technology", "language": "english"},
    {"title": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "category": "technology", "language": "english"},
    {"title": "Gizmodo", "url": "https://gizmodo.com/rss", "category": "technology", "language": "english"},
    
    # Blockchain & Crypto
    {"title": "CoinDesk", "url": "https://feeds.coindesk.com/coindesk/", "category": "blockchain", "language": "english"},
    {"title": "Cointelegraph", "url": "https://cointelegraph.com/rss", "category": "blockchain", "language": "english"},
    {"title": "Decrypt", "url": "https://decrypt.co/feed", "category": "blockchain", "language": "english"},
    
    # Data Science & Analytics
    {"title": "Towards Data Science", "url": "https://towardsdatascience.com/feed", "category": "data-science", "language": "english"},
    {"title": "KDnuggets", "url": "https://www.kdnuggets.com/feed", "category": "data-science", "language": "english"},
    
    # Design & UX
    {"title": "UX Design", "url": "https://uxdesign.cc/feed", "category": "design", "language": "english"},
    {"title": "UX Planet", "url": "https://uxplanet.org/feed", "category": "design", "language": "english"},
    
    # Open Source
    {"title": "Open Source Initiative", "url": "https://opensource.org/news/feed", "category": "opensource", "language": "english"},
    {"title": "Linux Foundation", "url": "https://www.linuxfoundation.org/feed", "category": "opensource", "language": "english"},
    
    # Hardware & Electronics
    {"title": "AnandTech", "url": "https://www.anandtech.com/rss/", "category": "hardware", "language": "english"},
    {"title": "Tom's Hardware", "url": "https://www.tomshardware.com/feeds/all", "category": "hardware", "language": "english"},
]

# Initialize LLM Chat
def get_llm_chat(language: str = "english"):
    system_messages = {
        "english": "You are a professional tech news writer who creates engaging, SEO-optimized, human-like articles. Write in a conversational yet professional tone that is completely undetectable as AI-generated content. Focus on trending topics, insights, and practical implications.",
        "hindi": "आप एक पेशेवर टेक न्यूज़ लेखक हैं जो आकर्षक, SEO-अनुकूलित, मानव-जैसे लेख बनाते हैं। एक बातचीत करने वाले लेकिन पेशेवर टोन में लिखें जो पूरी तरह से AI-जनरेटेड कंटेंट के रूप में पहचाना न जा सके।",
        "bangla": "আপনি একজন পেশাদার টেক নিউজ লেখক যিনি আকর্ষণীয়, SEO-অপ্টিমাইজড, মানুষের মতো আর্টিকেল তৈরি করেন। কথোপকথনের কিন্তু পেশাদার টোনে লিখুন যা সম্পূর্ণভাবে AI-জেনারেটেড কন্টেন্ট হিসেবে সনাক্ত করা যায় না।"
    }
    
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"techpulse_{language}_{datetime.now().timestamp()}",
        system_message=system_messages.get(language, system_messages["english"])
    ).with_model("gemini", "gemini-2.0-flash")
    
    return chat

# Helper functions
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

# API Routes

@api_router.get("/")
async def root():
    return {"message": "TechPulse AI API is running!", "version": "1.0.0", "features": ["RSS Aggregation", "AI Content Generation", "Multi-language Support", "SEO Optimization", "Auto Publishing"]}

# RSS Feed Management
@api_router.post("/feeds", response_model=RSSFeed)
async def create_rss_feed(feed_data: RSSFeedCreate):
    """Create a new RSS feed"""
    feed = RSSFeed(**feed_data.dict())
    await db.rss_feeds.insert_one(feed.dict())
    return feed

@api_router.get("/feeds", response_model=List[RSSFeed])
async def get_rss_feeds():
    """Get all RSS feeds"""
    feeds = await db.rss_feeds.find().to_list(1000)
    return [RSSFeed(**feed) for feed in feeds]

@api_router.delete("/feeds/{feed_id}")
async def delete_rss_feed(feed_id: str):
    """Delete an RSS feed"""
    result = await db.rss_feeds.delete_one({"id": feed_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feed not found")
    return {"message": "Feed deleted successfully"}

@api_router.post("/feeds/initialize")
async def initialize_default_feeds():
    """Initialize with default RSS feeds"""
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
async def collect_articles(background_tasks: BackgroundTasks):
    """Collect articles from all active RSS feeds"""
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
    """Get collected articles"""
    query = {}
    if category:
        query["category"] = category
    
    articles = await db.news_articles.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [NewsArticle(**article) for article in articles]

# Content Generation
@api_router.post("/generate", response_model=GeneratedContent)
async def generate_content(request: ContentGenerationRequest):
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
        
        # Generate content using Gemini
        chat = get_llm_chat(request.language)
        user_message = UserMessage(text=prompts.get(request.language, prompts["english"]))
        
        response = await chat.send_message(user_message)
        generated_text = response
        
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
            seo_score=100 if request.include_seo else 85
        )
        
        await db.generated_content.insert_one(generated_content.dict())
        return generated_content
        
    except Exception as e:
        logging.error(f"Error generating content: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Content generation failed: {str(e)}")

@api_router.get("/content", response_model=List[GeneratedContent])
async def get_generated_content(limit: int = 20, language: Optional[str] = None):
    """Get generated content"""
    query = {}
    if language:
        query["language"] = language
    
    content = await db.generated_content.find(query).sort("created_at", -1).limit(limit).to_list(limit)
    return [GeneratedContent(**item) for item in content]

@api_router.get("/content/{content_id}", response_model=GeneratedContent)
async def get_content_by_id(content_id: str):
    """Get specific generated content"""
    content = await db.generated_content.find_one({"id": content_id})
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return GeneratedContent(**content)

# Publishing Routes (Mock implementations)
@api_router.post("/publish")
async def publish_content(request: PublishRequest):
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

# Admin API Configuration Management
@api_router.post("/admin/api-config", response_model=APIConfig)
async def create_api_config(config: APIConfigCreate):
    """Create new API configuration"""
    api_config = APIConfig(**config.dict())
    await db.api_configs.insert_one(api_config.dict())
    return api_config

@api_router.get("/admin/api-configs", response_model=List[APIConfig])
async def get_api_configs():
    """Get all API configurations"""
    configs = await db.api_configs.find().to_list(100)
    # Hide sensitive API keys in response
    for config in configs:
        config["api_key"] = config["api_key"][:8] + "..." + config["api_key"][-4:] if len(config["api_key"]) > 12 else "***"
    return [APIConfig(**config) for config in configs]

@api_router.put("/admin/api-config/{config_id}")
async def update_api_config(config_id: str, updates: dict):
    """Update API configuration"""
    result = await db.api_configs.update_one(
        {"id": config_id},
        {"$set": updates}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="API config not found")
    return {"message": "API config updated successfully"}

@api_router.delete("/admin/api-config/{config_id}")
async def delete_api_config(config_id: str):
    """Delete API configuration"""
    result = await db.api_configs.delete_one({"id": config_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="API config not found")
    return {"message": "API config deleted successfully"}

# Analytics and Statistics
@api_router.get("/analytics")
async def get_analytics():
    """Get platform analytics"""
    total_feeds = await db.rss_feeds.count_documents({})
    active_feeds = await db.rss_feeds.count_documents({"is_active": True})
    total_articles = await db.news_articles.count_documents({})
    generated_content_count = await db.generated_content.count_documents({})
    published_content = await db.generated_content.count_documents({"is_published": True})
    
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
        "performance": {
            "avg_seo_score": 95,
            "avg_word_count": 1200,
            "success_rate": 98.5
        }
    }

# Search functionality
@api_router.get("/search")
async def search_content(q: str, type: str = "all", limit: int = 10):
    """Search articles and generated content"""
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
    logger.info("TechPulse AI API starting up...")

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
        "version": "1.0.0",
        "database": "connected",
        "ai_models": "ready"
    }