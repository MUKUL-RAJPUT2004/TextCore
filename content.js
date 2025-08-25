function getArticleContent() {
    // First, check if user has selected text
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 50) {
        return selectedText;
    }

    // Try common article selectors first
    const articleSelectors = [
        'article',
        '[role="main"]',
        '.post-content',
        '.entry-content',
        '.article-content',
        '.content',
        '#content',
        '.post-body',
        '.article-body',
        'main',
        '.story-body'
    ];

    for (const selector of articleSelectors) {
        const element = document.querySelector(selector);
        if (element) {
            const text = extractTextFromElement(element);
            if (text && text.length > 100) {
                return text;
            }
        }
    }

    // Fallback: extract from all paragraphs
    const paragraphs = Array.from(document.querySelectorAll('p'));
    const text = paragraphs
        .map(p => p.innerText?.trim())
        .filter(text => text && text.length > 10)
        .join('\n\n');

    return text || "No readable content found on this page.";
}

function extractTextFromElement(element) {
    // Remove unwanted elements
    const unwantedSelectors = [
        'script', 'style', 'nav', 'header', 'footer', 
        '.advertisement', '.ads', '.social-share',
        '.comments', '.sidebar', '.related-posts'
    ];
    
    const clone = element.cloneNode(true);
    unwantedSelectors.forEach(selector => {
        clone.querySelectorAll(selector).forEach(el => el.remove());
    });
    
    return clone.innerText?.trim() || '';
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) => {
    if (req.type === "GET_ARTICLE_TEXT") {
        try {
            const text = getArticleContent();
            if (text && text.length > 50) {
                sendResponse({ text: text });
            } else {
                sendResponse({ 
                    error: "No substantial content found. Try selecting text manually or visit an article page." 
                });
            }
        } catch (error) {
            sendResponse({ error: "Error extracting content: " + error.message });
        }
    }
    return true; // Keep the message channel open for async response
});
