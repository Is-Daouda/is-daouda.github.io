import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    limit,
    serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ← Remplace par ton propre firebaseConfig
const firebaseConfig = {
    apiKey: "AIzaSyDsQcccZRdM1dlXDOZB49rTjl1Unm4A_2g",
    authDomain: "vectonova.firebaseapp.com",
    projectId: "vectonova",
    storageBucket: "vectonova.firebasestorage.app",
    messagingSenderId: "755966710496",
    appId: "1:755966710496:web:85bfa35d1fd6bf5c62f685",
    measurementId: "G-SE1KP3BK3G",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Envoie le score en fin de partie
window.fbPush = async (name, score) => {
    try {
        await addDoc(collection(db, "leaderboard"), {
            name,
            score,
            timestamp: serverTimestamp(),
        });
    } catch (e) {
        console.warn("fbPush:", e);
    }
};

// Récupère le top 50
window.fbTop = async () => {
    try {
        const q = query(
            collection(db, "leaderboard"),
            orderBy("score", "desc"),
            limit(50),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data());
    } catch (e) {
        console.warn("fbTop:", e);
        return [];
    }
};