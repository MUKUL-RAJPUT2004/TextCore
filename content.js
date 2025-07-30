function getArticleContent() {
     const article = window.getSelection().toString().trim();
    if(article) {
        return article.innerText;
    }

    const paragraphs = Array.from(document.querySelectorAll("p"));
    return paragraphs.map(p => p.innerText).join("\n");
}

chrome.runtime.onMessage.addListener((req, _sender, sendResponse) =>{
    if(req.type === "GET_ARTICLE_TEXT"){
        const text = getArticleContent();
         if (article) {
      sendResponse({ text: selectedText });
    } else {
      
      sendResponse({ error: "No text selected. Please highlight the text you want to summarize." });
    }
    }
    return true; // Keep the message channel open for async response
});
