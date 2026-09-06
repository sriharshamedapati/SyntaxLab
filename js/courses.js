import { auth, db as userDB } from './firebase-config.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  increment
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- COURSE CONTENT DATABASE ---
// Course syllabus/module/quiz content lives in a SEPARATE Firebase project
// from the main SyntaxLab auth/user-progress project. This second app
// must be initialized with a unique name (the second argument) so it
// does not collide with the default app exported from firebase-config.js.
const courseConfig = {
  apiKey: "AIzaSyAPmCT5R5iuElrBiBKkYU-rRkOaBvvwTT4",
  authDomain: "course-578ea.firebaseapp.com",
  projectId: "course-578ea",
  storageBucket: "course-578ea.appspot.com",
  messagingSenderId: "171613939317",
  appId: "1:171613939317:web:b20caac4c100570331fa3c"
};
const courseApp = initializeApp(courseConfig, "courseApp");
const courseDB = getFirestore(courseApp);

// --- UI ELEMENTS ---
const courseCollections = ['c', 'java', 'python'];
const courseList = document.getElementById('courseList');
const syllabusView = document.getElementById('syllabusView');
const moduleList = document.getElementById('moduleList');
const moduleDetails = document.getElementById('moduleDetails');
const courseTitle = document.getElementById('courseTitle');
const backToCourses = document.getElementById('backToCourses');
const logoutBtn = document.getElementById('logoutBtn');

// --- AUTH CHECK ---
// Note: actual sign-out is already wired up globally in auth.js.
// This guards page access — redirect to login if not authenticated.
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }
    showCourses();
});

// --- SAFE NUMBER EXTRACT ---
function safeExtractNumber(key) {
  const m = key.match(/(\d+)\s*$/);
  return m ? parseInt(m[1], 10) : 0;
}

