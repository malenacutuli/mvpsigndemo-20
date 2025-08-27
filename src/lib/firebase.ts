// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxJ5JAv3OEcbPyzziYw6emz-z9LaHKZ4E",
  authDomain: "axessible-mvp.firebaseapp.com",
  projectId: "axessible-mvp",
  storageBucket: "axessible-mvp.firebasestorage.app",
  messagingSenderId: "78884627652",
  appId: "1:78884627652:web:a138a309d1a83f5dd85591",
  measurementId: "G-MTXLL3H0B2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };