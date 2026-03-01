import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
	apiKey: "AIzaSyCxJJOYhQEy7sCHtqL3yrSnm1IVGrD9qd4",
	authDomain: "turbo-jetpack-x.firebaseapp.com",
	projectId: "turbo-jetpack-x",
	storageBucket: "turbo-jetpack-x.firebasestorage.app",
	messagingSenderId: "588021093151",
	appId: "1:588021093151:web:ba2ba6d298c44fb949d62a",
	measurementId: "G-1PRM11TYNQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const leaderboardRef = collection(db, "leaderboard");

window.firebaseAPI = {
    addScore: async (name, score) => {
        return await addDoc(leaderboardRef, { name, score, timestamp: serverTimestamp() });
    },
    getTopScores: async (n) => {
        const q = query(leaderboardRef, orderBy("score", "desc"), limit(n));
        const snap = await getDocs(q);
        return snap.docs.map(doc => doc.data());
    }
};