
window.addEventListener("load", function() {
	window.focus();
	document.body.addEventListener("click", function(e) {
		window.focus();
	}, false);
});

// ══════════════════════════════════════════
//  CANVAS + SCALE
// ══════════════════════════════════════════
const cvs = document.getElementById("c");
const ctx = cvs.getContext("2d");
let W, H;
const BH = 550; // base design height — LANDSCAPE reference
let SC = 1;
function resize() {
	W = cvs.width = window.innerWidth;
	H = cvs.height = window.innerHeight;
	SC = Math.max(H / BH, 0.82); // proportional, min 0.82 so mobile stays visible
}
window.addEventListener("resize", () => {
	resize();
	initBg();
	_skyGrad = null;
	_moonGrad = null;
});
resize();
const p = (v) => v * SC;

// ══════════════════════════════════════════
//  SAVE — IndexedDB
// ══════════════════════════════════════════
const DEF = {
	money: 0, best: 0, bestCombo: 0,
	up: { cannon: 0, battery: 0, armor: 0 },
	name: "", lang: "",
	sound: true, music: true, vibration: true, setupDone: false,
	totalDist: 0, totalCoins: 0, gamesPlayed: 0,
	totalStars: 0, totalBoosts: 0, totalRings: 0,
	totalChests: 0, totalHits: 0, totalEnemiesAvoided: 0,
	maxDistSingle: 0, ach: [], bdg: [],
	activeSkin: 0, activeTrail: 0, dcTotalDone: 0,
};
let sd = Object.assign({}, DEF);

const IDB_NAME = "vectonova", IDB_STORE = "save", IDB_KEY = "v1";
let _idb = null;
function _openIDB() {
	return new Promise((resolve, reject) => {
		if (_idb) { resolve(_idb); return; }
		const req = indexedDB.open(IDB_NAME, 1);
		req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
		req.onsuccess = e => { _idb = e.target.result; resolve(_idb); };
		req.onerror   = () => reject(req.error);
	});
}
function save() {
	_openIDB().then(db => {
		const tx = db.transaction(IDB_STORE, "readwrite");
		tx.objectStore(IDB_STORE).put(JSON.parse(JSON.stringify(sd)), IDB_KEY);
	}).catch(e => console.warn("save:", e));
}
function _loadAndStart() {
	_openIDB().then(db => new Promise((res, rej) => {
		const req = db.transaction(IDB_STORE,"readonly")
						.objectStore(IDB_STORE).get(IDB_KEY);
		req.onsuccess = () => res(req.result);
		req.onerror   = () => rej(req.error);
	})).then(saved => {
		if (saved) sd = Object.assign({}, DEF, saved);
	}).catch(e => console.warn("load:", e))
		.finally(() => _gameReady());
}

// ══════════════════════════════════════════
//  I18N
// ══════════════════════════════════════════
const L = {
	fr: {
		play: "► JOUER",
		upgrades: "⚙ AMÉLIORATIONS",
		scores: "🏆 SCORES",
		options: "OPTIONS",
		tutorial: "TUTORIEL",
		daily: "DÉFIS",
		back: "Retour",
		save: "Sauvegarder",
		record: "RECORD",
		tap: "APPUIE POUR JOUER",
		results: "RÉSULTATS",
		distance: "Distance",
		bonus: "Bonus",
		stars: "Étoiles",
		earned: "Gagné",
		total: "Total",
		shop: "SHOP",
		retry: "REJOUER",
		player: "Joueur",
		sound: "Son",
		music: "Musique",
		vibration: "Vibration",
		language: "Langue",
		loading: "Chargement...",
		noScores: "Aucun score encore.",
		namePrompt: "TON PSEUDO ?",
		nameSub: "Il apparaîtra dans le classement",
		nameBtn: "COMMENCER",
		tapContinue: "APPUIE POUR CONTINUER",
		welcome: "BIENVENUE",
		cannon: "Cannon",
		battery: "Batterie",
		armor: "Armure",
		shieldLbl: "shield",
		jetpackLbl: "jetpack",
		notEnough: "Pas assez !",
		select: "Sélectionne",
		chooseLang: "CHOISIS TA LANGUE",
		confirm: "CONFIRMER",
		combo: "COMBO",
		launch: "LANCE · VOLE · SURVIE",
		pause: "PAUSE",
		resume: "▶ REPRENDRE",
		quit: "✕ QUITTER",
		milestone: "RECORD !",
		comboBreak: "COMBO PERDU !",
		achievements: "🏅 SUCCÈS",
		badges: "🎖 BADGES",
		rotateLbl: "MODE PAYSAGE REQUIS",
		rotateSub: "Tourne ton appareil pour jouer",
		unlocked: "débloqué",
		of: "sur",
		newAch: "SUCCÈS DÉBLOQUÉ",
		cannonDesc: "Lance le robot plus loin",
		batteryDesc: "Augmente la durée du jetpack",
		armorDesc: "Absorbe les chocs ennemis",
		tutNext: "SUIVANT →",
		tutDone: "TERMINER ✓",
		tutClose: "✕",
		continueTitle: "💥 CRASH !",
		continueAd: "📺 CONTINUER (Pub)",
		continueSkip: "Voir les résultats",
		continueSearching: "Recherche d'une pub…",
		continueNone: "Pas de pub disponible",
		flyHint: "👆🏾 TOUCHE L'ÉCRAN OU ESPACE POUR VOLER",
		orbHint: "⚡ COLLECTE LES ORBES BLEUES POUR RECHARGER TON CARBURANT",
	},
	en: {
		play: "► PLAY",
		upgrades: "⚙ UPGRADES",
		scores: "🏆 SCORES",
		options: "OPTIONS",
		tutorial: "TUTORIAL",
		daily: "DAILY",
		back: "Back",
		save: "Save",
		record: "BEST",
		tap: "TAP TO PLAY",
		results: "RESULTS",
		distance: "Distance",
		bonus: "Bonus",
		stars: "Stars",
		earned: "Earned",
		total: "Total",
		shop: "SHOP",
		retry: "RETRY",
		player: "Player",
		sound: "Sound",
		music: "Music",
		vibration: "Vibration",
		language: "Language",
		loading: "Loading...",
		noScores: "No scores yet.",
		namePrompt: "YOUR NAME?",
		nameSub: "It will appear on the leaderboard",
		nameBtn: "START",
		tapContinue: "TAP TO CONTINUE",
		welcome: "WELCOME",
		cannon: "Cannon",
		battery: "Battery",
		armor: "Armor",
		shieldLbl: "shield",
		jetpackLbl: "jetpack",
		notEnough: "Not enough!",
		select: "Select",
		chooseLang: "CHOOSE LANGUAGE",
		confirm: "CONFIRM",
		combo: "COMBO",
		launch: "LAUNCH · FLY · SURVIVE",
		pause: "PAUSE",
		resume: "▶ RESUME",
		quit: "✕ QUIT",
		milestone: "NEW RECORD!",
		comboBreak: "COMBO LOST!",
		achievements: "🏅 ACHS",
		badges: "🎖 BADGES",
		rotateLbl: "LANDSCAPE MODE REQUIRED",
		rotateSub: "Rotate your device to play",
		unlocked: "unlocked",
		of: "of",
		newAch: "ACHIEVEMENT UNLOCKED",
		cannonDesc: "Launches the robot farther",
		batteryDesc: "Increases jetpack duration",
		armorDesc: "Absorbs enemy hits",
		tutNext: "NEXT →",
		tutDone: "DONE ✓",
		tutClose: "✕",
		continueTitle: "💥 CRASH!",
		continueAd: "📺 CONTINUE (Ad)",
		continueSkip: "See results",
		continueSearching: "Looking for an ad…",
		continueNone: "No ad available",
		flyHint: "👆🏾 TAP THE SCREEN OR PRESS SPACE TO FLY",
		orbHint: "⚡ COLLECT THE BLUE ORBS TO RECHARGE YOUR FUEL",
	},
};
function t(k) {
	return (L[sd.lang || "en"] || L.fr)[k] || k;
}
function applyLang() {
	document.querySelectorAll("[data-k]").forEach((el) => {
		const k = el.getAttribute("data-k");
		if (k) el.textContent = t(k);
	});
	const rw = document.getElementById("rwTitle");
	const rs = document.getElementById("rwSub");
	if (rw) rw.textContent = t("rotateLbl");
	if (rs) rs.textContent = t("rotateSub");
}

// ══════════════════════════════════════════
//  UPGRADES
// ══════════════════════════════════════════
const UDEFS = {
	cannon: {
		costs: [1500, 2800, 4800, 7500],
		tips_fr: [
			"Vitesse +18%",
			"Vitesse +36%",
			"Vitesse +55%",
			"Vitesse +100% MAX",
		],
		tips_en: [
			"Speed +18%",
			"Speed +36%",
			"Speed +55%",
			"Speed +100% MAX",
		],
		icon: "🔫",
		vals: [11, 13, 16, 20, 24],
		desc_fr:
			"Lance le robot à pleine puissance. Chaque niveau augmente la vitesse de lancement et la portée maximale.",
		desc_en:
			"Launches the robot at full power. Each level increases launch speed and max range.",
		stat_fr: "Puissance de tir",
		stat_en: "Launch power",
		statFmt: (i) => [11, 13, 16, 20, 24][i] + "× base",
	},
	battery: {
		costs: [1500, 3000, 5500, 8500],
		tips_fr: [
			"Carburant +22%",
			"Carburant +54%",
			"Carburant +95%",
			"Carburant +145% MAX",
		],
		tips_en: [
			"Fuel +22%",
			"Fuel +54%",
			"Fuel +95%",
			"Fuel +145% MAX",
		],
		icon: "⚡",
		vals: [220, 270, 340, 430, 540],
		desc_fr:
			"Augmente la capacité de la jauge jetpack. Plus de carburant = plus long en l'air.",
		desc_en:
			"Increases jetpack fuel capacity. More fuel means more time in the air.",
		stat_fr: "Capacité jauge",
		stat_en: "Fuel capacity",
		statFmt: (i) =>
			Math.round(([220, 270, 340, 430, 540][i] / 220) * 100) +
			"%",
	},
	armor: {
		costs: [2000, 3500, 6000, 9500],
		tips_fr: [
			"Bouclier ×1",
			"Bouclier ×2",
			"Bouclier ×3",
			"Bouclier ×4 MAX",
		],
		tips_en: [
			"Shield ×1",
			"Shield ×2",
			"Shield ×3",
			"Shield ×4 MAX",
		],
		icon: "🛡️",
		vals: [0, 1, 2, 3, 4],
		desc_fr:
			"Absorbe les chocs ennemis avant de perdre du carburant. Chaque bouclier = 1 hit gratuit.",
		desc_en:
			"Absorbs enemy hits before losing fuel. Each shield = 1 free hit.",
		stat_fr: "Résistance",
		stat_en: "Hit buffer",
		statFmt: (i) => [0, 1, 2, 3, 4][i] + " hits",
	},
};
const uv = (k) => UDEFS[k].vals[sd.up[k]];

// ══════════════════════════════════════════
//  ACHIEVEMENTS (100)
// ══════════════════════════════════════════
// Format: [id, icon, name_fr, name_en, desc_fr, desc_en, condition_key, threshold, cat]
const ACHS = [
	// 🚀 Distance — run (15)
	[
		"d1",
		"🚀",
		"Premiers mètres",
		"First Meters",
		"Vole 25m",
		"Fly 25m",
		"dist",
		25,
		"dist",
	],
	[
		"d2",
		"✈️",
		"Décollage",
		"Take Off",
		"Vole 75m",
		"Fly 75m",
		"dist",
		75,
		"dist",
	],
	[
		"d3",
		"🛫",
		"En route",
		"Airborne",
		"Vole 150m",
		"Fly 150m",
		"dist",
		150,
		"dist",
	],
	[
		"d4",
		"🌆",
		"Voyageur",
		"Traveler",
		"Vole 300m",
		"Fly 300m",
		"dist",
		300,
		"dist",
	],
	[
		"d5",
		"🌇",
		"Grand voyageur",
		"Long Haul",
		"Vole 500m",
		"Fly 500m",
		"dist",
		500,
		"dist",
	],
	[
		"d6",
		"🌉",
		"1 kilomètre !",
		"1 Kilometer!",
		"Vole 1000m",
		"Fly 1000m",
		"dist",
		1000,
		"dist",
	],
	[
		"d7",
		"🌌",
		"Explorateur",
		"Explorer",
		"Vole 1500m",
		"Fly 1500m",
		"dist",
		1500,
		"dist",
	],
	[
		"d8",
		"🪐",
		"Cosmonaute",
		"Cosmonaut",
		"Vole 2500m",
		"Fly 2500m",
		"dist",
		2500,
		"dist",
	],
	[
		"d9",
		"⭐",
		"Étoile filante",
		"Shooting Star",
		"Vole 4000m",
		"Fly 4000m",
		"dist",
		4000,
		"dist",
	],
	[
		"d10",
		"🌠",
		"Légende",
		"Legend",
		"Vole 6000m",
		"Fly 6000m",
		"dist",
		6000,
		"dist",
	],
	[
		"d11",
		"🏆",
		"Champion",
		"Champion",
		"Vole 8000m",
		"Fly 8000m",
		"dist",
		8000,
		"dist",
	],
	[
		"d12",
		"💫",
		"Maître de l'air",
		"Air Master",
		"Vole 10000m",
		"Fly 10000m",
		"dist",
		10000,
		"dist",
	],
	[
		"d13",
		"🔥",
		"Supersonique",
		"Supersonic",
		"Vole 15000m",
		"Fly 15000m",
		"dist",
		15000,
		"dist",
	],
	[
		"d14",
		"👑",
		"Roi du ciel",
		"Sky King",
		"Vole 20000m",
		"Fly 20000m",
		"dist",
		20000,
		"dist",
	],
	[
		"d15",
		"🌟",
		"Absolu",
		"Absolute",
		"Vole 30000m",
		"Fly 30000m",
		"dist",
		30000,
		"dist",
	],
	// 📏 Distance cumulée (10)
	[
		"cd1",
		"📏",
		"Marcheur",
		"Walker",
		"Total 500m",
		"Total 500m",
		"totalDist",
		500,
		"total",
	],
	[
		"cd2",
		"🛣️",
		"Routier",
		"Road Runner",
		"Total 2km",
		"Total 2km",
		"totalDist",
		2000,
		"total",
	],
	[
		"cd3",
		"🗺️",
		"Cartographe",
		"Cartographer",
		"Total 5km",
		"Total 5km",
		"totalDist",
		5000,
		"total",
	],
	[
		"cd4",
		"🌍",
		"Tour du monde",
		"World Tour",
		"Total 10km",
		"Total 10km",
		"totalDist",
		10000,
		"total",
	],
	[
		"cd5",
		"🏔️",
		"Alpiniste",
		"Alpinist",
		"Total 25km",
		"Total 25km",
		"totalDist",
		25000,
		"total",
	],
	[
		"cd6",
		"🚂",
		"Chemin de fer",
		"Railroad",
		"Total 50km",
		"Total 50km",
		"totalDist",
		50000,
		"total",
	],
	[
		"cd7",
		"🛸",
		"UFO",
		"UFO",
		"Total 100km",
		"Total 100km",
		"totalDist",
		100000,
		"total",
	],
	[
		"cd8",
		"🌙",
		"Vers la lune",
		"To the Moon",
		"Total 250km",
		"Total 250km",
		"totalDist",
		250000,
		"total",
	],
	[
		"cd9",
		"☀️",
		"Tour du soleil",
		"Solar Tour",
		"Total 500km",
		"Total 500km",
		"totalDist",
		500000,
		"total",
	],
	[
		"cd10",
		"🪐",
		"Odyssée",
		"Odyssey",
		"Total 1000km",
		"Total 1000km",
		"totalDist",
		1000000,
		"total",
	],
	// ⭐ Étoiles (10)
	[
		"s1",
		"⭐",
		"Collectionneur",
		"Collector",
		"Ramasse 10 étoiles",
		"Collect 10 stars",
		"totalStars",
		10,
		"stars",
	],
	[
		"s2",
		"🌟",
		"Chasseur d'étoiles",
		"Star Hunter",
		"Ramasse 50 étoiles",
		"Collect 50 stars",
		"totalStars",
		50,
		"stars",
	],
	[
		"s3",
		"✨",
		"Galaxie",
		"Galaxy",
		"Ramasse 100 étoiles",
		"Collect 100 stars",
		"totalStars",
		100,
		"stars",
	],
	[
		"s4",
		"💫",
		"Pluie d'étoiles",
		"Star Rain",
		"Ramasse 250 étoiles",
		"Collect 250 stars",
		"totalStars",
		250,
		"stars",
	],
	[
		"s5",
		"🌌",
		"Nébuleuse",
		"Nebula",
		"Ramasse 500 étoiles",
		"Collect 500 stars",
		"totalStars",
		500,
		"stars",
	],
	[
		"s6",
		"🪐",
		"Astéroïde",
		"Asteroid",
		"Ramasse 1000 étoiles",
		"Collect 1000 stars",
		"totalStars",
		1000,
		"stars",
	],
	[
		"s7",
		"☄️",
		"Comète",
		"Comet",
		"Ramasse 2000 étoiles",
		"Collect 2000 stars",
		"totalStars",
		2000,
		"stars",
	],
	[
		"s8",
		"🔭",
		"Astronome",
		"Astronomer",
		"Ramasse 5000 étoiles",
		"Collect 5000 stars",
		"totalStars",
		5000,
		"stars",
	],
	[
		"s9",
		"🛸",
		"Alien",
		"Alien",
		"Ramasse 10000 étoiles",
		"Collect 10000 stars",
		"totalStars",
		10000,
		"stars",
	],
	[
		"s10",
		"👾",
		"Maître des étoiles",
		"Star Master",
		"Ramasse 25000 étoiles",
		"Collect 25000 stars",
		"totalStars",
		25000,
		"stars",
	],
	// 🔥 Combo (10)
	[
		"c1",
		"🔥",
		"Double",
		"Double",
		"Atteins x2 combo",
		"Reach x2 combo",
		"bestCombo",
		2,
		"combo",
	],
	[
		"c2",
		"💥",
		"Triple",
		"Triple",
		"Atteins x3 combo",
		"Reach x3 combo",
		"bestCombo",
		3,
		"combo",
	],
	[
		"c3",
		"⚡",
		"Électrique",
		"Electric",
		"Atteins x5 combo",
		"Reach x5 combo",
		"bestCombo",
		5,
		"combo",
	],
	[
		"c4",
		"🌊",
		"Tsunami",
		"Tsunami",
		"Atteins x7 combo",
		"Reach x7 combo",
		"bestCombo",
		7,
		"combo",
	],
	[
		"c5",
		"🚀",
		"Orbital",
		"Orbital",
		"Atteins x10 combo",
		"Reach x10 combo",
		"bestCombo",
		10,
		"combo",
	],
	[
		"c6",
		"🌪️",
		"Tornade",
		"Tornado",
		"Atteins x12 combo",
		"Reach x12 combo",
		"bestCombo",
		12,
		"combo",
	],
	[
		"c7",
		"🔮",
		"Mystique",
		"Mystic",
		"Atteins x15 combo",
		"Reach x15 combo",
		"bestCombo",
		15,
		"combo",
	],
	[
		"c8",
		"👁️",
		"Omniscient",
		"Omniscient",
		"Atteins x20 combo",
		"Reach x20 combo",
		"bestCombo",
		20,
		"combo",
	],
	[
		"c9",
		"🌀",
		"Vortex",
		"Vortex",
		"Atteins x25 combo",
		"Reach x25 combo",
		"bestCombo",
		25,
		"combo",
	],
	[
		"c10",
		"♾️",
		"Infini",
		"Infinite",
		"Atteins x30 combo",
		"Reach x30 combo",
		"bestCombo",
		30,
		"combo",
	],
	// 💰 Pièces (10)
	[
		"m1",
		"💰",
		"Économe",
		"Saver",
		"Gagne 500$",
		"Earn $500",
		"money",
		500,
		"coins",
	],
	[
		"m2",
		"💵",
		"Investisseur",
		"Investor",
		"Gagne 2000$",
		"Earn $2000",
		"money",
		2000,
		"coins",
	],
	[
		"m3",
		"💎",
		"Riche",
		"Rich",
		"Gagne 5000$",
		"Earn $5000",
		"money",
		5000,
		"coins",
	],
	[
		"m4",
		"🤑",
		"Millionnaire",
		"Millionaire",
		"Gagne 10000$",
		"Earn $10000",
		"money",
		10000,
		"coins",
	],
	[
		"m5",
		"🏦",
		"Banquier",
		"Banker",
		"Gagne 25000$",
		"Earn $25000",
		"money",
		25000,
		"coins",
	],
	[
		"m6",
		"👑",
		"Oligarque",
		"Oligarch",
		"Gagne 50000$",
		"Earn $50000",
		"money",
		50000,
		"coins",
	],
	[
		"m7",
		"💫",
		"Tycoon",
		"Tycoon",
		"Gagne 100000$",
		"Earn $100000",
		"money",
		100000,
		"coins",
	],
	[
		"m8",
		"🌟",
		"Financier",
		"Financier",
		"Gagne 250000$",
		"Earn $250000",
		"money",
		250000,
		"coins",
	],
	[
		"m9",
		"🔥",
		"Magnat",
		"Magnate",
		"Gagne 500000$",
		"Earn $500000",
		"money",
		500000,
		"coins",
	],
	[
		"m10",
		"♾️",
		"Sans limites",
		"Limitless",
		"Gagne 1000000$",
		"Earn $1000000",
		"money",
		1000000,
		"coins",
	],
	// 🔧 Shop (10)
	[
		"sh1",
		"🔧",
		"Premier achat",
		"First Buy",
		"Achète une amélioration",
		"Buy an upgrade",
		"totalShopBuys",
		1,
		"shop",
	],
	[
		"sh2",
		"⚙️",
		"Bricoleur",
		"Tinkerer",
		"Achète 3 améliorations",
		"Buy 3 upgrades",
		"totalShopBuys",
		3,
		"shop",
	],
	[
		"sh3",
		"🛠️",
		"Mécanicien",
		"Mechanic",
		"Achète 5 améliorations",
		"Buy 5 upgrades",
		"totalShopBuys",
		5,
		"shop",
	],
	[
		"sh4",
		"🔩",
		"Ingénieur",
		"Engineer",
		"Achète 8 améliorations",
		"Buy 8 upgrades",
		"totalShopBuys",
		8,
		"shop",
	],
	[
		"sh5",
		"🚀",
		"Max Cannon",
		"Max Cannon",
		"Cannon niveau max",
		"Max Cannon level",
		"cannonMax",
		1,
		"shop",
	],
	[
		"sh6",
		"⚡",
		"Max Batterie",
		"Max Battery",
		"Batterie niveau max",
		"Max Battery level",
		"batteryMax",
		1,
		"shop",
	],
	[
		"sh7",
		"🛡️",
		"Max Armure",
		"Max Armor",
		"Armure niveau max",
		"Max Armor level",
		"armorMax",
		1,
		"shop",
	],
	[
		"sh8",
		"💪",
		"Armé jusqu'aux dents",
		"Armed to Teeth",
		"2 catégories au max",
		"2 categories maxed",
		"twoMax",
		1,
		"shop",
	],
	[
		"sh9",
		"🔫",
		"Arsenal complet",
		"Full Arsenal",
		"Toutes catégories au max",
		"All categories maxed",
		"allMax",
		1,
		"shop",
	],
	[
		"sh10",
		"💰",
		"Dépensier",
		"Big Spender",
		"Dépense 2000$",
		"Spend $2000",
		"totalSpent",
		2000,
		"shop",
	],
	// 🎯 Items collectés (10)
	[
		"i1",
		"💙",
		"Boosté",
		"Boosted",
		"Collecte 1 ellipse bleue",
		"Collect 1 blue orb",
		"totalBoosts",
		1,
		"items",
	],
	[
		"i2",
		"⚡",
		"Accéléré",
		"Accelerated",
		"Collecte 10 ellipses",
		"Collect 10 orbs",
		"totalBoosts",
		10,
		"items",
	],
	[
		"i3",
		"🔵",
		"Orbiteur",
		"Orbiter",
		"Collecte 50 ellipses",
		"Collect 50 orbs",
		"totalBoosts",
		50,
		"items",
	],
	[
		"i4",
		"🌀",
		"Tourbillon",
		"Whirlwind",
		"Collecte 100 ellipses",
		"Collect 100 orbs",
		"totalBoosts",
		100,
		"items",
	],
	[
		"i5",
		"⭕",
		"Premier anneau",
		"First Ring",
		"Passe un anneau doré",
		"Pass a ring",
		"totalRings",
		1,
		"items",
	],
	[
		"i6",
		"🥇",
		"Acrobate",
		"Acrobat",
		"Passe 10 anneaux",
		"Pass 10 rings",
		"totalRings",
		10,
		"items",
	],
	[
		"i7",
		"🏅",
		"Gymnaste",
		"Gymnast",
		"Passe 50 anneaux",
		"Pass 50 rings",
		"totalRings",
		50,
		"items",
	],
	[
		"i8",
		"📦",
		"Découvreur",
		"Discoverer",
		"Ouvre 1 coffre",
		"Open 1 chest",
		"totalChests",
		1,
		"items",
	],
	[
		"i9",
		"🎁",
		"Chasseur de trésors",
		"Treasure Hunter",
		"Ouvre 20 coffres",
		"Open 20 chests",
		"totalChests",
		20,
		"items",
	],
	[
		"i10",
		"💎",
		"Indiana Robo",
		"Indiana Robo",
		"Ouvre 100 coffres",
		"Open 100 chests",
		"totalChests",
		100,
		"items",
	],
	// 💀 Ennemis & survie (10)
	[
		"e1",
		"👊",
		"Premier choc",
		"First Impact",
		"Touche 1 ennemi",
		"Hit 1 enemy",
		"totalHits",
		1,
		"enemy",
	],
	[
		"e2",
		"🤕",
		"Résistant",
		"Resilient",
		"Prends 5 chocs",
		"Take 5 hits",
		"totalHits",
		5,
		"enemy",
	],
	[
		"e3",
		"💢",
		"Dur à cuire",
		"Tough Guy",
		"Prends 15 chocs",
		"Take 15 hits",
		"totalHits",
		15,
		"enemy",
	],
	[
		"e4",
		"🔥",
		"Survivant",
		"Survivor",
		"Prends 30 chocs",
		"Take 30 hits",
		"totalHits",
		30,
		"enemy",
	],
	[
		"e5",
		"💥",
		"Invincible",
		"Invincible",
		"Prends 50 chocs",
		"Take 50 hits",
		"totalHits",
		50,
		"enemy",
	],
	[
		"e6",
		"😤",
		"Indestructible",
		"Indestructible",
		"Prends 100 chocs",
		"Take 100 hits",
		"totalHits",
		100,
		"enemy",
	],
	[
		"e7",
		"🏃",
		"Esquiveur",
		"Dodger",
		"Joue 5 parties sans hit",
		"Play 5 games no-hit",
		"perfectGames",
		5,
		"enemy",
	],
	[
		"e8",
		"🦸",
		"Héros",
		"Hero",
		"Joue 10 parties sans hit",
		"Play 10 games no-hit",
		"perfectGames",
		10,
		"enemy",
	],
	[
		"e9",
		"🥷",
		"Ninja",
		"Ninja",
		"Joue 20 parties sans hit",
		"Play 20 games no-hit",
		"perfectGames",
		20,
		"enemy",
	],
	[
		"e10",
		"👻",
		"Fantôme",
		"Ghost",
		"Joue 50 parties sans hit",
		"Play 50 games no-hit",
		"perfectGames",
		50,
		"enemy",
	],
	// 🎮 Parties jouées (10)
	[
		"g1",
		"🎮",
		"Débutant",
		"Beginner",
		"Joue 1 partie",
		"Play 1 game",
		"gamesPlayed",
		1,
		"games",
	],
	[
		"g2",
		"🕹️",
		"Habitué",
		"Regular",
		"Joue 5 parties",
		"Play 5 games",
		"gamesPlayed",
		5,
		"games",
	],
	[
		"g3",
		"🎯",
		"Pratiquant",
		"Practitioner",
		"Joue 10 parties",
		"Play 10 games",
		"gamesPlayed",
		10,
		"games",
	],
	[
		"g4",
		"🎪",
		"Amateur",
		"Amateur",
		"Joue 25 parties",
		"Play 25 games",
		"gamesPlayed",
		25,
		"games",
	],
	[
		"g5",
		"🏋️",
		"Entraîné",
		"Trained",
		"Joue 50 parties",
		"Play 50 games",
		"gamesPlayed",
		50,
		"games",
	],
	[
		"g6",
		"🥋",
		"Expert",
		"Expert",
		"Joue 100 parties",
		"Play 100 games",
		"gamesPlayed",
		100,
		"games",
	],
	[
		"g7",
		"🎖️",
		"Vétéran",
		"Veteran",
		"Joue 200 parties",
		"Play 200 games",
		"gamesPlayed",
		200,
		"games",
	],
	[
		"g8",
		"🏆",
		"Pro",
		"Pro",
		"Joue 500 parties",
		"Play 500 games",
		"gamesPlayed",
		500,
		"games",
	],
	[
		"g9",
		"👑",
		"Maître",
		"Master",
		"Joue 1000 parties",
		"Play 1000 games",
		"gamesPlayed",
		1000,
		"games",
	],
	[
		"g10",
		"🌟",
		"Légende vivante",
		"Living Legend",
		"Joue 2000 parties",
		"Play 2000 games",
		"gamesPlayed",
		2000,
		"games",
	],
	// 🌟 Spéciaux (5)
	[
		"sp1",
		"☄️",
		"Météore évité",
		"Meteor Dodger",
		"Évite un météore",
		"Dodge a meteor",
		"meteorsDodged",
		1,
		"special",
	],
	[
		"sp2",
		"🌧️",
		"Pluie de météores",
		"Meteor Rain",
		"Évite 10 météores",
		"Dodge 10 meteors",
		"meteorsDodged",
		10,
		"special",
	],
	[
		"sp3",
		"🌠",
		"Tempête cosmique",
		"Cosmic Storm",
		"Évite 50 météores",
		"Dodge 50 meteors",
		"meteorsDodged",
		50,
		"special",
	],
	[
		"sp4",
		"🎰",
		"Chanceux",
		"Lucky",
		"Ouvre 3 coffres en une partie",
		"Open 3 chests in one run",
		"chestsOneRun",
		3,
		"special",
	],
	[
		"sp5",
		"🌈",
		"Arc-en-ciel",
		"Rainbow",
		"Collecte tous les types en une partie",
		"Collect all types in one run",
		"allTypesRun",
		1,
		"special",
	],
	[
		"sp6",
		"🔴",
		"Pleine Puissance !",
		"Full Power!",
		"Atteins la vitesse maximale (jauge rouge)",
		"Reach max speed (red gauge)",
		"redZoneCount",
		1,
		"special",
	],
];

// Achievement categories metadata
const ACH_CATS = {
	dist: {
		icon: "🚀",
		fr: "Distance (course)",
		en: "Distance (run)",
	},
	total: {
		icon: "📏",
		fr: "Distance totale",
		en: "Total distance",
	},
	stars: { icon: "⭐", fr: "Étoiles", en: "Stars" },
	combo: { icon: "🔥", fr: "Combos", en: "Combos" },
	coins: { icon: "💰", fr: "Pièces", en: "Coins" },
	shop: { icon: "🔧", fr: "Boutique", en: "Shop" },
	items: { icon: "🎯", fr: "Objets", en: "Items" },
	enemy: { icon: "💀", fr: "Ennemis", en: "Enemies" },
	games: { icon: "🎮", fr: "Parties", en: "Games" },
	special: { icon: "🌟", fr: "Spéciaux", en: "Special" },
};

// ══════════════════════════════════════════
//  BADGES (20)
// ══════════════════════════════════════════
const BADGES = [
	{
		id: "b_dist",
		icon: "✈️",
		name_fr: "Pilote",
		name_en: "Pilot",
		desc_fr: "5 succès Distance",
		desc_en: "5 Distance achievements",
		cat: "dist",
		need: 5,
	},
	{
		id: "b_ace",
		icon: "🚀",
		name_fr: "As de l'air",
		name_en: "Air Ace",
		desc_fr: "10 succès Distance",
		desc_en: "10 Distance achievements",
		cat: "dist",
		need: 10,
	},
	{
		id: "b_legend",
		icon: "🌟",
		name_fr: "Légende",
		name_en: "Legend",
		desc_fr: "15 succès Distance",
		desc_en: "15 Distance achievements",
		cat: "dist",
		need: 15,
	},
	{
		id: "b_road",
		icon: "🛣️",
		name_fr: "Grand routier",
		name_en: "Road Warrior",
		desc_fr: "5 succès Distance totale",
		desc_en: "5 Total distance achievements",
		cat: "total",
		need: 5,
	},
	{
		id: "b_star",
		icon: "⭐",
		name_fr: "Étoile",
		name_en: "Star",
		desc_fr: "5 succès Étoiles",
		desc_en: "5 Stars achievements",
		cat: "stars",
		need: 5,
	},
	{
		id: "b_galaxy",
		icon: "🌌",
		name_fr: "Galaxie",
		name_en: "Galaxy",
		desc_fr: "8 succès Étoiles",
		desc_en: "8 Stars achievements",
		cat: "stars",
		need: 8,
	},
	{
		id: "b_combo",
		icon: "🔥",
		name_fr: "Enflammé",
		name_en: "On Fire",
		desc_fr: "5 succès Combo",
		desc_en: "5 Combo achievements",
		cat: "combo",
		need: 5,
	},
	{
		id: "b_inferno",
		icon: "💫",
		name_fr: "Inferno",
		name_en: "Inferno",
		desc_fr: "8 succès Combo",
		desc_en: "8 Combo achievements",
		cat: "combo",
		need: 8,
	},
	{
		id: "b_rich",
		icon: "💰",
		name_fr: "Riche",
		name_en: "Rich",
		desc_fr: "5 succès Pièces",
		desc_en: "5 Coin achievements",
		cat: "coins",
		need: 5,
	},
	{
		id: "b_craft",
		icon: "🔧",
		name_fr: "Artisan",
		name_en: "Craftsman",
		desc_fr: "5 succès Boutique",
		desc_en: "5 Shop achievements",
		cat: "shop",
		need: 5,
	},
	{
		id: "b_maxed",
		icon: "💪",
		name_fr: "Équipé",
		name_en: "Geared",
		desc_fr: "Arsenal complet débloqué",
		desc_en: "Full arsenal unlocked",
		achId: "sh9",
		need: 1,
	},
	{
		id: "b_item",
		icon: "🎁",
		name_fr: "Collecteur",
		name_en: "Collector",
		desc_fr: "5 succès Objets",
		desc_en: "5 Items achievements",
		cat: "items",
		need: 5,
	},
	{
		id: "b_dodge",
		icon: "🥷",
		name_fr: "Esquiveur",
		name_en: "Dodger",
		desc_fr: "5 succès Ennemis",
		desc_en: "5 Enemy achievements",
		cat: "enemy",
		need: 5,
	},
	[
		"b_survivor",
		"👊",
		"Survivant",
		"Survivor",
		"...will not be used, see array format",
	],
	{
		id: "b_games",
		icon: "🎮",
		name_fr: "Joueur",
		name_en: "Player",
		desc_fr: "5 succès Parties",
		desc_en: "5 Games achievements",
		cat: "games",
		need: 5,
	},
	{
		id: "b_veteran",
		icon: "🎖️",
		name_fr: "Vétéran",
		name_en: "Veteran",
		desc_fr: "8 succès Parties",
		desc_en: "8 Games achievements",
		cat: "games",
		need: 8,
	},
	{
		id: "b_special",
		icon: "🌈",
		name_fr: "Spécialiste",
		name_en: "Specialist",
		desc_fr: "3 succès Spéciaux",
		desc_en: "3 Special achievements",
		cat: "special",
		need: 3,
	},
	{
		id: "b_half",
		icon: "🏅",
		name_fr: "Mi-chemin",
		name_en: "Halfway",
		desc_fr: "50 succès débloqués",
		desc_en: "50 achievements unlocked",
		total: 50,
	},
	{
		id: "b_full",
		icon: "🏆",
		name_fr: "Complétiste",
		name_en: "Completionist",
		desc_fr: "100 succès débloqués",
		desc_en: "100 achievements unlocked",
		total: 100,
	},
	{
		id: "b_ultra",
		icon: "👑",
		name_fr: "Ultra Champion",
		name_en: "Ultra Champion",
		desc_fr: "Tous badges obtenus",
		desc_en: "All badges earned",
		allBadges: 18,
	},
].filter((b) => !Array.isArray(b)); // remove placeholder

