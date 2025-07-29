document.getElementById("summarize").addEventListener("click", async () => {
    const resultDiv = document.getElementById("result");
    const summaryType = document.getElementById("summary-type").value;
    resultDiv.innerHTML = '<div class="loader"></div>';

    //1 Get the user's API key
    chrome.storage.sync.get(["geminiApiKey"], async (result) => {
        if(!result.geminiApiKey){
            resultDiv.textContent = "Please set your Gemini API key in the options.";
            return;
        }

        //2. Ask content.js for the page text
        chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
            chrome.tabs.sendMessage(
                tab.id,
                { type: "GET_ARTICLE_TEXT" },
                async (response) => {
                    if(!response || !response.text) {
                        resultDiv.textContent = "No article text found.";
                        return;
                    }

                    try {
                        const summary = await getGeminiSummary(response.text, summaryType, result.geminiApiKey);
                        resultDiv.innerHTML = summary;
                    } catch (error) {
                        console.error('Summary error:', error);
                        resultDiv.textContent = `Error generating summary: ${error.message}`;
                    }
                }
            );
        });
    });
});

async function getGeminiSummary(rawText, type, apiKey){
    const max = 20000;
    const text = rawText.length > max ? rawText.slice(0, max) + "..." : rawText;

     const promptMap = {
        brief: `Summarise in 2-3 sentences: \n\n${text}`,
        detailed: `Provide a detailed summary of the following text:\n\n${text}`,
        bullets: `Summarise in 5-7 bullet points (start each line with "- "):\n\n${text}`,
     }

    const prompt = promptMap[type] || promptMap.brief;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            contents: [{parts: [{ text: prompt}] }],
            generationConfig: {temperature: 0.2},
        })
    })

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`API Error: ${errorData.error?.message || "Failed to generate summary"}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No summary generated";
}

document.getElementById("copy-btn").addEventListener("click", () => {
    const txt = document.getElementById("result").innerText;
    if(!txt) return;

    navigator.clipboard.writeText(txt).then(() =>{
        const btn = document.getElementById("copy-btn");
        const old = btn.textContent;
        btn.textContent = "Copied!";
        setTimeout(() => (btn.textContent = old), 2000);
    });
});