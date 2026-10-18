
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

// Top 100 pour la course au classement (échoue en silence : le
// jeu fonctionne sans, le système de rang est alors simplement masqué)
try {
    const { initializeApp } =
        await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
    const {
        getFirestore,
        collection,
        query,
        orderBy,
        limit,
        getDocs,
        doc,
        setDoc,
        getDoc,
    } =
        await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const app100 = initializeApp(
        {
            apiKey: "AIzaSyDsQcccZRdM1dlXDOZB49rTjl1Unm4A_2g",
            authDomain: "vectonova.firebaseapp.com",
            projectId: "vectonova",
            storageBucket: "vectonova.firebasestorage.app",
            messagingSenderId: "755966710496",
            appId: "1:755966710496:web:85bfa35d1fd6bf5c62f685",
        },
        "vn-top100",
    );
    const db100 = getFirestore(app100);
    // Fantômes : un doc "g_<pseudo>" dans /leaderboard SANS champ "score"
    // (donc jamais renvoyé par les classements triés sur "score").
    const ghId = (n) =>
        "g_" +
        String(n || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .slice(0, 40);
    window.fbGhostPut = (name, score, data) =>
        setDoc(doc(db100, "leaderboard", ghId(name)), {
            gn: String(name),
            gs: score,
            gd: data,
            gv: 1,
            gt: Date.now(),
        });
    window.fbGhostGet = async (name) => {
        const s = await getDoc(
            doc(db100, "leaderboard", ghId(name)),
        );
        return s.exists() ? s.data() : null;
    };
    window.fbTop100 = async () => {
        const q = query(
            collection(db100, "leaderboard"),
            orderBy("score", "desc"),
            limit(100),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => d.data());
    };
} catch (e) {
    console.warn("fbTop100:", e);
}