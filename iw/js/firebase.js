import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, set, query, orderByChild, limitToLast, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
	apiKey: "AIzaSyAJziwNLtLfJBmUjeXF6IuLp8tFF2tU_9A",
	authDomain: "inferno-wing.firebaseapp.com",
	projectId: "inferno-wing",
	storageBucket: "inferno-wing.firebasestorage.app",
	messagingSenderId: "737336684845",
	appId: "1:737336684845:web:30ff12eca4e345274d23a4",
	measurementId: "G-MJVB71HD7S"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const firebase = (() => {
	async function submitScore(name, score, diff) {
		if (!name || score <= 0) return false;
		try {
			const scoresRef = ref(db, 'leaderboard');
			const newScoreRef = push(scoresRef);
			await set(newScoreRef, {
				name: name.slice(0, 24),
				score: parseInt(score),
				diff: diff,
				ts: Date.now()
			});
			return true;
		} catch (e) {
			console.error("Firebase Error:", e);
			return false;
		}
	}

	async function getTop100() {
		try {
			const scoresRef = query(ref(db, 'leaderboard'), orderByChild('score'), limitToLast(100));
			const snapshot = await get(scoresRef);
			
			if (snapshot.exists()) {
				const data = snapshot.val();
				// On transforme l'objet en tableau et on trie du plus grand au plus petit
				return Object.values(data)
					.sort((a, b) => b.score - a.score); 
			}
			return [];
		} catch (e) {
			console.error("Erreur de récupération :", e);
			return [];
		}
	}
	return { submitScore, getTop100 };
})();
window.firebase = firebase;