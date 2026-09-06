const GEMINI_API_KEY = 'AIzaSyDJHnx46wOu1HGbYnRQjOi3GizRY5CSyq0'; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const urlParams = new URLSearchParams(window.location.search);
const topic = urlParams.get('topic');
const difficulty = urlParams.get('difficulty');

const topicDisplay = document.getElementById('topicDisplay');
if (topicDisplay) {
    topicDisplay.textContent = `Topic: ${topic} | Difficulty: ${difficulty}`;
}

async function fetchProblems() {
    if (GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE' || !GEMINI_API_KEY.trim()) {
        showError('API Key is missing or invalid. Please update GEMINI_API_KEY in the script.');
        return;
    }

    try {
        const prompt = `You are a DSA problem curator. Generate exactly 5 LeetCode problems about "${topic}" with "${difficulty}" difficulty.

For each problem, provide:
1. Problem Number (e.g., 1, 2, 3...)
2. Problem Name
3. Brief Description (2-3 sentences)
4. LeetCode Link (use format: https://leetcode.com/problems/problem-name/)

Format your response EXACTLY as JSON array:
[
    {
    "number": "1",
    "name": "Two Sum",
    "description": "Given an array of integers, return indices of two numbers that add up to a target.",
    "link": "https://leetcode.com/problems/two-sum/"
    }
]

IMPORTANT: 
- Return ONLY the JSON array, no additional text
- Make sure all problems are real LeetCode problems
- Ensure difficulty matches: ${difficulty}
- All 5 problems must be related to: ${topic}`;

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts[0].text) {
            throw new Error('Received an empty or invalid response from the API.');
        }
        
        const generatedText = data.candidates[0].content.parts[0].text;
        
        let jsonText = generatedText.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/```json\n?/, '').replace(/```\n?$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/```\n?/, '').replace(/```\n?$/, '');
        }
        
        const problems = JSON.parse(jsonText);
        displayProblems(problems);

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    }
}

function displayProblems(problems) {
    const container = document.getElementById('problemsContainer');
    const loading = document.getElementById('loadingState');
    
    if(!container) return;

    if(loading) loading.classList.add('hidden');
    container.classList.remove('hidden');

    container.innerHTML = ''; 

    problems.forEach((problem, index) => {
        const difficultyClass = difficulty.toLowerCase() === 'easy' ? 'badge-easy' : 
                                difficulty.toLowerCase() === 'medium' ? 'badge-medium' : 'badge-hard';
        
        const problemCard = `
            <div class="problem-card bg-gray-900 border-2 border-gray-700 rounded-xl p-6 hover:border-cyan-400 transition-all">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                        <div class="bg-cyan-500/20 text-cyan-400 w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg">
                            ${index + 1}
                        </div>
                        <div>
                            <h3 class="text-xl font-bold text-white">${problem.name}</h3>
                            <p class="text-sm text-gray-500">Problem #${problem.number}</p>
                        </div>
                    </div>
                    <span class="${difficultyClass} px-3 py-1 rounded-full text-white text-sm font-semibold">
                        ${difficulty}
                    </span>
                </div>
                
                <p class="text-gray-300 mb-4 leading-relaxed">
                    ${problem.description}
                </p>
                
                <a href="${problem.link}" target="_blank" class="inline-flex items-center gap-2 btn-gradient px-4 py-2 rounded-lg font-semibold text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Solve on LeetCode
                </a>
            </div>
        `;
        
        container.innerHTML += problemCard;
    });

    container.innerHTML += `
        <div class="text-center pt-8">
            <button onclick="window.location.href=window.location.pathname.includes('/pages/') ? 'AIzonehome.html' : 'pages/AIzonehome.html'" class="btn-gradient px-8 py-3 rounded-lg font-semibold text-lg">
                Generate More Problems
            </button>
        </div>
    `;
}

function showError(message) {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    
    if(loadingState) loadingState.classList.add('hidden');
    if(errorState) errorState.classList.remove('hidden');
    if(errorMessage) errorMessage.textContent = message || 'Failed to generate problems. Please check your API key and try again.';
}

if(topicDisplay) {
    if (topic && difficulty) {
        fetchProblems();
    } else {
        showError('Missing topic or difficulty. Please go back and try again.');
    }
}