// ══════════════════════════════════════════
//  ACHIEVEMENT ENGINE
// ══════════════════════════════════════════
// Per-run tracking
let runHits = 0,
	runChests = 0,
	runBoosts = 0,
	runRings = 0,
	runStars = 0,
	runMeteorsDodged = 0,
	runHasRing = false,
	runHasBoost = false,
	runHasStar = false,
	runHasChest = false,
	runRedZone = false;
let runContinueUsed = false;

let toastQueue = [];
let toastTimer = 0;
function showToast(ach) {
	const lang = sd.lang || "en";
	document.getElementById("toastIcon").textContent = ach[1];
	document.getElementById("toastName").textContent =
		lang === "en" ? ach[3] : ach[2];
	document.getElementById("toastDesc").textContent =
		lang === "en" ? ach[5] : ach[4];
	document.querySelector("#achToast .toast-label").textContent =
		t("newAch");
	const el = document.getElementById("achToast");
	el.classList.add("show");
	toastTimer = 220;
}
function tickToast() {
	if (toastTimer > 0) {
		toastTimer--;
		if (toastTimer === 0) {
			document
				.getElementById("achToast")
				.classList.remove("show");
			setTimeout(() => {
				if (toastQueue.length) {
					showToast(toastQueue.shift());
				}
			}, 500);
		}
	}
}
function queueToast(ach) {
	if (toastTimer > 0 || toastQueue.length > 0)
		toastQueue.push(ach);
	else showToast(ach);
}

function unlockAch(id) {
	if (sd.ach.includes(id)) return false;
	sd.ach.push(id);
	save();
	const ach = ACHS.find((a) => a[0] === id);
	if (ach) queueToast(ach);
	checkBadges();
	gpxHappyMoment();
	return true;
}

function checkAch(event) {
	const vals = {
		dist: distM,
		money: sd.money || 0,
		totalDist: sd.totalDist || 0,
		totalStars: sd.totalStars || 0,
		totalBoosts: sd.totalBoosts || 0,
		totalRings: sd.totalRings || 0,
		totalChests: sd.totalChests || 0,
		totalHits: sd.totalHits || 0,
		totalCoins: sd.totalCoins || 0,
		gamesPlayed: sd.gamesPlayed || 0,
		bestCombo: sd.bestCombo || 0,
		totalShopBuys: sd.totalShopBuys || 0,
		totalSpent: sd.totalSpent || 0,
		cannonMax: sd.up.cannon >= 4 ? 1 : 0,
		batteryMax: sd.up.battery >= 4 ? 1 : 0,
		armorMax: sd.up.armor >= 4 ? 1 : 0,
		twoMax:
			[sd.up.cannon, sd.up.battery, sd.up.armor].filter(
				(v) => v >= 4,
			).length >= 2
				? 1
				: 0,
		allMax:
			sd.up.cannon >= 4 &&
			sd.up.battery >= 4 &&
			sd.up.armor >= 4
				? 1
				: 0,
		meteorsDodged: sd.meteorsDodged || 0,
		perfectGames: sd.perfectGames || 0,
		redZoneCount: sd.redZoneCount || 0,
		chestsOneRun: runChests,
		allTypesRun:
			runHasStar && runHasBoost && runHasRing && runHasChest
				? 1
				: 0,
	};
	ACHS.forEach((a) => {
		if (sd.ach.includes(a[0])) return;
		const v = vals[a[6]];
		if (v !== undefined && v >= a[7]) unlockAch(a[0]);
	});
}

function checkBadges() {
	const achByCat = {};
	sd.ach.forEach((id) => {
		const a = ACHS.find((x) => x[0] === id);
		if (a) achByCat[a[8]] = (achByCat[a[8]] || 0) + 1;
	});
	BADGES.forEach((b) => {
		if (sd.bdg.includes(b.id)) return;
		let earned = false;
		if (b.cat && achByCat[b.cat] >= (b.need || 1))
			earned = true;
		if (b.achId && sd.ach.includes(b.achId)) earned = true;
		if (b.total && sd.ach.length >= b.total) earned = true;
		if (b.allBadges && sd.bdg.length + 1 >= b.allBadges)
			earned = true;
		if (earned) {
			sd.bdg.push(b.id);
			save();
		}
	});
}

function openAch() {
	gs = "ach";
	show("achDiv");
	const lang = sd.lang || "en";
	document.getElementById("achStats").textContent =
		sd.ach.length +
		" " +
		t("unlocked") +
		" " +
		t("of") +
		" " +
		ACHS.length;
	const cont = document.getElementById("achContent");
	cont.innerHTML = "";
	const cats = Object.keys(ACH_CATS);
	cats.forEach((cat) => {
		const meta = ACH_CATS[cat];
		const items = ACHS.filter((a) => a[8] === cat);
		const div = document.createElement("div");
		const catTitle = document.createElement("div");
		catTitle.className = "ach-cat";
		catTitle.textContent =
			meta.icon +
			" " +
			(lang === "en" ? meta.en : meta.fr) +
			" (" +
			items.filter((a) => sd.ach.includes(a[0])).length +
			"/" +
			items.length +
			")";
		div.appendChild(catTitle);
		const grid = document.createElement("div");
		grid.className = "ach-grid";
		items.forEach((a) => {
			const unlocked = sd.ach.includes(a[0]);
			const item = document.createElement("div");
			item.className =
				"ach-item" + (unlocked ? " unlocked" : "");
			item.innerHTML = `<div class="ach-icon">${a[1]}</div><div class="ach-text"><div class="ach-name">${lang === "en" ? a[3] : a[2]}</div><div class="ach-desc">${lang === "en" ? a[5] : a[4]}</div></div>`;
			grid.appendChild(item);
		});
		div.appendChild(grid);
		cont.appendChild(div);
	});
}
window.closeAch = function () {
	hide("achDiv");
	gs = "start";
	gpxOnMenu();
};

function openBdg() {
	gs = "bdg";
	show("bdgDiv");
	const lang = sd.lang || "en";
	document.getElementById("bdgStats").textContent =
		sd.bdg.length +
		" " +
		t("unlocked") +
		" " +
		t("of") +
		" " +
		BADGES.length;
	const grid = document.getElementById("bdgGrid");
	grid.innerHTML = "";
	BADGES.forEach((b) => {
		const earned = sd.bdg.includes(b.id);
		const item = document.createElement("div");
		item.className = "bdg-item" + (earned ? " earned" : "");
		item.innerHTML = `<span class="bdg-icon">${b.icon}</span><div class="bdg-name">${lang === "en" ? b.name_en : b.name_fr}</div>`;
		item.title = lang === "en" ? b.desc_en : b.desc_fr;
		grid.appendChild(item);
	});
}
window.closeBdg = function () {
	hide("bdgDiv");
	gs = "start";
	gpxOnMenu();
};

// ══════════════════════════════════════════
//  TUTORIAL
// ══════════════════════════════════════════
let tutPage = 0;

