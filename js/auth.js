import { auth, db } from './firebase-config.js';
import { 
    signInAnonymously, 
    signInWithCustomToken,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
    setPersistence,
    browserLocalPersistence,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// General Logout Logic for all pages
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await signOut(auth);
            console.log('User signed out');
            window.location.href = window.location.pathname.includes("/pages/") ? "../index.html" : "index.html"; 
        } catch (error) {
            console.error('Sign out error', error);
        }
    });
}

// Login/Signup Page Logic
const authForm = document.getElementById('auth-form');
if (authForm) {
    let isLoginMode = true;
    let isLoading = false;

    const primaryButtonBase = "w-full px-6 py-3 rounded-xl font-semibold cursor-pointer transition-all duration-300 transform active:scale-95 shadow-lg text-gray-950 flex items-center justify-center relative";
    const toggleBaseClasses = "flex-1 font-medium py-2 px-3 rounded-xl transition-colors duration-300 text-gray-400 hover:text-white";

    const cardTitle = document.getElementById('card-title');
    const cardSubtitle = document.getElementById('card-subtitle');
    const loginToggle = document.getElementById('login-toggle');
    const signupToggle = document.getElementById('signup-toggle');
    const submitButton = document.getElementById('submit-button');
    const fullNameField = document.getElementById('full-name-field'); 
    const fullNameInput = document.getElementById('fullName'); 
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');
    const messageBox = document.getElementById('message-box');
    const messageContent = document.getElementById('message-content');
    const footerLink = document.getElementById('footer-link'); 

    function getFirebaseErrorMessage(code) {
        switch (code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Invalid email or password.';
            case 'auth/email-already-in-use':
                return 'This email address is already registered.';
            case 'auth/weak-password':
                return 'Password must be at least 6 characters long.';
            case 'auth/invalid-email':
                return 'The email address is not valid.';
            case 'auth/operation-not-allowed':
                return 'Email/Password sign-in is disabled. Contact support.';
            default:
                return 'An unexpected authentication error occurred. Please try again.';
        }
    }

    function showCustomMessage(message, isSuccess) {
        const baseClasses = "text-white";
        const successClasses = "bg-green-600/90 shadow-green-500/50";
        const errorClasses = "bg-red-600/90 shadow-red-500/50";

        messageContent.className = `${baseClasses} ${isSuccess ? successClasses : errorClasses} px-5 py-3 rounded-xl shadow-2xl max-w-sm`;
        messageContent.innerHTML = message;

        messageBox.classList.remove('translate-x-full');
        setTimeout(() => {
            messageBox.classList.add('translate-x-full');
        }, 4000);
    }

    function updateUI() {
        cardTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Your Account';
        cardSubtitle.textContent = isLoginMode ? 'Enter your details to continue.' : 'Start your coding journey today.';
        
        const submitText = isLoginMode ? 'Login Securely' : 'Sign Up';
        
        submitButton.innerHTML = isLoading 
            ? `<svg class="animate-spin h-5 w-5 text-gray-950 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>${isLoginMode ? 'Logging In...' : 'Signing Up...'}`
            : submitText;

        submitButton.disabled = isLoading;
        
        const buttonModeClasses = isLoginMode 
            ? 'shadow-cyan-500/40 bg-gradient-to-r from-cyan-400 to-fuchsia-600 hover:shadow-xl hover:shadow-cyan-400/50'
            : 'shadow-fuchsia-500/40 bg-gradient-to-r from-fuchsia-600 to-cyan-400 hover:shadow-xl hover:shadow-fuchsia-400/50';
            
        submitButton.className = `${primaryButtonBase} ${buttonModeClasses}`;

        if (isLoading) {
            submitButton.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            submitButton.classList.remove('opacity-75', 'cursor-not-allowed');
        }

        loginToggle.className = toggleBaseClasses;
        signupToggle.className = toggleBaseClasses;

        const activeToggle = isLoginMode ? loginToggle : signupToggle;
        activeToggle.className = activeToggle.className.replace('text-gray-400 hover:text-white', '');
        activeToggle.classList.add('shadow-lg', 'shadow-cyan-500/40', 'text-gray-950', 'bg-gradient-to-r', 'from-cyan-400', 'to-fuchsia-600');

        if (footerLink) {
            footerLink.classList.toggle('hidden', !isLoginMode);
        }
        if (fullNameField) {
            fullNameField.classList.toggle('hidden', isLoginMode);
            fullNameInput.required = !isLoginMode; 
        }
    }

    function toggleMode(isLogin) {
        if (isLoading) return;
        isLoginMode = isLogin;
        errorMessage.classList.add('hidden');
        updateUI();
    }

    async function handleFormSubmit(e) {
        e.preventDefault();
        
        if (!auth) {
            errorMessage.textContent = 'Firebase authentication service is not ready.';
            errorMessage.classList.remove('hidden');
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            errorMessage.textContent = 'Please enter both email and password.';
            errorMessage.classList.remove('hidden');
            return;
        }

        const fullName = fullNameInput.value.trim(); 
        if (!isLoginMode && !fullName) {
            errorMessage.textContent = 'Please enter your full name, email, and password.';
            errorMessage.classList.remove('hidden');
            return;
        }

        errorMessage.classList.add('hidden');
        isLoading = true;
        updateUI();

        try {
            if (isLoginMode) {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                showCustomMessage(`Welcome back, ${userCredential.user.displayName || userCredential.user.email}!`, true);
                window.location.href = window.location.pathname.includes('/pages/') ? 'afterloginhome.html' : 'pages/afterloginhome.html';
                
            } else {
                let userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: fullName });

                try {
                    await setDoc(doc(db, "users", userCredential.user.uid), {
                        uid: userCredential.user.uid,
                        name: fullName,
                        email: email,
                        createdAt: new Date().toISOString()
                    });
                } catch (dbError) {
                    console.error("Firestore write error:", dbError);
                }

                showCustomMessage(`Account created successfully for ${fullName}!`, true);
                fullNameInput.value = '';
                emailInput.value = '';
                passwordInput.value = '';
                toggleMode(true); 
            }
        } catch (error) {
            console.error("Firebase Auth Error:", error);
            errorMessage.textContent = getFirebaseErrorMessage(error.code);
            errorMessage.classList.remove('hidden');
        } finally {
            isLoading = false;
            updateUI();
        }
    }

    loginToggle.addEventListener('click', () => toggleMode(true));
    signupToggle.addEventListener('click', () => toggleMode(false));
    authForm.addEventListener('submit', handleFormSubmit);

    // Initial setup
    setPersistence(auth, browserLocalPersistence).then(() => {
        updateUI();
    }).catch((error) => {
        console.error("Error setting persistence", error);
        updateUI();
    });
}
