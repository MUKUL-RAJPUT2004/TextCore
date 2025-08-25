document.getElementById("summarize").addEventListener("click", async () => {
    const resultDiv = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;
    resultDiv.innerHTML = '<div class="loader"></div>';

    // 1. Get the user's API key
    chrome.storage.sync.get(["geminiApiKey"], async (result) => {
        if (!result.geminiApiKey) {
            resultDiv.textContent = "Please set your Gemini API key in the options.";
            return;
        }

        // 2. Ask content.js for the page text
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                resultDiv.textContent = "Error: No active tab found.";
                return;
            }

            chrome.tabs.sendMessage(
                tab.id,
                { type: "GET_ARTICLE_TEXT" },
                async (response) => {
                    if (chrome.runtime.lastError) {
                        resultDiv.textContent = "Error: Content script not loaded. Please refresh the page and try again.";
                        return;
                    }
                    if (!response) {
                        resultDiv.textContent = "Error: Unable to access page content. Please refresh the page and try again.";
                        return;
                    }
                    if (response.error) {
                        resultDiv.textContent = response.error;
                        return;
                    }
                    if (!response.text || response.text.length < 50) {
                        resultDiv.textContent = "No substantial content found. Try selecting text manually or visit an article page.";
                        return;
                    }

                    try {
                        const summary = await getGeminiSummary(response.text, summaryType, result.geminiApiKey);
                        resultDiv.textContent = summary;
                    } catch (error) {
                        console.error('Summary error:', error);
                        resultDiv.textContent = `Error generating summary: ${error.message}`;
                    }
                }
            );
        } catch (error) {
            resultDiv.textContent = "Error: Unable to access tab. Please try again.";
            console.error('Tab access error:', error);
        }
    });
});

async function getGeminiSummary(text, type, apiKey) {
    // Limit text to prevent API limits
    const maxLength = 30000;
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    
    const promptMap = {
        brief: `Please provide a concise summary of the following text in 2-3 clear sentences. Focus on the main points and key takeaways:\n\n${truncatedText}`,
        detailed: `Please provide a comprehensive and detailed summary of the following text. Include all important points, context, and conclusions. Structure it in well-organized paragraphs:\n\n${truncatedText}`,
        bullets: `Please summarize the following text in 5-7 bullet points. Each bullet point should capture a key idea or important detail. Start each line with "• ":\n\n${truncatedText}`,
    }

    const prompt = promptMap[type] || promptMap.brief;

    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.2 },
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(`API Error: ${errorData.error?.message || "Failed to generate summary"}`);
        }

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary generated";
    } catch (error) {
        throw new Error(`Network or API error: ${error.message}`);
    }
}

document.getElementById("copy-btn").addEventListener("click", () => {
    const txt = document.getElementById("result").innerText;
    if (!txt || txt.includes("Error") || txt.includes("Please set")) return;

    navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById("copy-btn");
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = old), 2000);
    });
});
