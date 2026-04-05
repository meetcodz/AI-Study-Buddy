// frontend/authentication/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCc6sL4z-POc1MrfCVPu8gtGirGPws-vXk",
  authDomain: "studybuddyauth-10d12.firebaseapp.com",
  projectId: "studybuddyauth-10d12",
  storageBucket: "studybuddyauth-10d12.firebasestorage.app",
  messagingSenderId: "457826456540",
  appId: "1:457826456540:web:665feb230d883f00a7b519",
  measurementId: "G-C87599HPX1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
