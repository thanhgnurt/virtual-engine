// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCqiFLeKNVRlCZRSunOFXncVg8aCVYCgMQ",
  authDomain: "virtual-engine-2026.firebaseapp.com",
  projectId: "virtual-engine-2026",
  storageBucket: "virtual-engine-2026.firebasestorage.app",
  messagingSenderId: "609190783789",
  appId: "1:609190783789:web:d4ae8af90c78f03b2ec1a4",
  measurementId: "G-NHL73ZES3P"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
