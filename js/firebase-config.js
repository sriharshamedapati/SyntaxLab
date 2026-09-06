import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDT6qOzn5FdsRFAAfhx1akYgdH6_V5H528",
    authDomain: "syntaxlab-5.firebaseapp.com",
    projectId: "syntaxlab-5",
    storageBucket: "syntaxlab-5.appspot.com",
    messagingSenderId: "978992908913",
    appId: "1:978992908913:web:90e56dd14f2d04f2b70776"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
