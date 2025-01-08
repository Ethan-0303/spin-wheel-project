// Import Firebase functions
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.6.6/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA9hn2rK0JkG20sw2iQO_nstolU9n8zmAs",
  authDomain: "aosgroup26.firebaseapp.com",
  databaseURL: "https://aosgroup26-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "aosgroup26",
  storageBucket: "aosgroup26.firebasestorage.app",
  messagingSenderId: "132444998892",
  appId: "1:132444998892:web:d5a565e7e3b98fe5bb69c9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Export auth and database
export { app, auth, database };