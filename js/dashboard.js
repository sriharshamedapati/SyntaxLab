import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, collection, query, orderBy, limit, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/* ---------- CONFIG ---------- */
const XP_PER_TOPIC = 10;
const TOTAL_PYTHON_TOPICS = 24;
const levelConfig = [
  {level:1,min:0,max:300,name:"Newbie Spark",title:"Beginner"},
  {level:2,min:301,max:700,name:"Code Apprentice",title:"Learner"},
  {level:3,min:701,max:1500,name:"Syntax Slinger",title:"Intermediate"},
  {level:4,min:1501,max:2500,name:"Bug Buster",title:"Advanced"},
  {level:5,min:2501,max:4000,name:"Code Ninja",title:"Pro"},
  {level:6,min:4001,max:6000,name:"Syntax Master",title:"Master"}
];
const lastLevel = levelConfig[levelConfig.length - 1];
const badgeMilestones = [
  {xp:100,name:"First Step",icon:"fa-walking"},
  {xp:500,name:"Half K",icon:"fa-medal"},
  {xp:1000,name:"Kilo Coder",icon:"fa-gem"},
  {xp:2000,name:"Double K",icon:"fa-star"},
  {xp:3000,name:"Triple Threat",icon:"fa-fire"},
  {xp:5000,name:"Elite Coder",icon:"fa-trophy"}
];

/* ---------- ALL TOPICS ---------- */
const ALL_TOPICS = [
  "subtopic: Introduction to Python 1",
  "subtopic: Variables - Declaring Variables 1",
  "subtopic: Variables - Primitive Types 2",
  "subtopic: Variables - Basic Input_Use Input 3",
  "subtopic: Variables - Naming Variables 4",
  "subtopic: Operators - Arithmetic Perform_Ma.. 1",
  "subtopic: Operators - Comparison Compare_Je.. 2",
  "subtopic: Operators - Logical Combine_a.. 3",
  "subtopic: Operators - Assignment Assign_a.. 4",
  "subtopic: Operators - Bitwise Biwise_& 5",
  "subtopic: Control Flow - If-Else Conditional 1",
  "subtopic: Control Flow - Nesting_If_Condition.. 2",
  "subtopic: Control Flow - Boolean_Logic_Tuthy 3",
  "subtopic: Control Flow - Short-Circuiting 4",
  "subtopic: Control Flow - Match-Case (3.10+) 5",
  "subtopic: Loops - For Loops Iterate_over 1",
  "subtopic: Loops - While Loops Repeat_While 2",
  "subtopic: Loops - Break and Continue Loop_con 3",
  "subtopic: Loops - Nested Loops Loops_in_Loops 4",
  "subtopic: Loops - Loop Best Practices 5",
  "subtopic: Strings and String Operations 1",
  "subtopic: Lists and Tuples - Lists Create_a.. 1",
  "subtopic: Dictionaries and Sets - Dictionaries 1",
  "subtopic: Functions - Defining Functions 1"
];

/* ---------- DYNAMIC RECOMMENDATIONS ---------- */
function buildRecommendations(completedArray) {
  const completedSet = new Set((completedArray || []).map(t => t.trim()));
  const recs = [];

  const nextTopic = ALL_TOPICS.find(t => !completedSet.has(t));
  const completedCount = ALL_TOPICS.filter(t => completedSet.has(t)).length;
  const progress = Math.round((completedCount / TOTAL_PYTHON_TOPICS) * 100);

  if (nextTopic) {
    const idx = ALL_TOPICS.indexOf(nextTopic) + 1;
    recs.push({
      title: nextTopic.replace(/^subtopic: /, ''),
      desc: `Continue – ${idx} of ${TOTAL_PYTHON_TOPICS} topics`,
      progress,
      link: `courses.html?topic=${encodeURIComponent(nextTopic)}`,
      icon: "fa-play-circle"
    });
  } else {
    recs.push(
      { title: "JavaScript Essentials", desc: "Master web development", progress: 0, link: "courses.html?module=js-essentials", icon: "fa-js-square" },
      { title: "Data Structures 101", desc: "Learn arrays, trees, algorithms", progress: 0, link: "courses.html?module=ds-101", icon: "fa-database" }
    );
  }

  return recs;
}

/* ---------- TOPIC COUNTER ---------- */
function getCompletedTopicsCount(completedArray) {
  if (!completedArray || !Array.isArray(completedArray)) return 0;
  const set = new Set(completedArray.map(t => t.trim()));
  return Math.min(set.size, TOTAL_PYTHON_TOPICS);
}

/* ---------- AUTH LISTENER ---------- */
const userLevelChartElement = document.getElementById("levelChart");

if(userLevelChartElement) {
    onAuthStateChanged(auth, async (user) => {
    if (!user) { location.href = "index.html"; return; }

    const userRef = doc(db, "users", user.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return;
    const data = snap.data();

    const topicsCount = getCompletedTopicsCount(data.completedTopics);
    let xp = data.xp || 0;
    const xpFromTopics = topicsCount * XP_PER_TOPIC;

    if (xpFromTopics > xp) {
        xp = xpFromTopics;
        await updateDoc(userRef, { xp });
        console.log(`XP synced: ${xp}`);
    }

    let curLvl = levelConfig.find(l => xp >= l.min && xp <= l.max) || (xp > lastLevel.max ? lastLevel : levelConfig[0]);
    const nextLvl = curLvl.level < lastLevel.level ? levelConfig.find(l => l.level === curLvl.level + 1) : curLvl;

    // UI Updates
    document.getElementById("userName").textContent = data.name || user.email.split('@')[0];
    document.getElementById("userEmail").textContent = data.email || user.email;
    document.getElementById("userTitle").textContent = curLvl.title;
    document.getElementById("levelName").textContent = curLvl.name;
    document.getElementById("userLevel").textContent = curLvl.level;
    document.getElementById("userLevelBadge").textContent = `Lv.${curLvl.level}`;
    document.getElementById("memberSince").textContent = data.memberSince || new Date(user.metadata.creationTime).toLocaleDateString();
    document.getElementById("xpTotal").textContent = xp.toLocaleString();
    document.getElementById("userPhoto").src = data.photoURL || "https://placehold.co/150x150";

    const levelRange = curLvl.max - curLvl.min;
    let pct = levelRange > 0 ? ((xp - curLvl.min) / levelRange) * 100 : 100;
    pct = Math.min(100, Math.max(0, pct));
    document.getElementById("xpProgress").style.width = `${pct}%`;

    if (curLvl.level < lastLevel.level) {
        document.getElementById("xpGoalText").textContent = `${nextLvl.min - xp} XP to ${nextLvl.name}`;
    } else {
        document.getElementById("xpGoalText").textContent = "Max Level Reached";
    }

    // Animate stats
    const animate = (el, val) => {
        let cur = 0;
        const step = val / 90;
        const t = setInterval(() => {
        cur += step;
        if (cur >= val) { cur = val; clearInterval(t); }
        el.textContent = Math.floor(cur).toLocaleString();
        }, 16);
    };
    const courses = topicsCount >= TOTAL_PYTHON_TOPICS ? 1 : 0;
    animate(document.getElementById("coursesCompleted"), courses);
    animate(document.getElementById("topicsCompleted"), topicsCount);
    animate(document.getElementById("quizzesTaken"), data.quizzesTaken || 0);

    // Badges
    const earned = badgeMilestones.filter(b => xp >= b.xp);
    document.getElementById("badgesContainer").innerHTML = earned.map(b => `
        <div class="flex-shrink-0 text-center group">
        <div class="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-pink-500 p-2 flex items-center justify-center badge-glow group-hover:scale-110 transition-all">
            <i class="fas ${b.icon} text-lg text-white"></i>
        </div>
        <p class="text-xs mt-1 font-medium text-cyan-300">${b.name}</p>
        </div>`).join('') || '<p class="text-gray-500 text-xs text-center w-full">No badges yet.</p>';

    // Leaderboard
    const lb = await getDocs(query(collection(db, "users"), orderBy("xp", "desc"), limit(5)));
    let rank = 1, myRank = 1, lbHtml = "";
    lb.forEach(d => {
        const u = d.data();
        const name = u.name || u.username || u.email.split('@')[0] || "User";
        if (d.id === user.uid) myRank = rank;
        lbHtml += `<div class="flex justify-between bg-gray-800 p-1.5 rounded text-xs hover-gradient transition ${d.id === user.uid ? 'ring-1 ring-cyan-500' : ''}">
        <span class="font-bold ${d.id === user.uid ? 'text-cyan-400' : ''}"> #${rank++}</span>
        <span class="truncate max-w-24">${name}</span>
        <span>${u.xp || 0} XP ${d.id === user.uid ? "(You)" : ""}</span>
        </div>`;
    });
    document.getElementById("leaderboard").innerHTML = lbHtml;
    document.getElementById("userRank").textContent = `#${myRank}`;

    // Dynamic Recommendations
    const recs = buildRecommendations(data.completedTopics);
    document.getElementById("recommendations").innerHTML = recs.map(r => `
        <div class="recommend-card bg-gray-700 p-3 rounded-lg border border-gray-600 text-xs">
        <div class="flex items-start space-x-2">
            <i class="fas ${r.icon} text-lg text-cyan-400 mt-0.5"></i>
            <div class="flex-1">
            <h3 class="font-bold text-white text-sm">${r.title}</h3>
            <p class="text-gray-300">${r.desc}</p>
            <div class="w-full bg-gray-600 rounded-full h-1.5 my-1">
                <div class="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-pink-500" style="width:${r.progress}%"></div>
            </div>
            <a href="${r.link}" class="btn-gradient px-2 py-1 rounded text-xs font-medium inline-block hover:opacity-90">Start</a>
            </div>
        </div>
        </div>`).join('');

    // === FULL WIDTH CHART WITH POSITIVE AXIS ===
    const ctx = document.getElementById("levelChart").getContext("2d");
    const dataValues = levelConfig.map(l => {
        if (l.level < curLvl.level) {
        return l.max - l.min;
        }
        if (l.level > curLvl.level) {
        return 0;
        }
        return xp - l.min;
    });

    if(typeof Chart !== 'undefined') {
        new Chart(ctx, {
            type: "bar",
            data: {
            labels: levelConfig.map(l => l.name),
            datasets: [{
                label: "XP Earned in Level",
                data: dataValues,
                backgroundColor: levelConfig.map(l => 
                l.level < curLvl.level ? "rgba(0,188,212,0.8)" :
                l.level === curLvl.level ? "rgba(255,64,129,0.9)" :
                "rgba(51,65,85,0.6)"
                ),
                borderRadius: 8,
                borderSkipped: false,
                barThickness: 32
            }]
            },
            options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { enabled: true }
            },
            scales: {
                x: {
                beginAtZero: true,
                min: 0,
                ticks: {
                    color: "#cbd5e1",
                    font: { size: 11 },
                    callback: value => value.toLocaleString()
                },
                grid: { color: "#334155", drawBorder: false },
                border: { display: false }
                },
                y: {
                ticks: {
                    color: "#e2e8f0",
                    font: { size: 11 },
                    padding: 8
                },
                grid: { color: "#334155", drawBorder: false },
                border: { display: false }
                }
            },
            animation: { duration: 1400, easing: 'easeOutQuart' }
            }
        });
    }
    });
}
