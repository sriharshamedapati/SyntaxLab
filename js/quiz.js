const GEMINI_API_KEY = 'AIzaSyDJHnx46wOu1HGbYnRQjOi3GizRY5CSyq0'; 
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const urlParams = new URLSearchParams(window.location.search);
const topic = urlParams.get('topic');
const difficulty = urlParams.get('difficulty');

const topicDisplay = document.getElementById('topicDisplay');
if (topicDisplay) {
    topicDisplay.textContent = `Topic: ${topic} | Difficulty: ${difficulty}`;
}

let correctAnswers = {}; 

async function fetchQuiz() {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === '###') {
        showError('API Key missing or invalid. Please add your Gemini API key.');
        return;
    }

    try {
        const prompt = `Generate 10 multiple-choice quiz questions about "${topic}" with "${difficulty}" difficulty.
Return JSON ONLY with format:
[
    {
        "question": "Question text",
        "options": {"A": "...", "B": "...", "C": "...", "D": "..."},
        "answer": "A/B/C/D"
    }
]`;

        const response = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) throw new Error(`API Error: ${response.status}`);

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) throw new Error('Invalid response from API.');

        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) jsonText = jsonText.replace(/```json\n?/, '').replace(/```\n?$/, '');
        else if (jsonText.startsWith('```')) jsonText = jsonText.replace(/```\n?/, '').replace(/```\n?$/, '');

        const questions = JSON.parse(jsonText);
        displayQuiz(questions);

    } catch (err) {
        console.error(err);
        showError(err.message);
    }
}

function displayQuiz(questions) {
    const container = document.getElementById('quizContainer');
    const loading = document.getElementById('loadingState');

    if(!container) return;

    if(loading) loading.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = '';
    correctAnswers = {}; 

    questions.forEach((q, idx) => {
        correctAnswers[`q${idx + 1}`] = q.answer;

        const optionsHtml = Object.entries(q.options)
            .map(([key, val]) => `
                <div 
                    class="option-btn flex items-center p-3 mb-2 bg-gray-800 border-2 border-gray-700 rounded-lg cursor-pointer hover:bg-gray-700 hover:border-pink-500 transition-all duration-200"
                    data-question-id="q${idx + 1}" 
                    data-option="${key}"
                    onclick="window.selectOption(this)"
                >
                    <div class="w-5 h-5 rounded-full border-2 border-pink-500 mr-3 flex items-center justify-center flex-shrink-0">
                        <div class="w-2 h-2 rounded-full bg-transparent transition-colors duration-200 selected-dot"></div>
                    </div>
                    <span class="font-bold text-pink-400 mr-3">${key}:</span>
                    <span class="text-gray-300">${val}</span>
                </div>
            `).join('');

        container.innerHTML += `
            <div class="quiz-card bg-gray-900 border-2 border-gray-700 rounded-xl p-6 transition-all" id="question-${idx + 1}">
                <h3 class="text-xl font-bold text-white mb-4">Q${idx + 1}: ${q.question}</h3>
                <div class="options-container" id="options-q${idx + 1}">
                    ${optionsHtml}
                </div>
                <div class="feedback mt-3 font-semibold hidden"></div>
            </div>
        `;
    });

    container.innerHTML += `
        <div class="text-center pt-8">
            <button id="submitQuizBtn" onclick="window.submitQuiz()" class="btn-gradient px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-300">
                Submit Quiz
            </button>
        </div>
    `;
}

window.selectOption = function(selectedElement) {
    const questionId = selectedElement.getAttribute('data-question-id');
    const optionsContainer = document.getElementById(`options-${questionId}`);
    
    optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected-option', 'border-pink-500', 'bg-gray-700');
        btn.classList.add('border-gray-700', 'bg-gray-800');
        btn.querySelector('.selected-dot').classList.remove('bg-pink-500'); 
    });

    selectedElement.classList.add('selected-option', 'border-pink-500', 'bg-gray-700');
    selectedElement.querySelector('.selected-dot').classList.add('bg-pink-500');
}

