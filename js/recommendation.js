const GEMINI_API_KEY = "AIzaSyDJHnx46wOu1HGbYnRQjOi3GizRY5CSyq0"; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const urlParams = new URLSearchParams(window.location.search);
const topic = urlParams.get("topic");

const topicDisplay = document.getElementById("topicDisplay");
if (topicDisplay) {
    topicDisplay.textContent = `Topic: ${topic}`;
}

async function fetchRoadmap() {
    if (!topic) {
        showError("No topic provided. Please go back and enter a topic.");
        return;
    }

    try {
        const prompt = `You are an AI Learning Advisor. Generate a **beginner-friendly, step-by-step roadmap** for mastering the topic "${topic}". 

        Requirements:
        1. Number each step (1️⃣, 2️⃣, 3️⃣…).
        2. For each step, include:
        - Step Title
        - Core concepts (short explanations)
        - Practice exercises or mini-projects
        - Difficulty level
        3. Format the output as a **JSON array**, where each object represents a step suitable for UI card display:
        [
        {
            "step": "1️⃣",
            "title": "Step Title",
            "concepts": ["Concept 1", "Concept 2"],
            "practice": "Short practice task description",
            "difficulty": "Easy / Intermediate / Advanced"
        }
        ]
        4. Return **only the JSON array**, no extra text or notes.
        5. Steps should progress logically from beginner → advanced.
        6. Output should be **ready to display in cards** in the frontend, with all necessary info for step number, title, concepts, practice, and difficulty.

        Example output:

        [
        {
            "step": "1️⃣",
            "title": "Foundational Python Skills",
            "concepts": ["Core syntax, variables, loops", "Functions and OOP basics"],
            "practice": "Write simple programs using loops, functions, and classes",
            "difficulty": "Easy"
        },
        {
            "step": "2️⃣",
            "title": "Basic Data Structures",
            "concepts": ["Lists, Tuples, Dictionaries, Sets, Strings"],
            "practice": "Solve small problems using each data structure",
            "difficulty": "Easy-Intermediate"
        }
        ]`;

        const response = await fetch(GEMINI_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            }),
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error("Invalid response from API.");

        let jsonText = text.trim();
        if (jsonText.startsWith("```json"))
            jsonText = jsonText.replace(/```json\n?/, "").replace(/```$/, "");
        else if (jsonText.startsWith("```"))
            jsonText = jsonText.replace(/```\n?/, "").replace(/```$/, "");

        const roadmap = JSON.parse(jsonText);
        displayRoadmap(roadmap);
    } catch (err) {
        console.error(err);
        showError(err.message);
    }
}

function displayRoadmap(steps) {
    const container = document.getElementById("roadmapContainer");
    if (!container) return;
    
    const loadingState = document.getElementById("loadingState");
    if(loadingState) loadingState.classList.add("hidden");
    
    container.classList.remove("hidden");
    container.innerHTML = "";

    steps.forEach((step, i) => {
        container.innerHTML += `
        <div class="fade-in bg-gray-900 border-2 border-cyan-500/40 rounded-xl p-6 shadow-lg hover:shadow-cyan-500/30 transition-all duration-300" style="animation-delay: ${i * 0.1}s">
            <h3 class="text-xl font-bold text-cyan-400 mb-2">Step ${i + 1}: ${step.title || "Untitled Step"}</h3>
            <p class="text-gray-300 mb-2">
            <strong>Core Concepts:</strong> ${step.concepts ? step.concepts.join(", ") : "N/A"}
            </p>
            <p class="text-gray-300 mb-2">
            <strong>Practice:</strong> ${step.practice || "No practice provided"}
            </p>
            <p class="text-sm text-cyan-300 italic">
            💡 Difficulty: ${step.difficulty || "Not specified"}
            </p>
        </div>
        `;
    });

    container.innerHTML += `
        <div class="text-center mt-10">
        <button onclick="window.location.href=window.location.pathname.includes('/pages/') ? 'AIzonehome.html' : 'pages/AIzonehome.html'" class="btn-gradient px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-300">
            Back to AI Zone
        </button>
        </div>
    `;
}

function showError(msg) {
    const loadingState = document.getElementById("loadingState");
    const errorState = document.getElementById("errorState");
    const errorMessage = document.getElementById("errorMessage");

    if(loadingState) loadingState.classList.add("hidden");
    if(errorState) errorState.classList.remove("hidden");
    if(errorMessage) errorMessage.textContent = msg || "Failed to generate roadmap.";
}

if(topicDisplay) {
    fetchRoadmap();
}