// --- SHOW COURSES ---
function showCourses() {
    if (!courseList || !syllabusView) return;
    syllabusView.classList.add('hidden');
    courseList.classList.remove('hidden');
    courseList.innerHTML = '';

    courseCollections.forEach(course => {
        const card = document.createElement('div');
        card.className = 'p-8 rounded-xl bg-gray-800 card-glow text-center hover:scale-[1.02] transition-transform';
        card.innerHTML = `
          <i data-lucide="code" class="w-10 h-10 mx-auto mb-4 text-cyan-400"></i>
          <h3 class="text-2xl font-bold mb-3">${course.toUpperCase()} Course</h3>
          <p class="text-gray-400 mb-4">Master ${course.toUpperCase()} from basics to advanced.</p>
          <button class="w-full py-3 rounded-lg font-semibold text-white btn-gradient flex items-center justify-center gap-2">
            <i data-lucide="layers"></i> View Modules
          </button>
        `;
        card.querySelector('button').onclick = () => startCourse(course);
        courseList.appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- START COURSE ---
async function startCourse(courseName) {
    if (!courseList || !syllabusView || !moduleList || !moduleDetails || !courseTitle) return;
    courseList.classList.add('hidden');
    syllabusView.classList.remove('hidden');
    courseTitle.textContent = `${courseName.toUpperCase()} Modules`;
    moduleList.innerHTML = '<div class="loader"></div>';
    moduleDetails.innerHTML = '<p class="text-gray-400">Select a module to view details</p>';

    try {
        const colRef = collection(courseDB, courseName);
        const docsSnap = await getDocs(colRef);
        moduleList.innerHTML = '';

        if (docsSnap.empty) {
            moduleList.innerHTML = '<p class="text-gray-400">No modules found.</p>';
            return;
        }

        docsSnap.forEach(docSnap => {
            const data = docSnap.data() || {};
            data.id = docSnap.id;
            const topicCount = Object.keys(data.subtopics || {}).length;
            const btn = document.createElement('button');
            btn.className = 'block w-full text-left px-3 py-2 rounded-lg hover:bg-gray-700 transition flex justify-between items-center';
            btn.innerHTML = `
              <span>${data.ModulesLesson || docSnap.id}</span>
              <span class="text-gray-400 text-sm">${topicCount} Topics</span>
            `;
            btn.onclick = () => showModuleDetails(courseName, data);
            moduleList.appendChild(btn);
        });
        if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
        console.error(err);
        moduleList.innerHTML = '<p class="text-red-400">Error loading modules.</p>';
    }
}

// --- SHOW MODULE DETAILS & QUIZZES ---
async function showModuleDetails(courseName, moduleData) {
    if (!moduleDetails) return;
    moduleDetails.innerHTML = `
        <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
            <i data-lucide="book"></i> ${moduleData.ModulesLesson || 'Module'}
        </h2>
        <div id="subtopicsContainer"><div class="loader"></div></div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    moduleDetails.scrollIntoView({ behavior: 'smooth' });

    if (!auth.currentUser) {
        moduleDetails.innerHTML = '<p class="text-red-400">Please log in to view this module.</p>';
        return;
    }

    const userRef = doc(userDB, "users", auth.currentUser.uid);
    let userSnap;
    try {
      userSnap = await getDoc(userRef);
    } catch (err) {
      console.error('Error fetching user:', err);
      moduleDetails.innerHTML = '<p class="text-red-400">Error loading user data.</p>';
      return;
    }

    const completedTopics = userSnap.data()?.completedTopics || [];
    const completedQuizzes = userSnap.data()?.completedQuizzes || [];

    const container = document.getElementById('subtopicsContainer');
    container.innerHTML = '';
    const subtopics = moduleData.subtopics || {};
    const keys = Object.keys(subtopics).sort((a, b) => safeExtractNumber(a) - safeExtractNumber(b));

    if (keys.length === 0) {
        container.innerHTML = '<p class="text-gray-400">No subtopics found.</p>';
        return;
    }

    keys.forEach((key, index) => {
        const sub = subtopics[key] || {};
        const card = document.createElement('div');
        card.className = 'mb-4 bg-gray-700 rounded-lg overflow-hidden transition hover:shadow-lg';
        const header = document.createElement('button');
        header.className = 'w-full text-left px-4 py-3 flex justify-between items-center hover:bg-gray-600 transition';
        const titleText = sub.Subtopic || sub.Title || key;
        header.innerHTML = `<span>${index + 1}. ${titleText}</span><i data-lucide="chevron-down" class="transition-transform"></i>`;

        const content = document.createElement('div');
        content.className = 'collapse-content px-4 text-sm';
        const description = sub.Description || sub['modules.topics.Description'] || 'N/A';
        const syntax = sub.Syntax || sub['modules.topics.Syntax'] || 'N/A';
        const example = sub.ExampleCode || sub['modules.topics.ExampleCode'] || 'N/A';
        const output = sub.Output || sub['modules.topics.Output'] || 'N/A';
        const completeBtnId = `completeBtn_${encodeURIComponent(courseName + '_' + key)}`;

        content.innerHTML = `
            <p class="mb-2"><b>Description:</b> ${description}</p>
            <p class="mb-2"><b>Syntax:</b></p>
            <pre class="bg-gray-800 p-2 rounded mb-2 overflow-x-auto">${syntax}</pre>
            <p class="mb-2"><b>Example:</b></p>
            <pre class="bg-gray-800 p-2 rounded mb-2 overflow-x-auto">${example}</pre>
            <p class="mb-2"><b>Output:</b></p>
            <pre class="bg-gray-800 p-2 rounded mb-2 overflow-x-auto">${output}</pre>
            <button id="${completeBtnId}" class="mt-2 w-full py-2 rounded-lg btn-gradient font-semibold flex items-center justify-center gap-2">
              <i data-lucide="check-circle"></i> Mark as Completed
            </button>
        `;

        header.addEventListener('click', () => {
            content.classList.toggle('open');
            const icon = header.querySelector('i');
            if (icon) icon.classList.toggle('rotate-180');
        });

        card.appendChild(header);
        card.appendChild(content);
        container.appendChild(card);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        (function (topicKey, id) {
          const btn = document.getElementById(id);
          if (!btn) return;
          if (completedTopics.includes(topicKey)) {
            btn.textContent = "✅ Completed";
            btn.disabled = true;
            btn.classList.replace("btn-gradient", "bg-green-600");
          } else {
            btn.addEventListener('click', async () => {
              btn.disabled = true;
              try {
                await updateDoc(userRef, {
                  completedTopics: arrayUnion(topicKey),
                  xp: increment(50)
                });
                btn.textContent = "✅ Completed";
                btn.classList.replace("btn-gradient", "bg-green-600");
              } catch (err) {
                console.error('Error updating completion:', err);
                btn.disabled = false;
                alert("Could not mark completed. Try again.");
              }
            });
          }
        })(`${courseName + '_' + key}`, completeBtnId);
    });

    // --- Add Quiz Button ---
    const quizBtnId = `quizBtn_${encodeURIComponent(courseName + '_' + (moduleData.id || moduleData.ModulesLesson || 'module'))}`;
    const quizBtn = document.createElement('button');
    quizBtn.id = quizBtnId;
    quizBtn.className = 'mt-4 w-full py-2 rounded-lg btn-gradient font-semibold flex items-center justify-center gap-2';
    quizBtn.innerHTML = `<i data-lucide="edit-2"></i> Take Quiz`;

    if (completedQuizzes.includes(courseName + '_' + (moduleData.id || moduleData.ModulesLesson || 'module'))) {
        quizBtn.textContent = "✅ Quiz Completed";
        quizBtn.disabled = true;
        quizBtn.classList.replace("btn-gradient", "bg-green-600");
    } else {
        quizBtn.onclick = () => startQuiz(courseName, moduleData.id || moduleData.ModulesLesson || 'module');
    }
    container.appendChild(quizBtn);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// --- BACK BUTTON ---
if (backToCourses) {
    backToCourses.addEventListener('click', () => {
        syllabusView.classList.add('hidden');
        courseList.classList.remove('hidden');
    });
}

// --- QUIZ LOGIC ---
let currentQuiz = [];
let currentQuestionIndex = 0;
let userScore = 0;
let currentCourseName = '';
let currentModuleId = '';

async function startQuiz(courseName, moduleId) {
    currentCourseName = courseName;
    currentModuleId = moduleId;
    moduleDetails.innerHTML = `<h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
        <i data-lucide="edit-2"></i> Quiz
    </h2><div id="quizContainer" class="px-4 py-2"><div class="loader"></div></div>`;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
        const moduleRef = doc(courseDB, courseName, moduleId);
        const moduleSnap = await getDoc(moduleRef);
        if (!moduleSnap.exists()) {
            moduleDetails.innerHTML += '<p class="text-red-400">Quiz not found.</p>';
            return;
        }

        currentQuiz = moduleSnap.data().quizzes || [];
        currentQuestionIndex = 0;
        userScore = 0;

        if (currentQuiz.length === 0) {
            moduleDetails.innerHTML += '<p class="text-gray-400">No quiz questions found.</p>';
            return;
        }

        showQuestion();
    } catch (err) {
        console.error(err);
        moduleDetails.innerHTML += '<p class="text-red-400">Error loading quiz.</p>';
    }
}

function showQuestion() {
    const questionData = currentQuiz[currentQuestionIndex];
    const container = document.getElementById('quizContainer');
    container.innerHTML = '';

    const optionsHtml = (questionData.options || []).map((opt, i) =>
        `<button class="w-full py-2 my-1 rounded-lg bg-gray-700 hover:bg-gray-600 transition text-left option-btn" data-index="${i}">
            ${opt}
        </button>`
    ).join('');

    container.innerHTML = `
        <p class="mb-4 font-semibold">${currentQuestionIndex + 1}. ${questionData.question}</p>
        <div id="optionsContainer">${optionsHtml}</div>
        <div class="mt-4 text-right">
            <button id="nextQuizBtn" class="py-2 px-4 rounded-lg btn-gradient font-semibold">${currentQuestionIndex === currentQuiz.length - 1 ? 'Submit' : 'Next'}</button>
        </div>
    `;

    const optionButtons = container.querySelectorAll('.option-btn');
    let selectedIndex = null;
    optionButtons.forEach(btn => btn.addEventListener('click', () => {
        optionButtons.forEach(b => b.classList.remove('ring-2', 'ring-cyan-400'));
        btn.classList.add('ring-2', 'ring-cyan-400');
        selectedIndex = parseInt(btn.dataset.index, 10);
    }));

    document.getElementById('nextQuizBtn').onclick = async () => {
        if (selectedIndex === null) return alert("Please select an option.");
        const correct = questionData.correctAnswer;
        const chosen = questionData.options[selectedIndex];
        if (correct === chosen) userScore++;

        currentQuestionIndex++;
        if (currentQuestionIndex < currentQuiz.length) {
            showQuestion();
        } else {
            const userRef = doc(userDB, "users", auth.currentUser.uid);
            try {
                await updateDoc(userRef, {
                    xp: increment(userScore * 20),
                    completedQuizzes: arrayUnion(currentCourseName + '_' + currentModuleId)
                });
            } catch (err) {
                console.error('Error updating quiz result:', err);
                alert('Could not save quiz result. Try again later.');
            }
            showQuizResult();
        }
    };
}

function showQuizResult() {
    moduleDetails.innerHTML = `
        <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
            <i data-lucide="award"></i> Quiz Completed
        </h2>
        <p class="text-lg">Your Score: <b>${userScore} / ${currentQuiz.length}</b></p>
        <button id="backToModuleBtn" class="mt-4 py-2 px-4 rounded-lg btn-gradient font-semibold flex items-center justify-center gap-2">
            <i data-lucide="arrow-left"></i> Back to Module
        </button>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    document.getElementById('backToModuleBtn').onclick = () => {
        showModuleDetails(currentCourseName, { id: currentModuleId });
    };
}