window.submitQuiz = function() {
    let score = 0;
    const totalQuestions = Object.keys(correctAnswers).length;

    const submitBtn = document.getElementById('submitQuizBtn');
    if(submitBtn) submitBtn.disabled = true;

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.onclick = null;
        btn.style.cursor = 'default';
    });

    Object.keys(correctAnswers).forEach(qId => {
        const correctAnsKey = correctAnswers[qId];
        const questionElement = document.getElementById(qId.replace('q', 'question-'));
        const feedbackElement = questionElement.querySelector('.feedback');
        
        const selectedOption = document.querySelector(`#options-${qId} .selected-option`);
        const selectedAnsKey = selectedOption ? selectedOption.getAttribute('data-option') : null;

        questionElement.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected-option', 'border-pink-500', 'bg-gray-700');
            btn.classList.add('border-gray-800', 'bg-gray-900'); 
            btn.style.cursor = 'default';
            btn.querySelector('.selected-dot').classList.remove('bg-pink-500'); 
        });

        questionElement.querySelectorAll(`.option-btn`).forEach(btn => {
            const currentKey = btn.getAttribute('data-option');
            
            if (currentKey === correctAnsKey) {
                btn.classList.add('bg-green-900/40', 'border-green-500');
                btn.querySelector('span:first-of-type').classList.replace('text-pink-400', 'text-green-400');
                btn.querySelector('.selected-dot').classList.add('bg-green-500');
            }
            
            if (selectedAnsKey && currentKey === selectedAnsKey) {
                if (selectedAnsKey === correctAnsKey) {
                    score++;
                    feedbackElement.textContent = '✅ Correct!';
                    feedbackElement.classList.remove('text-red-400', 'hidden', 'text-yellow-400');
                    feedbackElement.classList.add('text-green-400');
                } else {
                    btn.classList.add('bg-red-900/40', 'border-red-500');
                    btn.querySelector('span:first-of-type').classList.replace('text-pink-400', 'text-red-400');
                    btn.querySelector('.selected-dot').classList.add('bg-red-500');
                    feedbackElement.textContent = `❌ Incorrect. The answer was ${correctAnsKey}.`;
                    feedbackElement.classList.remove('text-green-400', 'hidden', 'text-yellow-400');
                    feedbackElement.classList.add('text-red-400');
                }
            } else if (!selectedAnsKey && currentKey === correctAnsKey) {
                feedbackElement.textContent = `⚠️ No answer selected. The answer was ${correctAnsKey}.`;
                feedbackElement.classList.remove('text-green-400', 'text-red-400', 'hidden');
                feedbackElement.classList.add('text-yellow-400');
            }
        });
        feedbackElement.classList.remove('hidden');
    });

    const finalScoreHtml = `
        <div class="text-center bg-gray-800 p-6 rounded-xl mt-6 border-2 border-pink-500">
            <h3 class="text-3xl font-bold logo-gradient">Quiz Complete!</h3>
            <p class="text-2xl text-white mt-2">You scored: <span class="font-extrabold text-pink-400">${score} / ${totalQuestions}</span></p>
        </div>
    `;
    document.getElementById('quizContainer').insertAdjacentHTML('beforeend', finalScoreHtml);
    
    if(submitBtn) {
        submitBtn.textContent = 'Generate More Quizzes';
        submitBtn.onclick = () => window.location.href=window.location.pathname.includes('/pages/') ? 'AIzonehome.html' : 'pages/AIzonehome.html';
        submitBtn.disabled = false;
    }
}

function showError(msg) {
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    
    if(loadingState) loadingState.classList.add('hidden');
    if(errorState) errorState.classList.remove('hidden');
    if(errorMessage) errorMessage.textContent = msg || 'Failed to generate quiz.';
}

if (topicDisplay) {
    if (topic && difficulty) fetchQuiz();
    else showError('Missing topic or difficulty. Please go back and try again.');
}
