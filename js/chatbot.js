// Chatbot Logic
const chatBox = document.getElementById('chatBox');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');

const GEMINI_API_KEY = "AIzaSyDJHnx46wOu1HGbYnRQjOi3GizRY5CSyq0";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function sendMessage() {
    if(!userInput || !chatBox) return;
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    userInput.value = '';
    appendMessage('ai', 'Thinking...');

    try {
    const prompt = `You are SyntaxLab AI Tutor. You only answer coding and learning-related questions. Be clear, helpful, and educational.\nUser: ${text}`;

    const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
        }),
    });

    const data = await res.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "⚠️ Sorry, I couldn’t understand that.";

    updateLastAIMessage(aiText);
    } catch (error) {
    updateLastAIMessage("⚠️ Error connecting to Gemini API.");
    console.error(error);
    }
}

function appendMessage(sender, text) {
    if(!chatBox) return;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add(sender === 'user'
    ? 'text-right'
    : 'text-left');

    const bubble = document.createElement('div');
    bubble.className = sender === 'user'
    ? 'inline-block bg-cyan-600 text-white px-4 py-2 rounded-lg border border-cyan-700 max-w-[80%]'
    : 'inline-block bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg text-gray-100 max-w-[80%]';

    bubble.innerText = text;
    msgDiv.appendChild(bubble);
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function updateLastAIMessage(text) {
    if(!chatBox) return;
    const lastMsg = chatBox.lastElementChild;
    if (!lastMsg) return;

    const formatted = renderMarkdown(text);
    lastMsg.innerHTML = `<div class="inline-block bg-gray-800 border border-gray-700 px-4 py-2 rounded-lg text-gray-100 max-w-[80%]">${formatted}</div>`;
    if(typeof Prism !== 'undefined') {
        Prism.highlightAll();
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

function renderMarkdown(text) {
    if(typeof Prism === 'undefined') return text.replace(/\n/g, "<br>");
    return text
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (m, lang, code) => {
        const safeLang = Prism.languages[lang] ? lang : 'javascript';
        return `<pre class="rounded-lg border border-gray-700 my-2"><code class="language-${safeLang}">${Prism.highlight(code, Prism.languages[safeLang], safeLang)}</code></pre>`;
    })
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br>");
}

if(sendBtn && userInput) {
    sendBtn.addEventListener("click", sendMessage);
    userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
    });
}
