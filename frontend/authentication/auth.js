// frontend/authentication/auth.js
import { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth, googleProvider } from "./firebase-config.js";

// Helper for Google Login
export const loginWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        throw error;
    }
};

// Helper for Email Login
export const loginWithEmail = async (email, password) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error) {
        // Automatically try to register if user doesn't exist (simpler for this prototype)
        if (error.code === 'auth/user-not-found') {
            const signup = await createUserWithEmailAndPassword(auth, email, password);
            return signup.user;
        }
        throw error;
    }
};

// Helper for Anonymous (Skip) Login
export const skipAuth = async () => {
    try {
        const result = await signInAnonymously(auth);
        return result.user;
    } catch (error) {
        console.error("Skip Auth Error:", error);
        throw error;
    }
};

// Helper for Logout
export const logoutUser = async () => {
    try {
        await signOut(auth);
        localStorage.removeItem('studyflow_auth');
        localStorage.removeItem('studyflow_user');
        window.location.href = 'login.html';
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

// Global Listener for UI updates
export const watchAuthState = (callback) => {
    onAuthStateChanged(auth, callback);
};
