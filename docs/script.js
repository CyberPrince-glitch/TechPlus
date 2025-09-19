// Navigation functionality
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update URL hash
    window.location.hash = sectionId;
    
    // Scroll to top of content
    document.querySelector('.container').scrollTop = 0;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Check for hash in URL
    const hash = window.location.hash.substring(1);
    if (hash && document.getElementById(hash)) {
        showSection(hash);
    } else {
        showSection('overview'); // Default section
    }
    
    // Add click handlers for navigation links
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('href').substring(1);
            showSection(sectionId);
        });
    });
    
    // Add smooth scrolling for anchor links within sections
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
            const targetId = e.target.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                e.preventDefault();
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });
    
    // Copy code blocks to clipboard
    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach(block => {
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copy';
        copyButton.className = 'copy-button';
        copyButton.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            background: #667eea;
            color: white;
            border: none;
            padding: 0.3rem 0.8rem;
            border-radius: 4px;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s ease;
        `;
        
        block.style.position = 'relative';
        block.appendChild(copyButton);
        
        copyButton.addEventListener('click', function() {
            const code = block.querySelector('code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                copyButton.textContent = 'Copied!';
                copyButton.style.background = '#48bb78';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                    copyButton.style.background = '#667eea';
                }, 2000);
            }).catch(() => {
                copyButton.textContent = 'Failed';
                copyButton.style.background = '#e53e3e';
                setTimeout(() => {
                    copyButton.textContent = 'Copy';
                    copyButton.style.background = '#667eea';
                }, 2000);
            });
        });
        
        copyButton.addEventListener('mouseenter', function() {
            this.style.background = '#553c9a';
        });
        
        copyButton.addEventListener('mouseleave', function() {
            if (this.textContent === 'Copy') {
                this.style.background = '#667eea';
            }
        });
    });
    
    // Add search functionality
    const searchContainer = document.createElement('div');
    searchContainer.innerHTML = `
        <div style="
            position: fixed;
            top: 80px;
            right: 20px;
            background: white;
            padding: 1rem;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            z-index: 999;
        ">
            <input type="text" id="searchInput" placeholder="Search documentation..." style="
                width: 200px;
                padding: 0.5rem;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 0.9rem;
            ">
        </div>
    `;
    document.body.appendChild(searchContainer);
    
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        const sections = document.querySelectorAll('.section');
        
        if (query.length < 2) {
            sections.forEach(section => {
                const elements = section.querySelectorAll('h1, h2, h3, p, li');
                elements.forEach(el => {
                    el.style.background = '';
                });
            });
            return;
        }
        
        sections.forEach(section => {
            const elements = section.querySelectorAll('h1, h2, h3, p, li');
            elements.forEach(el => {
                if (el.textContent.toLowerCase().includes(query)) {
                    el.style.background = 'rgba(102, 126, 234, 0.1)';
                } else {
                    el.style.background = '';
                }
            });
        });
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl/Cmd + K to focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            searchInput.focus();
        }
        
        // Escape to clear search
        if (e.key === 'Escape') {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.blur();
        }
    });
    
    // Add progress indicator
    const progressContainer = document.createElement('div');
    progressContainer.innerHTML = `
        <div style="
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #667eea;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            z-index: 999;
        " id="progressIndicator">
            Reading Progress: 0%
        </div>
    `;
    document.body.appendChild(progressContainer);
    
    const progressIndicator = document.getElementById('progressIndicator');
    
    window.addEventListener('scroll', function() {
        const activeSection = document.querySelector('.section.active');
        if (activeSection) {
            const rect = activeSection.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const sectionHeight = activeSection.offsetHeight;
            const scrolled = Math.max(0, -rect.top);
            const progress = Math.min(100, (scrolled / (sectionHeight - windowHeight)) * 100);
            
            progressIndicator.textContent = `Reading Progress: ${Math.round(progress)}%`;
        }
    });
    
    // Add table of contents for long sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        const headings = section.querySelectorAll('h2, h3');
        if (headings.length > 3) {
            const toc = document.createElement('div');
            toc.style.cssText = `
                background: #f7fafc;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                padding: 1.5rem;
                margin-bottom: 2rem;
            `;
            
            let tocHTML = '<h3 style="margin-bottom: 1rem; color: #2d3748;">Table of Contents</h3><ul style="list-style: none; padding: 0;">';
            headings.forEach((heading, index) => {
                const id = `toc-${section.id}-${index}`;
                heading.id = id;
                const level = heading.tagName === 'H2' ? '1rem' : '2rem';
                tocHTML += `
                    <li style="margin-bottom: 0.5rem; padding-left: ${level};">
                        <a href="#${id}" style="text-decoration: none; color: #667eea; font-size: 0.9rem;">
                            ${heading.textContent}
                        </a>
                    </li>
                `;
            });
            tocHTML += '</ul>';
            toc.innerHTML = tocHTML;
            
            const firstElement = section.querySelector('h1').nextElementSibling;
            section.insertBefore(toc, firstElement);
        }
    });
    
    // Add mobile menu toggle
    const navContainer = document.querySelector('.nav-container');
    const mobileMenuButton = document.createElement('button');
    mobileMenuButton.innerHTML = '☰';
    mobileMenuButton.style.cssText = `
        display: none;
        background: none;
        border: none;
        color: white;
        font-size: 1.5rem;
        cursor: pointer;
    `;
    
    navContainer.appendChild(mobileMenuButton);
    
    // Mobile responsive behavior
    function checkMobile() {
        if (window.innerWidth <= 768) {
            mobileMenuButton.style.display = 'block';
            document.querySelector('.nav-links').style.display = 'none';
        } else {
            mobileMenuButton.style.display = 'none';
            document.querySelector('.nav-links').style.display = 'flex';
        }
    }
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    mobileMenuButton.addEventListener('click', function() {
        const navLinks = document.querySelector('.nav-links');
        if (navLinks.style.display === 'none') {
            navLinks.style.display = 'flex';
            navLinks.style.flexDirection = 'column';
            navLinks.style.position = 'absolute';
            navLinks.style.top = '100%';
            navLinks.style.left = '0';
            navLinks.style.right = '0';
            navLinks.style.background = '#667eea';
            navLinks.style.padding = '1rem';
            navLinks.style.borderRadius = '0 0 10px 10px';
        } else {
            navLinks.style.display = 'none';
        }
    });
    
    // Initialize animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all cards and blocks
    const animatedElements = document.querySelectorAll('.overview-card, .install-card, .feature-category, .guide-card, .api-endpoint');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'all 0.6s ease';
        observer.observe(el);
    });
});

// Utility functions
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Copied to clipboard');
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#e53e3e' : '#667eea'};
        color: white;
        padding: 1rem;
        border-radius: 8px;
        z-index: 1001;
        max-width: 300px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Export functions for external use
window.TechPulseDocs = {
    showSection,
    copyToClipboard,
    showNotification
};