const TUT_PAGES_FR = [
	{
		title: "🔫  LE LANCEMENT",
		steps: [
			"Le canon oscille automatiquement",
			"Appuie au bon moment pour lancer",
			"Plus l'angle est plat → plus tu vas loin",
			"Tu ne peux lancer qu'une fois par partie",
		],
		draw(cx, cy, sc) {
			// Animated cannon diagram
			const a =
				-Math.PI * 0.35 +
				Math.sin(Date.now() * 0.0015) * 0.28;
			ctx.save();
			ctx.translate(cx - sc * 30, cy);
			// base
			ctx.fillStyle = "#1a3a6a";
			ctx.beginPath();
			ctx.roundRect(
				-sc * 22,
				-sc * 6,
				sc * 44,
				sc * 12,
				sc * 2,
			);
			ctx.fill();
			// barrel
			ctx.rotate(a);
			ctx.fillStyle = "#2255cc";
			ctx.beginPath();
			ctx.roundRect(
				sc * 2,
				-sc * 5,
				sc * 36,
				sc * 10,
				sc * 2,
			);
			ctx.fill();
			// trajectory dots
			ctx.restore();
			let wx = cx - sc * 30 + Math.cos(a) * sc * 40,
				wy = cy + Math.sin(a) * sc * 40;
			let dvx = Math.cos(a) * sc * 5,
				dvy = Math.sin(a) * sc * 5;
			ctx.fillStyle = "rgba(136,170,255,0.7)";
			for (let i = 0; i < 12; i++) {
				dvy += sc * 0.18;
				dvx *= 0.998;
				wx += dvx;
				wy += dvy;
				if (wy > cy + sc * 60) break;
				const r = Math.max(
					sc * 0.5,
					sc * 2.2 - i * sc * 0.15,
				);
				ctx.beginPath();
				ctx.arc(wx, wy, r * (1 - i / 16), 0, Math.PI * 2);
				ctx.globalAlpha = 0.7 - i * 0.05;
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			// pulse ring at tip
			const px = cx - sc * 30 + Math.cos(a) * sc * 40,
				py = cy + Math.sin(a) * sc * 40;
			const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
			ctx.strokeStyle = `rgba(100,200,255,${pulse})`;
			ctx.lineWidth = sc * 1.5;
			ctx.beginPath();
			ctx.arc(px, py, sc * 8 * pulse, 0, Math.PI * 2);
			ctx.stroke();
		},
	},
	{
		title: "⚡  LE JETPACK",
		steps: [
			"Maintiens appuyé / touche pour activer",
			"Le robot monte et accélère légèrement",
			"La jauge orange en bas = carburant",
			"Les ennemis drainent 30% du carburant",
		],
		draw(cx, cy, sc) {
			// Robot with jetpack flames
			ctx.save();
			ctx.translate(cx, cy);
			const r = sc * 14;
			// robot body
			const bg = ctx.createRadialGradient(
				-r * 0.1,
				-r * 0.1,
				r * 0.1,
				0,
				0,
				r,
			);
			const _sk = ROBOT_SKINS[sd.activeSkin||0];
			bg.addColorStop(0, _sk.c1);
			bg.addColorStop(0.65, _sk.c2);
			bg.addColorStop(1, _sk.c3);
			ctx.fillStyle = bg;
			ctx.shadowColor = "#ffaa00";
			ctx.shadowBlur = sc * 8;
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
			// jet pack
			ctx.fillStyle = "#1a44bb";
			ctx.beginPath();
			ctx.roundRect(
				-r - sc * 7,
				-sc * 6,
				sc * 8,
				sc * 12,
				sc * 2,
			);
			ctx.fill();
			// animated flames
			const t2 = Date.now() * 0.01;
			const fl = sc * (6 + Math.sin(t2) * 3);
			ctx.fillStyle = "rgba(255,140,0,.9)";
			ctx.beginPath();
			ctx.moveTo(-r - sc * 3, -sc * 4);
			ctx.lineTo(-r - sc * 3 - fl, 0);
			ctx.lineTo(-r - sc * 3, sc * 4);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = "rgba(255,230,80,.75)";
			ctx.beginPath();
			ctx.moveTo(-r - sc * 3, -sc * 2.5);
			ctx.lineTo(-r - sc * 3 - fl * 0.6, 0);
			ctx.lineTo(-r - sc * 3, sc * 2.5);
			ctx.closePath();
			ctx.fill();
			// arrow up
			ctx.restore();
			ctx.fillStyle = "rgba(100,200,255,.7)";
			ctx.font = `bold ${sc * 18}px monospace`;
			ctx.textAlign = "center";
			ctx.fillText("↑", cx + sc * 28, cy + sc * 6);
			// fuel bar
			ctx.fillStyle = "rgba(0,0,0,.5)";
			ctx.fillRect(
				cx - sc * 40,
				cy + sc * 26,
				sc * 80,
				sc * 8,
			);
			const fuelPct =
				0.55 + Math.sin(Date.now() * 0.002) * 0.2;
			const fg = ctx.createLinearGradient(
				cx - sc * 40,
				0,
				cx + sc * 40,
				0,
			);
			fg.addColorStop(0, "#ff8800");
			fg.addColorStop(1, "#ffe000");
			ctx.fillStyle = fg;
			ctx.fillRect(
				cx - sc * 40,
				cy + sc * 26,
				sc * 80 * fuelPct,
				sc * 8,
			);
			ctx.strokeStyle = "#554";
			ctx.lineWidth = sc;
			ctx.strokeRect(
				cx - sc * 40,
				cy + sc * 26,
				sc * 80,
				sc * 8,
			);
			ctx.fillStyle = "#ffcc44";
			ctx.font = `${sc * 6}px monospace`;
			ctx.fillText("⚡ JETPACK", cx, cy + sc * 42);
		},
	},
	{
		title: "🎯  LES COLLECTIBLES",
		steps: [
			"★ Étoile → +15 pièces (combo = plus)",
			"💙 Ellipse bleue → vitesse + carburant",
			"⭕ Anneau doré → +50 pièces (double combo)",
			"📦 Coffre → bouclier, fuel, pièces aléatoire",
		],
		draw(cx, cy, sc) {
			// Draw 4 items side by side
			const items = [
				() => {
					ctx.fillStyle = "#ffe000";
					ctx.shadowColor = "#ffcc00";
					ctx.shadowBlur = sc * 8;
					ctx.font = `${sc * 20}px monospace`;
					ctx.textAlign = "center";
					ctx.fillText("★", 0, sc * 8);
					ctx.shadowBlur = 0;
				},
				() => {
					const g = ctx.createRadialGradient(
						0,
						0,
						sc * 2,
						0,
						0,
						sc * 12,
					);
					g.addColorStop(0, "rgba(180,230,255,.95)");
					g.addColorStop(0.4, "rgba(50,140,255,.88)");
					g.addColorStop(1, "rgba(10,60,180,.7)");
					ctx.fillStyle = g;
					ctx.shadowColor = "#44aaff";
					ctx.shadowBlur = sc * 10;
					ctx.beginPath();
					ctx.ellipse(
						0,
						0,
						sc * 14,
						sc * 8,
						0,
						0,
						Math.PI * 2,
					);
					ctx.fill();
					ctx.shadowBlur = 0;
					ctx.fillStyle = "rgba(255,255,255,.9)";
					ctx.font = `${sc * 10}px monospace`;
					ctx.fillText("⚡", 0, sc * 4);
				},
				() => {
					ctx.strokeStyle = "#ffaa00";
					ctx.shadowColor = "#ffdd00";
					ctx.shadowBlur = sc * 8;
					ctx.lineWidth = sc * 3;
					ctx.beginPath();
					ctx.arc(0, 0, sc * 12, 0, Math.PI * 2);
					ctx.stroke();
					ctx.shadowBlur = 0;
					ctx.fillStyle = "#ffee44";
					ctx.font = `${sc * 14}px monospace`;
					ctx.fillText("★", 0, sc * 5);
				},
				() => {
					const bw = sc * 22,
						bh = sc * 18;
					ctx.fillStyle = "#a06008";
					ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
					ctx.fillStyle = "#c88010";
					ctx.fillRect(-bw / 2, -bh / 2, bw, bh * 0.4);
					ctx.strokeStyle = "#5a3000";
					ctx.lineWidth = sc;
					ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
					ctx.fillStyle = "rgba(255,220,0,.9)";
					ctx.font = `${sc * 12}px monospace`;
					ctx.textAlign = "center";
					ctx.fillText("?", 0, sc * 6);
				},
			];
			const xs = [
				cx - sc * 50,
				cx - sc * 17,
				cx + sc * 17,
				cx + sc * 50,
			];
			items.forEach((fn, i) => {
				ctx.save();
				ctx.translate(xs[i], cy);
				fn();
				ctx.restore();
			});
		},
	},
	{
		title: "💀  LES ENNEMIS",
		steps: [
			"🦇 Chauve-souris → ondule verticalement",
			"🟢 Orbe vert → trajectoire sinusoïdale",
			"🔴 Drone → mouvement rapide et erratique",
			"☄️ Météore → tombe depuis le ciel. Évite !",
		],
		draw(cx, cy, sc) {
			ctx.save();
			// bat
			ctx.translate(cx - sc * 52, cy - sc * 4);
			ctx.fillStyle = "#442266";
			ctx.shadowColor = "#8800cc";
			ctx.shadowBlur = sc * 8;
			ctx.beginPath();
			ctx.arc(0, 0, sc * 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
			// wings
			ctx.fillStyle = "rgba(100,40,160,.7)";
			[[-1, 1]].forEach(([dx]) => {
				ctx.beginPath();
				ctx.moveTo(0, -sc * 3);
				ctx.quadraticCurveTo(
					sc * 14 * dx,
					-sc * 14,
					sc * 20 * dx,
					-sc * 3,
				);
				ctx.quadraticCurveTo(
					sc * 14 * dx,
					sc * 4,
					0,
					sc * 3,
				);
				ctx.closePath();
				ctx.fill();
			});
			// orb
			ctx.restore();
			ctx.save();
			ctx.translate(cx - sc * 16, cy + sc * 4);
			const g2 = ctx.createRadialGradient(
				0,
				0,
				sc * 2,
				0,
				0,
				sc * 10,
			);
			g2.addColorStop(0, "#aaffcc");
			g2.addColorStop(0.5, "#22bb55");
			g2.addColorStop(1, "#0a5520");
			ctx.fillStyle = g2;
			ctx.shadowColor = "#33ff88";
			ctx.shadowBlur = sc * 10;
			ctx.beginPath();
			ctx.arc(0, 0, sc * 10, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
			// drone
			ctx.restore();
			ctx.save();
			ctx.translate(cx + sc * 20, cy - sc * 4);
			ctx.fillStyle = "#cc2200";
			ctx.shadowColor = "#ff4400";
			ctx.shadowBlur = sc * 8;
			ctx.beginPath();
			ctx.arc(0, 0, sc * 8, 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "rgba(255,100,40,.5)";
			ctx.lineWidth = sc * 1.5;
			[[0.6], [0.3]].forEach(([rs]) => {
				ctx.beginPath();
				ctx.arc(0, 0, sc * 8 * rs, 0, Math.PI * 2);
				ctx.stroke();
			});
			ctx.shadowBlur = 0;
			// meteor
			ctx.restore();
			ctx.save();
			ctx.translate(cx + sc * 52, cy);
			ctx.fillStyle = "#884400";
			const mg = ctx.createRadialGradient(
				0,
				0,
				sc * 2,
				0,
				0,
				sc * 11,
			);
			mg.addColorStop(0, "#ffcc00");
			mg.addColorStop(0.5, "#ff6600");
			mg.addColorStop(1, "#aa1100");
			ctx.fillStyle = mg;
			ctx.shadowColor = "#ff4400";
			ctx.shadowBlur = sc * 8;
			ctx.beginPath();
			ctx.arc(0, 0, sc * 11, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
			// warning line
			ctx.strokeStyle = "rgba(255,50,0,.5)";
			ctx.setLineDash([sc * 3, sc * 3]);
			ctx.lineWidth = sc;
			ctx.beginPath();
			ctx.moveTo(0, -sc * 28);
			ctx.lineTo(0, -sc * 15);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = "#ff2200";
			ctx.font = `${sc * 10}px monospace`;
			ctx.textAlign = "center";
			ctx.fillText("⚠", 0, -sc * 30);
			ctx.restore();
		},
	},
	{
		title: "🔥  COMBO & BOUTIQUE",
		steps: [
			"Collecte plusieurs items à la suite = COMBO",
			"Le multiplicateur monte jusqu'à ×5 max",
			"Dépense tes pièces en boutique (⚙)",
			"Canon + Batterie + Armure → vole plus loin",
		],
		draw(cx, cy, sc) {
			// combo multiplier display
			ctx.save();
			ctx.translate(cx, cy - sc * 10);
			["×1", "×2", "×3", "×4", "×5"].forEach((lbl, i) => {
				const cols = [
					"#888",
					"#ffe000",
					"#ffaa00",
					"#ff6600",
					"#ff2200",
				];
				const active = i <= 3;
				const s = active ? 1.1 + i * 0.08 : 0.7;
				ctx.save();
				ctx.translate((i - 2) * sc * 22, 0);
				ctx.scale(s, s);
				ctx.fillStyle = active ? cols[i] : "#333";
				ctx.shadowColor = cols[i];
				ctx.shadowBlur = active ? sc * 6 : 0;
				ctx.font = `bold ${sc * 11}px monospace`;
				ctx.textAlign = "center";
				ctx.fillText(lbl, 0, 0);
				ctx.shadowBlur = 0;
				ctx.restore();
			});
			ctx.restore();
			// combo bar animated
			const barW = sc * 100;
			const pct = 0.6 + Math.sin(Date.now() * 0.002) * 0.2;
			ctx.fillStyle = "rgba(0,0,0,.5)";
			ctx.fillRect(cx - barW / 2, cy + sc * 14, barW, sc * 6);
			ctx.fillStyle = "#ff6600";
			ctx.fillRect(
				cx - barW / 2,
				cy + sc * 14,
				barW * pct,
				sc * 6,
			);
			ctx.fillStyle = "#aa3300";
			ctx.font = `${sc * 6}px monospace`;
			ctx.textAlign = "center";
			ctx.fillText("TIMER COMBO", cx, cy + sc * 26);
			// shop icons
			const icons = ["🔫", "⚡", "🛡️"];
			icons.forEach((ic, i) => {
				ctx.save();
				ctx.translate(cx + (i - 1) * sc * 28, cy + sc * 44);
				ctx.fillStyle = "rgba(0,0,0,.4)";
				ctx.beginPath();
				ctx.roundRect(
					-sc * 10,
					-sc * 10,
					sc * 20,
					sc * 20,
					sc * 3,
				);
				ctx.fill();
				ctx.strokeStyle = "#2244aa";
				ctx.lineWidth = sc;
				ctx.stroke();
				ctx.font = `${sc * 14}px monospace`;
				ctx.textAlign = "center";
				ctx.fillText(ic, 0, sc * 5);
				ctx.restore();
			});
		},
	},
];
const TUT_PAGES_EN = [
	{
		title: "🔫  LAUNCHING",
		steps: [
			"The cannon swings automatically",
			"Tap at the right moment to launch",
			"Flatter angle = longer distance",
			"You only get one launch per run",
		],
		draw: TUT_PAGES_FR[0].draw,
	},
	{
		title: "⚡  JETPACK",
		steps: [
			"Hold tap/space to activate",
			"Robot rises and accelerates slightly",
			"Orange bar at bottom = fuel",
			"Enemy hit = lose 30% fuel",
		],
		draw: TUT_PAGES_FR[1].draw,
	},
	{
		title: "🎯  COLLECTIBLES",
		steps: [
			"★ Star → +15 coins (more with combo)",
			"💙 Blue orb → speed + fuel boost",
			"⭕ Gold ring → +50 coins (double combo)",
			"📦 Chest → random reward",
		],
		draw: TUT_PAGES_FR[2].draw,
	},
	{
		title: "💀  ENEMIES",
		steps: [
			"🦇 Bat → wavy vertical movement",
			"🟢 Green orb → sinusoidal path",
			"🔴 Drone → fast erratic movement",
			"☄️ Meteor → falls from sky. Dodge it!",
		],
		draw: TUT_PAGES_FR[3].draw,
	},
	{
		title: "🔥  COMBO & SHOP",
		steps: [
			"Collect items in a row = COMBO",
			"Multiplier goes up to ×5 max",
			"Spend coins in the shop (⚙)",
			"Cannon + Battery + Armor → fly farther",
		],
		draw: TUT_PAGES_FR[4].draw,
	},
];

function getTutPages() {
	return (sd.lang || "en") === "en" ? TUT_PAGES_EN : TUT_PAGES_FR;
}

function openTutorial() {
	gs = "tutorial";
	tutPage = 0;
}
window.openTutorial = openTutorial;

function drawTutorial() {
	drawBg();
	const pages = getTutPages();
	const pg = pages[tutPage];
	// Panel
	const pw = p(340),
		ph = p(270),
		bx = W / 2 - pw / 2,
		by = H / 2 - ph / 2;
	ctx.fillStyle = "rgba(4,8,24,.93)";
	ctx.beginPath();
	ctx.roundRect(bx, by, pw, ph, p(10));
	ctx.fill();
	ctx.strokeStyle = "#1e3888";
	ctx.lineWidth = p(2);
	ctx.stroke();

	// ── Title bar ─────────────────────────────────────────────────
	ctx.fillStyle = "rgba(0,0,20,.6)";
	ctx.beginPath();
	ctx.roundRect(bx + p(8), by + p(8), pw - p(16), p(26), p(4));
	ctx.fill();
	ctx.fillStyle = "#ffe060";
	ctx.shadowColor = "#ff8800";
	ctx.shadowBlur = p(6);
	ctx.font = `bold ${p(11)}px monospace`;
	ctx.textAlign = "center";
	ctx.fillText(pg.title, W / 2, by + p(25));
	ctx.shadowBlur = 0;

	// ── Illustration zone (top half, clipped) ─────────────────────
	const illuY = by + p(42),
		illuH = p(90),
		illuX = W / 2;
	ctx.save();
	ctx.fillStyle = "rgba(0,0,0,.25)";
	ctx.beginPath();
	ctx.roundRect(bx + p(8), illuY, pw - p(16), illuH, p(4));
	ctx.fill();
	// Clip to illustration box so drawings can't escape
	ctx.beginPath();
	ctx.roundRect(bx + p(8), illuY, pw - p(16), illuH, p(4));
	ctx.clip();
	pg.draw(illuX, illuY + illuH / 2, SC * 0.72);
	ctx.restore();

	// ── Steps list (bottom half) ───────────────────────────────────
	const listY = illuY + illuH + p(6),
		lineH = p(20);
	pg.steps.forEach((step, i) => {
		const ry = listY + i * lineH;
		ctx.fillStyle =
			i % 2 === 0
				? "rgba(255,255,255,.05)"
				: "rgba(255,255,255,.02)";
		ctx.fillRect(bx + p(8), ry, pw - p(16), lineH);
		// Number
		ctx.fillStyle = "#4488ff";
		ctx.font = `bold ${p(8)}px monospace`;
		ctx.textAlign = "left";
		ctx.fillText(i + 1 + ".", bx + p(13), ry + lineH * 0.68);
		// Text — wrap if needed
		ctx.fillStyle = "#ccddf0";
		ctx.font = `${p(8)}px monospace`;
		ctx.fillText(step, bx + p(26), ry + lineH * 0.68);
	});

	// ── Page indicator: "2 / 5" text + dots ──────────────────────
	const dotsY = by + ph - p(28);
	// n/total text above dots
	ctx.fillStyle = "rgba(180,200,255,0.6)";
	ctx.font = `${p(7)}px monospace`;
	ctx.textAlign = "center";
	ctx.fillText(
		tutPage + 1 + " / " + pages.length,
		W / 2,
		dotsY - p(10),
	);
	// dots
	pages.forEach((_, i) => {
		const active = i === tutPage;
		ctx.fillStyle = active ? "#4488ff" : "#2a3a5a";
		ctx.shadowColor = active ? "#4488ff" : "transparent";
		ctx.shadowBlur = active ? p(4) : 0;
		ctx.beginPath();
		ctx.arc(
			W / 2 + (i - 2) * p(12),
			dotsY,
			p(active ? 3.5 : 2),
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.shadowBlur = 0;
	});

	// ── Nav buttons ────────────────────────────────────────────────
	const isLast = tutPage === pages.length - 1;
	const btnY = by + ph - p(22),
		btnH = p(18);
	if (tutPage > 0) {
		ctx.fillStyle = "rgba(0,0,0,.5)";
		ctx.beginPath();
		ctx.roundRect(bx + p(10), btnY, p(80), btnH, p(3));
		ctx.fill();
		ctx.strokeStyle = "#334";
		ctx.lineWidth = p(1);
		ctx.stroke();
		ctx.fillStyle = "#778";
		ctx.font = `bold ${p(8)}px monospace`;
		ctx.textAlign = "center";
		ctx.fillText(
			"← " + t("back"),
			bx + p(10) + p(40),
			btnY + btnH * 0.68,
		);
	}
	const nextBg = isLast
		? "rgba(20,80,30,.85)"
		: "rgba(20,40,100,.85)";
	const nextBr = isLast ? "#2a7a35" : "#2a4aaa";
	const nextCol = isLast ? "#88ff88" : "#88ccff";
	ctx.fillStyle = nextBg;
	ctx.beginPath();
	ctx.roundRect(bx + pw - p(10) - p(90), btnY, p(90), btnH, p(3));
	ctx.fill();
	ctx.strokeStyle = nextBr;
	ctx.lineWidth = p(1.5);
	ctx.stroke();
	ctx.fillStyle = nextCol;
	ctx.font = `bold ${p(8)}px monospace`;
	ctx.textAlign = "center";
	ctx.fillText(
		isLast ? t("tutDone") : t("tutNext"),
		bx + pw - p(10) - p(45),
		btnY + btnH * 0.68,
	);

	// Close × top-right
	ctx.fillStyle = "rgba(255,255,255,.3)";
	ctx.font = `bold ${p(10)}px monospace`;
	ctx.fillText("✕", bx + pw - p(12), by + p(20));
}
// ══════════════════════════════════════════
//  DAILY CHALLENGES
// ══════════════════════════════════════════
const DC_POOL = [
	{
		id: "dc_dist_200",
		fr: "Vole 200m en une partie",
		en: "Fly 200m in one run",
		type: "dist",
		val: 200,
		reward: 30,
		icon: "🚀",
	},
	{
		id: "dc_dist_500",
		fr: "Vole 500m en une partie",
		en: "Fly 500m in one run",
		type: "dist",
		val: 500,
		reward: 60,
		icon: "✈️",
	},
	{
		id: "dc_dist_1000",
		fr: "Vole 1000m en une partie",
		en: "Fly 1000m in one run",
		type: "dist",
		val: 1000,
		reward: 120,
		icon: "🌆",
	},
	{
		id: "dc_dist_2000",
		fr: "Atteins 2000m en une partie",
		en: "Reach 2000m in one run",
		type: "dist",
		val: 2000,
		reward: 200,
		icon: "🌌",
	},
	{
		id: "dc_dist_3000",
		fr: "Atteins 3000m en une partie",
		en: "Reach 3000m in one run",
		type: "dist",
		val: 3000,
		reward: 280,
		icon: "🌠",
	},
	{
		id: "dc_stars_10",
		fr: "Collecte 10 étoiles",
		en: "Collect 10 stars",
		type: "runStars",
		val: 10,
		reward: 25,
		icon: "⭐",
	},
	{
		id: "dc_stars_25",
		fr: "Collecte 25 étoiles",
		en: "Collect 25 stars",
		type: "runStars",
		val: 25,
		reward: 50,
		icon: "🌟",
	},
	{
		id: "dc_stars_50",
		fr: "Collecte 50 étoiles en une partie",
		en: "Collect 50 stars in one run",
		type: "runStars",
		val: 50,
		reward: 90,
		icon: "✨",
	},
	{
		id: "dc_boost_3",
		fr: "Ramasse 3 ellipses bleues",
		en: "Pick up 3 blue orbs",
		type: "runBoosts",
		val: 3,
		reward: 35,
		icon: "💙",
	},
	{
		id: "dc_boost_6",
		fr: "Ramasse 6 ellipses bleues",
		en: "Pick up 6 blue orbs",
		type: "runBoosts",
		val: 6,
		reward: 70,
		icon: "⚡",
	},
	{
		id: "dc_ring_2",
		fr: "Passe 2 anneaux dorés",
		en: "Pass 2 gold rings",
		type: "runRings",
		val: 2,
		reward: 40,
		icon: "⭕",
	},
	{
		id: "dc_ring_5",
		fr: "Passe 5 anneaux dorés",
		en: "Pass 5 gold rings",
		type: "runRings",
		val: 5,
		reward: 90,
		icon: "🥇",
	},
	{
		id: "dc_chest_1",
		fr: "Ouvre 1 coffre mystère",
		en: "Open 1 mystery chest",
		type: "runChests",
		val: 1,
		reward: 30,
		icon: "📦",
	},
	{
		id: "dc_chest_3",
		fr: "Ouvre 3 coffres mystères",
		en: "Open 3 mystery chests",
		type: "runChests",
		val: 3,
		reward: 80,
		icon: "🎁",
	},
	{
		id: "dc_nohit",
		fr: "Vole sans toucher d'ennemi",
		en: "Fly without hitting any enemy",
		type: "runHits",
		val: 0,
		reward: 100,
		icon: "🥷",
	},
	{
		id: "dc_combo_3",
		fr: "Atteins un combo ×3",
		en: "Reach a ×3 combo",
		type: "bestComboRun",
		val: 3,
		reward: 30,
		icon: "🔥",
	},
	{
		id: "dc_combo_5",
		fr: "Atteins un combo ×5",
		en: "Reach a ×5 combo",
		type: "bestComboRun",
		val: 5,
		reward: 60,
		icon: "💥",
	},
	{
		id: "dc_combo_8",
		fr: "Atteins un combo ×8",
		en: "Reach a ×8 combo",
		type: "bestComboRun",
		val: 8,
		reward: 100,
		icon: "🌀",
	},
	{
		id: "dc_meteor_3",
		fr: "Évite 3 météores",
		en: "Dodge 3 meteors",
		type: "runMeteorsDodged",
		val: 3,
		reward: 50,
		icon: "☄️",
	},
	{
		id: "dc_meteor_8",
		fr: "Évite 8 météores",
		en: "Dodge 8 meteors",
		type: "runMeteorsDodged",
		val: 8,
		reward: 100,
		icon: "🌧️",
	},
	{
		id: "dc_biome2",
		fr: "Atteins le décor Désert (2000m)",
		en: "Reach Desert biome (2000m)",
		type: "dist",
		val: 2000,
		reward: 80,
		icon: "🏜️",
	},
	{
		id: "dc_biome3",
		fr: "Atteins la Jungle (4000m)",
		en: "Reach Jungle biome (4000m)",
		type: "dist",
		val: 4000,
		reward: 140,
		icon: "🌿",
	},
	{
		id: "dc_play_3",
		fr: "Joue 3 parties aujourd'hui",
		en: "Play 3 games today",
		type: "gamesPlayedToday",
		val: 3,
		reward: 40,
		icon: "🎮",
	},
	{
		id: "dc_play_5",
		fr: "Joue 5 parties aujourd'hui",
		en: "Play 5 games today",
		type: "gamesPlayedToday",
		val: 5,
		reward: 70,
		icon: "🕹️",
	},
	{
		id: "dc_no_jetpack",
		fr: "Vole 300m sans jetpack",
		en: "Fly 300m without jetpack",
		type: "distNoJet",
		val: 300,
		reward: 120,
		icon: "🚫",
	},
	{
		id: "dc_coins_run",
		fr: "Gagne 100 étoiles en une partie",
		en: "Earn 100 stars in one run",
		type: "runStars",
		val: 100,
		reward: 100,
		icon: "💎",
	},
];

// ── Skins robot ────────────────────────────────────────────────
const ROBOT_SKINS = [
	{ id:0, fr:"Classique",  en:"Classic",     c1:"#ffe060",c2:"#ffaa00",c3:"#cc7700", req:0  },
	{ id:1, fr:"Glace Bleue",en:"Ice Blue",    c1:"#88eeff",c2:"#2299cc",c3:"#115577", req:5  },
	{ id:2, fr:"Robot Feu",  en:"Fire Robot",  c1:"#ff8844",c2:"#ff2200",c3:"#880000", req:15 },
	{ id:3, fr:"Néon Vert",  en:"Neon Green",  c1:"#aaffaa",c2:"#22cc00",c3:"#005500", req:30 },
	{ id:4, fr:"Galaxie",    en:"Galaxy",      c1:"#dd88ff",c2:"#8800cc",c3:"#220044", req:50 },
];
const TRAIL_COLORS = [
	{ id:0, fr:"Bleu",       en:"Blue",    col:"#4499ff", req:0  },
	{ id:1, fr:"Feu Orange", en:"Fire",    col:"#ff6600", req:8  },
	{ id:2, fr:"Rose Élec.", en:"Pink",    col:"#ff44cc", req:20 },
	{ id:3, fr:"Or Doré",    en:"Gold",    col:"#ffdd00", req:35 },
];
window.selectSkin = function(id) {
	sd.activeSkin = id; save();
	window.openDC && window.openDC();
};
window.selectTrail = function(id) {
	sd.activeTrail = id; save();
	window.openDC && window.openDC();
};
function getDailyKey() {
	const d = new Date();
	return (
		d.getFullYear() +
		"-" +
		(d.getMonth() + 1).toString().padStart(2, "0") +
		"-" +
		d.getDate().toString().padStart(2, "0")
	);
}
function getDailyChallenges() {
	const key = getDailyKey();
	if (sd.dcKey === key && sd.dcIds && sd.dcIds.length === 3)
		return sd.dcIds
			.map((id) => DC_POOL.find((c) => c.id === id))
			.filter(Boolean);
	let seed = 0;
	for (let i = 0; i < key.length; i++)
		seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
	const rng = () => {
		seed = (seed * 1664525 + 1013904223) >>> 0;
		return seed / 0xffffffff;
	};
	const sh = [...DC_POOL].sort(() => rng() - 0.5);
	// Pick 3 from distinct thirds for diversity
	const picks = [
		sh[0],
		sh[Math.floor(sh.length / 3)],
		sh[Math.floor((sh.length * 2) / 3)],
	];
	sd.dcKey = key;
	sd.dcIds = picks.map((c) => c.id);
	if (!sd.dcDone) sd.dcDone = {};
	save();
	return picks;
}
let gamesPlayedToday = 0;
let runDistNoJet = 0; // longest stretch without jetpack in current run
let jetWasOn = false;
let flyHintFrames = 0; // affiche le message "touche l'écran / espace" au lancement
let orbHintFrames = 0; // affiche le message "collecte les orbes bleues" ensuite
let orbHintPending = false;
let runMaxDistNoJet = 0,
	distNoJetStart = 0;

function checkDailyChallenges() {
	const challenges = getDailyChallenges();
	const key = getDailyKey();
	if (!sd.dcDone) sd.dcDone = {};
	if (!sd.dcDone[key]) sd.dcDone[key] = [];
	const vals = {
		dist: distM,
		runStars,
		runBoosts,
		runRings,
		runChests,
		runHits,
		runMeteorsDodged,
		gamesPlayedToday,
		bestComboRun: comboMax,
		distNoJet: runMaxDistNoJet,
	};
	challenges.forEach((ch) => {
		if (sd.dcDone[key].includes(ch.id)) return;
		const v = vals[ch.type] ?? 0;
		const done = ch.type === "runHits" ? v === 0 : v >= ch.val;
		if (done) {
			sd.dcDone[key].push(ch.id);
			sd.money += ch.reward;
			sd.totalCoins = (sd.totalCoins || 0) + ch.reward;
			sd.dcTotalDone = (sd.dcTotalDone || 0) + 1;
			const lang = sd.lang || "en";
			const _dt = sd.dcTotalDone;
			const _ns = ROBOT_SKINS.find(s => s.req === _dt);
			if (_ns) queueToast({0:"🎨",1:"🎨",2:"SKIN DÉBLOQUÉ !",3:"SKIN UNLOCKED!",4:(lang==="fr"?_ns.fr:_ns.en),5:"Sélectionne dans Défis"});
			const _nt = TRAIL_COLORS.find(t => t.req === _dt);
			if (_nt) queueToast({0:"✨",1:"✨",2:"TRAÎNÉE DÉBLOQUÉE !",3:"TRAIL UNLOCKED!",4:_nt.fr,5:"Sélectionne dans Défis"});
			save();
			queueToast({
				0: ch.icon,
				1: ch.icon,
				2: "DÉFI DU JOUR !",
				3: "DAILY CHALLENGE!",
				4: lang === "en" ? ch.en : ch.fr,
				5: "+" + ch.reward + " $",
			});
		}
	});
}

function openDC() {
	gs = "dc";
	show("dcDiv");
	const lang = sd.lang || "en";
	const chs = getDailyChallenges();
	const key = getDailyKey();
	const done = (sd.dcDone && sd.dcDone[key]) || [];
	document.getElementById("dcTitle").textContent =
		"📅 " + (lang === "en" ? "DAILY CHALLENGES" : "DÉFIS DU JOUR");
	document.getElementById("dcDate").textContent = getDailyKey();
	const cont = document.getElementById("dcContent");
	cont.innerHTML = "";
	chs.forEach((ch) => {
		const isDone = done.includes(ch.id);
		const row = document.createElement("div");
		row.className = "dc-row" + (isDone ? " dc-done" : "");
		row.innerHTML = `<span class="dc-icon">${ch.icon}</span><div class="dc-info"><div class="dc-name">${lang === "en" ? ch.en : ch.fr}</div><div class="dc-reward">💰 +${ch.reward} $</div></div><div class="dc-check">${isDone ? "✓" : ""}</div>`;
		cont.appendChild(row);
	});
	// ── Sélecteur cosmétiques ──────────────────────────────────
	const totalDone = sd.dcTotalDone || 0;
	const cosmEl = document.getElementById("dcCosm");
	cosmEl.innerHTML = `<div class="dc-section-hdr">🎨 ${lang === "en" ? "COSMETICS" : "COSMÉTIQUES"} — ${totalDone} ${lang === "en" ? "challenges completed" : "défis complétés"}</div>`;
	const skinDiv = document.createElement("div");
	skinDiv.innerHTML = `<div style="font-size:9px;color:#88aacc;margin:6px 0 3px">${lang==="fr"?"SKINS ROBOT :":"ROBOT SKINS:"}</div>`;
	ROBOT_SKINS.forEach(sk => {
		const unlocked = totalDone >= sk.req;
		const active = (sd.activeSkin||0) === sk.id;
		const btn = document.createElement("button");
		btn.className = "cosm-btn";
		btn.style.cssText = `background:${unlocked?(active?sk.c2+"99":sk.c2+"33"):"#111"};border-color:${unlocked?sk.c2:"#333"};color:${unlocked?sk.c1:"#444"};font-weight:${active?"bold":"normal"}`;
		btn.textContent = (unlocked?"":"🔒")+(lang==="fr"?sk.fr:sk.en)+(unlocked?"":" ("+sk.req+")");
		btn.disabled = !unlocked;
		if (unlocked) btn.onclick = () => selectSkin(sk.id);
		skinDiv.appendChild(btn);
	});
	cosmEl.appendChild(skinDiv);
	const trailDiv = document.createElement("div");
	trailDiv.innerHTML = `<div style="font-size:9px;color:#88aacc;margin:8px 0 3px">${lang==="fr"?"TRAÎNÉES :":"TRAILS:"}</div>`;
	TRAIL_COLORS.forEach(tc => {
		const unlocked = totalDone >= tc.req;
		const active = (sd.activeTrail||0) === tc.id;
		const btn = document.createElement("button");
		btn.className = "cosm-btn";
		btn.style.cssText = `background:${unlocked?(active?tc.col+"77":tc.col+"22"):"#111"};border-color:${unlocked?tc.col:"#333"};color:${unlocked?tc.col:"#444"};font-weight:${active?"bold":"normal"}`;
		btn.textContent = (unlocked?"● ":"🔒")+(lang==="fr"?tc.fr:tc.en)+(unlocked?"":" ("+tc.req+")");
		btn.disabled = !unlocked;
		if (unlocked) btn.onclick = () => selectTrail(tc.id);
		trailDiv.appendChild(btn);
	});
	cosmEl.appendChild(trailDiv);
}
window.openDC = openDC;
window.closeDC = function () {
	hide("dcDiv");
	gs = "start";
	gpxOnMenu();
};

// tapContinue → lang? → nameSetup? → start → aim → flying ↔ paused → dead → results
let gs = "tapContinue";
let introFrame = 0;
const BOOST_SND_B64 = "data:audio/mp3;base64,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";
let hardcoreMode = false;
let speedStreakFrames = 0, speedStreakMult = 1;
let introSoundPlayed = false;
const INTRO_LOGO_B64 = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAHgAoADASIAAhEBAxEB/8QAHQABAQACAwEBAQAAAAAAAAAAAAUGBwMECAIBCf/EADkQAQACAQMDAgUCBAMHBQAAAAABAgMEBREGEiEHMRMiQVFhFDIII3GBFZGhFkJDUnKxwWJ0ktLw/8QAGwEBAAIDAQEAAAAAAAAAAAAAAAQFAQMGBwL/xAAlEQEAAgIBBAIBBQAAAAAAAAAAAQMCBBEFEiExBhNhFTJBUZH/2gAMAwEAAhEDEQA/APGQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQ+qVm94rHvLMNh6Sy67S/EikzPHLRfsYURznK06X0fa6pZNevjzMIQq71tObQ5Z5rPCU+67cbMe7GfCNu6V2ldNN2PEwlA59Dp/1Wrx6fvrTvnjut7Q2IjuxMS/XFlx202tyaeclcnZbjurPiXKCUC10/smfcc0cUnta7LMa8e7KfCXpaV27dFNOPMy4hlO89M5dHp++1Zjxyxe9Zraaz9HxRsYXxzhKT1To+10uyMNjHiZSQG9VqoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAL+10i+rpE/d6K9JtipqNsnNekTExxDzvtForrKTP3erfQXLi1Wzzp4mO6qk6lj3W44z6enfCrfo0L7MPfj/ABhvqT0HM4smbDh7qT5mIj2efuo9kzbfqLfJPby/oFq9mx6nDbHkpExMceWkPVz01tTHl1Wmwd2OfMxEezRVnnqZcx+1cb+vq/Iqfrz4xuj1P9/iXmZxZcUWnlb33acuhz2+SeOUlfVW42492LyTd0rtK6abo4mEoFvpvZM246mvyT28/Yssxrx7sjS0rt26KaY5mVDYtpy63PX5Z45bz9OuhrTjpnzYuKR5iJj3UvSf03vlrj1eqwzXHHmImPdu3SbNj02GuPHSIiI48KC3PPby5nxi9b0NfV+PVfXhxldPuf6/ENFermw48G1RlrjiIiOJeZN5xxj1t4j7vYHr7mxaXZf08zHdZ5B3y0W115j7pHTY7bcohT/NbPv0KLMv3ef8cwC7eYpQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJ2nyTiy1vH0lu/0V64jZ9dita/yTxFo5aMdvbddl0eaL0tMcIe5rffj49x6dH8c63+mXTFkc15eMo/D+lHSm8bbvmgx59PmpabRHMc+YVdw2nS6vTWx5a1tW0ceXhPpb1F3LaZrOm1l8fH0i3hmmX116hvpfgTrIiOOOY90CM7MY7c8PLrstXUtzi3V2YjH8+Jhd9eugtv2/4ur0+TF225mac+YeXt2w1way9Ke0Szvq31C1+7TedRqr5Zn7y17qs1s+aclveW/p9NmGUzMcRP8ACq+X9R1dmquvDPvsx95cLO24q5tVWlvbl6S9CuhdBuVser1OTH219qTPmXmjT5bYcsXrPmGc9Ldda/aZrbTam+KY+0sdQpzzyjKI5iP4Z+IdR1daqyvLPssy9Zcenvbb9p0uk01ceKta1rHHhK6r3jbdj0GTPqM2Os1ieI58y8rYvXzf6aT4H6yJjjjmfdhHVnqZuW7d36jV3yc/SbeGmc7Mo7cMPK0x1dSrObdrZicfx5mWT+sXWn+M6/LeLcUiZisctO5rzkyWtP1ly67WZNXlm97c8uun6et9GPn3LkfkXW/1O6IrjivHxEJQCY5xVABKABVABKABVABKABVABKABVABKABVABKABVABKABVABKAAABVABKABVABKABVABKABVABKABVABKABVABKABVABKABVABKABVcebntcj5vHNQdO2ny101dTWJnFae2bR9J+0uLvt/zSt9H6rBXW22/W1i+l1cdlon6W+kvnqnYM+zajujnJpbz/Lyf+J/IzEzDqZL3tkrjx1m17TEViPMzM/R9ZqajSazLpNXithz4rdt6WjiYllfo/s1d16qpr9TXnS6GYyTzHi1/pH/llHrv07TN8LqXbsVZmkdur7I94+lp/wCww05jpfJkrjx1m17TFa1iPMzP0cms02o0WryaXU4r4c+K3belo4mJbF9Dumq63dp33X4onSaXmMXfHi+T7/2cvrzstKbpj37S1j4ef5M/b/zR7T/cGB2yTWOe5wxGXPGTJXn4eOOb2n2j8f1dnZ9t1W9ayMGnia4485Mk+1Yd7qydNpPg7JoY4x4vmzW+trfkZmZljQAwqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAAAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAA7uorMTF6zMWieYmGyOndbpd+2CMGspXJzHZlrP3j6te3jmrs9O7pbadbebTPwrx5j8x7AzPety0nR/Tt9s2iZrqNTM+bebRE+9pn/seknUEajBqentzt8fHkib44yTzzE/uhrvdtdm3HXZNVmmebT8sc/tj7PnbNZl0Gvw6zDPF8VotH5/ANq+pe8afY+nsew7PWum+P47cfjtp9f80b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J9/rDv8AUfVfUPUO9YN53bc8mbcNPStMOela4rY4rabV47IjiYmZnn3RAGya+s3qfXR101epbxFeY+J+lw98xxHibdnPjj39/M8zPjjB9Rq9y1G5Tumo1+rzbhN4yfqr5rWy98ccW75nnmOI88/R98R9n6DNtN68+rOnwVw4+r8vbWOIm+j097f/ACnHMz/XljuH1C6zx9b4OtZ37UZd/wBPE1w6vPWmWcdZrakxFbxNYji1vHHEc8x58sWAbY0/r/6x4MmoyYusLVvqLxfLP+HaWeZisVj/AIXjxWPb+vvMsO3PrHq7c+sdL1huW96nW75pM2LPp9VqO3J8O2O3fTisx2xWLee3jt9/HmUziPs/eI+wKvqN6idZeoet0ms6x3m255tJjnHgtOnxYopWZ5mOMdax5n6zHLsbN6oddbN0Pqeitt3z9PsGqx5cebSxpMM99csTGSJvNJv5iZj939GGgO3TDPZxLKOi/ULrrovTZdJ011BqdFpss91sFqUy44nz5rXJW0VmefMxEc+OfaEE4gGR9T+rXqJ1LtmXbN46n1GbSZo7cuLHhxYYvH2t8OtZmPxPhP3f1A6u3XpTT9La/d5y7PpqY8eLTRp8VeK444pHdWsWnjiPeZ5+rFwGR9JdUdR9JZ9Rn6e1/wCiyaisUy2+BjyTaInmI+es8f2dvU9edZajZNVsubeLW0Gqvlvnxfp8Ud85LzkvPdFe7za0z7/Xj28IvEfY4j7A7fT/AFl1JsG1Z9r2jcp0uk1F7Xy0jDjtNrTWKzPdaszHiI9pcHTXU++dNzqJ2XXfpZ1HbGX+VS/d288fuiePefZHAWtq3vfNr3DPr9BuGXBqNRMzmtERMXmZ581mOJ8zP0UNZ1t1dq9Nl0+fdrWx5aTS8Rgx1mYmOJ8xXmP7JPEfY4j7Aoz111VMcTuvj/2+L/6uluXU2+7jp7afV7he+K37q1pWkT/XtiEcB38GPthzACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAD/2Q==";
const INTRO_SND_B64  = "data:audio/mp3;base64,//uQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uQZEEP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVQSkm5DQoEZ8UMKR17m1M8IfqMLyhDJwxfc+bmSYnAjeQElEDLahdoKOQKvChkVvIz4JrMVxLRrOokMGyociPnwHh2mLA5kcQD0DhDH+ZWOJ0EQzN4JAoQxLP5OysBBSSzcSBWPwzBpCcAuEZgkNBP/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABIZO3hILpbJCI83KvsMtIjQPcvY+C8FvKghI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VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kGRDD/AOAIADAAAIAcAQAGAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
const introLogoImg = new Image();
introLogoImg.src = INTRO_LOGO_B64;
let prevGs = "flying"; // for returning from pause
let animId,
	frame = 0;

// ══════════════════════════════════════════
//  AUDIO SYSTEM
// ══════════════════════════════════════════
const SFX_DATA = {
	click: "data:audio/mp3;base64,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",
	launch: "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAcAAAXqwAREREaGhoaIyMjLCwsLDQ0ND09PT1GRkZPT09PWFhYWGFhYWlpaWlycnJ7e3t7hISEjY2NjZaWlpaenp6np6ensLCwubm5ucLCwsvLy8vT09PT3Nzc5eXl5e7u7vf39/f///8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAaRAAAAAAAAF6vcJZ/FAAAAAAAAAAAAAAAAAAAAAP/7UGQAAAGKA1y9DGAEGQALO6CAAAc4f4IY8YAAewAzdwAgAgHggEgcIVDgYsHwcBAEDGUBA5hAEDnKAmD4Pg+/rBwMLB98vl34nBAEAQ/lAQOff/obdJflCAA+D58cXPvlFg+9eCBz1Am/gh/mBtQBDsg5DSiK9/Ej0f3rBr3Fnru4tap50zYBh/+7nVyXP/yBqKkLjvFaOPJMAqRhU2BwwcsaeLNDqgBRAKKJbKAAJAAAAAAOHZfA05CwDBZi0gUv//wYuFEYQ8aIftlis+//+1JkBIAhXhheB2BgABkAC+bhgAAGhD95J7DCAG4Ab6QRBADsFU0bnZ+M1rtJfYYIggJhMxgmAQp3+aQZ3HJ/+0gre7Z3vEAEzATT3///+gT9L1NcDzUCE2CBACT2tSABWABhEAG4IgRwkQGjMOFDrPLlimOJKn/UiRIkaRRRckGQVDWCp12Jg6sskR7bJ7+x///SB4mBgAEoWaAj6Ohv/xEeAxEQnbm/9oa19wS9Sie2glgUBBwVhhqhLsBlolnaQMkihhjJHKAjzDzwG6ikGv/7UmQQgBHwIV7J5hpgG2A9HARBAYgUW39HmE7QcgQ2PHQMHlZ9lwn1EQoX/lDKUF0dMxv3p/05ARj6SkYL+fVuLwG2AAABhMWBGUh8HwM3////////FSYQctNFA21IEgAg0F1Pg9jnJ0yHcuFUwyH+S5CTKK1EvTiSCWCVNU2UwiE6OdeGMoXKgDNz0dRtUsDiZAaa5qNWkj99v+pmZ5Z3cAuwEBIRMzRAXXKqLiyIh9IXDV2toaIhelugQBQ0AoJScpImLxILcj7A6BDRt+OI//tSRAuAYYoOXsklMxAnYfvVPGkSBfRDdKSkZwCliq3A9Jy4WCHCIIMzVQHCgPiZrg2EUi5Zn63t/Dx//voPACDIbpNWpgJ1UtlvGBYkl7zf7KNkCVaxZIupr6Lf/NBImIA6ATVhwAIEw8TA3FiB9dJ8xaIySa5yeONriddjCtpB06SACWw7BwKE2UCg1A57Bcj+skYLGEPKwscFkgPLoD7YRJQPDD3Mp4z0k+Z5maJQWlX72Krc6tNLP/+//00IEEEAB0QBkfWq7A1CzRpDLSL/+1JECQAhLgzdQYETgC5hq7k9IwwF4CN/pJUgIKcLrUGHoDCebVIUise+pIFFBF/9/7UJ/v/+QDUCAAVwIyaBETNRQqESavWOhoW3DNHmFhoTguyxKlez/s9TSwBD5j8YDQeA3/Sh9GUwW0g4wCARBeLhg2hWp+WePJi4HxqcDiUQhUOmmfaQ/8GQMMQEE5UGRP/9FTTBMwAS9rRSTssmFU9Uo1C0X3r2L8DMCIT0cMu2bUnrmL6ITt////4fIgKQQAAABwHsJoEa9RnrTa1lWv/7UkQJBEGODdvh4WCAKmGrmWEjGgS8V28GJENAjwitFYYYKGJItPDO9lk/C006DTAifRVZs65UULGnZJD7m/LHE/5INkABKcBmBWZxrUa1CsRoVXpFQi5G8TNQwYBBRQLmwQJBlTKvb/X/f/tPBzvoVnQfrKyHYssLojgueOcXPKCAxR1kcqftC/fs6k/pin//rSowABUxkKAt39ObxOxNpkIXBgLr99FiY53cwsjRStfp///v/7oCpkgkEjYCLD+H9uWMUcSIlpAZIlyRIh4j//tSRAyAEX8i2+HmEXApYcwcJSYJhhA9Z8eYQ8C5iC+wwwjmOeVkzTSXzpYiMVv/+34LbwUCwhMrbygPkjbbaqQNBIGuRE5xEiQnUQGSO5IkhzIzllYalhyX5Lvto5x9X9n+q4AlDAAAAVBACAyK3yc4NAYSRIgZRMmGUvcgrkeAiB4EEQ4kDAKQk8aHqmK530gMOmjPWm2TVQ0kgsqy2phMmUaiCgZRNY1Be4yS8sZoWI0CjYx7iSLMqKBNQPRVvt/01TeGREQzN8IQXy1ApCT/+1JEBoABUAnh8ekwLCPBPD0hhgWGSH1lJ5hjwL0Iq5T0mCiJDg1Q3AdfKcAmkRSp41l0IiUkDoCVr//z3///7VfpLG2m4wwABbhjh5pYMqG4TTcpwUuRSp41l1lBqr2/q//+WKZABUWgJCF4p+aUIWCEiwhfCuUFDtFbNccaJssKxPOXTpN813//H4CFU48aJbHfFv/tbANAB6FKK2SqRw+QESo41Ya2AoKWKWaSwKowEykXU04WFRBAUKOA4MNJ0ub///pVeIwVXvXJeolAWP/7UkQFAAFaDleDBkjiJmIq4GDGFgW8L2EMRMAInoWwdJUYBtGsIJVG1FJLcfSZCJxFKXVGLnq5PIFSg7zMKLhUl0MfwqTgk6v6pKKwtAWNRgwlUa0aUSgLFDWh04RBkHUBRYwHzJs6GdvVaFIiCIJPn2QI1B5RARIerBkhmYGYyztghtiUgLFF6FBd2D988pn63P///vsVK8L1tktajkgABcRBFB55I5akFdTMVBiZIHgHQwxWOKmT6GXqLPbs3fSqD1ABFYAc0WaBewsQVqky//tSRAeEcUcOWUsJMAAfAlrVYSYABDBdWgwkRcCKiarBgKRJMsssiRI/rLx+tUsCAFPYoWqKwiVg6NccV9RgAABQCEob3EjDtUmRLYOWJIgHnhReFstFV3eZ+dqYmySDXVf/PKo2wSJWucA572fqbyElPIUk/wCD/gv//yqzZlI2ZNatHJI+wSJWmcGNbZuU9BVlhVT7XuFpzD0gRQUKd3oOIAAZQAqLBRB6FykhiraJR089Mov8CKUtkV8RGcgBQ8YHOBlQj9qQrVWgAJBQAAD/+1JEGAERPA1YywYocCVBqz08whoEmE1arCTCwIgIKoGEmFnvF4hc1TSGKsoosJome6L4ApXEIwzIA0AxYRs/pIgARFES0abV5EnODIhidI9J8J4OahixpxJGko/3rZsfV/p/3pBHSaRMWmR5ETnBkQxpx6U5cDmpDUapE5bEjg6ZhKjCPApKBEKhioqFNVQ0pImE1nVm1UOJIUBCwGy4LBpa6PwVcLlKSkhAIBbI+EIEYCCNNIwZ0iUiTkzSKiiyAKQnYPRW7454GLF3LNjRI//7UkQkjxEKDdcBiUgAI0Ia6GDGAAPMQ1wMLMAAmQmqgYMkSbCJcwcnJZLBpQabTZ+7Joh4rqiJy0kP/0/aF3mK7aZQARcpIjap0icZUHIrtqTyKU8F6HsHMxZbCgYEIBihWiNVP8kAiQAM0VSZ6rEMCbFaOfIYFrerI1Jv0mfm4zvu4+wwMd0KfK/gMiYwBiipcq8u0g2ObBiQKom0x1yA+THOjcgba/teEAFBFD5YWQSoAAJACGFQNgwwQfJw2x9m4HCQ0UJrlDfGNQhF36nC//tSRDYAUTUN2EnpMFolgmqQYYkIRLw7WyeZAUCRiKqVgzBgQkRaL/0LKEOGS8V7owwQfIobYeyMhcUj04Su1qsU14pLe5jAyGEKYdpyChIkUECJGxc2wySIDWInYkkOtTnHxsqD6Tfu9SxCwAtPM//6Epjn8ZSTVBvFnYcoy1wuGzUdPPQhkie5NGj7UyzcoYskHtnKHf+h1KQQ64oDuxAlET8WFTKDoEboHZGp3nuKgsZCAUFl/vZrr6CTF95cIOE9vx4D0VFF1cJS08qsXmr/+1JEQQHxHw3YWekQXCWiKoBh6QBEaENUDBkgwJWIaYGTMAmwpnyozbcYQ6oSIWBBFWb+1QqgUAAQYAAAnJrY+PmYIIghhagZLnLe8ed5b1pwf//eBUD4VBIeoAgAAAAUAGIQ80kFBRZUESEXJy+cPTQGB8AlguUDQ//////1FzAIgSUEjsX+K6KCpw2gESNIkDFy7WX1+BTyyuCChA4+j/b+9xgBH4BmTPxk8GgqHjaALCssaCxdWKTa82owWjUJJy4GUAKfag0gAKXADrDuAP/7UkROADEoE9ZhhhHAJgFKzTzDDASEQU6sJMMAjQdpVYMkSXTVRFwCcXKzsKEHSmGHhHXDTQyC4BSNQJ6P/FTYXmZmBJz9cWsgdXNsm5WdSFQHMsxRYCC+QLWSfILHkmkRfGn+UAODaBxxe1gPpMkKSWEhBEkFh0yQLhFMkso5Z0FSYZw//+XCYVBAALjk90yj1dENEywkINJByS1LpGrMeNiTcKgDumm33Ra2okUU5GwAXg+KIoGtKzTYLBd1GhFzIRTfyMbFzkePWq4IAYqG//tSRFsBMS0N1UnmEGAjAjpAYYYMBJQlUywYwACJiKmhlJghirgwIz93/qGDkEgA/gMoabrSXCptwYYYxnMf/+p9HY27/1g1JgAAFTbACUDyXXvjAYIiMj1QgD9oooXCIULVWUHDTrX9i9YoFxgknDRzEgZOpJf/QaAAB8AD2DIK3+7//61LUJHCMVcz5JUHEQAXJAAEnB88xLgq0uwyF4itBEkMSXQ2/Ljh8BFyZmXy3ytLaKYcJmCRXM42+17rRwJCrlCWFzvR//+ilvmmprL/+1JkaYBBcwnZ6YY4vBpBGlk8IhYGQD1PrCRjQFaBKbDDDARko0SWJogBKWwAHyCqOmw8oPoScTEpgwwTOOeGMRcPiZYBYuuWe4rMKGP1lyanqQBHlv/qDAXRAZXLqnTX0/4IbxuDW3UgceLP/9IPQpNoCTf8AIaLeENFiM8jTNkbBWzkEwXYWWOJOa99hFxg4Ys3H4qlR4RJrBgvT/9QKM0Awws5YaF////L7Y4TPfGEW3//aJESSAAvwAELHSKUFIYMQFQngUEgUQKQCfeTOv/7UmR3gMGKGdHTSRjwEwBJ0WDiAAZcK02nmSIgVxDlwTAJONLI4CDioqXSayYSXAhYHih9qVq1iVaa2AJoAI0NmCU2lbKnfXX+r/pWBtdaf/6qDgEAC8AEfA8CEcVKkYhbmPoxKSaiMyHROTGyiyUYuA8YsGhzmDUpKciKINrtTsoROihS8xWWAhkPiU4hBsd2f9TRcUWaomErsoQMNH+IPVOGAqORdTFQcgoB5MYOoZCJ7ynEOxKLpoVQVPuQk71WXjQsXC5EgMqFA1pZvqHA//tSZIeAQYULU2npMFAWALmQPGUEBlQ7P4ykwQBdAWbZEwQAEDSAADsNOf/8qFHfyTXlmLU86WhAGlrqCURAApwABuQmodG0iqCggChM0aPuOQmLJMvlLJg0TyDzBw8qSdoaAW5FD1zFhPv1TopNLZpvyBA7NESCHuw6OO//yOip2wjWSAAAP4AvQfuAYmMjuWT4OB8UwsRrIioCVCF2zwbVQNvYdpOeFbCtoU0nTgfGrtq29mscoCADF21OjabBAICsTcxCjnYyxv7v//9dGAD/+1JklYFBhxBOywkw4BlASXBh4gAGTEsuDJ2CAGMA6OghCAYAagAAoITmaiSfjiNKoLIwUKh0yjEhEJWGmiyLWQYTTB24ue9cDNEJZJhK57c5qiusEVAVKwD3qTc6nw8VFvShREj6q/HqSDAwj04bxwWUKicfB0hmQRoYvWCdQc0zJ17V8SAZIpjDVxcNUuTScK/XW0W2NTX72gtgACCiSGUqPf1eOX9auwSqXKHlSKQaBcbaaTcbQADIRmv6ymH8/Rmj5IKU5FBgkx75SU6c3v/7UmShAPGJDs5TD0gYFsEpIGAlGAZEQTEsMSGAYoSkwPQIGIPmZd/rBFcFs66P13hbKH29pQEQSQC2WAAAU/PKTwqmj6gUZjrtblJIi5oAn4I+nVHAcRSCwiIiZVQmRk5GeJA2SuQNtw+L9uQ++jj0ioaEKyhzsCdbnE+xC8V6Fl41FKHg0BjYKLlD+s2r7q3QbXOLc06G1VgCljEcFKxMsVTl2T5ahouHGh6fiUjXz/PSQRcy2JDyCcmCIuyR2ERMmwqfexaXParZuIAew1SP//tSZK4EEZYQy8ssSCAVQDlVPEIBBhxDKq0xI8BcgGj0AIgGKwrcQLI/5zQg6qOu1r2pyE3XZTyBlwaCUlrqH58tK6Wyq1Y7OpWFvE5yiMQNUwedJsVkEMm03tr69iLqdyO1YOIKANu8kxCTMrVt5me82CoX2o61V/d//SsJyqaNOVwAAG6SdmpdyfsC5S8wW8CwcgK3lHXqaqkylqzTdUdD3Vq1AdO1/XwT4afvGJBCimjHzQLMesAvtRFdn/XR/+3306Ho/+gtptuNf8gB4Pz/+1JkvIARiiJRaYYS3BjCGh0EA3OGPEMorSWBwF2A5EjziAQJkszcdjzwshDuzsM6JtwaNRwmIKLbU6PsJRx7LSdo3k2YFn3gqV/chgOgCUcGsTqoyOrSUuai127n/+zq+qkBAZ7lgAFEJkCUZV4mBuZzS0Ga7NmSpbCtNHY6SVIvv6GCIhPEBwvmVT7EbELeKAAgomwmAgIIZNjlfxo2323/9ejt//d/G/0IAK8A9kWMWVWIvbE1oYr5P4L+sI8wdw7cmKrNaCqRqxm2WnkTjP/7UmTJDdGWD0iLD2AwEsA40T3iAQY8QSAsJYJAZodigPCMmDjk2U7l/XLXQcmt6tTFOOdsqNUJA01jbN3rcAH26YxrUuY/FEHtN99DW1O/26Ox3b2r1Z+tlCrMXv9/r8iDwDkZCAAAB5EAjoQPUPG+2QsapCeztqVBTsSCwDWbEsMG9MwKZccnjn9Anjndh/HNdDufJQlJFLRhyeYfuPNSajxgVEowyy5/dBBC7MaDgKC1m//2a3NC4yJgeNSTN////HoaACMEAACAAoZGJUpm//tSZNcA0Ywiy+noEnoZgEigYeEABjCbN4YYRbBaAKKEkIgAEMJqPjFmuL3Qns2dncKlKgMcNNFSQjAHQIADycgjgtcs4UGr4d4SSKIg1pGjyiDgAYdgKHHsSHdTtXcDhaA+mYmIue5jX9amHVNo3j5hp9ONuib/1ifK1Hz7sYJaq2IiVVFIAgNBQCRIgppGaqqqkg6oGg6uIgaBr/lT3/////BUqCIIgiKRSFQRBEVEzUhuIMd/QUKCgoKCXZBQUCgpsIJBQWpMQU1FMy4xMDD/+1Jk5ADxnxbISewwEBUgSKAIQQAH4JkatPWAAHCBokKMAACqqqqqqqqqqkxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqv/7UkToAANgS1NuPaACZohIkswgAASIIWHcYYAAigNiA5IwAaqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq//tSZKkP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqo=",
	jet: "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAvAAAnLgAKCg8PFRUaGh8fJSUqKi8vLzU1Ojo/P0VFSkpPT1VVWlpaX19lZWpqb291dXp6f3+FhYWKio+PlZWamp+fpaWqqq+vr7W1urq/v8XFysrPz9XV2tra39/l5erq7+/19fr6//8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAKIAAAAAAAAJy5GoqMgAAAAAAAAAAAAAAAAAAAAAP/7UEQAAAEmAFa1BEAIJABbBaGAAEVQK1IZkQAAoYZrgzIgAAJApCAIAgGC4OAgCAIAgD7wfB8CO4P8oc4P/4Pv0f6Pf5R2D7wBfAgQAABBgeAAAAAAY/MPHiPAAADDw8PDwAAADEb/////zDwGmWtLIM3NkNPpyY9hyrQw9Lss8uhwEYQlRgq4+DQF+FH/ER7/lf//9QdB4aAU0BlvBG6sTk3Ncq15dLu568GAsmJEXCoK+RV+In/qErf/rO//YpANbEAxrmjAyHDhc0iCHer/+1JECAGRXBBOj3EgAC4CGlbtmAFFYD9DLeDAoKoH6AHHpFCwxRXJTJqKH/o76QbUS5y1USC5pngCDTUtT9ygEVQABow6Z39BRRTCZhEn+qyilnYzRXqfd/sBcV2eai3lBgRaydMff4foVColgAqQAgEeSca2AeCFcmgFz37OBwkSAVEBtgZa18pa/dpIhwbAh9jLq2XpLLMXxk5y5DQQeMQgUEwISCLKY5nyZ0QuIDxOHwHebWONn15ryZPmyk5u/UsVgAAdbOCls6fI97ZuL//7UmQHDDHfFM8TmmAgGgHZ8GjCOAeoez5OMEeAYwNokaw8BTiRBWo0FgZYW0ocBLQkmJEqqOTo2WLSqfMosbiimcia99g0JMecBokf2G72FCB0uB/ixmF5lB7pXmXxnTpxVCyTnbbZicFfNDfgB7wiGqpKZUOBMtVqKHId4HSupSeMSWYQqCOvNYSsV1j60qIS5qFymQmxtszTs73sCAyCszj84Kxp/uUADWQACceQGg5ZMMikabCwxO1JF5H7nVd7CASiAGnoaa0V5jZCkyQe//tSZAeJccwTUDOJMcgiYTnlaykFBkA/PK5hIkh8hqdBvJgQ1K1VJrywOEhdMgTBsowshNKDhA+zbzUvkl7KQTFQkOS1ikMPirFM+yraoEAAHJNnF8BewMiVElc3FXoZI0cFG+zGKpUqDhwygen/7isHH9bodMfBsEjigZMgmHO6x8MAoGwDCWbAJnBYXPhjny0j0tY6ETBDFIZXYjfqqddz9nRWptIufRhaBStOuPvkHPIC26Dl/qL6jetrw6X3/5YHMAMFbQxsezMZ4MIiMsn/+1JkB43xph5Ok4YTsBvBObBvLANGFDk6TmEiQJCGJgGsJFAEAV41zS536jNFR74/tmCyA5dli0/BqKNIlU7dC2df0dfjjL//qM50TQ189OUGkqShYBQHYyJJmNplM8m+KLAPYpEw5oNzi0MNLhwwgEDKZu6f9KYFRwA4FMtgS7aIhAMnxSTqJpgQ0ePoDYQK/TT/9XUYeIZdGYSWPGkeSwkRkbG5LSQgZAlA8Y2OPtRXBG0wWejd/HLVH/MD4kYNrBo97WsoKhC/rU1PcCoLkP/7UmQLBfGiDk6TmEgwG8F5oGxlREZ4STru7YBAVoLmwaykAJYLDhwCRwwJcFDNKkyAIB1gXqYxRHzffuR6////+wy/rMusjOxhEpiKJy7nHjNCAAT1JG4UoUVU/SYFCSHC4EmgQfHohhbxPh6QMl8CKRQU10Rk5QEyQpNLrfy3QX6z+XceadQ29TUbxS/P9/+g3GU4vcHqI8gqBZ8hSMKkYIBUsqVyKjcsTDiYrzjjQFiq7FIKLpROW0k2FAApCQaDILLElrNkB5VBx9E/UHUn//tSZBSPMVsRzIO7SDAZIUpcYCM3hfhPMg68RcBshKZBvKQJx60gMhJQgMAAAB1JLljjhUGV/pWlQSF3f/xGs7I0s5WCAQDGYai2xpLU3yVG2tMKeaTdLgpzhF6yny5NTe6Y2RWuv5xHTHHq3qdljMQoD55YoDkWixwhJnoiMcR4gthhWyQsz4Z89QEEAabaeZCLgccZxkMQA0BMuWq6wHgqDyMkBplGjSQtILYRtP/cHTm9GqkWHkZq+B+wkotOWisOpGy9qvQvbPuU1Rr9nTL/+1JkIwkRYA7Nq7xIIBgg2ZBrCwJGAD8yDvHggGIEKfGEjA5DnErCnOjIYhEzKFqigHbxzQyI+JpK7IWhR6I1Yh0ZUXK1v4kVjmIC2vxf///1gERphDwEqxL4QIyOF64hRvDjsavKDRG8qjQNCDUy1HzqRuNBCmD0xWYq9kLyohcTPEZ0Ax0HgZJkkYjeNpP5CRsHtj4N/Vu//QZAcnKiZZIv4Jo9oB3y2PkDcMoZXMfOHx+/7+ndhpnZLVGiw1CwoBcjUFtLAMhKRhlmU0qBeP/7UmQzDfGDFUyLiRJQG0E5kG2DFEXIVzQOvQPAdIRmQb0YEHG9qdMOupFlcBGUTB7q1I+P4zvcdYbn61h2qSFr4xBlMCKImGpWhQDbKCARiojfcmkBt2OSQSAAAFZ1xL1skZLoIEYR6hcGOmQUnsGOODQlDqRvv2Olw3pE2mOcOw5hYO/s+yACJ6oowPZ4ICc/KilBjWJN/GaQs2e9SwE5ZHLJAAdaPIh22yTwIhZNMtkzDyonef90ADhj5lYe0CIczpAHASgD3yExUdCUQeF1//tSRD4BESoM2GsJMJwkwgmgc2wEBJBHYaekwrCWh6cltJidRQcE4EQsMoS9PEHigBN8+EqilSpBDXKM1T1yGMYLQ04GwwlrAxBEkLlt7K/fw5GIAPq7sx07a5pS4utB1sgxjkZx+CiZyBytgosDglHrdierV4YhiJCf7vtnEKO+fW0Qhi60d4wgDBpMOQBAORwsyWjI3IXZmYsYUYlAvY8/kElaSRdE9JtTXeqkxUrDPCYOvCoWZQtigEJ1SAAXNKlSCJdh3cZXkkZuZb7Xa1//+1JESg/xFRDQA4ww0CiCGaB3bAIEtEE+DmEigJSIZoHMMEl6dDs7+MTnA14aAglNq2RmMhIz8GaVFhiXQjJs29mSjwu+hd9uQ6gD4YwA+l2MMKjbCoMGhwLAq4Gka0FxAgQpm1dZm0xJxfm/w3RWAAqgAIANP8jdCU6giMkCGcSl+712xljLrl2/MzIdIVyhljQNR1ijYOsOhC050ejLAoLiQay+V1+bznqmNuOxEXFY+IFJZ0KSNO5CgIoAWyS6ty7X/7a7AAAAAxR1KEIQu//7UkRVgREmDs+DjEGyJSHqCG0iHUTUQ0eVsYAAmQgnArhgAedxUzQvimiXkVtHlSvoqoa/EHui2QkpGELTTj6vXJtZ3qtesiZUqrjMSlT2XOM+eP3JTZmYLqhgjsdU/WTX3aut1+vrV/ul/v//0p84zfcOuJQwAaTXba2/b/7YCgAAABS+QqwVQ2EUDKtq20tW9IofQQxiRwW8QpOE4sLXhKaTmhjkC4yRpSVRW9EiQG9KSyC7EHx1HSTnoRjbP6zF9RP+Rs51ETTARBAATSe2//tSZGCAAzYw125p4AZKA8rtzCQAhohVOB3GAAh2BeeDtGAAMrxe6Rzb+wW/sNvuzsDxMJpkIstNHzMal35uzOw2uz9ie/alM7MOQ/N41EmsxHoRLZTa7jv7NevThUI0ios11dq6BgC5XaAedpB6CjGMSujmpQ8rdkxA1WnRMJjKNZCH67CkKgYpJSX5O++ld3zb1UDaSCAOg/gcDz9SAD27DG1Z/W/sj/0k+3//25/QMMaagADe4D2Ngy7E38gV2kwC5qAA9Q4/3UbCjIChf13/+1JkNYASVBBQO4wxsiKhmhlrBgUHlFU6TmDHAIwGJ0G8sAg9lgNQAaixxyiwHHSEZNHBaRu6v0AgIJA0ftrUeKJORG36jblwDVYFGrImEgMiFj6r/sxWrQHShByoec3+H6TKJgzagPc0BNLokINyQAh9vyxBAcLz66+HpZJoWkHj2RX/uiAPqfs6A/zzbeM9D0cM+TitITpi6QSgp8sCRQSQJ1NoS3C/31r7qOvMlrSrmuKxXf854Hr2Zm7xnnMp1GYgcgADZI0MA0TrgF+H6//7UkQlgNGNEM8LmGCmOCIJkXXsGAcAL0ctsSTo2otmhdwgaJoQBxwQQB9GSUntq6XqteWqzrA6pT9LDtCd+9JVX6AA0BH+ADmT8xEGP/CDGAZh0bAIrHgnr1StawUDyesytjmRO45oTP37vcrPnHDSDs7EENXFcgR36ecBjOZIjkcziwYrBUM2HhllGPLAJh25+H4djEQZ5SnhqHClGQUuNkR645GtzVjXyY+s+rdR/RUFpVW+hA4eEMoahJ7Spci3BTE3fn683Pal1+PV6Ihv//tSZA+AAi8T1E1swAwdoSr9p4gBx4hVQBnGAAB4BegDNiAAFLbDnlunrv+eExMwqaKhQGjQssupwhW5pgXsNh2MoK//RhwVFd8wBHLI44AAAAEQKYa+VBDjM8e8t43fWbr4uMa5N5+jKSgMKBQ8kgjMAVO7RcWKrevsiuzdkcVht+mvNLgtuoV2FAgiS5CkPLKVjYlso8vvw3l5kmPLOY1xrDu45MNHho35SaWIw1p0U1ZvyW7u1Wr51R4KNEBC2/+hOWlEDhcNVD5Kx8MEUXP/+1JkBwAByBVRBnUgAB+BSgDNDABHUFdEGdSAAHcDKAM0IAAIAQfN5y9rXSgCGc6sxiW4R8ExlgUkgfHzLOIKRIt2U5wZ9v1uh58Ufs+NOxaTUOSdHsJpLqOOd+GaJplfXNc1sOsEiG4QhIn8PzOez1BQfG9p/GIAJmdJugobGgKWop2Eqo7TRxuEUeW2DrQGEZUsWDyJTSQTtMxrc/8XzDqyZ1V44/+ROaAHhRmjCdZrCYGKRS679nt4cDCWhnFGgQx6d/S1Nqy0eM5otiBxnP/7UmQFAAGuEFGGcSAAHiGaEM2IAAbsQUYZ1gAAfwOnwzYAAPyWwzkA5PNJ4xVd0RkzjRineSHR5ZlELnFFmidois+Jx5ZK2DBIG7q4G3Y04UJVAagrBAeJHi7GWUz+7tUvL/PnMR9zBiMff//ScxMiJAWYalAVkKZCmQJBg38jaS+CG0NSytNx97I3q9zAZrWm3lbm4yfBpAqABZ6NR0uFtnI56gxk5HhU+ImHhU3ZXBwpGJ97r0kqVbQnEbRkulxDKUftBAE2xgAfOSnRfpmw//tSZAYFUgEO0r9sYAAXQIsa5ggBhtRDSE5lgIhcAuz0x4AeCPHRfN9FMpNAc/WnX/s5RmlpwDDBgsYyBECZEe8FDgImRoVBVpcTgmDqTYOt//ytZlstyQUAAXACgAF4PjhEeVZ3/9jTQAKIb//9IfmEJQbeNoE5P55cC7U9n+FxZHItBizpDdNy8J1WDxZS2WrdiCsBR1X/Ak/nAk0Q+v1T+B5+mwo0AJAoD4nAt5N3bW8eR///ifknPHQQOA3tyTbzfOoBUxSBxoQKsLCyIS//+1JkCg0RehxSC48RUBkhWmBphiVGFEVCDvEhgGSFbXT2DBZYUcO2Z8f64dYisthTMqAzqQYhG///jydPpJKMzSCpgIxIUNTdoDwjFpcZPCrmPUq+QV/RRySdI8tZwxbmPQENAmAHylzX6dyWTsTi7rrngKUDgnFnA2ppltFrYNIte+0y/655ywLRG8AAIBwNBlEGSpUz7IWk6yCj3//kRooqBhXAAGbGZobCC0gvOlu6qX0lAIbQCDgfcOZA8mfZlPLtjBstOtU6ar1Vu2Uedv/7UmQXAbF5HdOzZhH6G8FKNWnmEgWgR0guZSCQZAPoQbyYEDKAgQDNkD2LgHXRWEgMYgvYcqqbaUfquRAykf/Qo6BfTFAHOvMDoLObq/jvh0eNCwEnRSDBs6eNprsIGGkk+wxsmtgYdNfSg+w2cTeCSIbRhGGr18InsNCLpUSAgHMiTWLs0yAEQAB0KGHJxnEiyOw/DF+6c8JBfgpRW5ZTX3IInBUYaCpOR/7jwYcWry7QuBa08x2LzGwwCAjWQEhOxIdjzFQMUSEQCC5r/0H///tSRCUF8SwNUbN4YAAjIbpAbwkFBDQzQg29IoCRCCkBzSQcmh/wOaOxlkkWcKYLiV0iFosawUW0sFVZRWMpwkr/pIuOFhU4IBzp8TDhnZeVsTutXyQtLGqFCspCFWWHDPn411RU5/6FP/Ts3lKT2KQwgbpWtjQUrS2e67DGHU/OGKCdMvKAc8lxNP8nMWmr6jkTHNzBmaUaicl5kUpBioJ1Z+vi8PdWyZaemN/8QhVwYP+YHmZtOIjCikP4BgSz5sShc/ACECYMHMZepTOLUBL/+1JkNAXxURJRg5swYBvCSjBt4hYFqDtMzTDE6G+FJ8GssBCw0HRs7O+/IPUaPh27ho6BvJGPKh+0x31fnBjIghjRKfocp0S2dmwAYAC4AAFuM0g3ToJEZ4IZLk1ADIhwcGo9kUXHoGkUFkXKy07uFXiCKl/vfwTNT9HOhwZ5Wg2zAACSsujUHikjThKOPVcMthuR2q7mqSwaVIJkUZpnqeWvXJIik2qY1DgzNX4SusLDxI9GoPuGwk2A4eEwPkPpoBbMACDoxCQKHsRQFj4YjP/7UmRDBRF9EFLLmjAiGQFqAHNGBUXEQUQOMScAZYRpZawkBJpbL2ePdbuZ//SqPqZ02Y9zzyTr4BwUpOUPNLY87ss7NMxB1xNOADBzjzDKNA5zsu2SoXU9vxYSBsB7Z5gACgAAHORdJ/HJB0wXQosbvBIOAyf//58B1AD/Pn+jLWMPBhZTWDsEigD5FM2zNEWwVtToao/VH4JSBUc4YJRx1CcUsFmCv6Qf//twAMBTTsPhku0gaCTHENSingsJ//6l1SEAA56ZDDMaNGhQwACU//tSZFEBEXIR0IOaSFAbwSrNYSIXBfg3TS2wwwBlhq90kYkeR5a9zQSUeFRKweTEqIsCukZDLmAk5FuI2aqrab//wRzhn4xxFI2UJwTYwKpFFtrpT0tQSYBXXf/4sdTDIaNmSdM9AqEWGXusiWVn5aizxS2JxUGCkExyYIiSSrqIEm/GGpYw8Khz6lAZAUAfLgbcPeFob6wgLI9YcsBSZsiTypHb2/WqMszMbr50I7mNwGDAGs8twxJ5mtOizB35NqWxKNQGySix0TH0qq37AhL/+1JkXY0xbh9Rk4kR0BnhaiBvJgAF+ElCDu0hQGcEKJW8mAwJnt/T/8agyyoj2HFJDQgtVEhZ0kTWPQX9NkoeBlqG1//0mNSYCNJw5MwgVCBdLbl0obc6KwzKIs12FxOGcI9QJAWuPkElkoxmzN5wwkSAFmviwaBV/+u+wABXDe1mOaWR2iIS3Faf357X3/V6AGzjMZtm0/v+/oAAAAEjfs+rnoWpnKTR6QDK2MGgiXSGTxWRXxUWRdnD5oGpm9IxyJGQK2ZPqQe2qzc4ckttIv/7UmRrDRF+HlCDjBQSG2FKEGnmEgYsQ0Q11IAAZANvNpIgBwFWKMIgCLXL+Auwx7kTEVwTqDH//v/7LvdsycyoMJmIt+BjY6WUqyjFoMbabXvZWZ6i8SFEg8fMWvDP730Ye0KAcmX5vk2G3ycDheNBov07C/Yg/8Yjcq1HpbP3CWWaMN5qrwtVCM880Tv9aknhyh5wyQsyQIOIDwF13Sux7LD/3q9y5oGs//0VN6pg4uVDpQMVBDsiOnS7MkRgtCQbighP+8P5Xq9VTe0B4bQp//tSZHaAAtov225pIBYkYVoQzYgABaBBRj3DAABvBKgDtAAA/TV+SN9lIF+CiDMVdvKzkTpCV6AXBQiJ+8TnU0Sbukk+q4iEIGX6EabFoOZZeBrk44cZCITJEgAoCbCk0eTrKfxUQG36jI2RjI0Pz4sTSCE/mqMvd0U8TjREQQESJxwfM/JxpXfaVfX2KjiAiDGoADpxQBjMWBc5CRZcbe4uzSapyUeFsuDIgm+Gd1lEV7mhSOFQ8eR9so+g0knOxBTVDJJJJB8B8SksbUF/BW3/+1JEaIHxKA5Pg5lgIiFB2iBzKQQEYElGzhhnII+H6IHdJBCYD0Z0puAAogdDJCEfDlUykITOV/QP+MIACyY4OHIDAc8jbUU5MytJmZsZMUqFls3lO0dcCTKgAACgoQ3w3BcCTric78aQHf//6hhgZRUMDglgjYY5johYHGSQzjIbM3BipBqdrgIthUelnXiyvElKfRttqG6t2fqDYgHgMQ/JBAsZF0N/UYCPHKhxzQRXWFmBI4sKEB5iLCh70AZIAK3Rc2igoP1CSdWNSu8/4P/7UmR4CRF2D9ADumBQGYFZ8G0iKUXQd0lNmGcoZoOs9PSkBoTBOkFAtSkkEdkS2LUzp9NolQOT/7u2ht37/r2to6tABGtAAC0GkoV9lyncQCx7k+C2ioMPINq/+/1KAVUgpWAQAzgQ9UA42MLGgUFldCx44TiEGySA24wbska6qzrqqqr11MpiIj/ZOUaKBo84dAwBUbvI1f//6wjI9AABaAAARhLBE9LAo0O2YaFFhlv/9CVOefKg7QAI422m3JJADVwAi6muwcliIhQCECci//tSZIYBEb0Rz4u7YCAVQKoQbwICBjA3SU5owIhsA2m1kxhMGakg0eOPLxgseT+bOEcAFmhwNQkNj8yYv2DqMbPttnfyMvXOssNc5Mi+LMQaqbw0Fqjx0Z0R45IKhTDoUVWN2QBWUcDUAACx8/8P6tSVv6AQovPIHCQ06gAwABDNbAPIO47oUzTx0JAIKo30+ji9muhzItM8UdihP4oPLRK8zhSVX3SMlQ+FijedcJAG8WQ2qfP1kgXgNwWYEjjqnRT4peTHIsQdJsDy+EkGVMX/+1Jkj4AR6B7SU0kp2B5g+009ZgGK3P1frSRj+F0ErbTAJUbakYEJOJ1DCjWgIhWaisIQdEDAGRTN/nXANvSONyWSQBaQSyHCS5hdsljoO6oGZYIpSNlYgmRefZljMOFThILqWAZOo1CGkvC0ywoGpGszIgRCuGljhFRPBDOnkDbewj6wJNjLg5DRgNERFGN9WYMnhSUhbk5oQipZkv5JWUDRYJhcJiqSSigqrcJ/VQEnJG2m5LIAa1EzHJgWOw/TRiRzoMiR5ZMuKTr1VbF26P/7UmSBAPJhENFTj0jYIUFZ8G9JAgkEiWOssGWwrIangc0kGLJ/X/7eif6f+Ws7HKajBUe3j20J37FXvdcwDeFYhNTTnZzqDx4GJB1tF2GTvakOgjhGG5wRB0VWtJEfYRzsdZSilHF1yftx0ZpvAp6pr0QA+AagEBjKEXG6RBxIH5PQNema1m9kIDBR0xKGVhiabBRIqk2t4uQMqR/6//rQCo0gAdCIZvAzCzhARegJoL/QK29Fbo70zWnb1MTAJpiSHEUEOJMoCCmm3k1tis79//tSRGcAgdAuWmsGEl4xQknRd0kGRkBDWTWhgDDUCCgeuDAEv+xTOhUAAAAHS7/MAAA12gCESGZcAJRARvczYAwECVaDCIQchgsBypPFlSFLfLtAmIIfqUDmUilbi0bk8ijLckNY1EroS9m8V6wTQ5cPKXiw9wdzVzHkeX8L01n0+b13bG8fOMbz///4VsNECNpJJRuy7e2yQAAAAHQYDgBBQTAEMLUTGFGiTHIjidMA1nsiTiyOIkwqbrpCpD5TAWDEnkUdcZWqdLk+gLiDCej/+1JEVAADMy9PznHgAmTkqo3MvADHsFtEGdeAAPWLJ0M68AD0kgZU+z2UFLq1v3mKKQyx0PPaJfGN6p/TEODmMfRV9S3/bA6HEYwqAg03BwxsA016VEQAKXDpQCAVOihJr0riUgfZ3xeI5bVI/nSqgP2lrZ1MdaWpfe94z3srj+qYn9Ok+hMwwwBY2bAYyiC05IXUuaXDzMDwIoUVIFvRuJQh9nLGYeTt6MZNJtgV7kxuSKQtN0v580i+kNxdolZf9aoAEwEoAA1qVN1FQgcDjv/7UkQHAfFcDtPPbGAIJqHZ8O2kAEUUL0ouYSCQtYmnQc08CJizbxddsYt4zdfOtWn/AkAaDUR1hoKCimqMUadQ48yPPLfzJgUHSwsFLectFFrlPYoa+datbyBJQU2nFj2iM2w4xHoiCNHpYcjZ32ZKQ4v5orZgbPntCaQqmDzRE2xjbw4JTYTU4+jd54TvCyTr98N1dU280yj6NEQYaIqS9rSy/MeAnpTuVRzI9wmab99NLFn72XyTePMBY1VVEgADb3UMrngQ6jBH1ZJK7KyF//tSZAkN8ZUT0hOaYDAgohogbykGBfRDRA5tgMhhhSlBrJgJYZYRYQjMlyYch3PherhKCNXFTX4qQo53pdokAt+REGtJrlsaygCG4GHv5IXpYQ4tQdsfRSSIidofbsw2/Pe57fuMXU00rLzn6M0gDAoYvSG1npexWOoGEwsCQTicQRn2HTdvXlOJasQOr6QItnufZ64VOnNknaWTGNKkFkwOfgwpAxknW4ratCIVBclskctsjABlYnOBJj1gpYWKTksHhOVQROD4v5DZ86N1W+n/+1JkEYHxoxPb6wwwTBziCiBvJgQF3E9ELrzHCG2GKIGsJAhgmIgUCNbgDe7uS7hH0/h7bUafNGoqp9iIWtaij6wlJVmY+EtQyA/up5WTkoyKmHQlwGbqJDyOlA1q2BgCsxnxlP0E9Ryw7OM3CaOLCq+DAXt/B2TVlfnW8OeN8nmfRcdnUeqDS7SoSFCFjZqRqtRoCSEd61YQQ9ilOPmQ2G9zkgkMHiJNVChFV5wyDZkDQRVLE4AguBkDYOLOacl5OewAGuMGkOXp36gd6O+dOf/7UmQaDPF2D9GDnEggHCFqUGsmAgXYOU5N5YCAbgbowbwYGIJSp93NCR5qakkXq0rRTKYBDC1i8y4wP+AHd/RymebdY8u7asKwL9gX9ccPMxPFs2PT45s1a0Dng8UMnyzjiSsVFs16v0AAwGYMK/Racd3W4xdufSQElM6PCkamm3wrWvQqQgAD2gQMmK42uuBkDBXkEBNt5LzRXnpcujUQizFCJEpRFPa2J972mROD45pC+nQbpN9gNPUP9xS4/LAd3P1tOMrOsNmroUFD7bXW//tSZCWM8YYQ0hOPSNAaQTowaywARhhDSi5pgJBehOiBrDAFfA4C+TVxVPS3IsKer6yxqQfBAX/Uack5DBFswfzor5hjMDd2cHgmCcAvg0AGut6/rPiSSNM5lEA7NbFpciblzqvQmNxP50GhdTANsko7s5z5ZQOXQJLXUxbdY0rJroMVxLBQkoXKJdZusW2f1Di/Xv/oarWz2rK4sDgABAAAfnCOok12A2eEgJIRKJhH/yS6pHcIqbkOJwEBqQKdCljGYHc+6dJgLFSEeHZEtp//+1JkMg0RfRPSi5pgMBeg2mlhIxMFSDFMLmkg4GIBrPRhJAZ1jkKJg+FA6qz6Go/+sCFRt220AKSAxhORocLAYJJfe4v1+wqlSzsa7O5C833w0C5JVFeAVSLflZVhLHsRDqNxwMz+NYcRQHEEroehNV1eydQ6n8uDq4GMAABQABo2C6MVAAEJK4X049f////xryYBxMOLKIyKTgMiZes0WmxRXpRYGNn1ykTtQkeBXrSDcqOyQVHtYDQMhEHgVBYIgCCjh5SQDRiPxuWnUBQRif/7UmRDjTFxENKDmmAwGeCLXSUsAYXAT05OMEVAWQXqIYYIUnzeC//6lTX0vM4QY2klQ9IRvrF85o2Ogv+OpUBqyudqtw2CzkNvaWeo5rbNo2j2/LXiTCAYUyZn2mitVDSAs1tWVtPiqxsMgsV8qPqc0uTRAXH9TRbxXS7ildCPRevJ91pMWVKuBaTVzHyhP3fy6FHBQyZzGIAKkBpevkzZxgKzAw8mFlokACAx4w0bBFD5AAmHfWoQDs0uNQpwJDZnYjQK4i1VL271JpaK3Hhd//tSRFOP0RYMUgOaYBIh4XpwbywCRIw/RA4xBwCRiGmFwwjYwmk08OA9VKycjQH0Oz8CFMZWhV///x9J1ap1F4DCmlJhInNEjMlezhAOBrf1Mmf5QAKlEAGONgAGwLpypKamMhAqyylicPhiSKI3oAZFRyOpzaoInV71KdnQ6/TJhJpn/YOD1x+ix1kQGbJnvs4YSJgdFnPuc3IIu/qoNwGYRoiNx9a4LHpAoqAaL5tpHSlRALg1ks3JBsVjZTXzWyqx0FyRla1/iKHj5g02BVP/+1JkYwDxhR7RC4wTMBjhCiBpIhUGOHFVrZhHYGaCaIGtCAiDYbAVqa+5PjJQidgohyyJanp1ETZ9xrG1WMZF8GTDxe1AGqvANG770QYzWIWhSMnySxxZEcbFa6Z/so/GLlzrv3iQ4AlnqAABgCzoDRVLlgIEBOoILNDnykGP//9KMURM6WPzkj8yIbQMU0B8+DUYjgpuItTmBv2/tp0yoQFkTGr0/cxPgxNsbHgCAwLy0bbU0MbuKcdcT5sYjA4PAIKA2v/7v9IFumsulFAyEv/7UmRvDxFcDtEDumAQGmFqAG8mBAXYSUQObSFAaAQq9YMYVNDsoE4siQfw0XIa+NbscM7ENA4cmpxpZCr9K0gJ1xuWSACXELHPaI1PVY9YaPmuPt7mcl4gEBlysm3VIDrL//wqA4Zsl9+9NCBANrdi4p7w6wU2RXMFAKV4VaoeRwcDU5RUzdW3LGiWSAuCwuSYwhEUCoB6nTSTogPAfDAO/ObRhCIwSCQF3/7ThkaD41J/7/Gg8Okx8cb//8YG44SIDcdOGn///mFXLkQBorZd//tSRH4BEQoM0IObSBIloXpQb0wCBHg5cbTBgDCThO22nhAHLHq/p69oBAGAAc1QXuhDWYJCMEh8ZCGyAyKhTGCXs40E8zDcEBc9TFoRLSfu2vfUGhssb8Q0+x7IYYlRYaFbqvmZ/+12PbcfX3dxNeaJIn3oV/////+sfg8sbouOf/qJgQ2EAIoW4XIynNOqGArosJ8+fWy9ehUFXA0HC0Su9vEXWdCmlShAAKwJASHZWSSawZOtLly62rVohKGiwNawV1HhL1HuCtVMQU1FMy7/+1JEjIADPkxTTmzgAmWH+53HrACEKCVGvPCAAI6E6meYEAAxMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==",
	coin: "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAPAAANDgAfHx8fHx8vLy8vLy8vPz8/Pz8/T09PT09PT19fX19fX19vb29vb29/f39/f39/j4+Pj4+Pj5+fn5+fn6+vr6+vr6+/v7+/v7+/z8/Pz8/P39/f39/f3+/v7+/v7+////////8AAAAATGF2YzU4LjU0AAAAAAAAAAAAAAAAJAM8AAAAAAAADQ4LKAsOAAAAAAAAAAAAAAAAAAAAAP/7UEQAAAEwAN5tAGAMJCFaW6CMAAVQUWQYmAAArSPqQwrQANHI2ibW4GgAEAgCAIBcHwfgmD4Pn4PwQd1AgD7/4Ph//+IAQDAfIOqIAAMAABKscZjHGMAAEcD4PggCAIAgCYP6QQDH//hj//4IEjdT22ayUukCScO4L8hxwjgN6CCHoiy0WRZtFRlztD/55f8zI3/+3X//YgKiMralz+FvHiBvKYgIkUVJIaG9l///////r/NvpGn1frnH+ukf+v9D/zjXX6wMViBpIAxaRIL/+1JEBgABXzPe7xigDCwlS23knAGFQM9zpJjhcKgkafUgCtC5eGcq3iijloYHZv8xTZ+MH///v///m6P//lFP9yP/H3f/2lDUBIFiVsoniBM0ebRXGMcV9RAj/9zFtm2e//////TKFv/BL/hj/nQW/107EFYwRKAIjoBVKNNQqNSMTK+Esw/+npxMX//9v///t3//5P+vd/wWcbtZBFABAADKMKCKDIGCDpIGpu7VBG3b/V9U/5Ughv//4v//+Yb//+Am3I3sm2aQImrZwDm0OP/7UkQGgAFTSNCBNFOAKifbnRQC04U4+W2igPiwqZ7o4GodwBy2GTKj//nBkO//6////UoOaHf/8WP//6lv//5E2/3/wo1wCKYKKDChQiLlYOGHjhUXDipiVP9rff9Wr9Bv//4j//3wY3/gW/ffQXiABxgJHhqhISIcSOHhho1uHaJpORf+FeULf/+seCM7//N4nb/lF+1Awo62SIpReI4tskfVx+AAfyn+9PXXf//1/f/poGe3/+PBH///FP/ghVLbKwlGKJIgGDM4NpA8u8Qr//tSRAiAAXdI1egmUGQrKRpbUAWWBYEhT6AZoZCsGe38FhwmmXlAAzr39vTi5v/+n///xkLP//6g3P//+L///8XunJEyABeRdyktMryZM01ukdJxNeBhU1mr/f6f+0wwF///OBn+n+nG///41w5JIgxEGEmBcHwiAkzzcdGbxqwR26P9D0+cb//t3///nH///Waf//zv//+cZnhoZgULRG2SGncMWFoVXjZpUqTpiLf/0+3//2///3x49uv/8qEn9Ff/kEglsXJNyZ2KngY18O7/+1JEBo8BOEjNAHQ6oCppGfAOh3AFrPcwA1FOALukbHSAnja/90PeZyhb//vT///lAb//+gp///q///8TFkMQYQx0JhejkAY2Bj7Vu215+np//ym/6Hf6z3EQPb//8Hv//TlX///iAsRJCjrNNnTkMv0FuvAxFGXL/r+ainDiI//2NW///+RBu+3/+gXR6/+ubyp7/kJtbdAxJGikRNi486VcoWMrMF328Bu/9fx/1+cz1/B/6GPE///0AG//68Qp///KMhdtvhRtaEkBnuIuHf/7UkQGAAFYSFfooBcMK4kaGQ6FcAUQ+ywB6O4ApKRnAD0pwEuYIuwqZMKp/q7vbdgWrevrf3+h///0Af//4Nv//4I//QDMESdeDsAoQGrmohuNwAllR//9TSt//N/9v++gb///AX+v/xrf//xg4YgCo95QmSqGv8GCll5S/+tf1LfT/lv/Wv/PAwe///Hgs///4nLf9ZMYggO6uagoqkOp36IwVt5S/X3r/b//t///8Jhf//8oHj///lS3//6kZ9UXfD8YXahtgaWMHgaXFioH//tSRAgAIWw+V2igLwwtaRtNGCWNhSDRV6KA/DCbJGwwUB+GTDcZZmf701Kcijn6upXKvvp+FN//+sV//9mEW/6Lv9/RhaIzEQ+tZuAyXmWt7mv+V1X5Xnqv//svzf/2n//ozoLgrf9OvGt///HILLdWJrbg2QMulyyiqsz+Fzt+q9U2Ui+/9FKUpnslgt///KiKd+rT/y4v1+ogaTK4GBhF1kEVFGFvC9v6+/Un//6flG///hC///46X///j7oJuSMSyRgAAfHTHQ1RrZmTLnn/+1JECQEBWDPR6WMUTDCJGbUbSnAFOPcoAeTsQK6kbDRQF4YFLUqUZY64J+stxFM4bbdKXPk///wX//+GVgAiLiu9nNlEX74Gh/j4EiTxrMx36f23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",
	hit: "data:audio/mp3;base64,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",
};
// Pre-decode all audio buffers once via AudioContext
let _actx = null;
const SFX_BUFS = {};
function getActx() {
	if (!_actx) {
		_actx = new (
			window.AudioContext || window.webkitAudioContext
		)();
		// Unlock: play 1-frame silent buffer immediately on creation
		try {
			const b = _actx.createBuffer(1, 1, _actx.sampleRate);
			const s = _actx.createBufferSource();
			s.buffer = b;
			s.connect(_actx.destination);
			s.start(0);
		} catch (e) {}
	}
	return _actx;
}
function b64ToArrayBuffer(b64) {
	// Extract raw base64 from data URI, decode to ArrayBuffer without fetch
	const raw = b64.split(",")[1];
	const bin = atob(raw);
	const buf = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
	return buf.buffer;
}
async function preloadSFX() {
	const actx = getActx();
	// Decode MP3 files from base64
	for (const [k, uri] of Object.entries(SFX_DATA)) {
		try {
			const ab = b64ToArrayBuffer(uri);
			SFX_BUFS[k] = await actx.decodeAudioData(ab);
		} catch (e) {
			console.warn("SFX load failed:", k, e);
		}
	}
	// click buffer pre-rendered at page load (see top-level IIFE)
}
function playsfx(name, opts = {}) {
	if (!sd.sound) return;
	const buf = SFX_BUFS[name];
	if (!buf) return;
	const actx = getActx();
	const play = () => {
		const src = actx.createBufferSource();
		src.buffer = buf;
		src.loop = opts.loop || false;
		const gain = actx.createGain();
		gain.gain.value = opts.vol != null ? opts.vol : 1;
		src.connect(gain);
		gain.connect(actx.destination);
		src.start(0);
		return src;
	};
	// If suspended: resume first (async), play in .then()
	// resume() called within user gesture = .then() still in gesture context
	if (actx.state === "running") return play();
	return actx.resume().then(play);
}
// Jetpack loop: start/stop a looping node
let _jetSrc = null,
	_jetGain = null;
function startJetSFX() {
	if (!sd.sound || _jetSrc) return;
	const buf = SFX_BUFS.jet;
	if (!buf) return;
	const actx = getActx();
	if (actx.state === "suspended") actx.resume();
	_jetSrc = actx.createBufferSource();
	_jetSrc.buffer = buf;
	_jetSrc.loop = true;
	_jetGain = actx.createGain();
	_jetGain.gain.value = 0.55;
	_jetSrc.connect(_jetGain);
	_jetGain.connect(actx.destination);
	_jetSrc.start(0);
}
function stopJetSFX() {
	if (!_jetSrc) return;
	try {
		_jetSrc.stop();
	} catch (e) {}
	_jetSrc = null;
	_jetGain = null;
}
// Call preload after first user interaction to avoid autoplay policy
let _sfxReady = false;

// ── Synthesized sounds (no file needed) ────────────────────────
function synthClick() {
	// Play pre-rendered buffer via playsfx — same path as all other sounds
	// This is the most reliable approach on iOS Safari
	playsfx("click", { vol: 1.0 });
}
function synthEnemyHit() {
	if (!sd.sound) return;
	const actx = getActx();
	const doPlay = () => {
		const t = actx.currentTime + 0.001;
		const o = actx.createOscillator(),
			g = actx.createGain();
		o.type = "square";
		o.frequency.setValueAtTime(220, t);
		o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
		g.gain.setValueAtTime(0.35, t);
		g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
		o.connect(g);
		g.connect(actx.destination);
		o.start(t);
		o.stop(t + 0.2);
		const bufLen = actx.sampleRate * 0.08;
		const nb = actx.createBuffer(1, bufLen, actx.sampleRate);
		const nd = nb.getChannelData(0);
		for (let i = 0; i < bufLen; i++)
			nd[i] = (Math.random() * 2 - 1) * 0.5;
		const ns = actx.createBufferSource(),
			ng = actx.createGain();
		ns.buffer = nb;
		ng.gain.setValueAtTime(0.18, t);
		ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
		ns.connect(ng);
		ng.connect(actx.destination);
		ns.start(t);
	};
	if (actx.state === "running") {
		doPlay();
	} else {
		actx.resume().then(doPlay);
	}
}
function synthPowerup() {
	if (!sd.sound) return;
	const actx = getActx();
	const doPlay = () => {
		const t = actx.currentTime + 0.001;
		[
			[330, 0],
			[550, 0.1],
			[880, 0.2],
		].forEach(([freq, delay]) => {
			const o = actx.createOscillator(),
				g = actx.createGain();
			o.type = "sine";
			o.frequency.setValueAtTime(freq, t + delay);
			o.frequency.exponentialRampToValueAtTime(
				freq * 1.06,
				t + delay + 0.09,
			);
			g.gain.setValueAtTime(0, t + delay);
			g.gain.linearRampToValueAtTime(0.25, t + delay + 0.01);
			g.gain.exponentialRampToValueAtTime(
				0.001,
				t + delay + 0.1,
			);
			o.connect(g);
			g.connect(actx.destination);
			o.start(t + delay);
			o.stop(t + delay + 0.11);
		});
	};
	if (actx.state === "running") {
		doPlay();
	} else {
		actx.resume().then(doPlay);
	}
}
function ensureSFX() {
	if (_sfxReady) return;
	_sfxReady = true;
	preloadSFX();
}

let pausedFromOptions = false;

let camX = 0,
	shakeX = 0,
	shakeY = 0,
	shakeIntensity = 0;
const CAM_LEAD = () => W * 0.3;
const GY = () => H * 0.8;
const CANNON_WX = () => p(52);

// Game vars
let distM = 0,
	coins = 0;
let jetFuel = 1,
	maxFuel = 1,
	jetOn = false;
let shield = 0;
let _pmFullGlobal = false; // partagé drawHUD ↔ robot.draw
let _pmFullHyst = 0;       // hysteresis : reste true N frames après PM_FULL=false
let robot = null;
let stars = [],
	enemies = [],
	boosts = [],
	rings = [],
	chests = [],
	meteors = [],
	windZones = [],
	pfx = [],
	floatTexts = [];
let nextStarWX = 0,
	nextEnemyWX = 0,
	nextBoostWX = 0,
	nextRingWX = 0,
	nextChestWX = 0,
	nextMeteorWX = 0;
let deadTimer = 0,
	pendingDist = 0,
	resData = {};

// COMBO system
let combo = 0,
	comboTimer = 0,
	comboMax = 0;
const COMBO_WINDOW = 170; // frames to maintain combo
const COMBO_MULT = [1, 1, 1.5, 2, 2.5, 3, 4, 5]; // index = combo count capped at 7

// Setup flow
let setupLang = "en";
let nameSetupActive = false;

// ══════════════════════════════════════════
//  BACKGROUND THEMES
// ══════════════════════════════════════════
// Theme index = Math.floor(distM / 2000) % BG_THEMES.length
// Each theme defines sky gradient, ground color, building colors, accent, star tint
const BG_THEMES = [
	{
		// 0 — Ville nocturne (default)
		name: "NUIT",
		sky: ["#060518", "#131050", "#1e1660"],
		bldFar: "#12102e",
		bldNear: "#0e0b25",
		groundTop: "#1c1848",
		groundBot: "#0b0920",
		groundLine: "rgba(65,85,200,0.5)",
		hasMoon: true,
		moonCol: ["#cdc0a5", "#8f7090"],
		starTint: "#fff",
	},
	{
		// 1 — Désert / coucher de soleil
		name: "DÉSERT",
		sky: ["#1a0808", "#6b1f00", "#d45000"],
		bldFar: "#3a1a00",
		bldNear: "#2a1000",
		groundTop: "#4a2800",
		groundBot: "#1a0a00",
		groundLine: "rgba(255,120,30,0.6)",
		hasMoon: false,
		starTint: "#ffcc88",
		drawExtra(sy) {
			// Dunes
			ctx.fillStyle = "#3a1800";
			for (let i = 0; i < 6; i++) {
				const dx =
					((((i * W * 0.38 - camX * 0.08) % (W * 2.5)) +
						W * 2.5) %
						(W * 2.5)) -
					W * 0.2;
				ctx.beginPath();
				ctx.ellipse(
					dx,
					sy + shakeY,
					p(110 + i * 20),
					p(30 + i * 5),
					0,
					Math.PI,
					Math.PI * 2,
				);
				ctx.fill();
			}
			// Big sun/moon on horizon
			const sx2 = W * 0.75 - camX * 0.005,
				sy2 = GY() - p(55) + shakeY;
			const sg = ctx.createRadialGradient(
				sx2,
				sy2,
				p(2),
				sx2,
				sy2,
				p(48),
			);
			sg.addColorStop(0, "rgba(255,220,50,0.95)");
			sg.addColorStop(0.5, "rgba(255,120,10,0.7)");
			sg.addColorStop(1, "rgba(200,40,0,0)");
			ctx.fillStyle = sg;
			ctx.beginPath();
			ctx.arc(sx2, sy2, p(48), 0, Math.PI * 2);
			ctx.fill();
		},
	},
	{
		// 2 — Forêt / jungle
		name: "JUNGLE",
		sky: ["#020a04", "#04200a", "#082e12"],
		bldFar: "#051a08",
		bldNear: "#031208",
		groundTop: "#042010",
		groundBot: "#010a04",
		groundLine: "rgba(30,160,60,0.5)",
		hasMoon: true,
		moonCol: ["#a8d8a0", "#507a50"],
		starTint: "#aaffaa",
		drawExtra(sy) {
			// Trees silhouettes
			ctx.fillStyle = "#041a08";
			for (let i = 0; i < 14; i++) {
				const tx =
					((((i * p(90) + 20 - camX * 0.15) % (W * 3)) +
						W * 3) %
						(W * 3)) -
					p(40);
				const th = p(60 + Math.sin(i * 2.3) * 30),
					tw = p(28 + Math.sin(i * 1.7) * 10);
				// trunk
				ctx.fillRect(tx - p(4), sy - th + shakeY, p(8), th);
				// canopy
				ctx.beginPath();
				ctx.arc(tx, sy - th + shakeY, tw, 0, Math.PI * 2);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(
					tx - p(14),
					sy - th + p(18) + shakeY,
					tw * 0.7,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.beginPath();
				ctx.arc(
					tx + p(14),
					sy - th + p(20) + shakeY,
					tw * 0.65,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}
		},
	},
	{
		// 3 — Espace / cosmos
		name: "COSMOS",
		sky: ["#000005", "#05000f", "#080018"],
		bldFar: "#0a0520",
		bldNear: "#060012",
		groundTop: "#120828",
		groundBot: "#04010e",
		groundLine: "rgba(160,80,255,0.6)",
		hasMoon: false,
		starTint: "#eeddff",
		drawExtra(sy) {
			// Nebula clouds
			const nc = [
				["rgba(80,0,160,0.12)", W * 0.3],
				["rgba(0,60,160,0.1)", W * 0.7],
				["rgba(120,0,80,0.09)", W * 0.15],
			];
			nc.forEach(([col, nx]) => {
				const gx = nx - camX * 0.003;
				const ng = ctx.createRadialGradient(
					gx,
					H * 0.3,
					p(10),
					gx,
					H * 0.3,
					p(160),
				);
				ng.addColorStop(0, col);
				ng.addColorStop(1, "transparent");
				ctx.fillStyle = ng;
				ctx.fillRect(0, 0, W, H * 0.7);
			});
			// Distant planet
			const px = W * 0.2 - camX * 0.004,
				py = H * 0.25 + shakeY;
			const pg2 = ctx.createRadialGradient(
				px - p(12),
				py - p(12),
				p(2),
				px,
				py,
				p(38),
			);
			pg2.addColorStop(0, "rgba(180,140,255,0.7)");
			pg2.addColorStop(0.7, "rgba(80,40,160,0.5)");
			pg2.addColorStop(1, "transparent");
			ctx.fillStyle = pg2;
			ctx.beginPath();
			ctx.arc(px, py, p(38), 0, Math.PI * 2);
			ctx.fill();
			// Ring around planet
			ctx.strokeStyle = "rgba(160,100,255,0.3)";
			ctx.lineWidth = p(3);
			ctx.beginPath();
			ctx.ellipse(px, py, p(56), p(14), -0.3, 0, Math.PI * 2);
			ctx.stroke();
		},
	},
	{
		// 4 — Glacier / arctique
		name: "ARCTIQUE",
		sky: ["#040e1a", "#082030", "#0e3050"],
		bldFar: "#081828",
		bldNear: "#051018",
		groundTop: "#102844",
		groundBot: "#040e1a",
		groundLine: "rgba(100,200,255,0.5)",
		hasMoon: true,
		moonCol: ["#dde8f5", "#90aac0"],
		starTint: "#ccddff",
		drawExtra(sy) {
			// Ice sheets / icebergs
			ctx.fillStyle = "#0e2840";
			for (let i = 0; i < 8; i++) {
				const ix =
					((((i * p(130) - camX * 0.12) % (W * 3)) +
						W * 3) %
						(W * 3)) -
					p(60);
				const ih = p(20 + Math.sin(i * 1.9) * 15);
				ctx.beginPath();
				ctx.moveTo(ix, sy + shakeY);
				ctx.lineTo(ix + p(20), sy - ih + shakeY);
				ctx.lineTo(ix + p(55), sy - ih * 0.6 + shakeY);
				ctx.lineTo(ix + p(80), sy - ih * 0.9 + shakeY);
				ctx.lineTo(ix + p(100), sy + shakeY);
				ctx.closePath();
				ctx.fill();
				// Ice highlight
				ctx.fillStyle = "rgba(150,210,255,0.15)";
				ctx.beginPath();
				ctx.moveTo(ix + p(18), sy - ih + shakeY);
				ctx.lineTo(ix + p(22), sy - ih + shakeY);
				ctx.lineTo(ix + p(25), sy - ih + p(8) + shakeY);
				ctx.closePath();
				ctx.fill();
				ctx.fillStyle = "#0e2840";
			}
			// Aurora borealis
			const aurY = H * 0.12;
			[
				["rgba(0,255,120,0.07)", 0],
				["rgba(0,180,255,0.06)", W * 0.4],
				["rgba(120,0,255,0.05)", W * 0.7],
			].forEach(([col, ax]) => {
				const ag = ctx.createLinearGradient(
					ax - camX * 0.01,
					aurY,
					ax - camX * 0.01,
					aurY + H * 0.3,
				);
				ag.addColorStop(0, col);
				ag.addColorStop(1, "transparent");
				ctx.fillStyle = ag;
				ctx.fillRect(0, aurY, W, H * 0.3);
			});
		},
	},
];

let bgThemeIdx = 0; // set in startGame/endGame
let bgTransitionAlpha = 0; // 0=none, fading in new theme

function getBgTheme() {
	return BG_THEMES[bgThemeIdx % BG_THEMES.length];
}
function getNextThemeIdx() {
	return Math.floor(distM / 3000) % BG_THEMES.length;
}

let bgStars = [],
	bld1 = { arr: [], span: 1 },
	bld2 = { arr: [], span: 1 };
let _bgFadeAlpha = 0;    // 0=transparent → 1=noir total
let _bgFadeDir   = 0;    // 0=idle, 1=vers noir, -1=vers transparent
let _bgNextIdx   = 0;    // thème en attente pendant le fade
function initBg() {
	_skyGrad = null;
	_moonGrad = null;
	// If W is 0 (page not yet laid out), defer until next frame
	if (!W || W < 10) {
		setTimeout(initBg, 50);
		return;
	}
	bgStars = Array.from({ length: 55 }, () => ({
		x: Math.random() * W * 3,
		y: Math.random() * (H * 0.65),
		r: Math.random() * p(1.4) + p(0.25),
		a: 0.3 + Math.random() * 0.7,
	}));
	bld1 = mkBld(p(38), p(85), W * 6);
	bld2 = mkBld(p(52), p(145), W * 5);
	bgThemeIdx = 0;
}
function mkBld(minW, maxH, span) {
	// Guard: W may be 0 on first mobile load before layout is ready
	if (!span || span <= 0 || !minW || minW <= 0)
		return { arr: [], span: 1 };
	const arr = [];
	let x = 0;
	while (x < span) {
		const w = minW + Math.random() * minW * 0.8,
			h = p(20) + Math.random() * maxH;
		arr.push({ wx: x, w, h, seed: Math.floor(x * 137.5 + h * 31) });
		x += w + Math.random() * p(6);
		if (w <= 0) break; // prevent infinite loop if SC=0
	}
	if (!arr.length) return { arr: [], span: 1 };
	const totalSpan =
		arr[arr.length - 1].wx + arr[arr.length - 1].w;
	return { arr, span: Math.max(1, totalSpan) };
}
function sx(wx) {
	return wx - camX + shakeX;
}
let _skyGrad = null,
	_skyH = 0,
	_skyTheme = "";
let _moonGrad = null,
	_moonR = 0;

// ── Seed helper ──────────────────────────────────────────────
const _bySeed = (seed, n) => Math.abs(seed) % n;

// ── Bâtiments thématiques — définis hors drawBg (perf + lisibilité)
function _drawBld(b, dx, bsy, tIdx, col) {
	const bTop = bsy - b.h + shakeY;
	const bBot = bsy + shakeY;
	const s = b.seed || 0;

	if (tIdx === 0) {
		// ── NUIT — gratte-ciel avec fenêtres lumineuses ────────
		ctx.fillStyle = col;
		ctx.fillRect(dx, bTop, b.w + 1, b.h + p(4));
		// Antenne
		ctx.fillRect(dx + b.w/2 - p(1.5), bTop - p(18), p(3), p(20));
		// Lumière d'antenne rouge
		ctx.fillStyle = "rgba(255,80,80,0.85)";
		ctx.beginPath(); ctx.arc(dx+b.w/2, bTop-p(17), p(2.5), 0, Math.PI*2); ctx.fill();
		// Fenêtres
		const wRows = Math.min(6, Math.floor(b.h/p(14)));
		const wCols = Math.min(4, Math.max(1, Math.floor(b.w/p(14))));
		for (let r=0;r<wRows;r++) for (let c=0;c<wCols;c++) {
			if (_bySeed(s+r*7+c*13,4)>0) {
				const wCol = _bySeed(s+r+c,3)===0?"rgba(255,232,138,0.65)":_bySeed(s+r+c,3)===1?"rgba(136,204,255,0.65)":"rgba(255,153,102,0.65)";
				ctx.fillStyle = wCol;
				ctx.fillRect(dx+p(5)+c*p(14), bTop+p(5)+r*p(14), p(7), p(9));
			}
		}

	} else if (tIdx === 1) {
		// ── DÉSERT — sable doré, dômes et créneaux ────────────
		// Corps en grès doré
		ctx.fillStyle = _bySeed(s,3)===0 ? "#b06820" : _bySeed(s,3)===1 ? "#a05c18" : "#c07828";
		if (_bySeed(s,2)===0) {
			// Tour à dôme
			const dH = b.w * 0.38;
			ctx.fillRect(dx + b.w*0.1, bTop + dH, b.w*0.8, b.h - dH + p(4));
			// Dôme doré
			ctx.fillStyle = "#d4a044";
			ctx.beginPath();
			ctx.ellipse(dx+b.w/2, bTop+dH, b.w/2, dH, 0, Math.PI, 0, true);
			ctx.fill();
			// Croissant sur le dôme
			ctx.fillStyle = "#f0c060";
			ctx.beginPath(); ctx.arc(dx+b.w/2, bTop+p(4), p(5), 0, Math.PI*2); ctx.fill();
		} else {
			// Bâtiment plat avec créneaux
			ctx.fillRect(dx, bTop+p(8), b.w+1, b.h + p(4));
			// Créneaux visibles
			ctx.fillStyle = "#d4922a";
			const cN = Math.max(2, Math.floor(b.w/p(20)));
			for(let ci=0;ci<cN;ci++)
				ctx.fillRect(dx+ci*(b.w/cN)+p(2), bTop, b.w/cN - p(4), p(14));
			// Arche d'entrée
			ctx.fillStyle = "rgba(0,0,0,0.55)";
			ctx.beginPath();
			ctx.arc(dx+b.w/2, bBot, p(11), Math.PI, 0, true);
			ctx.fill();
		}

	} else if (tIdx === 2) {
		// ── JUNGLE — temples en gradins de pierre ─────────────
		const steps = 1 + _bySeed(s,3);  // 1, 2 ou 3 niveaux
		// Corps de pierre grise-verte
		ctx.fillStyle = _bySeed(s,2)===0 ? "#4a6040" : "#3a5030";
		for (let st=0; st<=steps; st++) {
			const ratio = (steps-st) / (steps+1);
			const sw = b.w * (0.4 + ratio*0.6);
			const sh = b.h / (steps+1);
			ctx.fillRect(dx+(b.w-sw)/2, bsy-(sh*(st+1))+shakeY, sw, sh+p(2));
		}
		// Végétation verte vive sur chaque gradin
		ctx.fillStyle = "#2a8a30";
		for (let st=0;st<=steps;st++) {
			const ratio = (steps-st) / (steps+1);
			const sw = b.w * (0.4 + ratio*0.6);
			const gY = bsy - (b.h/(steps+1))*(st+1) + shakeY;
			for(let gi=0;gi<3;gi++) {
				ctx.beginPath();
				ctx.arc(dx+(b.w-sw)/2+sw*0.2+gi*(sw*0.3), gY, p(6+gi*2), 0, Math.PI*2);
				ctx.fill();
			}
		}
		// Halo de mousse sur les bords
		ctx.fillStyle = "rgba(30,120,40,0.35)";
		ctx.fillRect(dx+(b.w-b.w*0.4)/2-p(3), bTop-p(5), b.w*0.4+p(6), p(8));

	} else if (tIdx === 3) {
		// ── COSMOS — tours futuristes avec liseré néon ─────────
		// Corps sombre avec léger reflet
		ctx.fillStyle = col;
		const taper = b.w * 0.18;
		ctx.beginPath();
		ctx.moveTo(dx+taper, bTop);
		ctx.lineTo(dx+b.w-taper, bTop);
		ctx.lineTo(dx+b.w, bBot);
		ctx.lineTo(dx, bBot);
		ctx.closePath(); ctx.fill();
		// Liseré néon sur les arêtes
		const nCol = _bySeed(s,3)===0?"#00ffcc":_bySeed(s,3)===1?"#cc44ff":"#00aaff";
		ctx.strokeStyle = nCol; ctx.lineWidth = p(1.5);
		ctx.globalAlpha = 0.8;
		ctx.beginPath();
		ctx.moveTo(dx+taper, bTop); ctx.lineTo(dx, bBot);
		ctx.moveTo(dx+b.w-taper, bTop); ctx.lineTo(dx+b.w, bBot);
		ctx.stroke();
		ctx.globalAlpha = 1;
		// Dôme lumineux au sommet
		ctx.fillStyle = nCol.replace(")", ",0.4)").replace("rgb","rgba").replace("#","rgba(").replace("rgba(","rgba(").replace("00ff","0,255,").replace("cc44","204,68,").replace("00aa","0,170,").replace("ff)","255,0.35)");
		// Simpler: juste un arc coloré
		ctx.fillStyle = nCol;
		ctx.globalAlpha = 0.5;
		ctx.beginPath(); ctx.arc(dx+b.w/2, bTop, b.w*0.22, Math.PI, 0, true); ctx.fill();
		ctx.globalAlpha = 1;
		// Fenêtres hexagonales (petits carrés en quinconce)
		ctx.fillStyle = nCol;
		ctx.globalAlpha = 0.7;
		for(let ri=0;ri<3;ri++) for(let ci=0;ci<2;ci++)
			ctx.fillRect(dx+b.w*0.25+ci*b.w*0.35+(ri%2)*b.w*0.05, bTop+b.h*0.2+ri*b.h*0.2, p(4), p(5));
		ctx.globalAlpha = 1;

	} else {
		// ── ARCTIQUE — bâtiments gelés avec neige épaisse ─────
		// Corps bleu-gris
		ctx.fillStyle = col;
		ctx.fillRect(dx, bTop+p(12), b.w+1, b.h + p(4));
		// Capuchon de neige blanc épais
		ctx.fillStyle = "#e8f4ff";
		ctx.beginPath();
		ctx.moveTo(dx-p(5), bTop+p(14));
		ctx.lineTo(dx+b.w/2, bTop-p(14));
		ctx.lineTo(dx+b.w+p(5), bTop+p(14));
		ctx.closePath(); ctx.fill();
		// Stalactites de glace
		ctx.fillStyle = "rgba(180,220,255,0.75)";
		const icicleN = Math.max(2, Math.floor(b.w/p(14)));
		for(let ii=0;ii<icicleN;ii++) {
			const ix = dx+p(6)+ii*(b.w-p(12))/icicleN;
			const ih = p(6 + _bySeed(s+ii*5,8));
			ctx.beginPath();
			ctx.moveTo(ix, bTop+p(14));
			ctx.lineTo(ix+p(3), bTop+p(14)+ih);
			ctx.lineTo(ix+p(6), bTop+p(14));
			ctx.closePath(); ctx.fill();
		}
		// Reflet bleu sur la façade
		ctx.fillStyle = "rgba(150,210,255,0.18)";
		ctx.fillRect(dx+p(4), bTop+p(14), b.w*0.35, b.h*0.5);
	}
}

function drawBg() {
	// Check if theme should change
	const wantIdx = getNextThemeIdx();
	// Dip-to-black : fondu vers noir → changer thème → éclaircir
	if (wantIdx !== bgThemeIdx && _bgFadeDir === 0 && gs === "flying") {
		_bgNextIdx = wantIdx;
		_bgFadeDir = 1;   // commencer le fondu vers noir
	}
	if (_bgFadeDir === 1) {
		_bgFadeAlpha = Math.min(1, _bgFadeAlpha + 0.025); // ~40f vers noir
		if (_bgFadeAlpha >= 1) { bgThemeIdx = _bgNextIdx; _bgFadeDir = -1; }
	} else if (_bgFadeDir === -1) {
		_bgFadeAlpha = Math.max(0, _bgFadeAlpha - 0.015); // ~67f vers transparent
		if (_bgFadeAlpha <= 0) _bgFadeDir = 0;
	}

	const th = getBgTheme();
	const sy = GY();

	// Sky gradient — cached
	const _skyKey = th.sky.join("|");
	if (!_skyGrad || _skyH !== H || _skyTheme !== _skyKey) {
		const sk = ctx.createLinearGradient(0, 0, 0, H * 0.85);
		sk.addColorStop(0, th.sky[0]);
		sk.addColorStop(0.45, th.sky[1]);
		sk.addColorStop(1, th.sky[2]);
		_skyGrad = sk;
		_skyH = H;
		_skyTheme = _skyKey;
	}
	ctx.fillStyle = _skyGrad;
	ctx.fillRect(0, 0, W, H);

	// Stars — single path batch
	ctx.fillStyle = th.starTint;
	ctx.beginPath();
	bgStars.forEach((s) => {
		const x =
			(((s.x - camX * 0.025) % (W * 3)) + W * 3) % (W * 3);
		if (x < W + 4) {
			ctx.globalAlpha = s.a;
			ctx.moveTo(x + s.r, s.y + shakeY);
			ctx.arc(x, s.y + shakeY, s.r, 0, Math.PI * 2);
		}
	});
	ctx.fill();
	ctx.globalAlpha = 1;

	// Moon
	if (th.hasMoon) {
		const mx = W * 0.74 - camX * 0.01,
			my = H * 0.16 + shakeY,
			mr = p(52);
		// Gradient must be centered at (mx,my) — recreated each frame (cheap, 1 call)
		const mg = ctx.createRadialGradient(
			mx,
			my,
			p(4),
			mx,
			my,
			mr,
		);
		mg.addColorStop(0, th.moonCol[0]);
		mg.addColorStop(0.6, th.moonCol[1]);
		mg.addColorStop(1, "rgba(0,0,0,0)");
		ctx.fillStyle = mg;
		ctx.beginPath();
		ctx.arc(mx, my, mr, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "rgba(35,15,55,0.42)";
		[
			[mx - p(12), my - p(8), p(13)],
			[mx + p(10), my + p(12), p(9)],
			[mx + p(1), my - p(18), p(6)],
		].forEach(([cx, cy, cr]) => {
			ctx.beginPath();
			ctx.arc(cx, cy, cr, 0, Math.PI * 2);
			ctx.fill();
		});
	}

	// Theme-specific extras — drawn every 2 frames to save GPU
	if (th.drawExtra && frame % 2 === 0) th.drawExtra(sy);

	// Far buildings — rectangles qui atteignent le sol
	ctx.fillStyle = th.bldFar;
	const off1 = bld1.arr.length ? (camX * 0.1) % bld1.span : 0;
	bld1.arr.forEach((b) => {
		for (const shift of [0, bld1.span, -bld1.span]) {
			const dx = b.wx - off1 + shift;
			if (dx > -b.w - 2 && dx < W + 2)
				// p(40) offset parallax + p(44) extension = bottom à sy+p(4) (sol)
				ctx.fillRect(dx, sy - p(40) - b.h + shakeY, b.w + 1, b.h + p(44));
		}
	});
	// Near buildings — thématiques
	const off2 = bld2.arr.length ? (camX * 0.22) % bld2.span : 0;
	bld2.arr.forEach((b) => {
		for (const shift of [0, bld2.span, -bld2.span]) {
			const dx = b.wx - off2 + shift;
			if (dx > -b.w - 2 && dx < W + 2)
				_drawBld(b, dx, sy, bgThemeIdx, th.bldNear);
		}
	});

	// Ground
	const gd = ctx.createLinearGradient(0, sy + shakeY, 0, H);
	gd.addColorStop(0, th.groundTop);
	gd.addColorStop(1, th.groundBot);
	ctx.fillStyle = gd;
	ctx.fillRect(0, sy + shakeY, W, H - sy);
	ctx.strokeStyle = th.groundLine;
	ctx.lineWidth = p(1.5);
	ctx.beginPath();
	ctx.moveTo(0, sy + shakeY);
	ctx.lineTo(W, sy + shakeY);
	ctx.stroke();

	// Theme transition — dip-to-black overlay
	if (_bgFadeAlpha > 0) {
		ctx.fillStyle = `rgba(0,0,0,${_bgFadeAlpha})`;
		ctx.fillRect(0, 0, W, H);
		// Nom du nouveau thème visible pendant le noir complet
		const a2 = Math.max(0, (_bgFadeAlpha - 0.7) / 0.3); // visible seulement > 70% noir
		if (a2 > 0) {
			ctx.globalAlpha = a2;
			ctx.fillStyle = "rgba(0,0,0,.5)";
			ctx.beginPath();
			ctx.roundRect(
				W / 2 - p(70),
				p(38),
				p(140),
				p(22),
				p(4),
			);
			ctx.fill();
			ctx.fillStyle = "#ffe060";
			ctx.font = `bold ${p(10)}px monospace`;
			ctx.textAlign = "center";
			ctx.fillText("⬡  " + th.name, W / 2, p(53));
			ctx.globalAlpha = 1;
		}
	}
}
function tickShake() {
	if (shakeIntensity > 0) {
		shakeX = (Math.random() - 0.5) * shakeIntensity;
		shakeY = (Math.random() - 0.5) * shakeIntensity;
		shakeIntensity *= 0.8;
		if (shakeIntensity < 0.5) {
			shakeIntensity = 0;
			shakeX = 0;
			shakeY = 0;
		}
	}
}

// ══════════════════════════════════════════
//  CANNON
// ══════════════════════════════════════════
const CANNON = {
	angle: -Math.PI * 0.35,
	dir: 1,
	spd: 0.02,
	minA: -Math.PI * 0.5,
	maxA: -Math.PI * 0.1,
	active: false,
	show: true,
	get wx() {
		return CANNON_WX();
	},
	get wy() {
		return GY() - p(13);
	},
	update() {
		if (!this.active) return;
		this.angle += this.spd * this.dir;
		if (this.angle > this.maxA || this.angle < this.minA)
			this.dir *= -1;
	},
	draw() {
		if (!this.show) return;
		const screenX = sx(this.wx),
			screenY = this.wy + shakeY;
		if (screenX < -p(100) || screenX > W + p(100)) return;
		ctx.save();
		ctx.translate(screenX, screenY);
		ctx.fillStyle = "#1a3a6a";
		ctx.beginPath();
		ctx.roundRect(-p(46), -p(12), p(92), p(16), p(3));
		ctx.fill();
		ctx.fillStyle = "rgba(100,180,255,.1)";
		ctx.fillRect(-p(44), -p(10), p(88), p(6));
		ctx.fillStyle = "#0d2040";
		[
			[-p(32), p(5)],
			[p(32), p(5)],
		].forEach(([wx, wy]) => {
			ctx.beginPath();
			ctx.arc(wx, wy, p(8), 0, Math.PI * 2);
			ctx.fill();
			ctx.strokeStyle = "#1e4488";
			ctx.lineWidth = p(2);
			ctx.stroke();
			ctx.fillStyle = "#3a66aa";
			ctx.beginPath();
			ctx.arc(wx, wy, p(3), 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#0d2040";
		});
		ctx.rotate(this.angle);
		ctx.fillStyle = "#2255cc";
		ctx.beginPath();
		ctx.roundRect(p(2), -p(7), p(50), p(14), p(3));
		ctx.fill();
		ctx.fillStyle = "#1a44aa";
		ctx.fillRect(p(42), -p(7), p(10), p(14));
		ctx.fillStyle = "rgba(150,200,255,.15)";
		ctx.fillRect(p(4), -p(5), p(38), p(6));
		ctx.restore();
		if (this.active) {
			const spd = uv("cannon") * SC;
			let wx = this.wx + Math.cos(this.angle) * p(56),
				wy = this.wy + Math.sin(this.angle) * p(56);
			let dvx = Math.cos(this.angle) * spd,
				dvy = Math.sin(this.angle) * spd;
			ctx.save();
			for (let i = 0; i < 34; i++) {
				dvy += GRAV();
				dvx *= 0.998;
				wx += dvx;
				wy += dvy;
				const ssx = sx(wx);
				if (wy > GY() || ssx > W || ssx < -p(5)) break;
				ctx.globalAlpha = (1 - i / 34) * 0.48;
				ctx.fillStyle = "#88aaff";
				ctx.beginPath();
				ctx.arc(
					ssx,
					wy + shakeY,
					Math.max(p(0.5), p(2.4) - i * p(0.06)),
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}
			ctx.restore();
		}
	},
	spawnPos() {
		return {
			wx: this.wx + Math.cos(this.angle) * p(58),
			wy: this.wy + Math.sin(this.angle) * p(58),
		};
	},
	launchVel() {
		const spd = uv("cannon") * SC;
		return {
			vx: Math.cos(this.angle) * spd,
			vy: Math.sin(this.angle) * spd,
		};
	},
};
const GRAV = () => p(0.07);
const JET = () => p(0.18);

// ══════════════════════════════════════════
//  ROBOT
// ══════════════════════════════════════════
function makeRobot() {
	const { wx, wy } = CANNON.spawnPos();
	const { vx, vy } = CANNON.launchVel();
	const r = p(12);
	return {
		wx,
		wy,
		vx,
		vy,
		r,
		alive: true,
		trail: [],
		facingA: 0,
		speed: 0,
		hitCooldown: 0,
		shieldFlash: 0,
		boostFlash: 0,
		update() {
			if (jetOn && jetFuel > 0) {
				jetFuel = Math.max(0, jetFuel - 1);
				this.vy -= JET();
				startJetSFX(); // loop while thrusting
				// Moderate horizontal boost from jetpack thrust
				this.vx = Math.min(
					this.vx + p(0.012),
					uv("cannon") * SC,
				);
				if (frame % 2 === 0)
					pfx.push({
						wx: this.wx - p(14),
						wy:
							this.wy +
							p(4) +
							(Math.random() - 0.5) * p(4),
						vx: (Math.random() * -2 - 1.5) * SC,
						vy: (Math.random() - 0.5) * SC,
						col: _pmFullGlobal
							? (Math.random() < 0.5 ? "#00ccff" : "#aaeeff")
							: (Math.random() < 0.5 ? "#ff8800" : "#ffe060"),
						life: 1,
						r: p(2.5) + Math.random() * p(2),
					});
			} else {
				stopJetSFX(); // stop loop when not thrusting
			}
			if (!jetOn && jetFuel < maxFuel)
				jetFuel = Math.min(maxFuel, jetFuel + 0.4);
			this.vy += GRAV();
			// Hard speed cap — never exceed 1.8× max cannon launch speed
			this.vx *= 0.9995;
			// Hard cap: vitesse max = vitesse de lancement du canon (pas d'accélération nette)
			const MAX_VX = uv("cannon") * SC;
			if (this.vx > MAX_VX) this.vx = MAX_VX;
			this.wx += this.vx;
			this.wy += this.vy;
			this.facingA = Math.atan2(
				this.vy,
				Math.max(this.vx, 0.1),
			);
			this.speed = Math.max(
				0,
				Math.round((this.vx / SC) * 18),
			);
			if (this.hitCooldown > 0) this.hitCooldown--;
			if (this.shieldFlash > 0) this.shieldFlash--;
			if (this.boostFlash > 0) this.boostFlash--;
			this.trail.unshift({ wx: this.wx, wy: this.wy, a: 1 });
			if (this.trail.length > 16) this.trail.pop();
			this.trail.forEach((t) => (t.a *= 0.78));
			if (this.wy < this.r) {
				this.wy = this.r;
				this.vy = Math.abs(this.vy) * 0.3;
			}
			if (this.wy >= GY() - this.r) {
				this.alive = false;
				this.speed = 0;
				this.vx = 0;
				boom(this.wx, this.wy, "#ffaa00", 14);
				stopJetSFX();
				playsfx("hit", { vol: 0.85 });
				return;
			}
			const target = this.wx - CAM_LEAD();
			camX += (target - camX) * 0.14;
			if (camX < 0) camX = 0;
			distM = Math.max(
				distM,
				Math.floor(
					Math.max(0, this.wx - CANNON.wx) / p(10),
				),
			);
			stars.forEach((s) => {
				const dx = this.wx - s.wx,
					dy = this.wy - s.wy,
					d = Math.hypot(dx, dy);
				if (d < p(65) && d > 1) {
					s.wx += (dx / d) * p(5);
					s.wy += (dy / d) * p(5);
				}
			});
		},
		draw() {
			const scx = sx(this.wx),
				scy = this.wy + shakeY,
				r = this.r;
			// Aura d'invincibilité bouclier — anneau bleu pulsé
			if (this.shieldFlash > 0) {
				const _sfPct = this.shieldFlash / 150;
				const _sfPulse = 0.5 + Math.sin(frame * 0.35) * 0.45;
				ctx.save();
				ctx.globalAlpha = _sfPct * _sfPulse * 0.75;
				ctx.strokeStyle = "#44ddff";
				ctx.lineWidth = p(3.5);
				ctx.shadowColor = "#44ddff";
				ctx.shadowBlur = p(14);
				ctx.beginPath();
				ctx.arc(scx, scy, r + p(9) + Math.sin(frame*0.4)*p(2), 0, Math.PI*2);
				ctx.stroke();
				ctx.restore();
			}
			// Clignotement d'invincibilité (robot semi-transparent)
			const flickOn =
				this.hitCooldown > 0 &&
				Math.floor(this.hitCooldown / 5) % 2 === 0;
			if (flickOn) {
				ctx.save();
				ctx.globalAlpha = this.shieldFlash > 0 ? 0.5 : 0.35;
			}
			// Boost aura
			if (this.boostFlash > 0) {
				ctx.save();
				ctx.globalAlpha = (this.boostFlash / 20) * 0.6;
				ctx.fillStyle = "#44aaff";
				ctx.beginPath();
				ctx.arc(scx, scy, r * 2, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
			// Trail
			const _tc = TRAIL_COLORS[sd.activeTrail||0].col;
			this.trail.forEach((t) => {
				ctx.save();
				ctx.globalAlpha = t.a * 0.22;
				ctx.fillStyle = this.boostFlash > 0 ? "#44aaff" : _tc;
				ctx.beginPath();
				ctx.arc(
					sx(t.wx),
					t.wy + shakeY,
					r * t.a,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.restore();
			});
			ctx.save();
			ctx.translate(scx, scy);
			ctx.rotate(this.facingA);
			const bg = ctx.createRadialGradient(
				-r * 0.1,
				-r * 0.1,
				r * 0.1,
				0,
				0,
				r,
			);
			bg.addColorStop(0, "#ffe060");
			bg.addColorStop(0.65, "#ffaa00");
			bg.addColorStop(1, "#cc7700");
			ctx.fillStyle = bg;
			ctx.beginPath();
			ctx.arc(0, 0, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.shadowBlur = 0;
			ctx.fillStyle = "#1a44bb";
			ctx.beginPath();
			ctx.roundRect(-r - p(7), -p(6), p(8), p(12), p(2));
			ctx.fill();
			ctx.fillStyle = "#2a66dd";
			ctx.fillRect(-r - p(6), -p(5), p(5), p(4));
			if (jetOn && jetFuel > 0) {
				const fl = p(6) + Math.random() * p(8);
				if (_pmFullGlobal) {
					// Flamme bleue ardente — vitesse maximale
					ctx.save();
					ctx.shadowColor = "#00aaff";
					ctx.shadowBlur = p(10);
					ctx.fillStyle = "rgba(0,160,255,.95)";
					ctx.beginPath();
					ctx.moveTo(-r - p(3), -p(4));
					ctx.lineTo(-r - p(3) - fl * 1.15, 0);
					ctx.lineTo(-r - p(3), p(4));
					ctx.closePath();
					ctx.fill();
					ctx.fillStyle = "rgba(200,240,255,.80)";
					ctx.beginPath();
					ctx.moveTo(-r - p(3), -p(2.5));
					ctx.lineTo(-r - p(3) - fl * 0.7, 0);
					ctx.lineTo(-r - p(3), p(2.5));
					ctx.closePath();
					ctx.fill();
					ctx.restore();
				} else {
					// Flamme normale — orange/jaune
					ctx.fillStyle = "rgba(255,140,0,.92)";
					ctx.beginPath();
					ctx.moveTo(-r - p(3), -p(4));
					ctx.lineTo(-r - p(3) - fl, 0);
					ctx.lineTo(-r - p(3), p(4));
					ctx.closePath();
					ctx.fill();
					ctx.fillStyle = "rgba(255,230,80,.72)";
					ctx.beginPath();
					ctx.moveTo(-r - p(3), -p(2.5));
					ctx.lineTo(-r - p(3) - fl * 0.6, 0);
					ctx.lineTo(-r - p(3), p(2.5));
					ctx.closePath();
					ctx.fill();
				}
			}
			ctx.fillStyle = "#002255";
			ctx.beginPath();
			ctx.ellipse(p(2), -p(1), p(7), p(5), 0, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = "#0088ff";
			ctx.beginPath();
			ctx.ellipse(
				p(3),
				-p(1.5),
				p(4),
				p(3),
				0,
				0,
				Math.PI * 2,
			);
			ctx.fill();
			ctx.fillStyle = "rgba(255,255,255,.5)";
			ctx.beginPath();
			ctx.ellipse(
				p(4),
				-p(2.5),
				p(1.5),
				p(1),
				-0.3,
				0,
				Math.PI * 2,
			);
			ctx.fill();
			if (shield > 0) {
				ctx.strokeStyle = `rgba(100,200,255,${0.4 + Math.sin(frame * 0.18) * 0.35})`;
				ctx.lineWidth = p(2.2);
				ctx.beginPath();
				ctx.arc(0, 0, r + p(6), 0, Math.PI * 2);
				ctx.stroke();
			}
			ctx.restore();
			if (flickOn) ctx.restore();
		},
		hit() {
			if (this.hitCooldown > 0) return;
			if (shield > 0) {
				shield--;
				boom(this.wx, this.wy, "#88ddff", 8);
				this.hitCooldown = 150; // 2.5s @60fps
				this.shieldFlash = 150; // aura bleue pendant toute l'invincibilité
				shakeIntensity = p(5);
				synthEnemyHit();
				return;
			}
			// Drain 30% jetpack + slow down
			jetFuel = Math.max(0, jetFuel - maxFuel * 0.3);
			this.vx *= 0.65; // ralentissement moins brutal
			this.hitCooldown = 120; // 2.0s @60fps
			shakeIntensity = p(8);
			sd.totalHits = (sd.totalHits || 0) + 1;
			boom(this.wx, this.wy, "#ff4400", 10);
			synthEnemyHit();
			if (sd.vibration && navigator.vibrate)
				navigator.vibrate(100);
			if (combo > 1)
				addFloat(
					this.wx,
					this.wy - p(20),
					t("comboBreak"),
					"#ff4400",
				);
			combo = 0;
			comboTimer = 0;
			checkAch("hit");
		},
	};
}

// ══════════════════════════════════════════
//  COMBO SYSTEM
// ══════════════════════════════════════════
function getComboMult() {
	return COMBO_MULT[Math.min(combo, COMBO_MULT.length - 1)];
}
function addCombo(wx, wy) {
	combo++;
	comboTimer = COMBO_WINDOW;
	if (combo > comboMax) comboMax = combo;
	if (combo > sd.bestCombo) {
		sd.bestCombo = combo;
		save();
	}
	const mult = getComboMult();
	if (combo >= 2) {
		const col =
			combo >= 5
				? "#ff4400"
				: combo >= 3
					? "#ffaa00"
					: "#ffe000";
		addFloat(
			wx,
			wy - p(16),
			`x${combo} COMBO!`,
			col,
			combo >= 5 ? 1.4 : 1,
		);
	}
}
function tickCombo() {
	if (comboTimer > 0) {
		comboTimer--;
		if (comboTimer <= 0 && combo > 0) {
			combo = 0;
		}
	}
}

// ══════════════════════════════════════════
//  FLOAT TEXTS
// ══════════════════════════════════════════
function addFloat(wx, wy, text, col, scale = 1) {
	floatTexts.push({
		wx,
		wy,
		text,
		col,
		life: 1,
		vy: -p(0.8),
		scale,
	});
}
function tickDrawFloats() {
	for (let i = floatTexts.length - 1; i >= 0; i--) {
		const f = floatTexts[i];
		f.wy += f.vy;
		f.life -= 0.02;
		if (f.life <= 0) {
			floatTexts.splice(i, 1);
			continue;
		}
		const scx = sx(f.wx),
			scy = f.wy + shakeY;
		ctx.save();
		ctx.globalAlpha = Math.min(1, f.life * 2);
		ctx.fillStyle = f.col;
		// Halo matches text color — draw twice: once with glow, once sharp
		ctx.shadowColor = f.col;
		ctx.shadowBlur = p(16);
		ctx.font = `bold ${p(11 * f.scale)}px monospace`;
		ctx.textAlign = "center";
		ctx.fillText(f.text, scx, scy);
		ctx.shadowBlur = p(6);
		ctx.fillText(f.text, scx, scy); // second pass for crisp core
		ctx.shadowBlur = 0;
		ctx.restore();
	}
}

// ══════════════════════════════════════════
//  STARS
// ══════════════════════════════════════════
function spawnStar(wx) {
	stars.push({
		wx,
		wy: p(40) + Math.random() * (GY() - p(100)),
		bob: Math.random() * Math.PI * 2,
		alive: true,
	});
}
function spawnStarCluster(wx, n = 6) {
	for (let i = 0; i < n; i++) spawnStar(wx + p(i * 18 - n * 9));
}
function tickDrawStars() {
	for (let i = stars.length - 1; i >= 0; i--) {
		const s = stars[i];
		s.bob += 0.055;
		s.wy += Math.sin(s.bob) * p(0.38);
		const scx = sx(s.wx),
			scy = s.wy + shakeY;
		if (scx < -p(30) || scx > W + p(30)) {
			if (scx < -p(100)) stars.splice(i, 1);
			continue;
		}
		const sc2 = 1 + Math.sin(s.bob) * 0.08;
		ctx.save();
		ctx.translate(scx, scy);
		ctx.scale(sc2, sc2);
		// Fake glow: concentric alpha circles (no shadowBlur GPU cost)
		ctx.fillStyle = "rgba(255,228,0,0.12)";
		ctx.beginPath();
		ctx.arc(0, 0, p(16), 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "rgba(255,228,0,0.22)";
		ctx.beginPath();
		ctx.arc(0, 0, p(12), 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#ffe000";
		ctx.beginPath();
		for (let j = 0; j < 10; j++) {
			const a = (j / 10) * Math.PI * 2 - Math.PI / 2,
				r = j % 2 === 0 ? p(10) : p(4.5);
			j === 0
				? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
				: ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		}
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		if (
			robot &&
			robot.alive &&
			Math.hypot(robot.wx - s.wx, robot.wy - s.wy) <
				robot.r + p(12)
		) {
			stars.splice(i, 1);
			const earn = Math.round(15 * getComboMult() * speedStreakMult);
			coins += earn;
			playsfx("coin", { vol: 0.7 });
			sd.totalStars = (sd.totalStars || 0) + 1;
			runStars++;
			runHasStar = true;
			boom(s.wx, s.wy, "#ffe000", 7);
			addCombo(s.wx, s.wy);
			if (earn > 15)
				addFloat(
					s.wx,
					s.wy - p(8),
					"+" + (earn > 15 ? earn : ""),
					earn > 15 ? "#ffee44" : "#ffe000",
				);
			checkAch("star");
		}
	}
}

// ══════════════════════════════════════════
//  BOOST ORBS
// ══════════════════════════════════════════
function spawnBoost(wx) {
	boosts.push({
		wx,
		wy: p(50) + Math.random() * (GY() - p(120)),
		pulse: Math.random() * Math.PI * 2,
		alive: true,
		rx: p(18) + Math.random() * p(8),
		ry: p(10) + Math.random() * p(5),
		tilt: (Math.random() - 0.5) * 0.4,
		orbitAngle: Math.random() * Math.PI * 2,
	});
}
function tickDrawBoosts() {
	for (let i = boosts.length - 1; i >= 0; i--) {
		const b = boosts[i];
		b.pulse += 0.06;
		b.orbitAngle += 0.04;
		const scx = sx(b.wx),
			scy = b.wy + shakeY;
		if (scx < -p(60) || scx > W + p(60)) {
			if (scx < -p(120)) boosts.splice(i, 1);
			continue;
		}
		const glow = 0.5 + Math.sin(b.pulse) * 0.3,
			rScale = 1 + Math.sin(b.pulse) * 0.12;
		ctx.save();
		ctx.translate(scx, scy);
		ctx.rotate(b.tilt);
		ctx.strokeStyle = `rgba(60,160,255,${glow * 0.5})`;
		ctx.lineWidth = p(3);
		ctx.beginPath();
		ctx.ellipse(
			0,
			0,
			b.rx * rScale * 1.3,
			b.ry * rScale * 1.3,
			0,
			0,
			Math.PI * 2,
		);
		ctx.stroke();
		const bg = ctx.createRadialGradient(0, 0, p(2), 0, 0, b.rx);
		bg.addColorStop(0, "rgba(180,230,255,0.95)");
		bg.addColorStop(0.4, "rgba(50,140,255,0.88)");
		bg.addColorStop(1, "rgba(10,60,180,0.7)");
		ctx.fillStyle = bg;
		ctx.beginPath();
		ctx.ellipse(
			0,
			0,
			b.rx * rScale,
			b.ry * rScale,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		ctx.fillStyle = `rgba(220,240,255,${glow * 0.6})`;
		ctx.beginPath();
		ctx.ellipse(
			-b.rx * 0.2,
			-b.ry * 0.25,
			b.rx * 0.35,
			b.ry * 0.3,
			-0.4,
			0,
			Math.PI * 2,
		);
		ctx.fill();
		const ox = Math.cos(b.orbitAngle) * b.rx * 1.1,
			oy = Math.sin(b.orbitAngle) * b.ry * 1.1;
		ctx.fillStyle = `rgba(180,220,255,${glow * 0.8})`;
		ctx.beginPath();
		ctx.arc(ox, oy, p(3), 0, Math.PI * 2);
		ctx.fill();
		ctx.shadowBlur = 0;
		ctx.fillStyle = "rgba(255,255,255,0.9)";
		ctx.font = `bold ${p(10)}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("⚡", 0, 0);
		ctx.restore();
		if (
			robot &&
			robot.alive &&
			Math.hypot(robot.wx - b.wx, robot.wy - b.wy) <
				robot.r + b.rx * 0.9
		) {
			boosts.splice(i, 1);
			synthBoostSonic();
			// Ellipse bleue : +20% de la vitesse max, plafonné à maxVx
			const maxVx = uv("cannon") * SC;
			robot.vx = Math.min(
				robot.vx + maxVx * 0.14,
				maxVx,
			);
			jetFuel = Math.min(maxFuel, jetFuel + maxFuel * 0.45);
			sd.totalBoosts = (sd.totalBoosts || 0) + 1;
			runBoosts++;
			runHasBoost = true;
			robot.boostFlash = 20;
			boom(b.wx, b.wy, "#44aaff", 12);
			boom(b.wx, b.wy, "#aaddff", 6);
			addCombo(b.wx, b.wy);
			addFloat(b.wx, b.wy - p(18), "+BOOST!", "#44ddff", 1.2);
			if (sd.vibration && navigator.vibrate)
				navigator.vibrate([30, 20, 30]);
			checkAch("boost");
		}
	}
}

// ══════════════════════════════════════════
//  WARP RINGS (pass-through for speed + points)
// ══════════════════════════════════════════
function spawnRing(wx) {
	rings.push({
		wx,
		wy: p(60) + Math.random() * (GY() - p(140)),
		alive: true,
		angle: 0,
		r: p(22),
		pulse: Math.random() * Math.PI * 2,
	});
}
function tickDrawRings() {
	for (let i = rings.length - 1; i >= 0; i--) {
		const rg = rings[i];
		rg.angle += 0.04;
		rg.pulse += 0.08;
		const scx = sx(rg.wx),
			scy = rg.wy + shakeY,
			r = rg.r;
		if (scx < -p(60) || scx > W + p(60)) {
			if (scx < -p(120)) rings.splice(i, 1);
			continue;
		}
		const glow = 0.6 + Math.sin(rg.pulse) * 0.4;
		ctx.save();
		ctx.translate(scx, scy);
		ctx.rotate(rg.angle);
		// Outer glow
		ctx.strokeStyle = `rgba(255,140,0,${glow * 0.4})`;
		ctx.lineWidth = p(6);
		ctx.beginPath();
		ctx.arc(0, 0, r * 1.15, 0, Math.PI * 2);
		ctx.stroke();
		// Main ring
		const grad = ctx.createLinearGradient(-r, -r, r, r);
		grad.addColorStop(0, "#ffdd00");
		grad.addColorStop(0.5, "#ff8800");
		grad.addColorStop(1, "#ff4400");
		ctx.strokeStyle = grad;
		ctx.lineWidth = p(4);
		ctx.beginPath();
		ctx.arc(0, 0, r, 0, Math.PI * 2);
		ctx.stroke();
		// Inner glow hole
		ctx.fillStyle = `rgba(255,140,0,${glow * 0.08})`;
		ctx.beginPath();
		ctx.arc(0, 0, r - p(3), 0, Math.PI * 2);
		ctx.fill();
		// Star icon
		ctx.shadowBlur = 0;
		ctx.fillStyle = "rgba(255,220,0,0.9)";
		ctx.font = `bold ${p(12)}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("★", 0, 1);
		ctx.restore();
		if (
			robot &&
			robot.alive &&
			Math.hypot(robot.wx - rg.wx, robot.wy - rg.wy) <
				robot.r + r * 0.75
		) {
			rings.splice(i, 1);
			synthPowerup();
			// Anneau doré: bonus de pièces uniquement, pas d'accélération
			const earn = Math.round(3 * getComboMult());
			coins += earn;
			sd.totalRings = (sd.totalRings || 0) + 1;
			runRings++;
			runHasRing = true;
			boom(rg.wx, rg.wy, "#ffaa00", 16);
			boom(rg.wx, rg.wy, "#ffff88", 8);
			addCombo(rg.wx, rg.wy);
			addCombo(rg.wx, rg.wy); // rings give double combo
			addFloat(
				rg.wx,
				rg.wy - p(20),
				"RING! +" + earn,
				"#ffdd00",
				1.3,
			);
			shakeIntensity = p(3);
			if (sd.vibration && navigator.vibrate)
				navigator.vibrate([20, 10, 20, 10, 20]);
			checkAch("ring");
		}
	}
}

// ══════════════════════════════════════════
//  MYSTERY CHESTS
// ══════════════════════════════════════════
function spawnChest(wx) {
	chests.push({
		wx,
		wy: GY() - p(20),
		alive: true,
		bob: Math.random() * Math.PI * 2,
		glow: 0,
	});
}
function tickDrawChests() {
	for (let i = chests.length - 1; i >= 0; i--) {
		const c = chests[i];
		c.bob += 0.05;
		c.glow = (c.glow + 0.06) % (Math.PI * 2);
		const scx = sx(c.wx),
			scy = c.wy + Math.sin(c.bob) * p(3) + shakeY;
		if (scx < -p(40) || scx > W + p(40)) {
			if (scx < -p(100)) chests.splice(i, 1);
			continue;
		}
		const glowA = 0.5 + Math.sin(c.glow) * 0.3;
		ctx.save();
		ctx.translate(scx, scy);
		ctx.fillStyle = `rgba(180,120,0,0.2)`;
		ctx.fillRect(-p(12), -p(12), p(24), p(24));
		ctx.fillStyle = "#8b5e00";
		ctx.fillRect(-p(11), -p(11), p(22), p(22));
		ctx.fillStyle = "#c47800";
		ctx.fillRect(-p(11), -p(11), p(22), p(10));
		ctx.strokeStyle = `rgba(255,200,50,${glowA})`;
		ctx.lineWidth = p(1.5);
		ctx.strokeRect(-p(11), -p(11), p(22), p(22));
		ctx.strokeStyle = `rgba(255,200,50,${glowA * 0.7})`;
		ctx.lineWidth = p(1);
		ctx.beginPath();
		ctx.moveTo(-p(11), 0);
		ctx.lineTo(p(11), 0);
		ctx.stroke();
		ctx.fillStyle = `rgba(255,200,50,${glowA})`;
		ctx.beginPath();
		ctx.arc(0, 0, p(3), 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "rgba(255,240,100,0.9)";
		ctx.font = `${p(8)}px monospace`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("?", 0, 0);
		ctx.restore();
		if (
			robot &&
			robot.alive &&
			Math.hypot(robot.wx - c.wx, robot.wy - c.wy) <
				robot.r + p(16)
		) {
			chests.splice(i, 1);
			synthPowerup();
			openChest(c.wx, c.wy);
		}
	}
}
function openChest(wx, wy) {
	const rewards = [
		"fuel",
		"fuel",
		"shield",
		"stars",
		"stars",
		"speed",
	];
	const r = rewards[Math.floor(Math.random() * rewards.length)];
	sd.totalChests = (sd.totalChests || 0) + 1;
	runChests++;
	runHasChest = true;
	boom(wx, wy, "#ffcc00", 16);
	if (r === "fuel") {
		jetFuel = maxFuel;
		addFloat(wx, wy - p(20), "FUEL FULL!", "#ff8800", 1.1);
	} else if (r === "shield") {
		if (shield < uv("armor")) shield++;
		else coins += 30;
		addFloat(wx, wy - p(20), "SHIELD +1", "#88ccff", 1.1);
	} else if (r === "stars") {
		spawnStarCluster(wx, 8);
		addFloat(wx, wy - p(20), "COIN RAIN!", "#ffe000", 1.2);
	}
	// Coffre carburant: recharge complète du jetpack
	else if (r === "speed") {
		jetFuel = maxFuel;
		if (robot) robot.boostFlash = 15;
		addFloat(wx, wy - p(20), "FUEL MAX!", "#44ffaa", 1.1);
	}
	addCombo(wx, wy);
	shakeIntensity = p(4);
	if (sd.vibration && navigator.vibrate)
		navigator.vibrate([40, 20, 40]);
	checkAch("chest");
}

// ══════════════════════════════════════════
//  METEORS (warning + dodge)
// ══════════════════════════════════════════
function spawnMeteor(wx) {
	const targetY = p(40) + Math.random() * (GY() - p(80));
	meteors.push({
		wx,
		wy: -p(40),
		targetX: wx + (Math.random() - 0.5) * p(80),
		targetY,
		vx: 0,
		vy: 0,
		r: p(12),
		alive: true,
		state: "warn",
		warnTimer: 80,
		trail: [],
	});
}
function tickDrawMeteors() {
	for (let i = meteors.length - 1; i >= 0; i--) {
		const m = meteors[i];
		if (m.state === "warn") {
			m.warnTimer--;
			const scx = sx(m.targetX),
				scy = m.targetY + shakeY;
			const blink = Math.floor(m.warnTimer / 6) % 2 === 0;
			if (blink) {
				ctx.save();
				ctx.globalAlpha = 0.7;
				ctx.strokeStyle = "#ff2200";
				ctx.lineWidth = p(2);
				ctx.setLineDash([p(4), p(3)]);
				ctx.beginPath();
				ctx.moveTo(scx, 0);
				ctx.lineTo(scx, scy + p(20));
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.fillStyle = "#ff2200";
				ctx.font = `bold ${p(12)}px monospace`;
				ctx.textAlign = "center";
				ctx.fillText("⚠", scx, scy - p(20));
				ctx.restore();
			}
			if (m.warnTimer <= 0) {
				m.state = "fall";
				m.wx = m.targetX;
				m.wy = -p(30);
				const angle =
					Math.PI * 0.5 + (Math.random() - 0.5) * 0.3;
				const spd = p(5) + Math.random() * p(3);
				m.vx = Math.cos(angle) * spd * 0.3;
				m.vy = Math.abs(Math.sin(angle) * spd);
			}
		} else {
			m.trail.unshift({ x: m.wx, y: m.wy });
			if (m.trail.length > 8) m.trail.pop();
			m.wx += m.vx;
			m.wy += m.vy;
			m.vy += p(0.15);
			const scx = sx(m.wx),
				scy = m.wy + shakeY;
			// Draw trail
			m.trail.forEach((pt, ti) => {
				ctx.save();
				ctx.globalAlpha = (1 - ti / 8) * 0.4;
				ctx.fillStyle = "#ff6600";
				ctx.beginPath();
				ctx.arc(
					sx(pt.x),
					pt.y + shakeY,
					m.r * (1 - ti / 8),
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.restore();
			});
			// Draw meteor
			ctx.save();
			ctx.translate(scx, scy);
			const mg = ctx.createRadialGradient(
				0,
				0,
				p(2),
				0,
				0,
				m.r,
			);
			mg.addColorStop(0, "#ffcc00");
			mg.addColorStop(0.5, "#ff6600");
			mg.addColorStop(1, "#aa1100");
			ctx.fillStyle = mg;
			ctx.beginPath();
			ctx.arc(0, 0, m.r, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
			// Hit check
			if (
				robot &&
				robot.alive &&
				Math.hypot(robot.wx - m.wx, robot.wy - m.wy) <
					robot.r + m.r - p(3)
			) {
				m.alive = false;
				boom(m.wx, m.wy, "#ff6600", 14);
				robot.hit();
			}
			if (m.wy > GY() + p(20)) {
				m.alive = false;
				boom(m.wx, GY(), "#cc4400", 8);
				shakeIntensity = p(6);
				// Meteor dodged
				sd.meteorsDodged = (sd.meteorsDodged || 0) + 1;
				runMeteorsDodged++;
				checkAch("meteor");
			}
		}
		if (!m.alive) meteors.splice(i, 1);
	}
}

// ══════════════════════════════════════════
//  ENEMIES
// ══════════════════════════════════════════
function spawnEnemy(wx) {
	const tp = ["bat", "orb", "spike"][
		Math.floor(Math.random() * 3)
	];
	const diff = Math.min(3.5, 1 + distM / 280) * (hardcoreMode ? 1.5 : 1);
	enemies.push({
		tp,
		wx,
		wy: p(40) + Math.random() * (GY() - p(120)),
		r: p(tp === "bat" ? 15 : 12),
		ang: 0,
		ph: Math.random() * Math.PI * 2,
		alive: true,
		spd: (1.2 + Math.random() * 1.1) * diff * SC,
		update() {
			this.ph += 0.05;
			this.ang += 0.06;
			const s = this.spd;
			if (this.tp === "bat") {
				this.wx -= s;
				this.wy += Math.sin(this.ph) * p(2.4);
			} else if (this.tp === "orb") {
				this.wx -= s * 0.9;
				this.wy += Math.sin(this.ph * 1.8) * p(1.8);
			} else {
				this.wx -= s * 1.12;
				this.wy += Math.sin(this.ph * 2.4) * p(3.2);
			}
			if (this.wx < camX - p(100)) this.alive = false;
		},
		draw() {
			const scx = sx(this.wx),
				scy = this.wy + shakeY,
				r = this.r;
			if (scx < -p(40) || scx > W + p(40)) return;
			ctx.save();
			ctx.translate(scx, scy);
			if (this.tp === "bat") {
				ctx.rotate(Math.sin(this.ph * 2) * 0.28);
				ctx.fillStyle = "#6633aa";
				[-1, 1].forEach((side) => {
					ctx.beginPath();
					ctx.moveTo(0, -p(3));
					ctx.bezierCurveTo(
						side * p(20),
						-p(12),
						side * p(26),
						p(4),
						side * p(12),
						p(8),
					);
					ctx.bezierCurveTo(
						side * p(6),
						p(10),
						0,
						p(4),
						0,
						0,
					);
					ctx.fill();
				});
				ctx.fillStyle = "#8833cc";
				ctx.beginPath();
				ctx.arc(0, 0, p(6), 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#ff2200";
				ctx.beginPath();
				ctx.arc(-p(1.5), -p(1), p(1.5), 0, Math.PI * 2);
				ctx.fill();
			} else if (this.tp === "orb") {
				ctx.rotate(this.ang);
				const g = ctx.createRadialGradient(
					0,
					0,
					p(2),
					0,
					0,
					r,
				);
				g.addColorStop(0, "#aaffcc");
				g.addColorStop(0.5, "#22bb55");
				g.addColorStop(1, "#0a5520");
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(0, 0, r, 0, Math.PI * 2);
				ctx.fill();
				ctx.strokeStyle = "rgba(100,255,160,.4)";
				ctx.lineWidth = p(1.5);
				[0.6, 0.3].forEach((rs) => {
					ctx.beginPath();
					ctx.arc(0, 0, r * rs, 0, Math.PI * 2);
					ctx.stroke();
				});
			} else {
				ctx.rotate(this.ang * 0.5);
				ctx.fillStyle = "#aa2200";
				ctx.beginPath();
				ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
				ctx.fill();
				ctx.fillStyle = "#cc3311";
				for (let i2 = 0; i2 < 8; i2++) {
					const a = (i2 / 8) * Math.PI * 2;
					ctx.save();
					ctx.rotate(a);
					ctx.beginPath();
					ctx.moveTo(0, -r * 0.62);
					ctx.lineTo(-p(3.5), -r - p(4));
					ctx.lineTo(p(3.5), -r - p(4));
					ctx.closePath();
					ctx.fill();
					ctx.restore();
				}
			}
			ctx.restore();
		},
	});
}

// ══════════════════════════════════════════
//  PARTICLES
// ══════════════════════════════════════════
function boom(wx, wy, col, n) {
	n = Math.min(n, 6);
	for (let i = 0; i < n; i++)
		pfx.push({
			wx,
			wy,
			vx: (Math.random() - 0.5) * p(6),
			vy: (Math.random() - 0.5) * p(6),
			col,
			life: 1,
			r: p(2) + Math.random() * p(3),
		});
}
function tickPfx() {
	const byCol = {};
	for (let i = pfx.length - 1; i >= 0; i--) {
		const q = pfx[i];
		q.wx += q.vx;
		q.wy += q.vy;
		q.vx *= 0.9;
		q.vy *= 0.9;
		q.life *= 0.87;
		if (q.life < 0.02) {
			pfx.splice(i, 1);
			continue;
		}
		if (!byCol[q.col]) byCol[q.col] = [];
		byCol[q.col].push(q);
	}
	Object.entries(byCol).forEach(([col, ps]) => {
		ctx.fillStyle = col;
		ps.forEach((q) => {
			ctx.globalAlpha = q.life;
			ctx.beginPath();
			ctx.arc(
				sx(q.wx),
				q.wy + shakeY,
				q.r * q.life,
				0,
				Math.PI * 2,
			);
			ctx.fill();
		});
	});
	ctx.globalAlpha = 1;
}

// ══════════════════════════════════════════
//  PAUSE BUTTON
// ══════════════════════════════════════════
function drawPauseBtn() {
	const bx = W - p(36),
		by = p(4),
		bw = p(28),
		bh = p(22);
	ctx.fillStyle = "rgba(0,0,0,0.55)";
	ctx.beginPath();
	ctx.roundRect(bx, by, bw, bh, p(4));
	ctx.fill();
	ctx.fillStyle = "rgba(255,255,255,0.7)";
	ctx.font = `${p(12)}px monospace`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("⏸", bx + bw / 2, by + bh / 2);
}
function isPauseBtn(x, y) {
	return (
		x >= W - p(38) && x <= W - p(6) && y >= p(2) && y <= p(28)
	);
}

// ══════════════════════════════════════════
//  COMBO HUD
// ══════════════════════════════════════════
function drawComboHUD() {
	if (combo < 2) return;
	const mult = getComboMult();
	const col =
		combo >= 5 ? "#ff4400" : combo >= 3 ? "#ffaa00" : "#ffe000";
	const pulse = 1 + Math.sin(frame * 0.25) * 0.1;
	ctx.save();
	ctx.textAlign = "right";
	ctx.font = `bold ${p(12 * pulse)}px monospace`;
	ctx.fillStyle = col;
	ctx.shadowColor = "rgba(255,255,255,0.9)";
	ctx.shadowBlur = p(14);
	ctx.fillText(`x${combo} COMBO`, W - p(44), p(52));
	ctx.shadowBlur = 0;
	ctx.font = `bold ${p(8)}px monospace`;
	ctx.fillStyle = "#fff";
	ctx.fillText(`×${mult} $`, W - p(44), p(64));
	// Timer bar
	const tw = p(68),
		th = p(4),
		tx = W - p(76),
		ty = p(68);
	ctx.fillStyle = "rgba(0,0,0,0.5)";
	ctx.fillRect(tx, ty, tw, th);
	ctx.fillStyle = col;
	ctx.shadowBlur = 0;
	ctx.fillRect(tx, ty, tw * (comboTimer / COMBO_WINDOW), th);
	ctx.restore();
}

// ══════════════════════════════════════════
//  HUD
// ══════════════════════════════════════════
function drawHUD() {
	const bh = p(30);
	// Top bar background
	ctx.fillStyle = "rgba(0,0,0,.65)";
	ctx.fillRect(0, 0, W, bh);
	// Shield bar
	const shMax = Math.max(1, uv("armor"));
	ctx.fillStyle = "rgba(0,0,0,.6)";
	ctx.fillRect(p(6), p(8), p(88), p(11));
	if (shield > 0) {
		const sg = ctx.createLinearGradient(p(6), 0, p(94), 0);
		sg.addColorStop(0, "#ffee00");
		sg.addColorStop(1, "#88cc00");
		ctx.fillStyle = sg;
		ctx.fillRect(p(6), p(8), p(88) * (shield / shMax), p(11));
	}
	ctx.strokeStyle = "#446";
	ctx.lineWidth = p(1);
	ctx.strokeRect(p(6), p(8), p(88), p(11));
	ctx.fillStyle = "#ccddaa";
	ctx.font = `bold ${p(7)}px monospace`;
	ctx.textAlign = "left";
	ctx.fillText("🛡 " + shield + "/" + shMax, p(8), p(26));
	ctx.shadowBlur = 0;
	// Distance counter — centre, gros
	ctx.fillStyle = "rgba(0,0,0,.6)";
	ctx.beginPath();
	ctx.roundRect(W / 2 - p(46), p(4), p(92), p(23), p(3));
	ctx.fill();
	ctx.strokeStyle = "#2244aa";
	ctx.lineWidth = p(1);
	ctx.stroke();
	ctx.fillStyle = "#66ff88";
	ctx.shadowColor = "rgba(255,255,255,0.85)";
	ctx.shadowBlur = p(14);
	ctx.font = `bold ${p(13)}px monospace`;
	ctx.textAlign = "center";
	ctx.fillText(distM + " m", W / 2, p(21));
	ctx.shadowBlur = 0;
	// ── P-METER (SMB3 style) — below top bar, right-aligned ─────
	// 7 speed segments + 1 "P" cap = 8 blocks
	// Position: below top bar (sbY=p(33)), no overlap with pause btn
	const spd = robot ? robot.speed : 0;
	const spdMax = Math.max(1, uv("cannon") * 18 + 5);
	const spdPct = Math.min(1, spd / Math.max(1, spdMax));
	const PM_N = 8; // total segments incl. P
	const PM_LIT = Math.round(spdPct * (PM_N - 1)); // how many lit (0..7), P=index 7
	const PM_FULL = PM_LIT >= PM_N - 1; // all lit = full power
	const pmSW = p(9),
		pmSH = p(11),
		pmGAP = p(2); // segment w/h/gap
	const pmTotalW = PM_N * (pmSW + pmGAP) - pmGAP;
	const pmX = W - pmTotalW - p(6); // right-aligned, clear of pause btn
	const pmY = p(33); // just below top bar
	// Segment colors (SMB3: white→yellow→orange→red progression)
	const PM_COLS = [
		"#4488ff",
		"#44aaff",
		"#44ddff",
		"#ffee00",
		"#ffcc00",
		"#ff8800",
		"#ff5500",
		"#ff2200",
	];
	// Background strip
	ctx.fillStyle = "rgba(0,0,0,0.55)";
	ctx.beginPath();
	ctx.roundRect(
		pmX - p(3),
		pmY - p(2),
		pmTotalW + p(6),
		pmSH + p(4),
		p(3),
	);
	ctx.fill();
	// Draw segments
	for (let i = 0; i < PM_N; i++) {
		const sx = pmX + i * (pmSW + pmGAP);
		const isP = i === PM_N - 1;
		const lit = i < PM_LIT || (isP && PM_FULL);
		// Unlit: dark with dim border; Lit: bright fill + glow
		if (lit) {
			const blink =
				isP && PM_FULL && Math.floor(frame / 5) % 2 === 0;
			ctx.fillStyle = blink ? "#ffffff" : PM_COLS[i];
			if (isP) {
				ctx.shadowColor = blink
					? "rgba(255,255,200,0.9)"
					: "rgba(255,50,0,0.8)";
				ctx.shadowBlur = p(8);
			}
			ctx.fillRect(sx, pmY, pmSW, pmSH);
			ctx.shadowBlur = 0;
		} else {
			ctx.fillStyle = "rgba(20,20,40,0.8)";
			ctx.fillRect(sx, pmY, pmSW, pmSH);
		}
		// Border
		ctx.strokeStyle = lit
			? isP
				? "#ffaaaa"
				: "rgba(255,255,255,0.5)"
			: "rgba(80,100,160,0.5)";
		ctx.lineWidth = p(0.8);
		ctx.strokeRect(sx, pmY, pmSW, pmSH);
		// "P" label on last segment
		if (isP) {
			ctx.fillStyle = PM_FULL
				? Math.floor(frame / 5) % 2 === 0
					? "#000"
					: "#fff"
				: "rgba(120,80,80,0.9)";
			ctx.font = `bold ${p(7)}px monospace`;
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.fillText("P", sx + pmSW / 2, pmY + pmSH / 2);
			ctx.textBaseline = "alphabetic";
		}
	}
	// "SPEED" label left of segments
	ctx.fillStyle = "rgba(180,200,255,0.7)";
	ctx.font = `bold ${p(5.5)}px monospace`;
	ctx.textAlign = "right";
	ctx.fillText("SPEED", pmX - p(5), pmY + pmSH * 0.75);
	ctx.shadowBlur = 0;
	// Bottom HUD: label row + fuel bar, total p(28) height
	const lblH = p(14),
		barH = p(11),
		bottomH = lblH + barH + p(3);
	const bottomY = H - bottomH;
	ctx.fillStyle = "rgba(0,0,0,0.72)";
	ctx.fillRect(0, bottomY, W, bottomH);
	// Labels on their own row — clearly visible above bar
	const lblY = bottomY + lblH * 0.82;
	ctx.font = `bold ${p(8)}px monospace`;
	ctx.fillStyle = "#dd9933";
	ctx.textAlign = "left";
	ctx.fillText("⚡ JETPACK", p(10), lblY);
	ctx.fillStyle = "#ffe84d";
	ctx.textAlign = "right";
	ctx.fillText("★ " + coins, W - p(10), lblY);
	if (speedStreakMult > 1) {
		const sp = 1+Math.sin(frame*0.3)*0.12;
		ctx.save();
		ctx.font = `bold ${p(7*sp)}px monospace`;
		ctx.fillStyle = speedStreakMult>=3?"#ff4400":speedStreakMult>=2?"#ff8800":"#ffdd00";
		ctx.shadowColor="rgba(255,180,0,0.9)"; ctx.shadowBlur=p(8);
		ctx.fillText("⚡ ×"+speedStreakMult, W-p(10), lblY-p(12));
		ctx.restore(); ctx.shadowBlur=0;
	}
	// Fuel bar below labels
	const barY = bottomY + lblH + p(2);
	ctx.fillStyle = "rgba(0,0,0,0.5)";
	ctx.fillRect(p(6), barY, W - p(12), barH);
	const fg = ctx.createLinearGradient(p(6), 0, W - p(6), 0);
	fg.addColorStop(0, "#ff8800");
	fg.addColorStop(1, "#ffe000");
	ctx.fillStyle = fg;
	ctx.fillRect(
		p(6),
		barY,
		(W - p(12)) * (jetFuel / maxFuel),
		barH,
	);
	ctx.strokeStyle = "#665533";
	ctx.lineWidth = p(1);
	ctx.strokeRect(p(6), barY, W - p(12), barH);
	drawPauseBtn();
	drawComboHUD();
}

// ── Message "touche l'écran / espace pour voler" au lancement ──
function drawFlyHint() {
	const txt = t("flyHint");
	const y = H * 0.32;
	// Pulsation douce (respiration) via un cosinus sur le temps
	const pulse = 0.75 + 0.25 * Math.sin(frame * 0.12);
	ctx.save();
	ctx.globalAlpha =
		flyHintFrames < 20 ? flyHintFrames / 20 : 1; // fondu de sortie
	ctx.font = `bold ${p(12)}px monospace`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const tw = ctx.measureText(txt).width;
	const padX = p(14),
		padY = p(9);
	const boxH = p(12) + padY * 2; // symétrique autour de y
	ctx.fillStyle = "rgba(0,0,0,.55)";
	ctx.beginPath();
	ctx.roundRect(
		W / 2 - tw / 2 - padX,
		y - boxH / 2,
		tw + padX * 2,
		boxH,
		p(6),
	);
	ctx.fill();
	ctx.strokeStyle = `rgba(120,200,255,${0.5 * pulse + 0.3})`;
	ctx.lineWidth = p(1.5);
	ctx.stroke();
	ctx.shadowColor = `rgba(150,220,255,${pulse})`;
	ctx.shadowBlur = p(10) * pulse;
	ctx.fillStyle = "#eaffff";
	ctx.fillText(txt, W / 2, y);
	ctx.shadowBlur = 0;
	ctx.textBaseline = "alphabetic";
	ctx.restore();
}

// ── Message "collecte les orbes bleues pour recharger" ──
function drawOrbHint() {
	const txt = t("orbHint");
	const y = H * 0.32;
	const pulse = 0.75 + 0.25 * Math.sin(frame * 0.15);
	ctx.save();
	ctx.globalAlpha =
		orbHintFrames < 25 ? orbHintFrames / 25 : Math.min(1, (150 - orbHintFrames) / 20);
	ctx.font = `bold ${p(12)}px monospace`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const tw = ctx.measureText(txt).width;
	const padX = p(14),
		padY = p(9);
	const boxH = p(12) + padY * 2; // symétrique autour de y
	ctx.fillStyle = "rgba(0,0,0,.55)";
	ctx.beginPath();
	ctx.roundRect(
		W / 2 - tw / 2 - padX,
		y - boxH / 2,
		tw + padX * 2,
		boxH,
		p(6),
	);
	ctx.fill();
	ctx.strokeStyle = `rgba(80,180,255,${0.55 * pulse + 0.3})`;
	ctx.lineWidth = p(1.5);
	ctx.stroke();
	ctx.shadowColor = `rgba(100,200,255,${pulse})`;
	ctx.shadowBlur = p(11) * pulse;
	ctx.fillStyle = "#eaf6ff";
	ctx.fillText(txt, W / 2, y);
	ctx.shadowBlur = 0;
	ctx.textBaseline = "alphabetic";
	ctx.restore();
}

// ══════════════════════════════════════════
//  MILESTONE CELEBRATION
// ══════════════════════════════════════════
let nextMilestone = 100;
function checkMilestone() {
	if (distM >= nextMilestone) {
		const ms = nextMilestone;
		nextMilestone += ms < 500 ? 100 : 500;
		if (!robot || !robot.alive) return; // safety: robot may have died in same frame
		spawnStarCluster(robot.wx + W * 0.5, 6);
		addFloat(
			robot.wx,
			robot.wy - p(30),
			ms + "m " + t("milestone"),
			"#44ffaa",
			1.4,
		);
		boom(robot.wx, robot.wy, "#44ffaa", 16);
		shakeIntensity = p(5);
		if (sd.vibration && navigator.vibrate)
			navigator.vibrate([50, 30, 50, 30, 50]);
	}
}

// ══════════════════════════════════════════
//  SETUP SCREENS (canvas-drawn)
// ══════════════════════════════════════════


// ══════════════════════════════════════════
//  ÉCLAIRS ENTRE ENNEMIS PROCHES
// ══════════════════════════════════════════
function drawLightningArc(x1,y1,x2,y2) {
	const segs=5,dx=(x2-x1)/segs,dy=(y2-y1)/segs;
	ctx.beginPath(); ctx.moveTo(x1,y1);
	for (let i=1;i<segs;i++) {
		ctx.lineTo(x1+dx*i+(Math.random()-.5)*p(10),y1+dy*i+(Math.random()-.5)*p(10));
	}
	ctx.lineTo(x2,y2);
	ctx.strokeStyle="rgba(130,170,255,0.75)"; ctx.lineWidth=p(1.2);
	ctx.shadowColor="#99aaff"; ctx.shadowBlur=p(5);
	ctx.stroke(); ctx.shadowBlur=0;
}
function tickLightning() {
	if (frame%4!==0) return;
	ctx.save(); ctx.globalAlpha=0.5;
	const maxD=p(145);
	for (let i=0;i<enemies.length;i++) for (let j=i+1;j<enemies.length;j++) {
		if (Math.hypot(enemies[i].wx-enemies[j].wx,enemies[i].wy-enemies[j].wy)<maxD)
			if (Math.floor(frame/6)%3!==0)
				drawLightningArc(sx(enemies[i].wx),enemies[i].wy+shakeY,sx(enemies[j].wx),enemies[j].wy+shakeY);
	}
	ctx.restore();
}

// ══════════════════════════════════════════
//  SPEED STREAK MULTIPLIER
// ══════════════════════════════════════════
function updateSpeedStreak() {
	if (!robot||gs!=="flying") { speedStreakMult=1; _pmFullGlobal=false; _pmFullHyst=0; return; }
	const pmFull=Math.round(Math.min(1,robot.speed/Math.max(1,uv("cannon")*18+5))*7)>=7;
	if (pmFull) { speedStreakFrames=Math.min(speedStreakFrames+1,660); _pmFullHyst=12; }
	else speedStreakFrames=Math.max(0,speedStreakFrames-3);
	speedStreakMult=speedStreakFrames>=600?3:speedStreakFrames>=300?2:speedStreakFrames>=180?1.5:1;
	// _pmFullGlobal avec hysteresis : reste true 12 frames après PM_FULL=false
	if (pmFull) _pmFullGlobal=true;
	else if (_pmFullHyst>0) { _pmFullHyst--; _pmFullGlobal=true; }
	else _pmFullGlobal=false;
}

// ── Son boost style Sonic Generations ────────────────────────────
function synthBoostSonic() {
	if (!sd.sound) return;
	const actx = getActx();
	const play = () => {
		try {
			const ab = b64ToArrayBuffer(BOOST_SND_B64);
			actx.decodeAudioData(ab).then((buf) => {
				const src = actx.createBufferSource();
				src.buffer = buf;
				const g = actx.createGain();
				g.gain.value = 0.85;
				src.connect(g);
				g.connect(actx.destination);
				src.start(0);
			}).catch(() => {});
		} catch(e) {}
	};
	if (actx.state === 'running') play();
	else actx.resume().then(play);
}

// ── Avance vers l'écran suivant après l'intro ─────────────────────
function advanceFromIntro() {
	if (!sd.lang) {
		const sdk = _gpx();
		const gpxLang = (sdk && typeof sdk.lang === 'function') ? sdk.lang() : null;
		setupLang = gpxLang === "en" ? "en" : "fr";
		gs = "lang";
	} else if (!sd.name) {
		gs = "nameSetup";
		showNameSetup();
	} else if (!sd.setupDone) {
		// Joueur existant sans setupDone (migration) → tutorial
		sd.setupDone = true;
		save();
		gs = "tutorial";
	} else {
		gs = "start";
		gpxOnMenu();
	}
}

// ── Écran de présentation IS DAOUDA GAMES ─────────────────────────
function drawIntroScreen() {
	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, W, H);

	// Timing (à 60 fps)
	const FADE_IN   = 18;   // 0.3 s  — fondu entrant + zoom-in
	const SHIMMER_F = 72;   // 1.2 s  — début scintillement unique
	const SHIMMER_D = 18;   // 0.3 s  — durée du scintillement
	const HOLD_END  = 180;  // 3.0 s  — fin du maintien
	const FADE_OUT  = 30;   // 0.5 s  — fondu sortant
	const TOTAL     = HOLD_END + FADE_OUT;

	if (introFrame >= TOTAL) {
		advanceFromIntro();
		return;
	}

	// Jouer le son logo une seule fois au premier frame
	if (!introSoundPlayed) {
		introSoundPlayed = true;
		const actx = getActx();
		const play = () => {
			try {
				const ab = b64ToArrayBuffer(INTRO_SND_B64);
				actx.decodeAudioData(ab)
					.then((buf) => {
						const src = actx.createBufferSource();
						src.buffer = buf;
						const g = actx.createGain();
						g.gain.value = 1.0;
						src.connect(g);
						g.connect(actx.destination);
						src.start(0);
					})
					.catch(() => {});
			} catch (e) {}
		};
		if (actx.state === "running") play();
		else actx.resume().then(play);
	}

	// Opacité globale
	let alpha = 1;
	if (introFrame < FADE_IN) {
		alpha = introFrame / FADE_IN;
	} else if (introFrame >= HOLD_END) {
		alpha = 1 - (introFrame - HOLD_END) / FADE_OUT;
	}
	alpha = Math.max(0, Math.min(1, alpha));

	// Scale — zoom-in au départ
	const scaleBase = introFrame < FADE_IN
		? 0.88 + 0.12 * (introFrame / FADE_IN)
		: 1.0;

	// Scintillement unique à 1.2 s (frame 72-90) en cloche sin
	let shimmerAlpha = 0;
	if (introFrame >= SHIMMER_F && introFrame < SHIMMER_F + SHIMMER_D) {
		const s = (introFrame - SHIMMER_F) / SHIMMER_D;
		shimmerAlpha = Math.sin(s * Math.PI);
	}

	// Dessin du logo pleine largeur
	if (
		introLogoImg.complete &&
		introLogoImg.naturalWidth > 0
	) {
		const iw = introLogoImg.naturalWidth;
		const ih = introLogoImg.naturalHeight;
		const drawW = W;
		const drawH = (ih / iw) * W;
		const drawX = 0;
		const drawY = (H - drawH) / 2;

		// shimmerAlpha va de 0→1→0 pendant la fenêtre
		// On multiplie l'alpha de l'image par (1-shimmerAlpha)
		// → image disparaît au pic puis réapparaît = clignotement
		const logoAlpha = alpha * (1 - shimmerAlpha);
		ctx.save();
		ctx.globalAlpha = Math.max(0, logoAlpha);
		ctx.translate(W / 2, H / 2);
		ctx.scale(scaleBase, scaleBase);
		ctx.translate(-W / 2, -H / 2);
		ctx.drawImage(introLogoImg, drawX, drawY, drawW, drawH);
		ctx.restore();
	}

	introFrame++;
}

function drawTapContinue() {
	drawBg();
	CANNON.draw();
	const pw = p(240),
		ph = p(150),
		bx = W / 2 - pw / 2,
		by = H / 2 - ph / 2 - p(30);
	ctx.fillStyle = "rgba(0,0,0,.75)";
	ctx.beginPath();
	ctx.roundRect(bx, by, pw, ph, p(10));
	ctx.fill();
	ctx.strokeStyle = "#2244aa";
	ctx.lineWidth = p(2);
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.fillStyle = "#ffe060";
	ctx.font = `bold ${p(22)}px monospace`;
	ctx.fillText("VECTONOVA", W / 2, by + p(38));
	ctx.shadowBlur = 0;
	ctx.fillStyle = "rgba(255,220,70,.8)";
	ctx.font = `bold ${p(8)}px monospace`;
	ctx.fillText(t("launch"), W / 2, by + p(56));
	const pulse = 0.55 + Math.sin(frame * 0.09) * 0.45;
	ctx.fillStyle = `rgba(130,210,255,${pulse})`;
	ctx.font = `bold ${p(13)}px monospace`;
	ctx.fillText(t("tapContinue"), W / 2, by + p(90));
	ctx.shadowBlur = 0;
	ctx.font = `${p(18)}px monospace`;
	ctx.fillText(
		"👆🏾",
		W / 2,
		by + ph + p(22) + Math.sin(frame * 0.1) * p(5),
	);
}

function drawLangScreen() {
	drawBg();
	CANNON.draw();
	const pw = p(248),
		ph = p(195),
		bx = W / 2 - pw / 2,
		by = H / 2 - ph / 2 - p(10);
	ctx.fillStyle = "rgba(0,0,0,.78)";
	ctx.beginPath();
	ctx.roundRect(bx, by, pw, ph, p(10));
	ctx.fill();
	ctx.strokeStyle = "#2244aa";
	ctx.lineWidth = p(2);
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.fillStyle = "#88ccff";
	ctx.font = `bold ${p(13)}px monospace`;
	ctx.fillText(
		setupLang === "fr"
			? "CHOISIR LA LANGUE"
			: "CHOOSE LANGUAGE",
		W / 2,
		by + p(28),
	);
	const drawLangBtn = (flag, label, selected, bx2, by2) => {
		ctx.fillStyle = selected ? "#1a4a99" : "#111a2a";
		ctx.beginPath();
		ctx.roundRect(bx2, by2, p(88), p(52), p(6));
		ctx.fill();
		ctx.strokeStyle = selected ? "#4488ff" : "#224";
		ctx.lineWidth = p(selected ? 2.5 : 1.5);
		ctx.stroke();
		ctx.font = `${p(24)}px monospace`;
		ctx.fillText(flag, bx2 + p(44), by2 + p(24));
		ctx.fillStyle = selected ? "#88ccff" : "#556";
		ctx.font = `bold ${p(8.5)}px monospace`;
		ctx.fillText(label, bx2 + p(44), by2 + p(43));
	};
	drawLangBtn(
		"🇫🇷",
		"Français",
		setupLang === "fr",
		W / 2 - p(96),
		by + p(50),
	);
	drawLangBtn(
		"🇬🇧",
		"English",
		setupLang === "en",
		W / 2 + p(8),
		by + p(50),
	);
	ctx.fillStyle = "#1a3a88";
	ctx.beginPath();
	ctx.roundRect(W / 2 - p(58), by + p(118), p(116), p(32), p(4));
	ctx.fill();
	ctx.strokeStyle = "#4466cc";
	ctx.lineWidth = p(2);
	ctx.stroke();
	ctx.fillStyle = "#fff";
	ctx.font = `bold ${p(10.5)}px monospace`;
	ctx.fillText(
		setupLang === "fr" ? "CONFIRMER" : "CONFIRM",
		W / 2,
		by + p(138),
	);
}

// Géométrie partagée menu principal — draw ET click handler utilisent ceci
function _smGeom() {
	const hcUnlocked = (sd.gamesPlayed||0) >= 10;
	const natH = p(hcUnlocked ? 401 : 357);          // hauteur naturelle
	const pw   = Math.min(p(260), W * 0.94);
	const ph   = Math.min(natH, GY() * 0.96);
	const psc  = ph / natH;                           // facteur compression
	const ip   = v => v * SC * psc;                   // offset interne mis à l'échelle
	const bx   = Math.round(W / 2 - pw / 2);
	const by   = Math.round(Math.max(p(4), GY() / 2 - ph / 2));
	const PAD  = ip(8);
	const BTNW = pw - PAD * 2;
	const HALFGAP = ip(5);
	const HALFW   = (BTNW - HALFGAP * 2) / 2;
	const GAP  = ip(10);
	const R1H  = ip(44);  const R1Y = by + ip(125);
	const R2H  = ip(34);  const R2Y = R1Y + R1H + GAP;
	const R3H  = ip(34);  const R3Y = R2Y + R2H + GAP;
	const R4H  = ip(34);  const R4Y = R3Y + R3H + GAP;
	const R5H  = ip(32);  const R5Y = R4Y + R4H + GAP;
	const hcBtnY = R5Y + R5H + GAP;
	const hcH    = ip(34);
	const THIRD  = (BTNW - HALFGAP * 2) / 3;
	return { hcUnlocked, pw, ph, bx, by, PAD, BTNW,
				HALFGAP, HALFW, GAP, ip, psc,
				R1Y,R1H,R2Y,R2H,R3Y,R3H,R4Y,R4H,R5Y,R5H,
				hcBtnY, hcH, THIRD };
}

function drawStartScreen() {
	drawBg();
	CANNON.update();
	CANNON.draw();

	// ── Panel geometry ─────────────────────────────────────────────
	const { hcUnlocked,pw,ph,bx,by,PAD,BTNW,HALFGAP,HALFW,GAP,ip,psc,
			R1Y,R1H,R2Y,R2H,R3Y,R3H,R4Y,R4H,R5Y,R5H,
			hcBtnY:_hcBtnY,hcH:_hcH,THIRD:_THIRD } = _smGeom();

	// ── Background panel ──────────────────────────────────────────
	ctx.fillStyle = "rgba(5,8,28,.82)";
	ctx.beginPath();
	ctx.roundRect(bx, by, pw, ph, p(8));
	ctx.fill();
	ctx.strokeStyle = "#1e3888";
	ctx.lineWidth = p(1.5);
	ctx.stroke();

	// ── Title — fills panel width, animated ──────────────────────
	// pad_top=14 → title visual top at by+p(14), baseline at by+p(51)
	// All content fills p(14)→p(336), bottom pad=14 → perfectly centered
	const TITLE = "VECTONOVA";
	let tSize = p(47);
	ctx.font = `bold ${tSize}px monospace`;
	while (
		ctx.measureText(TITLE).width > pw * 0.96 &&
		tSize > p(20)
	) {
		tSize -= 0.5;
		ctx.font = `bold ${tSize}px monospace`;
	}
	const tPulse = 1 + Math.sin(frame * 0.07) * 0.03;
	const tGlow = 10 + Math.sin(frame * 0.09) * 8;
	const tHue = frame * 1.2;
	const c1 = `hsl(${(tHue % 60) + 40},100%,72%)`;
	const c2 = `hsl(${((tHue + 30) % 60) + 20},100%,55%)`;
	const tGrad = ctx.createLinearGradient(
		W / 2 - BTNW / 2,
		0,
		W / 2 + BTNW / 2,
		0,
	);
	tGrad.addColorStop(0, c2);
	tGrad.addColorStop(0.5, c1);
	tGrad.addColorStop(1, c2);
	const tY = by + ip(51);
	ctx.save();
	ctx.translate(W / 2, tY);
	ctx.scale(tPulse, tPulse);
	ctx.textAlign = "center";
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = tGrad;
	ctx.shadowColor = `rgba(255,200,50,${0.7 + Math.sin(frame * 0.09) * 0.3})`;
	ctx.shadowBlur = p(tGlow);
	ctx.font = `bold ${tSize}px monospace`;
	ctx.fillText(TITLE, 0, 0);
	ctx.shadowBlur = p(4);
	ctx.globalAlpha = 0.55;
	ctx.fillStyle = "rgba(255,255,220,0.9)";
	ctx.fillText(TITLE, 0, 0);
	ctx.restore();
	ctx.shadowBlur = 0;
	ctx.textBaseline = "alphabetic";

	ctx.fillStyle = "#ffdd55";
	ctx.font = `bold ${p(9)}px monospace`;
	ctx.fillText(t("launch"), W / 2, by + ip(70));

	ctx.fillStyle = "#aaccee";
	ctx.font = `bold ${p(8)}px monospace`;
	ctx.fillText(
		t("record") +
			": " +
			sd.best +
			"m  ·  COMBO ×" +
			sd.bestCombo,
		W / 2,
		by + ip(80),
	);

	// ── Stats widget — top=by+p(86) ──────────────────────────────
	const achCount = sd.ach.length,
		achPct = achCount / ACHS.length;
	const bdgCount = sd.bdg.length,
		bdgPct = bdgCount / BADGES.length;
	const WGY = by + ip(93),
		WGH = ip(22);
	const LX = bx + PAD,
		RX = LX + HALFW + HALFGAP * 2,
		CW = HALFW;

	// left cell
	ctx.fillStyle = "rgba(0,0,0,.45)";
	ctx.beginPath();
	ctx.roundRect(LX, WGY, CW, WGH, p(3));
	ctx.fill();
	ctx.strokeStyle = "rgba(40,90,180,.5)";
	ctx.lineWidth = p(1);
	ctx.stroke();
	if (achPct > 0) {
		const g = ctx.createLinearGradient(LX, 0, LX + CW, 0);
		g.addColorStop(0, "rgba(25,70,190,.6)");
		g.addColorStop(1, "rgba(70,150,255,.3)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.roundRect(LX, WGY, CW * achPct, WGH, p(3));
		ctx.fill();
	}
	ctx.textAlign = "left";
	ctx.fillStyle = "rgba(140,190,255,.75)";
	ctx.font = `${ip(5.5)}px monospace`;
	ctx.fillText("🏅 SUCCÈS", LX + ip(4), WGY + ip(9));
	ctx.fillStyle = "#ddeeff";
	ctx.font = `bold ${ip(8)}px monospace`;
	ctx.fillText(
		achCount + "/" + ACHS.length,
		LX + ip(4),
		WGY + ip(19),
	);
	ctx.textAlign = "right";
	ctx.fillStyle = "rgba(100,170,255,.65)";
	ctx.font = `${ip(6)}px monospace`;
	ctx.fillText(
		Math.round(achPct * 100) + "%",
		LX + CW - ip(4),
		WGY + ip(19),
	);

	// right cell
	ctx.fillStyle = "rgba(0,0,0,.45)";
	ctx.beginPath();
	ctx.roundRect(RX, WGY, CW, WGH, p(3));
	ctx.fill();
	ctx.strokeStyle = "rgba(130,85,0,.5)";
	ctx.lineWidth = p(1);
	ctx.stroke();
	if (bdgPct > 0) {
		const g = ctx.createLinearGradient(RX, 0, RX + CW, 0);
		g.addColorStop(0, "rgba(155,95,0,.6)");
		g.addColorStop(1, "rgba(255,195,55,.3)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.roundRect(RX, WGY, CW * bdgPct, WGH, p(3));
		ctx.fill();
	}
	ctx.textAlign = "left";
	ctx.fillStyle = "rgba(255,195,100,.75)";
	ctx.font = `${ip(5.5)}px monospace`;
	ctx.fillText("🎖 BADGES", RX + ip(4), WGY + ip(9));
	ctx.fillStyle = "#ffeecc";
	ctx.font = `bold ${ip(8)}px monospace`;
	ctx.fillText(
		bdgCount + "/" + BADGES.length,
		RX + ip(4),
		WGY + ip(19),
	);
	ctx.textAlign = "right";
	ctx.fillStyle = "rgba(255,175,55,.65)";
	ctx.font = `${ip(6)}px monospace`;
	ctx.fillText(
		Math.round(bdgPct * 100) + "%",
		RX + CW - ip(4),
		WGY + ip(19),
	);
	ctx.textAlign = "center";

	// ── Buttons — stats bottom=p(108), R1Y=p(118), R5 bottom=p(336), pad=14 ──
	// GAP=10, R1H=44, R2-4H=34, R5H=32 → perfectly symmetric with header
	// (R1Y/R1H/GAP etc. déjà dans _smGeom)
	ctx.fillStyle = "#12306e";
	ctx.beginPath();
	ctx.roundRect(bx + PAD, R1Y, BTNW, R1H, ip(5));
	ctx.fill();
	ctx.strokeStyle = "#3d66cc";
	ctx.lineWidth = p(1.5);
	ctx.stroke();
	ctx.fillStyle = "#fff";
	ctx.shadowColor = "rgba(255,255,255,0.8)";
	ctx.shadowBlur = p(10);
	ctx.font = `bold ${ip(15)}px monospace`;
	ctx.fillText(t("play"), W / 2, R1Y + R1H * 0.66);
	ctx.shadowBlur = 0;

	// Row 2 : AMÉLIORATIONS (full width)

	ctx.fillStyle = "#241c00";
	ctx.beginPath();
	ctx.roundRect(bx + PAD, R2Y, BTNW, R2H, ip(4));
	ctx.fill();
	ctx.strokeStyle = "#7a5c00";
	ctx.lineWidth = p(1.5);
	ctx.stroke();
	ctx.fillStyle = "#ffcc44";
	ctx.font = `bold ${ip(11)}px monospace`;
	ctx.fillText(t("upgrades"), W / 2, R2Y + R2H * 0.66);

	// Row 3 : SCORES (full width)

	ctx.fillStyle = "#001826";
	ctx.beginPath();
	ctx.roundRect(bx + PAD, R3Y, BTNW, R3H, ip(4));
	ctx.fill();
	ctx.strokeStyle = "#005a70";
	ctx.lineWidth = p(1.5);
	ctx.stroke();
	ctx.fillStyle = "#44ddff";
	ctx.font = `bold ${ip(11)}px monospace`;
	ctx.fillText(t("scores"), W / 2, R3Y + R3H * 0.66);

	// Row 4 : SUCCÈS | BADGES (half width each)

	[
		[t("achievements"), "#1a2a10", "#3d7020", "#88ff88"],
		[t("badges"), "#271a00", "#7a5c20", "#ffcc66"],
	].forEach(([lbl, bg, br, col], i) => {
		const rx2 = bx + PAD + (HALFW + HALFGAP * 2) * i;
		ctx.fillStyle = bg;
		ctx.beginPath();
		ctx.roundRect(rx2, R4Y, HALFW, R4H, ip(4));
		ctx.fill();
		ctx.strokeStyle = br;
		ctx.lineWidth = ip(1.5);
		ctx.stroke();
		ctx.fillStyle = col;
		ctx.font = `bold ${ip(10)}px monospace`;
		ctx.fillText(lbl, rx2 + HALFW / 2, R4Y + R4H * 0.66);
	});

	// Row 5 : DÉFIS | TUTORIEL | OPTIONS (3 colonnes égales)
	const THIRD = _THIRD;
	[
		["📅 " + t("daily"), "#1a1428", "#6a3a80", "#cc88ff"],
		["❓ " + t("tutorial"), "#0e1428", "#2a3a60", "#88aaff"],
		["⚙ " + t("options"), "#0e0e1a", "#333", "#888"],
	].forEach(([lbl, bg, br, col], i) => {
		const rx2 = bx + PAD + (THIRD + HALFGAP) * i;
		ctx.fillStyle = bg;
		ctx.beginPath();
		ctx.roundRect(rx2, R5Y, THIRD, R5H, ip(4));
		ctx.fill();
		ctx.strokeStyle = br;
		ctx.lineWidth = ip(1.5);
		ctx.stroke();
		ctx.fillStyle = col;
		ctx.font = `bold ${ip(9)}px monospace`;
		ctx.fillText(lbl, rx2 + THIRD / 2, R5Y + R5H * 0.66);
	});

	if (hcUnlocked) {
		const hcBtnY = _hcBtnY, hcH = _hcH;
		ctx.fillStyle = hardcoreMode ? "#5c0000" : "#1a0800";
		ctx.beginPath(); ctx.roundRect(bx+PAD, hcBtnY, BTNW, hcH, ip(4)); ctx.fill();
		ctx.strokeStyle = hardcoreMode ? "#ff2200" : "#661100";
		ctx.lineWidth = p(1.5); ctx.stroke();
		const hcPulse = hardcoreMode ? 1+Math.sin(frame*0.18)*0.06 : 1;
		ctx.fillStyle = hardcoreMode ? "#ff5544" : "#774433";
		ctx.font = `bold ${ip(11*hcPulse)}px monospace`;
		ctx.fillText(
			hardcoreMode ? "🔥 HARDCORE : ON  (+50%)" : "🔥 HARDCORE : OFF",
			W/2, hcBtnY + hcH*0.66
		);
		if (hardcoreMode) {
			ctx.fillStyle = "rgba(255,60,30,0.07)";
			ctx.fillRect(bx, by, pw, ph);
		}
	}
	// ── Crédits musique — au-dessus du sol ────────────────────
	ctx.save();
	ctx.globalAlpha = 0.55;
	ctx.fillStyle = "#aaccee";
	ctx.font = `bold ${ip(12)}px monospace`;
	ctx.textAlign = "center";
	const _gy = GY();
	ctx.fillText("© Is Daouda Games", W/2, _gy + ip(13));
	ctx.font = `${ip(10.5)}px monospace`;
	ctx.globalAlpha = 0.45;
	ctx.fillText("Music by Vladislav Litvinenko from Pixabay", W/2, _gy + ip(26));
	ctx.fillText("Music by Kontraa Music from Pixabay", W/2, _gy + ip(38));
	ctx.restore();
}

function drawResults() {
	drawBg();
	const pw = p(244),
		ph = p(350),
		bx = W / 2 - pw / 2,
		by = H / 2 - ph / 2 - p(8);
	const rg = ctx.createLinearGradient(bx, by, bx, by + ph);
	rg.addColorStop(0, "#c88010");
	rg.addColorStop(0.4, "#a06008");
	rg.addColorStop(1, "#7a4800");
	ctx.fillStyle = rg;
	ctx.beginPath();
	ctx.roundRect(bx, by, pw, ph, p(6));
	ctx.fill();
	ctx.strokeStyle = "#5a3000";
	ctx.lineWidth = p(3);
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.fillStyle = "rgba(0,0,0,.4)";
	ctx.beginPath();
	ctx.roundRect(bx + p(8), by + p(8), pw - p(16), p(24), p(3));
	ctx.fill();
	ctx.fillStyle = "#ffe080";
	ctx.font = `bold ${p(11)}px monospace`;
	ctx.fillText(t("results"), W / 2, by + p(24));
	ctx.fillStyle = "rgba(0,0,0,.3)";
	ctx.beginPath();
	ctx.roundRect(bx + p(8), by + p(38), pw - p(16), p(24), p(3));
	ctx.fill();
	ctx.fillStyle = "#fff";
	ctx.font = `${p(9)}px monospace`;
	ctx.textAlign = "left";
	ctx.fillText(t("distance") + ":", bx + p(14), by + p(54));
	ctx.textAlign = "right";
	ctx.fillStyle = "#88ff88";
	ctx.fillText(resData.d + "m", bx + pw - p(14), by + p(54));
	// Combo badge
	if (comboMax >= 2) {
		ctx.fillStyle = "rgba(0,0,0,.25)";
		ctx.beginPath();
		ctx.roundRect(
			bx + p(8),
			by + p(67),
			pw - p(16),
			p(20),
			p(3),
		);
		ctx.fill();
		ctx.fillStyle =
			comboMax >= 5
				? "#ff4400"
				: comboMax >= 3
					? "#ffaa00"
					: "#ffe000";
		ctx.font = `bold ${p(8.5)}px monospace`;
		ctx.textAlign = "center";
		ctx.fillText(
			"🔥 BEST COMBO: x" + comboMax,
			W / 2,
			by + p(81),
		);
	}
	const barsY = comboMax >= 2 ? by + p(94) : by + p(70);
	[
		{ l: "distance", v: resData.m1, c: "#4488ff" },
		{ l: "bonus", v: resData.m2, c: "#ffaa00" },
		{ l: "stars", v: resData.m3, c: "#ffee00" },
		{ l: "combo", v: resData.m4, c: "#ff6600" },
	].forEach((b, i) => {
		const ry = barsY + i * p(40);
		ctx.fillStyle = "rgba(0,0,0,.25)";
		ctx.beginPath();
		ctx.roundRect(bx + p(8), ry, pw - p(16), p(34), p(3));
		ctx.fill();
		ctx.fillStyle = "#ccc";
		ctx.font = `${p(7)}px monospace`;
		ctx.textAlign = "left";
		ctx.fillText(t(b.l), bx + p(12), ry + p(12));
		const bw = pw - p(32);
		ctx.fillStyle = "rgba(0,0,0,.4)";
		ctx.fillRect(bx + p(12), ry + p(16), bw, p(9));
		ctx.fillStyle = b.c;
		ctx.fillRect(
			bx + p(12),
			ry + p(16),
			Math.min(bw, bw * (b.v / 200)),
			p(9),
		);
		ctx.strokeStyle = "rgba(0,0,0,.3)";
		ctx.lineWidth = p(1);
		ctx.strokeRect(bx + p(12), ry + p(16), bw, p(9));
		ctx.fillStyle = "#fff";
		ctx.textAlign = "right";
		ctx.font = `${p(7)}px monospace`;
		ctx.fillText(b.v + " $", bx + pw - p(12), ry + p(30));
	});
	const divY = barsY + p(166);
	ctx.strokeStyle = "rgba(0,0,0,.3)";
	ctx.lineWidth = p(1);
	ctx.beginPath();
	ctx.moveTo(bx + p(12), divY);
	ctx.lineTo(bx + pw - p(12), divY);
	ctx.stroke();
	ctx.fillStyle = "rgba(0,0,0,.2)";
	ctx.beginPath();
	ctx.roundRect(bx + p(8), divY + p(5), pw - p(16), p(22), p(3));
	ctx.fill();
	ctx.fillStyle = "#ffe080";
	ctx.font = `bold ${p(8)}px monospace`;
	ctx.textAlign = "left";
	ctx.fillText(t("earned") + ":", bx + p(14), divY + p(20));
	ctx.textAlign = "right";
	ctx.fillStyle = "#fff";
	ctx.fillText(resData.e + " $", bx + pw - p(14), divY + p(20));
	ctx.fillStyle = "rgba(0,0,0,.2)";
	ctx.beginPath();
	ctx.roundRect(bx + p(8), divY + p(30), pw - p(16), p(22), p(3));
	ctx.fill();
	ctx.fillStyle = "#fff";
	ctx.font = `bold ${p(8)}px monospace`;
	ctx.textAlign = "left";
	ctx.fillText(t("total") + ":", bx + p(14), divY + p(45));
	ctx.textAlign = "right";
	ctx.fillStyle = "#ffe060";
	ctx.fillText(sd.money + " $", bx + pw - p(14), divY + p(45));
	const btnY = divY+p(58);
	// 4 boutons: MENU | SHOP | PARTAGER | REJOUER
	// pw=p(244), padding=p(8) each side → usable=pw-p(16)=p(228), 3 gaps of p(4) → bw=(p(228)-p(12))/4=p(54)
	const bw4 = p(54),
		bg4 = p(4);
	[
		{
			l: "🏠 MENU",
			bg: "#1a1010",
			br: "#553322",
			c: "#ffaa88",
		},
		{
			l: t("shop"),
			bg: "#223366",
			br: "#4466aa",
			c: "#aabbff",
		},
		{
			l: t("scores"),
			bg: "#002230",
			br: "#006688",
			c: "#44ddff",
		},
		{
			l: t("retry"),
			bg: "#1a5522",
			br: "#44aa55",
			c: "#88ff99",
		},
	].forEach((b, i) => {
		const bx2 = bx+p(8)+(bw4+bg4)*i;
		ctx.fillStyle=b.bg; ctx.beginPath(); ctx.roundRect(bx2,btnY,bw4,p(30),p(3)); ctx.fill();
		ctx.strokeStyle=b.br; ctx.lineWidth=p(1.5); ctx.stroke();
		ctx.fillStyle=b.c; ctx.font=`bold ${p(8)}px monospace`;
		ctx.textAlign="center"; ctx.fillText(b.l, bx2+bw4/2, btnY+p(20));
	});
}

// ══════════════════════════════════════════
//  MAIN LOOP
// ══════════════════════════════════════════
function loop() {
	try {
		frame++;
		ctx.clearRect(0, 0, W, H);
		tickShake();
		tickToast();

		switch (gs) {
			case "tapContinue":
				drawTapContinue();
				break;
			case "intro":
				drawIntroScreen();
				break;
			case "lang":
				drawLangScreen();
				break;
			case "nameSetup":
				drawBg();
				CANNON.draw();
				break;
			case "tutorial":
				drawTutorial();
				break;
			case "start":
				drawStartScreen();
				break;
			case "results":
				drawResults();
				break;
			case "aim":
				drawBg();
				tickPfx();
				CANNON.update();
				CANNON.draw();
				drawHUD();
				break;
			case "paused":
				// Static background while paused
				drawBg();
				if (robot) robot.draw();
				drawHUD();
				break;
			case "continueOffer":
				// Statique pendant l'offre de continuation
				drawBg();
				if (robot) robot.draw();
				drawHUD();
				break;
			case "flying":
			case "dead":
				drawBg();
				tickPfx();
				if (camX + W > nextStarWX) {
					spawnStar(
						nextStarWX +
							W +
							p(60) +
							Math.random() * p(80),
					);
					nextStarWX += p(130) + Math.random() * p(120);
				}
				if (camX + W > nextEnemyWX) {
					if (distM > 15)
						spawnEnemy(
							nextEnemyWX +
								W +
								p(80) +
								Math.random() * p(100),
						);
					nextEnemyWX += p(180) + Math.random() * p(160);
				}
				if (camX + W > nextBoostWX) {
					spawnBoost(
						nextBoostWX +
							W +
							p(160) +
							Math.random() * p(200),
					);
					nextBoostWX += p(500) + Math.random() * p(400);
				}
				if (camX + W > nextRingWX) {
					spawnRing(
						nextRingWX +
							W +
							p(120) +
							Math.random() * p(160),
					);
					nextRingWX += p(400) + Math.random() * p(300);
				}
				if (camX + W > nextChestWX) {
					spawnChest(
						nextChestWX +
							W +
							p(150) +
							Math.random() * p(200),
					);
					nextChestWX += p(450) + Math.random() * p(300);
				}
				if (camX + W > nextMeteorWX && distM > 50) {
					spawnMeteor(
						camX + W * 0.5 + Math.random() * W * 0.4,
					);
					nextMeteorWX =
						camX + W + p(200) + Math.random() * p(300);
				}
				tickDrawStars();
				tickDrawBoosts();
				tickDrawRings();
				tickDrawChests();
				tickDrawMeteors();
				enemies.forEach((e) => { e.update(); e.draw(); });
				enemies = enemies.filter((e) => e.alive);
				tickLightning();

				updateSpeedStreak();
				tickCombo();
				tickDrawFloats();
				if (robot) {
					if (robot.alive) {
						robot.update();
						checkMilestone();
						// Track no-jetpack distance
						if (jetOn) {
							jetWasOn = true;
							distNoJetStart = distM;
						} else {
							runMaxDistNoJet = Math.max(
								runMaxDistNoJet,
								distM - distNoJetStart,
							);
						}
						for (const e of enemies) {
							if (!e.alive) continue;
							if (
								Math.hypot(
									robot.wx - e.wx,
									robot.wy - e.wy,
								) <
								robot.r + e.r - p(2)
							) {
								e.alive = false;
								robot.hit();
								break;
							}
						}
					}
					robot.draw();
					if (!robot.alive && gs === "flying") {
						gs = "dead";
						deadTimer = 52;
					}
				}
				if (robot && gs === "flying") {
					const _pmFull =
						Math.round(
							Math.min(
								1,
								robot.speed /
									Math.max(
										1,
										uv("cannon") * 18 + 5,
									),
							) * 7,
						) >= 7;
					if (_pmFull) runRedZone = true;
				}
				if (gs === "dead") {
					deadTimer--;
					if (deadTimer <= 0) {
						if (!runContinueUsed) offerContinue();
						else endGame();
					}
				}
				if (gs === "flying" && flyHintFrames > 0) {
					if (jetOn) flyHintFrames = 0; // le joueur a compris, on efface
					else {
						flyHintFrames--;
						drawFlyHint();
					}
					if (flyHintFrames === 0 && orbHintPending) {
						orbHintPending = false;
						orbHintFrames = 150; // ~2.5s
					}
				} else if (gs === "flying" && orbHintFrames > 0) {
					orbHintFrames--;
					drawOrbHint();
				}
				CANNON.draw();
				drawHUD();
				break;
			case "shop":
			case "ach":
			case "bdg":
			case "dc":
			case "lb":
			case "options":
				drawBg();
				break;
		}
	} catch (err) {
		console.error("[ROBOFLY loop]:", err);
	}
	animId = requestAnimationFrame(loop);
}

// ══════════════════════════════════════════
//  INPUT
// ══════════════════════════════════════════
function getPos(e) {
	ensureSFX();
	if (_actx && _actx.state === "suspended") _actx.resume();
	const r = cvs.getBoundingClientRect();
	const src = e.touches ? e.touches[0] : e;
	return {
		x: (src.clientX - r.left) * (W / r.width),
		y: (src.clientY - r.top) * (H / r.height),
	};
}
function inR(x, y, rx, ry, rw, rh) {
	return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
}

function onDown(e) {
	if (e.cancelable) e.preventDefault();
	if (nameSetupActive) return;
	const { x, y } = getPos(e);

	if (gs === "tapContinue") {
		gs = "intro";
		return;
	}
	// intro : non-passable, avance seule
	if (gs === "lang") {
		const pw = p(248),
			ph = p(195),
			bx = W / 2 - pw / 2,
			by = H / 2 - ph / 2 - p(10);
		if (inR(x, y, W / 2 - p(96), by + p(50), p(88), p(52))) {
			setupLang = "fr";
			return;
		}
		if (inR(x, y, W / 2 + p(8), by + p(50), p(88), p(52))) {
			setupLang = "en";
			return;
		}
		if (inR(x, y, W / 2 - p(58), by + p(118), p(116), p(32))) {
			sd.lang = setupLang;
			save();
			if (!sd.name) {
				gs = "nameSetup";
				showNameSetup();
			} else { gs = "start"; gpxOnMenu(); }
			return;
		}
		return;
	}
	if (gs === "start") {
		const { pw,ph,bx,by,PAD,BTNW,HALFGAP,HALFW,GAP,
				R1Y,R1H,R2Y,R2H,R3Y,R3H,R4Y,R4H,R5Y,R5H,
				hcBtnY,hcH,THIRD,hcUnlocked } = _smGeom();
		if (inR(x, y, bx + PAD, R1Y, BTNW, R1H)) {
			synthClick();
			startGame();
			return;
		}
		if (hcUnlocked) {
			if (inR(x, y, bx+PAD, hcBtnY, BTNW, hcH)) {
				synthClick(); hardcoreMode = !hardcoreMode; return;
			}
		}
		if (inR(x, y, bx + PAD, R2Y, BTNW, R2H)) {
			synthClick();
			openShop();
			return;
		}
		if (inR(x, y, bx + PAD, R3Y, BTNW, R3H)) {
			synthClick();
			openLB();
			return;
		}
		if (inR(x, y, bx + PAD, R4Y, HALFW, R4H)) {
			synthClick();
			openAch();
			return;
		}
		if (
			inR(
				x,
				y,
				bx + PAD + HALFW + HALFGAP * 2,
				R4Y,
				HALFW,
				R4H,
			)
		) {
			synthClick();
			openBdg();
			return;
		}
		// Row 5: DÉFIS | TUTORIEL | OPTIONS
		if (inR(x, y, bx + PAD, R5Y, THIRD, R5H)) {
			synthClick();
			openDC();
			return;
		}
		if (
			inR(x, y, bx + PAD + THIRD + HALFGAP, R5Y, THIRD, R5H)
		) {
			synthClick();
			openTutorial();
			return;
		}
		if (
			inR(
				x,
				y,
				bx + PAD + (THIRD + HALFGAP) * 2,
				R5Y,
				THIRD,
				R5H,
			)
		) {
			synthClick();
			openOptions();
			return;
		}
		// pas de fallthrough — uniquement clic hors panel ignoré
		return;
	}
	if (gs === "tutorial") {
		const pages = getTutPages();
		const pw = p(340),
			ph = p(270),
			bx = W / 2 - pw / 2,
			by = H / 2 - ph / 2;
		const btnY = by + ph - p(22),
			btnH = p(18);
		const isLast = tutPage === pages.length - 1;
		if (inR(x, y, bx + pw - p(22), by + p(6), p(22), p(22))) {
			synthClick();
			gs = "start"; gpxOnMenu();
			return;
		}
		if (
			tutPage > 0 &&
			inR(x, y, bx + p(10), btnY, p(80), btnH)
		) {
			synthClick();
			tutPage--;
			return;
		}
		if (inR(x, y, bx + pw - p(100), btnY, p(90), btnH)) {
			synthClick();
			if (isLast) {
				gs = "start"; gpxOnMenu();
			} else {
				tutPage++;
			}
			return;
		}
		if (!isLast) {
			synthClick();
			tutPage++;
			return;
		}
		synthClick();
		gs = "start"; gpxOnMenu();
		return;
	}
	if (gs === "aim") {
		launchRobot();
		return;
	}
	if (gs === "flying") {
		if (isPauseBtn(x, y)) {
			synthClick();
			pauseGame();
			return;
		}
		jetOn = true;
		return;
	}
	if (gs === "results") {
		const pw = p(244),
			ph = p(350),
			bx = W / 2 - pw / 2,
			by = H / 2 - ph / 2 - p(8);
		const barsY = comboMax >= 2 ? by + p(94) : by + p(70);
		const divY = barsY + p(166);
		const btnY = divY+p(58);
		const bw4 = p(54), bg4 = p(4);
		if (inR(x, y, bx + p(8), btnY, bw4, p(30))) {
			synthClick();
			gs = "start";
			gpxOnMenu();
			frame = 0;
			camX = 0;
			initBg();
			CANNON.active = false;
			CANNON.show = true;
			CANNON.angle = -Math.PI * 0.35;
			return;
		}
		if (inR(x, y, bx + p(8) + bw4 + bg4, btnY, bw4, p(30))) {
			synthClick();
			openShop();
			return;
		}
		if (inR(x, y, bx+p(8)+(bw4+bg4)*2, btnY, bw4, p(30))) {
			synthClick();
			openLB();
			return;
		}
		if (
			inR(x, y, bx + p(8) + (bw4 + bg4) * 3, btnY, bw4, p(30))
		) {
			synthClick();
			startGame();
			return;
		}
	}
}
function onUp() {
	jetOn = false;
}

cvs.addEventListener("mousedown", onDown);
cvs.addEventListener("touchstart", onDown, { passive: false });
document.addEventListener("mouseup", onUp);
document.addEventListener("touchend", onUp);
document.addEventListener("contextmenu", (e) => e.preventDefault());
document.addEventListener("keydown", (e) => {
	if (["Space", "ArrowUp"].includes(e.code)) {
		e.preventDefault();
		if (gs === "tapContinue") {
			gs = "intro";
			return;
		}
		// intro : non-passable
		if (gs === "start") {
			synthClick();
			startGame();
			return;
		}
		if (gs === "aim") {
			launchRobot();
			return;
		} // return = no jetpack on launch frame
		if (gs === "flying") jetOn = true;
		if (gs === "paused") resumeGame();
	}
	if (e.code === "Escape" || e.code === "Enter") {
		if (
			e.code === "Enter" &&
			["flying", "paused"].includes(gs)
		) {
			synthClick();
			if (gs === "flying") pauseGame();
			else resumeGame();
		} else if (e.code === "Escape") {
			if (gs === "flying") {
				synthClick();
				pauseGame();
			} else if (gs === "paused") {
				synthClick();
				resumeGame();
			} else if (gs === "tutorial") {
				synthClick();
				gs = "start"; gpxOnMenu();
			} else if (gs === "shop") {
				synthClick();
				closeShop();
			} else if (gs === "ach") {
				synthClick();
				closeAch();
			} else if (gs === "bdg") {
				synthClick();
				closeBdg();
			} else if (gs === "dc") {
				synthClick();
				closeDC();
			} else if (gs === "lb") {
				synthClick();
				closeLB();
			} else if (gs === "options") {
				synthClick();
				closeOptions();
			}
		}
	}
});
document.addEventListener("keyup", (e) => {
	if (["Space", "ArrowUp"].includes(e.code)) jetOn = false;
});

// ══════════════════════════════════════════
//  GAME FLOW
// ══════════════════════════════════════════
function startGame() {
	gpxGameplayStop();
	gpxGameplayStart();
	playGameMusic();
	distM = 0;
	coins = 0;
	frame = 0;
	camX = 0;
	shakeIntensity = 0;
	shakeX = 0;
	shakeY = 0;
	bgThemeIdx = 0;
	_bgFadeAlpha = 0;
	_bgFadeDir   = 0;
	_bgNextIdx   = 0;
	_skyGrad = null; // reset biome to night city
	stars = [];
	enemies = [];
	boosts = [];
	rings = [];
	chests = [];
	meteors = [];
	pfx = [];
	floatTexts = [];
	robot = null;
	jetOn = false;
	maxFuel = uv("battery");
	jetFuel = maxFuel;
	shield = uv("armor");
	combo = 0;
	comboTimer = 0;
	comboMax = 0;
	nextMilestone = 100;
	// windZones reset
	windZones = [];
	speedStreakFrames = 0;
	speedStreakMult = 1;
	nextStarWX = p(200);
	nextEnemyWX = p(380);
	nextBoostWX = p(300);
	nextRingWX = p(450);
	nextChestWX = p(500);
	nextMeteorWX = p(999999);
	// Reset per-run trackers
	runHits = 0;
	runChests = 0;
	runBoosts = 0;
	runRings = 0;
	runStars = 0;
	runMeteorsDodged = 0;
	runHasRing = false;
	runHasBoost = false;
	runHasStar = false;
	runHasChest = false;
	runRedZone = false;
	runContinueUsed = false;
	runMaxDistNoJet = 0;
	distNoJetStart = 0;
	jetWasOn = false;
	CANNON.active = true;
	CANNON.show = true;
	CANNON.angle = -Math.PI * 0.35;
	CANNON.dir = 1;
	hide("shopDiv");
	hide("lbDiv");
	hide("optDiv");
	hide("pauseDiv");
	hide("continueDiv");
	gs = "aim";
}
function launchRobot() {
	gs = "flying";
	CANNON.active = false;
	CANNON.show = false;
	robot = makeRobot();
	flyHintFrames = 130; // ~2s, s'efface dès la première pression
	orbHintFrames = 0;
	orbHintPending = true; // s'affichera juste après le message de vol
	// Canon au max → vitesse horizontale maximale dès le lancement
	if (sd.up.cannon >= 4) {
		robot.vx = uv("cannon") * SC;
		speedStreakFrames = 660; // P-meter immédiatement plein + rouge
	}
	jetFuel = maxFuel;
	jetOn = false;
	nextMeteorWX = camX + W + p(400);
	resumeMusic();
	playsfx("launch", { vol: 0.9 });
}
function endGame() {
	stopJetSFX();
	stopAllMusic();
	gpxGameplayStop();
	gs = "loading"; // état neutre pendant la pub
	const d = distM,
		m1 = Math.floor(d * 0.02),
		m2 = Math.floor(coins * 0.4),
		m3 = Math.floor(d / 300),
		m4 = comboMax * 5,
		e = m1 + m2 + m3 + m4;
	sd.money += e;
	if (d > sd.best) sd.best = d;
	sd.totalDist = (sd.totalDist || 0) + d;
	sd.totalCoins = (sd.totalCoins || 0) + coins;
	sd.gamesPlayed = (sd.gamesPlayed || 0) + 1;
	gamesPlayedToday++;
	if (runHits === 0) sd.perfectGames = (sd.perfectGames || 0) + 1;
	if ((sd.gamesPlayed||0) >= 10 && !sd.hardcoreUnlocked) sd.hardcoreUnlocked = true;
	if (runRedZone) sd.redZoneCount = (sd.redZoneCount || 0) + 1;
	// Update no-jetpack distance for this run
	if (!jetWasOn) runMaxDistNoJet = distM;
	save();
	resData = { d, m1, m2, m3, m4, e };
	pendingDist = d;
	checkAch("endGame");
	checkDailyChallenges();
	gpxUpdateScore(d);
	// Midgame ad — résultats + bannière affichés après
	gpxMidgameAd(() => {
		gs = "results";
		gpxOnMenu();
		if (!animId) animId = requestAnimationFrame(loop);
		setTimeout(async () => {
			if (gs === "results" && window.fbPush)
				await window.fbPush(sd.name || "PLAYER", pendingDist);
		}, 800);
	});
}

// ── Offre de continuation (1x par run, via pub récompensée) ──
function offerContinue() {
	gs = "continueOffer";
	// Coupe le son dès l'apparition du popup (pas seulement au clic) :
	// sinon la musique de vol continue tant que le joueur hésite,
	// et parfois jusque dans la pub elle-même.
	jetOn = false;
	stopJetSFX();
	pauseMusic();
	if (_actx && _actx.state === "running") _actx.suspend();
	const btn = document.getElementById("continueAdBtn");
	if (btn) {
		btn.disabled = false;
		btn.querySelector("span").textContent = t("continueAd");
	}
	show("continueDiv");

	const rBtn = document.getElementById("resultBtn");
	rBtn.disabled = false;
	rBtn.textContent = t("continueSkip");
}
function requestContinueAd() {
	runContinueUsed = true; // une seule offre par run, qu'elle aboutisse ou non
	const btn = document.getElementById("continueAdBtn");
	if (btn) {
		btn.disabled = true;
		btn.querySelector("span").textContent = t("continueSearching");
	}

	const rBtn = document.getElementById("resultBtn");
	if (rBtn) rBtn.disabled = true;
	gpxRewardAd(
		() => {
			hide("continueDiv");
			reviveRobot();
		},
		() => {
			if (btn) btn.querySelector("span").textContent = t("continueNone");
			setTimeout(() => {
				hide("continueDiv");
				endGame();
			}, 900);
		},
	);
}
function declineContinue() {
	runContinueUsed = true;
	hide("continueDiv");
	endGame();
}
function reviveRobot() {
	if (!robot) { endGame(); return; }
	robot.alive = true;
	robot.wy = GY() - robot.r - p(60);
	robot.vy = -p(6);
	robot.vx = Math.max(robot.vx, uv("cannon") * SC * 0.5);
	robot.hitCooldown = 90;
	robot.shieldFlash = 90;
	jetFuel = maxFuel;
	shield = Math.max(shield, 1);
	gs = "flying";
	if (!animId) animId = requestAnimationFrame(loop);
	resumeMusic();
}

// PAUSE
function pauseGame() {
	if (gs !== "flying") return;
	prevGs = "flying";
	pauseMusic();
	stopJetSFX();
	if (_actx && _actx.state === "running") _actx.suspend();
	gs = "paused";
	jetOn = false;
	show("pauseDiv");
	document.getElementById("pauseResume").textContent =
		t("resume");
	document.getElementById("pauseQuit").textContent = t("quit");
}
window.resumeGame = function () {
	if (gs !== "paused") return;
	hide("pauseDiv");
	gs = "flying";
	if (_actx && _actx.state === "suspended") _actx.resume();
	resumeMusic();
};
window.quitToMenu = function () {
	stopJetSFX();
	hide("pauseDiv");
	gs = "start";
	gpxOnMenu();
	frame = 0;
	camX = 0;
	initBg();
	CANNON.active = false;
	CANNON.show = true;
	CANNON.angle = -Math.PI * 0.35;
};

// ══════════════════════════════════════════
//  SHOP
// ══════════════════════════════════════════
function openShop() {
	gs = "shop";
	renderShop();
	show("shopDiv");
}
function closeShop() {
	hide("shopDiv");
	gs = "start";
	gpxOnMenu();
	frame = 0;
	camX = 0;
	initBg();
	CANNON.active = false;
	CANNON.show = true;
	CANNON.angle = -Math.PI * 0.35;
}
window.closeShop = closeShop;
function renderShop() {
	document.getElementById("shMoney").textContent = sd.money;
	document.getElementById("shTitle").textContent =
		"⚙ " + t("upgrades");
	document.getElementById("shDesc").textContent = "";
	const cont = document.getElementById("upgCont");
	cont.innerHTML = "";
	const lang = sd.lang || "en";
	Object.entries(UDEFS).forEach(([k, u]) => {
		const lv = sd.up[k];
		const maxLv = u.costs.length;
		const isMax = lv >= maxLv;
		const card = document.createElement("div");
		card.className = "upg-card";
		// Header
		const hdr = document.createElement("div");
		hdr.className = "upg-card-header";
		const nextCost = isMax ? null : u.costs[lv];
		const nextTip = isMax
			? null
			: lang === "en"
				? u.tips_en[lv]
				: u.tips_fr[lv];
		hdr.innerHTML = `<div class="upg-card-icon">${u.icon}</div><div class="upg-card-info"><div class="upg-card-name">${t(k)}</div><div class="upg-card-sub">${lang === "en" ? u.desc_en : u.desc_fr}</div></div>`;
		card.appendChild(hdr);
		// Level bar
		const bar = document.createElement("div");
		bar.className = "upg-level-bar";
		for (let i = 0; i < maxLv; i++) {
			const seg = document.createElement("div");
			seg.className =
				"upg-lvl-seg" +
				(i < lv
					? " filled"
					: i === lv && !isMax
						? " next-buy"
						: "");
			if (i === lv && !isMax) {
				seg.title =
					(lang === "en" ? u.tips_en[i] : u.tips_fr[i]) +
					" — " +
					u.costs[i] +
					" $";
				seg.addEventListener("click", () => {
					synthClick();
					doBuy(k, i);
				});
			}
			bar.appendChild(seg);
		}
		card.appendChild(bar);
		// Stat row
		const stat = document.createElement("div");
		stat.className = "upg-card-stat";
		stat.innerHTML = `<span>${lang === "en" ? u.stat_en : u.stat_fr}:</span><span>${u.statFmt(lv)}</span>`;
		card.appendChild(stat);
		// Cost + buy button
		if (!isMax) {
			const costRow = document.createElement("div");
			costRow.className = "upg-cost-row";
			costRow.innerHTML = `<div class="upg-cost">💰 ${nextCost} $</div>`;
			const btn = document.createElement("button");
			btn.className = "upg-buy-btn";
			btn.textContent = lang === "en" ? nextTip : nextTip;
			btn.addEventListener("click", () => {
				synthClick();
				doBuy(k, lv);
			});
			costRow.appendChild(btn);
			card.appendChild(costRow);
		} else {
			const maxd = document.createElement("div");
			maxd.style.cssText =
				"text-align:center;font-size:clamp(8px,1.3vh,11px);color:#44cc88;padding:0.2vh 0 0;letter-spacing:1px;font-weight:700;flex-shrink:0;";
			maxd.textContent = "✓ MAX";
			card.appendChild(maxd);
		}
		cont.appendChild(card);
	});
}
function doBuy(k, lv) {
	const cost = UDEFS[k].costs[lv];
	if (sd.money >= cost) {
		sd.money -= cost;
		sd.up[k]++;
		sd.totalShopBuys = (sd.totalShopBuys || 0) + 1;
		sd.totalSpent = (sd.totalSpent || 0) + cost;
		save();
		renderShop();
		checkAch("shop");
	} else {
		document.getElementById("shDesc").textContent =
			t("notEnough");
		document.getElementById("shDesc").style.color = "#ff4444";
		setTimeout(() => {
			document.getElementById("shDesc").style.color = "";
		}, 900);
	}
}

// ══════════════════════════════════════════
//  LEADERBOARD
// ══════════════════════════════════════════
async function openLB() {
	gs = "lb";
	show("lbDiv");
	document.getElementById("lbRows").innerHTML =
		`<div class="lb-empty">${t("loading")}</div>`;
	const rows = window.fbTop ? await window.fbTop() : [];
	if (!rows.length) {
		document.getElementById("lbRows").innerHTML =
			`<div class="lb-empty">${t("noScores")}</div>`;
		return;
	}
	const medals = ["🥇", "🥈", "🥉"];
	document.getElementById("lbRows").innerHTML = rows
		.map(
			(r, i) =>
				`<div class="lb-row${r.name === sd.name ? " lb-me" : ""}"><span class="lb-rank">${medals[i] || "#" + (i + 1)}</span><span class="lb-name">${esc(r.name || "???")}</span><span class="lb-score">${r.score}m</span></div>`,
		)
		.join("");
}
function closeLB() {
	hide("lbDiv");
	gs = "start";
	gpxOnMenu();
	frame = 0;
}
window.closeLB = closeLB;

// ══════════════════════════════════════════
//  OPTIONS
// ══════════════════════════════════════════
let optFromPause = false;
function openOptions(fromPause = false) {
	optFromPause = !!fromPause;
	gs = "options";
	document.getElementById("optName").value = sd.name || "";
	document.getElementById("optSound").textContent = sd.sound
		? "ON"
		: "OFF";
	document.getElementById("optMusic").textContent = sd.music
		? "ON"
		: "OFF";
	document.getElementById("optVib").textContent = sd.vibration
		? "ON"
		: "OFF";
	document.getElementById("optLang").textContent = (
		sd.lang || "en"
	).toUpperCase();
	document.getElementById("optTitle").textContent =
		"⚙ " + t("options");
	applyLang();
	show("optDiv");
	if (optFromPause) hide("pauseDiv");
}
window.openOptions = openOptions;
function closeOptions() {
	hide("optDiv");
	if (optFromPause) {
		gs = "paused";
		show("pauseDiv");
	} else {
		gs = "start";
		gpxOnMenu();
		frame = 0;
	}
}
window.closeOptions = closeOptions;
window.toggleOpt = function (k) {
	sd[k] = !sd[k];
	if (k === "music") {
		if (!sd.music) stopAllMusic();
		else if (gs === "flying" || optFromPause) playGameMusic(); else playMenuMusic();
	}
	const ids = { sound: "optSound", music: "optMusic", vibration: "optVib" };
	if (ids[k])
		document.getElementById(ids[k]).textContent = sd[k] ? "ON" : "OFF";
	save();
};
window.toggleLang = function () {
	const next = sd.lang === "fr" ? "en" : "fr";
	sd.lang = next;
	document.getElementById("optLang").textContent =
		next.toUpperCase();
	document.getElementById("optTitle").textContent =
		"⚙ " + t("options");
	applyLang();
};
window.saveOptions = function () {
	const n = (
		document.getElementById("optName").value.trim() ||
		sd.name ||
		"PLAYER"
	)
		.toUpperCase()
		.slice(0, 12);
	sd.name = n;
	save();
	closeOptions();
};

// ══════════════════════════════════════════
//  NAME SETUP (HTML modal)
// ══════════════════════════════════════════
function showNameSetup() {
	nameSetupActive = true;
	let modal = document.getElementById("nsModal");
	if (!modal) {
		modal = document.createElement("div");
		modal.id = "nsModal";
		modal.className = "ov";
		modal.style.cssText =
			"background:rgba(0,0,0,.88);z-index:20;";
		modal.innerHTML = `<div style="background:linear-gradient(180deg,#0d1a30,#060e1e);border:2px solid #2244aa;border-radius:10px;padding:28px;width:min(320px,88vw);text-align:center;"><div id="nsT" style="font-size:clamp(14px,2.5vh,20px);font-weight:700;color:#88ccff;margin-bottom:6px;"></div><div id="nsS" style="font-size:clamp(9px,2.2vw,11px);color:#446;margin-bottom:18px;"></div><input id="nsI" maxlength="12" autocomplete="off" style="font-family:monospace;font-size:clamp(14px,3.8vw,19px);padding:10px 14px;border:2px solid #3366cc;border-radius:4px;background:#05101f;color:#fff;width:100%;margin-bottom:16px;text-align:center;letter-spacing:3px;"/><button id="nsB" style="font-family:monospace;font-size:clamp(10px,2.8vw,14px);padding:10px 0;width:100%;border:none;border-radius:4px;background:linear-gradient(135deg,#2255cc,#0033aa);color:#fff;cursor:pointer;letter-spacing:1px;"></button></div>`;
		document.body.appendChild(modal);
	}
	document.getElementById("nsT").textContent = t("namePrompt");
	document.getElementById("nsS").textContent = t("nameSub");
	document.getElementById("nsB").textContent = t("nameBtn");
	document.getElementById("nsI").value = sd.name || "";
	document.getElementById("nsB").onclick = () => {
		const n = (
			document.getElementById("nsI").value.trim() || "PLAYER"
		)
			.toUpperCase()
			.slice(0, 12);
		sd.name = n;
		const _firstTime = !sd.setupDone;
		sd.setupDone = true;
		save();
		modal.classList.add("off");
		nameSetupActive = false;
		if (_firstTime) {
			gs = "tutorial";
		} else {
			gs = "start";
			gpxOnMenu();
		}
	};
	modal.classList.remove("off");
	setTimeout(() => {
		const inp = document.getElementById("nsI");
		inp.focus();
		// Valider avec Entrée
		inp.onkeydown = (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				document.getElementById("nsB").click();
			}
		};
	}, 120);
}

// ══════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════
function show(id) {
	document.getElementById(id).classList.remove("off");
}
function hide(id) {
	document.getElementById(id).classList.add("off");
}
function esc(s) {
	return s.replace(
		/[&<>"]/g,
		(c) =>
			({
				"&": "&amp;",
				"<": "&lt;",
				">": "&gt;",
				'"': "&quot;",
			})[c],
	);
}
if (!CanvasRenderingContext2D.prototype.roundRect) {
	CanvasRenderingContext2D.prototype.roundRect = function (
		x,
		y,
		w,
		h,
		r,
	) {
		this.beginPath();
		this.moveTo(x + r, y);
		this.lineTo(x + w - r, y);
		this.quadraticCurveTo(x + w, y, x + w, y + r);
		this.lineTo(x + w, y + h - r);
		this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		this.lineTo(x + r, y + h);
		this.quadraticCurveTo(x, y + h, x, y + h - r);
		this.lineTo(x, y + r);
		this.quadraticCurveTo(x, y, x + r, y);
		this.closePath();
	};
}

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
// ══════════════════════════════════════════
//  GAMEPIX SDK (v3 — d'après my.gamepix.com/sdk/doc)
// ══════════════════════════════════════════
// API réelle GamePix : pas de callbacks globaux on.pause/on.resume,
// pas de bannière pilotable. On appelle nous-mêmes
// GamePix.interstitialAd() / GamePix.rewardAd(), qui renvoient une
// Promise ; on met le jeu en pause AVANT l'appel et on le reprend
// DANS le .then(). GamePix.updateScore/updateLevel servent aux
// stats/leaderboards de la plateforme, lang() donne la langue du
// joueur, happyMoment() signale un moment fort, localStorage
// remplace le localStorage classique (le jeu tourne en iframe).
const _gpx = () => window.GamePix;

let _interstitialInFlight = false;

// -- Écran menu / résultats ----------------------------
// (pas de bannière côté GamePix, on ne fait que gérer la musique)
function gpxOnMenu() {
	playMenuMusic();
}

// -- Début / fin de partie ------------------------------
function gpxGameplayStart() {}
function gpxGameplayStop() {}

// -- Coupure pub interstitielle -------------------------
// onDone() appelé dans tous les cas (pub jouée, refusée, erreur,
// ou SDK absent). GamePix décide lui-même s'il affiche une pub
// ou non à chaque appel : ce n'est jamais garanti.
function gpxMidgameAd(onDone) {
	const sdk = _gpx();
	if (!sdk || typeof sdk.interstitialAd !== 'function' || _interstitialInFlight) {
		onDone();
		return;
	}
	// Pause boucle + audio AVANT l'appel (obligatoire selon la doc)
	if (animId) { cancelAnimationFrame(animId); animId = null; }
	jetOn = false;
	stopJetSFX();
	if (_actx && _actx.state === 'running') _actx.suspend();
	pauseMusic();
	_interstitialInFlight = true;
	sdk.interstitialAd()
		.then(() => {
			_interstitialInFlight = false;
			_gpxResume(onDone);
		})
		.catch(() => {
			_interstitialInFlight = false;
			_gpxResume(onDone);
		});
}
function _gpxResume(onDone) {
	if (_actx && _actx.state === 'suspended') _actx.resume();
	if (!animId) animId = requestAnimationFrame(loop);
	onDone();
}

// -- Pub récompensée (optionnelle, à brancher sur un futur
//    bouton "regarder une pub pour un bonus") ------------
function gpxRewardAd(onReward, onNoReward) {
	const sdk = _gpx();
	if (!sdk || typeof sdk.rewardAd !== 'function') {
		if (onNoReward) onNoReward();
		return;
	}
	if (animId) { cancelAnimationFrame(animId); animId = null; }
	jetOn = false;
	stopJetSFX();
	if (_actx && _actx.state === 'running') _actx.suspend();
	pauseMusic();
	sdk.rewardAd().then((res) => {
		_gpxResume(() => {
			if (res && res.success) { if (onReward) onReward(); }
			else if (onNoReward) onNoReward();
		});
	}).catch(() => {
		_gpxResume(() => { if (onNoReward) onNoReward(); });
	});
}

// -- Score / niveau / moments forts ---------------------
function gpxUpdateScore(value) {
	const sdk = _gpx();
	if (sdk && typeof sdk.updateScore === 'function') {
		sdk.updateScore(Math.max(0, Math.round(value || 0)));
	}
}
function gpxUpdateLevel(value) {
	const sdk = _gpx();
	if (sdk && typeof sdk.updateLevel === 'function') {
		sdk.updateLevel(Math.max(0, Math.round(value || 0)));
	}
}
function gpxHappyMoment() {
	const sdk = _gpx();
	if (sdk && typeof sdk.happyMoment === 'function') sdk.happyMoment();
}

// -- Empêcher le scroll de la page sur flèches / espace --
window.addEventListener("keydown", (event) => {
	if (["ArrowUp", "ArrowDown", " "].includes(event.key)) {
		event.preventDefault();
	}
});
window.addEventListener("wheel", (event) => event.preventDefault(), {
	passive: false,
});

// -- Pause automatique quand la page perd le focus ----
// (onglet changé, fenêtre/appli en arrière-plan, etc.)
// Exigé par GamePix : "the game must pause (including audio)".
let _focusSuspended = false;
function _pauseForFocusLoss() {
	if (_focusSuspended) return;
	_focusSuspended = true;
	if (gs === "flying") {
		// Réutilise le menu pause existant (audio + boucle figés)
		pauseGame();
	} else {
		// Autres écrans : on coupe juste le son
		stopJetSFX();
		pauseMusic();
		if (_actx && _actx.state === "running") _actx.suspend();
	}
}
function _resumeAfterFocusGain() {
	if (!_focusSuspended) return;
	_focusSuspended = false;
	if (gs === "paused") return; // reprise manuelle requise
	if (_actx && _actx.state === "suspended") _actx.resume();
}
document.addEventListener("visibilitychange", () => {
	if (document.hidden) _pauseForFocusLoss();
	else _resumeAfterFocusGain();
});
window.addEventListener("blur", _pauseForFocusLoss);
window.addEventListener("focus", _resumeAfterFocusGain);

// ══════════════════════════════════════════
//  MUSIQUE DE FOND
// ══════════════════════════════════════════
const _bgmMenu = document.getElementById('bgm-menu');
const _bgmGame = document.getElementById('bgm-game');

function _bgmVolume(el, vol) {
	if (el) el.volume = vol;
}
function stopAllMusic() {
	[_bgmMenu, _bgmGame].forEach(el => {
		if (!el) return;
		el.pause();
		el.currentTime = 0;
	});
}
function playMenuMusic() {
	if (!sd.music) { stopAllMusic(); return; }
	// Stopper la musique de jeu complètement (reset)
	if (_bgmGame) { _bgmGame.pause(); _bgmGame.currentTime = 0; }
	// Jouer la musique menu si elle n'est pas déjà en lecture
	if (_bgmMenu && _bgmMenu.paused) {
		_bgmVolume(_bgmMenu, 0.55);
		_bgmMenu.play().catch(() => {});
	}
}
function playGameMusic() {
	if (!sd.music) { stopAllMusic(); return; }
	// Stopper la musique menu complètement (reset)
	if (_bgmMenu) { _bgmMenu.pause(); _bgmMenu.currentTime = 0; }
	// Jouer la musique de jeu si elle n'est pas déjà en lecture
	if (_bgmGame && _bgmGame.paused) {
		_bgmVolume(_bgmGame, 0.5);
		_bgmGame.play().catch(() => {});
	}
}
function pauseMusic() {
	[_bgmMenu, _bgmGame].forEach(el => { if (el) el.pause(); });
}
function resumeMusic() {
	if (!sd.music) return;
	// Reprendre la piste correspondant à l'état actuel
	if (gs === 'flying') {
		_bgmGame && _bgmGame.play().catch(() => {});
	} else {
		_bgmMenu && _bgmMenu.play().catch(() => {});
	}
}

function _gameReady() {
	initBg();
	CANNON.active = false;
	CANNON.show = true;
	CANNON.angle = -Math.PI * 0.35;
	CANNON.dir = 1;
	gs = "tapContinue";
	animId = requestAnimationFrame(loop);
}
_loadAndStart();