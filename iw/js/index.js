const MAX_COMBO_RAGE = 30;

const game = (setupCallback) => {
	// 1. Paramètres de référence (Le "Zoom" de BuildWithStar)
	// On simule une largeur de base. Plus ce nombre est petit, plus le jeu paraîtra "zoomé".
	const REFERENCE_WIDTH = 800;

	let canvas =
		document.querySelector("canvas") ||
		document.createElement("canvas");
	canvas.setAttribute("tabindex", "0");
	canvas.style.outline = "none";
	if (!canvas.parentNode) {
		const root =
			document.getElementById("game-root") || document.body;
		root.appendChild(canvas);
	}
	const ctx = canvas.getContext("2d");

	// 2. Gestion du Scaling (Zoom)
	const updateSize = () => {
		const realWidth = window.innerWidth;
		const realHeight = window.innerHeight;

		const scale = realWidth / REFERENCE_WIDTH;

		// Set canvas backing-store resolution (this resets the ctx state)
		canvas.width = realWidth;
		canvas.height = realHeight;

		// Ensure canvas fills the screen via CSS
		canvas.style.position = "fixed";
		canvas.style.top = "0";
		canvas.style.left = "0";
		canvas.style.width = "100%";
		canvas.style.height = "100%";

		// Apply scale transform — ctx resets on canvas resize so this is safe
		ctx.scale(scale, scale);

		// Clip to virtual dimensions so nothing draws outside the scaled area
		const vw = realWidth / scale;
		const vh = realHeight / scale;
		ctx.beginPath();
		ctx.rect(0, 0, vw, vh);
		ctx.clip();

		if (tools) {
			tools.width = vw; // virtual game width  (≈800)
			tools.height = vh; // virtual game height (scales with screen)
		}
	};

	let uiLayer =
		document.getElementById("ui-layer") ||
		document.createElement("div");
	if (!uiLayer.parentNode) {
		uiLayer.id = "ui-layer";
		Object.assign(uiLayer.style, {
			position: "absolute",
			top: "0",
			left: "0",
			width: "100%",
			height: "100%",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			pointerEvents: "none",
			// Higher than touch-layer (z-index:25) so menu buttons
			// are always tappable above the joystick layer
			zIndex: "30",
		});
		document.body.appendChild(uiLayer);
	}

	const tools = {
		ctx,
		canvas,
		width: 0, // Sera rempli par updateSize
		height: 0,
		ui: {
			render: (html, interactive = true) => {
				uiLayer.style.pointerEvents = interactive
					? "auto"
					: "none";
				uiLayer.innerHTML = html;
			},
			clear: () => {
				uiLayer.innerHTML = "";
				uiLayer.style.pointerEvents = "none";
			},
		},
		on: (type, selector, callback) => {
			if (typeof selector === "function") {
				callback = selector;
				selector = null;
			}
			window.addEventListener(
				type,
				(e) => {
					if (selector) {
						if (
							e.target.matches(selector) ||
							e.target.closest(selector)
						)
							callback(e);
					} else {
						callback(e);
					}
				},
				true,
			);
		},
		loop: (callback) => {
			let lastTime = 0;
			const frame = (time) => {
				const dt =
					lastTime > 0
						? Math.min((time - lastTime) / 1000, 0.05) // cap at 50ms (20 FPS min)
						: 1 / 60;
				lastTime = time;
				callback(dt);
				requestAnimationFrame(frame);
			};
			requestAnimationFrame(frame);
		},
	};

	tools.preset = tools.on;

	// On initialise la taille avant de lancer le jeu
	updateSize();
	window.addEventListener("resize", updateSize);

	if (typeof setupCallback === "function") {
		setupCallback(tools);
	}
};

// ---
// ═══ INDEXED-DB STORE ════════════════════════════════════════════════════
// Cache mémoire synchrone + persistence IndexedDB asynchrone.
// Toutes les lectures se font sur _cache (aucun changement de logique métier).
// Toutes les écritures mettent à jour _cache puis écrivent en IDB (fire-and-forget).
const idb = (() => {
	const DB_NAME = "inferno_wing";
	const DB_VERSION = 1;
	const STORE = "kv";
	const ALL_KEYS = [
		"iw_achstats",
		"iw_pilot",
		"iw_daily",
		"iw_bdg",
		"iw_history",
		"iw_surv_best",
		"iw_save",
		"iw_musicVol",
		"iw_sfxVol",
		"iw_difficulty",
		"iw_rumble",
		"iw_lang",
		"iw_playerName",
		"inferno_hi",
		"iw_tuto_done",
		"iw_normal_cleared",
	];
	let _db = null;
	let _cache = {};
	let _ready = false;

	function _open() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = (e) => {
				if (
					!e.target.result.objectStoreNames.contains(
						STORE,
					)
				)
					e.target.result.createObjectStore(STORE);
			};
			req.onsuccess = (e) => {
				_db = e.target.result;
				resolve();
			};
			req.onerror = (e) => reject(e.target.error);
		});
	}
	function _get(key) {
		return new Promise((res) => {
			if (!_db) {
				res(null);
				return;
			}
			const req = _db
				.transaction(STORE, "readonly")
				.objectStore(STORE)
				.get(key);
			req.onsuccess = () => res(req.result ?? null);
			req.onerror = () => res(null);
		});
	}
	function _set(key, value) {
		if (!_db) return;
		const tx = _db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).put(value, key);
	}
	function _del(key) {
		if (!_db) return;
		const tx = _db.transaction(STORE, "readwrite");
		tx.objectStore(STORE).delete(key);
	}

	async function preload() {
		const report = (pct, label) => {
			if (typeof window._iwBootProgress === "function")
				window._iwBootProgress(pct, label);
		};
		const labels = {
			iw_achstats: "SUCCÈS…",
			iw_pilot: "PILOTE…",
			iw_daily: "DÉFIS…",
			iw_bdg: "BADGES…",
			iw_history: "HISTORIQUE…",
			iw_surv_best: "SURVIE…",
			iw_save: "SAUVEGARDE…",
			iw_musicVol: "AUDIO…",
			iw_sfxVol: "AUDIO…",
			iw_difficulty: "OPTIONS…",
			iw_rumble: "OPTIONS…",
			iw_lang: "LANGUE…",
			iw_playerName: "PROFIL…",
			inferno_hi: "SCORES…",
			iw_tuto_done: "TUTORIEL…",
			iw_normal_cleared: "PROGRESSION…",
		};
		report(5, "OPENING UP THE DATABASE…");
		await _open();
		report(15, "DATA BASE READY");
		for (let i = 0; i < ALL_KEYS.length; i++) {
			const key = ALL_KEYS[i];
			let val = await _get(key);
			if (val === null) {
				const ls = localStorage.getItem(key);
				if (ls !== null) {
					val = ls;
					_set(key, ls);
				}
			}
			if (val !== null) _cache[key] = val;
			const pct =
				15 + Math.round(((i + 1) / ALL_KEYS.length) * 75);
			report(pct, labels[key] || "LOADING…");
		}
		for (const key of ALL_KEYS) localStorage.removeItem(key);
		report(95, "FINALIZATION…");
		await new Promise((r) => setTimeout(r, 120));
		report(100, "READY !");
		await new Promise((r) => setTimeout(r, 220));
		_ready = true;
	}

	return {
		isReady() {
			return _ready;
		},
		getItem(key) {
			return Object.prototype.hasOwnProperty.call(_cache, key)
				? _cache[key]
				: null;
		},
		setItem(k, v) {
			_cache[k] = v;
			_set(k, v);
		},
		removeItem(k) {
			delete _cache[k];
			_del(k);
		},
		hasItem(k) {
			return Object.prototype.hasOwnProperty.call(_cache, k);
		},
		getAllKeys() {
			return ALL_KEYS;
		},
		preload,
	};
})();

// ---
// ═══ SETTINGS ════════════════════════════════════════════════════════════

const settings = {
	musicVol: parseFloat(idb.getItem("iw_musicVol") ?? "0.4"),
	sfxVol: parseFloat(idb.getItem("iw_sfxVol") ?? "0.7"),
	difficulty: idb.getItem("iw_difficulty") || "normal",
	rumble: idb.getItem("iw_rumble") !== "false",
	lang: idb.getItem("iw_lang") || null,
	playerName: idb.getItem("iw_playerName") || null,
	save() {
		idb.setItem("iw_musicVol", String(this.musicVol));
		idb.setItem("iw_sfxVol", String(this.sfxVol));
		idb.setItem("iw_difficulty", this.difficulty);
		idb.setItem("iw_rumble", String(this.rumble));
		if (this.lang) idb.setItem("iw_lang", this.lang);
		if (this.playerName)
			idb.setItem("iw_playerName", this.playerName);
	},
};

// ── TRANSLATIONS ──────────────────────────────────────────────────────────
const T = {
	fr: {
		title: "INFERNO WING",
		subtitle: "Une Flamme Traverse les Enfers",
		ignite: "JOUER",
		continueBtn: "CONTINUER",
		options: "OPTIONS",
		achievements: "SUCCES",
		leaderboard: "CLASSEMENT",
		hiScore: "MEILLEUR SCORE",
		controls:
			"Fleches/WASD — Bouger | Espace/Z — Tirer | X — Mega",
		music: "Musique",
		sfx: "Effets",
		difficulty: "Difficulte",
		vibration: "Vibration",
		easy: "Facile",
		normal: "Normal",
		hard: "Difficile",
		back: "Retour",
		lang: "Langue",
		playerNameLbl: "Nom du Joueur",
		pause: "PAUSE",
		resume: "REPRENDRE",
		mainMenu: "MENU PRINCIPAL",
		pauseHint: "P / Echap pour reprendre",
		gameOver: "GAME OVER",
		gameOverSub: "La flamme est eteinte.",
		tryAgain: "REJOUER",
		victory: "VICTOIRE",
		victorySub: "Inferno Wing triomphe !",
		playAgain: "REJOUER",
		level: "NIVEAU",
		boss: "BOSS",
		bossIncoming: "BOSS EN APPROCHE",
		bossDefeated: "BOSS VAINCU",
		levelUp: "NIVEAU SUIVANT",
		resumeLevel: "REPRISE NIVEAU",
		achTitle: "SUCCES",
		achProgress: "Progression",
		langSelect: "Choisissez votre langue",
		namePrompt: "Votre nom de pilote",
		namePlaceholder: "Ex: AceOfSpades",
		nameConfirm: "Confirmer",
		lbTitle: "CLASSEMENT MONDIAL",
		lbRank: "#",
		lbName: "Pilote",
		lbScore: "Score",
		lbLoading: "Chargement...",
		lbEmpty: "Aucun score pour le moment.",
		lbYou: "(vous)",
		scoreSent: "Score soumis au classement !",
		ach_basics: "Debuts",
		ach_kills: "Destructions",
		ach_score: "Score",
		ach_combo: "Combo",
		ach_survival: "Survie",
		ach_shots: "Tirs",
		ach_time: "Temps",
		ach_powerups: "Power-ups",
		ach_diff: "Difficulte",
		ach_special: "Special",
		ach_runs: "Parties",
		ach_secret: "Secrets",
		ach_meta: "Meta",
		unlocked: "Succes debloque",
		tutoBtn: "TUTORIEL",
		tutoTitle: "COMMENT JOUER",
		tutoSkip: "Passer",
		tutoNext: "Suivant →",
		tutoDone: "Commencer !",
		tutoSlides: [
			{
				icon: "🕹️",
				title: "Se déplacer",
				body: "Utilisez les flèches ou WASD pour piloter. Sur mobile, faites glisser dans la zone gauche. Touchez la zone droite pour tirer et utilisez le bouton 💥 pour le Mega Blast.",
			},
			{
				icon: "🔥",
				title: "Tirer & Power-ups",
				body: "Maintenez Espace ou Z pour tirer. Récupérez les capsules : 🔥 Puissance de feu, 🛡 Bouclier, 🎯 Missiles guidés, ⚡ Vitesse, 💥 Mega Blast. Ramasser 2 fois le même power-up active une version améliorée !",
			},
			{
				icon: "👑",
				title: "Ennemis spéciaux",
				body: "🛡 Bouclier-porteur : protège ses alliés, contournez-le ou utilisez le Mega Blast. 👑 Élite (couronne dorée) : 3× plus résistant, lâche 2 power-ups à sa mort. ☠️ Corrompu : plus résistant et plus rapide dès le niveau 3.",
			},
			{
				icon: "💢",
				title: "Combos & Rage",
				body: "Enchaînez les kills sans interruption pour monter le combo. À x30 combos, entrez en MODE RAGE : tirs enflammés et effets visuels intenses !",
			},
			{
				icon: "🕳️",
				title: "Zones de danger",
				body: "Des trous noirs apparaissent sur le terrain. Ils aspirent visuellement ce qui les entoure — évitez tout contact ! En mode Survie, de nouveaux trous noirs apparaissent au fil des vagues.",
			},
			{
				icon: "🗺️",
				title: "Modes de jeu",
				body: "🎮 Normal : des niveaux progressifs avec boss multi-phases. Terminez-le pour débloquer le mode Survie ! 💀 Survie : vagues infinies avec trous noirs croissants. 📅 Missions du jour : 4 défis quotidiens à accomplir dans n'importe quel mode.",
			},
			{
				icon: "⬆️",
				title: "Améliorations & XP",
				body: "Après chaque boss, choisissez une amélioration : 🔥 +Puissance, 🛡 Bouclier du niveau, 🎯 Homing 45s, 🔫 Cadence ×1.5, 💫 Score ×2, ❤️ +Vie, 💥 Mega chargé. Gagnez de l'XP pour progresser et atteindre le rang ultime : Inferno !",
			},
		],
		deleteData: "Supprimer les données",
		deleteDataConfirm: "Confirmer la suppression ?",
		deleteDataWarn:
			"Scores, succès, historique et progression seront effacés définitivement.",
		deleteDataYes: "Tout supprimer",
		deleteDataNo: "Annuler",
		deleteDataDone: "Données supprimées.",
	},
	en: {
		title: "INFERNO WING",
		subtitle: "A Flame Flies Through Hell",
		ignite: "PLAY",
		continueBtn: "CONTINUE",
		options: "OPTIONS",
		achievements: "ACHIEVEMENTS",
		leaderboard: "LEADERBOARD",
		hiScore: "HI-SCORE",
		controls: "Arrows/WASD — Move | Space/Z — Shoot | X — Mega",
		music: "Music",
		sfx: "SFX",
		difficulty: "Difficulty",
		vibration: "Vibration",
		easy: "Easy",
		normal: "Normal",
		hard: "Hard",
		back: "Back",
		lang: "Language",
		playerNameLbl: "Player Name",
		pause: "PAUSE",
		resume: "RESUME",
		mainMenu: "MAIN MENU",
		pauseHint: "P / Escape to resume",
		gameOver: "GAME OVER",
		gameOverSub: "The flame has been extinguished.",
		tryAgain: "TRY AGAIN",
		victory: "VICTORY",
		victorySub: "Inferno Wing reigns supreme!",
		playAgain: "PLAY AGAIN",
		level: "LEVEL",
		boss: "BOSS",
		bossIncoming: "BOSS INCOMING",
		bossDefeated: "BOSS DEFEATED",
		levelUp: "NEXT LEVEL",
		resumeLevel: "RESUME LEVEL",
		achTitle: "ACHIEVEMENTS",
		achProgress: "Progress",
		langSelect: "Choose your language",
		namePrompt: "Your pilot name",
		namePlaceholder: "e.g. AceOfSpades",
		nameConfirm: "Confirm",
		lbTitle: "WORLD LEADERBOARD",
		lbRank: "#",
		lbName: "Pilot",
		lbScore: "Score",
		lbLoading: "Loading...",
		lbEmpty: "No scores yet.",
		lbYou: "(you)",
		scoreSent: "Score submitted!",
		ach_basics: "Basics",
		ach_kills: "Kills",
		ach_score: "Score",
		ach_combo: "Combo",
		ach_survival: "Survival",
		ach_shots: "Shots",
		ach_time: "Time",
		ach_powerups: "Power-ups",
		ach_diff: "Difficulty",
		ach_special: "Special",
		ach_runs: "Runs",
		ach_secret: "Secret",
		ach_meta: "Meta",
		unlocked: "Achievement unlocked",
		tutoBtn: "TUTORIAL",
		tutoTitle: "HOW TO PLAY",
		tutoSkip: "Skip",
		tutoNext: "Next →",
		tutoDone: "Let's go!",
		tutoSlides: [
			{
				icon: "🕹️",
				title: "Move & Shoot",
				body: "Use arrow keys or WASD to move. Hold Space or Z to fire. On mobile: drag left area to move, tap right area to fire, and use the 💥 button for Mega Blast.",
			},
			{
				icon: "🔥",
				title: "Power-ups & Combos",
				body: "Collect capsules: 🔥 Fire power, 🛡 Shield, 🎯 Homing, ⚡ Speed, 💥 Mega Blast. Tip: collecting the same power-up twice in a row activates an enhanced version!",
			},
			{
				icon: "👑",
				title: "Special Enemies",
				body: "🛡 Shield-bearer: protects allies nearby — flank it or use Mega Blast. 👑 Elite (golden crown): 3× tougher, drops 2 power-ups on death. ☠️ Corrupted: tougher and faster from level 3 onwards.",
			},
			{
				icon: "💢",
				title: "Combo & Rage Mode",
				body: "Chain kills without stopping to build your combo. At x30 combo, RAGE MODE activates: fiery bullet trails and intense visual effects!",
			},
			{
				icon: "🕳️",
				title: "Danger Zones",
				body: "Black holes appear on the field — avoid contact at all costs! In Survival mode, new black holes keep appearing as waves progress.",
			},
			{
				icon: "🗺️",
				title: "Game Modes",
				body: "🎮 Normal: progressive levels with multi-phase bosses. Complete it to unlock Survival! 💀 Survival: endless enemy waves with growing black holes. 📅 Daily Missions: 4 daily challenges you can complete in any mode.",
			},
			{
				icon: "⬆️",
				title: "Upgrades & XP",
				body: "After each boss, pick an upgrade: 🔥 +Fire, 🛡 Level shield, 🎯 Homing 45s, 🔫 Rate ×1.5, 💫 Score ×2, ❤️ +Life, 💥 Mega ready. Earn XP to progress through the ranks and reach the ultimate title: Inferno!",
			},
		],
		deleteData: "Delete save data",
		deleteDataConfirm: "Confirm deletion?",
		deleteDataWarn:
			"Scores, achievements, history and progression will be permanently erased.",
		deleteDataYes: "Delete everything",
		deleteDataNo: "Cancel",
		deleteDataDone: "Data deleted.",
	},
};
function t(k) {
	return (T[settings.lang || "en"] || T.en)[k] || k;
}

// ── ACHIEVEMENTS ─────────────────────────────────────────────────────────
const ACH_DEFS = [
	{
		id: "first_shot",
		cat: "basics",
		icon: "🔫",
		fr: "Premier Tir",
		en: "First Shot",
		dfr: "Tirer pour la 1ere fois",
		den: "Fire for the first time",
		cond: (s) => s.totalShots >= 1,
	},
	{
		id: "first_kill",
		cat: "basics",
		icon: "💀",
		fr: "Premiere Victime",
		en: "First Kill",
		dfr: "Detruire un ennemi",
		den: "Destroy an enemy",
		cond: (s) => s.totalKills >= 1,
	},
	{
		id: "first_level",
		cat: "basics",
		icon: "⭐",
		fr: "Cap Passe",
		en: "Level Up",
		dfr: "Terminer le niveau 1",
		den: "Complete level 1",
		cond: (s) => s.levelsCleared >= 1,
	},
	{
		id: "first_boss",
		cat: "basics",
		icon: "👑",
		fr: "Regicide",
		en: "Regicide",
		dfr: "Vaincre le premier boss",
		den: "Defeat the first boss",
		cond: (s) => s.bossesKilled >= 1,
	},
	{
		id: "first_power",
		cat: "basics",
		icon: "✨",
		fr: "Ameliore",
		en: "Powered Up",
		dfr: "Ramasser un power-up",
		den: "Collect a power-up",
		cond: (s) => s.powerupsCollected >= 1,
	},
	{
		id: "first_mega",
		cat: "basics",
		icon: "💥",
		fr: "Mega Blast",
		en: "Mega Blast",
		dfr: "Utiliser le Mega Blast",
		den: "Use the Mega Blast",
		cond: (s) => s.megaUsed >= 1,
	},
	{
		id: "first_pause",
		cat: "basics",
		icon: "⏸",
		fr: "Prudent",
		en: "Cautious",
		dfr: "Mettre en pause",
		den: "Pause the game",
		cond: (s) => s.pauses >= 1,
	},
	{
		id: "first_shield",
		cat: "basics",
		icon: "🛡",
		fr: "Protege",
		en: "Protected",
		dfr: "Utiliser un bouclier",
		den: "Use a shield",
		cond: (s) => s.shieldsUsed >= 1,
	},
	{
		id: "first_homing",
		cat: "basics",
		icon: "🎯",
		fr: "Guide",
		en: "Guided",
		dfr: "Missiles guides actives",
		den: "Use homing missiles",
		cond: (s) => s.homingUsed >= 1,
	},
	{
		id: "first_speed",
		cat: "basics",
		icon: "⚡",
		fr: "Turbo",
		en: "Turbo",
		dfr: "Boost de vitesse active",
		den: "Use the speed boost",
		cond: (s) => s.speedsUsed >= 1,
	},
	{
		id: "kills_10",
		cat: "kills",
		icon: "⚔",
		fr: "Escarmouche",
		en: "Skirmish",
		dfr: "10 ennemis detruits",
		den: "10 enemies destroyed",
		cond: (s) => s.totalKills >= 10,
	},
	{
		id: "kills_50",
		cat: "kills",
		icon: "⚔",
		fr: "Guerrier",
		en: "Warrior",
		dfr: "50 ennemis detruits",
		den: "50 enemies destroyed",
		cond: (s) => s.totalKills >= 50,
	},
	{
		id: "kills_100",
		cat: "kills",
		icon: "⚔",
		fr: "Centurion",
		en: "Centurion",
		dfr: "100 ennemis detruits",
		den: "100 enemies destroyed",
		cond: (s) => s.totalKills >= 100,
	},
	{
		id: "kills_250",
		cat: "kills",
		icon: "⚔",
		fr: "Tueur de Masse",
		en: "Mass Killer",
		dfr: "250 ennemis detruits",
		den: "250 enemies destroyed",
		cond: (s) => s.totalKills >= 250,
	},
	{
		id: "kills_500",
		cat: "kills",
		icon: "💀",
		fr: "Machine de Guerre",
		en: "War Machine",
		dfr: "500 ennemis detruits",
		den: "500 enemies destroyed",
		cond: (s) => s.totalKills >= 500,
	},
	{
		id: "kills_1000",
		cat: "kills",
		icon: "☠",
		fr: "Exterminateur",
		en: "Exterminator",
		dfr: "1000 ennemis detruits",
		den: "1000 enemies destroyed",
		cond: (s) => s.totalKills >= 1000,
	},
	{
		id: "drone_50",
		cat: "kills",
		icon: "🚁",
		fr: "Chasseur de Drones",
		en: "Drone Hunter",
		dfr: "50 drones detruits",
		den: "50 drones destroyed",
		cond: (s) => s.droneKills >= 50,
	},
	{
		id: "turret_25",
		cat: "kills",
		icon: "🔫",
		fr: "Demoli",
		en: "Demolisher",
		dfr: "25 tourelles detruites",
		den: "25 turrets destroyed",
		cond: (s) => s.turretKills >= 25,
	},
	{
		id: "kamikaze_30",
		cat: "kills",
		icon: "💣",
		fr: "Anti-Suicide",
		en: "Anti-Suicide",
		dfr: "30 kamikazes arretes",
		den: "30 kamikazes stopped",
		cond: (s) => s.kamikazeKills >= 30,
	},
	{
		id: "bosses_3",
		cat: "kills",
		icon: "👑",
		fr: "Chasseur de Boss",
		en: "Boss Hunter",
		dfr: "Vaincre les 3 boss",
		den: "Defeat all 3 bosses",
		cond: (s) => s.bossesKilled >= 3,
	},
	{
		id: "score_1k",
		cat: "score",
		icon: "🌟",
		fr: "Debutant",
		en: "Beginner",
		dfr: "Score de 1 000",
		den: "Score of 1,000",
		cond: (s) => s.hiScore >= 1000,
	},
	{
		id: "score_5k",
		cat: "score",
		icon: "🌟",
		fr: "Competent",
		en: "Competent",
		dfr: "Score de 5 000",
		den: "Score of 5,000",
		cond: (s) => s.hiScore >= 5000,
	},
	{
		id: "score_10k",
		cat: "score",
		icon: "⭐",
		fr: "Expert",
		en: "Expert",
		dfr: "Score de 10 000",
		den: "Score of 10,000",
		cond: (s) => s.hiScore >= 10000,
	},
	{
		id: "score_25k",
		cat: "score",
		icon: "⭐",
		fr: "Maitre",
		en: "Master",
		dfr: "Score de 25 000",
		den: "Score of 25,000",
		cond: (s) => s.hiScore >= 25000,
	},
	{
		id: "score_50k",
		cat: "score",
		icon: "💫",
		fr: "Grand Maitre",
		en: "Grand Master",
		dfr: "Score de 50 000",
		den: "Score of 50,000",
		cond: (s) => s.hiScore >= 50000,
	},
	{
		id: "score_100k",
		cat: "score",
		icon: "🔥",
		fr: "Legendaire",
		en: "Legendary",
		dfr: "Score de 100 000",
		den: "Score of 100,000",
		cond: (s) => s.hiScore >= 100000,
	},
	{
		id: "combo_3",
		cat: "combo",
		icon: "🔗",
		fr: "En Rythme",
		en: "In Rhythm",
		dfr: "Combo x3",
		den: "Combo x3",
		cond: (s) => s.maxCombo >= 3,
	},
	{
		id: "combo_5",
		cat: "combo",
		icon: "🔗",
		fr: "Enchaineur",
		en: "Chainer",
		dfr: "Combo x5",
		den: "Combo x5",
		cond: (s) => s.maxCombo >= 5,
	},
	{
		id: "combo_8",
		cat: "combo",
		icon: "⛓",
		fr: "Devastateur",
		en: "Devastating",
		dfr: "Combo x8 (maximum)",
		den: "Combo x8 (max)",
		cond: (s) => s.maxCombo >= 8,
	},
	{
		id: "survive_l1",
		cat: "survival",
		icon: "🏅",
		fr: "Survivant",
		en: "Survivor",
		dfr: "Finir niveau 1 sans mourir",
		den: "Beat level 1 without dying",
		cond: (s) => s.l1NoDeath,
	},
	{
		id: "survive_l2",
		cat: "survival",
		icon: "🥈",
		fr: "Blinde",
		en: "Armored",
		dfr: "Finir niveau 2 sans mourir",
		den: "Beat level 2 without dying",
		cond: (s) => s.l2NoDeath,
	},
	{
		id: "survive_l3",
		cat: "survival",
		icon: "🥇",
		fr: "Intouchable",
		en: "Untouchable",
		dfr: "Finir niveau 3 sans mourir",
		den: "Beat level 3 without dying",
		cond: (s) => s.l3NoDeath,
	},
	{
		id: "no_death_run",
		cat: "survival",
		icon: "💎",
		fr: "Parfait",
		en: "Flawless",
		dfr: "Terminer le jeu sans mourir",
		den: "Complete game without dying",
		cond: (s) => s.fullRunNoDeath,
	},
	{
		id: "lives_5",
		cat: "survival",
		icon: "❤",
		fr: "Chanceux",
		en: "Lucky",
		dfr: "Avoir 5 vies simultanement",
		den: "Have 5 lives at once",
		cond: (s) => s.maxLives >= 5,
	},
	{
		id: "close_call",
		cat: "survival",
		icon: "😰",
		fr: "Ouf",
		en: "Close Call",
		dfr: "Survivre avec 1 vie restante",
		den: "Survive with 1 life remaining",
		cond: (s) => s.closeCalls >= 1,
	},
	{
		id: "revive_3",
		cat: "survival",
		icon: "💗",
		fr: "Resilient",
		en: "Resilient",
		dfr: "Ramasser 3 vies en jeu",
		den: "Collect 3 life power-ups",
		cond: (s) => s.livesCollected >= 3,
	},
	{
		id: "shots_500",
		cat: "shots",
		icon: "💨",
		fr: "Trigger Happy",
		en: "Trigger Happy",
		dfr: "500 projectiles tires",
		den: "500 shots fired",
		cond: (s) => s.totalShots >= 500,
	},
	{
		id: "shots_2000",
		cat: "shots",
		icon: "🌀",
		fr: "Arroseur",
		en: "Sprayer",
		dfr: "2000 projectiles tires",
		den: "2000 shots fired",
		cond: (s) => s.totalShots >= 2000,
	},
	{
		id: "shots_5000",
		cat: "shots",
		icon: "🌊",
		fr: "Deluge de Feu",
		en: "Fire Flood",
		dfr: "5000 projectiles tires",
		den: "5000 shots fired",
		cond: (s) => s.totalShots >= 5000,
	},
	{
		id: "mega_5",
		cat: "shots",
		icon: "💥",
		fr: "Artificier",
		en: "Pyrotechnist",
		dfr: "5 Mega Blast utilises",
		den: "5 Mega Blasts used",
		cond: (s) => s.megaUsed >= 5,
	},
	{
		id: "mega_10",
		cat: "shots",
		icon: "🔱",
		fr: "Destruction Totale",
		en: "Total Destruction",
		dfr: "10 Mega Blast utilises",
		den: "10 Mega Blasts used",
		cond: (s) => s.megaUsed >= 10,
	},
	{
		id: "firemax",
		cat: "shots",
		icon: "🔥",
		fr: "Feu Maximum",
		en: "Max Fire",
		dfr: "Niveau de feu 5 atteint",
		den: "Reach fire level 5",
		cond: (s) => s.maxFireLevel >= 5,
	},
	{
		id: "homing_10",
		cat: "shots",
		icon: "🎯",
		fr: "Precision Guidee",
		en: "Guided Precision",
		dfr: "10 tirs guides reussis",
		den: "10 homing kills",
		cond: (s) => s.homingKills >= 10,
	},
	{
		id: "play_5min",
		cat: "time",
		icon: "⏱",
		fr: "Accroc",
		en: "Hooked",
		dfr: "5 minutes de jeu total",
		den: "5 minutes of play",
		cond: (s) => s.totalTime >= 300,
	},
	{
		id: "play_30min",
		cat: "time",
		icon: "⏱",
		fr: "Acharne",
		en: "Dedicated",
		dfr: "30 minutes de jeu total",
		den: "30 minutes of play",
		cond: (s) => s.totalTime >= 1800,
	},
	{
		id: "play_1hr",
		cat: "time",
		icon: "🕐",
		fr: "No-Life",
		en: "No-Lifer",
		dfr: "1 heure de jeu total",
		den: "1 hour of play",
		cond: (s) => s.totalTime >= 3600,
	},
	{
		id: "speedrun_l1",
		cat: "time",
		icon: "🏃",
		fr: "Vitesse Niveau 1",
		en: "Speed Level 1",
		dfr: "Finir niveau 1 en moins de 50s",
		den: "Beat level 1 in under 50s",
		cond: (s) => s.l1Time > 0 && s.l1Time < 50,
	},
	{
		id: "speedrun_l2",
		cat: "time",
		icon: "🏃",
		fr: "Vitesse Niveau 2",
		en: "Speed Level 2",
		dfr: "Finir niveau 2 en moins de 60s",
		den: "Beat level 2 in under 60s",
		cond: (s) => s.l2Time > 0 && s.l2Time < 60,
	},
	{
		id: "speedrun_all",
		cat: "time",
		icon: "🏆",
		fr: "Any%",
		en: "Any%",
		dfr: "Jeu termine en moins de 4min",
		den: "Beat game in under 4 min",
		cond: (s) => s.totalRunTime > 0 && s.totalRunTime < 240,
	},
	{
		id: "powerups_10",
		cat: "powerups",
		icon: "📦",
		fr: "Collectionneur",
		en: "Collector",
		dfr: "10 power-ups ramasses",
		den: "10 power-ups collected",
		cond: (s) => s.powerupsCollected >= 10,
	},
	{
		id: "powerups_25",
		cat: "powerups",
		icon: "📦",
		fr: "Thesauriseur",
		en: "Hoarder",
		dfr: "25 power-ups ramasses",
		den: "25 power-ups collected",
		cond: (s) => s.powerupsCollected >= 25,
	},
	{
		id: "powerups_50",
		cat: "powerups",
		icon: "📦",
		fr: "Opportuniste",
		en: "Opportunist",
		dfr: "50 power-ups ramasses",
		den: "50 power-ups collected",
		cond: (s) => s.powerupsCollected >= 50,
	},
	{
		id: "shields_5",
		cat: "powerups",
		icon: "🛡",
		fr: "Tortue",
		en: "Turtle",
		dfr: "5 boucliers utilises",
		den: "5 shields used",
		cond: (s) => s.shieldsUsed >= 5,
	},
	{
		id: "speed_5",
		cat: "powerups",
		icon: "⚡",
		fr: "Dragster",
		en: "Dragster",
		dfr: "5 boosts de vitesse utilises",
		den: "5 speed boosts used",
		cond: (s) => s.speedsUsed >= 5,
	},
	{
		id: "beat_easy",
		cat: "diff",
		icon: "🥉",
		fr: "Vainqueur Facile",
		en: "Easy Winner",
		dfr: "Terminer le jeu en Facile",
		den: "Beat the game on Easy",
		cond: (s) => s.beatEasy,
	},
	{
		id: "beat_normal",
		cat: "diff",
		icon: "🥈",
		fr: "Vainqueur Normal",
		en: "Normal Winner",
		dfr: "Terminer le jeu en Normal",
		den: "Beat the game on Normal",
		cond: (s) => s.beatNormal,
	},
	{
		id: "beat_hard",
		cat: "diff",
		icon: "🥇",
		fr: "Vainqueur Difficile",
		en: "Hard Winner",
		dfr: "Terminer le jeu en Difficile",
		den: "Beat the game on Hard",
		cond: (s) => s.beatHard,
	},
	{
		id: "hard_no_die",
		cat: "diff",
		icon: "💀",
		fr: "Masochiste",
		en: "Masochist",
		dfr: "Finir Difficile sans mourir",
		den: "Beat Hard without dying",
		cond: (s) => s.hardNoDeath,
	},
	{
		id: "comeback",
		cat: "special",
		icon: "🔄",
		fr: "Comeback",
		en: "Comeback",
		dfr: "Reprendre une partie sauvegardee",
		den: "Resume a saved game",
		cond: (s) => s.resumes >= 1,
	},
	{
		id: "shield_boss",
		cat: "special",
		icon: "🛡",
		fr: "Invulnerable",
		en: "Invulnerable",
		dfr: "Vaincre un boss avec bouclier",
		den: "Defeat boss with shield on",
		cond: (s) => s.bossKilledWithShield >= 1,
	},
	{
		id: "combo_boss",
		cat: "special",
		icon: "🌟",
		fr: "Combo Boss",
		en: "Combo Boss",
		dfr: "Vaincre un boss avec combo x5+",
		den: "Defeat boss with 5x+ combo",
		cond: (s) => s.bossKilledWithCombo5 >= 1,
	},
	{
		id: "multi_kill",
		cat: "special",
		icon: "💫",
		fr: "Multi-Kill",
		en: "Multi-Kill",
		dfr: "Tuer 3 ennemis simultanement",
		den: "Kill 3 enemies simultaneously",
		cond: (s) => s.multiKills >= 1,
	},
	{
		id: "no_powerup_l1",
		cat: "special",
		icon: "🚫",
		fr: "Ascete",
		en: "Ascetic",
		dfr: "Finir niveau 1 sans power-up",
		den: "Beat level 1 with no power-ups",
		cond: (s) => s.l1NoPowerup,
	},
	{
		id: "fire5_boss",
		cat: "special",
		icon: "🔱",
		fr: "Feu Maximal Boss",
		en: "Max Fire Boss",
		dfr: "Vaincre boss avec feu niveau 5",
		den: "Defeat boss at fire level 5",
		cond: (s) => s.bossKilledAtMaxFire >= 1,
	},
	{
		id: "all_types",
		cat: "special",
		icon: "📋",
		fr: "Encyclopediste",
		en: "Encyclopedist",
		dfr: "Tuer chaque type ennemi",
		den: "Kill every enemy type",
		cond: (s) =>
			s.droneKills >= 1 &&
			s.turretKills >= 1 &&
			s.kamikazeKills >= 1,
	},
	{
		id: "lucky_7",
		cat: "special",
		icon: "🍀",
		fr: "Chanceux 7",
		en: "Lucky 7",
		dfr: "Score se terminant par 777",
		den: "Score ending in 777",
		cond: (s) => s.hiScore % 1000 === 777,
	},
	{
		id: "elite_shooter",
		cat: "special",
		icon: "🎯",
		fr: "Tireur Elite",
		en: "Elite Shooter",
		dfr: "Vaincre un boss sans manquer",
		den: "Defeat boss without missing",
		cond: (s) => s.bossNoMiss >= 1,
	},
	{
		id: "lb_top10",
		cat: "special",
		icon: "🌐",
		fr: "Top 10 Mondial",
		en: "World Top 10",
		dfr: "Entrer dans le top 10 mondial",
		den: "Enter world top 10",
		cond: (s) => s.lbBestRank > 0 && s.lbBestRank <= 10,
	},
	{
		id: "lb_top1",
		cat: "special",
		icon: "👑",
		fr: "Champion Mondial",
		en: "World Champion",
		dfr: "1er au classement mondial",
		den: "Reach rank 1 worldwide",
		cond: (s) => s.lbBestRank === 1,
	},
	{
		id: "runs_5",
		cat: "runs",
		icon: "🎮",
		fr: "Habitue",
		en: "Regular",
		dfr: "5 parties jouees",
		den: "5 games played",
		cond: (s) => s.totalRuns >= 5,
	},
	{
		id: "runs_10",
		cat: "runs",
		icon: "🎮",
		fr: "Passionne",
		en: "Enthusiast",
		dfr: "10 parties jouees",
		den: "10 games played",
		cond: (s) => s.totalRuns >= 10,
	},
	{
		id: "runs_25",
		cat: "runs",
		icon: "🎮",
		fr: "Veteran",
		en: "Veteran",
		dfr: "25 parties jouees",
		den: "25 games played",
		cond: (s) => s.totalRuns >= 25,
	},
	{
		id: "runs_50",
		cat: "runs",
		icon: "🕹",
		fr: "Addict",
		en: "Addict",
		dfr: "50 parties jouees",
		den: "50 games played",
		cond: (s) => s.totalRuns >= 50,
	},
	{
		id: "secret_pauses",
		cat: "secret",
		icon: "🔮",
		fr: "???",
		en: "???",
		dfr: "A decouvrir en jouant",
		den: "Discover by playing",
		cond: (s) => s.pauses >= 10,
		sfr: "Accro a la Pause",
		sen: "Pause Addict",
	},
	{
		id: "secret_noboss",
		cat: "secret",
		icon: "🌙",
		fr: "???",
		en: "???",
		dfr: "A decouvrir en jouant",
		den: "Discover by playing",
		cond: (s) => s.bossesKilled >= 3 && s.totalShots < 500,
		sfr: "Sniper",
		sen: "Sniper",
	},
	{
		id: "secret_score0",
		cat: "secret",
		icon: "⚡",
		fr: "???",
		en: "???",
		dfr: "A decouvrir en jouant",
		den: "Discover by playing",
		cond: (s) => s.totalRuns >= 3 && s.hiScore === 0,
		sfr: "Zero Absolu",
		sen: "Absolute Zero",
	},
	{
		id: "secret_30s",
		cat: "secret",
		icon: "☮",
		fr: "???",
		en: "???",
		dfr: "A decouvrir en jouant",
		den: "Discover by playing",
		cond: (s) => s.pacifistTime >= 30,
		sfr: "Pacifiste",
		sen: "Pacifist",
	},
	{
		id: "ach_10",
		cat: "meta",
		icon: "🏅",
		fr: "Rookie des Succes",
		en: "Achievement Rookie",
		dfr: "10 succes debloques",
		den: "10 achievements unlocked",
		cond: (s) => s.unlockedCount >= 10,
	},
	{
		id: "ach_25",
		cat: "meta",
		icon: "🏅",
		fr: "Chasseur de Succes",
		en: "Achievement Hunter",
		dfr: "25 succes debloques",
		den: "25 achievements unlocked",
		cond: (s) => s.unlockedCount >= 25,
	},
	{
		id: "ach_50",
		cat: "meta",
		icon: "🏆",
		fr: "Maitre des Succes",
		en: "Achievement Master",
		dfr: "50 succes debloques",
		den: "50 achievements unlocked",
		cond: (s) => s.unlockedCount >= 50,
	},
	{
		id: "ach_100",
		cat: "meta",
		icon: "💎",
		fr: "100% Complete",
		en: "100% Complete",
		dfr: "Tous les succes debloques",
		den: "All achievements unlocked",
		cond: (s) => s.unlockedCount >= 100,
	},
	{
		id: "score_lb",
		cat: "meta",
		icon: "🌐",
		fr: "Connecte",
		en: "Connected",
		dfr: "Envoyer un score au classement",
		den: "Submit a score to leaderboard",
		cond: (s) => s.scoreSubmitted >= 1,
	},
	{
		id: "win_all_diff",
		cat: "meta",
		icon: "🌈",
		fr: "Conquerant",
		en: "Conqueror",
		dfr: "Gagner dans les 3 difficultes",
		den: "Win on all 3 difficulties",
		cond: (s) => s.beatEasy && s.beatNormal && s.beatHard,
	},
	{
		id: "powerup_streak",
		cat: "meta",
		icon: "🎆",
		fr: "Ramasseur",
		en: "Gatherer",
		dfr: "5 power-ups consecutifs",
		den: "5 power-ups in a row",
		cond: (s) => s.powerupStreak >= 5,
	},
	{
		id: "boss_dmg_none",
		cat: "meta",
		icon: "🛡",
		fr: "Sans Egratignure",
		en: "Unscratchable",
		dfr: "Vaincre un boss sans perdre de vie",
		den: "Defeat a boss without losing lives",
		cond: (s) => s.bossNoDmg >= 1,
	},
	{
		id: "max_score_run",
		cat: "meta",
		icon: "💰",
		fr: "Efficient",
		en: "Efficient",
		dfr: "10k+ score avec 1 seule vie",
		den: "10k+ score with 1 life only",
		cond: (s) => s.highScoreSingleLife >= 10000,
	},
	{
		id: "kills_2000",
		cat: "kills",
		icon: "💀",
		fr: "Genocidaire",
		en: "Genocidal",
		dfr: "2000 ennemis detruits",
		den: "2000 enemies destroyed",
		cond: (s) => s.totalKills >= 2000,
	},
	{
		id: "shots_10k",
		cat: "shots",
		icon: "🌊",
		fr: "Ocean de Feu",
		en: "Ocean of Fire",
		dfr: "10000 projectiles tires",
		den: "10000 shots fired",
		cond: (s) => s.totalShots >= 10000,
	},
	{
		id: "score_200k",
		cat: "score",
		icon: "🔥",
		fr: "Mythique",
		en: "Mythical",
		dfr: "Score de 200 000",
		den: "Score of 200,000",
		cond: (s) => s.hiScore >= 200000,
	},
	{
		id: "runs_100",
		cat: "runs",
		icon: "🕹",
		fr: "Ultra-Addict",
		en: "Ultra-Addict",
		dfr: "100 parties jouees",
		den: "100 games played",
		cond: (s) => s.totalRuns >= 100,
	},
	{
		id: "play_3hr",
		cat: "time",
		icon: "🕐",
		fr: "Eternel",
		en: "Eternal",
		dfr: "3 heures de jeu total",
		den: "3 hours of play",
		cond: (s) => s.totalTime >= 10800,
	},
	{
		id: "bosses_6",
		cat: "kills",
		icon: "👑",
		fr: "Tueur de Titans",
		en: "Titan Slayer",
		dfr: "Vaincre 6 boss total",
		den: "Defeat 6 bosses total",
		cond: (s) => s.bossesKilled >= 6,
	},
	{
		id: "bosses_10",
		cat: "kills",
		icon: "💀",
		fr: "Nemesis",
		en: "Nemesis",
		dfr: "Vaincre 10 boss total",
		den: "Defeat 10 bosses total",
		cond: (s) => s.bossesKilled >= 10,
	},
	{
		id: "turret_50",
		cat: "kills",
		icon: "🔫",
		fr: "Anti-Tourelle",
		en: "Anti-Turret",
		dfr: "50 tourelles detruites",
		den: "50 turrets destroyed",
		cond: (s) => s.turretKills >= 50,
	},
	{
		id: "score_500k",
		cat: "score",
		icon: "⚡",
		fr: "Absolu",
		en: "Absolute",
		dfr: "Score de 500 000",
		den: "Score of 500,000",
		cond: (s) => s.hiScore >= 500000,
	},
	{
		id: "speedboss_1",
		cat: "time",
		icon: "⚡",
		fr: "Liquidateur Rapide",
		en: "Speed Liquidator",
		dfr: "Vaincre un boss en moins de 30s",
		den: "Defeat a boss in under 30s",
		cond: (s) => s.fastBossKill >= 1,
	},
	{
		id: "no_miss_l1",
		cat: "survival",
		icon: "🎯",
		fr: "Tir Parfait L1",
		en: "Perfect Shot L1",
		dfr: "Finir niveau 1 sans perdre une vie",
		den: "Beat level 1 without losing life",
		cond: (s) => s.l1NoDeath,
	},
	{
		id: "turret_100",
		cat: "kills",
		icon: "🔫",
		fr: "Demolisseur Total",
		en: "Total Demolisher",
		dfr: "100 tourelles detruites",
		den: "100 turrets destroyed",
		cond: (s) => s.turretKills >= 100,
	},
	{
		id: "kamikaze_100",
		cat: "kills",
		icon: "💣",
		fr: "Exorciste",
		en: "Exorcist",
		dfr: "100 kamikazes stoppes",
		den: "100 kamikazes stopped",
		cond: (s) => s.kamikazeKills >= 100,
	},
	{
		id: "score_1m",
		cat: "score",
		icon: "🌟",
		fr: "Divin",
		en: "Divine",
		dfr: "Score de 1 000 000",
		den: "Score of 1,000,000",
		cond: (s) => s.hiScore >= 1000000,
	},
];
// Verify count >= 100
// console.log('ACH count:', ACH_DEFS.length);

const achStats = (() => {
	const KEY = "iw_achstats";
	let _s = null;
	function _def() {
		return {
			totalShots: 0,
			totalKills: 0,
			droneKills: 0,
			turretKills: 0,
			kamikazeKills: 0,
			bossesKilled: 0,
			levelsCleared: 0,
			powerupsCollected: 0,
			megaUsed: 0,
			shieldsUsed: 0,
			homingUsed: 0,
			speedsUsed: 0,
			pauses: 0,
			maxCombo: 0,
			hiScore: 0,
			totalTime: 0,
			totalRuns: 0,
			resumes: 0,
			l1NoDeath: false,
			l2NoDeath: false,
			l3NoDeath: false,
			fullRunNoDeath: false,
			hardNoDeath: false,
			beatEasy: false,
			beatNormal: false,
			beatHard: false,
			closeCalls: 0,
			livesCollected: 0,
			maxLives: 0,
			l1Time: 0,
			l2Time: 0,
			totalRunTime: 0,
			homingKills: 0,
			bossKilledWithShield: 0,
			bossKilledWithCombo5: 0,
			multiKills: 0,
			l1NoPowerup: false,
			bossKilledAtMaxFire: 0,
			bossNoMiss: 0,
			bossNoDmg: 0,
			highScoreSingleLife: 0,
			powerupStreak: 0,
			powerupStreakCur: 0,
			killStreak: 0,
			lastPowerupType: null,
			rageMode: false,
			eliteKillCount: 0,
			eliteWaveCount: 0,
			ragePulse: 0,
			maxKillStreak: 0,
			killStreakTimer: 0,
			pacifistTime: 0,
			maxFireLevel: 0,
			lbBestRank: 0,
			scoreSubmitted: 0,
			unlockedCount: 0,
			unlocked: {},
		};
	}
	function load() {
		if (_s) return _s;
		try {
			_s = Object.assign(
				_def(),
				JSON.parse(idb.getItem(KEY) || "{}"),
			);
		} catch (e) {
			_s = _def();
		}
		return _s;
	}
	function save() {
		_s.unlockedCount = Object.keys(_s.unlocked).length;
		idb.setItem(KEY, JSON.stringify(_s));
	}
	function get() {
		return load();
	}
	function check(onUnlock) {
		const s = load();
		for (const a of ACH_DEFS) {
			if (s.unlocked[a.id]) continue;
			try {
				if (a.cond(s)) {
					s.unlocked[a.id] = Date.now();
					save();
					onUnlock?.(a);
				}
			} catch (e) {}
		}
	}
	function reload() {
		_s = null;
	} // force re-read from idb after preload
	return { get, save, check, load, reload };
})();

// ═══ SAVE GAME ════════════════════════════════════════════════════════════
const saveGame = {
	KEY: "iw_save",
	save(state, player) {
		idb.setItem(
			this.KEY,
			JSON.stringify({
				level: state.level,
				score: state.score,
				lives: state.lives,
				levelTime: state.levelTime,
				phase: state.phase,
				fireLevel: player.fireLevel,
				hasShield: player.hasShield,
				permanentShield: player.permanentShield,
				hasHoming: player.hasHoming,
				speedBoost: player.speedBoost,
				megaReady: player.megaReady,
				isSurvival: state.isSurvival,
				survivalWave: state.survivalWave,
				survivalWaveTimer: state.survivalWaveTimer,
				survivalTotalTime: state.survivalTotalTime,
				bossSpawned: state.bossSpawned,
				dangerZones: state.dangerZones || [],
				firePowerupPending:
					state._firePowerupPending || false,
				firePowerupKills: state._firePowerupKills || 0,
				ts: Date.now(),
			}),
		);
	},
	load() {
		try {
			const d = JSON.parse(idb.getItem(this.KEY) || "null");
			if (!d || Date.now() - d.ts > 7 * 86400000) {
				this.clear();
				return null;
			}
			return d;
		} catch (e) {
			return null;
		}
	},
	clear() {
		idb.removeItem(this.KEY);
	},
	has() {
		return idb.hasItem(this.KEY);
	},
};

// ═══ PILOT LEVEL SYSTEM ══════════════════════════════════════════════════
const pilotLevel = (() => {
	const KEY = "iw_pilot";
	const TITLES = [
		"Recrue",
		"Apprenti",
		"Aviateur",
		"Pilote",
		"As",
		"Vétéran",
		"Élite",
		"Ace",
		"Légende",
		"Mythique",
		"Invincible",
		"Divin",
		"Suprême",
		"Immortel",
		"Inferno",
	];
	const XP_TABLE = [
		0, 500, 1200, 2500, 4500, 7500, 12000, 18000, 26000, 36000,
		48000, 63000, 81000, 103000, 130000,
	];

	let _data = null;

	function _load() {
		try {
			const raw = idb.getItem(KEY);
			if (raw) _data = JSON.parse(raw);
		} catch (e) {}
		if (!_data) _data = { level: 1, xp: 0, gamesPlayed: 0 };
		return _data;
	}

	function _save() {
		idb.setItem(KEY, JSON.stringify(_data));
	}

	_load();

	return {
		reload() {
			_load();
		},
		get() {
			return _data;
		},
		getXpForNext() {
			const lvl = _data.level;
			if (lvl >= XP_TABLE.length) return 0;
			const next =
				XP_TABLE[lvl] || XP_TABLE[XP_TABLE.length - 1] * 2;
			const cur = XP_TABLE[lvl - 1] || 0;
			return next - cur;
		},
		getTitle() {
			const idx = Math.min(
				_data.level - 1,
				TITLES.length - 1,
			);
			return TITLES[idx];
		},
		addXP(amount) {
			// Ne pas accumuler d'XP au niveau max
			if (_data.level >= XP_TABLE.length) {
				_data.xp = 0;
				return;
			}
			_data.xp = (_data.xp || 0) + (amount || 0);
			// Level up loop
			while (_data.level < XP_TABLE.length) {
				const needed =
					XP_TABLE[_data.level] -
					(XP_TABLE[_data.level - 1] || 0);
				if (_data.xp >= needed) {
					_data.xp -= needed;
					_data.level++;
				} else {
					break;
				}
			}
			// Remettre à 0 si on a atteint le max lors de ce gain
			if (_data.level >= XP_TABLE.length) _data.xp = 0;
		},
		save() {
			_save();
		},
	};
})();

// ═══ DAILY MISSION SYSTEM ═════════════════════════════════════════════════
const dailySystem = (() => {
	const KEY = "iw_daily";

	const MISSION_TEMPLATES = [
		{
			id: "score",
			type: "absolute",
			target: 5000,
			xp: 200,
			en: "Score 5 000 pts",
			fr: "Atteindre 5 000 pts",
		},
		{
			id: "score2",
			type: "absolute",
			target: 10000,
			xp: 350,
			en: "Score 10 000 pts",
			fr: "Atteindre 10 000 pts",
		},
		{
			id: "kills",
			type: "progress",
			target: 30,
			xp: 150,
			en: "Destroy 30 enemies",
			fr: "Détruire 30 ennemis",
		},
		{
			id: "kills2",
			type: "progress",
			target: 60,
			xp: 250,
			en: "Destroy 60 enemies",
			fr: "Détruire 60 ennemis",
		},
		{
			id: "streak",
			type: "absolute",
			target: 10,
			xp: 150,
			en: "10 kill streak",
			fr: "Série de 10 kills",
		},
		{
			id: "streak2",
			type: "absolute",
			target: 15,
			xp: 250,
			en: "15 kill streak",
			fr: "Série de 15 kills",
		},
		{
			id: "bosses",
			type: "progress",
			target: 2,
			xp: 250,
			en: "Defeat 2 bosses",
			fr: "Vaincre 2 boss",
		},
		{
			id: "boss1",
			type: "progress",
			target: 1,
			xp: 150,
			en: "Defeat 1 boss",
			fr: "Vaincre 1 boss",
		},
		{
			id: "time",
			type: "absolute",
			target: 120,
			xp: 100,
			en: "Survive 2 minutes",
			fr: "Survivre 2 minutes",
		},
		{
			id: "time2",
			type: "absolute",
			target: 300,
			xp: 200,
			en: "Survive 5 minutes",
			fr: "Survivre 5 minutes",
		},
		{
			id: "nodmg",
			type: "progress",
			target: 1,
			xp: 300,
			en: "No-damage wave",
			fr: "Une vague sans dégât",
		},
		{
			id: "powerups",
			type: "progress",
			target: 5,
			xp: 100,
			en: "Collect 5 power-ups",
			fr: "Ramasser 5 power-ups",
		},
		{
			id: "powerups2",
			type: "progress",
			target: 10,
			xp: 180,
			en: "Collect 10 power-ups",
			fr: "Ramasser 10 power-ups",
		},
		{
			id: "elite",
			type: "progress",
			target: 1,
			xp: 400,
			en: "Defeat 1 elite enemy",
			fr: "Vaincre 1 ennemi élite",
		},
		{
			id: "combo10",
			type: "absolute",
			target: 10,
			xp: 280,
			en: "Reach combo x10",
			fr: "Atteindre combo x10",
		},
		{
			id: "rage",
			type: "progress",
			target: 1,
			xp: 220,
			en: "Activate Rage mode",
			fr: "Activer le mode Rage",
		},
	];

	function _todayKey() {
		const d = new Date();
		return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
	}

	function _defaultMissions() {
		// Pick 4 missions deterministically based on the day
		// Use a better hash to get more varied daily picks
		const d = new Date();
		const seed =
			d.getDate() * 7 +
			d.getMonth() * 31 +
			(d.getFullYear() % 100) * 3;
		const shuffled = [...MISSION_TEMPLATES].sort((a, b) => {
			const ha =
				(seed * 37 +
					a.id.charCodeAt(0) * 13 +
					(a.id.charCodeAt(1) || 0) * 7) %
				127;
			const hb =
				(seed * 37 +
					b.id.charCodeAt(0) * 13 +
					(b.id.charCodeAt(1) || 0) * 7) %
				127;
			return ha - hb;
		});
		return shuffled.slice(0, 4).map((t) => ({
			...t,
			progress: 0,
			done: false,
		}));
	}

	let _data = null;

	function _load() {
		try {
			const raw = idb.getItem(KEY);
			if (raw) {
				const d = JSON.parse(raw);
				if (d.day === _todayKey()) {
					_data = d;
					return;
				}
			}
		} catch (e) {}
		_data = {
			day: _todayKey(),
			missions: _defaultMissions(),
			dailyRunDone: false,
			dailyRunScore: 0,
		};
		_save();
	}

	function _save() {
		idb.setItem(KEY, JSON.stringify(_data));
	}

	_load();

	return {
		reload() {
			_load();
		},
		get() {
			return _data;
		},
		isDailyRunDone() {
			return false; // Daily mode supprimé
		},
		completeDailyRun(score) {
			// Daily mode supprimé — méthode conservée pour compatibilité
		},
		/** Update an absolute-type mission (e.g. score, streak). Returns newly completed missions. */
		setMissionAbsolute(id, value) {
			const completed = [];
			for (const m of _data.missions) {
				if (
					m.id === id &&
					!m.done &&
					m.type === "absolute"
				) {
					m.progress = Math.max(
						m.progress || 0,
						value || 0,
					);
					if (m.progress >= m.target) {
						m.done = true;
						completed.push(m);
					}
				}
			}
			if (completed.length) _save();
			return completed;
		},
		/** Increment a progress-type mission. Returns newly completed missions. */
		markMissionProgress(id, amount) {
			const completed = [];
			for (const m of _data.missions) {
				if (m.id === id && !m.done) {
					m.progress = (m.progress || 0) + (amount || 1);
					if (m.progress >= m.target) {
						m.done = true;
						completed.push(m);
					}
				}
			}
			if (completed.length) _save();
			return completed;
		},
	};
})();

// ═══ SEASON BADGES ════════════════════════════════════════════════════════
const seasonBadges = (() => {
	const KEY = "iw_bdg";
	const BADGE_DEFS = [
		{
			id: "firstBlood",
			icon: "🩸",
			en: "First Kill",
			fr: "Premier Kill",
			earned: false,
		},
		{
			id: "boss1",
			icon: "💀",
			en: "Boss Slayer",
			fr: "Tueur de Boss",
			earned: false,
		},
		{
			id: "dailyDone",
			icon: "📅",
			en: "Daily Complete x1",
			fr: "Daily Complétée x1",
			earned: false,
		},
		{
			id: "survive5",
			icon: "⏱️",
			en: "Survived 5 min",
			fr: "5 min de survie",
			earned: false,
		},
		{
			id: "score10k",
			icon: "🏆",
			en: "Score 1 000 000",
			fr: "1 000 000 points",
			earned: false,
		},
		{
			id: "kills100",
			icon: "🔥",
			en: "1 000 Kills",
			fr: "1 000 ennemis",
			earned: false,
		},
		{
			id: "noHit",
			icon: "🛡️",
			en: "No-Damage Wave",
			fr: "Vague sans dégât",
			earned: false,
		},
		{
			id: "pilot5",
			icon: "✈️",
			en: "Pilot Level 5",
			fr: "Pilote Niveau 5",
			earned: false,
		},
		{
			id: "eliteSlayer",
			icon: "👑",
			en: "Elite Defeated",
			fr: "Élite Vaincu",
			earned: false,
		},
		{
			id: "comboMaster",
			icon: "⚡",
			en: "Combo x50",
			fr: "Combo x50",
			earned: false,
		},
	];
	let _data = null;
	function _load() {
		try {
			const raw = JSON.parse(idb.getItem(KEY) || "{}");
			_data = BADGE_DEFS.map((b) => ({
				...b,
				earned: !!raw[b.id],
			}));
		} catch (e) {
			_data = BADGE_DEFS.map((b) => ({ ...b }));
		}
	}
	_load();
	return {
		reload() {
			_load();
		},
		getAll() {
			return _data;
		},
		unlock(id) {
			const b = _data.find((x) => x.id === id);
			if (b && !b.earned) {
				b.earned = true;
				const raw = JSON.parse(idb.getItem(KEY) || "{}");
				raw[id] = true;
				idb.setItem(KEY, JSON.stringify(raw));
			}
		},
	};
})();

// ═══ MATCH HISTORY ════════════════════════════════════════════════════════
const matchHistory = (() => {
	const KEY = "iw_history";
	const MAX = 50;
	let _list = null;
	function _load() {
		try {
			_list = JSON.parse(idb.getItem(KEY) || "[]");
		} catch (e) {
			_list = [];
		}
	}
	function _save() {
		idb.setItem(KEY, JSON.stringify(_list));
	}
	_load();
	return {
		reload() {
			_load();
		},
		push(entry) {
			_list.unshift({ ...entry, date: Date.now() });
			if (_list.length > MAX) _list.length = MAX;
			_save();
		},
		getAll() {
			return _list;
		},
		clear() {
			_list = [];
			_save();
		},
	};
})();

// ═══ SURVIVAL DATA ═══════════════════════════════════════════════════════
const survivalData = (() => {
	const KEY = "iw_surv_best";
	let _best = 0;
	try {
		_best = parseInt(idb.getItem(KEY) || "0", 10) || 0;
	} catch (e) {}
	return {
		getBest() {
			return _best;
		},
		setBest(wave) {
			if (wave > _best) {
				_best = wave;
				idb.setItem(KEY, String(_best));
			}
		},
	};
})();

// ═══ AUDIO ════════════════════════════════════════════════════════════════
const audio = (() => {
	let _levelMusicEl = null; // spaceship_1 — musique niveaux
	let _bossMusicEl = null; // overdrive_1 — musique boss
	let _activeMusicEl = null; // element actif
	let _menuSynthId = 0; // compteur de session synthé menu
	let C = null,
		MG = null,
		SG = null,
		mn = [],
		mp = false,
		ok = false;

	// Initialiser l'élément audio dès que possible (indépendant de AudioContext)
	function _initMusicEl() {
		if (!_levelMusicEl) {
			_levelMusicEl =
				document.getElementById("iw-level-music");
			if (_levelMusicEl)
				_levelMusicEl.volume = Math.min(
					1,
					settings.musicVol,
				);
		}
		if (!_bossMusicEl) {
			_bossMusicEl = document.getElementById("iw-boss-music");
			if (_bossMusicEl)
				_bossMusicEl.volume = Math.min(
					1,
					settings.musicVol,
				);
		}
	}
	// Essayer maintenant et au chargement complet du DOM
	_initMusicEl();
	if (document.readyState !== "complete") {
		window.addEventListener("load", _initMusicEl, {
			once: true,
		});
	}

	function init() {
		_initMusicEl(); // s'assurer que l'élément est prêt
		try {
			if (C) return;
			const AC =
				window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			C = new AC();
			MG = C.createGain();
			MG.gain.value = settings.musicVol;
			MG.connect(C.destination);
			SG = C.createGain();
			SG.gain.value = settings.sfxVol;
			SG.connect(C.destination);
			ok = true;
		} catch (e) {
			C = null;
			ok = false;
		}
	}
	function resume() {
		try {
			if (C && C.state === "suspended") C.resume();
		} catch (e) {}
	}
	function tone(f, t, d, v, dst, ef) {
		if (!ok || !C) return;
		try {
			const o = C.createOscillator(),
				g = C.createGain();
			o.type = t || "square";
			o.frequency.setValueAtTime(f, C.currentTime);
			if (ef)
				o.frequency.exponentialRampToValueAtTime(
					Math.max(ef, 1),
					C.currentTime + d,
				);
			g.gain.setValueAtTime(v || 0.3, C.currentTime);
			g.gain.exponentialRampToValueAtTime(
				0.001,
				C.currentTime + d,
			);
			o.connect(g);
			g.connect(dst || SG);
			o.start();
			o.stop(C.currentTime + d);
		} catch (e) {}
	}
	function burst(d, v) {
		if (!ok || !C) return;
		try {
			const n = Math.floor(C.sampleRate * d),
				b = C.createBuffer(1, n, C.sampleRate),
				da = b.getChannelData(0);
			for (let i = 0; i < n; i++)
				da[i] = Math.random() * 2 - 1;
			const s = C.createBufferSource(),
				g = C.createGain();
			s.buffer = b;
			g.gain.setValueAtTime(v || 0.2, C.currentTime);
			g.gain.exponentialRampToValueAtTime(
				0.001,
				C.currentTime + d,
			);
			s.connect(g);
			g.connect(SG);
			s.start();
			s.stop(C.currentTime + d);
		} catch (e) {}
	}
	const sfx = {
		shoot() {
			tone(480, "square", 0.07, 0.15);
		},
		shootHoming() {
			tone(780, "sine", 0.1, 0.18, null, 1100);
		},
		megaBlast() {
			burst(0.25, 0.45);
			tone(90, "sawtooth", 0.35, 0.35, null, 45);
		},
		enemyHit() {
			tone(280, "square", 0.05, 0.12, null, 180);
		},
		explosion() {
			burst(0.18, 0.3);
			tone(95, "sawtooth", 0.18, 0.22, null, 40);
		},
		bossHit() {
			tone(170, "sawtooth", 0.07, 0.22, null, 110);
		},
		playerHit() {
			burst(0.35, 0.45);
			tone(140, "square", 0.28, 0.32, null, 55);
		},
		powerUp() {
			[440, 550, 660, 880].forEach((f, i) =>
				setTimeout(
					() => tone(f, "sine", 0.14, 0.22),
					i * 55,
				),
			);
		},
		bossWarn() {
			[200, 160, 200, 160].forEach((f, i) =>
				setTimeout(
					() => tone(f, "square", 0.16, 0.28),
					i * 180,
				),
			);
		},
		bossDead() {
			[200, 300, 500, 750].forEach((f, i) =>
				setTimeout(
					() => tone(f, "sine", 0.22, 0.3),
					i * 110,
				),
			);
		},
		levelUp() {
			[330, 440, 660, 880].forEach((f, i) =>
				setTimeout(
					() => tone(f, "sine", 0.18, 0.28),
					i * 75,
				),
			);
		},
		gameOver() {
			[300, 240, 180, 120].forEach((f, i) =>
				setTimeout(
					() => tone(f, "sawtooth", 0.28, 0.3),
					i * 140,
				),
			);
		},
		victory() {
			[440, 550, 660, 880, 1100].forEach((f, i) =>
				setTimeout(
					() => tone(f, "sine", 0.28, 0.3),
					i * 90,
				),
			);
		},
		click() {
			tone(640, "sine", 0.07, 0.16);
		},
		select() {
			tone(860, "sine", 0.1, 0.24);
		},
	};
	function startMusic(level) {
		stopMusic();
		if (settings.musicVol === 0) return;
		mp = true;
		_initMusicEl();

		// Routing : "boss" → overdrive | "menu" → synthé | tout le reste → spaceship
		let target = null;
		if (level === "boss") {
			target = _bossMusicEl;
		} else if (level !== "menu") {
			// Niveaux 0,1,2,3,4,5,6… → tous utilisent spaceship_1
			target = _levelMusicEl;
		}
		// level === "menu" → synthé procédural ci-dessous

		if (target) {
			_activeMusicEl = target;
			target.volume = Math.min(1, settings.musicVol);
			target.currentTime = 0;
			const playPromise = target.play();
			if (playPromise !== undefined) {
				playPromise.catch(() => {
					const retry = () => {
						if (mp && _activeMusicEl === target)
							target.play().catch(() => {});
					};
					document.addEventListener(
						"pointerdown",
						retry,
						{ once: true, capture: true },
					);
					document.addEventListener("keydown", retry, {
						once: true,
						capture: true,
					});
				});
			}
			return;
		}
		// Synthé thématique pour le menu — ambiance spatiale/infernale
		if (!ok || !C) return;
		try {
			MG.gain.value = settings.musicVol;
		} catch (e) {}

		// Identifiant de session — chaque appel à startMusic invalide les ticks précédents
		const _sid = ++_menuSynthId;

		const melody = [
			{ f: 110, dur: 0.8, type: "sine", vol: 0.1 },
			{ f: 146, dur: 0.6, type: "sine", vol: 0.07 },
			{ f: 130, dur: 0.5, type: "sine", vol: 0.08 },
			{ f: 165, dur: 0.8, type: "sine", vol: 0.06 },
			{ f: 110, dur: 0.4, type: "sine", vol: 0.09 },
			{ f: 123, dur: 0.7, type: "sine", vol: 0.07 },
		];
		const bass = [55, 55, 73, 55];
		let mStep = 0,
			bStep = 0;

		function tickMelody() {
			if (!mp || !ok || !C || _sid !== _menuSynthId) return;
			const note = melody[mStep++ % melody.length];
			try {
				const o = C.createOscillator(),
					g = C.createGain();
				o.type = note.type;
				o.frequency.value = note.f;
				g.gain.setValueAtTime(0.001, C.currentTime);
				g.gain.linearRampToValueAtTime(
					note.vol,
					C.currentTime + 0.15,
				);
				g.gain.exponentialRampToValueAtTime(
					0.001,
					C.currentTime + note.dur * 0.9,
				);
				o.connect(g);
				g.connect(MG);
				o.start();
				o.stop(C.currentTime + note.dur);
				mn.push(o, g);
			} catch (e) {
				ok = false;
				return;
			}
			if (mp && _sid === _menuSynthId)
				setTimeout(tickMelody, note.dur * 1000);
		}

		function tickBass() {
			if (!mp || !ok || !C || _sid !== _menuSynthId) return;
			const f = bass[bStep++ % bass.length];
			try {
				const o = C.createOscillator(),
					g = C.createGain();
				o.type = "triangle";
				o.frequency.value = f;
				g.gain.setValueAtTime(0.001, C.currentTime);
				g.gain.linearRampToValueAtTime(
					0.14,
					C.currentTime + 0.3,
				);
				g.gain.exponentialRampToValueAtTime(
					0.001,
					C.currentTime + 1.6,
				);
				o.connect(g);
				g.connect(MG);
				o.start();
				o.stop(C.currentTime + 1.8);
				mn.push(o, g);
			} catch (e) {
				ok = false;
				return;
			}
			if (mp && _sid === _menuSynthId)
				setTimeout(tickBass, 1800);
		}

		function tickPad() {
			if (!mp || !ok || !C || _sid !== _menuSynthId) return;
			try {
				const o = C.createOscillator(),
					g = C.createGain();
				o.type = "sine";
				o.frequency.value = 55 + Math.random() * 3;
				g.gain.setValueAtTime(0.001, C.currentTime);
				g.gain.linearRampToValueAtTime(
					0.04,
					C.currentTime + 1.5,
				);
				g.gain.exponentialRampToValueAtTime(
					0.001,
					C.currentTime + 3.8,
				);
				o.connect(g);
				g.connect(MG);
				o.start();
				o.stop(C.currentTime + 4);
				mn.push(o, g);
			} catch (e) {}
			if (mp && _sid === _menuSynthId)
				setTimeout(tickPad, 3800);
		}

		setTimeout(tickMelody, 0);
		setTimeout(tickBass, 200);
		setTimeout(tickPad, 500);
	}
	function pauseMusic() {
		_menuSynthId++; // invalide tous les ticks synthé en cours
		mp = false;
		mn.forEach((n) => {
			try {
				n.disconnect();
			} catch (e) {}
		});
		mn = [];
		[_levelMusicEl, _bossMusicEl].forEach((el) => {
			if (el) {
				try {
					el.pause();
				} catch (e) {}
			}
		});
	}

	function stopMusic() {
		_menuSynthId++; // invalide tous les ticks synthé en cours
		mp = false;
		mn.forEach((n) => {
			try {
				n.disconnect();
			} catch (e) {}
		});
		mn = [];
		[_levelMusicEl, _bossMusicEl].forEach((el) => {
			if (el) {
				try {
					el.pause();
					el.currentTime = 0;
				} catch (e) {}
			}
		});
		_activeMusicEl = null;
	}

	function resumeMusic() {
		// Reprend la piste active sans la recommencer depuis le début
		if (!mp && settings.musicVol > 0) {
			if (_activeMusicEl) {
				mp = true;
				_activeMusicEl.volume = Math.min(
					1,
					settings.musicVol,
				);
				_activeMusicEl.play().catch(() => {});
			} else {
				// Synthé menu actif — on le relance
				startMusic("menu");
			}
		}
	}
	function setMusicVol(v) {
		try {
			if (MG) MG.gain.value = v;
		} catch (e) {}
		[_levelMusicEl, _bossMusicEl].forEach((el) => {
			if (el) el.volume = Math.min(1, v);
		});
	}
	function setSfxVol(v) {
		try {
			if (SG) SG.gain.value = v;
		} catch (e) {}
	}
	return {
		init,
		resume,
		sfx,
		startMusic,
		stopMusic,
		pauseMusic,
		resumeMusic,
		setMusicVol,
		setSfxVol,
	};
})();

// ═══ GAMEPAD ══════════════════════════════════════════════════════════════
const gamepad = (() => {
	let _p = null;
	const D = 0.2;
	function poll() {
		_p = null;
		try {
			for (const p of navigator.getGamepads?.() || []) {
				if (p && p.connected) {
					_p = p;
					break;
				}
			}
		} catch (e) {}
	}
	function ax(i) {
		if (!_p) return 0;
		const v = _p.axes[i] || 0;
		return Math.abs(v) > D ? v : 0;
	}
	function bt(i) {
		return _p ? !!_p.buttons[i]?.pressed : false;
	}
	function inject(keys) {
		poll();
		if (!_p) return;

		const up = ax(1) < -D || (_p.axes[7] || 0) < -0.5 || bt(12);
		const dn = ax(1) > D || (_p.axes[7] || 0) > 0.5 || bt(13);
		const lf = ax(0) < -D || (_p.axes[6] || 0) < -0.5 || bt(14);
		const rt = ax(0) > D || (_p.axes[6] || 0) > 0.5 || bt(15);
		const sh = bt(0) || bt(7) || bt(5);
		const mg = bt(1) || bt(6) || bt(4);
		const pause = bt(9) || bt(8); // Start / Select

		// keys is a plain object here — set arrow-key equivalents
		keys["ArrowUp"] = up;
		keys["ArrowDown"] = dn;
		keys["ArrowLeft"] = lf;
		keys["ArrowRight"] = rt;
		keys[" "] = sh;
		keys["x"] = mg;

		// Gamepad pause (debounced via pauseJustPressed on keys object)
		if (pause && !keys._gpPauseHeld) {
			keys._gpPauseHeld = true;
			if (typeof _pauseToggle === "function") _pauseToggle();
		} else if (!pause) {
			keys._gpPauseHeld = false;
		}
	}
	function rumble(dur, wk, st) {
		if (!settings.rumble || !_p || !_p.vibrationActuator)
			return;
		try {
			_p.vibrationActuator.playEffect("dual-rumble", {
				startDelay: 0,
				duration: dur,
				weakMagnitude: wk || 0.3,
				strongMagnitude: st || 0.6,
			});
		} catch (e) {}
	}
	function connected() {
		return _p !== null;
	}
	return { inject, rumble, connected };
})();

const keys = new Set();
let _canvas = null;

// ═══ INPUT ════════════════════════════════════════════════════════════════
const _touch = { moveX: 0, moveY: 0, firing: false, mega: false };

function initInput(cvs) {
	_canvas = cvs;
	const STOP = new Set([
		"ArrowUp",
		"ArrowDown",
		"ArrowLeft",
		"ArrowRight",
		"Space",
		"KeyW",
		"KeyA",
		"KeyS",
		"KeyD",
	]);

	function onDown(e) {
		keys.add(e.code);
		if (STOP.has(e.code)) e.preventDefault();
		try {
			audio.resume();
		} catch (_) {}
		if (e.code === "KeyP" || e.code === "Escape") {
			e.preventDefault();
			_pauseToggle?.();
		}
	}
	function onUp(e) {
		keys.delete(e.code);
	}

	// Attach to canvas directly — works in iframes when canvas has tabindex
	cvs.addEventListener("keydown", onDown);
	cvs.addEventListener("keyup", onUp);
	cvs.addEventListener("blur", () => keys.clear());

	// Fallback: window (non-capture = no conflict with UI)
	window.addEventListener("keydown", onDown);
	window.addEventListener("keyup", onUp);
	window.addEventListener("blur", () => keys.clear());

	// Keep canvas focused on any interaction
	function grabFocus() {
		try {
			cvs.focus({ preventScroll: true });
		} catch (e) {}
	}
	document.addEventListener("pointerdown", grabFocus, true);
	document.addEventListener("click", grabFocus, true);
	setTimeout(grabFocus, 0);
	setTimeout(grabFocus, 500);

	document.addEventListener("visibilitychange", () => {
		if (document.hidden) keys.clear();
	});

	_initTouch();
}

let _pauseToggle = null; // set after game() callback initializes

// ═══ MENU KEYBOARD / GAMEPAD NAVIGATION ══════════════════════════════════
const menuNav = (() => {
	let _active = false;
	let _items = [];
	let _idx = 0;
	let _prevHeld = false,
		_nextHeld = false,
		_okHeld = false;

	const FOCUS_STYLE =
		"outline: 3px solid #f97316 !important; outline-offset: 3px; transform: scale(1.07); box-shadow: 0 0 14px rgba(249,115,22,0.6) !important;";

	// position:fixed elements always have offsetParent===null — use getBoundingClientRect
	function _isPauseVisible() {
		const ov = document.getElementById("pause-ov");
		if (!ov) return false;
		const r = ov.getBoundingClientRect();
		return r.width > 0 && r.height > 0;
	}

	function _getButtons() {
		if (_isPauseVisible()) {
			const ov = document.getElementById("pause-ov");
			return Array.from(
				ov.querySelectorAll("button:not([disabled])"),
			).filter((b) => {
				const r = b.getBoundingClientRect();
				return r.width > 0 && r.height > 0;
			});
		}
		const uiLayer = document.getElementById("ui-layer");
		if (!uiLayer) return [];
		return Array.from(
			uiLayer.querySelectorAll("button:not([disabled])"),
		).filter((b) => {
			const r = b.getBoundingClientRect();
			return r.width > 0 && r.height > 0;
		});
	}

	function _applyFocus() {
		_items = _getButtons();
		if (!_items.length) return;
		_idx = Math.min(_idx, _items.length - 1);
		_items.forEach((b, i) => {
			if (i === _idx) {
				b.setAttribute("data-mnav-focus", "1");
				b.style.cssText += FOCUS_STYLE;
				b.scrollIntoView({
					block: "nearest",
					behavior: "smooth",
				});
			} else {
				b.removeAttribute("data-mnav-focus");
				b.style.outline = "";
				b.style.outlineOffset = "";
				b.style.transform = "";
				b.style.boxShadow = "";
			}
		});
	}

	function _move(dir) {
		_items = _getButtons();
		if (!_items.length) return;
		_idx = (_idx + dir + _items.length) % _items.length;
		_applyFocus();
	}

	function _confirm() {
		_items = _getButtons();
		const btn = _items[_idx];
		if (btn) btn.click();
	}

	function activate() {
		_active = true;
		_idx = 0;
		setTimeout(_applyFocus, 50);
	}

	// Variante : ré-active la nav sans remettre _idx à 0.
	// Utilisée quand le menu options se re-rend après un clic
	// (difficulté, langue, vibration) pour garder le curseur en place.
	function activateKeepIdx() {
		_active = true;
		// _idx inchangé
		setTimeout(_applyFocus, 50);
	}

	function deactivate() {
		_active = false;
		_items = _getButtons();
		_items.forEach((b) => {
			b.removeAttribute("data-mnav-focus");
			b.style.outline = "";
			b.style.outlineOffset = "";
			b.style.transform = "";
			b.style.boxShadow = "";
		});
	}

	// Navigation clavier
	window.addEventListener("keydown", (e) => {
		const tag = document.activeElement?.tagName;
		if (tag === "INPUT" || tag === "TEXTAREA") return;

		const hasPause = _isPauseVisible();
		const uiLayer = document.getElementById("ui-layer");
		const hasUI =
			uiLayer && uiLayer.innerHTML.trim().length > 0;
		if (!hasPause && !hasUI) return;

		const isNext =
			e.key === "ArrowDown" ||
			e.key === "ArrowRight" ||
			e.key === "s" ||
			e.key === "d";
		const isPrev =
			e.key === "ArrowUp" ||
			e.key === "ArrowLeft" ||
			e.key === "w" ||
			e.key === "a";
		const isOk = e.key === "Enter" || e.key === " ";

		if (isNext || isPrev) {
			e.preventDefault();
			if (!_active) {
				activate();
				return;
			}
			_move(isNext ? 1 : -1);
		} else if (isOk && _active) {
			e.preventDefault();
			_confirm();
		}
	});

	// Navigation gamepad — appelée à chaque frame depuis la boucle de jeu
	function injectGamepadNav(gp) {
		if (!gp) {
			_prevHeld = _nextHeld = _okHeld = false;
			return;
		}

		const hasPause = _isPauseVisible();
		const uiLayer = document.getElementById("ui-layer");
		const hasUI =
			uiLayer && uiLayer.innerHTML.trim().length > 0;
		if (!hasPause && !hasUI) {
			_prevHeld = _nextHeld = _okHeld = false;
			return;
		}

		// Axes: 0=LX, 1=LY | D-pad: 12=haut, 13=bas, 14=gauche, 15=droite
		const prev =
			gp.axes[1] < -0.4 ||
			gp.axes[0] < -0.4 ||
			!!gp.buttons[12]?.pressed ||
			!!gp.buttons[14]?.pressed;
		const next =
			gp.axes[1] > 0.4 ||
			gp.axes[0] > 0.4 ||
			!!gp.buttons[13]?.pressed ||
			!!gp.buttons[15]?.pressed;
		const ok =
			!!gp.buttons[0]?.pressed || !!gp.buttons[1]?.pressed;

		if ((prev || next) && !_active) activate();

		if (prev && !_prevHeld) {
			_prevHeld = true;
			_move(-1);
		} else if (!prev) _prevHeld = false;

		if (next && !_nextHeld) {
			_nextHeld = true;
			_move(1);
		} else if (!next) _nextHeld = false;

		if (ok && !_okHeld) {
			_okHeld = true;
			_confirm();
		} else if (!ok) _okHeld = false;
	}

	return {
		activate,
		activateKeepIdx,
		deactivate,
		injectGamepadNav,
	};
})();

// Exposé par _initTouch — permet à _showTouchLayer de forcer joyId=null
// quand le layer est caché en cours de toucher (mort du joueur, pause…)
let _joyReset = null;

function _initTouch() {
	const zone = document.getElementById("joy-zone");
	const ring = document.getElementById("joy-ring");
	const dot = document.getElementById("joy-dot");
	const firBtn = document.getElementById("btn-fire");
	const megBtn = document.getElementById("btn-mega");

	// Positionner ring/dot en (0,0), déplacement via transform
	[ring, dot].forEach((el) => {
		if (!el) return;
		el.style.left = "0";
		el.style.top = "0";
		el.style.transform = "translate(-50%,-50%)";
		el.style.willChange = "transform";
		el.style.display = "none";
	});

	let joyId = null,
		jOX = 0,
		jOY = 0;
	const R = 70;
	let _raf = false,
		_dotX = 0,
		_dotY = 0;

	// Libère l'état joystick depuis l'extérieur de la closure
	_joyReset = function () {
		joyId = null;
		_touch.moveX = _touch.moveY = 0;
		_touch.firing = false;
		_touch.mega = false;
		if (ring) ring.style.display = "none";
		if (dot) dot.style.display = "none";
	};

	function _flush() {
		_raf = false;
		if (ring)
			ring.style.transform = `translate(${jOX}px,${jOY}px) translate(-50%,-50%)`;
		if (dot)
			dot.style.transform = `translate(${_dotX}px,${_dotY}px) translate(-50%,-50%)`;
	}

	function jStart(e) {
		e.preventDefault();
		if (joyId !== null) return; // un toucher est déjà actif, ignorer
		const t = e.changedTouches[0];
		joyId = t.identifier;
		jOX = _dotX = t.clientX;
		jOY = _dotY = t.clientY;
		if (ring) ring.style.display = "block";
		if (dot) dot.style.display = "block";
		if (!_raf) {
			_raf = true;
			requestAnimationFrame(_flush);
		}
	}
	function jMove(e) {
		e.preventDefault();
		for (const t of e.changedTouches) {
			if (t.identifier !== joyId) continue;

			let dx = t.clientX - jOX;
			let dy = t.clientY - jOY;
			let dist = Math.hypot(dx, dy);
			let a = Math.atan2(dy, dx);

			// --- LE SECRET DU JOYSTICK FLOTTANT ---
			// Si le joueur tire le pouce au-delà du rayon max (R),
			// on déplace le centre du joystick (jOX, jOY) pour qu'il suive le doigt.
			if (dist > R) {
				jOX = t.clientX - Math.cos(a) * R;
				jOY = t.clientY - Math.sin(a) * R;
				dist = R; // On bride la distance pour le calcul de vitesse
			}

			_touch.moveX = (dist / R) * Math.cos(a);
			_touch.moveY = (dist / R) * Math.sin(a);

			_dotX = jOX + Math.cos(a) * dist;
			_dotY = jOY + Math.sin(a) * dist;

			if (!_raf) {
				_raf = true;
				requestAnimationFrame(_flush);
			}
		}
	}
	function _releaseJoy() {
		joyId = null;
		_touch.moveX = _touch.moveY = 0;
		if (ring) ring.style.display = "none";
		if (dot) dot.style.display = "none";
	}
	function jEnd(e) {
		e.preventDefault();
		for (const t of e.changedTouches) {
			if (t.identifier !== joyId) continue;
			_releaseJoy();
		}
	}

	// Capturer les touchend/cancel globaux : si le doigt quitte joy-zone
	// et est relâché ailleurs (sur un autre élément), le touchend local
	// ne se déclenche pas → joyId reste bloqué indéfiniment.
	document.addEventListener(
		"touchend",
		function (e) {
			if (joyId === null) return;
			for (const t of e.changedTouches)
				if (t.identifier === joyId) {
					_releaseJoy();
					break;
				}
		},
		{ passive: true },
	);
	document.addEventListener(
		"touchcancel",
		function (e) {
			if (joyId === null) return;
			for (const t of e.changedTouches)
				if (t.identifier === joyId) {
					_releaseJoy();
					break;
				}
		},
		{ passive: true },
	);

	if (zone) {
		zone.addEventListener("touchstart", jStart, {
			passive: false,
		});
		zone.addEventListener("touchmove", jMove, {
			passive: false,
		});
		zone.addEventListener("touchend", jEnd, { passive: false });
		zone.addEventListener("touchcancel", jEnd, {
			passive: false,
		});
	}

	// Boutons fire / mega
	function _bindBtn(el, flag) {
		if (!el) return;
		const on = (e) => {
			e.preventDefault();
			e.stopPropagation();
			_touch[flag] = true;
		};
		const off = (e) => {
			e.preventDefault();
			e.stopPropagation();
			_touch[flag] = false;
		};

		// Événements tactiles natifs (Priorité mobile)
		el.addEventListener("touchstart", on, { passive: false });
		el.addEventListener("touchend", off, { passive: false });
		el.addEventListener("touchcancel", off, { passive: false });

		// Fallback PC / DevTools (Remplace pointer* par mouse* pour éviter le bug de glissement)
		el.addEventListener("mousedown", on, { passive: false });
		el.addEventListener("mouseup", off, { passive: false });
		el.addEventListener("mouseleave", off, { passive: false });
	}
	_bindBtn(firBtn, "firing");
	_bindBtn(megBtn, "mega");
}

function _showTouchLayer(show) {
	const hasTouch =
		navigator.maxTouchPoints > 0 || "ontouchstart" in window;

	// Les contrôles sont directement dans body (pas enfants de touch-layer)
	// ce qui contourne le bug Safari iOS pointer-events:none inheritance.
	const zone = document.getElementById("joy-zone");
	const btnFire = document.getElementById("btn-fire");
	const btnMega = document.getElementById("btn-mega");

	if (show && hasTouch) {
		if (zone) zone.style.display = "block";
		if (btnFire) btnFire.style.display = "flex";
		if (btnMega) btnMega.style.display = "flex";
	} else {
		// Réinitialiser joyId AVANT de cacher : si un toucher est actif
		// pendant la mort du joueur ou une pause, joyId doit être forcé à
		// null maintenant — sinon les prochains touchend n'auront pas
		// l'identifier correspondant et le joystick restera bloqué.
		if (typeof _joyReset === "function") _joyReset();
		if (zone) zone.style.display = "none";
		if (btnFire) btnFire.style.display = "none";
		if (btnMega) btnMega.style.display = "none";
	}
}
function _showPauseBtn(show) {
	const b = document.getElementById("pause-btn");
	if (b) {
		if (show) b.classList.add("active");
		else b.classList.remove("active");
	}
}
function _setPauseIcon(paused) {
	const ico = document.getElementById("pause-ico");
	if (ico)
		ico.innerHTML = paused
			? '<polygon points="5,3 19,12 5,21"/>'
			: '<rect x="5" y="4" width="4" height="16"/><rect x="15" y="4" width="4" height="16"/>';
}

function isKeyDown(code) {
	return keys.has(code);
}

function getKeys() {
	return keys;
}

const SHOOT_COOLDOWN = 0.18;
const SPEED = 200;
const INVINCIBLE_TIME = 2.0;

function createPlayer(width, height) {
	const p = {
		x: 80,
		y: height / 2,
		w: 36,
		h: 28,
		speed: SPEED,
		hp: 3,
		invincible: false,
		invincibleTimer: 0,
		permanentShield: false,
		shootTimer: 0,
		fireLevel: 1, // 1-5
		hasShield: false,
		shieldTimer: 0,
		hasHoming: false,
		homingTimer: 0,
		speedBoost: false,
		speedTimer: 0,
		megaReady: false,
		shootRateBoost: false,
		shootRateTimer: 0,
		thrustAnim: 0,
		width,
		height,
		// Touch/pointer aim
		touchAimY: null,

		reset() {
			this.fireLevel = 1;
			this.hasShield = false;
			this.hasHoming = false;
			this.speedBoost = false;
			this.megaReady = false;
			this.shootRateBoost = false;
			this.shootRateTimer = 0;
			this.hp = 3;
			this.invincible = false;
			this.invincibleTimer = 0;
			this.permanentShield = false;
			this.x = 80;
			this.y = this.height / 2;
		},

		resetPosition(w, h) {
			this.x = 80;
			this.y = h / 2;
		},

		respawn() {
			this.invincible = true;
			this.invincibleTimer = INVINCIBLE_TIME;
			this.x = 80;
			this.y = this.height / 2;
		},

		hitbox() {
			return {
				x: this.x - this.w * 0.35,
				y: this.y - this.h * 0.3,
				w: this.w * 0.7,
				h: this.h * 0.6,
			};
		},

		applyPowerUp(type, state) {
			switch (type) {
				case "fire":
					this.fireLevel = Math.min(
						this.fireLevel + 1,
						5,
					);
					break;
				case "shield":
					this.hasShield = true;
					// Ne pas réduire si le bouclier permanent (Infinity) est actif
					if (!this.permanentShield) {
						this.shieldTimer = 8.0;
						this.invincible = true;
						this.invincibleTimer = 8.0;
					}
					break;
				case "homing":
					this.hasHoming = true;
					// Ne pas réduire si l'amélioration (45s) est encore active
					if (this.homingTimer < 10.0) {
						this.homingTimer = 10.0;
					}
					break;
				case "speed":
					this.speedBoost = true;
					this.speedTimer = 7.0;
					break;
				case "mega":
					this.megaReady = true;
					break;
				case "life":
					state.lives = Math.min(state.lives + 1, 5);
					break;
			}
		},

		update(dt, w, h, isKeyDown, bullets, particles, level) {
			this.thrustAnim += dt * 8;

			// Invincibility
			if (!this.permanentShield) {
				if (this.invincible) {
					this.invincibleTimer -= dt;
					if (this.invincibleTimer <= 0) {
						this.invincible = false;
						this.hasShield = false;
					}
				}
				if (this.hasShield) {
					this.shieldTimer -= dt;
					if (this.shieldTimer <= 0) {
						this.hasShield = false;
						this.invincible = false;
					}
				}
			}
			if (this.hasHoming) {
				this.homingTimer -= dt;
				if (this.homingTimer <= 0) this.hasHoming = false;
			}
			if (this.shootRateBoost) {
				this.shootRateTimer -= dt;
				if (this.shootRateTimer <= 0)
					this.shootRateBoost = false;
			}
			if (this.speedBoost) {
				this.speedTimer -= dt;
				if (this.speedTimer <= 0) this.speedBoost = false;
			}

			const spd = this.speedBoost
				? this.speed * 1.6
				: this.speed;

			// Movement
			// Keyboard + touch joystick movement
			let _dx = 0,
				_dy = 0;

			if (isKeyDown("left")) _dx -= 1;
			if (isKeyDown("right")) _dx += 1;
			if (isKeyDown("up")) _dy -= 1;
			if (isKeyDown("down")) _dy += 1;

			_dx += _touch.moveX;
			_dy += _touch.moveY;
			if (_dx !== 0 && _dy !== 0) {
				const _l = Math.hypot(_dx, _dy);
				_dx /= _l;
				_dy /= _l;
			}
			this.x += _dx * spd * dt;
			this.y += _dy * spd * dt;

			this.x = Math.max(
				this.w / 2,
				Math.min(w - this.w / 2, this.x),
			);
			this.y = Math.max(
				this.h / 2 + 40,
				Math.min(h - this.h / 2 - 30, this.y),
			);

			// Shooting
			this.shootTimer -= dt;
			const firing = isKeyDown("shoot") || _touch.firing;
			if (firing && this.shootTimer <= 0) {
				this.shootTimer =
					SHOOT_COOLDOWN /
					(this.fireLevel >= 4 ? 1.4 : 1) /
					(this.shootRateBoost ? 1.5 : 1);
				this._fire(bullets, w, h);
			}

			// Mega blast
			if (
				(isKeyDown("mega") || _touch.mega) &&
				this.megaReady
			) {
				_touch.mega = false;
				this.megaReady = false;
				this._megaBlast(bullets, particles, w, h);
			}

			// Thruster particles — couleur selon le bg du niveau
			if (Math.random() < 0.6) {
				const levelColors = [
					["#ff8800", "#ff4400", "#ffcc44", "#ffffff"], // 0 Volcanic Rift  rouge-orange
					["#cc44ff", "#8800cc", "#ee88ff", "#ffffff"], // 1 Inferno Depths violet
					["#ff2200", "#cc0000", "#ff6644", "#ffffff"], // 2 Solar Core     rouge
					["#44ff44", "#00cc00", "#aaffaa", "#ffffff"], // 3 Toxic Nebula   vert
					["#44aaff", "#0066ff", "#aaddff", "#ffffff"], // 4 Crystal Abyss  bleu
					["#cc44ff", "#8800ff", "#dd88ff", "#ffffff"], // 5 Phantom Void   violet
				];
				const _rageNow =
					typeof state !== "undefined" && state.rageMode;
				const tc = _rageNow
					? {
							c0: "#ffffff",
							c1: "#ffcccc",
							c2: "#ff4444",
						}
					: levelColors[level] || levelColors[0];
				particles.add({
					x: this.x - this.w * 0.5,
					y: this.y + (Math.random() - 0.5) * 8,
					vx: -120 - Math.random() * 60,
					vy: (Math.random() - 0.5) * 30,
					life: 0.3 + Math.random() * 0.2,
					maxLife: 0.5,
					r: 4 + Math.random() * 4,
					colors: tc,
					type: "spark",
				});
			}
		},

		_fire(bullets, w, h) {
			const lvl = this.fireLevel;
			const homing = this.hasHoming;

			// Level 1: single
			// Level 2: double
			// Level 3: triple spread
			// Level 4: quad
			// Level 5: 5-way spread

			const patterns = {
				1: [{ dy: 0, angle: 0 }],
				2: [
					{ dy: -6, angle: 0 },
					{ dy: 6, angle: 0 },
				],
				3: [
					{ dy: 0, angle: 0 },
					{ dy: -10, angle: -0.12 },
					{ dy: 10, angle: 0.12 },
				],
				4: [
					{ dy: -9, angle: -0.05 },
					{ dy: -3, angle: 0 },
					{ dy: 3, angle: 0 },
					{ dy: 9, angle: 0.05 },
				],
				5: [
					{ dy: 0, angle: 0 },
					{ dy: -10, angle: -0.18 },
					{ dy: 10, angle: 0.18 },
					{ dy: -16, angle: -0.32 },
					{ dy: 16, angle: 0.32 },
				],
			};

			const shots = patterns[lvl] || patterns[1];
			for (const s of shots) {
				const spd = 520;
				bullets.addPlayer({
					x: this.x + this.w * 0.4,
					y: this.y + s.dy,
					vx: Math.cos(s.angle) * spd,
					vy: Math.sin(s.angle) * spd,
					w: 14,
					h: 5,
					dmg: 1 + Math.floor(lvl / 2),
					homing,
					color: homing ? "#ff88ff" : "#ff9900",
					glowColor: homing ? "#cc44cc" : "#ff5500",
				});
			}
			if (homing) audio.sfx.shootHoming();
			else audio.sfx.shoot();
			{
				const _as = achStats.get();
				_as.totalShots = (_as.totalShots || 0) + 1;
				_as.maxFireLevel = Math.max(
					_as.maxFireLevel || 0,
					this.fireLevel,
				);
				achStats.save();
			}
		},

		_megaBlast(bullets, particles, w, h) {
			audio.sfx.megaBlast();
			{
				const _as = achStats.get();
				_as.megaUsed = (_as.megaUsed || 0) + 1;
				achStats.save();
			}
			for (let i = 0; i < 16; i++) {
				const angle = (i / 16) * Math.PI * 2;
				bullets.addPlayer({
					x: this.x,
					y: this.y,
					vx: Math.cos(angle) * 400,
					vy: Math.sin(angle) * 400,
					w: 16,
					h: 16,
					dmg: 4,
					color: "#ff4400",
					glowColor: "#ff0000",
					isMega: true,
				});
			}
			for (let i = 0; i < 50; i++) {
				const angle = Math.random() * Math.PI * 2;
				const spd = 100 + Math.random() * 300;
				particles.add({
					x: this.x,
					y: this.y,
					vx: Math.cos(angle) * spd,
					vy: Math.sin(angle) * spd,
					life: 0.6 + Math.random() * 0.5,
					maxLife: 1.1,
					r: 6 + Math.random() * 8,
					colors: [
						"#ff0000",
						"#ff6600",
						"#ffaa00",
						"#ffff00",
					],
					type: "explosion",
				});
			}
		},
	};
	return p;
}

let _spawnedGroups = new Set();

let _currentLevel = 0; // shared with _spawnGroup for corruption
function createEnemyManager() {
	const mgr = {
		list: [],
		_spawnedGroups: new Set(),
		_shootTimers: new Map(),

		reset() {
			this.list = [];
			this._spawnedGroups = new Set();
			this._shootTimers = new Map();
		},

		// Marquer un groupe comme déjà spawné (utilisé au resume)
		_updateInterceptor(e, dt, width, height) {
			if (e.phase === "charge") {
				e.x -= e.speed * dt;
				// Steer toward player Y (tracked by playerRef)
				const py =
					typeof _playerY !== "undefined"
						? _playerY
						: height / 2;
				const dy = py - e.y;
				e.y +=
					Math.sign(dy) *
					Math.min(Math.abs(dy), 200 * dt);
				if (e.x < width * 0.3) {
					e.phase = "retreat";
					e.retreatTimer = 0.8;
				}
			} else {
				e.retreatTimer -= dt;
				e.x += e.speed * 1.6 * dt;
				if (e.retreatTimer <= 0) {
					e.phase = "charge";
					if (e.x > width + 40) e.x = width + 40;
				}
				if (e.x > width + 80) e.dead = true;
			}
			e.y = Math.max(50, Math.min(height - 50, e.y));
		},

		_updateCarrier(e, dt, width, height, mgr) {
			e.x -= e.speed * dt;
			e.spawnTimer -= dt;
			if (e.spawnTimer <= 0 && e.spawned < 6) {
				e.spawnTimer = 2.5;
				e.spawned++;
				// Spawn a drone from the carrier
				mgr.list.push(
					mgr._createEnemy(
						"drone",
						e.x - 20,
						e.y + (Math.random() - 0.5) * 30,
						0,
					),
				);
			}
			if (e.x < -80) e.dead = true;
		},

		markSpawned(key) {
			this._spawnedGroups.add(key);
		},

		update(dt, lvlData, levelTime, width, height, level) {
			// Check for group spawns
			for (const group of lvlData.enemyGroups) {
				const key = `${group.time}_${group.type}`;
				if (
					!this._spawnedGroups.has(key) &&
					levelTime >= group.time
				) {
					this._spawnedGroups.add(key);
					this._spawnGroup(group, width, height, level);
				}
			}

			// Update each enemy
			for (const e of this.list) {
				if (e.dead) continue;
				e.timer = (e.timer || 0) + dt;
				e.animT = (e.animT || 0) + dt;
				// Corruption zigzag behaviour
				if (e.corrupted && e.zigzag) {
					e.y =
						e.baseY +
						Math.sin(e.animT * e.zigzagFreq) *
							e.zigzagAmp;
				}

				switch (e.type) {
					case "drone":
						this._updateDrone(e, dt, width, height);
						break;
					case "turret":
						this._updateTurret(e, dt, width, height);
						break;
					case "kamikaze":
						this._updateKamikaze(e, dt, width, height);
						break;
					case "interceptor":
						this._updateInterceptor(
							e,
							dt,
							width,
							height,
						);
						break;
					case "carrier":
						this._updateCarrier(
							e,
							dt,
							width,
							height,
							this,
						);
						break;
					case "shielder":
						e.x -= e.speed * dt;
						e.y =
							e.baseY + Math.sin(e.animT * 1.2) * 18;
						break;
				}

				if (e.x < -80) e.dead = true;
			}
		},

		_spawnGroup(group, width, height, level) {
			_currentLevel = level || 0; // used by _createEnemy for corruption
			const margin = 40;
			const positions = [];

			switch (group.formation) {
				case "line-v":
					for (let i = 0; i < group.count; i++) {
						positions.push({
							x: width + margin + i * 30,
							y:
								height *
								(0.2 +
									(i * 0.6) /
										Math.max(
											group.count - 1,
											1,
										)),
						});
					}
					break;
				case "wave":
					for (let i = 0; i < group.count; i++) {
						positions.push({
							x: width + margin + i * 40,
							y:
								height * 0.2 +
								(i % 2) * height * 0.5,
						});
					}
					break;
				case "v-shape":
					for (let i = 0; i < group.count; i++) {
						const half = Math.floor(group.count / 2);
						const row =
							i < half ? i : group.count - 1 - i;
						positions.push({
							x: width + margin + i * 35,
							y:
								height / 2 -
								row * 28 +
								(i >= half ? row * 56 : 0),
						});
					}
					break;
				case "top-bottom":
					for (let i = 0; i < group.count; i++) {
						positions.push({
							x:
								width +
								margin +
								Math.floor(i / 2) * 50,
							y:
								i % 2 === 0
									? height * 0.15
									: height * 0.85,
						});
					}
					break;
				case "spread":
					for (let i = 0; i < group.count; i++) {
						positions.push({
							x: width + margin,
							y:
								height *
								(0.1 +
									(i / (group.count - 1 || 1)) *
										0.8),
						});
					}
					break;
				case "random":
				default:
					for (let i = 0; i < group.count; i++) {
						positions.push({
							x: width + margin + Math.random() * 100,
							y: height * (0.1 + Math.random() * 0.8),
						});
					}
			}

			for (let i = 0; i < group.count; i++) {
				const pos = positions[i] || positions[0];
				const e = this._createEnemy(
					group.type,
					pos.x,
					pos.y,
					i,
				);
				// Corruption progressive : niveau >= 3 ET spawn tardif
				if (
					typeof _currentLevel !== "undefined" &&
					_currentLevel >= 3
				) {
					const corruptChance =
						0.25 + (_currentLevel - 3) * 0.12;
					if (Math.random() < corruptChance) {
						e.corrupted = true;
						e.corruptLevel = _currentLevel;
						e.hp = Math.ceil(e.hp * 1.25);
						e.w = Math.ceil(e.w * 1.15);
						e.h = Math.ceil(e.h * 1.15);
						e.score = Math.ceil(e.score * 1.5);
						e.zigzag = Math.random() < 0.5; // comportement zigzag
						e.zigzagAmp = 18 + Math.random() * 18;
						e.zigzagFreq = 2.5 + Math.random() * 2;
					}
				}
				this.list.push(e);
			}
		},

		_createEnemy(type, x, y, idx) {
			const base = {
				type,
				x,
				y,
				dead: false,
				timer: 0,
				animT: 0,
				shootTimer: Math.random() * 2,
			};
			const _dm =
				settings.difficulty === "easy"
					? 0.7
					: settings.difficulty === "hard"
						? 1.5
						: 1;
			switch (type) {
				case "drone":
					return {
						...base,
						w: 32,
						h: 22,
						hp: Math.ceil(2 * _dm),
						score: 100,
						speed: 90 + Math.random() * 40,
						color: "#cc3300",
						movePattern: idx % 3,
						baseY: y,
					};
				case "turret":
					return {
						...base,
						w: 28,
						h: 28,
						hp: Math.ceil(4 * _dm),
						score: 200,
						speed: 55,
						color: "#445566",
						movePattern: "steady",
						baseY: y,
					};
				case "kamikaze":
					return {
						...base,
						w: 22,
						h: 20,
						hp: Math.ceil(1 * _dm),
						score: 150,
						speed: 160 + Math.random() * 60,
						color: "#ff4400",
						movePattern: "charge",
						baseY: y,
						diveTimer: 0.5 + Math.random(),
					};
				case "interceptor":
					return {
						...base,
						w: 28,
						h: 20,
						hp: Math.ceil(3 * _dm),
						score: 250,
						speed: 200 + Math.random() * 80,
						color: "#0088ff",
						movePattern: "intercept",
						baseY: y,
						phase: "charge", // "charge" → "retreat" → "charge"
						retreatTimer: 0,
					};
				case "carrier":
					return {
						...base,
						w: 55,
						h: 38,
						hp: Math.ceil(12 * _dm),
						_maxHp: Math.ceil(12 * _dm),
						score: 500,
						speed: 45,
						color: "#aa5500",
						movePattern: "steady",
						baseY: y,
						spawnTimer: 3 + Math.random() * 2,
						spawned: 0,
					};
				case "shielder":
					return {
						...base,
						w: 38,
						h: 30,
						hp: Math.ceil(8 * _dm),
						score: 400,
						speed: 50,
						color: "#0066cc",
						movePattern: "steady",
						baseY: y,
						shieldActive: true,
						shieldRadius: 55, // protège les alliés dans ce rayon
					};
			}
			return base;
		},

		_updateDrone(e, dt, width, height) {
			e.x -= e.speed * dt;
			const wobble =
				Math.sin(e.animT * 2 + e.movePattern) * 30;
			e.y = e.baseY + wobble;
			e.y = Math.max(50, Math.min(height - 50, e.y));

			// Shoot
			e.shootTimer -= dt;
			if (e.shootTimer <= 0) {
				e.shootTimer = 1.8 + Math.random() * 1.5;
				this._shootAt(e, width * 0.3, height / 2, 200);
			}
		},

		_updateTurret(e, dt, width, height) {
			e.x -= e.speed * dt;
			e.y += Math.sin(e.animT * 1.5) * 20 * dt;
			e.y = Math.max(50, Math.min(height - 50, e.y));

			e.shootTimer -= dt;
			if (e.shootTimer <= 0) {
				e.shootTimer = 1.2 + Math.random() * 0.8;
				// Spread shot
				for (let i = -1; i <= 1; i++) {
					const angle = Math.PI + i * 0.25;
					this._shootBullet(
						e.x,
						e.y,
						Math.cos(angle) * 240,
						Math.sin(angle) * 240,
						"#ff4400",
						8,
						8,
					);
				}
			}
		},

		_updateKamikaze(e, dt, width, height) {
			e.diveTimer -= dt;
			if (e.diveTimer > 0) {
				e.x -= 40 * dt; // slow approach
			} else {
				// Charge!
				e.x -= e.speed * dt;
				e.y += Math.sin(e.animT * 4) * 60 * dt;
			}
		},

		_shootAt(e, tx, ty, spd) {
			const dx = tx - e.x,
				dy = ty - e.y;
			const dist = Math.sqrt(dx * dx + dy * dy) || 1;
			this._shootBullet(
				e.x,
				e.y,
				(dx / dist) * spd,
				(dy / dist) * spd,
				"#ff6633",
				8,
				8,
			);
		},

		_shootBullet(x, y, vx, vy, color, w, h) {
			// Store bullets to be added to bullet manager - they come from main
			// We expose them here
			if (!this._pendingBullets) this._pendingBullets = [];
			this._pendingBullets.push({
				x,
				y,
				vx,
				vy,
				color,
				w,
				h,
			});
		},

		cleanup() {
			this.list = this.list.filter(
				(e) => !e.dead && e.x > -100,
			);
		},

		drainPendingBullets() {
			const pb = this._pendingBullets || [];
			this._pendingBullets = [];
			return pb;
		},
	};
	return mgr;
}

function createBulletManager() {
	return {
		playerBullets: [],
		enemyBullets: [],

		addPlayer(b) {
			b.dead = false;
			this.playerBullets.push(b);
		},

		addEnemy(b) {
			b.dead = false;
			b.w = b.w || 8;
			b.h = b.h || 8;
			this.enemyBullets.push(b);
		},

		update(dt, width, height, enemyList, bossRef) {
			for (const b of this.playerBullets) {
				if (b.dead) continue;

				// ── Homing guidance ──────────────────────────────────────────
				if (b.homing) {
					// Find nearest alive target (enemies first, then boss)
					let bestDist = Infinity;
					let tx = null,
						ty = null;

					// Scan enemies
					if (enemyList) {
						for (const e of enemyList) {
							if (e.dead) continue;
							const dx = e.x - b.x;
							const dy = e.y - b.y;
							// Only home toward targets ahead of the bullet (dx > 0)
							if (dx < -20) continue;
							const dist = dx * dx + dy * dy;
							if (dist < bestDist) {
								bestDist = dist;
								tx = e.x;
								ty = e.y;
							}
						}
					}

					// Boss is a valid target too
					if (bossRef && bossRef.active) {
						const dx = bossRef.x - b.x;
						const dy = bossRef.y - b.y;
						const dist = dx * dx + dy * dy;
						if (dist < bestDist) {
							bestDist = dist;
							tx = bossRef.x;
							ty = bossRef.y;
						}
					}

					// Steer toward target if found (within 400px)
					if (tx !== null && bestDist < 400 * 400) {
						const dx = tx - b.x;
						const dy = ty - b.y;
						const len =
							Math.sqrt(dx * dx + dy * dy) || 1;
						// Desired velocity (unit vector × bullet speed)
						const spd = Math.sqrt(
							b.vx * b.vx + b.vy * b.vy,
						);
						const desiredVx = (dx / len) * spd;
						const desiredVy = (dy / len) * spd;
						// Smoothly turn toward target — turn rate 6 rad/s
						const turnRate = 6;
						b.vx += (desiredVx - b.vx) * turnRate * dt;
						b.vy += (desiredVy - b.vy) * turnRate * dt;
						// Preserve speed after steering
						const newSpd =
							Math.sqrt(b.vx * b.vx + b.vy * b.vy) ||
							1;
						b.vx = (b.vx / newSpd) * spd;
						b.vy = (b.vy / newSpd) * spd;
					}
				}

				b.x += b.vx * dt;
				b.y += b.vy * dt;
				if (
					b.x > width + 30 ||
					b.x < -30 ||
					b.y < -30 ||
					b.y > height + 30
				)
					b.dead = true;
			}
			for (const b of this.enemyBullets) {
				if (b.dead) continue;
				b.x += b.vx * dt;
				b.y += b.vy * dt;
				if (
					b.x < -30 ||
					b.x > width + 30 ||
					b.y < -30 ||
					b.y > height + 30
				)
					b.dead = true;
			}
		},

		cleanup() {
			this.playerBullets = this.playerBullets.filter(
				(b) => !b.dead,
			);
			this.enemyBullets = this.enemyBullets.filter(
				(b) => !b.dead,
			);
		},

		reset() {
			this.playerBullets = [];
			this.enemyBullets = [];
		},
	};
}

function createParticleSystem() {
	return {
		list: [],

		add(p) {
			p.dead = false;
			this.list.push(p);
		},

		burst(x, y, color, count, type) {
			for (let i = 0; i < count; i++) {
				const angle = Math.random() * Math.PI * 2;
				const spd =
					type === "explosion"
						? 60 + Math.random() * 180
						: type === "spark"
							? 80 + Math.random() * 250
							: 30 + Math.random() * 80;
				this.add({
					x,
					y,
					vx: Math.cos(angle) * spd,
					vy: Math.sin(angle) * spd,
					life: 0.3 + Math.random() * 0.6,
					maxLife: 0.9,
					r:
						type === "explosion"
							? 3 + Math.random() * 6
							: 2 + Math.random() * 4,
					colors:
						typeof color === "string"
							? [color, "#ffaa44", "#ffffff"]
							: color,
					type,
				});
			}
		},

		update(dt) {
			for (const p of this.list) {
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.vx *= 0.95;
				p.vy *= 0.95;
				p.life -= dt;
				if (p.life <= 0) p.dead = true;
			}
			this.list = this.list.filter((p) => !p.dead);
		},

		reset() {
			this.list = [];
		},
	};
}

const TYPES = [
	{
		type: "fire",
		label: "🔥 FIREPOWER",
		color: "#ff6600",
		w: 22,
		h: 22,
	},
	{
		type: "homing",
		label: "🎯 HOMING",
		color: "#ff44ff",
		w: 22,
		h: 22,
	},
	{
		type: "shield",
		label: "🛡 SHIELD",
		color: "#4488ff",
		w: 22,
		h: 22,
	},
	{
		type: "speed",
		label: "⚡ SPEED",
		color: "#ffff00",
		w: 22,
		h: 22,
	},
	{
		type: "mega",
		label: "💥 MEGA BLAST",
		color: "#ff2200",
		w: 22,
		h: 22,
	},
	{
		type: "life",
		label: "❤️ EXTRA LIFE",
		color: "#ff0044",
		w: 22,
		h: 22,
	},
];

function createPowerUpManager() {
	return {
		list: [],

		spawn(x, y) {
			const t =
				TYPES[Math.floor(Math.random() * TYPES.length)];
			this.list.push({
				...t,
				x,
				y,
				vx: -70,
				vy: (Math.random() - 0.5) * 60,
				collected: false,
				animT: 0,
			});
		},

		update(dt, width, height) {
			for (const p of this.list) {
				if (p.collected) continue;
				p.x += p.vx * dt;
				p.y += p.vy * dt;
				p.animT += dt;
				if (p.y < 30) p.vy = Math.abs(p.vy);
				if (p.y > height - 30) p.vy = -Math.abs(p.vy);
			}
		},

		cleanup() {
			this.list = this.list.filter(
				(p) => !p.collected && p.x > -60,
			);
		},

		reset() {
			this.list = [];
		},
	};
}

function createBossManager() {
	const mgr = {
		active: false,
		x: 0,
		y: 0,
		w: 0,
		h: 0,
		hp: 0,
		maxHp: 0,
		type: "",
		name: "",
		color: "#cc0000",
		coreColor: "#ff6600",
		timer: 0,
		phase: 0,
		animT: 0,
		shootTimer: 0,
		patternTimer: 0,
		patternIndex: 0,
		eyeAngle: 0,
		_pendingBullets: [],

		reset() {
			this.active = false;
			this._pendingBullets = [];
		},

		spawn(bossData, width, height) {
			this.active = true;
			this.x = width - bossData.w / 2 - 20;
			this.y = height / 2;
			this.w = bossData.w;
			this.h = bossData.h;
			this.hp = bossData.hp;
			this.maxHp = bossData.hp;
			this.type = bossData.type;
			this.name = bossData.name;
			this.color = bossData.color;
			this.coreColor = bossData.coreColor;
			this.timer = 0;
			this.phase = 0;
			this.animT = 0;
			this.shootTimer = 0;
			this.patternTimer = 0;
			this.patternIndex = 0;
			this.eyeAngle = 0;
			this.entryDone = false;
			this.targetX = width * 0.72;
		},

		hitbox() {
			return {
				x: this.x - this.w * 0.4,
				y: this.y - this.h * 0.4,
				w: this.w * 0.8,
				h: this.h * 0.8,
			};
		},

		takeDamage(dmg) {
			this.hp = Math.max(0, this.hp - dmg);
			this.flashTimer = 0.08;
		},

		isDead() {
			return this.active && this.hp <= 0;
		},

		update(dt, width, height, bullets, particles, state) {
			if (!this.active) return;
			this.animT += dt;
			this.timer += dt;
			this.eyeAngle += dt * 1.5;
			if (this.flashTimer > 0) this.flashTimer -= dt;

			// Entry slide
			if (!this.entryDone) {
				this.x += (this.targetX - this.x) * dt * 3;
				if (Math.abs(this.x - this.targetX) < 2) {
					this.x = this.targetX;
					this.entryDone = true;
				}
				return;
			}

			// Phase transitions based on HP — with visual flash
			const hpFrac = this.hp / this.maxHp;
			// Phase transitions — uniquement après que le boss est entré + HP touchés réellement
			if (this.entryDone && this.hp < this.maxHp) {
				if (hpFrac < 0.33 && this.phase < 2) {
					this.phase = 2;
					this._phaseFlash = 1.5;
					this.patternTimer = 0;
					this.shootTimer = 0;
					this._phaseMsg = "⚠️ " + ((settings.lang === "fr") ? "PHASE FINALE !" : "FINAL PHASE !");
					this._phaseMsgTimer = 2.5;
				} else if (hpFrac < 0.5 && this.phase < 1) {
					this.phase = 1;
					this._phaseFlash = 1.0;
					this.patternTimer = 0;
					this._phaseMsg = "⚡ " + ((settings.lang === "fr") ? "ENRAGÉ !" : "ENRAGED !");
					this._phaseMsgTimer = 2.0;
				}
			}
			if (this._phaseMsgTimer > 0) {
				this._phaseMsgTimer -= dt;
			}
			if (this._phaseFlash > 0) this._phaseFlash -= dt;

			const speedMul = 1 + this.phase * 0.5;

			// Phase 2+: boss rushes horizontally toward player
			if (this.phase >= 1 && state) {
				const playerX = state.playerX || width * 0.2;
				const targetX = Math.max(
					width * 0.55,
					Math.min(width * 0.82, playerX + 200),
				);
				this.x +=
					(targetX - this.x) *
					dt *
					(0.4 + this.phase * 0.3);
			}

			// Move pattern
			const moveAmp = 80 + this.phase * 30;
			this.y =
				height / 2 +
				Math.sin(this.animT * (0.8 + this.phase * 0.3)) *
					moveAmp;
			this.y = Math.max(
				this.h / 2 + 20,
				Math.min(height - this.h / 2 - 20, this.y),
			);

			this.shootTimer -= dt;
			this.patternTimer -= dt;

			if (this.patternTimer <= 0) {
				this.patternIndex = (this.patternIndex + 1) % 4;
				this.patternTimer = 2.5 - this.phase * 0.5;
			}

			if (this.shootTimer <= 0) {
				const baseRate = 0.7 - this.phase * 0.15;
				this.shootTimer = Math.max(0.25, baseRate);
				this._firePattern(speedMul, width, height);
			}

			// Drain pending to bullet manager
			for (const b of this._pendingBullets) {
				bullets.addEnemy(b);
			}
			this._pendingBullets = [];
		},

		_firePattern(speedMul, width, height) {
			const cx = this.x - this.w * 0.4;
			const cy = this.y;
			const s = 220 * speedMul;

			switch (this.patternIndex) {
				case 0: // Straight volley
					for (let i = -2; i <= 2; i++) {
						this._bullet(
							cx,
							cy + i * 16,
							-s,
							i * 25,
							this.coreColor,
						);
					}
					break;
				case 1: // Ring burst
					if (
						this.type !== "colossus" ||
						this.phase >= 1
					) {
						for (let i = 0; i < 8; i++) {
							const angle =
								(i / 8) * Math.PI * 2 +
								this.animT * 0.5;
							this._bullet(
								cx,
								cy,
								Math.cos(angle) * s * 0.8,
								Math.sin(angle) * s * 0.8,
								"#ff6600",
							);
						}
					} else {
						this._bullet(cx, cy, -s, 0, this.coreColor);
					}
					break;
				case 2: // Spiral
					for (let i = 0; i < this.phase + 2; i++) {
						const angle =
							Math.PI +
							(i / (this.phase + 2)) * Math.PI;
						this._bullet(
							cx,
							cy,
							Math.cos(angle) * s,
							Math.sin(angle) * s,
							"#ffaa00",
						);
					}
					break;
				case 3: // Aimed burst
					if (this.type === "tyrant" || this.phase >= 2) {
						// 3 aimed bursts
						for (let i = -1; i <= 1; i++) {
							const angle = Math.PI + i * 0.2;
							this._bullet(
								cx,
								cy,
								Math.cos(angle) * s * 1.2,
								Math.sin(angle) * s * 1.2,
								"#ffff00",
							);
						}
					} else {
						this._bullet(
							cx,
							cy,
							-s,
							-s * 0.3,
							this.coreColor,
						);
						this._bullet(
							cx,
							cy,
							-s,
							s * 0.3,
							this.coreColor,
						);
					}
					break;
			}
		},

		_bullet(x, y, vx, vy, color) {
			this._pendingBullets.push({
				x,
				y,
				vx,
				vy,
				color,
				w: 10,
				h: 10,
			});
		},
	};
	return mgr;
}

function createHUD(ui) {
	let lastHudRender = "";

	// ── Helpers ────────────────────────────────────────────────────────────

	/** Show a translated string by key. */
	function tr(k) {
		return t(k);
	}

	// ── Onboarding ─────────────────────────────────────────────────────────

	/** Step 1 – Language selection (shown only once). */
	function showLangSelect(onDone) {
		ui.render(`
<div style="
	position: absolute; inset: 0;
	display: flex; flex-direction: column;
	align-items: center; justify-content: center;
	background: #000; color: #fff; font-family: monospace;
	gap: 24px;
">
	<div style="font-size: 48px;">🌐</div>
	<h2 style="
		font-size: 22px; font-weight: 900;
		color: #f97316; letter-spacing: 4px; margin: 0;
	">LANGUAGE / LANGUE</h2>
	<div style="display: flex; gap: 20px;">
		<button id="lang-fr" style="
			display: flex; flex-direction: column;
			align-items: center; gap: 10px;
			padding: 20px 40px;
			background: #111827; border: 2px solid #374151;
			border-radius: 16px; cursor: pointer; color: #fff;
			font-family: monospace;
		">
			<span style="font-size: 42px;">🇹🇬</span>
			<span style="font-weight: 900; font-size: 18px;">Français</span>
		</button>
		<button id="lang-en" style="
			display: flex; flex-direction: column;
			align-items: center; gap: 10px;
			padding: 20px 40px;
			background: #111827; border: 2px solid #374151;
			border-radius: 16px; cursor: pointer; color: #fff;
			font-family: monospace;
		">
			<span style="font-size: 42px;">🇬🇧</span>
			<span style="font-weight: 900; font-size: 18px;">English</span>
		</button>
	</div>
</div>
`);

		setTimeout(() => {
			document
				.getElementById("lang-fr")
				?.addEventListener("click", () => {
					settings.lang = "fr";
					settings.save();
					audio.sfx.select();
					onDone();
				});
			document
				.getElementById("lang-en")
				?.addEventListener("click", () => {
					settings.lang = "en";
					settings.save();
					audio.sfx.select();
					onDone();
				});
		}, 0);
	}

	/** Step 2 – Player name entry (shown only once). */
	function showNamePrompt(onDone) {
		ui.render(`
<div style="
	position: absolute; inset: 0;
	display: flex; flex-direction: column;
	align-items: center; justify-content: center;
	background: #000; color: #fff; font-family: monospace;
	gap: 16px;
">
	<div style="font-size: 42px;">✈️</div>
	<h2 style="
		font-size: 20px; font-weight: 900;
		color: #f97316; letter-spacing: 3px; margin: 0;
	">${tr("namePrompt")}</h2>
	<input
		id="name-input"
		maxlength="24"
		placeholder="${tr("namePlaceholder")}"
		style="
			padding: 12px 20px; font-size: 18px;
			font-family: monospace;
			background: #111827; border: 2px solid #f97316;
			border-radius: 10px; color: #fff; outline: none;
			text-align: center; width: 260px;
		"
	/>
	<button id="name-confirm" style="
		padding: 12px 40px;
		background: linear-gradient(to right, #b22200, #ea580c);
		border: none; border-radius: 10px;
		color: #fff; font-weight: 900; font-size: 16px;
		font-family: monospace; cursor: pointer;
	">
		${tr("nameConfirm")} →
	</button>
</div>
`);

		setTimeout(() => {
			const inp = document.getElementById("name-input");
			inp?.focus();
			inp?.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					document
						.getElementById("name-confirm")
						?.click();
				}
			});
			document
				.getElementById("name-confirm")
				?.addEventListener("click", () => {
					const name =
						(inp?.value || "").trim().slice(0, 24) ||
						"Pilot";
					settings.playerName = name;
					settings.save();
					audio.sfx.select();
					onDone();
				});
		}, 0);
	}

	/** Run onboarding steps then call cb(). */
	/** Step 3 – Tutorial (shown only once, flag iw_tuto_done). */
	function showTutorial(onDone) {
		const slides = t("tutoSlides") || [];
		let idx = 0;

		function render() {
			const s = slides[idx];
			const isLast = idx === slides.length - 1;
			const dots = slides
				.map(
					(_, i) =>
						`<div style="width:8px;height:8px;border-radius:50%;
		background:${i === idx ? "#f97316" : "#374151"};
		transition:background 0.2s;"></div>`,
				)
				.join("");

			ui.render(`
	<div style="
		position:absolute;inset:0;
		display:flex;flex-direction:column;
		align-items:center;justify-content:center;
		background:linear-gradient(160deg,#0a0000 0%,#1a0500 100%);
		color:#fff;font-family:monospace;
		padding:clamp(10px,2vh,24px) clamp(10px,2vw,24px);
		overflow-y:auto;
	">
		<div style="font-size:clamp(9px,1.6vh,11px);color:#f97316;letter-spacing:4px;
			text-transform:uppercase;margin-bottom:clamp(8px,1.5vh,20px);">
			📖 ${tr("tutoTitle")}
		</div>
		<div style="
			background:#111827;border:1px solid #374151;
			border-radius:16px;padding:clamp(14px,3vh,32px) clamp(14px,3vw,28px);
			width:min(380px,90vw);
			display:flex;flex-direction:column;
			align-items:center;gap:clamp(8px,1.5vh,16px);
			animation:upgradePopIn 0.35s ease both;
			box-shadow:0 0 40px rgba(249,115,22,0.08);
		">
			<div style="font-size:clamp(32px,8vh,56px);line-height:1;">${s.icon}</div>
			<div style="font-size:clamp(14px,2.5vh,18px);font-weight:900;color:#f97316;
				letter-spacing:2px;text-align:center;">${s.title}</div>
			<div style="font-size:clamp(11px,1.8vh,13px);color:#d1d5db;line-height:1.5;
				text-align:center;max-width:320px;">${s.body}</div>
		</div>
		<div style="display:flex;gap:8px;margin-top:clamp(10px,1.8vh,20px);">${dots}</div>
		<div style="display:flex;gap:12px;margin-top:clamp(10px,1.8vh,20px);">
			<button id="tuto-skip" style="
				padding:clamp(6px,1.2vh,8px) clamp(12px,2vw,18px);
				background:transparent;
				border:1px solid #374151;border-radius:8px;
				color:#6b7280;font-family:monospace;
				font-size:clamp(10px,1.6vh,12px);cursor:pointer;">
				${tr("tutoSkip")}
			</button>
			<button id="tuto-next" style="
				padding:clamp(8px,1.4vh,10px) clamp(18px,3vw,28px);
				background:linear-gradient(to right,#b22200,#ea580c);
				border:none;border-radius:10px;
				color:#fff;font-weight:900;font-size:clamp(12px,2vh,14px);
				font-family:monospace;cursor:pointer;
				letter-spacing:1px;">
				${isLast ? tr("tutoDone") : tr("tutoNext")}
			</button>
		</div>
		<div style="font-size:clamp(9px,1.4vh,10px);color:#4b5563;margin-top:clamp(6px,1vh,10px);">
			${idx + 1} / ${slides.length}
		</div>
	</div>
`);

			setTimeout(() => {
				document
					.getElementById("tuto-next")
					?.addEventListener("click", () => {
						audio.sfx.click();
						if (isLast) {
							idb.setItem("iw_tuto_done", "1");
							ui.clear();
							onDone();
						} else {
							idx++;
							render();
						}
					});
				document
					.getElementById("tuto-skip")
					?.addEventListener("click", () => {
						audio.sfx.click();
						idb.setItem("iw_tuto_done", "1");
						ui.clear();
						onDone();
					});
			}, 0);
		}
		render();
	}

	function runOnboarding(cb) {
		if (!settings.lang) {
			showLangSelect(() => runOnboarding(cb));
			return;
		}
		if (!settings.playerName) {
			showNamePrompt(() => runOnboarding(cb));
			return;
		}
		if (!idb.hasItem("iw_tuto_done")) {
			showTutorial(() => runOnboarding(cb));
			return;
		}
		cb();
	}

	// ── Public HUD object ──────────────────────────────────────────────────

	const self = {
		// ── Main menu ──────────────────────────────────────────────────────
		renderMenu(state) {
			runOnboarding(() => this._showMenu(state));
		},

		_showMenu(state) {
			const hasSave = saveGame.has();
			// Activate menu keyboard/gamepad navigation after render
			setTimeout(() => menuNav.activate(), 80);
			const padTip = gamepad.connected() ? " 🎮" : "";
			const achDone = Object.keys(
				achStats.get().unlocked || {},
			).length;
			const achTotal = ACH_DEFS.length;

			ui.render(`
	<div style="
		position: absolute; inset: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		color: #fff; font-family: monospace;
		overflow-y: auto; overflow-x: visible;
		scrollbar-width: none;
		padding: clamp(2px,0.6vh,24px) 0 clamp(4px,1vh,12px);
		box-sizing: border-box;
	">
		<!-- Animated background particles -->
		<div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:0;">
			${Array.from({ length: 14 }, (_, i) => {
				const sz = 3 + Math.random() * 5,
					left = Math.random() * 100,
					delay = Math.random() * 6,
					dur = 5 + Math.random() * 6;
				return `<div style="position:absolute;left:${left}%;width:${sz}px;height:${sz}px;
					border-radius:50%;background:rgba(255,${80 + Math.floor(Math.random() * 80)},0,0.5);
					animation:bgParticle ${dur}s ${delay}s linear infinite;"></div>`;
			}).join("")}
		</div>

		<!-- Background gradient overlay -->
		<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(180,30,0,0.18) 0%, rgba(0,0,0,0.92) 70%);pointer-events:none;z-index:1;"></div>

		<!-- Bloc centré : titre + contenu -->
		<div style="position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;width:100%;overflow:visible;">

		<!-- Titre hors du wrapper scrollable pour que le glow ne soit pas coupé -->
		<div style="flex-shrink:0;text-align:center;padding:clamp(4px,1vh,10px) 0 0;overflow:visible;">
			<h1 style="
				font-size: clamp(16px, min(4vh, 5vw), 48px);
				font-weight: 900; letter-spacing: clamp(1px,0.5vw,4px);
				color: #ff6600;
				animation: popIn 0.6s ease both 0.1s, glowPulseMenu 3s ease-in-out infinite 0.7s;
				margin: 0; padding: 0 8px clamp(1px,0.3vh,6px);
			">
				${tr("title")}
			</h1>
			<p style="color: #fb923c; font-size: clamp(8px, 1.5vh, 14px); margin: 0;
				animation: fadeInUp 0.5s ease both 0.2s;">
				${tr("subtitle")}
			</p>
		</div>

		<!-- Content wrapper -->
		<div style="display:flex;flex-direction:column;align-items:center;gap:clamp(2px,0.8vh,10px);width:100%;overflow:visible;padding:clamp(2px,0.6vh,8px) 4px 4px;box-sizing:border-box;">
		<style>#ui-layer ::-webkit-scrollbar{display:none;}</style>

		<!-- Action buttons -->
		<div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;
			animation: fadeInUp 0.55s ease both 0.35s; z-index: 10;">
			<button id="btn-start" style="
				padding: clamp(5px,1vh,12px) clamp(12px,2.5vw,32px);
				background: linear-gradient(to right, #b22200, #ea580c);
				border: none; border-radius: 12px;
				font-weight: 900; font-size: clamp(11px,1.8vh,17px);
				color: #fff; cursor: pointer;
				letter-spacing: 2px; font-family: monospace;
				transition: transform 0.15s, box-shadow 0.15s;
				animation: floatUp 3s ease-in-out infinite 1s;
			">
				🔥 ${tr("ignite")}
			</button>

			${
				hasSave
					? `
			<button id="btn-continue" style="
				padding: clamp(7px,1.5vh,12px) clamp(12px,2vw,24px);
				background: linear-gradient(to right, #14532d, #16a34a);
				border: none; border-radius: 12px;
				font-weight: 900; font-size: clamp(11px,1.8vh,15px);
				color: #fff; cursor: pointer; font-family: monospace;
				transition: transform 0.15s;
			">
				▶ ${tr("continueBtn")}
			</button>`
					: ""
			}

			<button id="btn-lb" style="
				padding: clamp(7px,1.5vh,12px) clamp(10px,2vw,16px);
				background: #111827; border: 2px solid #374151;
				border-radius: 12px; font-weight: 700;
				font-size: clamp(11px,1.8vh,13px); color: #d1d5db;
				cursor: pointer; font-family: monospace;
				transition: transform 0.15s;
			">
				🏆 ${tr("leaderboard")}
			</button>

			<button id="btn-ach" style="
				padding: clamp(7px,1.5vh,12px) clamp(10px,2vw,16px);
				background: #111827; border: 2px solid #374151;
				border-radius: 12px; font-weight: 700;
				font-size: clamp(11px,1.8vh,13px); color: #d1d5db;
				cursor: pointer; font-family: monospace;
				transition: transform 0.15s;
			">
				⭐ ${achDone}/${achTotal}
			</button>

			<button id="btn-options" style="
				padding: clamp(7px,1.5vh,12px) clamp(10px,2vw,16px);
				background: #111827; border: 2px solid #374151;
				border-radius: 12px; font-weight: 700;
				font-size: clamp(11px,1.8vh,13px); color: #d1d5db;
				cursor: pointer; font-family: monospace;
				transition: transform 0.15s;
			">
				⚙️ ${tr("options")}
			</button>
		</div>

		<!-- Pilot level bar -->
		<div style="
			animation: fadeInUp 0.5s ease both 0.35s;
			background:#111827;border:1px solid #374151;
			border-radius:10px;padding:clamp(5px,1vh,8px) 14px;
			width:min(300px,85vw);
			z-index: 0;
		">
			${(() => {
				const pl = pilotLevel.get();
				const xpNext = pilotLevel.getXpForNext();
				const isMax = xpNext === 0;
				const pct = isMax
					? 100
					: Math.min(
							100,
							Math.round((pl.xp / xpNext) * 100),
						);
				const title = pilotLevel.getTitle();
				return `
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
					<span style="font-size:clamp(10px,1.8vh,12px);font-weight:900;color:#f97316;">✈️ ${title} — Lv.${pl.level}</span>
					<span style="font-size:clamp(9px,1.5vh,10px);color:#9ca3af;">${isMax ? "✨ MAX" : pl.xp + "/" + xpNext + " XP"}</span>
				</div>
				<div style="background:#374151;border-radius:4px;height:5px;overflow:hidden;">
					<div style="height:100%;width:${pct}%;background:linear-gradient(to right,${isMax ? "#facc15,#f97316" : "#f97316,#facc15"});border-radius:4px;transition:width 0.3s;"></div>
				</div>`;
			})()}
		</div>

		<!-- Daily missions detailed display -->
		<div id="daily-summary" style="
			animation: fadeInUp 0.5s ease both 0.38s;
			background:#0a1a0a;border:1px solid #22553a;
			border-radius:10px;padding:clamp(5px,1vh,10px) 14px;
			width:min(300px,85vw);font-size:clamp(9px,1.8vh,11px);color:#4ade80;
		">
			${(() => {
				const dd = dailySystem.get();
				const lang = settings.lang || "en";
				const done = dd.missions.filter(
					(m) => m.done,
				).length;
				const total = dd.missions.length;
				const missionRows = dd.missions
					.map((m) => {
						const label = lang === "fr" ? m.fr : m.en;
						const color = m.done
							? "#22cc88"
							: "#9ca3af";
						const icon = m.done ? "✅" : "⬜";
						const prog =
							m.type === "progress"
								? ` (${m.progress || 0}/${m.target})`
								: m.done
									? ""
									: ` (${m.progress || 0}/${m.target})`;
						return `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;">
						<span>${icon}</span>
						<span style="flex:1;color:${color};">${label}${prog}</span>
						<span style="color:#facc15;font-size:9px;">+${m.xp}XP</span>
					</div>`;
					})
					.join("");
				const header = `<div style="display:flex;justify-content:space-between;margin-bottom:4px;border-bottom:1px solid #22553a;padding-bottom:4px;">
					<span style="color:#22cc88;font-weight:900;letter-spacing:1px;">📅 ${lang === "fr" ? "MISSIONS DU JOUR" : "DAILY MISSIONS"}</span>
					<span style="color:${done === total ? "#facc15" : "#9ca3af"};">${done}/${total}</span>
				</div>`;
				return header + missionRows;
			})()}
		</div>

		<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;animation:fadeInUp 0.5s ease both 0.4s; z-index: 10;">
			${(() => {
				const _survUnlocked =
					!!idb.getItem("iw_normal_cleared");
				const _survLabel =
					settings.lang === "fr" ? "SURVIE" : "SURVIVAL";
				return `<button id="btn-survival" style="
					padding:clamp(6px,1.2vh,9px) clamp(10px,2vw,16px);
					background:${_survUnlocked ? "linear-gradient(135deg,#7f1d1d,#991b1b)" : "#1f2937"};
					border:2px solid ${_survUnlocked ? "#ef4444" : "#4b5563"};border-radius:10px;
					color:${_survUnlocked ? "#fff" : "#6b7280"};font-weight:900;font-size:clamp(11px,1.8vh,13px);
					font-family:monospace;cursor:pointer;letter-spacing:1px;
					opacity:${_survUnlocked ? "1" : "0.6"};
				">${_survUnlocked ? "💀" : "🔒"} ${_survLabel}</button>`;
			})()}

		</div>

		<div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;animation:fadeInUp 0.5s ease both 0.42s;">
			<button id="btn-history" style="
				padding:clamp(5px,1vh,7px) clamp(8px,1.5vw,14px);
				background:#1f2937;border:1px solid #374151;
				border-radius:8px;color:#9ca3af;
				font-weight:700;font-size:clamp(9px,1.6vh,11px);cursor:pointer;font-family:monospace;
			">📊 Historique</button>
			<button id="btn-badges" style="
				padding:clamp(5px,1vh,7px) clamp(8px,1.5vw,14px);
				background:#1f2937;border:1px solid #374151;
				border-radius:8px;color:#9ca3af;
				font-weight:700;font-size:clamp(9px,1.6vh,11px);cursor:pointer;font-family:monospace;
			">🏅 Badges</button>
			<button id="btn-tuto" style="
				padding:clamp(5px,1vh,7px) clamp(8px,1.5vw,14px);
				background:#1f2937;border:1px solid #374151;
				border-radius:8px;color:#9ca3af;
				font-weight:700;font-size:clamp(9px,1.6vh,11px);cursor:pointer;font-family:monospace;
			">📖 ${tr("tutoBtn")}</button>
		</div>

		<div style="color: #facc15; font-size: clamp(11px,1.8vh,13px);
			animation: fadeInUp 0.5s ease both 0.45s;">
			${tr("hiScore")}: <span style="font-weight: 900;">${state.hiScore.toLocaleString()}</span>
		</div>

		<div data-hide-small style="font-size: 10px; color: #4b5563; margin-top: 2px;
			animation: fadeInUp 0.5s ease both 0.55s;">
			👤 ${settings.playerName || "Pilot"}
		</div>

		<!-- Studio + crédits -->
		<div data-hide-small style="margin-top:clamp(4px,0.8vh,14px);text-align:center;
			animation: fadeInUp 0.5s ease both 0.65s;">
			<div style="font-size:11px;font-weight:900;
				letter-spacing:2px;color:#ff6600;font-family:monospace;">
				IS DAOUDA GAMES
			</div>
			<div style="font-size:9px;color:#4b5563;
				margin-top:3px;font-family:monospace;">
				Music by Serhii Kliets and ElisLane from Pixabay
			</div>
		</div>

		</div><!-- end scrollable wrapper -->
		</div><!-- end centered block -->
	</div>
`);

			setTimeout(() => {
				document
					.getElementById("btn-options")
					?.addEventListener("click", () => {
						audio.sfx.click();
						self.renderOptions(state, () =>
							self._showMenu(state),
						);
					});

				document
					.getElementById("btn-continue")
					?.addEventListener("click", () => {
						audio.sfx.select();
						ui.clear();
						_resumeSave?.();
					});

				document
					.getElementById("btn-ach")
					?.addEventListener("click", () => {
						audio.sfx.click();
						self.renderAchievements(() =>
							self._showMenu(state),
						);
					});

				document
					.getElementById("btn-lb")
					?.addEventListener("click", () => {
						audio.sfx.click();
						self.renderLeaderboard(() =>
							self._showMenu(state),
						);
					});

				document
					.getElementById("btn-survival")
					?.addEventListener("click", () => {
						const normalCleared =
							idb.getItem("iw_normal_cleared");
						if (!normalCleared) {
							// Mode verrouillé
							audio.sfx.playerHit?.();
							const lang = settings.lang || "en";
							// Overlay plein écran — garantit centrage parfait dès le 1er affichage
							const msg =
								document.createElement("div");
							msg.style.cssText =
								"position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);z-index:99999;font-family:monospace;";
							msg.innerHTML = `
				<div style="background:rgba(0,0,0,0.97);border:2px solid #f97316;border-radius:14px;padding:24px 32px;color:#fff;text-align:center;max-width:min(300px,85vw);animation:popIn 0.3s ease;box-shadow:0 0 30px rgba(249,115,22,0.4);">
					<div style="font-size:32px;margin-bottom:10px;">🔒</div>
					<div style="font-size:13px;color:#f97316;font-weight:900;letter-spacing:2px;margin-bottom:10px;">${lang === "fr" ? "MODE VERROUILLÉ" : "LOCKED MODE"}</div>
					<div style="font-size:11px;color:#d1d5db;line-height:1.6;margin-bottom:4px;">${lang === "fr" ? "Terminez le mode Normal pour débloquer la Survie !" : "Complete Normal mode to unlock Survival!"}</div>
					<button id="lock-msg-close" style="margin-top:14px;padding:7px 22px;background:#f97316;border:none;border-radius:8px;color:#fff;font-weight:900;font-family:monospace;cursor:pointer;font-size:13px;">OK</button>
				</div>`;
							document.body.appendChild(msg);
							const _closeMsg = () => {
								msg.style.transition =
									"opacity 0.35s";
								msg.style.opacity = "0";
								setTimeout(() => msg.remove(), 380);
							};
							document
								.getElementById("lock-msg-close")
								?.addEventListener(
									"click",
									_closeMsg,
								);
							msg.addEventListener("click", (e) => {
								if (e.target === msg) _closeMsg();
							});
							setTimeout(_closeMsg, 3500);
							return;
						}
						audio.sfx.select();
						ui.clear();
						_startGame?.(null, "survival");
					});

				document
					.getElementById("btn-history")
					?.addEventListener("click", () => {
						audio.sfx.click();
						self.renderHistory(() =>
							self._showMenu(state),
						);
					});

				document
					.getElementById("btn-badges")
					?.addEventListener("click", () => {
						audio.sfx.click();
						self.renderBadges(() =>
							self._showMenu(state),
						);
					});

				document
					.getElementById("btn-tuto")
					?.addEventListener("click", () => {
						audio.sfx.click();
						idb.removeItem("iw_tuto_done");
						showTutorial(() => self._showMenu(state));
					});
			}, 0);
		},

		// ── Options ────────────────────────────────────────────────────────
		renderOptions(state, onBack, _keepCursor) {
			// _keepCursor=true : re-rendu interne (diff/langue/vibration)
			// → on garde la position du curseur. Sinon on repart à 0.
			if (_keepCursor) {
				setTimeout(() => menuNav.activateKeepIdx(), 50);
			} else {
				setTimeout(() => menuNav.activate(), 80);
			}
			const diffs = ["easy", "normal", "hard"];
			const diffCol = {
				easy: "#4ade80",
				normal: "#facc15",
				hard: "#f87171",
			};

			ui.render(`
	<div style="
		position: absolute; inset: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		background: rgba(0,0,0,0.93);
		color: #fff; font-family: monospace;
		overflow-y: auto; scrollbar-width: none;
		padding: clamp(4px,1vh,24px) 12px clamp(6px,1.5vh,32px);
		box-sizing: border-box;
	">
		<h2 style="
			font-size: clamp(13px,2.2vh,22px); font-weight: 900;
			color: #f97316; margin: 0 0 clamp(4px,0.8vh,20px);
			letter-spacing: clamp(1px,0.5vw,3px); flex-shrink: 0;
		">
			⚙️ ${tr("options")}
		</h2>

		<div style="
			background: #111827; border: 1px solid #374151;
			border-radius: 14px; padding: clamp(8px,1.5vh,20px) clamp(10px,2vw,20px);
			width: min(340px, 95vw);
			display: flex; flex-direction: column; gap: clamp(5px,1vh,18px);
			box-sizing: border-box;
		">
			<!-- Music volume -->
			<div>
				<div style="font-size: clamp(8px,1.5vh,10px); color: #f97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: clamp(3px,0.5vh,8px);">
					🎵 ${tr("music")}
				</div>
				<div style="display: flex; align-items: center; gap: 10px;">
					<input id="opt-mus" type="range" min="0" max="1" step="0.05"
						value="${settings.musicVol}"
						style="flex: 1; accent-color: #f97316; cursor: pointer;"
					/>
					<span id="opt-mv" style="color: #facc15; font-weight: 700; min-width: 38px; text-align: right;">
						${Math.round(settings.musicVol * 100)}%
					</span>
				</div>
			</div>

			<!-- SFX volume -->
			<div>
				<div style="font-size: clamp(8px,1.5vh,10px); color: #f97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: clamp(3px,0.5vh,8px);">
					🔊 ${tr("sfx")}
				</div>
				<div style="display: flex; align-items: center; gap: 10px;">
					<input id="opt-sfx" type="range" min="0" max="1" step="0.05"
						value="${settings.sfxVol}"
						style="flex: 1; accent-color: #f97316; cursor: pointer;"
					/>
					<span id="opt-sv" style="color: #facc15; font-weight: 700; min-width: 38px; text-align: right;">
						${Math.round(settings.sfxVol * 100)}%
					</span>
				</div>
			</div>

			<!-- Difficulty -->
			<div>
				<div style="font-size: clamp(8px,1.5vh,10px); color: #f97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: clamp(3px,0.5vh,8px);">
					⚔️ ${tr("difficulty")}
				</div>
				<div style="display: flex; gap: 6px;">
					${diffs
						.map(
							(d) => `
					<button class="opt-diff" data-diff="${d}" style="
						flex: 1; padding: clamp(4px,0.8vh,8px) 4px;
						border-radius: 8px; font-weight: 700;
						font-size: clamp(9px,1.6vh,11px); cursor: pointer;
						font-family: monospace;
						border: 2px solid ${settings.difficulty === d ? "#f97316" : "#374151"};
						background: ${settings.difficulty === d ? "rgba(249,115,22,0.15)" : "#1f2937"};
						color: ${settings.difficulty === d ? diffCol[d] : "#6b7280"};
					">
						${tr(d)}
					</button>`,
						)
						.join("")}
				</div>
			</div>

			<!-- Vibration -->
			<div style="display: flex; align-items: center; justify-content: space-between;">
				<span style="font-size: 10px; color: #f97316; text-transform: uppercase; letter-spacing: 2px;">
					🎮 ${tr("vibration")}
				</span>
				<button id="opt-rum" style="
					padding: clamp(4px,0.8vh,7px) clamp(8px,1.5vw,14px); border-radius: 8px;
					font-weight: 700; cursor: pointer;
					font-family: monospace;
					border: 2px solid ${settings.rumble ? "#f97316" : "#374151"};
					background: ${settings.rumble ? "rgba(249,115,22,0.15)" : "#1f2937"};
					color: ${settings.rumble ? "#f97316" : "#6b7280"};
				">
					${settings.rumble ? "ON" : "OFF"}
				</button>
			</div>

			<!-- Language -->
			<div style="display: flex; align-items: center; justify-content: space-between;">
				<span style="font-size: 10px; color: #f97316; text-transform: uppercase; letter-spacing: 2px;">
					🌐 ${tr("lang")}
				</span>
				<div style="display: flex; gap: 6px;">
					<button class="lang-btn" data-lang="fr" style="
						padding: clamp(3px,0.6vh,6px) clamp(8px,1.5vw,12px); border-radius: 6px;
						cursor: pointer; font-weight: 700;
						font-family: monospace;
						border: 2px solid ${settings.lang === "fr" ? "#f97316" : "#374151"};
						background: ${settings.lang === "fr" ? "rgba(249,115,22,0.15)" : "#1f2937"};
						color: ${settings.lang === "fr" ? "#f97316" : "#6b7280"};
					">
						🇫🇷 FR
					</button>
					<button class="lang-btn" data-lang="en" style="
						padding: clamp(3px,0.6vh,6px) clamp(8px,1.5vw,12px); border-radius: 6px;
						cursor: pointer; font-weight: 700;
						font-family: monospace;
						border: 2px solid ${settings.lang === "en" ? "#f97316" : "#374151"};
						background: ${settings.lang === "en" ? "rgba(249,115,22,0.15)" : "#1f2937"};
						color: ${settings.lang === "en" ? "#f97316" : "#6b7280"};
					">
						🇬🇧 EN
					</button>
				</div>
			</div>

			<!-- Player name -->
			<div>
				<div style="font-size: clamp(8px,1.5vh,10px); color: #f97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: clamp(3px,0.5vh,8px);">
					👤 ${tr("playerNameLbl")}
				</div>
				<div style="display: flex; gap: 8px; align-items: center;">
					<input
						id="opt-name"
						maxlength="24"
						value="${settings.playerName || ""}"
						placeholder="Pilot"
						style="
							flex: 1; padding: clamp(4px,0.7vh,7px) 10px;
							background: #1f2937;
							border: 1px solid #374151;
							border-radius: 6px; color: #fff;
							font-family: monospace; font-size: 13px;
							outline: none;
						"
					/>
					<button id="opt-name-save" style="
						padding: 7px 12px;
						background: #f97316; border: none;
						border-radius: 6px; color: #fff;
						font-weight: 700; font-size: 12px;
						cursor: pointer; font-family: monospace;
					">
						OK
					</button>
				</div>
			</div>
		</div>

		<!-- Zone danger : suppression des données -->
		<div style="margin-top:clamp(3px,0.6vh,10px);border-top:1px solid #374151;padding-top:clamp(4px,0.8vh,14px);width:min(320px,90vw);box-sizing:border-box;">
			<button id="btn-delete-data" style="
				width:100%;padding:clamp(6px,1.2vh,9px) 16px;
				background:transparent;
				border:1px solid #7f1d1d;border-radius:8px;
				color:#ef4444;font-weight:700;font-size:11px;
				font-family:monospace;cursor:pointer;letter-spacing:1px;
			">🗑 ${tr("deleteData")}</button>
		</div>

		<button id="btn-back" style="
			margin-top: clamp(4px,0.8vh,18px); padding: clamp(4px,0.8vh,9px) 24px;
			background: #1f2937; border: 1px solid #374151;
			border-radius: 10px; color: #9ca3af;
			cursor: pointer; font-weight: 700;
			font-family: monospace; flex-shrink: 0;
		">
			← ${tr("back")}
		</button>
	</div>
`);

			setTimeout(() => {
				// Music slider
				const musSlider =
					document.getElementById("opt-mus");
				const musVal = document.getElementById("opt-mv");
				musSlider?.addEventListener("input", () => {
					settings.musicVol = +musSlider.value;
					musVal.textContent =
						Math.round(settings.musicVol * 100) + "%";
					audio.setMusicVol(settings.musicVol);
					settings.save();
				});

				// SFX slider
				const sfxSlider =
					document.getElementById("opt-sfx");
				const sfxVal = document.getElementById("opt-sv");
				sfxSlider?.addEventListener("input", () => {
					settings.sfxVol = +sfxSlider.value;
					sfxVal.textContent =
						Math.round(settings.sfxVol * 100) + "%";
					audio.setSfxVol(settings.sfxVol);
					audio.sfx.click();
					settings.save();
				});

				// Difficulty buttons
				document
					.querySelectorAll(".opt-diff")
					.forEach((btn) => {
						btn.addEventListener("click", () => {
							settings.difficulty = btn.dataset.diff;
							settings.save();
							audio.sfx.click();
							self.renderOptions(state, onBack, true); // keepCursor
						});
					});

				// Vibration toggle
				document
					.getElementById("opt-rum")
					?.addEventListener("click", () => {
						settings.rumble = !settings.rumble;
						settings.save();
						audio.sfx.click();
						self.renderOptions(state, onBack, true); // keepCursor
					});

				// Language buttons
				document
					.querySelectorAll(".lang-btn")
					.forEach((btn) => {
						btn.addEventListener("click", () => {
							settings.lang = btn.dataset.lang;
							settings.save();
							audio.sfx.click();
							self.renderOptions(state, onBack, true); // keepCursor
						});
					});

				// Player name save
				document
					.getElementById("opt-name-save")
					?.addEventListener("click", () => {
						const inp =
							document.getElementById("opt-name");
						const name =
							(inp?.value || "")
								.trim()
								.slice(0, 24) || "Pilot";
						settings.playerName = name;
						settings.save();
						audio.sfx.click();
						// Show brief confirmation
						if (inp) inp.style.borderColor = "#22c55e";
						setTimeout(() => {
							if (inp)
								inp.style.borderColor = "#374151";
						}, 1000);
					});

				// Delete data button → modal de confirmation
				document
					.getElementById("btn-delete-data")
					?.addEventListener("click", () => {
						audio.sfx.click();
						const modal = document.createElement("div");
						modal.id = "modal-delete";
						Object.assign(modal.style, {
							position: "fixed",
							inset: "0",
							background: "rgba(0,0,0,0.87)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							zIndex: "99999",
							fontFamily: "monospace",
						});
						modal.innerHTML = `
			<div style="
				background:#111827;border:1px solid #7f1d1d;
				border-radius:16px;padding:28px 24px;
				width:min(360px,90vw);
				display:flex;flex-direction:column;gap:14px;
				box-shadow:0 0 60px rgba(239,68,68,0.2);
				animation:upgradePopIn 0.25s ease both;
			">
				<div style="text-align:center;font-size:36px;line-height:1;">🗑️</div>
				<div style="text-align:center;font-size:15px;font-weight:900;
					color:#ef4444;letter-spacing:2px;">
					${tr("deleteDataConfirm")}
				</div>
				<div style="text-align:center;font-size:12px;color:#9ca3af;line-height:1.5;">
					${tr("deleteDataWarn")}
				</div>
				<div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
					<button id="modal-del-yes" style="
						padding:12px;
						background:linear-gradient(to right,#7f1d1d,#991b1b);
						border:1px solid #ef4444;border-radius:10px;
						color:#fca5a5;font-weight:900;font-size:13px;
						font-family:monospace;cursor:pointer;letter-spacing:1px;">
						🗑 ${tr("deleteDataYes")}
					</button>
					<button id="modal-del-no" style="
						padding:10px;background:#1f2937;
						border:1px solid #374151;border-radius:10px;
						color:#9ca3af;font-weight:700;font-size:13px;
						font-family:monospace;cursor:pointer;">
						${tr("deleteDataNo")}
					</button>
				</div>
			</div>
		`;
						document.body.appendChild(modal);

						document
							.getElementById("modal-del-yes")
							?.addEventListener("click", () => {
								audio.sfx.select();
								for (const k of idb.getAllKeys())
									idb.removeItem(k);
								settings.musicVol = 0.4;
								settings.sfxVol = 0.7;
								settings.difficulty = "normal";
								settings.rumble = true;
								settings.lang = null;
								settings.playerName = null;
								modal.querySelector(
									"div",
								).innerHTML = `
				<div style="text-align:center;padding:16px 0;">
					<div style="font-size:36px;margin-bottom:10px;">✅</div>
					<div style="color:#4ade80;font-weight:900;font-size:14px;
						font-family:monospace;letter-spacing:1px;">
						${tr("deleteDataDone")}
					</div>
				</div>
			`;
								setTimeout(
									() => location.reload(),
									1200,
								);
							});

						document
							.getElementById("modal-del-no")
							?.addEventListener("click", () => {
								audio.sfx.click();
								modal.remove();
							});

						modal.addEventListener("click", (e) => {
							if (e.target === modal) {
								audio.sfx.click();
								modal.remove();
							}
						});
					});

				// Back button
				document
					.getElementById("btn-back")
					?.addEventListener("click", () => {
						audio.sfx.select();
						onBack();
					});

				// Echap pour fermer les Options
				const _optEsc = (e) => {
					if (e.code === "Escape") {
						e.preventDefault();
						window.removeEventListener(
							"keydown",
							_optEsc,
							true,
						);
						audio.sfx.select();
						onBack();
					}
				};
				window.addEventListener("keydown", _optEsc, true);
				// Nettoyer si l'écran est quitté autrement (btn-back)
				document
					.getElementById("btn-back")
					?.addEventListener(
						"click",
						() => {
							window.removeEventListener(
								"keydown",
								_optEsc,
								true,
							);
						},
						{ once: true },
					);
			}, 0);
		},

		// ── Game Over ──────────────────────────────────────────────────────
		renderGameOver(state) {
			const _replayMode = state.isSurvival ? "survival" : "";
			ui.render(`
	<div style="
		position: absolute; inset: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		background: rgba(0,0,0,0.87);
		color: #fff; font-family: monospace; gap: 8px;
	">
		<h2 style="font-size: 44px; font-weight: 900; color: #ff2200; text-shadow: 0 0 20px #ff0000; margin: 0;">
			${tr("gameOver")}
		</h2>
		<p style="color: #fb923c; font-size: 15px; margin: 0;">
			${tr("gameOverSub")}
		</p>
		<div style="font-size: clamp(18px, 5vw, 36px); font-weight: 900; color: #facc15; font-family: monospace;">
			${state.score.toLocaleString()}
		</div>
		<div style="color: #6b7280; font-size: 13px;">
			${tr("hiScore")}: <span style="color: #fbbf24; font-weight: 700;">${state.hiScore.toLocaleString()}</span>
		</div>
		<div id="lb-status" style="font-size: 11px; color: #4b5563; margin-top: 4px;"></div>
		<div style="display: flex; gap: 10px; margin-top: 12px;">
			<button id="btn-start" data-mode="${_replayMode}" style="
				padding: 12px 36px;
				background: linear-gradient(to right, #b22200, #ea580c);
				border: none; border-radius: 12px;
				font-weight: 900; font-size: 16px;
				color: #fff; cursor: pointer;
				font-family: monospace; letter-spacing: 2px;
			">
				${tr("tryAgain")}
			</button>
			<button id="btn-menu-go" style="padding:12px 30px; font-size:1rem; background:#1a1a1a; color:#aaa; border:2px solid #333; border-radius:12px; cursor:pointer; font-weight:bold; pointer-events:auto;">
				${t("mainMenu")}
			</button>
		</div>
	</div>
`);
		},

		// ── Victory ────────────────────────────────────────────────────────
		renderWin(state) {
			const _replayMode = state.isSurvival ? "survival" : "";
			ui.render(`
	<div style="
		position: absolute; inset: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		background: rgba(0,0,0,0.87);
		color: #fff; font-family: monospace; gap: 8px;
	">
		<div style="font-size: 48px;">🔥</div>
		<h2 style="font-size: 44px; font-weight: 900; color: #ffdd00; text-shadow: 0 0 20px #ff8800, 0 0 40px #ff4400; margin: 0;">
			${tr("victory")}
		</h2>
		<p style="color: #fb923c; font-size: 15px; margin: 0;">
			${tr("victorySub")}
		</p>
		<div style="font-size: clamp(18px, 5vw, 36px); font-weight: 900; color: #facc15; font-family: monospace;">
			${state.score.toLocaleString()}
		</div>
		<div style="color: #6b7280; font-size: 13px;">
			${tr("hiScore")}: <span style="color: #fbbf24; font-weight: 700;">${state.hiScore.toLocaleString()}</span>
		</div>
		<div id="lb-status" style="font-size: 11px; color: #4b5563; margin-top: 4px;"></div>
		<div style="display: flex; gap: 10px; margin-top: 12px;">
			<button id="btn-start" data-mode="${_replayMode}" style="
				padding: 12px 36px;
				background: linear-gradient(to right, #92400e, #f59e0b);
				border: none; border-radius: 12px;
				font-weight: 900; font-size: 16px;
				color: #fff; cursor: pointer;
				font-family: monospace; letter-spacing: 2px;
			">
				${tr("playAgain")}
			</button>
		</div>
	</div>
`);
		},

		// ── Achievements ───────────────────────────────────────────────────
		renderAchievements(onBack) {
			// Hide pause button so it doesn't overlap this full-screen panel
			_showPauseBtn(false);
			const stats = achStats.get();
			const isFr = settings.lang === "fr";
			const done = Object.keys(stats.unlocked || {}).length;
			const total = ACH_DEFS.length;

			// Group achievements by category
			const CATS = [
				"basics",
				"kills",
				"score",
				"combo",
				"survival",
				"shots",
				"time",
				"powerups",
				"diff",
				"special",
				"runs",
				"secret",
				"meta",
			];

			let rows = "";
			CATS.forEach((cat) => {
				const items = ACH_DEFS.filter((a) => a.cat === cat);
				const catDone = items.filter(
					(a) => stats.unlocked?.[a.id],
				).length;
				const catLabel = tr("ach_" + cat) || cat;

				rows += `
		<div style="margin-bottom: 20px;">
			<div style="
				font-size: 10px; color: #f97316;
				text-transform: uppercase; letter-spacing: 2px;
				font-weight: 700; margin-bottom: 8px;
				border-bottom: 1px solid #1f2937;
				padding-bottom: 4px;
			">
				${catLabel} (${catDone}/${items.length})
			</div>
	`;

				items.forEach((ach) => {
					const isUnlocked = !!stats.unlocked?.[ach.id];
					const isSecret = ach.cat === "secret";
					const name =
						isUnlocked &&
						isSecret &&
						(isFr ? ach.sfr : ach.sen)
							? isFr
								? ach.sfr
								: ach.sen
							: isFr
								? ach.fr
								: ach.en;
					const desc = isUnlocked
						? isFr
							? ach.dfr
							: ach.den
						: isSecret
							? "???"
							: isFr
							? ach.dfr
							: ach.den;

					rows += `
			<div style="
				display: flex; align-items: center; gap: 10px;
				padding: 8px 10px; border-radius: 8px;
				margin-bottom: 4px;
				background: ${isUnlocked ? "rgba(251,146,60,0.07)" : "rgba(255,255,255,0.02)"};
				border: 1px solid ${isUnlocked ? "rgba(251,146,60,0.2)" : "rgba(255,255,255,0.04)"};
			">
				<span style="font-size: 22px; filter: ${isUnlocked ? "none" : "grayscale(1) opacity(0.25)"};">
					${ach.icon}
				</span>
				<div style="flex: 1; min-width: 0;">
					<div style="
						font-weight: 700; font-size: 12px;
						color: ${isUnlocked ? "#fb923c" : "#4b5563"};
						white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
					">
						${isUnlocked ? name : "???"}
					</div>
					<div style="
						font-size: 10px;
						color: ${isUnlocked ? "#6b7280" : "#1f2937"};
						white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
					">
						${desc}
					</div>
				</div>
				${isUnlocked ? '<span style="color: #22c55e; font-size: 14px;">✓</span>' : ""}
			</div>
		`;
				});

				rows += `</div>`;
			});

			ui.render(`
	<div style="
		position: absolute; inset: 0;
		background: rgba(0,0,0,0.96);
		display: flex; flex-direction: column;
		color: #fff; font-family: monospace;
	">
		<!-- Header -->
		<div style="
			display: flex; align-items: center;
			justify-content: space-between;
			padding: 14px 18px;
			border-bottom: 1px solid #1f2937;
			flex-shrink: 0;
		">
			<h2 style="font-size: 18px; font-weight: 900; color: #f97316; margin: 0;">
				⭐ ${tr("achTitle")}
			</h2>
			<div style="text-align: center;">
				<div style="font-size: 18px; font-weight: 900; color: #facc15;">
					${done}/${total}
				</div>
				<div style="
					width: 100px; height: 5px;
					background: #1f2937; border-radius: 3px;
					margin-top: 4px;
				">
					<div style="
						height: 100%; border-radius: 3px;
						background: linear-gradient(to right, #ea580c, #facc15);
						width: ${Math.round((done / total) * 100)}%;
					"></div>
				</div>
			</div>
			<button id="ach-back-btn" style="
				padding: 8px 16px;
				background: #1f2937; border: 1px solid #374151;
				border-radius: 8px; color: #9ca3af;
				cursor: pointer; font-weight: 700;
				font-family: monospace;
			">
				← ${tr("back")}
			</button>
		</div>

		<!-- Scrollable list -->
		<div style="flex: 1; overflow-y: auto; padding: 14px 18px;">
			${rows}
		</div>
	</div>
`);

			setTimeout(() => {
				document
					.getElementById("ach-back-btn")
					?.addEventListener("click", () => {
						audio.sfx.select();
						ui.clear();
						window.removeEventListener(
							"keydown",
							_achEsc,
							true,
						);
						// Restore pause btn if we came from gameplay
						const fromGame =
							typeof state !== "undefined" &&
							state.phase !== "menu" &&
							state.phase !== "gameover" &&
							state.phase !== "win";
						if (fromGame) _showPauseBtn(true);
						onBack();
					});

				// Echap pour fermer les Succès
				const _achEsc = (e) => {
					if (e.code === "Escape") {
						e.preventDefault();
						window.removeEventListener(
							"keydown",
							_achEsc,
							true,
						);
						document
							.getElementById("ach-back-btn")
							?.click();
					}
				};
				window.addEventListener("keydown", _achEsc, true);
			}, 0);
		},

		// ── Leaderboard ────────────────────────────────────────────────────
		renderHistory(onBack) {
			const lang = settings.lang || "en";
			const history = matchHistory.getAll();
			const modeLabel = {
				normal: "Normal",
				survival: "💀 Survie",
				daily: "⚡ Daily",
				win: "🏆 Win",
			};
			const rows =
				history.length === 0
					? `<div style="color:#6b7280;font-size:14px;text-align:center;padding:20px;">
			${lang === "fr" ? "Aucune partie enregistrée" : "No games recorded yet"}
		</div>`
					: history
							.map(
								(h, i) => `
		<div style="
			display:flex;align-items:center;gap:8px;
			padding:8px 12px;border-radius:8px;
			background:${i % 2 === 0 ? "rgba(31,41,55,0.6)" : "rgba(17,24,39,0.4)"};
			border:1px solid #374151;
		">
			<div style="color:#6b7280;font-size:11px;min-width:18px;">${i + 1}</div>
			<div style="flex:1;">
				<div style="font-size:12px;font-weight:900;color:#f97316;">
					${h.score.toLocaleString()} pts
				</div>
				<div style="font-size:10px;color:#9ca3af;">
					${modeLabel[h.mode] || h.mode} · Niv.${h.level} · ${h.kills || 0} kills · ${h.bosses || 0} boss
					${h.wave != null ? " · Vague " + h.wave : ""}
				</div>
			</div>
			<div style="font-size:11px;color:#22cc88;font-weight:700;">+${h.xp || 0}XP</div>
			<div style="font-size:10px;color:#4b5563;">${new Date(h.date || h.ts || 0).toLocaleDateString()}</div>
		</div>
	`,
							)
							.join("");

			ui.render(`
	<div style="
		position:absolute;inset:0;overflow-y:auto;
		background:rgba(0,0,0,0.96);padding:20px;
		display:flex;flex-direction:column;gap:10px;
		color:#fff;font-family:monospace;
	">
		<div style="font-size:22px;font-weight:900;color:#f97316;
			letter-spacing:3px;text-align:center;margin-bottom:4px;">
			📊 ${lang === "fr" ? "HISTORIQUE" : "HISTORY"}
		</div>
		<div style="display:flex;flex-direction:column;gap:6px;max-width:500px;width:100%;margin:0 auto;">
			${rows}
		</div>
		<div style="text-align:center;margin-top:8px;">
			<button id="hist-back" style="
				padding:10px 24px;background:#1f2937;border:2px solid #374151;
				border-radius:10px;color:#9ca3af;font-weight:900;
				font-size:14px;cursor:pointer;font-family:monospace;
			">${lang === "fr" ? "← RETOUR" : "← BACK"}</button>
		</div>
	</div>
`);
			setTimeout(() => {
				document
					.getElementById("hist-back")
					?.addEventListener("click", () => {
						window.removeEventListener(
							"keydown",
							_histEsc,
							true,
						);
						audio.sfx.click?.();
						onBack();
					});

				// Echap pour fermer l'Historique
				const _histEsc = (e) => {
					if (e.code === "Escape") {
						e.preventDefault();
						window.removeEventListener(
							"keydown",
							_histEsc,
							true,
						);
						audio.sfx.click?.();
						onBack();
					}
				};
				window.addEventListener("keydown", _histEsc, true);
			}, 0);
		},

		renderBadges(onBack) {
			const lang = settings.lang || "en";
			const badges = seasonBadges.getAll();
			const earned = badges.filter((b) => b.earned).length;
			const rows = badges
				.map(
					(b) => `
	<div style="
		display:flex;align-items:center;gap:10px;
		padding:10px 14px;border-radius:10px;
		background:${b.earned ? "rgba(20,40,20,0.8)" : "rgba(20,20,20,0.5)"};
		border:1px solid ${b.earned ? "#22cc88" : "#374151"};
		opacity:${b.earned ? 1 : 0.5};
	">
		<div style="font-size:28px;min-width:36px;text-align:center;">${b.icon}</div>
		<div style="flex:1;">
			<div style="font-size:13px;font-weight:900;color:${b.earned ? "#22cc88" : "#9ca3af"};">
				${lang === "fr" ? b.fr : b.en}
			</div>
		</div>
		<div style="font-size:16px;">${b.earned ? "✅" : "🔒"}</div>
	</div>
`,
				)
				.join("");

			ui.render(`
	<div style="
		position:absolute;inset:0;overflow-y:auto;
		background:rgba(0,0,0,0.96);padding:20px;
		display:flex;flex-direction:column;gap:10px;
		color:#fff;font-family:monospace;
	">
		<div style="font-size:22px;font-weight:900;color:#f97316;
			letter-spacing:3px;text-align:center;margin-bottom:4px;">
			🏅 ${lang === "fr" ? "BADGES DE SAISON" : "SEASON BADGES"}
		</div>
		<div style="text-align:center;font-size:13px;color:#22cc88;margin-bottom:6px;">
			${earned}/${badges.length} obtenus
		</div>
		<div style="display:flex;flex-direction:column;gap:6px;max-width:440px;width:100%;margin:0 auto;">
			${rows}
		</div>
		<div style="text-align:center;margin-top:8px;">
			<button id="bdg-back" style="
				padding:10px 24px;background:#1f2937;border:2px solid #374151;
				border-radius:10px;color:#9ca3af;font-weight:900;
				font-size:14px;cursor:pointer;font-family:monospace;
			">${lang === "fr" ? "← RETOUR" : "← BACK"}</button>
		</div>
	</div>
`);
			setTimeout(() => {
				document
					.getElementById("bdg-back")
					?.addEventListener("click", () => {
						window.removeEventListener(
							"keydown",
							_bdgEsc,
							true,
						);
						audio.sfx.click?.();
						onBack();
					});

				// Echap pour fermer les Badges
				const _bdgEsc = (e) => {
					if (e.code === "Escape") {
						e.preventDefault();
						window.removeEventListener(
							"keydown",
							_bdgEsc,
							true,
						);
						audio.sfx.click?.();
						onBack();
					}
				};
				window.addEventListener("keydown", _bdgEsc, true);
			}, 0);
		},

		renderLeaderboard(onBack) {
			// Hide pause button so it doesn't overlap this full-screen panel
			_showPauseBtn(false);
			ui.render(`
	<div style="
		position: absolute; inset: 0;
		background: rgba(0,0,0,0.96);
		display: flex; flex-direction: column;
		color: #fff; font-family: monospace;
	">
		<!-- Header -->
		<div style="
			display: flex; align-items: center;
			justify-content: space-between;
			padding: 14px 18px;
			border-bottom: 1px solid #1f2937;
			flex-shrink: 0;
		">
			<h2 style="font-size: 18px; font-weight: 900; color: #f97316; margin: 0;">
				🏆 ${tr("lbTitle")}
			</h2>
			<button id="lb-back-btn" style="
				padding: 8px 16px;
				background: #1f2937; border: 1px solid #374151;
				border-radius: 8px; color: #9ca3af;
				cursor: pointer; font-weight: 700;
				font-family: monospace;
			">
				← ${tr("back")}
			</button>
		</div>

		<!-- Content: loading state -->
		<div id="lb-content" style="
			flex: 1; display: flex; overflow-y: auto;
			align-items: center; justify-content: center;
			color: #6b7280; font-size: 14px;
			padding: 0 18px 18px;
		">
			⏳ ${tr("lbLoading")}
		</div>
	</div>
`);

			// Bind back button immediately
			setTimeout(() => {
				document
					.getElementById("lb-back-btn")
					?.addEventListener("click", () => {
						audio.sfx.select();
						ui.clear();
						// Restore pause btn if we came from gameplay
						const fromGame =
							typeof state !== "undefined" &&
							state.phase !== "menu" &&
							state.phase !== "gameover" &&
							state.phase !== "win";
						if (fromGame) _showPauseBtn(true);
						onBack();
					});
			}, 0);

			// Load scores asynchronously
			firebase
				.getTop100()
				.then((entries) => {
					const lbContent =
						document.getElementById("lb-content");
					if (!lbContent) return;

					if (!entries || entries.length === 0) {
						lbContent.textContent = tr("lbEmpty");
						return;
					}

					const myName = (
						settings.playerName || ""
					).toLowerCase();

					const tableRows = entries
						.map((entry, i) => {
							const isMe =
								entry.name &&
								myName &&
								entry.name.toLowerCase() === myName;
							const medal =
								i === 0
									? "🥇"
									: i === 1
										? "🥈"
										: i === 2
										? "🥉"
										: "";

							return `
			<tr style="
				background: ${isMe ? "rgba(251,146,60,0.1)" : "transparent"};
				border-bottom: 1px solid #111;
			">
				<td style="padding: 8px 12px; color: ${i < 3 ? "#facc15" : "#6b7280"}; font-weight: 700; text-align: center;">
					${medal || "#" + (i + 1)}
				</td>
				<td style="padding: 8px 12px; color: ${isMe ? "#fb923c" : "#e5e7eb"}; font-weight: ${isMe ? 700 : 400};">
					${entry.name || "?"}
				</td>
				<td style="padding: 8px 12px; color: #facc15; font-weight: 900; text-align: right; font-size: 13px;">
					${(entry.score || 0).toLocaleString()}
				</td>
				<td style="padding: 8px 12px; color: #6b7280; font-size: 10px; text-align: center;">
					${entry.diff || ""}
				</td>
			</tr>
		`;
						})
						.join("");

					lbContent.style.display = "block";
					lbContent.style.alignItems = "";
					lbContent.style.justifyContent = "";
					lbContent.innerHTML = `
		<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
			<thead>
				<tr style="border-bottom: 1px solid #374151;">
					<th style="padding: 10px 12px; color: #f97316; font-size: 10px; text-transform: uppercase;">${tr("lbRank")}</th>
					<th style="padding: 10px 12px; color: #f97316; font-size: 10px; text-transform: uppercase; text-align: left;">${tr("lbName")}</th>
					<th style="padding: 10px 12px; color: #f97316; font-size: 10px; text-transform: uppercase; text-align: right;">${tr("lbScore")}</th>
					<th style="padding: 10px 12px;"></th>
				</tr>
			</thead>
			<tbody>${tableRows}</tbody>
		</table>
	`;
				})
				.catch(() => {
					const lbContent =
						document.getElementById("lb-content");
					if (lbContent) {
						lbContent.innerHTML = `<div style="color: #ef4444;">Erreur de connexion au classement.</div>`;
					}
				});
		},

		// ── In-game HUD ────────────────────────────────────────────────────
		renderHUD(state, player) {
			if (
				!player ||
				state.paused ||
				state.phase === "menu" ||
				state.phase === "gameover" ||
				state.phase === "win"
			)
				return;

			const lives =
				"❤️".repeat(Math.max(0, state.lives)) +
				"🖤".repeat(Math.max(0, 5 - state.lives));
			const fireStars =
				"★".repeat(player.fireLevel) +
				"☆".repeat(5 - player.fireLevel);
			const comboFrac = state.comboTimer / state.comboMax;
			const comboColor =
				state.combo >= 8
					? "#ff2200"
					: state.combo >= 4
						? "#ff8800"
						: "#ffcc00";
			const lvlName =
				(LEVELS[state.level] && LEVELS[state.level].name) ||
				"";

			const powerIcons = [
				player.hasShield
					? `<span style="color:#60a5fa;">🛡</span>`
					: "",
				player.hasHoming
					? `<span style="color:#f472b6;">🎯</span>`
					: "",
				player.speedBoost
					? `<span style="color:#fde68a;">⚡</span>`
					: "",
				player.megaReady
					? `<span style="color:#f87171;">💥</span>`
					: "",
				player.shootRateBoost
					? `<span style="color:#ff88ff;">🔫 ${Math.ceil(player.shootRateTimer)}s</span>`
					: "",
				state.scoreMulTimer > 0
					? `<span style="color:#facc15;">💫×2 ${Math.ceil(state.scoreMulTimer)}s</span>`
					: "",
			]
				.filter(Boolean)
				.join(" ");

			const html = `
	<div style="position: absolute; inset: 0; pointer-events: none; user-select: none; font-family: monospace;">

		<!-- Top bar: padded left so it clears the pause button -->
		<div style="
			position: absolute; top: 0; left: 0; right: 0;
			display: flex; align-items: center; justify-content: space-between;
			padding: 6px 12px 6px max(72px, calc(clamp(40px,7vw,52px) + max(8px,1.5vw) + 12px));
			background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
		">
			<div style="display: flex; flex-direction: column;">
				<span style="color: #fb923c; font-size: 20px; font-weight: 700;">
					${state.score.toLocaleString()}
				</span>
				<span style="color: #6b7280; font-size: 15px;">
					HI ${state.hiScore.toLocaleString()}
				</span>
			</div>
			<div style="text-align: center;">
				<div style="color: #fb923c; font-size: 11px; font-weight: 700; letter-spacing: 2px;">
					${lvlName}
				</div>
				${
					state.phase === "boss" ||
					state.phase === "transition"
						? `<div style="color: #f87171; font-size: 10px; animation: pulse 1s infinite;">⚠ BOSS</div>`
						: ""
				}
			</div>
			<div style="text-align: right; font-size: 20px;">
				${lives}
			</div>
		</div>

		<!-- Bottom bar -->
		<div style="
			position: absolute; bottom: 0; left: 0; right: 0;
			display: flex; align-items: flex-end; justify-content: space-between;
			padding: 6px 12px;
			background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
		">
			<!-- Fire level -->
			<div style="display: flex; flex-direction: column;">
				<span style="color: #f97316; font-size: 15px; text-transform: uppercase; letter-spacing: 1px;">
					Fire
				</span>
				<span style="color: #facc15; font-size: 18px;">
					${fireStars}
				</span>
			</div>

			<!-- Combo meter -->
			<div style="display: flex; flex-direction: column; align-items: center;">
				${
					state.combo > 1
						? `
				<div style="font-weight: 900; font-size: 13px; margin-bottom: 2px; color: ${comboColor};">
					${state.combo}x COMBO
				</div>
				<div style="width: 90px; height: 6px; background: #1f2937; border-radius: 3px; overflow: hidden;">
					<div style="height: 100%; border-radius: 3px; background: ${comboColor}; width: ${Math.round(comboFrac * 100)}%;"></div>
				</div>
				`
						: `<div style="height: 26px;"></div>`
				}
			</div>

			<!-- Active power-ups -->
			<div style="display: flex; gap: 4px; font-size: 20px;">
				${powerIcons}
			</div>
		</div>

		<!-- Streak / Frenzy badge — sous la topbar à droite -->
		${
			state.killStreak >= 3 || state.frenzyMode
				? `
			<div style="
				position:absolute;top:44px;right:10px;z-index:50;
				font-family:monospace;font-size:12px;
				color:${state.frenzyMode ? "#ff2200" : "#ff8800"};
				font-weight:900;
				${state.frenzyMode ? "animation:streakPulse 0.4s infinite;" : ""}
				background:rgba(0,0,0,0.82);padding:3px 8px;border-radius:6px;
				border:1px solid ${state.frenzyMode ? "#ff2200" : "#ff5500"};
				pointer-events:none;white-space:nowrap;
			">
				${state.frenzyMode ? "🔥 FRENZY x2 " + Math.ceil(state.frenzyTimer) + "s" : "🔥 STREAK " + state.killStreak + "/" + (state.streakThreshold || 10)}
			</div>
		`
				: ""
		}

		<!-- Badge mode Survie / Daily — centré sous la topbar -->
		${
			state.isSurvival && state.phase !== "boss"
				? `
			<div style="
				position:absolute;top:44px;left:0;right:0;
				display:flex;justify-content:center;
				pointer-events:none;z-index:50;
			">
				<div style="
					font-family:monospace;font-size:11px;color:#ffaa00;
					font-weight:900;background:rgba(0,0,0,0.75);
					padding:2px 9px;border-radius:6px;border:1px solid #ffaa00;
					white-space:nowrap;
				">💀 VAGUE ${state.survivalWave} — BEST: ${survivalData.getBest()}</div>
			</div>
`
				: ""
		}

	</div>
`;

			const fullHtml = html;

			if (fullHtml !== lastHudRender) {
				lastHudRender = fullHtml;
				ui.render(fullHtml, false);
			}
		},
	}; // end self

	return self;
}

const LEVELS = [
	{
		name: "Volcanic Rift",
		bgSpeed: 80,
		bgColors: ["#1a0400", "#2d0a00", "#3d1200"],
		bossTime: 45,
		enemyGroups: [
			{
				time: 30,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			// { time, type, count, formation }
			{
				time: 3,
				type: "drone",
				count: 3,
				formation: "line-v",
			},
			{
				time: 8,
				type: "drone",
				count: 2,
				formation: "line-v",
			},
			{
				time: 12,
				type: "turret",
				count: 2,
				formation: "top-bottom",
			},
			{
				time: 16,
				type: "drone",
				count: 4,
				formation: "wave",
			},
			{
				time: 20,
				type: "kamikaze",
				count: 3,
				formation: "random",
			},
			{
				time: 24,
				type: "turret",
				count: 3,
				formation: "spread",
			},
			{
				time: 28,
				type: "drone",
				count: 5,
				formation: "v-shape",
			},
			{
				time: 32,
				type: "kamikaze",
				count: 4,
				formation: "wave",
			},
			{
				time: 36,
				type: "turret",
				count: 4,
				formation: "spread",
			},
			{
				time: 40,
				type: "drone",
				count: 6,
				formation: "v-shape",
			},
			{
				time: 25,
				type: "interceptor",
				count: 1,
				formation: "random",
			},
			{
				time: 35,
				type: "interceptor",
				count: 2,
				formation: "wave",
			},
			{
				time: 42,
				type: "carrier",
				count: 1,
				formation: "random",
			},
		],
		boss: {
			name: "MOLTEN COLOSSUS",
			type: "colossus",
			hp: 280,
			color: "#cc3300",
			coreColor: "#ff6600",
			w: 110,
			h: 90,
		},
	},
	{
		name: "Inferno Depths",
		bgSpeed: 100,
		bgColors: ["#0a0020", "#160040", "#220060"],
		bossTime: 55,
		enemyGroups: [
			{
				time: 25,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 45,
				type: "shielder",
				count: 2,
				formation: "top-bottom",
			},
			{
				time: 15,
				type: "interceptor",
				count: 2,
				formation: "wave",
			},
			{
				time: 38,
				type: "carrier",
				count: 1,
				formation: "random",
			},
			{
				time: 2,
				type: "drone",
				count: 4,
				formation: "v-shape",
			},
			{
				time: 6,
				type: "kamikaze",
				count: 3,
				formation: "wave",
			},
			{
				time: 10,
				type: "turret",
				count: 3,
				formation: "spread",
			},
			{
				time: 14,
				type: "drone",
				count: 5,
				formation: "wave",
			},
			{
				time: 18,
				type: "kamikaze",
				count: 5,
				formation: "random",
			},
			{
				time: 22,
				type: "turret",
				count: 4,
				formation: "top-bottom",
			},
			{
				time: 26,
				type: "drone",
				count: 6,
				formation: "v-shape",
			},
			{
				time: 30,
				type: "kamikaze",
				count: 5,
				formation: "wave",
			},
			{
				time: 34,
				type: "turret",
				count: 5,
				formation: "spread",
			},
			{
				time: 38,
				type: "drone",
				count: 7,
				formation: "wave",
			},
			{
				time: 42,
				type: "kamikaze",
				count: 6,
				formation: "v-shape",
			},
			{
				time: 46,
				type: "turret",
				count: 5,
				formation: "random",
			},
		],
		boss: {
			name: "SHADOW LEVIATHAN",
			type: "leviathan",
			hp: 420,
			color: "#220066",
			coreColor: "#aa00ff",
			w: 130,
			h: 100,
		},
	},
	{
		name: "Solar Core",
		bgSpeed: 120,
		bgColors: ["#200000", "#400010", "#600020"],
		bossTime: 65,
		enemyGroups: [
			{
				time: 20,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 45,
				type: "shielder",
				count: 1,
				formation: "top-bottom",
			},
			{
				time: 2,
				type: "drone",
				count: 5,
				formation: "v-shape",
			},
			{
				time: 10,
				type: "interceptor",
				count: 2,
				formation: "line-v",
			},
			{
				time: 28,
				type: "interceptor",
				count: 3,
				formation: "wave",
			},
			{
				time: 45,
				type: "carrier",
				count: 1,
				formation: "random",
			},
			{
				time: 5,
				type: "kamikaze",
				count: 4,
				formation: "wave",
			},
			{
				time: 8,
				type: "turret",
				count: 4,
				formation: "spread",
			},
			{
				time: 12,
				type: "drone",
				count: 6,
				formation: "wave",
			},
			{
				time: 15,
				type: "kamikaze",
				count: 5,
				formation: "random",
			},
			{
				time: 18,
				type: "turret",
				count: 5,
				formation: "top-bottom",
			},
			{
				time: 22,
				type: "drone",
				count: 7,
				formation: "v-shape",
			},
			{
				time: 26,
				type: "kamikaze",
				count: 6,
				formation: "wave",
			},
			{
				time: 30,
				type: "turret",
				count: 5,
				formation: "spread",
			},
			{
				time: 35,
				type: "drone",
				count: 8,
				formation: "wave",
			},
			{
				time: 40,
				type: "kamikaze",
				count: 7,
				formation: "random",
			},
			{
				time: 45,
				type: "turret",
				count: 6,
				formation: "spread",
			},
			{
				time: 50,
				type: "drone",
				count: 8,
				formation: "v-shape",
			},
			{
				time: 55,
				type: "kamikaze",
				count: 8,
				formation: "wave",
			},
		],
		boss: {
			name: "SOLAR TYRANT",
			type: "tyrant",
			hp: 600,
			color: "#882200",
			coreColor: "#ffff00",
			w: 150,
			h: 120,
		},
	},
	{
		name: "Toxic Nebula",
		bgSpeed: 135,
		bgColors: ["#001a00", "#003300", "#001a0a"],
		bossTime: 70,
		enemyGroups: [
			{
				time: 2,
				type: "drone",
				count: 5,
				formation: "v-shape",
			},
			{
				time: 15,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 35,
				type: "shielder",
				count: 2,
				formation: "spread",
			},
			{
				time: 55,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 5,
				type: "kamikaze",
				count: 5,
				formation: "wave",
			},
			{
				time: 9,
				type: "turret",
				count: 4,
				formation: "spread",
			},
			{
				time: 13,
				type: "drone",
				count: 7,
				formation: "wave",
			},
			{
				time: 17,
				type: "kamikaze",
				count: 6,
				formation: "random",
			},
			{
				time: 21,
				type: "turret",
				count: 5,
				formation: "top-bottom",
			},
			{
				time: 25,
				type: "drone",
				count: 8,
				formation: "v-shape",
			},
			{
				time: 29,
				type: "kamikaze",
				count: 7,
				formation: "wave",
			},
			{
				time: 33,
				type: "turret",
				count: 6,
				formation: "spread",
			},
			{
				time: 38,
				type: "drone",
				count: 9,
				formation: "wave",
			},
			{
				time: 43,
				type: "kamikaze",
				count: 8,
				formation: "v-shape",
			},
			{
				time: 48,
				type: "turret",
				count: 7,
				formation: "random",
			},
			{
				time: 53,
				type: "drone",
				count: 9,
				formation: "v-shape",
			},
			{
				time: 58,
				type: "kamikaze",
				count: 9,
				formation: "wave",
			},
			{
				time: 63,
				type: "turret",
				count: 7,
				formation: "spread",
			},
			{
				time: 10,
				type: "interceptor",
				count: 2,
				formation: "wave",
			},
			{
				time: 20,
				type: "interceptor",
				count: 3,
				formation: "v-shape",
			},
			{
				time: 32,
				type: "carrier",
				count: 1,
				formation: "random",
			},
			{
				time: 45,
				type: "interceptor",
				count: 4,
				formation: "wave",
			},
			{
				time: 55,
				type: "carrier",
				count: 2,
				formation: "spread",
			},
		],
		boss: {
			name: "VENOM HYDRA",
			type: "hydra",
			hp: 750,
			color: "#004400",
			coreColor: "#00ff88",
			w: 155,
			h: 125,
		},
	},
	{
		name: "Crystal Abyss",
		bgSpeed: 150,
		bgColors: ["#000d1a", "#001433", "#000a22"],
		bossTime: 75,
		enemyGroups: [
			{
				time: 2,
				type: "drone",
				count: 6,
				formation: "v-shape",
			},
			{
				time: 10,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 28,
				type: "shielder",
				count: 2,
				formation: "top-bottom",
			},
			{
				time: 50,
				type: "shielder",
				count: 2,
				formation: "spread",
			},
			{
				time: 65,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 5,
				type: "kamikaze",
				count: 5,
				formation: "wave",
			},
			{
				time: 8,
				type: "turret",
				count: 5,
				formation: "spread",
			},
			{
				time: 12,
				type: "drone",
				count: 8,
				formation: "wave",
			},
			{
				time: 16,
				type: "kamikaze",
				count: 7,
				formation: "random",
			},
			{
				time: 20,
				type: "turret",
				count: 6,
				formation: "top-bottom",
			},
			{
				time: 24,
				type: "drone",
				count: 9,
				formation: "v-shape",
			},
			{
				time: 28,
				type: "kamikaze",
				count: 8,
				formation: "wave",
			},
			{
				time: 32,
				type: "turret",
				count: 7,
				formation: "spread",
			},
			{
				time: 37,
				type: "drone",
				count: 10,
				formation: "wave",
			},
			{
				time: 42,
				type: "kamikaze",
				count: 9,
				formation: "v-shape",
			},
			{
				time: 47,
				type: "turret",
				count: 8,
				formation: "random",
			},
			{
				time: 52,
				type: "drone",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 57,
				type: "kamikaze",
				count: 10,
				formation: "wave",
			},
			{
				time: 62,
				type: "turret",
				count: 8,
				formation: "spread",
			},
			{
				time: 67,
				type: "drone",
				count: 10,
				formation: "wave",
			},
			{
				time: 7,
				type: "interceptor",
				count: 2,
				formation: "wave",
			},
			{
				time: 18,
				type: "interceptor",
				count: 3,
				formation: "v-shape",
			},
			{
				time: 30,
				type: "carrier",
				count: 1,
				formation: "random",
			},
			{
				time: 40,
				type: "interceptor",
				count: 4,
				formation: "wave",
			},
			{
				time: 50,
				type: "carrier",
				count: 2,
				formation: "spread",
			},
			{
				time: 60,
				type: "interceptor",
				count: 4,
				formation: "v-shape",
			},
		],
		boss: {
			name: "ICE WRAITH",
			type: "wraith",
			hp: 900,
			color: "#002244",
			coreColor: "#00ccff",
			w: 160,
			h: 130,
		},
	},
	{
		name: "Phantom Void",
		bgSpeed: 165,
		bgColors: ["#04000d", "#07001a", "#020008"],
		bossTime: 80,
		enemyGroups: [
			{
				time: 2,
				type: "drone",
				count: 6,
				formation: "v-shape",
			},
			{
				time: 12,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 30,
				type: "shielder",
				count: 2,
				formation: "spread",
			},
			{
				time: 55,
				type: "shielder",
				count: 2,
				formation: "top-bottom",
			},
			{
				time: 70,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 5,
				type: "kamikaze",
				count: 6,
				formation: "wave",
			},
			{
				time: 8,
				type: "turret",
				count: 5,
				formation: "spread",
			},
			{
				time: 11,
				type: "drone",
				count: 8,
				formation: "wave",
			},
			{
				time: 15,
				type: "kamikaze",
				count: 8,
				formation: "random",
			},
			{
				time: 19,
				type: "turret",
				count: 6,
				formation: "top-bottom",
			},
			{
				time: 23,
				type: "drone",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 27,
				type: "kamikaze",
				count: 9,
				formation: "wave",
			},
			{
				time: 31,
				type: "turret",
				count: 7,
				formation: "spread",
			},
			{
				time: 35,
				type: "drone",
				count: 10,
				formation: "wave",
			},
			{
				time: 39,
				type: "kamikaze",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 43,
				type: "turret",
				count: 8,
				formation: "random",
			},
			{
				time: 48,
				type: "drone",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 53,
				type: "kamikaze",
				count: 10,
				formation: "wave",
			},
			{
				time: 58,
				type: "turret",
				count: 9,
				formation: "spread",
			},
			{
				time: 63,
				type: "drone",
				count: 10,
				formation: "wave",
			},
			{
				time: 68,
				type: "kamikaze",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 10,
				type: "interceptor",
				count: 3,
				formation: "wave",
			},
			{
				time: 22,
				type: "carrier",
				count: 1,
				formation: "random",
			},
			{
				time: 34,
				type: "interceptor",
				count: 4,
				formation: "v-shape",
			},
			{
				time: 46,
				type: "carrier",
				count: 2,
				formation: "spread",
			},
			{
				time: 60,
				type: "interceptor",
				count: 5,
				formation: "wave",
			},
			{
				time: 65,
				type: "carrier",
				count: 2,
				formation: "random",
			},
		],
		boss: {
			name: "VOID HERALD",
			type: "herald",
			hp: 1100,
			color: "#110033",
			coreColor: "#cc00ff",
			w: 165,
			h: 135,
		},
	},
	{
		name: "Omega Fortress",
		bgSpeed: 180,
		bgColors: ["#0d0000", "#1a0000", "#110000"],
		bossTime: 90,
		enemyGroups: [
			{
				time: 2,
				type: "drone",
				count: 7,
				formation: "v-shape",
			},
			{
				time: 10,
				type: "shielder",
				count: 1,
				formation: "random",
			},
			{
				time: 25,
				type: "shielder",
				count: 2,
				formation: "spread",
			},
			{
				time: 45,
				type: "shielder",
				count: 2,
				formation: "top-bottom",
			},
			{
				time: 65,
				type: "shielder",
				count: 3,
				formation: "spread",
			},
			{
				time: 80,
				type: "shielder",
				count: 2,
				formation: "random",
			},
			{
				time: 5,
				type: "kamikaze",
				count: 6,
				formation: "wave",
			},
			{
				time: 8,
				type: "turret",
				count: 6,
				formation: "spread",
			},
			{
				time: 11,
				type: "drone",
				count: 9,
				formation: "wave",
			},
			{
				time: 14,
				type: "kamikaze",
				count: 8,
				formation: "random",
			},
			{
				time: 18,
				type: "turret",
				count: 7,
				formation: "top-bottom",
			},
			{
				time: 22,
				type: "drone",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 26,
				type: "kamikaze",
				count: 9,
				formation: "wave",
			},
			{
				time: 30,
				type: "turret",
				count: 8,
				formation: "spread",
			},
			{
				time: 34,
				type: "drone",
				count: 10,
				formation: "wave",
			},
			{
				time: 38,
				type: "kamikaze",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 42,
				type: "turret",
				count: 9,
				formation: "random",
			},
			{
				time: 46,
				type: "drone",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 50,
				type: "kamikaze",
				count: 10,
				formation: "wave",
			},
			{
				time: 54,
				type: "turret",
				count: 10,
				formation: "spread",
			},
			{
				time: 58,
				type: "drone",
				count: 10,
				formation: "wave",
			},
			{
				time: 62,
				type: "kamikaze",
				count: 10,
				formation: "v-shape",
			},
			{
				time: 66,
				type: "turret",
				count: 10,
				formation: "random",
			},
			{
				time: 70,
				type: "drone",
				count: 10,
				formation: "wave",
			},
			{
				time: 74,
				type: "kamikaze",
				count: 10,
				formation: "wave",
			},
			{
				time: 7,
				type: "interceptor",
				count: 3,
				formation: "wave",
			},
			{
				time: 16,
				type: "carrier",
				count: 1,
				formation: "random",
			},
			{
				time: 24,
				type: "interceptor",
				count: 4,
				formation: "v-shape",
			},
			{
				time: 36,
				type: "carrier",
				count: 2,
				formation: "spread",
			},
			{
				time: 48,
				type: "interceptor",
				count: 5,
				formation: "wave",
			},
			{
				time: 60,
				type: "carrier",
				count: 2,
				formation: "random",
			},
			{
				time: 68,
				type: "interceptor",
				count: 5,
				formation: "v-shape",
			},
			{
				time: 72,
				type: "carrier",
				count: 3,
				formation: "wave",
			},
		],
		boss: {
			name: "OMEGA DREADNOUGHT",
			type: "dreadnought",
			hp: 1400,
			color: "#330000",
			coreColor: "#ff2200",
			w: 180,
			h: 145,
		},
	},
];

function createRenderer(ctx, toolsRef) {
	// ── Eagle sprite (SVG base64) ──────────────────────────────────────
	const _eagleImg = new Image();
	_eagleImg.src =
		"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNjAgMTEwIiB3aWR0aD0iMTYwIiBoZWlnaHQ9IjExMCI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImJvZHlHIiBjeD0iNTAlIiBjeT0iNTUlIiByPSI1MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiAgIHN0b3AtY29sb3I9IiNmZjk5MDAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI0MCUiICBzdG9wLWNvbG9yPSIjZmY0NDAwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2NjMTEwMCIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICAgIDxsaW5lYXJHcmFkaWVudCBpZD0id2luZ0xHIiB4MT0iMTAwJSIgeTE9IjEwMCUiIHgyPSIwJSIgeTI9IjAlIj4KICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgICBzdG9wLWNvbG9yPSIjY2MxMTAwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMzUlIiAgc3RvcC1jb2xvcj0iI2ZmNDQwMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjY1JSIgIHN0b3AtY29sb3I9IiNmZjg4MDAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmZkZDQ0Ii8+CiAgICA8L2xpbmVhckdyYWRpZW50PgogICAgPGxpbmVhckdyYWRpZW50IGlkPSJ3aW5nUkciIHgxPSIwJSIgeTE9IjEwMCUiIHgyPSIxMDAlIiB5Mj0iMCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiAgIHN0b3AtY29sb3I9IiNjYzExMDAiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIzNSUiICBzdG9wLWNvbG9yPSIjZmY0NDAwIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iNjUlIiAgc3RvcC1jb2xvcj0iI2ZmODgwMCIvPgogICAgICA8c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNmZmRkNDQiLz4KICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9Imdsb3dHIiBjeD0iNTAlIiBjeT0iNTAlIiByPSI1MCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiAgc3RvcC1jb2xvcj0iI2ZmY2MwMCIgc3RvcC1vcGFjaXR5PSIwLjQiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjZmY0NDAwIiBzdG9wLW9wYWNpdHk9IjAiLz4KICAgIDwvcmFkaWFsR3JhZGllbnQ+CiAgPC9kZWZzPgoKICA8IS0tIEhhbG8gY2VudHJhbCAtLT4KICA8ZWxsaXBzZSBjeD0iODAiIGN5PSI2MCIgcng9IjM4IiByeT0iMzIiIGZpbGw9InVybCgjZ2xvd0cpIi8+CgogIDwhLS0gPT09IEFJTEUgR0FVQ0hFIChwb2ludGUgdmVycyBoYXV0LWdhdWNoZSkgPT09IC0tPgogIDwhLS0gUGx1bWVzIHByaW1haXJlcyBsb25ndWVzIC0tPgogIDxwYXRoIGQ9Ik03Miw1MiBRNDgsMjggMTgsOCBRMjgsMTggMzUsMzAgUTIwLDIyIDE0LDM0IFEyNiwyOCAzMiw0MCBRMTYsMzYgMTIsNTAgUTI2LDQyIDM0LDUyIFEyMCw1MiAxOCw2NCBRMzAsNTYgMzgsNTgiIGZpbGw9InVybCgjd2luZ0xHKSIgb3BhY2l0eT0iMC45NSIvPgogIDwhLS0gUGx1bWVzIHNlY29uZGFpcmVzIChjb3V2ZXJ0dXJlcykgLS0+CiAgPHBhdGggZD0iTTcyLDUyIFE1NSwzOCA0MCwzMCBRNTAsMzYgNTUsNDYgUTQ0LDM4IDQwLDUwIFE1MCw0NCA1NSw1NCBRNDYsNTAgNDQsNjAgUTU0LDU0IDYwLDU4IiBmaWxsPSIjZGQzMzAwIiBvcGFjaXR5PSIwLjg1Ii8+CiAgPCEtLSBQb2ludGUgc3Vww6lyaWV1cmUgYWlsZSBnYXVjaGUgLS0+CiAgPHBhdGggZD0iTTcyLDUwIFE1NiwyMiAzNiw0IFE0NCwxNCA0OCwyNiBRMzgsMTYgMzYsMjggUTQ0LDIyIDQ4LDM0IiBmaWxsPSIjZmY5OTAwIiBvcGFjaXR5PSIwLjciLz4KCiAgPCEtLSA9PT0gQUlMRSBEUk9JVEUgKHBvaW50ZSB2ZXJzIGhhdXQtZHJvaXRlKSA9PT0gLS0+CiAgPHBhdGggZD0iTTg4LDUyIFExMTIsMjggMTQyLDggUTEzMiwxOCAxMjUsMzAgUTE0MCwyMiAxNDYsMzQgUTEzNCwyOCAxMjgsNDAgUTE0NCwzNiAxNDgsNTAgUTEzNCw0MiAxMjYsNTIgUTE0MCw1MiAxNDIsNjQgUTEzMCw1NiAxMjIsNTgiIGZpbGw9InVybCgjd2luZ1JHKSIgb3BhY2l0eT0iMC45NSIvPgogIDxwYXRoIGQ9Ik04OCw1MiBRMTA1LDM4IDEyMCwzMCBRMTEwLDM2IDEwNSw0NiBRMTE2LDM4IDEyMCw1MCBRMTEwLDQ0IDEwNSw1NCBRMTE0LDUwIDExNiw2MCBRMTA2LDU0IDEwMCw1OCIgZmlsbD0iI2RkMzMwMCIgb3BhY2l0eT0iMC44NSIvPgogIDxwYXRoIGQ9Ik04OCw1MCBRMTA0LDIyIDEyNCw0IFExMTYsMTQgMTEyLDI2IFExMjIsMTYgMTI0LDI4IFExMTYsMjIgMTEyLDM0IiBmaWxsPSIjZmY5OTAwIiBvcGFjaXR5PSIwLjciLz4KCiAgPCEtLSA9PT0gUVVFVUUgLyBQTFVNRVMgREUgRkVVIHZlcnMgbGUgYmFzID09PSAtLT4KICA8cGF0aCBkPSJNNzQsNzggUTYwLDkwIDUyLDEwOCBRNTgsOTQgNjIsODQiIGZpbGw9IiNmZjU1MDAiIG9wYWNpdHk9IjAuOCIvPgogIDxwYXRoIGQ9Ik03Niw4MCBRNjYsOTYgNjIsMTEyIFE2OCw5NiA3Miw4NiIgZmlsbD0iI2ZmNzcwMCIgb3BhY2l0eT0iMC43NSIvPgogIDxwYXRoIGQ9Ik04MCw4MiBRNzgsMTAwIDc0LDExNCBRODAsMTAwIDgyLDg4IiBmaWxsPSIjZmZhYTAwIiBvcGFjaXR5PSIwLjciLz4KICA8cGF0aCBkPSJNODQsODAgUTkyLDk2IDk2LDExMiBROTAsOTYgODYsODYiIGZpbGw9IiNmZjc3MDAiIG9wYWNpdHk9IjAuNzUiLz4KICA8cGF0aCBkPSJNODYsNzggUTk4LDkwIDEwNiwxMDggUTEwMCw5NCA5Niw4NCIgZmlsbD0iI2ZmNTUwMCIgb3BhY2l0eT0iMC44Ii8+CgogIDwhLS0gPT09IENPUlBTIENFTlRSQUwgPT09IC0tPgogIDxwYXRoIGQ9Ik03Miw0OCBRNzYsNDIgODAsNDAgUTg0LDQyIDg4LDQ4IFE5MCw1OCA4OCw2OCBRODQsNzYgODAsNzggUTc2LDc2IDcyLDY4IFE3MCw1OCA3Miw0OCBaIiBmaWxsPSJ1cmwoI2JvZHlHKSIvPgoKICA8IS0tID09PSBTRVJSRVMgKGRldXggcGF0dGVzIHRlbmR1ZXMgdmVycyBsJ2F2YW50LWJhcykgPT09IC0tPgogIDwhLS0gUGF0dGUgZ2F1Y2hlIC0tPgogIDxwYXRoIGQ9Ik03Niw3MCBRNjgsNzggNjIsODYiIHN0cm9rZT0iI2NjNDQwMCIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNNjIsODYgUTU0LDkwIDUwLDk2IiBzdHJva2U9IiNjYzQ0MDAiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHBhdGggZD0iTTYyLDg2IFE1Niw5NCA1NCwxMDIiIHN0cm9rZT0iI2NjNDQwMCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNNjIsODYgUTYyLDk2IDYwLDEwNCIgc3Ryb2tlPSIjY2M0NDAwIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwhLS0gUGF0dGUgZHJvaXRlIC0tPgogIDxwYXRoIGQ9Ik04NCw3MCBROTIsNzggOTgsODYiIHN0cm9rZT0iI2NjNDQwMCIgc3Ryb2tlLXdpZHRoPSIzIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNOTgsODYgUTEwNiw5MCAxMTAsOTYiIHN0cm9rZT0iI2NjNDQwMCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8cGF0aCBkPSJNOTgsODYgUTEwNCw5NCAxMDYsMTAyIiBzdHJva2U9IiNjYzQ0MDAiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHBhdGggZD0iTTk4LDg2IFE5OCw5NiAxMDAsMTA0IiBzdHJva2U9IiNjYzQ0MDAiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CgogIDwhLS0gPT09IFTDilRFID09PSAtLT4KICA8ZWxsaXBzZSBjeD0iODAiIGN5PSI0MCIgcng9IjEwIiByeT0iOSIgZmlsbD0iI2ZmNjYwMCIvPgogIDwhLS0gUGx1bWVzIGRlIHTDqnRlL2Nyw6p0ZSAtLT4KICA8cGF0aCBkPSJNNzYsMzQgUTcyLDI0IDY4LDE2IFE3NCwyNiA3OCwzMiIgZmlsbD0iI2ZmODgwMCIgb3BhY2l0eT0iMC45Ii8+CiAgPHBhdGggZD0iTTgwLDMyIFE4MCwyMCA4MCwxMiBRODEsMjIgODIsMzAiIGZpbGw9IiNmZmFhMDAiIG9wYWNpdHk9IjAuODUiLz4KICA8cGF0aCBkPSJNODQsMzQgUTg4LDI0IDkyLDE2IFE4NiwyNiA4MiwzMiIgZmlsbD0iI2ZmODgwMCIgb3BhY2l0eT0iMC45Ii8+CgogIDwhLS0gQmVjIGNyb2NodSAtLT4KICA8cGF0aCBkPSJNNzUsNDIgUTY4LDQ0IDY2LDQ4IFE3MCw0NiA3NSw0NCBRNzIsNDggNzAsNTIgUTc0LDQ5IDc2LDQ2IiBmaWxsPSIjZmZjYzAwIi8+CgogIDwhLS0gxZJpbCAtLT4KICA8Y2lyY2xlIGN4PSI3NiIgY3k9IjM5IiByPSIzLjUiIGZpbGw9IiNmZmYwY2MiLz4KICA8Y2lyY2xlIGN4PSI3NiIgY3k9IjM5IiByPSIyLjAiIGZpbGw9IiNjYzIyMDAiLz4KICA8Y2lyY2xlIGN4PSI3NyIgY3k9IjM4IiByPSIwLjkiIGZpbGw9IiMxMTAwMDAiLz4KICA8Y2lyY2xlIGN4PSI3NC41IiBjeT0iMzcuNSIgcj0iMC44IiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuOSkiLz4KCiAgPCEtLSBSZWZsZXRzIGx1bWluZXV4IHN1ciBhaWxlcyAtLT4KICA8cGF0aCBkPSJNNTUsMzAgUTQ1LDIwIDMyLDEyIiBzdHJva2U9InJnYmEoMjU1LDIwMCw1MCwwLjM1KSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CiAgPHBhdGggZD0iTTYwLDM4IFE1MCwzMCA0MCwyNCIgc3Ryb2tlPSJyZ2JhKDI1NSwyMDAsNTAsMC4zKSIgc3Ryb2tlLXdpZHRoPSIxLjUiIGZpbGw9Im5vbmUiLz4KICA8cGF0aCBkPSJNMTA1LDMwIFExMTUsMjAgMTI4LDEyIiBzdHJva2U9InJnYmEoMjU1LDIwMCw1MCwwLjM1KSIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+CiAgPHBhdGggZD0iTTEwMCwzOCBRMTEwLDMwIDEyMCwyNCIgc3Ryb2tlPSJyZ2JhKDI1NSwyMDAsNTAsMC4zKSIgc3Ryb2tlLXdpZHRoPSIxLjUiIGZpbGw9Im5vbmUiLz4KPC9zdmc+Cg==";
	let _eagleReady = false;
	_eagleImg.onload = () => {
		_eagleReady = true;
	};
	// Lit les dimensions en live depuis tools pour supporter le resize
	const stars = Array.from({ length: 80 }, () => ({
		x: Math.random() * toolsRef.width,
		y: Math.random() * toolsRef.height,
		r: 0.5 + Math.random() * 2,
		speed: 0.3 + Math.random() * 0.7,
		bright: Math.random(),
	}));

	const rockPoints = Array.from({ length: 12 }, (_, i) => ({
		yTop: Math.random() * 0.15 + 0.02,
		yBot: Math.random() * 0.15 + 0.02,
		freq: 0.005 + Math.random() * 0.015,
		phase: Math.random() * Math.PI * 2,
	}));

	return {
		drawBackground(bgOffset, level, phase, transitionTimer) {
			const lvl = LEVELS[level] || LEVELS[0];
			const [c0, c1, c2] = lvl.bgColors;

			// Sky gradient
			const grad = ctx.createLinearGradient(
				0,
				0,
				0,
				toolsRef.height,
			);
			grad.addColorStop(0, c0);
			grad.addColorStop(0.5, c1);
			grad.addColorStop(1, c2);
			ctx.fillStyle = grad;
			ctx.fillRect(0, 0, toolsRef.width, toolsRef.height);

			// Stars / particles — sy clamped to current virtual height
			for (const s of stars) {
				const sx =
					(((s.x - bgOffset * s.speed * 0.15) %
						(toolsRef.width + 10)) +
						toolsRef.width +
						10) %
					(toolsRef.width + 10);
				const sy = s.y % toolsRef.height;
				const alpha = 0.4 + s.bright * 0.6;
				ctx.globalAlpha = alpha;
				// Couleur des étoiles selon le décor du niveau
				const starColors = [
					"#ffddaa", // 0 Volcanic Rift   — orange
					"#aa88ff", // 1 Inferno Depths  — violet
					"#ffcc66", // 2 Solar Core      — jaune-or
					"#88ffcc", // 3 Toxic Nebula    — vert menthe
					"#88ddff", // 4 Crystal Abyss   — bleu glacier
					"#cc88ff", // 5 Phantom Void    — violet profond
					"#ff8888", // 6 Omega Fortress  — rouge acier
				];
				ctx.fillStyle = starColors[level] || "#ffddaa";
				ctx.beginPath();
				ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;

			// Lava / rock terrain (top and bottom)
			this._drawTerrain(bgOffset, level, lvl);

			// Transition overlay
			if (
				phase === "transition" &&
				transitionTimer !== undefined
			) {
				const alpha = Math.max(0, 1 - transitionTimer);
				ctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
				ctx.fillRect(0, 0, toolsRef.width, toolsRef.height);
			}
		},

		_drawTerrain(bgOffset, level, lvl) {
			const topH = 50,
				botH = 50;

			// Couleurs de terrain et de lueur par niveau
			const terrainPalette = [
				// 0 Volcanic Rift   — lave orange
				{ rock: "#441100", glow: "rgba(255,100,0,0.55)" },
				// 1 Inferno Depths  — magma violet
				{ rock: "#220044", glow: "rgba(160,0,255,0.45)" },
				// 2 Solar Core      — rouge solaire
				{ rock: "#330011", glow: "rgba(255,60,0,0.45)" },
				// 3 Toxic Nebula    — vert acide
				{ rock: "#002200", glow: "rgba(0,220,80,0.45)" },
				// 4 Crystal Abyss   — cyan glacial
				{ rock: "#001133", glow: "rgba(0,180,255,0.4)" },
				// 5 Phantom Void    — violet fantôme
				{ rock: "#0d001a", glow: "rgba(140,0,255,0.4)" },
				// 6 Omega Fortress  — rouge acier brûlant
				{ rock: "#220000", glow: "rgba(255,20,0,0.5)" },
			];
			const pal = terrainPalette[level] || terrainPalette[0];

			// Top rock
			ctx.beginPath();
			ctx.moveTo(0, 0);
			for (let x = 0; x <= toolsRef.width + 10; x += 4) {
				const t = (x + bgOffset) * 0.012;
				const y =
					topH *
					(0.4 +
						0.6 *
							(Math.sin(t) * 0.5 +
								Math.sin(t * 2.3) * 0.3 +
								Math.sin(t * 0.7) * 0.2));
				ctx.lineTo(x, y);
			}
			ctx.lineTo(toolsRef.width, 0);
			ctx.closePath();
			const rockGrad = ctx.createLinearGradient(
				0,
				0,
				0,
				topH,
			);
			rockGrad.addColorStop(0, "#111111");
			rockGrad.addColorStop(1, pal.rock);
			ctx.fillStyle = rockGrad;
			ctx.fill();

			// Lueur sur le bord supérieur
			for (let x = 0; x <= toolsRef.width; x += 80) {
				const t = (x + bgOffset) * 0.012;
				const y =
					topH *
					(0.4 +
						0.6 *
							(Math.sin(t) * 0.5 +
								Math.sin(t * 2.3) * 0.3 +
								Math.sin(t * 0.7) * 0.2));
				const g = ctx.createRadialGradient(
					x,
					y,
					0,
					x,
					y,
					25,
				);
				g.addColorStop(0, pal.glow);
				g.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = g;
				ctx.fillRect(x - 25, y - 10, 50, 35);
			}

			// Bottom rock
			ctx.beginPath();
			ctx.moveTo(0, toolsRef.height);
			for (let x = 0; x <= toolsRef.width + 10; x += 4) {
				const t = (x + bgOffset) * 0.014 + 5;
				const y =
					toolsRef.height -
					botH *
						(0.4 +
							0.6 *
								(Math.sin(t) * 0.5 +
									Math.sin(t * 1.7) * 0.3 +
									Math.sin(t * 0.9) * 0.2));
				ctx.lineTo(x, y);
			}
			ctx.lineTo(toolsRef.width, toolsRef.height);
			ctx.closePath();
			const rockGrad2 = ctx.createLinearGradient(
				0,
				toolsRef.height - botH,
				0,
				toolsRef.height,
			);
			rockGrad2.addColorStop(0, pal.rock);
			rockGrad2.addColorStop(1, "#111111");
			ctx.fillStyle = rockGrad2;
			ctx.fill();
		},

		drawPlayer(player, t, level, combo, rageMode) {
			if (!player) return;
			const { x, y } = player;
			const blinkOff =
				player.invincible && Math.sin(t * 18) > 0;
			if (blinkOff) return;
			// Combo visuel : teinte du vaisseau selon niveau de combo
			const _rage = rageMode || false;
			const _combo = combo || 0;
			// Halo du vaisseau uniquement en mode rage
			const _comboActive = _rage && _combo >= MAX_COMBO_RAGE;
			const _comboTintAlpha = _comboActive
				? Math.min(0.55, (_combo - 5) * 0.05 + 0.18)
				: 0;
			const _comboColor =
				_combo >= 12
					? [255, 50, 0]
					: _combo >= 8
						? [255, 150, 0]
						: [255, 220, 0];

			ctx.save();
			ctx.translate(x, y);

			const fw = player.w; // 36
			const fh = player.h; // 28
			const S = fw / 36;
			ctx.scale(S, S);

			// ── RAGE AURA — FLAMMES ───────────────────────────────────────
			if (_rage) {
				const rp = t;
				const flicker = 0.75 + Math.sin(rp * 13) * 0.25;

				// Outer fire glow — large orange halo
				const fg = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					38,
				);
				fg.addColorStop(
					0,
					`rgba(255,200,0,${0.45 * flicker})`,
				);
				fg.addColorStop(
					0.3,
					`rgba(255,100,0,${0.35 * flicker})`,
				);
				fg.addColorStop(
					0.6,
					`rgba(220,40,0,${0.2 * flicker})`,
				);
				fg.addColorStop(1, "rgba(180,0,0,0)");
				ctx.save();
				ctx.scale(1.5, 1);
				ctx.fillStyle = fg;
				ctx.beginPath();
				ctx.arc(0, 0, 38, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();

				// Flame tongues — 5 spikes radiating outward
				ctx.save();
				ctx.rotate(rp * 2.5);
				for (let fi = 0; fi < 5; fi++) {
					const fa = (fi / 5) * Math.PI * 2;
					const fl = 16 + Math.sin(rp * 8 + fi * 1.3) * 6;
					const fw2 = 5 + Math.sin(rp * 6 + fi) * 2;
					const fx = Math.cos(fa) * fl;
					const fy = Math.sin(fa) * fl;
					const fGrad = ctx.createRadialGradient(
						0,
						0,
						4,
						fx,
						fy,
						fl,
					);
					fGrad.addColorStop(
						0,
						`rgba(255,230,50,${0.9 * flicker})`,
					);
					fGrad.addColorStop(
						0.3,
						`rgba(255,120,0,${0.7 * flicker})`,
					);
					fGrad.addColorStop(
						0.7,
						`rgba(220,30,0,${0.3 * flicker})`,
					);
					fGrad.addColorStop(1, "rgba(150,0,0,0)");
					ctx.fillStyle = fGrad;
					ctx.beginPath();
					ctx.ellipse(
						fx * 0.6,
						fy * 0.6,
						fw2,
						fl * 0.55,
						fa,
						0,
						Math.PI * 2,
					);
					ctx.fill();
				}
				ctx.restore();

				// Inner hot core — white-yellow center
				const core = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					12,
				);
				core.addColorStop(
					0,
					`rgba(255,255,200,${0.8 * flicker})`,
				);
				core.addColorStop(
					0.4,
					`rgba(255,160,0,${0.6 * flicker})`,
				);
				core.addColorStop(1, "rgba(255,50,0,0)");
				ctx.fillStyle = core;
				ctx.beginPath();
				ctx.arc(0, 0, 12, 0, Math.PI * 2);
				ctx.fill();
			}

			// Flammes arrière — même famille de couleur que le bg du niveau, mais vives
			const trailPalettes = [
				// 0 Volcanic Rift  bg:#1a0400 rouge-brun  → rouge-orange vif
				{ c0: "#ff8800", c1: "#ff3300", c2: "#cc1100" },
				// 1 Inferno Depths bg:#0a0020 violet foncé → violet-magenta vif
				{ c0: "#ee44ff", c1: "#aa00ff", c2: "#6600cc" },
				// 2 Solar Core     bg:#200000 rouge foncé  → rouge-cramoisi vif
				{ c0: "#ff2200", c1: "#cc0000", c2: "#880000" },
				// 3 Toxic Nebula   bg:#001a00 vert foncé   → vert-lime vif
				{ c0: "#44ff44", c1: "#00cc00", c2: "#008800" },
				// 4 Crystal Abyss  bg:#000d1a bleu foncé   → bleu-cyan vif
				{ c0: "#44aaff", c1: "#0066ff", c2: "#0033cc" },
				// 5 Phantom Void   bg:#04000d violet-noir  → violet vif
				{ c0: "#cc44ff", c1: "#8800ff", c2: "#5500cc" },
			];
			const tp = trailPalettes[level] || trailPalettes[0];

			// Utility: draw a single feather
			// base (bx,by), tip (tx,ty), half-width hw, color
			function feather(bx, by, tx, ty, hw, col1, col2) {
				const dx = tx - bx,
					dy = ty - by;
				const len = Math.sqrt(dx * dx + dy * dy) || 1;
				const px = (-dy / len) * hw,
					py = (dx / len) * hw;
				ctx.beginPath();
				ctx.moveTo(bx, by);
				ctx.quadraticCurveTo(
					bx + px * 0.8,
					by + py * 0.8,
					tx,
					ty,
				);
				ctx.quadraticCurveTo(
					bx - px * 0.8,
					by - py * 0.8,
					bx,
					by,
				);
				ctx.closePath();
				const g = ctx.createLinearGradient(bx, by, tx, ty);
				g.addColorStop(0, col1);
				g.addColorStop(0.55, col2 || col1);
				g.addColorStop(1, "rgba(200,60,0,0.15)");
				ctx.fillStyle = g;
				ctx.fill();
			}

			// ── Wing beat animation ──────────────────────────────────────
			// wingAngle: 0 = mid, positive = up-stroke, negative = down-stroke
			const wingCycle = Math.sin(t * 7.0); // -1 … +1
			const wingAngle = wingCycle * 0.38; // radians
			// secondary oscillation for feather spread
			const fSpread = 0.08 + Math.abs(wingCycle) * 0.06;

			// ── AURA CIRCULAIRE LUMINEUSE (scale selon fireLevel) ─────────
			const ap = 0.88 + Math.sin(t * 4.8) * 0.12;
			// fireLevel 1→5 : aura invisible au niveau 1, visible à partir du niveau 2
			const fireLvl = player.fireLevel || 1;
			const fireScale =
				fireLvl <= 1 ? 0 : 0.5 + (fireLvl - 1) * 0.15;
			const fireAlpha =
				fireLvl <= 1 ? 0 : 0.5 + (fireLvl - 1) * 0.18;
			const crX = 38 * ap * fireScale;
			const crY = 22 * ap * fireScale;

			// Couche large : rayonnement rouge-orange
			const aura1 = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				1,
			);
			aura1.addColorStop(
				0,
				`rgba(255,200,80,${Math.min(0.95, 0.55 * fireAlpha)})`,
			);
			aura1.addColorStop(
				0.25,
				`rgba(255,120,0,${Math.min(0.9, 0.45 * fireAlpha)})`,
			);
			aura1.addColorStop(
				0.55,
				`rgba(200,40,0,${Math.min(0.6, 0.25 * fireAlpha)})`,
			);
			aura1.addColorStop(
				0.8,
				`rgba(140,10,0,${Math.min(0.3, 0.1 * fireAlpha)})`,
			);
			aura1.addColorStop(1, "rgba(100,0,0,0)");
			ctx.save();
			ctx.scale(crX * 1.6, crY * 1.6);
			ctx.fillStyle = aura1;
			ctx.beginPath();
			ctx.arc(0, 0, 1, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();

			// Couche intermédiaire : orange vif
			const aura2 = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				1,
			);
			aura2.addColorStop(
				0,
				`rgba(255,240,120,${Math.min(0.98, 0.65 * fireAlpha)})`,
			);
			aura2.addColorStop(
				0.4,
				`rgba(255,140,0,${Math.min(0.95, 0.5 * fireAlpha)})`,
			);
			aura2.addColorStop(
				0.75,
				`rgba(220,60,0,${Math.min(0.6, 0.25 * fireAlpha)})`,
			);
			aura2.addColorStop(1, "rgba(180,20,0,0)");
			ctx.save();
			ctx.scale(crX * 0.9, crY * 0.9);
			ctx.fillStyle = aura2;
			ctx.beginPath();
			ctx.arc(0, 0, 1, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();

			// Cœur : blanc-jaune très lumineux
			const aura3 = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				1,
			);
			aura3.addColorStop(0, "rgba(255,255,200,0.80)");
			aura3.addColorStop(0.5, "rgba(255,200,60,0.55)");
			aura3.addColorStop(1, "rgba(255,120,0,0)");
			ctx.save();
			ctx.scale(crX * 0.35, crY * 0.35);
			ctx.fillStyle = aura3;
			ctx.beginPath();
			ctx.arc(0, 0, 1, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();

			// ── FIRE TRAIL (behind body) ─────────────────────────────────
			for (let i = 0; i < 3; i++) {
				const td = i * 1.1;
				const tl = 14 + Math.sin(t * 9 + td) * 4;
				const tw = Math.sin(t * 7 + td * 1.5) * 3;
				ctx.beginPath();
				ctx.moveTo(-10, -4 + i * 4);
				ctx.quadraticCurveTo(
					-10 - tl * 0.5,
					-4 + i * 4 + tw,
					-10 - tl,
					-4 + i * 4 + tw * 0.3,
				);
				ctx.quadraticCurveTo(
					-10 - tl * 0.5,
					-4 + i * 4 + tw,
					-10,
					0 + i * 4,
				);
				ctx.closePath();
				const tg = ctx.createLinearGradient(
					-10,
					0,
					-10 - tl,
					0,
				);
				tg.addColorStop(0, i === 1 ? tp.c0 : tp.c1);
				tg.addColorStop(0.5, tp.c2);
				tg.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = tg;
				ctx.fill();
			}

			// ── WINGS (enflammées) ────────────────────────────────────────
			// Shoulder joints, wings sweep upward from body center
			for (const side of [-1, 1]) {
				ctx.save();
				ctx.translate(-4, side * 3);
				ctx.rotate(
					side * (-Math.PI * 0.55 + wingAngle * side),
				);

				// --- Glow at wing base ---
				const baseGlow = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					10,
				);
				baseGlow.addColorStop(0, "rgba(255,180,0,0.45)");
				baseGlow.addColorStop(0.6, "rgba(255,80,0,0.20)");
				baseGlow.addColorStop(1, "rgba(200,20,0,0)");
				ctx.fillStyle = baseGlow;
				ctx.beginPath();
				ctx.arc(0, 0, 10, 0, Math.PI * 2);
				ctx.fill();

				// --- Primary feathers with flames ---
				const primAngles = [
					0, 0.18, 0.36, 0.52, 0.66, 0.78,
				];
				const primLens = [22, 24, 23, 21, 18, 15];
				primAngles.forEach((a, i) => {
					const ang = a + fSpread * i * 0.3;
					const len = primLens[i];
					const tx = Math.cos(-ang) * len;
					const ty = Math.sin(-ang) * len;
					// Feather shaft — broader, fire-colored
					const hw = 3.2 - i * 0.25;
					const dx = tx,
						dy = ty;
					const dlen = Math.sqrt(dx * dx + dy * dy) || 1;
					const px = (-dy / dlen) * hw,
						py = (dx / dlen) * hw;
					ctx.beginPath();
					ctx.moveTo(0, 0);
					ctx.quadraticCurveTo(
						px * 0.9,
						py * 0.9,
						tx,
						ty,
					);
					ctx.quadraticCurveTo(
						-px * 0.9,
						-py * 0.9,
						0,
						0,
					);
					ctx.closePath();
					const fg = ctx.createLinearGradient(
						0,
						0,
						tx,
						ty,
					);
					fg.addColorStop(
						0,
						i < 2 ? "#ffcc00" : "#ff8800",
					);
					fg.addColorStop(
						0.3,
						i < 3 ? "#ff6600" : "#ff3300",
					);
					fg.addColorStop(0.7, "#cc1100");
					fg.addColorStop(1, "rgba(160,10,0,0.2)");
					ctx.fillStyle = fg;
					ctx.fill();

					// Flame licking off feather tip
					const flameLen =
						5 + Math.sin(t * 9 + i * 1.3) * 3;
					const flameW = Math.sin(t * 8 + i * 0.9) * 2;
					const fBase = 0.72; // start flame at 72% along feather
					const fbx = tx * fBase,
						fby = ty * fBase;
					ctx.beginPath();
					ctx.moveTo(fbx + px * 0.5, fby + py * 0.5);
					ctx.quadraticCurveTo(
						tx + (dx / dlen) * flameLen * 0.5 + flameW,
						ty + (dy / dlen) * flameLen * 0.5,
						tx + (dx / dlen) * flameLen,
						ty + (dy / dlen) * flameLen,
					);
					ctx.quadraticCurveTo(
						tx + (dx / dlen) * flameLen * 0.5 - flameW,
						ty + (dy / dlen) * flameLen * 0.5,
						fbx - px * 0.5,
						fby - py * 0.5,
					);
					ctx.closePath();
					const flg = ctx.createLinearGradient(
						fbx,
						fby,
						tx + (dx / dlen) * flameLen,
						ty + (dy / dlen) * flameLen,
					);
					flg.addColorStop(0, "rgba(255,200,0,0.9)");
					flg.addColorStop(0.4, "rgba(255,100,0,0.7)");
					flg.addColorStop(1, "rgba(200,30,0,0)");
					ctx.fillStyle = flg;
					ctx.fill();
				});

				// --- Secondary feathers (shorter, warmer at base) ---
				const secAngles = [-0.15, -0.3, -0.45, -0.58];
				const secLens = [14, 12, 10, 8];
				secAngles.forEach((a, i) => {
					const len = secLens[i];
					const tx = Math.cos(-a) * len;
					const ty = Math.sin(-a) * len;
					feather(
						0,
						0,
						tx,
						ty,
						3.5 - i * 0.3,
						i < 2 ? "#ff6600" : "#dd3300",
						"#881100",
					);
					// Small ember glow at secondary tips
					const eg = ctx.createRadialGradient(
						tx,
						ty,
						0,
						tx,
						ty,
						3,
					);
					eg.addColorStop(0, "rgba(255,180,0,0.5)");
					eg.addColorStop(1, "rgba(255,60,0,0)");
					ctx.fillStyle = eg;
					ctx.beginPath();
					ctx.arc(tx, ty, 3, 0, Math.PI * 2);
					ctx.fill();
				});

				// --- Wing covert (hot core at shoulder) ---
				ctx.beginPath();
				ctx.ellipse(-1, 0, 7, 3.5, -0.3, 0, Math.PI * 2);
				const covG = ctx.createRadialGradient(
					-1,
					0,
					0,
					-1,
					0,
					7,
				);
				covG.addColorStop(0, "#ffcc44");
				covG.addColorStop(0.5, "#ff5500");
				covG.addColorStop(1, "#881100");
				ctx.fillStyle = covG;
				ctx.fill();

				ctx.restore();
			}

			// ── BODY ─────────────────────────────────────────────────────
			// Teardrop body, wider at back, tapers to chest at right
			ctx.beginPath();
			ctx.moveTo(12, 0); // chest point
			ctx.bezierCurveTo(10, -6, -6, -8, -12, -3); // back-top
			ctx.bezierCurveTo(-14, 0, -14, 0, -12, 3); // tail base
			ctx.bezierCurveTo(-6, 8, 10, 6, 12, 0); // back-bottom
			ctx.closePath();
			const bodyG = ctx.createLinearGradient(-12, 0, 12, 0);
			bodyG.addColorStop(0, "#881100");
			bodyG.addColorStop(0.35, "#cc2200");
			bodyG.addColorStop(0.7, "#ff5500");
			bodyG.addColorStop(1, "#ff9900");
			ctx.fillStyle = bodyG;
			ctx.fill();

			// Body highlight (breast)
			ctx.beginPath();
			ctx.ellipse(4, -1, 6, 4, -0.3, 0, Math.PI * 2);
			ctx.fillStyle = "rgba(255,160,40,0.25)";
			ctx.fill();

			// ── TAIL FEATHERS ────────────────────────────────────────────
			const tailFan = [
				{ a: 0.25, l: 12 },
				{ a: 0.45, l: 14 },
				{ a: 0.65, l: 12 },
				{ a: -0.25, l: 12 },
				{ a: -0.45, l: 14 },
			];
			tailFan.forEach(({ a, l }, i) => {
				const wave = Math.sin(t * 6 + i * 0.8) * 0.05;
				const ang = Math.PI + a + wave;
				feather(
					-12,
					0,
					-12 + Math.cos(ang) * l,
					Math.sin(ang) * l,
					2.5,
					"#ff6600",
					"#cc2200",
				);
			});

			// ── TALONS (two legs, claws swept backward) ──────────────────
			[
				[4, 6],
				[8, 4],
			].forEach(([lx, ly], li) => {
				ctx.strokeStyle = "#cc4400";
				ctx.lineWidth = 1.8;
				ctx.lineCap = "round";
				// Upper leg angled backward
				ctx.beginPath();
				ctx.moveTo(lx, ly);
				ctx.lineTo(lx - 7, ly + 5);
				ctx.stroke();
				// 3 claws pointing backward
				[
					[-5, 2],
					[-4, 5],
					[-2, 6],
				].forEach(([cx, cy]) => {
					ctx.beginPath();
					ctx.moveTo(lx - 7, ly + 5);
					ctx.lineTo(lx - 7 + cx, ly + 5 + cy);
					ctx.stroke();
				});
			});

			// ── HEAD ─────────────────────────────────────────────────────
			ctx.beginPath();
			ctx.ellipse(13, -4, 6, 5, 0.2, 0, Math.PI * 2);
			const headG = ctx.createRadialGradient(
				13,
				-5,
				0,
				13,
				-4,
				6,
			);
			headG.addColorStop(0, "#ffaa22");
			headG.addColorStop(0.5, "#ff6600");
			headG.addColorStop(1, "#cc2200");
			ctx.fillStyle = headG;
			ctx.fill();

			// Head crest feathers
			[
				[14, -2, 16, -10],
				[13, -2, 14, -11],
				[12, -2, 11, -10],
			].forEach(([bx, by, tx, ty], i) =>
				feather(
					bx,
					by,
					tx,
					ty,
					1.2,
					i === 1 ? "#ffcc00" : "#ff8800",
					"#cc2200",
				),
			);

			// ── ŒEIL (croissant incliné, fidèle à l'image) ────────────────
			ctx.save();
			ctx.translate(13.5, -5.5);
			ctx.rotate(0.45);
			ctx.scale(0.75, 0.45);

			// ── HALO RAYONNANT (avant le scale pour ne pas l'écraser) ─────
			const pulse = 0.85 + Math.sin(t * 6.0) * 0.15;

			// Couche 1 : rayonnement ultra-large (aura)
			const glow1 = ctx.createRadialGradient(
				0,
				1.5,
				0,
				0,
				1.5,
				18 * pulse,
			);
			glow1.addColorStop(0, "rgba(255,255,255,0.85)");
			glow1.addColorStop(0.15, "rgba(255,250,200,0.55)");
			glow1.addColorStop(0.35, "rgba(255,220,100,0.30)");
			glow1.addColorStop(0.6, "rgba(255,160,0,0.12)");
			glow1.addColorStop(1, "rgba(255,100,0,0)");
			ctx.fillStyle = glow1;
			ctx.beginPath();
			ctx.arc(0, 1.5, 18 * pulse, 0, Math.PI * 2);
			ctx.fill();

			// Couche 2 : halo intermédiaire vif
			const glow2 = ctx.createRadialGradient(
				0,
				1.5,
				0,
				0,
				1.5,
				9,
			);
			glow2.addColorStop(0, "rgba(255,255,255,1.0)");
			glow2.addColorStop(0.3, "rgba(255,245,180,0.75)");
			glow2.addColorStop(0.65, "rgba(255,200,50,0.35)");
			glow2.addColorStop(1, "rgba(255,150,0,0)");
			ctx.fillStyle = glow2;
			ctx.beginPath();
			ctx.arc(0, 1.5, 9, 0, Math.PI * 2);
			ctx.fill();

			// Couche 3 : cœur éblouissant
			const glow3 = ctx.createRadialGradient(
				0,
				1.5,
				0,
				0,
				1.5,
				4,
			);
			glow3.addColorStop(0, "rgba(255,255,255,1.0)");
			glow3.addColorStop(0.5, "rgba(255,255,220,0.90)");
			glow3.addColorStop(1, "rgba(255,240,150,0)");
			ctx.fillStyle = glow3;
			ctx.beginPath();
			ctx.arc(0, 1.5, 4, 0, Math.PI * 2);
			ctx.fill();

			// Croissant blanc avec shadowBlur intense
			ctx.beginPath();
			ctx.moveTo(-3.2, -1.8);
			ctx.quadraticCurveTo(1.0, -2.2, 3.2, -0.5);
			ctx.quadraticCurveTo(3.8, 2.8, 0.5, 3.8);
			ctx.quadraticCurveTo(-2.5, 4.2, -3.2, -1.8);
			ctx.closePath();
			ctx.fillStyle = "#ffffff";
			ctx.shadowColor = "#ffffff";
			ctx.shadowBlur = 22;
			ctx.fill();
			// Deuxième passe pour intensifier le bloom
			ctx.shadowBlur = 12;
			ctx.fill();
			ctx.shadowBlur = 0;
			ctx.restore();

			// ── BEAK (sharp pointed) ──────────────────────────────────────
			ctx.beginPath();
			ctx.moveTo(18, -5.5); // base top
			ctx.lineTo(30, -3.8); // sharp tip — needle point
			ctx.lineTo(18, -2.5); // base bottom
			ctx.closePath();
			ctx.fillStyle = "#ffcc00";
			ctx.fill();

			// ── SHIELD ───────────────────────────────────────────────────
			if (player.hasShield) {
				const sa = 0.55 + Math.sin(t * 6) * 0.25;
				ctx.beginPath();
				ctx.arc(4, 0, 22, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(80,180,255,${sa})`;
				ctx.lineWidth = 2;
				ctx.stroke();
				const sg = ctx.createRadialGradient(
					4,
					0,
					12,
					4,
					0,
					22,
				);
				sg.addColorStop(0, "rgba(80,160,255,0)");
				sg.addColorStop(1, `rgba(80,160,255,${sa * 0.2})`);
				ctx.fillStyle = sg;
				ctx.fill();
			}

			// Combo tint overlay
			if (_comboActive && _comboTintAlpha > 0) {
				ctx.globalCompositeOperation = "screen";
				ctx.globalAlpha =
					_comboTintAlpha * (0.8 + Math.sin(t * 8) * 0.2);
				ctx.fillStyle = `rgb(${_comboColor[0]},${_comboColor[1]},${_comboColor[2]})`;
				ctx.beginPath();
				ctx.ellipse(0, 0, 22, 15, 0, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalCompositeOperation = "source-over";
				ctx.globalAlpha = 1;
			}
			ctx.restore();

			// MEGA✔ affiché sur le vaisseau (demande explicite)
			if (player.megaReady) {
				ctx.save();
				ctx.translate(x, y);
				const mp = 0.6 + Math.sin(t * 10) * 0.4;
				ctx.globalAlpha = mp;
				ctx.font = "bold 9px monospace";
				ctx.textAlign = "center";
				ctx.fillStyle = "#ff4400";
				ctx.fillText("MEGA✔", 0, player.h * 0.9);
				ctx.textAlign = "left";
				ctx.globalAlpha = 1;
				ctx.restore();
			}
		},
		drawEnemies(list, t) {
			for (const e of list) {
				if (e.dead) continue;
				ctx.save();
				ctx.translate(e.x, e.y);

				// Elite visuals: golden aura + crown
				if (e.isElite) {
					const ep =
						0.85 + Math.sin(t * 6 + e.animT) * 0.15;
					const eg = ctx.createRadialGradient(
						0,
						0,
						0,
						0,
						0,
						e.w * 0.9,
					);
					eg.addColorStop(
						0,
						`rgba(255,215,0,${0.5 * ep})`,
					);
					eg.addColorStop(
						0.5,
						`rgba(255,165,0,${0.3 * ep})`,
					);
					eg.addColorStop(1, "rgba(255,215,0,0)");
					ctx.fillStyle = eg;
					ctx.beginPath();
					ctx.arc(0, 0, e.w * 0.9, 0, Math.PI * 2);
					ctx.fill();
				}

				// Corruption visuals: tint red-purple + slight pulsing scale
				if (e.corrupted) {
					const cp =
						0.92 + Math.sin(t * 7 + e.animT) * 0.08;
					ctx.scale(cp, cp);
					// Corruption aura
					const cg = ctx.createRadialGradient(
						0,
						0,
						0,
						0,
						0,
						e.w * 0.8,
					);
					const ci = Math.floor(
						(e.corruptLevel - 3) * 40,
					);
					cg.addColorStop(
						0,
						`rgba(${180 + ci},0,${220 - ci},0.45)`,
					);
					cg.addColorStop(
						1,
						`rgba(${100 + ci},0,${180 - ci},0)`,
					);
					ctx.fillStyle = cg;
					ctx.beginPath();
					ctx.arc(0, 0, e.w * 0.8, 0, Math.PI * 2);
					ctx.fill();
				}

				switch (e.type) {
					case "drone":
						this._drawDrone(e, t);
						break;
					case "turret":
						this._drawTurret(e, t);
						break;
					case "kamikaze":
						this._drawKamikaze(e, t);
						break;
					case "interceptor":
						this._drawInterceptor(e, t);
						break;
					case "carrier":
						this._drawCarrier(e, t);
						break;
					case "shielder":
						this._drawShielder(e, t);
						break;
				}
				// Elite crown drawn on top
				if (e.isElite) {
					ctx.save();
					ctx.font = `bold ${Math.round(e.h * 0.55)}px monospace`;
					ctx.textAlign = "center";
					ctx.fillStyle = "#ffd700";
					ctx.shadowColor = "#ffd700";
					ctx.shadowBlur = 8;
					ctx.fillText("👑", 0, -e.h * 0.55);
					ctx.shadowBlur = 0;
					ctx.textAlign = "left";
					ctx.restore();
				}
				ctx.restore();
			}
		},

		_drawDrone(e, t) {
			const { w, h } = e;
			// Body
			ctx.beginPath();
			ctx.moveTo(-w / 2, 0);
			ctx.lineTo(-w * 0.1, -h / 2);
			ctx.lineTo(w / 2, 0);
			ctx.lineTo(-w * 0.1, h / 2);
			ctx.closePath();
			const dg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			dg.addColorStop(0, "#662200");
			dg.addColorStop(0.5, "#cc4400");
			dg.addColorStop(1, "#ff3300");
			ctx.fillStyle = dg;
			ctx.fill();
			ctx.strokeStyle = "#ff6600";
			ctx.lineWidth = 1.5;
			ctx.stroke();
			// Engine glow
			const eg = ctx.createRadialGradient(
				w * 0.35,
				0,
				0,
				w * 0.35,
				0,
				10,
			);
			eg.addColorStop(0, "#ffaa00");
			eg.addColorStop(1, "rgba(255,100,0,0)");
			ctx.fillStyle = eg;
			ctx.fillRect(w * 0.25, -5, 12, 10);
		},

		_drawTurret(e, t) {
			const { w, h } = e;
			// Body
			ctx.fillStyle = "#334455";
			ctx.fillRect(-w / 2, -h / 2, w, h);
			ctx.strokeStyle = "#66aacc";
			ctx.lineWidth = 2;
			ctx.strokeRect(-w / 2, -h / 2, w, h);
			// Barrel
			ctx.fillStyle = "#88aacc";
			ctx.fillRect(-w / 2 - 14, -3, 16, 6);
			// Eye
			const eyeR = ctx.createRadialGradient(0, 0, 0, 0, 0, 7);
			eyeR.addColorStop(0, "#ffffff");
			eyeR.addColorStop(0.5, "#ff6600");
			eyeR.addColorStop(1, "#cc0000");
			ctx.fillStyle = eyeR;
			ctx.beginPath();
			ctx.arc(0, 0, 7, 0, Math.PI * 2);
			ctx.fill();
		},

		_drawKamikaze(e, t) {
			const { w, h } = e;
			const pulse = 0.7 + Math.sin(t * 12) * 0.3;
			ctx.save();
			ctx.rotate(Math.PI);
			// Arrow-shaped body
			ctx.beginPath();
			ctx.moveTo(w / 2, 0);
			ctx.lineTo(-w * 0.3, -h / 2);
			ctx.lineTo(-w / 2, 0);
			ctx.lineTo(-w * 0.3, h / 2);
			ctx.closePath();
			const kg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			kg.addColorStop(0, "#ff2200");
			kg.addColorStop(0.6, "#ff6600");
			kg.addColorStop(1, "#ffaa00");
			ctx.fillStyle = kg;
			ctx.fill();
			ctx.strokeStyle = `rgba(255,200,0,${pulse})`;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();
		},

		_drawInterceptor(e, t) {
			const { w, h } = e;
			const retreating = e.phase === "retreat";
			ctx.save();
			if (retreating) ctx.rotate(Math.PI);
			// Sleek arrow body
			ctx.beginPath();
			ctx.moveTo(w * 0.55, 0);
			ctx.lineTo(-w * 0.2, -h * 0.45);
			ctx.lineTo(-w * 0.55, 0);
			ctx.lineTo(-w * 0.2, h * 0.45);
			ctx.closePath();
			const ig = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			ig.addColorStop(0, "#001133");
			ig.addColorStop(0.5, "#0055aa");
			ig.addColorStop(1, "#00aaff");
			ctx.fillStyle = ig;
			ctx.fill();
			ctx.strokeStyle = "#00ccff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
			// Engine glow
			const thrust = ctx.createRadialGradient(
				-w * 0.45,
				0,
				0,
				-w * 0.45,
				0,
				12,
			);
			thrust.addColorStop(0, "#00ffff");
			thrust.addColorStop(1, "rgba(0,100,255,0)");
			ctx.fillStyle = thrust;
			ctx.fillRect(-w * 0.55, -6, 14, 12);
			// Blinking light
			if (Math.sin(t * 8) > 0) {
				ctx.beginPath();
				ctx.arc(w * 0.4, 0, 3, 0, Math.PI * 2);
				ctx.fillStyle = "#ffffff";
				ctx.fill();
			}
			ctx.restore();
		},

		_drawCarrier(e, t) {
			const { w, h } = e;
			// Large transport ship
			ctx.beginPath();
			ctx.moveTo(-w * 0.5, -h * 0.25);
			ctx.lineTo(-w * 0.3, -h * 0.5);
			ctx.lineTo(w * 0.45, -h * 0.35);
			ctx.lineTo(w * 0.5, 0);
			ctx.lineTo(w * 0.45, h * 0.35);
			ctx.lineTo(-w * 0.3, h * 0.5);
			ctx.lineTo(-w * 0.5, h * 0.25);
			ctx.closePath();
			const cg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			cg.addColorStop(0, "#2a1500");
			cg.addColorStop(0.5, "#774400");
			cg.addColorStop(1, "#aa6600");
			ctx.fillStyle = cg;
			ctx.fill();
			ctx.strokeStyle = "#cc8800";
			ctx.lineWidth = 2;
			ctx.stroke();
			// Bay doors
			ctx.fillStyle = "rgba(0,0,0,0.4)";
			ctx.fillRect(-w * 0.1, -h * 0.22, w * 0.45, h * 0.44);
			// Pulsing bay light
			const pulse = 0.5 + Math.sin(t * 4) * 0.5;
			ctx.fillStyle = `rgba(255,150,0,${pulse * 0.6})`;
			ctx.fillRect(-w * 0.05, -h * 0.15, w * 0.35, h * 0.3);
			// HP bar above carrier
			const hpFrac = e.hp / e._maxHp || 1;
			ctx.fillStyle = "rgba(0,0,0,0.5)";
			ctx.fillRect(-w * 0.4, -h * 0.6, w * 0.8, 5);
			ctx.fillStyle = hpFrac > 0.5 ? "#44ff44" : "#ff4400";
			ctx.fillRect(-w * 0.4, -h * 0.6, w * 0.8 * hpFrac, 5);
		},

		drawBoss(boss) {
			// Phase transition message overlay
			if (boss._phaseMsgTimer > 0 && boss._phaseMsg) {
				const alpha = Math.min(1, boss._phaseMsgTimer);
				ctx.save();
				ctx.globalAlpha = alpha;
				ctx.font = "bold 22px monospace";
				ctx.textAlign = "center";
				ctx.fillStyle =
					boss.phase >= 2 ? "#ff0000" : "#ff8800";
				ctx.shadowColor =
					boss.phase >= 2 ? "#ff0000" : "#ff8800";
				ctx.shadowBlur = 20;
				ctx.fillText(
					boss._phaseMsg,
					boss.x,
					boss.y - boss.h * 0.6 - 20,
				);
				ctx.shadowBlur = 0;
				ctx.textAlign = "left";
				ctx.globalAlpha = 1;
				ctx.restore();
			}
			if (!boss.active) return;
			const {
				x,
				y,
				w,
				h,
				type,
				color,
				coreColor,
				animT,
				phase,
				hp,
				maxHp,
				flashTimer,
			} = boss;

			ctx.save();
			ctx.translate(x, y);

			if (flashTimer > 0) {
				ctx.globalAlpha = 0.5 + Math.random() * 0.5;
			}

			// Phase-based visual aura
			if (phase >= 1) {
				const auraAlpha =
					0.15 + Math.sin(boss.animT * 5) * 0.1;
				const auraR = phase >= 2 ? w * 0.75 : w * 0.6;
				const ag = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					auraR,
				);
				const auraHex =
					phase >= 2 ? boss.coreColor : boss.color;
				// Convert #rrggbb to rgba(r,g,b,a)
				const _hexToRgba = (hex, alpha) => {
					const h = hex.replace("#", "");
					const r = parseInt(h.substring(0, 2), 16);
					const g = parseInt(h.substring(2, 4), 16);
					const b = parseInt(h.substring(4, 6), 16);
					return `rgba(${r},${g},${b},${alpha})`;
				};
				ag.addColorStop(0, _hexToRgba(auraHex, auraAlpha));
				ag.addColorStop(1, _hexToRgba(auraHex, 0));
				ctx.save();
				ctx.beginPath();
				ctx.arc(0, 0, auraR, 0, Math.PI * 2);
				ctx.fillStyle = ag;
				ctx.fill();
				ctx.restore();
			}

			switch (type) {
				case "colossus":
					this._drawColossus(
						w,
						h,
						color,
						coreColor,
						animT,
						phase,
					);
					break;
				case "leviathan":
					this._drawLeviathan(
						w,
						h,
						color,
						coreColor,
						animT,
						phase,
					);
					break;
				case "tyrant":
					this._drawTyrant(
						w,
						h,
						color,
						coreColor,
						animT,
						phase,
					);
					break;
				case "hydra":
					this._drawHydra(
						w,
						h,
						color,
						coreColor,
						animT,
						phase,
					);
					break;
				case "wraith":
					this._drawWraith(
						w,
						h,
						color,
						coreColor,
						animT,
						phase,
					);
					break;
				case "herald":
					this._drawHerald(
						w,
						h,
						color,
						coreColor,
						animT,
						phase,
					);
					break;
				case "dreadnought":
					this._drawDreadnought(
						w,
						h,
						color,
						coreColor,
						animT,
						phase,
					);
					break;
			}

			ctx.globalAlpha = 1;
			ctx.restore();

			// HP bar — dessinée sous la topbar HUD (≈42 px CSS ≈ 52 px virtuels à scale 0.8)
			const barW = 240,
				barH = 18;
			const barX = (toolsRef.width - barW) / 2,
				barY = 52;
			// Fond sombre
			ctx.fillStyle = "rgba(0,0,0,0.85)";
			ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);
			// Barre de vie
			const hpFrac = hp / maxHp;
			const barColor =
				hpFrac > 0.6
					? "#ff4400"
					: hpFrac > 0.3
						? "#ff8800"
						: "#ffff00";
			ctx.fillStyle = barColor;
			ctx.fillRect(barX, barY, barW * hpFrac, barH);
			// Contour
			ctx.strokeStyle = "#ff6600";
			ctx.lineWidth = 2;
			ctx.strokeRect(barX, barY, barW, barH);
			// Nom du boss centré à l'intérieur de la barre
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 11px monospace";
			ctx.textAlign = "center";
			ctx.textBaseline = "middle";
			ctx.shadowColor = "#000";
			ctx.shadowBlur = 3;
			ctx.fillText(
				boss.name,
				toolsRef.width / 2,
				barY + barH / 2,
			);
			ctx.shadowBlur = 0;
			ctx.textBaseline = "alphabetic";
			ctx.textAlign = "left";
		},

		_drawColossus(w, h, color, coreColor, t, phase) {
			// Main body - large angular mech
			ctx.beginPath();
			ctx.moveTo(-w * 0.5, -h * 0.3);
			ctx.lineTo(-w * 0.3, -h * 0.5);
			ctx.lineTo(w * 0.35, -h * 0.4);
			ctx.lineTo(w * 0.5, 0);
			ctx.lineTo(w * 0.35, h * 0.4);
			ctx.lineTo(-w * 0.3, h * 0.5);
			ctx.lineTo(-w * 0.5, h * 0.3);
			ctx.closePath();
			const bg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			bg.addColorStop(0, color);
			bg.addColorStop(0.6, lighten(color, 40));
			bg.addColorStop(1, "#ff3300");
			ctx.fillStyle = bg;
			ctx.fill();
			ctx.strokeStyle = "#ff6600";
			ctx.lineWidth = 2;
			ctx.stroke();

			// Arms / cannons — coordonnées centrées sur ±h*0.19 pour symétrie parfaite
			for (let s = -1; s <= 1; s += 2) {
				// Bras : hauteur h*0.12, centré sur s*h*0.19 → y = s*h*0.19 - h*0.06
				ctx.fillStyle = "#443300";
				ctx.fillRect(
					-w * 0.5,
					s * h * 0.19 - h * 0.06,
					-w * 0.2,
					h * 0.12,
				);
				// Embout canon : hauteur h*0.08, centré sur s*h*0.19 → y = s*h*0.19 - h*0.04
				ctx.fillStyle = "#ff4400";
				ctx.fillRect(
					-w * 0.72,
					s * h * 0.19 - h * 0.04,
					w * 0.08,
					h * 0.08,
				);
			}

			// Core eye
			const pulse = 0.6 + Math.sin(t * 4) * 0.4;
			const cg = ctx.createRadialGradient(
				w * 0.1,
				0,
				0,
				w * 0.1,
				0,
				h * 0.25,
			);
			cg.addColorStop(0, "#ffffff");
			cg.addColorStop(0.3, coreColor);
			cg.addColorStop(1, `rgba(255,100,0,0)`);
			ctx.fillStyle = cg;
			ctx.beginPath();
			ctx.arc(w * 0.1, 0, h * 0.25 * pulse, 0, Math.PI * 2);
			ctx.fill();

			// Phase 2: Extra energy orbs
			if (phase >= 1) {
				for (let i = 0; i < 4; i++) {
					const angle = t * 2 + i * (Math.PI / 2);
					const ox = Math.cos(angle) * w * 0.28;
					const oy = Math.sin(angle) * h * 0.3;
					ctx.beginPath();
					ctx.arc(ox, oy, 6, 0, Math.PI * 2);
					ctx.fillStyle = coreColor;
					ctx.fill();
				}
			}
		},

		_drawLeviathan(w, h, color, coreColor, t, phase) {
			// Serpentine space creature
			ctx.beginPath();
			ctx.ellipse(0, 0, w * 0.5, h * 0.4, 0, 0, Math.PI * 2);
			const bg = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				w * 0.5,
			);
			bg.addColorStop(0, lighten(color, 60));
			bg.addColorStop(0.5, color);
			bg.addColorStop(1, "#000011");
			ctx.fillStyle = bg;
			ctx.fill();
			ctx.strokeStyle = coreColor;
			ctx.lineWidth = 2;
			ctx.stroke();

			// Tentacles
			for (let i = 0; i < 6; i++) {
				const angle = (i / 6) * Math.PI * 2 + t * 0.8;
				const len = h * 0.5;
				ctx.beginPath();
				ctx.moveTo(
					Math.cos(angle) * w * 0.3,
					Math.sin(angle) * h * 0.3,
				);
				const midX = Math.cos(angle + 0.4) * w * 0.45;
				const midY = Math.sin(angle + 0.4) * h * 0.45;
				const endX = Math.cos(angle) * (w * 0.3 + len);
				const endY =
					Math.sin(angle) * (h * 0.3 + len * 0.7);
				ctx.quadraticCurveTo(midX, midY, endX, endY);
				ctx.strokeStyle = `rgba(160,0,255,0.7)`;
				ctx.lineWidth = 4;
				ctx.stroke();
			}

			// Central eye
			const pulse = 0.7 + Math.sin(t * 6) * 0.3;
			ctx.beginPath();
			ctx.arc(0, 0, h * 0.22 * pulse, 0, Math.PI * 2);
			const eg = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				h * 0.22,
			);
			eg.addColorStop(0, "#ffffff");
			eg.addColorStop(0.4, coreColor);
			eg.addColorStop(1, "rgba(100,0,200,0)");
			ctx.fillStyle = eg;
			ctx.fill();

			if (phase >= 2) {
				ctx.beginPath();
				ctx.arc(0, 0, h * 0.45, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(180,0,255,${0.3 + Math.sin(t * 8) * 0.2})`;
				ctx.lineWidth = 3;
				ctx.stroke();
			}
		},

		_drawTyrant(w, h, color, coreColor, t, phase) {
			// Massive overlord ship
			ctx.beginPath();
			ctx.moveTo(-w * 0.5, 0);
			ctx.lineTo(-w * 0.2, -h * 0.5);
			ctx.lineTo(w * 0.15, -h * 0.55);
			ctx.lineTo(w * 0.5, -h * 0.2);
			ctx.lineTo(w * 0.55, 0);
			ctx.lineTo(w * 0.5, h * 0.2);
			ctx.lineTo(w * 0.15, h * 0.55);
			ctx.lineTo(-w * 0.2, h * 0.5);
			ctx.closePath();
			const bg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			bg.addColorStop(0, "#110000");
			bg.addColorStop(0.4, color);
			bg.addColorStop(0.8, "#662200");
			bg.addColorStop(1, "#ff4400");
			ctx.fillStyle = bg;
			ctx.fill();
			ctx.strokeStyle = "#ffaa00";
			ctx.lineWidth = 2;
			ctx.stroke();

			// Spine ridges
			for (let i = -2; i <= 2; i++) {
				ctx.fillStyle = "#551100";
				ctx.fillRect(
					w * 0.05 + i * 18,
					-h * 0.12,
					12,
					h * 0.24,
				);
			}

			// Multi-cannon array
			for (let s = -2; s <= 2; s++) {
				ctx.fillStyle = "#333333";
				ctx.fillRect(
					-w * 0.5,
					s * h * 0.18 - 3,
					-w * 0.18,
					6,
				);
			}

			// Core sun
			const pulse = 0.7 + Math.sin(t * 5) * 0.3;
			const cg = ctx.createRadialGradient(
				w * 0.15,
				0,
				0,
				w * 0.15,
				0,
				h * 0.3 * pulse,
			);
			cg.addColorStop(0, "#ffffff");
			cg.addColorStop(0.2, "#ffff00");
			cg.addColorStop(0.5, coreColor);
			cg.addColorStop(1, "rgba(255,100,0,0)");
			ctx.fillStyle = cg;
			ctx.beginPath();
			ctx.arc(w * 0.15, 0, h * 0.3 * pulse, 0, Math.PI * 2);
			ctx.fill();

			// Phase 2+ corona rays
			if (phase >= 1) {
				for (let i = 0; i < 8; i++) {
					const angle = t * 1.5 + i * (Math.PI / 4);
					ctx.beginPath();
					ctx.moveTo(
						w * 0.15 + Math.cos(angle) * h * 0.28,
						Math.sin(angle) * h * 0.28,
					);
					ctx.lineTo(
						w * 0.15 + Math.cos(angle) * h * 0.5,
						Math.sin(angle) * h * 0.5,
					);
					ctx.strokeStyle = `rgba(255,200,0,${0.4 + Math.sin(t * 3 + i) * 0.3})`;
					ctx.lineWidth = 2;
					ctx.stroke();
				}
			}
		},

		// ── VENOM HYDRA (niveau 3 — Toxic Nebula) ───────────────────────────
		// Corps multi-têtes organique, vert toxique avec jets d'acide
		_drawHydra(w, h, color, coreColor, t, phase) {
			// Corps principal — blob organique
			ctx.beginPath();
			ctx.ellipse(
				0,
				0,
				w * 0.45,
				h * 0.35,
				0,
				0,
				Math.PI * 2,
			);
			const bg = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				w * 0.45,
			);
			bg.addColorStop(0, lighten(color, 50));
			bg.addColorStop(0.5, color);
			bg.addColorStop(1, "#000a00");
			ctx.fillStyle = bg;
			ctx.fill();
			ctx.strokeStyle = coreColor;
			ctx.lineWidth = 2;
			ctx.stroke();

			// 3 têtes (cols serpentins)
			const headAngles = [-0.55, 0, 0.55];
			headAngles.forEach((angle, i) => {
				const wobble = Math.sin(t * 2.5 + i * 1.2) * 0.25;
				const a = angle + wobble;
				const neckLen = w * 0.38;
				const hx = Math.cos(a) * neckLen * 1.05;
				const hy = Math.sin(a) * neckLen * 0.7;
				// Col
				ctx.beginPath();
				ctx.moveTo(
					Math.cos(a) * w * 0.25,
					Math.sin(a) * h * 0.2,
				);
				ctx.quadraticCurveTo(
					hx * 0.6,
					hy * 0.6 + Math.sin(t * 3 + i) * 15,
					hx,
					hy,
				);
				ctx.strokeStyle = lighten(color, 30);
				ctx.lineWidth = 10;
				ctx.stroke();
				ctx.strokeStyle = coreColor;
				ctx.lineWidth = 3;
				ctx.stroke();
				// Tête
				ctx.beginPath();
				ctx.ellipse(
					hx,
					hy,
					w * 0.1,
					h * 0.09,
					a,
					0,
					Math.PI * 2,
				);
				ctx.fillStyle = lighten(color, 60);
				ctx.fill();
				ctx.strokeStyle = coreColor;
				ctx.lineWidth = 1.5;
				ctx.stroke();
				// Œil
				const pulse = 0.7 + Math.sin(t * 5 + i) * 0.3;
				ctx.beginPath();
				ctx.arc(
					hx + Math.cos(a) * 6,
					hy + Math.sin(a) * 4,
					5 * pulse,
					0,
					Math.PI * 2,
				);
				ctx.fillStyle = coreColor;
				ctx.fill();
			});

			// Noyau central pulsant
			const pulse = 0.6 + Math.sin(t * 6) * 0.4;
			const cg = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				h * 0.2,
			);
			cg.addColorStop(0, "#ffffff");
			cg.addColorStop(0.3, coreColor);
			cg.addColorStop(1, "rgba(0,200,80,0)");
			ctx.fillStyle = cg;
			ctx.beginPath();
			ctx.arc(0, 0, h * 0.2 * pulse, 0, Math.PI * 2);
			ctx.fill();

			// Phase 2 : bulles acides orbitales
			if (phase >= 1) {
				for (let i = 0; i < 5; i++) {
					const a = t * 1.8 + i * ((Math.PI * 2) / 5);
					ctx.beginPath();
					ctx.arc(
						Math.cos(a) * w * 0.32,
						Math.sin(a) * h * 0.28,
						7,
						0,
						Math.PI * 2,
					);
					ctx.fillStyle = `rgba(0,255,100,${0.5 + Math.sin(t * 4 + i) * 0.3})`;
					ctx.fill();
				}
			}
		},

		// ── ICE WRAITH (niveau 4 — Crystal Abyss) ───────────────────────────
		// Fantôme cristallin semi-transparent, cyan glacial
		_drawWraith(w, h, color, coreColor, t, phase) {
			// Manteau fantôme ondulant
			ctx.save();
			ctx.globalAlpha = 0.7 + Math.sin(t * 3) * 0.15;
			ctx.beginPath();
			ctx.moveTo(-w * 0.5, -h * 0.1);
			for (let i = 0; i <= 20; i++) {
				const px = -w * 0.5 + (w * i) / 20;
				const wave = Math.sin(t * 4 + i * 0.7) * h * 0.12;
				ctx.lineTo(
					px,
					(i % 2 === 0 ? -h * 0.45 : -h * 0.25) + wave,
				);
			}
			ctx.lineTo(w * 0.5, h * 0.1);
			for (let i = 20; i >= 0; i--) {
				const px = -w * 0.5 + (w * i) / 20;
				const wave =
					Math.sin(t * 4 + i * 0.7 + 2) * h * 0.12;
				ctx.lineTo(
					px,
					(i % 2 === 0 ? h * 0.45 : h * 0.25) + wave,
				);
			}
			ctx.closePath();
			const bg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			bg.addColorStop(0, color);
			bg.addColorStop(0.5, lighten(color, 50));
			bg.addColorStop(1, coreColor);
			ctx.fillStyle = bg;
			ctx.fill();
			ctx.strokeStyle = coreColor;
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.restore();

			// Cristaux flottants
			for (let i = 0; i < 6; i++) {
				const a = t * 1.2 + i * (Math.PI / 3);
				const r = w * 0.32 + Math.sin(t * 2 + i) * w * 0.06;
				const cx2 = Math.cos(a) * r;
				const cy2 = Math.sin(a) * r * 0.65;
				ctx.save();
				ctx.translate(cx2, cy2);
				ctx.rotate(a + t);
				ctx.beginPath();
				ctx.moveTo(0, -9);
				ctx.lineTo(5, 0);
				ctx.lineTo(0, 9);
				ctx.lineTo(-5, 0);
				ctx.closePath();
				ctx.fillStyle = `rgba(0,200,255,${0.55 + Math.sin(t * 3 + i) * 0.25})`;
				ctx.fill();
				ctx.strokeStyle = "#88eeff";
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.restore();
			}

			// Noyau de glace
			const pulse = 0.65 + Math.sin(t * 7) * 0.35;
			const cg = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				h * 0.22,
			);
			cg.addColorStop(0, "#ffffff");
			cg.addColorStop(0.35, coreColor);
			cg.addColorStop(1, "rgba(0,100,200,0)");
			ctx.fillStyle = cg;
			ctx.beginPath();
			ctx.arc(0, 0, h * 0.22 * pulse, 0, Math.PI * 2);
			ctx.fill();

			// Phase 2 : anneau de glace
			if (phase >= 1) {
				ctx.beginPath();
				ctx.arc(0, 0, w * 0.48, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(0,220,255,${0.3 + Math.sin(t * 5) * 0.2})`;
				ctx.lineWidth = 4;
				ctx.stroke();
			}
		},

		// ── VOID HERALD (niveau 5 — Phantom Void) ───────────────────────────
		// Entité dimensionnelle, spirales violettes, portails
		_drawHerald(w, h, color, coreColor, t, phase) {
			// Anneau portail rotatif extérieur
			ctx.save();
			ctx.rotate(t * 0.6);
			ctx.beginPath();
			ctx.arc(0, 0, w * 0.5, 0, Math.PI * 2);
			ctx.strokeStyle = `rgba(160,0,255,${0.35 + Math.sin(t * 4) * 0.15})`;
			ctx.lineWidth = 6;
			ctx.stroke();
			for (let i = 0; i < 8; i++) {
				const a = (i * Math.PI) / 4;
				ctx.beginPath();
				ctx.moveTo(
					Math.cos(a) * w * 0.42,
					Math.sin(a) * w * 0.42,
				);
				ctx.lineTo(
					Math.cos(a) * w * 0.5,
					Math.sin(a) * w * 0.5,
				);
				ctx.strokeStyle = coreColor;
				ctx.lineWidth = 3;
				ctx.stroke();
			}
			ctx.restore();

			// Corps central — sphère void
			ctx.beginPath();
			ctx.arc(0, 0, w * 0.32, 0, Math.PI * 2);
			const bg = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				w * 0.32,
			);
			bg.addColorStop(0, lighten(color, 80));
			bg.addColorStop(0.4, color);
			bg.addColorStop(1, "#000000");
			ctx.fillStyle = bg;
			ctx.fill();
			ctx.strokeStyle = coreColor;
			ctx.lineWidth = 2;
			ctx.stroke();

			// Spirales énergétiques
			for (let s = 0; s < 3; s++) {
				ctx.beginPath();
				const startA = t * 2.5 + s * ((Math.PI * 2) / 3);
				for (let i = 0; i < 30; i++) {
					const a = startA + i * 0.22;
					const r = (i / 30) * w * 0.42;
					const px = Math.cos(a) * r;
					const py = Math.sin(a) * r * 0.85;
					if (i === 0) ctx.moveTo(px, py);
					else ctx.lineTo(px, py);
				}
				ctx.strokeStyle = `rgba(180,0,255,${0.6 - s * 0.15})`;
				ctx.lineWidth = 2.5 - s * 0.5;
				ctx.stroke();
			}

			// Noyau pulsant
			const pulse = 0.6 + Math.sin(t * 8) * 0.4;
			const cg = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				h * 0.2,
			);
			cg.addColorStop(0, "#ffffff");
			cg.addColorStop(0.25, coreColor);
			cg.addColorStop(1, "rgba(100,0,200,0)");
			ctx.fillStyle = cg;
			ctx.beginPath();
			ctx.arc(0, 0, h * 0.2 * pulse, 0, Math.PI * 2);
			ctx.fill();

			// Phase 2 : mini portails orbitaux
			if (phase >= 1) {
				for (let i = 0; i < 4; i++) {
					const a = -t * 1.5 + i * (Math.PI / 2);
					const ox = Math.cos(a) * w * 0.38;
					const oy = Math.sin(a) * h * 0.33;
					ctx.beginPath();
					ctx.ellipse(ox, oy, 10, 7, a, 0, Math.PI * 2);
					ctx.strokeStyle = `rgba(200,100,255,0.7)`;
					ctx.lineWidth = 2;
					ctx.stroke();
					ctx.fillStyle = `rgba(100,0,200,0.4)`;
					ctx.fill();
				}
			}
		},

		// ── OMEGA DREADNOUGHT (niveau 6 — Omega Fortress) ───────────────────
		// Vaisseau cuirassé massif, rouge-acier, plaques blindées
		_drawDreadnought(w, h, color, coreColor, t, phase) {
			// Hull principal — silhouette cuirassée
			ctx.beginPath();
			ctx.moveTo(-w * 0.55, 0);
			ctx.lineTo(-w * 0.35, -h * 0.52);
			ctx.lineTo(w * 0.1, -h * 0.58);
			ctx.lineTo(w * 0.55, -h * 0.25);
			ctx.lineTo(w * 0.62, 0);
			ctx.lineTo(w * 0.55, h * 0.25);
			ctx.lineTo(w * 0.1, h * 0.58);
			ctx.lineTo(-w * 0.35, h * 0.52);
			ctx.closePath();
			const bg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			bg.addColorStop(0, "#0a0000");
			bg.addColorStop(0.3, color);
			bg.addColorStop(0.7, lighten(color, 30));
			bg.addColorStop(1, coreColor);
			ctx.fillStyle = bg;
			ctx.fill();
			ctx.strokeStyle = "#ff4400";
			ctx.lineWidth = 2;
			ctx.stroke();

			// Plaques blindées
			const plates = [
				[-w * 0.15, -h * 0.35, w * 0.45, h * 0.28],
				[-w * 0.15, h * 0.07, w * 0.45, h * 0.28],
			];
			plates.forEach(([px, py, pw, ph]) => {
				ctx.fillStyle = "rgba(0,0,0,0.35)";
				ctx.fillRect(px, py, pw, ph);
				ctx.strokeStyle = "#662200";
				ctx.lineWidth = 1;
				ctx.strokeRect(px, py, pw, ph);
			});

			// 4 canons latéraux
			for (let s = -1; s <= 1; s += 2) {
				// Canon supérieur / inférieur
				ctx.fillStyle = "#111111";
				ctx.fillRect(
					-w * 0.55,
					s * h * 0.28 - 5,
					-w * 0.22,
					10,
				);
				// Embout
				const flash =
					phase >= 2 ? 0.5 + Math.sin(t * 12) * 0.5 : 0;
				ctx.fillStyle = `rgba(255,80,0,${flash})`;
				ctx.fillRect(-w * 0.78, s * h * 0.28 - 4, 6, 8);
			}

			// Spine centrale
			ctx.fillStyle = "#1a0000";
			ctx.fillRect(-w * 0.05, -h * 0.5, w * 0.25, h);
			for (let i = -3; i <= 3; i++) {
				ctx.fillStyle = "#330000";
				ctx.fillRect(
					w * 0.08 + i * 14,
					-h * 0.08,
					10,
					h * 0.16,
				);
			}

			// Réacteur central — double noyau
			const pulse = 0.65 + Math.sin(t * 5) * 0.35;
			for (let i = 0; i < 2; i++) {
				const oy = (i - 0.5) * h * 0.25;
				const cg = ctx.createRadialGradient(
					w * 0.2,
					oy,
					0,
					w * 0.2,
					oy,
					h * 0.14 * pulse,
				);
				cg.addColorStop(0, "#ffffff");
				cg.addColorStop(0.2, "#ffaa00");
				cg.addColorStop(0.5, coreColor);
				cg.addColorStop(1, "rgba(200,0,0,0)");
				ctx.fillStyle = cg;
				ctx.beginPath();
				ctx.arc(
					w * 0.2,
					oy,
					h * 0.14 * pulse,
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}

			// Phase 2 : bouclier énergétique rotatif
			if (phase >= 1) {
				ctx.save();
				ctx.rotate(t * 1.2);
				ctx.beginPath();
				ctx.arc(0, 0, w * 0.56, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(255,60,0,${0.25 + Math.sin(t * 6) * 0.15})`;
				ctx.lineWidth = 5;
				ctx.setLineDash([20, 15]);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.restore();
			}

			// Phase 3 : segments blindés additionnels
			if (phase >= 2) {
				for (let i = 0; i < 6; i++) {
					const a = t * 2 + i * (Math.PI / 3);
					const ox = Math.cos(a) * w * 0.45;
					const oy = Math.sin(a) * h * 0.38;
					ctx.beginPath();
					ctx.arc(ox, oy, 7, 0, Math.PI * 2);
					ctx.fillStyle = `rgba(255,100,0,${0.5 + Math.sin(t * 4 + i) * 0.3})`;
					ctx.fill();
				}
			}
		},

		_drawShielder(e, t) {
			const { w, h } = e;
			// Body — hexagonal blue-steel
			ctx.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
				const r = w * 0.5;
				i === 0
					? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
					: ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			ctx.closePath();
			const sg = ctx.createLinearGradient(
				-w / 2,
				0,
				w / 2,
				0,
			);
			sg.addColorStop(0, "#003366");
			sg.addColorStop(0.5, "#0055aa");
			sg.addColorStop(1, "#0088ff");
			ctx.fillStyle = sg;
			ctx.fill();
			ctx.strokeStyle = "#44aaff";
			ctx.lineWidth = 2;
			ctx.stroke();
			// Shield arc in front
			if (e.shieldActive) {
				const sa = 0.6 + Math.sin(t * 5) * 0.25;
				ctx.beginPath();
				ctx.arc(
					-w * 0.1,
					0,
					e.shieldRadius || 55,
					-Math.PI * 0.55,
					Math.PI * 0.55,
				);
				ctx.strokeStyle = `rgba(80,160,255,${sa})`;
				ctx.lineWidth = 4;
				ctx.stroke();
				// Shield glow fill
				const shg = ctx.createRadialGradient(
					-w * 0.1,
					0,
					0,
					-w * 0.1,
					0,
					e.shieldRadius || 55,
				);
				shg.addColorStop(0, `rgba(80,160,255,0)`);
				shg.addColorStop(0.7, `rgba(80,160,255,0)`);
				shg.addColorStop(
					1,
					`rgba(80,160,255,${sa * 0.18})`,
				);
				ctx.fillStyle = shg;
				ctx.beginPath();
				ctx.arc(
					-w * 0.1,
					0,
					e.shieldRadius || 55,
					-Math.PI * 0.55,
					Math.PI * 0.55,
				);
				ctx.lineTo(-w * 0.1, 0);
				ctx.closePath();
				ctx.fill();
			}
			// Core light
			const cl = ctx.createRadialGradient(
				0,
				0,
				0,
				0,
				0,
				w * 0.25,
			);
			cl.addColorStop(0, "rgba(150,220,255,0.9)");
			cl.addColorStop(1, "rgba(0,100,255,0)");
			ctx.fillStyle = cl;
			ctx.beginPath();
			ctx.arc(0, 0, w * 0.25, 0, Math.PI * 2);
			ctx.fill();
		},

		drawBullets(bullets, combo, rageMode) {
			// Player bullets
			for (const b of bullets.playerBullets) {
				if (b.dead) continue;
				ctx.save();
				ctx.translate(b.x, b.y);

				if (b.isMega) {
					const mg = ctx.createRadialGradient(
						0,
						0,
						0,
						0,
						0,
						12,
					);
					mg.addColorStop(0, "#ffffff");
					mg.addColorStop(0.4, "#ff6600");
					mg.addColorStop(1, "rgba(255,0,0,0)");
					ctx.fillStyle = mg;
					ctx.beginPath();
					ctx.arc(0, 0, 12, 0, Math.PI * 2);
					ctx.fill();
				} else {
					// Glow
					const gg = ctx.createRadialGradient(
						0,
						0,
						0,
						0,
						0,
						10,
					);
					gg.addColorStop(0, b.glowColor || "#ff9900");
					gg.addColorStop(1, "rgba(255,100,0,0)");
					ctx.fillStyle = gg;
					ctx.fillRect(-10, -8, 20, 16);

					// Combo bullet effects
					const _cb = combo || 0;
					if (
						rageMode &&
						_cb >= MAX_COMBO_RAGE &&
						!b.homing
					) {
						const _ct =
							_cb >= 12
								? "#ff3300"
								: _cb >= 8
									? "#ff8800"
									: "#ffdd00";
						// Trail
						const tg = ctx.createLinearGradient(
							-b.w,
							0,
							0,
							0,
						);
						tg.addColorStop(0, "rgba(0,0,0,0)");
						tg.addColorStop(1, _ct + "99");
						ctx.fillStyle = tg;
						ctx.fillRect(
							-b.w * 1.8,
							-b.h * 0.5,
							b.w * 1.8,
							b.h,
						);
						// Wider glow for high combos
						if (_cb >= 8) {
							ctx.globalAlpha = 0.35;
							ctx.fillStyle = _ct;
							ctx.beginPath();
							ctx.arc(
								0,
								0,
								b.h * 1.4,
								0,
								Math.PI * 2,
							);
							ctx.fill();
							ctx.globalAlpha = 1;
						}
					}
					// Bullet
					const bGrad = ctx.createLinearGradient(
						-b.w / 2,
						0,
						b.w / 2,
						0,
					);
					const _bc =
						rageMode &&
						combo >= MAX_COMBO_RAGE &&
						!b.homing
							? combo >= 12
								? "#ff4400"
								: combo >= 8
									? "#ffbb00"
									: "#ffee44"
							: b.color || "#ff9900";
					bGrad.addColorStop(0, "rgba(255,100,0,0)");
					bGrad.addColorStop(0.3, _bc);
					bGrad.addColorStop(1, "#ffffff");
					ctx.fillStyle = bGrad;
					ctx.beginPath();
					ctx.ellipse(
						0,
						0,
						b.w / 2,
						b.h / 2,
						0,
						0,
						Math.PI * 2,
					);
					ctx.fill();
				}

				ctx.restore();
			}

			// Enemy bullets
			for (const b of bullets.enemyBullets) {
				if (b.dead) continue;
				ctx.save();
				ctx.translate(b.x, b.y);
				const eg = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					b.w,
				);
				eg.addColorStop(0, "#ffffff");
				eg.addColorStop(0.4, b.color || "#ff4400");
				eg.addColorStop(1, "rgba(255,0,0,0)");
				ctx.fillStyle = eg;
				ctx.beginPath();
				ctx.arc(0, 0, b.w / 2, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			}
		},

		drawParticles(list) {
			for (const p of list) {
				const alpha = Math.max(
					0,
					p.life / (p.maxLife || 0.8),
				);
				const cidx = Math.floor(
					(1 - alpha) * (p.colors.length - 1),
				);
				const color =
					p.colors[Math.min(cidx, p.colors.length - 1)];
				ctx.globalAlpha = alpha;
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.arc(
					p.x,
					p.y,
					Math.max(0.5, p.r * alpha),
					0,
					Math.PI * 2,
				);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
		},

		drawMeteors(meteors) {
			for (const mt of meteors) {
				ctx.save();
				ctx.translate(mt.x, mt.y);
				ctx.rotate(mt.angle);
				// Rock body
				ctx.beginPath();
				const pts = 7;
				for (let i = 0; i < pts; i++) {
					const a = (i / pts) * Math.PI * 2;
					const jitter =
						0.75 + Math.sin(a * 3.7 + mt.r) * 0.25;
					const r = mt.r * jitter;
					i === 0
						? ctx.moveTo(
								Math.cos(a) * r,
								Math.sin(a) * r,
							)
						: ctx.lineTo(
								Math.cos(a) * r,
								Math.sin(a) * r,
							);
				}
				ctx.closePath();
				const mg = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					mt.r,
				);
				mg.addColorStop(0, "#aa8866");
				mg.addColorStop(0.5, "#776655");
				mg.addColorStop(1, "#443322");
				ctx.fillStyle = mg;
				ctx.fill();
				ctx.strokeStyle = "#554433";
				ctx.lineWidth = 1.5;
				ctx.stroke();
				// Fire trail behind
				const tg = ctx.createLinearGradient(
					mt.r,
					0,
					mt.r * 3.5,
					0,
				);
				tg.addColorStop(0, "rgba(255,120,0,0.7)");
				tg.addColorStop(0.4, "rgba(255,60,0,0.3)");
				tg.addColorStop(1, "rgba(255,0,0,0)");
				ctx.fillStyle = tg;
				ctx.beginPath();
				ctx.ellipse(
					mt.r * 2,
					0,
					mt.r * 1.5,
					mt.r * 0.45,
					0,
					0,
					Math.PI * 2,
				);
				ctx.fill();
				ctx.restore();
			}
		},

		drawDangerZones(zones, t) {
			if (!zones || !zones.length) return;
			for (const z of zones) {
				const spin = t * 1.2 + z.phase;
				const pulse =
					0.92 + Math.sin(t * 5 + z.phase) * 0.08;
				const r = z.r * pulse;

				// ── Debris & particles being sucked in ────────────────
				// Draw 8 small debris spiraling toward center
				ctx.save();
				ctx.translate(z.x, z.y);
				for (let d = 0; d < 8; d++) {
					const da =
						spin * (1 + d * 0.15) +
						d * ((Math.PI * 2) / 8);
					const distFrac =
						0.4 + ((t * 0.3 + d * 0.125) % 1) * 0.6; // 0=center,1=far
					const dist = r * (1.2 + distFrac * 2.2);
					const dx = Math.cos(da) * dist;
					const dy = Math.sin(da) * dist * 0.5; // slightly elliptical
					const ds = Math.max(
						1,
						4 * (1 - distFrac * 0.6),
					); // shrinks toward center
					const da2 = 0.2 + distFrac * 0.7;
					ctx.fillStyle = `rgba(180,120,255,${da2})`;
					ctx.beginPath();
					ctx.arc(dx, dy, ds, 0, Math.PI * 2);
					ctx.fill();
				}
				ctx.restore();

				// ── Suction spiral streams ────────────────────────────
				ctx.save();
				ctx.translate(z.x, z.y);
				for (let s = 0; s < 4; s++) {
					ctx.beginPath();
					const baseAngle = spin + s * (Math.PI / 2);
					for (let step = 0; step <= 40; step++) {
						const frac = step / 40;
						const spiralR = r * (0.25 + frac * 2.8);
						const spiralA =
							baseAngle + frac * Math.PI * 3;
						const sx = Math.cos(spiralA) * spiralR;
						const sy =
							Math.sin(spiralA) * spiralR * 0.7;
						step === 0
							? ctx.moveTo(sx, sy)
							: ctx.lineTo(sx, sy);
					}
					const alpha = 0.15 + (s % 2) * 0.15;
					ctx.strokeStyle = `rgba(140,60,255,${alpha})`;
					ctx.lineWidth = 1.2;
					ctx.stroke();
				}
				ctx.restore();

				// ── Wide gravitational distortion haze ────────────────
				const haze = ctx.createRadialGradient(
					z.x,
					z.y,
					r * 0.3,
					z.x,
					z.y,
					r * 3.8,
				);
				haze.addColorStop(0, "rgba(0,0,0,0.85)");
				haze.addColorStop(0.25, "rgba(30,0,60,0.5)");
				haze.addColorStop(0.55, "rgba(60,0,100,0.25)");
				haze.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = haze;
				ctx.beginPath();
				ctx.arc(z.x, z.y, r * 3.8, 0, Math.PI * 2);
				ctx.fill();

				// ── Accretion disk — hot glowing ring ─────────────────
				const disk = ctx.createRadialGradient(
					z.x,
					z.y,
					r * 0.85,
					z.x,
					z.y,
					r * 1.6,
				);
				disk.addColorStop(0, "rgba(255,200,255,0.0)");
				disk.addColorStop(0.3, "rgba(200,80,255,0.85)");
				disk.addColorStop(0.6, "rgba(120,0,200,0.55)");
				disk.addColorStop(1, "rgba(0,0,60,0)");
				ctx.save();
				ctx.translate(z.x, z.y);
				ctx.scale(1, 0.38); // flatten into disk shape
				ctx.fillStyle = disk;
				ctx.beginPath();
				ctx.arc(0, 0, r * 1.6, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();

				// ── Absolute black core ────────────────────────────────
				const coreR = r * 0.78;
				const cg = ctx.createRadialGradient(
					z.x,
					z.y,
					0,
					z.x,
					z.y,
					coreR,
				);
				cg.addColorStop(0, "rgba(0,0,0,1)");
				cg.addColorStop(0.7, "rgba(0,0,0,1)");
				cg.addColorStop(0.9, "rgba(10,0,20,0.95)");
				cg.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = cg;
				ctx.beginPath();
				ctx.arc(z.x, z.y, coreR, 0, Math.PI * 2);
				ctx.fill();

				// ── Event horizon bright rim ───────────────────────────
				const rimPulse =
					0.7 + Math.sin(t * 8 + z.phase) * 0.3;
				ctx.beginPath();
				ctx.arc(z.x, z.y, r * 0.82, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(220,160,255,${rimPulse * 0.95})`;
				ctx.lineWidth = 2.5;
				ctx.stroke();
				// Second thinner ring
				ctx.beginPath();
				ctx.arc(z.x, z.y, r * 1.02, 0, Math.PI * 2);
				ctx.strokeStyle = `rgba(180,80,255,${rimPulse * 0.5})`;
				ctx.lineWidth = 1.2;
				ctx.stroke();
			}
		},

		drawPowerUps(list) {
			for (const pu of list) {
				if (pu.collected) continue;
				ctx.save();
				ctx.translate(pu.x, pu.y);
				const pulse = 1 + Math.sin(pu.animT * 4) * 0.15;
				ctx.scale(pulse, pulse);

				// Glow
				const gg = ctx.createRadialGradient(
					0,
					0,
					0,
					0,
					0,
					22,
				);
				gg.addColorStop(0, pu.color + "aa");
				gg.addColorStop(1, "rgba(0,0,0,0)");
				ctx.fillStyle = gg;
				ctx.fillRect(-22, -22, 44, 44);

				// Box
				ctx.fillStyle = "rgba(0,0,0,0.7)";
				ctx.strokeStyle = pu.color;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.rect(-11, -11, 22, 22);
				ctx.fill();
				ctx.stroke();

				// Icon (letter)
				ctx.fillStyle = pu.color;
				ctx.font = "bold 12px monospace";
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";
				const icons = {
					fire: "F",
					shield: "S",
					homing: "H",
					speed: "V",
					mega: "M",
					life: "+",
				};
				ctx.fillText(icons[pu.type] || "?", 0, 0);
				ctx.textAlign = "left";
				ctx.textBaseline = "alphabetic";

				ctx.restore();
			}
		},

		drawMessages(messages, t) {
			for (const m of messages) {
				const alpha = Math.min(1, m.life * 2);
				ctx.globalAlpha = alpha;
				ctx.font = `bold ${m.size}px monospace`;
				ctx.textAlign = "center";
				// Ombre via shadowBlur — évite tout doublon d'emoji
				ctx.shadowColor = "rgba(0,0,0,0.9)";
				ctx.shadowBlur = 4;
				ctx.shadowOffsetX = 2;
				ctx.shadowOffsetY = 2;
				ctx.fillStyle = m.color;
				ctx.fillText(m.text, m.x, m.y);
				// Reset shadow
				ctx.shadowColor = "transparent";
				ctx.shadowBlur = 0;
				ctx.shadowOffsetX = 0;
				ctx.shadowOffsetY = 0;
				ctx.textAlign = "left";
				ctx.globalAlpha = 1;
			}
		},
	};
}

function lighten(hex, amount) {
	const num = parseInt(hex.replace("#", ""), 16);
	const r = Math.min(255, (num >> 16) + amount);
	const g = Math.min(255, ((num >> 8) & 0xff) + amount);
	const b = Math.min(255, (num & 0xff) + amount);
	return `rgb(${r},${g},${b})`;
}

// ---
let _resumeSave = null; // set below
let _startGame = null; // set below after startGame is defined

// ── Boot screen animé ───────────────────────────────────────────────────
(() => {
	const s = document.createElement("div");
	s.id = "iw-boot";
	Object.assign(s.style, {
		position: "fixed",
		inset: "0",
		background: "#000",
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		zIndex: "99999",
		fontFamily: "monospace",
	});
	s.innerHTML = `
<style>
@keyframes iwLogoFlame{0%,100%{text-shadow:0 0 20px #ff6600,0 0 40px #ff3300;transform:scale(1);}50%{text-shadow:0 0 40px #ffaa00,0 0 80px #ff6600;transform:scale(1.08);}}
@keyframes iwBarPulse{0%,100%{opacity:1;}50%{opacity:0.7;}}
@keyframes iwDotBounce{0%,100%{transform:translateY(0);}50%{transform:translateY(-6px);}}
#iw-boot-bar-fill{height:100%;border-radius:6px;background:linear-gradient(to right,#cc2200,#ff6600,#ffcc00);transition:width 0.35s cubic-bezier(0.4,0,0.2,1);box-shadow:0 0 12px #ff6600;animation:iwBarPulse 1.2s ease infinite;}
</style>
<div style="font-size:56px;animation:iwLogoFlame 1.5s ease-in-out infinite;margin-bottom:14px;">🔥</div>
<div style="font-size:22px;font-weight:900;letter-spacing:5px;color:#f97316;margin-bottom:4px;">INFERNO WING</div>
<div style="font-size:10px;color:#4b5563;letter-spacing:3px;margin-bottom:26px;">IS DAOUDA GAMES</div>
<div style="width:240px;height:8px;background:#1f2937;border-radius:6px;overflow:hidden;border:1px solid #374151;">
<div id="iw-boot-bar-fill" style="width:0%;"></div>
</div>
<div style="margin-top:12px;display:flex;align-items:center;gap:10px;">
<span id="iw-boot-pct" style="font-size:13px;font-weight:900;color:#ff6600;min-width:42px;text-align:right;">0%</span>
<span id="iw-boot-label" style="font-size:10px;color:#6b7280;letter-spacing:1px;">INITIALISATION…</span>
</div>
<div style="margin-top:22px;display:flex;gap:8px;">
<div style="width:6px;height:6px;border-radius:50%;background:#ff6600;animation:iwDotBounce 0.8s ease infinite;animation-delay:0s;opacity:0.7;"></div>
<div style="width:6px;height:6px;border-radius:50%;background:#ff6600;animation:iwDotBounce 0.8s ease infinite;animation-delay:0.18s;opacity:0.7;"></div>
<div style="width:6px;height:6px;border-radius:50%;background:#ff6600;animation:iwDotBounce 0.8s ease infinite;animation-delay:0.36s;opacity:0.7;"></div>
</div>
`;
	document.body.appendChild(s);
	window._iwBootProgress = function (pct, label) {
		const fill = document.getElementById("iw-boot-bar-fill");
		const pctEl = document.getElementById("iw-boot-pct");
		const lblEl = document.getElementById("iw-boot-label");
		if (fill) fill.style.width = pct + "%";
		if (pctEl) pctEl.textContent = Math.round(pct) + "%";
		if (lblEl) lblEl.textContent = label || "";
	};
})();

idb.preload().then(() => {
	document.getElementById("iw-boot")?.remove();
	// Re-synchroniser settings depuis le cache IDB
	settings.musicVol = parseFloat(
		idb.getItem("iw_musicVol") ?? "0.4",
	);
	settings.sfxVol = parseFloat(idb.getItem("iw_sfxVol") ?? "0.7");
	settings.difficulty = idb.getItem("iw_difficulty") || "normal";
	settings.rumble = idb.getItem("iw_rumble") !== "false";
	settings.lang = idb.getItem("iw_lang") || null;
	settings.playerName = idb.getItem("iw_playerName") || null;
	// Re-charger tous les modules depuis le cache IDB (badges, missions, historique, stats)
	achStats.reload?.();
	pilotLevel.reload?.();
	dailySystem.reload?.();
	seasonBadges.reload?.();
	matchHistory.reload?.();

	game(
		(tools) => {
			const { ctx, loop, ui, on, canvas } = tools;
			// width/height définis comme propriétés dynamiques — toujours à jour après resize
			Object.defineProperty(globalThis, "__iw_tools", {
				value: tools,
				configurable: true,
			});
			// Utiliser des getters locaux pour que width/height reflètent le resize
			const _dims = {
				get width() {
					return tools.width;
				},
				get height() {
					return tools.height;
				},
			};
			let width = tools.width;
			let height = tools.height;
			// Mettre à jour width/height à chaque frame via un resize observer
			window.addEventListener(
				"resize",
				() => {
					width = tools.width;
					height = tools.height;
				},
				{ passive: true },
			);
			//initInput(canvas);
			// ────────────────────────────────────────────────
			//  GESTION DES TOUCHES CLAVIER
			// ────────────────────────────────────────────────
			const keys = {}; // { ArrowLeft: true, ArrowRight: true, ... }

			window.addEventListener("keydown", (e) => {
				if (
					e.target.tagName === "INPUT" ||
					e.target.tagName === "TEXTAREA" ||
					e.target.isContentEditable
				) {
					return;
				}
				if (
					[
						"ArrowLeft",
						"ArrowRight",
						"ArrowUp",
						"ArrowDown",
						"a",
						"d",
						"w",
						"s",
						" ",
					].includes(e.key)
				) {
					e.preventDefault(); // évite le scroll page
				}
				keys[e.key] = true;
			});

			window.addEventListener("keyup", (e) => {
				if (
					e.target.tagName === "INPUT" ||
					e.target.tagName === "TEXTAREA" ||
					e.target.isContentEditable
				) {
					return;
				}
				keys[e.key] = false;
			});

			function isKeyDown(key) {
				// Support WASD + flèches
				if (key === "left")
					return (
						keys["ArrowLeft"] || keys["a"] || keys["A"]
					);
				if (key === "right")
					return (
						keys["ArrowRight"] || keys["d"] || keys["D"]
					);
				if (key === "up")
					return (
						keys["ArrowUp"] || keys["w"] || keys["W"]
					);
				if (key === "down")
					return (
						keys["ArrowDown"] || keys["s"] || keys["S"]
					);
				if (key === "shoot")
					return keys[" "] || keys["z"] || keys["Z"];
				if (key === "mega") return keys["x"] || keys["X"];
				return false;
			}

			_initTouch();

			// Désactiver le menu contextuel (clic droit) dans tout le jeu
			document.addEventListener(
				"contextmenu",
				(e) => e.preventDefault(),
				true,
			);

			try {
				audio.init();
			} catch (e) {}
			canvas.style.cursor = "none";
			canvas.addEventListener(
				"pointerdown",
				() => {
					try {
						audio.resume();
					} catch (e) {}
				},
				{ once: true },
			);

			const state = {
				phase: "menu",
				paused: false,
				level: 0,
				score: 0,
				hiScore: parseInt(idb.getItem("inferno_hi") || "0"),
				combo: 0,
				comboTimer: 0,
				comboMax: 3.5,
				lives: 3,
				bgOffset: 0,
				levelTime: 0,
				bossSpawned: false,
				bossDefeated: false,
				transitionTimer: 0,
				flashTimer: 0,
				screenShake: 0,
				messages: [],
				// ── Kill streak ──────────────────────────────────────
				killStreak: 0,
				streakTimer: 0,
				streakMax: 4.0, // seconds window between kills
				frenzyMode: false,
				frenzyTimer: 0,
				// ── Survival mode ─────────────────────────────────────
				isSurvival: false,
				survivalWave: 0,
				survivalWaveTimer: 0,
				survivalWaveDur: 12, // seconds per wave
				survivalTotalTime: 0,
				// ── Daily run ─────────────────────────────────────────
				// ── Upgrade pending ───────────────────────────────────
				pendingUpgrade: false,
				scoreMul: 1,
				scoreMulTimer: 0,
				// ── Run session tracking for daily ────────────────────
				sessionKills: 0,
				sessionBosses: 0,
				sessionPowerups: 0,
				sessionNoDmgLevels: 0,
				runLevelDeaths: 0,
				runTotalTime: 0,
				// ── Rage mode ─────────────────────────────────────────
				rageMode: false,
				ragePulse: 0,
				lastPowerupType: null,
				eliteKillCount: 0,
				eliteWaveCount: 0,
			};

			// Player Y for interceptor targeting
			let _playerY = 0;

			const player = createPlayer(width, height);
			const bullets = createBulletManager();
			const enemies = createEnemyManager();
			const particles = createParticleSystem();
			const powerups = createPowerUpManager();
			const boss = createBossManager();
			const renderer = createRenderer(ctx, tools);
			const hud = createHUD(ui);

			// Wire save-resume button (defined here, hoisted via _resumeSave)
			_resumeSave = function () {
				const d = saveGame.load();
				if (d) {
					const _as = achStats.get();
					_as.resumes = (_as.resumes || 0) + 1;
					achStats.save();
					startGame(d);
				}
			};

			// ── PAUSE ──────────────────────────────────────────────────────────────────
			function togglePause() {
				// If an overlay screen (achievements/leaderboard) is open,
				// pressing pause dismisses it and restores game state
				const achEl =
					document.getElementById("ach-back-btn");
				const lbEl = document.getElementById("lb-back-btn");
				if (achEl) {
					achEl.click();
					return;
				}
				if (lbEl) {
					lbEl.click();
					return;
				}

				// Bloquer si le menu d'amélioration est ouvert
				if (document.querySelector(".upg-btn")) return;

				if (
					state.phase !== "playing" &&
					state.phase !== "boss" &&
					state.phase !== "transition"
				)
					return;
				state.paused = !state.paused;
				_setPauseIcon(state.paused);
				if (state.paused) {
					audio.pauseMusic();
					saveGame.save(state, player); // auto-save on pause
					{
						const _as = achStats.get();
						_as.pauses = (_as.pauses || 0) + 1;
						achStats.save();
					}
					// Hide touch controls during pause
					_showTouchLayer(false);
					// Show pause overlay
					let ov = document.getElementById("pause-ov");
					if (!ov) {
						ov = document.createElement("div");
						ov.id = "pause-ov";
						document.body.appendChild(ov);
					}
					ov.style.cssText =
						"position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:8000;";
					ov.innerHTML = `
		<div style="color:#ff9900;font-size:48px;font-weight:900;font-family:monospace;text-shadow:0 0 30px #ff4400;letter-spacing:6px;margin-bottom:28px;">${t("pause")}</div>
		<div style="display:flex;flex-direction:column;gap:10px;align-items:center;">
			<button id="ov-resume" style="padding:13px 44px;background:linear-gradient(to right,#b22200,#e05a00);border:none;border-radius:12px;color:#fff;font-size:17px;font-weight:900;font-family:monospace;cursor:pointer;letter-spacing:2px;">${t("resume")}</button>
			<button id="ov-ach"   style="padding:9px 32px;background:#1a1a1a;border:2px solid #374151;border-radius:10px;color:#9ca3af;font-size:13px;font-weight:bold;font-family:monospace;cursor:pointer;">⭐ ${t("achievements")}</button>
			<button id="ov-lb"    style="padding:9px 32px;background:#1a1a1a;border:2px solid #374151;border-radius:10px;color:#9ca3af;font-size:13px;font-weight:bold;font-family:monospace;cursor:pointer;">🏆 ${t("leaderboard")}</button>
			<button id="ov-menu"  style="padding:9px 32px;background:#1a1a1a;border:2px solid #444;border-radius:10px;color:#aaa;font-size:14px;font-weight:bold;font-family:monospace;cursor:pointer;">${t("mainMenu")}</button>
		</div>
		<div style="color:#555;font-size:11px;margin-top:18px;font-family:monospace;">${t("pauseHint")}</div>`;
					ov.querySelector("#ov-resume").addEventListener(
						"click",
						() => togglePause(),
					);
					ov.querySelector("#ov-ach").addEventListener(
						"click",
						() => {
							document
								.getElementById("pause-ov")
								?.remove();
							hud.renderAchievements(() => {
								togglePause();
								togglePause();
							});
						},
					);
					ov.querySelector("#ov-lb").addEventListener(
						"click",
						() => {
							document
								.getElementById("pause-ov")
								?.remove();
							hud.renderLeaderboard(() => {
								togglePause();
								togglePause();
							});
						},
					);
					ov.querySelector("#ov-menu").addEventListener(
						"click",
						() => {
							saveGame.save(state, player);
							showAd(); // Quitter vers menu
							state.paused = false;
							state.phase = "menu";
							audio.stopMusic();
							document
								.getElementById("pause-ov")
								?.remove();
							_showPauseBtn(false);
							_showTouchLayer(false);
							_setPauseIcon(false);
							ui.clear();
							hud.renderMenu(state);
							audio.startMusic("menu");
						},
					);
					// Activer la navigation clavier/gamepad dans le menu pause
					menuNav.activate();
				} else {
					document.getElementById("pause-ov")?.remove();
					// Reprendre la musique là où elle était sans la recommencer
					audio.resumeMusic();
					// Restore touch controls when resuming
					_showTouchLayer(true);
				}
			}
			_pauseToggle = togglePause;

			// Pause button click
			document
				.getElementById("pause-btn")
				?.addEventListener("click", () => togglePause());

			// Auto-pause when window loses focus during gameplay
			window.addEventListener("blur", () => {
				if (
					!state.paused &&
					(state.phase === "playing" ||
						state.phase === "boss" ||
						state.phase === "transition")
				) {
					togglePause();
				}
			});

			function addMessage(text, color, size) {
				size = size || 28;
				state.messages.push({
					text,
					color,
					size,
					life: 2.0,
					x: width / 2,
					y: height / 2 - 40,
				});
			}

			function triggerShake(amount) {
				state.screenShake = Math.max(
					state.screenShake,
					amount,
				);
			}

			// ── Publicité interstitielle ───────────────────────────────────────
			function showAd() {
				try {
					GamePix.interstitialAd().then(function (res) {
						if (res.success) {
							// Log the success if you want
						} else {
							// Log the error if you want
						}
					});
				} catch (e) {}
			}

			window.addEventListener("load", function () {
				window.focus();
				document.body.addEventListener(
					"click",
					function (e) {
						window.focus();
					},
					false,
				);
			});

			function startGame(fromSave, mode) {
				menuNav.deactivate();
				saveGame.clear();
				{
					const _as = achStats.get();
					_as.totalRuns = (_as.totalRuns || 0) + 1;
					achStats.save();
				}
				_deathsRun = 0;
				_puRun = 0;
				_lvlDeaths = 0;
				_runStart = Date.now();
				// Reset new session tracking
				state.sessionKills = 0;
				state.sessionBosses = 0;
				state.sessionPowerups = 0;
				state.runLevelDeaths = 0;
				state.killStreak = 0;
				state.streakTimer = 0;
				state.rageMode = false;
				state.frenzyMode = false;
				state.frenzyTimer = 0;
				state.isSurvival = mode === "survival";
				if (state.isSurvival) {
					state.survivalWave = 0;
					// Forcer le déclenchement immédiat de la vague 1 dès le début
					state.survivalWaveTimer = state.survivalWaveDur;
					state.survivalTotalTime = 0;
				}
				state.score = 0;
				state.lives =
					settings.difficulty === "easy"
						? 5
						: settings.difficulty === "hard"
							? 2
							: 3;
				state.paused = false;
				state.combo = 0;
				state.comboTimer = 0;
				// Mettre à jour les dimensions du joueur avec les valeurs actuelles
				player.width = tools.width;
				player.height = tools.height;
				player.reset();
				_showPauseBtn(true);
				_showTouchLayer(true);
				if (fromSave) {
					const d = fromSave;
					// Restaurer le mode en priorité (avant startLevel)
					if (d.isSurvival) {
						state.isSurvival = true;
						state.survivalWave = d.survivalWave || 0;
						state.survivalWaveTimer =
							d.survivalWaveTimer || 0;
						state.survivalTotalTime =
							d.survivalTotalTime || 0;
					}

					state.score = d.score || 0;
					state.lives = d.lives || 3;
					state.levelTime = d.levelTime || 0;
					player.fireLevel = d.fireLevel || 1;
					player.hasShield = d.hasShield || false;
					player.permanentShield = d.permanentShield || false;
					player.invincible = player.hasShield;
					player.hasHoming = d.hasHoming || false;
					player.speedBoost = d.speedBoost || false;
					player.megaReady = d.megaReady || false;
					startLevel(d.level || 0, true);
					// Restaurer zones de danger et fire powerup depuis la sauvegarde
					if (d.dangerZones && d.dangerZones.length) {
						state.dangerZones = d.dangerZones;
					}
					if (d.firePowerupPending !== undefined) {
						state._firePowerupPending =
							d.firePowerupPending;
						state._firePowerupKills =
							d.firePowerupKills || 0;
					}
					// Restaurer bossSpawned APRÈS startLevel (qui le remet à false)
					if (d.bossSpawned) {
						state.bossSpawned = true;
						// Si la sauvegarde était pendant le combat de boss,
						// re-spawner le boss et restaurer la phase
						if (d.phase === "boss") {
							const lvlData = LEVELS[d.level || 0];
							if (lvlData && lvlData.boss) {
								state.phase = "boss";
								enemies.reset();
								boss.spawn(
									lvlData.boss,
									tools.width,
									tools.height,
								);
								audio.startMusic("boss");
							}
						}
					}
				} else {
					startLevel(0);
				}
			}
			_startGame = startGame; // expose to HUD event handlers
			const UPGRADES = [
				{
					id: "firepower",
					icon: "🔥",
					fr: "Puissance de feu +1",
					en: "Fire Power +1",
					apply: () => {
						if (player.fireLevel < 5)
							player.fireLevel++;
					},
				},
				{
					id: "speed",
					icon: "⚡",
					fr: "Vitesse +20%",
					en: "Speed +20%",
					apply: () => {
						player.speed = (player.speed || 220) * 1.2;
					},
				},
				{
					id: "shield",
					icon: "🛡",
					fr: "Bouclier permanent",
					en: "Permanent shield",
					apply: () => {
						player.hasShield = true;
						player.shieldTimer = Infinity;
						player.invincible = true;
						player.invincibleTimer = Infinity;
						player.permanentShield = true;
					},
				},
				{
					id: "homing",
					icon: "🎯",
					fr: "Missiles guidés 45s",
					en: "Homing missiles 45s",
					apply: () => {
						player.hasHoming = true;
						player.homingTimer = 45;
					},
				},
				{
					id: "extralife",
					icon: "❤️",
					fr: "Vie supplémentaire",
					en: "Extra life",
					apply: () => {
						state.lives++;
					},
				},
				{
					id: "megaready",
					icon: "💥",
					fr: "Mega Blast chargé",
					en: "Mega Blast ready",
					apply: () => {
						player.megaReady = true;
					},
				},
				{
					id: "rapidfire",
					icon: "🔫",
					fr: "Cadence ×1.5 pendant 30s",
					en: "Fire rate ×1.5 for 30s",
					apply: () => {
						player.shootRateBoost = true;
						player.shootRateTimer = 30;
					},
				},
				{
					id: "doublescore",
					icon: "💫",
					fr: "Score ×2 pendant 30s",
					en: "Score ×2 for 30s",
					apply: () => {
						state.scoreMul = 2;
						state.scoreMulTimer = 30;
					},
				},
			];

			function showUpgradeMenu(onPick) {
				const pool = [...UPGRADES]
					.sort(() => Math.random() - 0.5)
					.slice(0, 3);
				audio.stopMusic();
				_showTouchLayer(false);
				_showPauseBtn(false); // cacher le bouton pause pendant l'upgrade
				state.paused = true;
				const lang = settings.lang || "en";

				// Bloquer uniquement les touches qui pourraient fermer l'écran (Echap, P)
				const _blockEsc = (e) => {
					if (e.code === "Escape" || e.code === "KeyP") {
						e.stopPropagation();
						e.preventDefault();
					}
				};
				window.addEventListener("keydown", _blockEsc, true);

				ui.render(`
	<div style="
		position:absolute;inset:0;
		display:flex;flex-direction:column;
		align-items:center;justify-content:center;
		background:rgba(0,0,0,0.92);
		color:#fff;font-family:monospace;gap:clamp(8px,1.5vh,16px);
		padding:clamp(10px,2vh,20px);
		overflow-y:auto;
	">
		<div style="font-size:clamp(18px,4vh,28px);font-weight:900;color:#f97316;letter-spacing:3px;animation:fadeInDown 0.4s ease;">
			${lang === "fr" ? "⬆️ AMÉLIORATION" : "⬆️ UPGRADE"}
		</div>
		<div style="font-size:clamp(11px,1.8vh,14px);color:#9ca3af;">
			${lang === "fr" ? "Choisissez une amélioration" : "Choose an upgrade"}
		</div>
		<div style="display:flex;gap:clamp(8px,1.5vw,16px);flex-wrap:wrap;justify-content:center;">
			${pool
				.map(
					(u, i) => `
				<button class="upg-btn" data-idx="${i}" style="
					display:flex;flex-direction:column;align-items:center;gap:clamp(4px,1vh,8px);
					padding:clamp(12px,2.5vh,20px) clamp(14px,2.5vw,24px);border-radius:16px;
					background:#111827;border:2px solid #374151;
					color:#fff;font-family:monospace;cursor:pointer;
					animation:upgradePopIn 0.4s ease both ${i * 0.1}s;
					min-width:clamp(90px,18vw,110px);
				">
					<div style="font-size:clamp(24px,5vh,36px);">${u.icon}</div>
					<div style="font-weight:900;font-size:clamp(10px,1.8vh,13px);color:#f97316;">${lang === "fr" ? u.fr : u.en}</div>
				</button>
			`,
				)
				.join("")}
		</div>
	</div>
`);
				setTimeout(() => {
					document
						.querySelectorAll(".upg-btn")
						.forEach((btn, i) => {
							btn.addEventListener("click", () => {
								window.removeEventListener(
									"keydown",
									_blockEsc,
									true,
								);
								pool[i].apply();
								audio.sfx.powerUp();
								ui.clear();
								state.paused = false;
								_showPauseBtn(true);
								_showTouchLayer(true); // restaurer joystick après upgrade
								onPick();
							});
						});
				}, 0);
			}

			function startLevel(lvl, isResume) {
				state.level = lvl;
				state.phase = "playing";
				if (!isResume) state.levelTime = 0;
				state.bossSpawned = false;
				state.bossDefeated = false;
				enemies.reset();
				boss.reset();
				powerups.reset();
				bullets.reset();
				particles.reset();
				state.messages = [];

				// FIX spawn-flood au resume : pré-marquer comme "déjà spawnés"
				// tous les groupes dont le time < levelTime actuel.
				// Sans ça, au 1er appel de update(), tous les groupes passés
				// spawneraient dans la même frame → avalanche d'ennemis.
				if (isResume) {
					const lvlData = LEVELS[lvl];
					if (lvlData && lvlData.enemyGroups) {
						for (const group of lvlData.enemyGroups) {
							if (group.time < state.levelTime) {
								const key = `${group.time}_${group.type}`;
								enemies.markSpawned(key);
							}
						}
					}
				}

				player.resetPosition(tools.width, tools.height);

				// Fire powerup au niveau 1 : spawn aléatoire sur kill ennemi
				// (géré dans la collision enemies, pas par timer)
				if (lvl === 0 && !isResume) {
					state._firePowerupPending = true;
				} else {
					state._firePowerupPending = false;
				}
				// Météorites — actives dès le niveau 1
				if (!isResume) {
					state.meteors = [];
					state._meteorTimer = Math.max(
						0.8,
						2.5 - lvl * 0.2,
					);
				}
				// Zones de danger — toujours initialisées (dès niveau 0)
				if (!isResume) {
					state.dangerZones = [];
					const zoneCount = Math.max(
						1,
						Math.floor(1 + lvl * 0.7),
					);
					for (let z = 0; z < zoneCount; z++) {
						state.dangerZones.push({
							x: 350 + Math.random() * 350,
							y: 60 + Math.random() * (300 - 60),
							r: 24 + Math.random() * 20,
							phase: Math.random() * Math.PI * 2,
							speedX:
								(Math.random() < 0.5 ? 1 : -1) *
								(35 + Math.random() * 35),
							speedY:
								(Math.random() < 0.5 ? 1 : -1) *
								(25 + Math.random() * 25),
							color:
								lvl <= 1
									? "#ff4400"
									: lvl <= 3
										? "#aa00ff"
										: lvl <= 5
										? "#ff0088"
										: "#00ffaa",
							dmgCooldown: 0,
						});
					}
				}
				// En mode survie on n'affiche pas "Niveau N" (non pertinent)
				if (!state.isSurvival) {
					addMessage(
						(isResume
							? t("resumeLevel")
							: t("level") + " ") +
							(lvl + 1),
						"#ff6600",
						40,
					);
				}
				audio.startMusic(lvl);
				hud.renderHUD(state, player);
			}

			function gainScore(base, x, y, isEnemyKill) {
				state.combo++;
				state.comboTimer = state.comboMax;
				const multiplier = Math.min(
					state.combo,
					state.comboCap || 8,
				);

				// Rage mode — vérifié sur TOUT gain de score, pas seulement les kills
				if (
					state.combo >= MAX_COMBO_RAGE &&
					!state.rageMode
				) {
					state.rageMode = true;
					state.ragePulse = 0;
					addMessage(
						settings.lang === "fr"
							? "💢 MODE RAGE !"
							: "💢 RAGE MODE!",
						"#ff0000",
						26,
					);
					const _ru = dailySystem.markMissionProgress(
						"rage",
						1,
					);
					for (const _rm of _ru) _notifyMission(_rm);
				}

				// Kill streak system
				if (isEnemyKill) {
					state.killStreak++;
					state.streakTimer = state.streakMax;
					// Track max streak in achStats
					const _as = achStats.get();
					if (
						state.killStreak > (_as.maxKillStreak || 0)
					) {
						_as.maxKillStreak = state.killStreak;
						achStats.save();
					}
					// FRENZY at streak 10
					if (
						state.killStreak >=
							(state.streakThreshold || 10) &&
						!state.frenzyMode
					) {
						state.frenzyMode = true;
						state.frenzyTimer = 8.0;
						addMessage("🔥 FRENZY x2!", "#ff2200", 30);
						audio.sfx.powerUp();
					}
					// Daily mission: streak
					const streakUnlocked =
						dailySystem.setMissionAbsolute(
							"streak",
							state.killStreak,
						);
					dailySystem.setMissionAbsolute(
						"streak2",
						state.killStreak,
					);
					if (state.combo >= 50) {
						seasonBadges.unlock("comboMaster");
						const _c10u =
							dailySystem.setMissionAbsolute(
								"combo10",
								state.combo,
							);
						for (const _cm of _c10u)
							_notifyMission(_cm);
					}
					for (const m of streakUnlocked)
						_notifyMission(m);
				}

				const frenzyMul = state.frenzyMode ? 2 : 1;
				const scoreMul = state.scoreMul || 1;
				const gained = Math.round(
					base * multiplier * frenzyMul * scoreMul,
				);
				state.score += gained;
				if (state.score > state.hiScore) {
					state.hiScore = state.score;
					idb.setItem(
						"inferno_hi",
						String(state.hiScore),
					);
				}

				// Daily mission: score
				const scoreUnlocked =
					dailySystem.setMissionAbsolute(
						"score",
						state.score,
					);
				dailySystem.setMissionAbsolute(
					"score2",
					state.score,
				);
				for (const m of scoreUnlocked) _notifyMission(m);

				state.messages.push({
					text: "+" + gained,
					color:
						multiplier >= 4
							? "#ffdd00"
							: state.frenzyMode
								? "#ff8800"
								: "#ff8844",
					size: 16 + Math.min(multiplier * 2, 14),
					life: 1.0,
					x: x,
					y: y,
				});
				if (multiplier >= 4) {
					state.messages.push({
						text: multiplier + "x COMBO!",
						color: "#ff2200",
						size: 22,
						life: 1.2,
						x: x,
						y: y - 28,
					});
				}
				// Show streak milestone
				if (
					isEnemyKill &&
					state.killStreak > 0 &&
					state.killStreak % 5 === 0
				) {
					state.messages.push({
						text: state.killStreak + " STREAK! 🔥",
						color: "#ff8800",
						size: 22,
						life: 1.5,
						x: x,
						y: y - 50,
					});
				}
			}

			function loseLife() {
				if (player.invincible) return;
				state.lives--;
				triggerShake(12);
				state.combo = 0;
				state.comboTimer = 0;
				state.rageMode = false; // Rage s'éteint si on perd une vie
				// Break streak
				state.killStreak = 0;
				state.streakTimer = 0;
				state.frenzyMode = false;
				state.runLevelDeaths++;
				audio.sfx.playerHit();
				gamepad.rumble(350, 0.7, 1.0);
				_deathsRun++;
				_lvlDeaths++;
				particles.burst(
					player.x,
					player.y,
					"#ff4400",
					40,
					"explosion",
				);
				if (state.lives <= 0) {
					state.phase = "gameover";
					// Submit score to leaderboard
					if (state.score > 0 && settings.playerName) {
						firebase
							.submitScore(
								settings.playerName,
								state.score,
								settings.difficulty,
							)
							.then((ok) => {
								if (ok) {
									const _as = achStats.get();
									_as.scoreSubmitted =
										(_as.scoreSubmitted || 0) +
										1;
									achStats.save();
									achStats.check(_notifyAch);
								}
								const el =
									document.getElementById(
										"lb-status",
									);
								if (el)
									el.textContent = ok
										? t("scoreSent")
										: "";
							});
					}
					{
						const _as = achStats.get();
						_as.hiScore = Math.max(
							_as.hiScore || 0,
							state.score,
						);
						achStats.save();
						achStats.check(_notifyAch);
					}
					// ── End-of-run accounting ────────────────────────────────
					{
						const xpGained =
							Math.round(state.score / 100) +
							state.sessionKills * 2 +
							state.sessionBosses * 50;
						pilotLevel.addXP(xpGained);
						pilotLevel.get().gamesPlayed++;
						pilotLevel.save();
						matchHistory.push({
							score: state.score,
							level: state.level + 1,
							kills: state.sessionKills,
							bosses: state.sessionBosses,
							wave: state.isSurvival
								? state.survivalWave
								: null,
							mode: state.isSurvival
								? "survival"
								: "normal",
							xp: xpGained,
							diff: settings.difficulty,
						});
						// Daily time mission
						dailySystem.setMissionAbsolute(
							"time",
							state.runTotalTime || state.levelTime,
						);
						dailySystem.setMissionAbsolute(
							"time2",
							state.runTotalTime || state.levelTime,
						);
						dailySystem.completeDailyRun(state.score); // Bonus XP quotidien une fois/jour
					}
					saveGame.clear();
					audio.stopMusic();
					audio.sfx.playerHit();
					gamepad.rumble(350, 0.7, 1.0);
					_showPauseBtn(false);
					_showTouchLayer(false);
					setTimeout(function () {
						showAd(); // 1. Interstitiel Game Over
						audio.sfx.gameOver();
						hud.renderGameOver(state);
					}, 800);
				} else {
					player.respawn();
				}
			}

			// NOTE: We intentionally do NOT start the game on canvas tap
			// during menus on mobile — buttons in ui-layer handle that.
			// On desktop, the btn-start click handler below works fine.
			// Keeping this only for gameover/win where the whole screen
			// acts as a "tap to retry" zone but only if no button was hit.
			canvas.addEventListener("pointerdown", function (e) {
				// Only act if the tap was NOT on a ui-layer button
				if (
					e.target.closest &&
					e.target.closest("#ui-layer")
				)
					return;
				if (
					state.phase === "gameover" ||
					state.phase === "win"
				) {
					const _mode = state.isSurvival
						? "survival"
						: undefined;
					showAd(); // 4. Interstitiel Rejouer
					startGame(null, _mode);
				}
			});

			on("click", "#btn-start", function (e) {
				e.stopPropagation();
				audio.sfx.select();
				const btn = e.target.closest("#btn-start");
				const mode = btn?.dataset?.mode || "";
				ui.clear();
				startGame(null, mode || undefined);
			});

			on("click", "#btn-menu-go", function (e) {
				showAd(); // Retour menu
				state.paused = false;
				state.phase = "menu";
				audio.stopMusic();
				_showPauseBtn(false);
				_showTouchLayer(false);
				_setPauseIcon(false);
				ui.clear();
				hud.renderMenu(state);
				audio.startMusic("menu");
			});

			// ── STARTUP SEQUENCE ────────────────────────────────────────────────────
			// 1. IS Daouda Games splash  (3 s, flash at 1.2 s)
			// 2. "Tap to continue" screen
			// 3. Onboarding (lang / name)
			// 4. Main menu

			const LOGO_SRC =
				"data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAHgAoADASIAAhEBAxEB/8QAHQABAQACAwEBAQAAAAAAAAAAAAUGBwMECAIBCf/EADkQAQACAQMDAgUCBAMHBQAAAAABAgMEBREGEiEHMRMiQVFhFDIII3GBFZGhFkJDUnKxwWJ0ktLw/8QAGwEBAAIDAQEAAAAAAAAAAAAAAAQFAQMGBwL/xAAlEQEAAgIBBAIBBQAAAAAAAAAAAQMCBBEFEiExBhNhFTJBUZH/2gAMAwEAAhEDEQA/APGQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQ+qVm94rHvLMNh6Sy67S/EikzPHLRfsYURznK06X0fa6pZNevjzMIQq71tObQ5Z5rPCU+67cbMe7GfCNu6V2ldNN2PEwlA59Dp/1Wrx6fvrTvnjut7Q2IjuxMS/XFlx202tyaeclcnZbjurPiXKCUC10/smfcc0cUnta7LMa8e7KfCXpaV27dFNOPMy4hlO89M5dHp++1Zjxyxe9Zraaz9HxRsYXxzhKT1To+10uyMNjHiZSQG9VqoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAAAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAL+10i+rpE/d6K9JtipqNsnNekTExxDzvtForrKTP3erfQXLi1Wzzp4mO6qk6lj3W44z6enfCrfo0L7MPfj/ABhvqT0HM4smbDh7qT5mIj2efuo9kzbfqLfJPby/oFq9mx6nDbHkpExMceWkPVz01tTHl1Wmwd2OfMxEezRVnnqZcx+1cb+vq/Iqfrz4xuj1P9/iXmZxZcUWnlb33acuhz2+SeOUlfVW42492LyTd0rtK6abo4mEoFvpvZM246mvyT28/Yssxrx7sjS0rt26KaY5mVDYtpy63PX5Z45bz9OuhrTjpnzYuKR5iJj3UvSf03vlrj1eqwzXHHmImPdu3SbNj02GuPHSIiI48KC3PPby5nxi9b0NfV+PVfXhxldPuf6/ENFermw48G1RlrjiIiOJeZN5xxj1t4j7vYHr7mxaXZf08zHdZ5B3y0W115j7pHTY7bcohT/NbPv0KLMv3ef8cwC7eYpQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAAAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJQAKoAJ2nyTiy1vH0lu/0V64jZ9dita/yTxFo5aMdvbddl0eaL0tMcIe5rffj49x6dH8c63+mXTFkc15eMo/D+lHSm8bbvmgx59PmpabRHMc+YVdw2nS6vTWx5a1tW0ceXhPpb1F3LaZrOm1l8fH0i3hmmX116hvpfgTrIiOOOY90CM7MY7c8PLrstXUtzi3V2YjH8+Jhd9eugtv2/4ur0+TF225mac+YeXt2w1way9Ke0Szvq31C1+7TedRqr5Zn7y17qs1s+aclveW/p9NmGUzMcRP8ACq+X9R1dmquvDPvsx95cLO24q5tVWlvbl6S9CuhdBuVser1OTH219qTPmXmjT5bYcsXrPmGc9Ldda/aZrbTam+KY+0sdQpzzyjKI5iP4Z+IdR1daqyvLPssy9Zcenvbb9p0uk01ceKta1rHHhK6r3jbdj0GTPqM2Os1ieI58y8rYvXzf6aT4H6yJjjjmfdhHVnqZuW7d36jV3yc/SbeGmc7Mo7cMPK0x1dSrObdrZicfx5mWT+sXWn+M6/LeLcUiZisctO5rzkyWtP1ly67WZNXlm97c8uun6et9GPn3LkfkXW/1O6IrjivHxEJQCY5xVABKABVABKABVABKABVABKABVABKABVABKABVABKABVABKAAABVABKABVABKABVABKABVABKABVABKABVABKABVABKABVABKABVcebntcj5vHNQdO2ny101dTWJnFae2bR9J+0uLvt/zSt9H6rBXW22/W1i+l1cdlon6W+kvnqnYM+zajujnJpbz/Lyf+J/IzEzDqZL3tkrjx1m17TEViPMzM/R9ZqajSazLpNXithz4rdt6WjiYllfo/s1d16qpr9TXnS6GYyTzHi1/pH/llHrv07TN8LqXbsVZmkdur7I94+lp/wCww05jpfJkrjx1m17TFa1iPMzP0cms02o0WryaXU4r4c+K3belo4mJbF9Dumq63dp33X4onSaXmMXfHi+T7/2cvrzstKbpj37S1j4ef5M/b/zR7T/cGB2yTWOe5wxGXPGTJXn4eOOb2n2j8f1dnZ9t1W9ayMGnia4485Mk+1Yd7qydNpPg7JoY4x4vmzW+trfkZmZljQAwqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAAAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAAqgAlAA7uorMTF6zMWieYmGyOndbpd+2CMGspXJzHZlrP3j6te3jmrs9O7pbadbebTPwrx5j8x7AzPety0nR/Tt9s2iZrqNTM+bebRE+9pn/seknUEajBqentzt8fHkib44yTzzE/uhrvdtdm3HXZNVmmebT8sc/tj7PnbNZl0Gvw6zDPF8VotH5/ANq+pe8afY+nsew7PWum+P47cfjtp9f80b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J9/rDv8AUfVfUPUO9YN53bc8mbcNPStMOela4rY4rabV47IjiYmZnn3RAGya+s3qfXR101epbxFeY+J+lw98xxHibdnPjj39/M8zPjjB9Rq9y1G5Tumo1+rzbhN4yfqr5rWy98ccW75nnmOI88/R98R9n6DNtN68+rOnwVw4+r8vbWOIm+j097f/ACnHMz/XljuH1C6zx9b4OtZ37UZd/wBPE1w6vPWmWcdZrakxFbxNYji1vHHEc8x58sWAbY0/r/6x4MmoyYusLVvqLxfLP+HaWeZisVj/AIXjxWPb+vvMsO3PrHq7c+sdL1huW96nW75pM2LPp9VqO3J8O2O3fTisx2xWLee3jt9/HmUziPs/eI+wKvqN6idZeoet0ms6x3m255tJjnHgtOnxYopWZ5mOMdax5n6zHLsbN6oddbN0Pqeitt3z9PsGqx5cebSxpMM99csTGSJvNJv5iZj939GGgO3TDPZxLKOi/ULrrovTZdJ011BqdFpss91sFqUy44nz5rXJW0VmefMxEc+OfaEE4gGR9T+rXqJ1LtmXbN46n1GbSZo7cuLHhxYYvH2t8OtZmPxPhP3f1A6u3XpTT9La/d5y7PpqY8eLTRp8VeK444pHdWsWnjiPeZ5+rFwGR9JdUdR9JZ9Rn6e1/wCiyaisUy2+BjyTaInmI+es8f2dvU9edZajZNVsubeLW0Gqvlvnxfp8Ud85LzkvPdFe7za0z7/Xj28IvEfY4j7A7fT/AFl1JsG1Z9r2jcp0uk1F7Xy0jDjtNrTWKzPdaszHiI9pcHTXU++dNzqJ2XXfpZ1HbGX+VS/d288fuiePefZHAWtq3vfNr3DPr9BuGXBqNRMzmtERMXmZ581mOJ8zP0UNZ1t1dq9Nl0+fdrWx5aTS8Rgx1mYmOJ8xXmP7JPEfY4j7Aoz111VMcTuvj/2+L/6uluXU2+7jp7afV7he+K37q1pWkT/XtiEcB38GPthzACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAAACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqAAACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUACqACUAD/2Q==";
			const SOUND_SRC =
				"data:audio/mpeg;base64,//uQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uQZEEP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVQSkm5DQoEZ8UMKR17m1M8IfqMLyhDJwxfc+bmSYnAjeQElEDLahdoKOQKvChkVvIz4JrMVxLRrOokMGyociPnwHh2mLA5kcQD0DhDH+ZWOJ0EQzN4JAoQxLP5OysBBSSzcSBWPwzBpCcAuEZgkNBP/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABIZO3hILpbJCI83KvsMtIjQPcvY+C8FvKghI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VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kGRDD/AOAIADAAAIAcAQAGAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//uSZECP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/7kmRAj/AAAGkAAAAIAAANIAAAAQAAAaQAAAAgAAA0gAAABFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5JkQI/wAABpAAAACAAADSAAAAEAAAGkAAAAIAAANIAAAARVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";

			let _fullscreenDone = false;

			function _requestFullscreen() {
				if (_fullscreenDone) return;
				try {
					const el = document.documentElement;
					const req =
						el.requestFullscreen ||
						el.webkitRequestFullscreen ||
						el.mozRequestFullScreen ||
						el.msRequestFullscreen;
					if (
						req &&
						!document.fullscreenElement &&
						!document.webkitFullscreenElement
					) {
						req.call(el);
						_fullscreenDone = true;
					}
				} catch (e) {}
			}

			// Re-attempt fullscreen on first user gesture (browser may block first try)
			function _fsOnGesture() {
				if (_fullscreenDone) return;
				_requestFullscreen();
			}
			document.addEventListener("pointerdown", _fsOnGesture, {
				once: true,
				capture: true,
			});
			document.addEventListener("keydown", _fsOnGesture, {
				once: true,
				capture: true,
			});

			function _showSplash(onDone) {
				// Request fullscreen on first user gesture
				_requestFullscreen();

				// Play the logo sound
				const snd = new Audio(SOUND_SRC);
				snd.volume = 1.0;
				snd.play().catch(() => {});

				// Render the splash screen
				ui.render(`
	<div id="splash-screen" style="
		position: absolute; inset: 0;
		display: flex; align-items: center; justify-content: center;
		background: #000;
		overflow: hidden;
	">
		<img
			id="splash-logo"
			src="${LOGO_SRC}"
			alt="IS Daouda Games"
			style="
				width: 100%;
				height: 100%;
				object-fit: cover;
				opacity: 0;
				transform: scale(0.88);
				transition: opacity 0.6s ease, transform 0.6s ease;
			"
		/>
	</div>
`);

				// Fade + scale in
				const logo = document.getElementById("splash-logo");
				requestAnimationFrame(() => {
					requestAnimationFrame(() => {
						if (logo) {
							logo.style.opacity = "1";
							logo.style.transform = "scale(1)";
						}
					});
				});

				// Single flash (brightness spike) at 1.2 s
				setTimeout(() => {
					if (logo) {
						logo.style.transition = "filter 0.08s ease";
						logo.style.filter = "brightness(3)";
						setTimeout(() => {
							if (logo)
								logo.style.filter = "brightness(1)";
						}, 80);
					}
				}, 1200);

				// Done after 3 s
				setTimeout(() => {
					ui.clear();
					onDone();
				}, 3000);
			}

			function _showTapToContinue(onDone) {
				ui.render(`
	<div id="tap-screen" style="
		position: absolute; inset: 0;
		display: flex; flex-direction: column;
		align-items: center; justify-content: center;
		background: #000; color: #fff;
		font-family: monospace; gap: 28px;
		cursor: pointer; overflow: hidden;
	">
		<!-- Animated fire particles background -->
		<div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;">
			${Array.from({ length: 18 }, (_, i) => {
				const sz = 4 + Math.random() * 7,
					left = Math.random() * 100,
					delay = Math.random() * 5,
					dur = 4 + Math.random() * 5;
				return `<div style="position:absolute;left:${left}%;width:${sz}px;height:${sz}px;
					border-radius:50%;background:rgba(255,${60 + Math.floor(Math.random() * 100)},0,0.55);
					animation:bgParticle ${dur}s ${delay}s linear infinite;"></div>`;
			}).join("")}
		</div>

		<!-- Radial glow -->
		<div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(200,40,0,0.2) 0%,rgba(0,0,0,0.95) 65%);pointer-events:none;"></div>

		<!-- Game title with animated entrance -->
		<h1 style="
			position: relative;
			font-size: clamp(40px, 8vw, 68px);
			font-weight: 900; letter-spacing: 5px;
			color: #ff6600; margin: 0;
			animation: popIn 0.7s ease both, glowPulse 2.5s ease-in-out infinite 0.7s;
		">
			INFERNO WING
		</h1>

		<!-- Fire emoji floating -->
		<div style="position:relative;font-size:48px;animation:floatUp 2s ease-in-out infinite;line-height:1;">🔥</div>

		<div style="
			position: relative;
			font-size: 15px; color: #9ca3af;
			letter-spacing: 3px; text-transform: uppercase;
			animation: tapPulse 1.4s ease-in-out infinite 0.3s;
		">
			${settings.lang === "fr" ? "✦ APPUYEZ POUR CONTINUER ✦" : "✦ TAP TO CONTINUE ✦"}
		</div>
	</div>
`);

				// Any click / tap / key press continues
				function proceed(e) {
					e.stopPropagation();
					document.removeEventListener(
						"pointerdown",
						proceed,
						true,
					);
					document.removeEventListener(
						"keydown",
						proceed,
						true,
					);
					try {
						audio.resume();
					} catch (_) {}
					ui.clear();
					onDone();
				}
				document.addEventListener(
					"pointerdown",
					proceed,
					true,
				);
				document.addEventListener("keydown", proceed, true);
			}

			// Chain: splash → tap → menu+music
			_showTapToContinue(() => {
				_showSplash(() => {
					hud.renderMenu(state);
					audio.startMusic("menu");
				});
			});

			let _saveTimer = 0;
			let _achTimer = 0;
			let _hudTimer = 0;
			let _runStart = Date.now();
			let _deathsRun = 0;
			let _puRun = 0;
			let _lvlDeaths = 0;

			function _notifyMission(m) {
				if (!m) return;
				const n = document.createElement("div");
				const nm = settings.lang === "fr" ? m.fr : m.en;
				n.style.cssText =
					"position:fixed;bottom:120px;right:14px;background:rgba(0,40,20,0.95);border:2px solid #22cc88;border-radius:10px;padding:10px 14px;color:#fff;font-family:monospace;z-index:9999;max-width:240px;opacity:1;transition:opacity 0.5s;";
				n.innerHTML =
					'<div style="font-size:9px;color:#22cc88;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;">' +
					(settings.lang === "fr"
						? "✓ MISSION ACCOMPLIE"
						: "✓ MISSION COMPLETE") +
					"</div>" +
					'<div style="font-size:13px;font-weight:900;color:#fff;margin-bottom:2px;">' +
					nm +
					"</div>" +
					'<div style="font-size:10px;color:#22cc88;">+' +
					(m.xp || 0) +
					" XP</div>";
				document.body.appendChild(n);
				// Award XP
				pilotLevel.addXP(m.xp || 200);
				pilotLevel.save();
				// Badge tracking
				const bd = JSON.parse(
					idb.getItem("iw_bdg") || "{}",
				);
				bd.dailyDone = (bd.dailyDone || 0) + 1;
				idb.setItem("iw_bdg", JSON.stringify(bd));
				setTimeout(() => {
					n.style.opacity = "0";
					setTimeout(() => n.remove(), 600);
				}, 3500);
			}

			function _notifyAch(ach) {
				const n = document.createElement("div");
				const nm = settings.lang === "fr" ? ach.fr : ach.en;
				n.style.cssText =
					"position:fixed;bottom:72px;right:14px;background:rgba(0,0,0,0.92);border:2px solid #f97316;border-radius:10px;padding:10px 14px;color:#fff;font-family:monospace;z-index:9999;max-width:230px;opacity:1;transition:opacity 0.5s;";
				n.innerHTML =
					'<div style="font-size:9px;color:#f97316;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;">' +
					t("unlocked") +
					'</div><div style="display:flex;align-items:center;gap:8px;"><span style="font-size:22px;">' +
					ach.icon +
					'</span><span style="font-weight:700;font-size:12px;">' +
					nm +
					"</span></div>";
				document.body.appendChild(n);
				setTimeout(() => {
					n.style.opacity = "0";
					setTimeout(() => n.remove(), 600);
				}, 3000);
			}

			loop(function (dt) {
				// Poll gamepad for menu navigation when ui screens are active
				try {
					const gps = navigator.getGamepads?.() || [];
					for (const gp of gps) {
						if (gp && gp.connected) {
							menuNav.injectGamepadNav(gp);
							break;
						}
					}
				} catch (e) {}
				gamepad.inject(keys);

				// ── Gestion pause avec P ou Escape ──
				if (keys["p"] || keys["Escape"]) {
					if (!keys.pauseJustPressed) {
						togglePause();
						keys.pauseJustPressed = true;
					}
				} else {
					keys.pauseJustPressed = false;
				}

				if (
					state.phase === "menu" ||
					state.phase === "gameover" ||
					state.phase === "win"
				) {
					ctx.clearRect(0, 0, tools.width, tools.height);
					return;
				}
				if (state.paused) return;
				// Auto-save every 15 seconds
				_saveTimer += dt;
				if (_saveTimer > 15) {
					_saveTimer = 0;
					saveGame.save(state, player);
				}
				// Achievement tracking every 5s
				_achTimer += dt;
				if (_achTimer > 5) {
					_achTimer = 0;
					const _as = achStats.get();
					_as.totalTime = (_as.totalTime || 0) + 5;
					_as.hiScore = Math.max(
						_as.hiScore || 0,
						state.hiScore,
					);
					_as.maxCombo = Math.max(
						_as.maxCombo || 0,
						state.combo,
					);
					_as.maxLives = Math.max(
						_as.maxLives || 0,
						state.lives,
					);
					if (state.lives === 1)
						_as.closeCalls = (_as.closeCalls || 0) + 1;
					achStats.save();
					achStats.check(_notifyAch);
					// ── Badges survie / pilote ──
					if (
						state.isSurvival &&
						state.survivalTotalTime >= 300
					)
						seasonBadges.unlock("survive5");
					if (state.score >= 1000000)
						seasonBadges.unlock("score10k");
					if (pilotLevel.get().level >= 5)
						seasonBadges.unlock("pilot5");
				}
				if (
					state.phase === "menu" ||
					state.phase === "gameover" ||
					state.phase === "win"
				)
					return;

				// dt is already capped by the loop wrapper

				// Background scroll
				state.bgOffset += LEVELS[state.level].bgSpeed * dt;

				// Screen shake decay
				state.screenShake *= 0.85;
				if (state.screenShake < 0.3) state.screenShake = 0;

				// Flash
				if (state.flashTimer > 0) state.flashTimer -= dt;

				// Combo decay
				if (state.comboTimer > 0) {
					state.comboTimer -= dt;
					if (state.comboTimer <= 0) {
						state.combo = 0;
						state.rageMode = false; // Rage s'éteint quand le combo expire
					}
				}

				// Message lifetime
				for (
					var i = state.messages.length - 1;
					i >= 0;
					i--
				) {
					state.messages[i].life -= dt;
					if (state.messages[i].life <= 0)
						state.messages.splice(i, 1);
				}

				// Level time
				state.levelTime += dt;
				state.runTotalTime = (state.runTotalTime || 0) + dt;
				if (state.rageMode)
					state.ragePulse = (state.ragePulse || 0) + dt;

				// (Fire powerup niveau 1 géré sur kill d'ennemi — voir collision)
				state.runTotalTime = (state.runTotalTime || 0) + dt;

				// ── Météorites ──────────────────────────────────────────────
				if (
					state.level >= 1 &&
					state.meteors !== undefined
				) {
					state._meteorTimer -= dt;
					if (state._meteorTimer <= 0) {
						const spd =
							160 +
							Math.random() * 120 +
							state.level * 15;
						state.meteors.push({
							x: width + 30,
							y: 30 + Math.random() * (height - 60),
							r: 10 + Math.random() * 14,
							vx: -spd,
							vy: (Math.random() - 0.5) * 60,
							hp: 3,
							angle: Math.random() * Math.PI * 2,
							spin: (Math.random() - 0.5) * 4,
						});
						const interval = Math.max(
							0.8,
							2.8 - state.level * 0.25,
						);
						state._meteorTimer =
							interval +
							Math.random() * interval * 0.5;
					}
					for (
						let mi = state.meteors.length - 1;
						mi >= 0;
						mi--
					) {
						const mt = state.meteors[mi];
						mt.x += mt.vx * dt;
						mt.y += mt.vy * dt;
						mt.angle += mt.spin * dt;
						if (mt.y < mt.r) {
							mt.y = mt.r;
							mt.vy = Math.abs(mt.vy);
						}
						if (mt.y > height - mt.r) {
							mt.y = height - mt.r;
							mt.vy = -Math.abs(mt.vy);
						}
						// Off screen → remove
						if (mt.x < -50) {
							state.meteors.splice(mi, 1);
							continue;
						}
						// Player collision
						if (!player.invincible) {
							const mdx = player.x - mt.x,
								mdy = player.y - mt.y;
							if (
								Math.sqrt(mdx * mdx + mdy * mdy) <
								mt.r + 12
							) {
								state.meteors.splice(mi, 1);
								loseLife();
								continue;
							}
						}
						// Bullet collision — check player bullets
						for (const pb of bullets.playerBullets) {
							if (pb.dead) continue;
							const bmdx = pb.x - mt.x,
								bmdy = pb.y - mt.y;
							if (
								Math.sqrt(
									bmdx * bmdx + bmdy * bmdy,
								) <
								mt.r + 5
							) {
								pb.dead = true;
								mt.hp--;
								particles.burst(
									pb.x,
									pb.y,
									"#aa8866",
									5,
									"spark",
								);
								if (mt.hp <= 0) {
									particles.burst(
										mt.x,
										mt.y,
										"#886644",
										10,
										"explosion",
									);
									gainScore(
										50,
										mt.x,
										mt.y,
										false,
									);
									state.meteors.splice(mi, 1);
								}
								break;
							}
						}
					}
				}

				// Mise à jour des zones de danger (une seule fois)
				if (state.dangerZones && state.dangerZones.length) {
					for (const z of state.dangerZones) {
						z.x += z.speedX * dt;
						z.y += z.speedY * dt;
						if (
							z.x < z.r + 10 ||
							z.x > width - z.r - 10
						)
							z.speedX *= -1;
						if (z.y < 50 || z.y > height - 50)
							z.speedY *= -1;
						z.dmgCooldown = (z.dmgCooldown || 0) - dt;
						if (
							!player.invincible &&
							z.dmgCooldown <= 0
						) {
							const dx = player.x - z.x,
								dy = player.y - z.y;
							if (
								Math.sqrt(dx * dx + dy * dy) <
								z.r + 14
							) {
								loseLife();
								z.dmgCooldown = 2.0; // 2s cooldown to avoid instant death
							}
						}
					}
				}
				var lvlData = LEVELS[state.level];

				// Playing phase: spawn enemies, check boss trigger
				if (state.phase === "playing") {
					// En mode survie on passe un lvlData sans enemyGroups pour que
					// enemies.update() continue de faire bouger/animer les ennemis,
					// mais ne spawne PAS les groupes du niveau normal.
					const _lvlDataForUpdate = state.isSurvival
						? { ...lvlData, enemyGroups: [] }
						: lvlData;
					enemies.update(
						dt,
						_lvlDataForUpdate,
						state.levelTime,
						width,
						height,
						state.level,
					);

					// Drain pending enemy bullets
					var pending = enemies.drainPendingBullets();
					for (var j = 0; j < pending.length; j++) {
						bullets.addEnemy(pending[j]);
					}

					// Boss spawn trigger (uniquement en mode normal/daily, pas survie)
					if (
						!state.isSurvival &&
						!state.bossSpawned &&
						state.levelTime >= lvlData.bossTime
					) {
						state.bossSpawned = true;
						state.phase = "boss";
						enemies.reset();
						boss.spawn(lvlData.boss, width, height);
						addMessage(
							t("bossIncoming"),
							"#ff0000",
							36,
						);
						state.flashTimer = 0.5;
						triggerShake(8);
						audio.sfx.bossWarn();
						audio.startMusic("boss");
						hud.renderHUD(state, player);
					}
				}

				// ── Kill streak decay ─────────────────────────────────────────
				if (state.killStreak > 0 && !state.frenzyMode) {
					state.streakTimer -= dt;
					if (state.streakTimer <= 0) {
						state.killStreak = 0;
					}
				}
				if (state.frenzyMode) {
					state.frenzyTimer -= dt;
					if (state.frenzyTimer <= 0) {
						state.frenzyMode = false;
						state.killStreak = 0;
						addMessage("Frenzy terminé", "#888888", 18);
					}
				}
				if (state.scoreMulTimer > 0) {
					state.scoreMulTimer -= dt;
					if (state.scoreMulTimer <= 0) {
						state.scoreMulTimer = 0;
						state.scoreMul = 1;
						addMessage(
							settings.lang === "fr"
								? "Score ×2 terminé"
								: "Score ×2 ended",
							"#888888",
							18,
						);
					}
				}

				// ── Survival wave logic ───────────────────────────────────────────
				if (
					state.isSurvival &&
					(state.phase === "playing" ||
						state.phase === "survival")
				) {
					state.survivalTotalTime += dt;
					state.survivalWaveTimer += dt;
					if (
						state.survivalWaveTimer >=
						state.survivalWaveDur
					) {
						state.survivalWaveTimer = 0;
						state.survivalWave++;
						// Spawn harder wave each time
						const types = [
							"drone",
							"kamikaze",
							"turret",
							"interceptor",
							"carrier",
						];
						const waveSize =
							3 +
							Math.floor(state.survivalWave * 1.5);
						const typeIdx = Math.min(
							Math.floor(state.survivalWave / 3),
							types.length - 1,
						);
						for (let i = 0; i < waveSize; i++) {
							const t_type =
								types[
									Math.min(
										typeIdx + (i % 2),
										types.length - 1,
									)
								];
							enemies.list.push(
								enemies._createEnemy(
									t_type,
									width + 60 + i * 35,
									height *
										(0.15 +
											Math.random() * 0.7),
									i,
								),
							);
						}
						addMessage(
							t("survivalWave") +
								" " +
								state.survivalWave,
							"#ffaa00",
							26,
						);
						survivalData.setBest(state.survivalWave);
						// Ajouter un trou noir tous les 4 waves (max 6)
						if (
							state.isSurvival &&
							state.survivalWave % 4 === 0
						) {
							const maxZones = 6;
							if (!state.dangerZones)
								state.dangerZones = [];
							if (
								state.dangerZones.length < maxZones
							) {
								state.dangerZones.push({
									x:
										width * 0.4 +
										Math.random() * width * 0.5,
									y:
										50 +
										Math.random() *
											(height - 100),
									r: 26 + Math.random() * 16,
									phase:
										Math.random() * Math.PI * 2,
									speedX:
										(Math.random() < 0.5
											? 1
											: -1) *
										(30 + Math.random() * 30),
									speedY:
										(Math.random() < 0.5
											? 1
											: -1) *
										(20 + Math.random() * 25),
									color: "#aa00ff",
									dmgCooldown: 0,
								});
								// Message décalé pour ne pas se superposer au message de vague
								setTimeout(() => {
									addMessage(
										settings.lang === "fr"
											? "🕳 TROU NOIR !"
											: "🕳 BLACK HOLE!",
										"#aa00ff",
										22,
									);
								}, 1800);
							}
						}
						// Spawn mini-boss every 5 waves
						if (
							state.survivalWave % 5 === 0 &&
							!state.bossSpawned
						) {
							state.bossSpawned = true;
							state.phase = "boss";
							// Détruire tous les ennemis à l'écran et effacer les messages
							enemies.reset();
							state.messages = [];
							const bossVariants = [
								{
									name: "VAGUE BOSS",
									type: "colossus",
									hp: Math.round(
										150 +
											state.survivalWave * 20,
									),
									color: "#cc3300",
									coreColor: "#ff6600",
									w: 100,
									h: 80,
								},
								{
									name: "HYDRA SURVIE",
									type: "hydra",
									hp: Math.round(
										200 +
											state.survivalWave * 25,
									),
									color: "#004400",
									coreColor: "#00ff88",
									w: 120,
									h: 95,
								},
							];
							boss.spawn(
								bossVariants[
									((state.survivalWave / 5) % 2) |
										0
								],
								width,
								height,
							);
							addMessage(
								t("bossIncoming"),
								"#ff0000",
								36,
							);
							state.flashTimer = 0.5;
							triggerShake(8);
							audio.sfx.bossWarn();
							audio.startMusic("boss");
						}
					}
				}

				// Boss phase
				if (state.phase === "boss") {
					state.playerX = player.x;
					boss.update(
						dt,
						width,
						height,
						bullets,
						particles,
						state,
					);

					if (boss.isDead()) {
						gainScore(5000, width / 2, height / 2);
						particles.burst(
							boss.x,
							boss.y,
							"#ffaa00",
							80,
							"explosion",
						);
						triggerShake(20);
						addMessage(
							t("bossDefeated"),
							"#ffdd00",
							42,
						);
						audio.sfx.bossDead();
						gamepad.rumble(500, 1.0, 1.0);
						{
							const _as = achStats.get();
							_as.bossesKilled =
								(_as.bossesKilled || 0) + 1;
							state.sessionBosses++;
							// Daily boss mission
							const bu =
								dailySystem.markMissionProgress(
									"bosses",
									1,
								);
							dailySystem.markMissionProgress(
								"boss1",
								1,
							);
							for (const mb of bu) _notifyMission(mb);
							// ── Badge boss1 ──
							if (_as.bossesKilled >= 1)
								seasonBadges.unlock("boss1");
							if (player.hasShield)
								_as.bossKilledWithShield =
									(_as.bossKilledWithShield ||
										0) + 1;
							if (state.combo >= 5)
								_as.bossKilledWithCombo5 =
									(_as.bossKilledWithCombo5 ||
										0) + 1;
							if (player.fireLevel >= 5)
								_as.bossKilledAtMaxFire =
									(_as.bossKilledAtMaxFire || 0) +
									1;
							if (_lvlDeaths === 0)
								_as.bossNoDmg =
									(_as.bossNoDmg || 0) + 1;
							_lvlDeaths = 0;
							achStats.save();
							achStats.check(_notifyAch);
						}
						state.flashTimer = 0.8;
						state.phase = "transition";
						state.transitionTimer = 3.5;
						boss.active = false;
						// Le bouclier permanent expire à la fin du niveau
						if (player.permanentShield) {
							player.invincible = false;
							player.invincibleTimer = 0;
							player.hasShield = false;
							player.shieldTimer = 0;
							player.permanentShield = false;
						}
						// Reprendre la musique de niveau après le boss
						audio.startMusic(
							state.isSurvival ? 0 : state.level,
						);
						hud.renderHUD(state, player);
					}
				}

				// Transition phase
				if (state.phase === "transition") {
					state.transitionTimer -= dt;
					if (state.transitionTimer <= 0) {
						// En mode survie : après le boss, on reprend les vagues survie
						if (state.isSurvival) {
							state.bossSpawned = false;
							state.bossDefeated = false;
							enemies.reset();
							boss.reset();
							state.phase = "playing";
							// Prochaine vague immédiatement
							state.survivalWaveTimer =
								state.survivalWaveDur;
							addMessage(
								t("survivalWave") +
									" " +
									(state.survivalWave + 1),
								"#ffaa00",
								26,
							);
							hud.renderHUD(state, player);
							return;
						}
						if (state.level + 1 < LEVELS.length) {
							{
								const _as = achStats.get();
								_as.levelsCleared =
									(_as.levelsCleared || 0) + 1;
								if (state.level === 0) {
									_as.l1Time = state.levelTime;
									if (_deathsRun === 0)
										_as.l1NoDeath = true;
									if (_puRun === 0)
										_as.l1NoPowerup = true;
								}
								if (state.level === 1) {
									_as.l2Time = state.levelTime;
									if (_deathsRun === 0)
										_as.l2NoDeath = true;
								}
								_deathsRun = 0;
								_puRun = 0;
								achStats.save();
							}
							// Daily no-hit mission check
							if (state.runLevelDeaths === 0) {
								const nd =
									dailySystem.markMissionProgress(
										"nodmg",
										1,
									);
								for (const m of nd)
									_notifyMission(m);
							}
							state.runLevelDeaths = 0;
							// Show upgrade screen before next level
							showAd(); // 3. Interstitiel entre les niveaux
							showUpgradeMenu(() =>
								startLevel(state.level + 1),
							);
						} else {
							state.phase = "win";
							// Débloquer le mode Survie
							if (!state.isSurvival) {
								const alreadyUnlocked =
									idb.getItem(
										"iw_normal_cleared",
									);
								if (!alreadyUnlocked) {
									idb.setItem(
										"iw_normal_cleared",
										"1",
									);
									// Message de déblocage affiché après un délai
									setTimeout(() => {
										const lang =
											settings.lang || "en";
										const n =
											document.createElement(
												"div",
											);
										n.style.cssText = [
											"position:fixed",
											"top:0",
											"left:0",
											"right:0",
											"bottom:0",
											"display:flex",
											"align-items:center",
											"justify-content:center",
											"z-index:999999",
											"background:rgba(0,0,0,0.75)",
											"font-family:monospace",
										].join(";");
										n.innerHTML = `
							<div style="
								background:rgba(0,0,0,0.97);
								border:2px solid #ef4444;
								border-radius:16px;
								padding:28px 36px;
								color:#fff;
								text-align:center;
								max-width:min(340px,85vw);
								animation:popIn 0.4s ease;
								box-shadow:0 0 40px rgba(239,68,68,0.5);
							">
								<div style="font-size:44px;margin-bottom:10px;">💀</div>
								<div style="font-size:15px;color:#ef4444;font-weight:900;letter-spacing:2px;margin-bottom:10px;">
									${lang === "fr" ? "MODE SURVIE DÉBLOQUÉ !" : "SURVIVAL MODE UNLOCKED!"}
								</div>
								<div style="font-size:12px;color:#9ca3af;line-height:1.6;margin-bottom:16px;">
									${lang === "fr" ? "Défiez des vagues infinies d'ennemis !" : "Challenge endless waves of enemies!"}
								</div>
								<button id="_surv-unlock-ok" style="
									padding:8px 24px;background:#ef4444;border:none;
									border-radius:8px;color:#fff;font-weight:900;
									font-family:monospace;cursor:pointer;font-size:13px;
								">OK !</button>
							</div>`;
										document.body.appendChild(
											n,
										);
										const close = () => {
											n.style.transition =
												"opacity 0.4s";
											n.style.opacity = "0";
											setTimeout(
												() => n.remove(),
												450,
											);
										};
										document
											.getElementById(
												"_surv-unlock-ok",
											)
											?.addEventListener(
												"click",
												close,
											);
										setTimeout(close, 6000);
									}, 1500);
								}
							}
							{
								const _as = achStats.get();
								_as.totalRunTime =
									(Date.now() - _runStart) / 1000;
								_as.levelsCleared =
									(_as.levelsCleared || 0) + 1;
								if (settings.difficulty === "easy")
									_as.beatEasy = true;
								if (
									settings.difficulty === "normal"
								)
									_as.beatNormal = true;
								if (
									settings.difficulty === "hard"
								) {
									_as.beatHard = true;
									if (_deathsRun === 0)
										_as.hardNoDeath = true;
								}
								if (_deathsRun === 0)
									_as.fullRunNoDeath = true;
								if (
									state.level === 2 &&
									_deathsRun === 0
								)
									_as.l3NoDeath = true;
								_as.hiScore = Math.max(
									_as.hiScore || 0,
									state.score,
								);
								achStats.save();
								achStats.check(_notifyAch);
							}
							if (
								state.score > 0 &&
								settings.playerName
							) {
								firebase
									.submitScore(
										settings.playerName,
										state.score,
										settings.difficulty,
									)
									.then((ok) => {
										if (ok) {
											const _as =
												achStats.get();
											_as.scoreSubmitted =
												(_as.scoreSubmitted ||
													0) + 1;
											achStats.save();
										}
										const el =
											document.getElementById(
												"lb-status",
											);
										if (el)
											el.textContent = ok
												? t("scoreSent")
												: "";
									});
							}
							// ── Win accounting ────────────────────────────────────
							{
								const xpGained =
									Math.round(state.score / 80) +
									state.sessionKills * 2 +
									state.sessionBosses * 80 +
									500;
								pilotLevel.addXP(xpGained);
								pilotLevel.get().gamesPlayed++;
								pilotLevel.save();
								matchHistory.push({
									score: state.score,
									level: state.level + 1,
									kills: state.sessionKills,
									bosses: state.sessionBosses,
									mode: "win",
									xp: xpGained,
									diff: settings.difficulty,
								});
								dailySystem.setMissionAbsolute(
									"time",
									state.runTotalTime ||
										state.levelTime,
								);
								dailySystem.setMissionAbsolute(
									"time2",
									state.runTotalTime ||
										state.levelTime,
								);
								dailySystem.completeDailyRun(
									state.score,
								); // Bonus XP quotidien une fois/jour
							}
							saveGame.clear();
							audio.stopMusic();
							audio.sfx.victory();
							showAd(); // 2. Interstitiel Victoire
							_showPauseBtn(false);
							_showTouchLayer(false);
							hud.renderWin(state);
						}
					}
				}

				// Player update
				player.update(
					dt,
					width,
					height,
					isKeyDown,
					bullets,
					particles,
					state.level,
				);
				_playerY = player.y; // track for interceptor targeting

				// Bullets update — enemyList et bossRef passés pour le guidage homing
				bullets.update(
					dt,
					width,
					height,
					enemies.list,
					boss,
				);

				// Powerups update
				powerups.update(dt, width, height);

				// Particles update
				particles.update(dt);

				// --- COLLISIONS ---

				// Player bullets vs enemies
				if (state.phase === "playing") {
					for (
						var bi = 0;
						bi < bullets.playerBullets.length;
						bi++
					) {
						var bullet = bullets.playerBullets[bi];
						if (bullet.dead) continue;
						for (
							var ei = 0;
							ei < enemies.list.length;
							ei++
						) {
							var enemy = enemies.list[ei];
							if (enemy.dead) continue;
							if (
								rectsOverlap(
									bullet,
									bullet.w,
									bullet.h,
									enemy,
									enemy.w,
									enemy.h,
								)
							) {
								// Check if protected by a shielder (non-mega bullets)
								if (
									!bullet.isMega &&
									enemy.type !== "shielder"
								) {
									const shielder =
										enemies.list.find(
											(s) =>
												!s.dead &&
												s.type ===
													"shielder" &&
												s.shieldActive &&
												s.x > enemy.x && // shielder must be in front (to the right)
												Math.abs(
													s.y - enemy.y,
												) <
													s.shieldRadius &&
												Math.abs(
													s.x - enemy.x,
												) < s.shieldRadius,
										);
									if (shielder) {
										// Bullet blocked by shield — deflect
										bullet.dead = true;
										particles.burst(
											bullet.x,
											bullet.y,
											"#4488ff",
											5,
											"spark",
										);
										continue;
									}
								}
								bullet.dead = true;
								enemy.hp -= bullet.dmg;
								particles.burst(
									bullet.x,
									bullet.y,
									"#ffaa44",
									6,
									"spark",
								);
								if (enemy.hp <= 0) {
									enemy.dead = true;
									gainScore(
										enemy.score,
										enemy.x,
										enemy.y,
										true, // isEnemyKill
									);
									particles.burst(
										enemy.x,
										enemy.y,
										enemy.color || "#ff6600",
										18,
										"explosion",
									);

									// ── Loot garanti pour les élites ─────────────────────────
									if (enemy.isElite) {
										powerups.spawn(
											enemy.x,
											enemy.y,
										);
										powerups.spawn(
											enemy.x - 20,
											enemy.y + 15,
										);
										addMessage(
											settings.lang === "fr"
												? "💀 ÉLITE VAINCU !"
												: "💀 ELITE DOWN!",
											"#ffd700",
											24,
										);
										seasonBadges.unlock(
											"eliteSlayer",
										);
										const _eu =
											dailySystem.markMissionProgress(
												"elite",
												1,
											);
										for (const _em of _eu)
											_notifyMission(_em);
									}

									// ── Compteur élite (toutes les 10 kills) ────────────────
									state.eliteKillCount =
										(state.eliteKillCount ||
											0) + 1;
									if (
										state.eliteKillCount >= 10
									) {
										state.eliteKillCount = 0;
										state.eliteWaveCount =
											(state.eliteWaveCount ||
												0) + 1;
										// Spawn un ennemi élite à droite de l'écran
										const _eliteTypes = [
											"drone",
											"kamikaze",
											"interceptor",
										];
										const _et =
											_eliteTypes[
												state.eliteWaveCount %
													_eliteTypes.length
											];
										const _elite =
											enemies._createEnemy(
												_et,
												width + 40,
												height * 0.3 +
													Math.random() *
														height *
														0.4,
												0,
											);
										_elite.isElite = true;
										_elite.hp *= 3;
										_elite.score *= 4;
										_elite.speed *= 1.3;
										_elite.w *= 1.25;
										_elite.h *= 1.25;
										enemies.list.push(_elite);
										addMessage(
											settings.lang === "fr"
												? "👑 ÉLITE EN APPROCHE !"
												: "👑 ELITE INCOMING!",
											"#ffd700",
											22,
										);
									}

									// ── Chaîne d'explosions ──────────────────────────────────
									const _chainR = 65;
									for (const ne of enemies.list) {
										if (ne.dead || ne === enemy)
											continue;
										const cdx = ne.x - enemy.x,
											cdy = ne.y - enemy.y;
										if (
											cdx * cdx + cdy * cdy <
											_chainR * _chainR
										) {
											ne.hp -= 1; // dégât de chaîne
											particles.burst(
												ne.x,
												ne.y,
												"#ffaa00",
												6,
												"spark",
											);
											if (ne.hp <= 0) {
												ne.dead = true;
												gainScore(
													Math.round(
														ne.score *
															0.5,
													),
													ne.x,
													ne.y,
													true,
												);
												particles.burst(
													ne.x,
													ne.y,
													ne.color ||
														"#ff6600",
													12,
													"explosion",
												);
											}
										}
									}

									// ── Fire powerup garanti niveau 1 (aléatoire sur kill) ──
									if (
										state.level === 0 &&
										state._firePowerupPending
									) {
										// 40% de chance par kill ; garantie si >= 8 kills sans drop
										const killCount =
											(state._firePowerupKills =
												(state._firePowerupKills ||
													0) + 1);
										const forceSpawn =
											killCount >= 8;
										if (
											forceSpawn ||
											Math.random() < 0.4
										) {
											state._firePowerupPending = false;
											const fireType =
												TYPES.find(
													(ft) =>
														ft.type ===
														"fire",
												);
											if (fireType) {
												powerups.list.push({
													...fireType,
													x: enemy.x,
													y: enemy.y,
													vx: -70,
													vy:
														(Math.random() -
															0.5) *
														60,
													collected: false,
													animT: 0,
												});
											}
										}
									} else if (
										Math.random() < 0.18
									) {
										powerups.spawn(
											enemy.x,
											enemy.y,
										);
									}

									triggerShake(3);
									{
										const _as = achStats.get();
										_as.totalKills =
											(_as.totalKills || 0) +
											1;
										if (enemy.type === "drone")
											_as.droneKills =
												(_as.droneKills ||
													0) + 1;
										else if (
											enemy.type === "turret"
										)
											_as.turretKills =
												(_as.turretKills ||
													0) + 1;
										else if (
											enemy.type ===
											"kamikaze"
										)
											_as.kamikazeKills =
												(_as.kamikazeKills ||
													0) + 1;
										// interceptor / carrier kills
										if (
											enemy.type ===
											"interceptor"
										)
											achStats.get()
												.totalKills++;
										if (
											enemy.type === "carrier"
										)
											achStats.get()
												.totalKills++;
										achStats.save();
										// Daily kills mission
										const ku =
											dailySystem.markMissionProgress(
												"kills",
												1,
											);
										dailySystem.markMissionProgress(
											"kills2",
											1,
										);
										for (const m of ku)
											_notifyMission(m);
										state.sessionKills++;

										// ── Badge firstBlood ──
										if (_as.totalKills >= 1)
											seasonBadges.unlock(
												"firstBlood",
											);
										// ── Badge kills100 ──
										if (_as.totalKills >= 1000)
											seasonBadges.unlock(
												"kills100",
											);
										// ── Badge score10k ──
										if (state.score >= 1000000)
											seasonBadges.unlock(
												"score10k",
											);
										// ── Badge noHit (vague sans dégât) : on suit en live ──
										if (
											state.runLevelDeaths ===
												0 &&
											state.levelTime > 10
										)
											seasonBadges.unlock(
												"noHit",
											);
									}
								}
								break;
							}
						}
					}
				}

				// Player bullets vs boss
				if (state.phase === "boss" && boss.active) {
					var bh = boss.hitbox();
					for (
						var bi2 = 0;
						bi2 < bullets.playerBullets.length;
						bi2++
					) {
						var pb = bullets.playerBullets[bi2];
						if (pb.dead) continue;
						if (
							rectsOverlap(
								pb,
								pb.w,
								pb.h,
								bh,
								bh.w,
								bh.h,
							)
						) {
							pb.dead = true;
							boss.takeDamage(pb.dmg);
							particles.burst(
								pb.x,
								pb.y,
								"#ffdd00",
								8,
								"spark",
							);
							audio.sfx.bossHit();
							triggerShake(1);
						}
					}
				}

				// Enemy bullets vs player
				if (!player.invincible) {
					var playerHB = player.hitbox();
					for (
						var ebi = 0;
						ebi < bullets.enemyBullets.length;
						ebi++
					) {
						var eb = bullets.enemyBullets[ebi];
						if (eb.dead) continue;
						if (
							rectsOverlap(
								eb,
								eb.w,
								eb.h,
								playerHB,
								playerHB.w,
								playerHB.h,
							)
						) {
							eb.dead = true;
							loseLife();
							break;
						}
					}

					// Enemies collide with player
					for (
						var eci = 0;
						eci < enemies.list.length;
						eci++
					) {
						var en = enemies.list[eci];
						if (en.dead) continue;
						if (
							rectsOverlap(
								en,
								en.w,
								en.h,
								playerHB,
								playerHB.w,
								playerHB.h,
							)
						) {
							en.dead = true;
							particles.burst(
								en.x,
								en.y,
								"#ff4400",
								12,
								"explosion",
							);
							loseLife();
							break;
						}
					}

					// Boss body vs player
					if (state.phase === "boss" && boss.active) {
						var bosshb = boss.hitbox();
						if (
							rectsOverlap(
								playerHB,
								playerHB.w,
								playerHB.h,
								bosshb,
								bosshb.w,
								bosshb.h,
							)
						) {
							loseLife();
						}
					}
				}

				// Powerup collection
				var playerHB2 = player.hitbox();
				for (var pi = 0; pi < powerups.list.length; pi++) {
					var pu = powerups.list[pi];
					if (pu.collected) continue;
					if (
						rectsOverlap(
							pu,
							pu.w,
							pu.h,
							playerHB2,
							playerHB2.w,
							playerHB2.h,
						)
					) {
						pu.collected = true;
						// Power-up combo: 2x même type = version améliorée
						const _isCombo =
							state.lastPowerupType === pu.type;
						state.lastPowerupType = pu.type;
						if (_isCombo) {
							// Effet amélioré selon le type
							switch (pu.type) {
								case "fire":
									player.fireLevel = Math.min(
										player.fireLevel + 2,
										5,
									);
									break;
								case "shield":
									player.hasShield = true;
									if (!this.permanentShield) {
										player.shieldTimer = 16.0;
										player.invincible = true;
										player.invincibleTimer = 16.0;
									}
									break;
								case "homing":
									player.hasHoming = true;
									player.homingTimer = 20.0;
									break;
								case "speed":
									player.speedBoost = true;
									player.speedTimer = 14.0;
									break;
								case "mega":
									player.megaReady = true;
									// bonus: score x2 pendant 10s
									state.scoreMul = 2;
									state.scoreMulTimer = 10;
									break;
								case "life":
									state.lives = Math.min(
										state.lives + 2,
										5,
									);
									break;
								default:
									player.applyPowerUp(
										pu.type,
										state,
									);
							}
							gainScore(500, pu.x, pu.y);
							const _comboLabel =
								(settings.lang === "fr"
									? "⚡ COMBO "
									: "⚡ COMBO ") + pu.label;
							state.messages.push({
								text: _comboLabel,
								color: "#ffff00",
								size: 24,
								life: 2.0,
								x: pu.x,
								y: pu.y - 30,
							});
							state.lastPowerupType = null; // reset after combo
						} else {
							player.applyPowerUp(pu.type, state);
							gainScore(200, pu.x, pu.y);
							state.messages.push({
								text: pu.label,
								color: pu.color,
								size: 20,
								life: 1.5,
								x: pu.x,
								y: pu.y - 20,
							});
						}
						audio.sfx.powerUp();
						particles.burst(
							pu.x,
							pu.y,
							pu.color,
							12,
							"spark",
						);
						{
							const _as = achStats.get();
							_as.powerupsCollected =
								(_as.powerupsCollected || 0) + 1;
							state.sessionPowerups++;
							// Daily powerup mission
							const pu2 =
								dailySystem.markMissionProgress(
									"powerups",
									1,
								);
							dailySystem.markMissionProgress(
								"powerups2",
								1,
							);
							for (const mp of pu2)
								_notifyMission(mp);
							if (pu.type === "shield")
								_as.shieldsUsed =
									(_as.shieldsUsed || 0) + 1;
							if (pu.type === "homing")
								_as.homingUsed =
									(_as.homingUsed || 0) + 1;
							if (pu.type === "speed")
								_as.speedsUsed =
									(_as.speedsUsed || 0) + 1;
							if (pu.type === "life") {
								_as.livesCollected =
									(_as.livesCollected || 0) + 1;
							}
							_as.maxLives = Math.max(
								_as.maxLives || 0,
								state.lives,
							);
							_puRun++;
							achStats.save();
							achStats.check(_notifyAch);
						}
					}
				}

				// Clean up dead objects
				enemies.cleanup();
				bullets.cleanup();
				powerups.cleanup();

				// --- RENDER ---
				var shakeX = state.screenShake
					? (Math.random() - 0.5) * state.screenShake
					: 0;
				var shakeY = state.screenShake
					? (Math.random() - 0.5) * state.screenShake
					: 0;

				ctx.save();
				ctx.translate(shakeX, shakeY);

				renderer.drawBackground(
					state.bgOffset,
					state.level,
					state.phase,
					state.transitionTimer,
				);
				if (state.meteors && state.meteors.length)
					renderer.drawMeteors(state.meteors);
				if (state.dangerZones)
					renderer.drawDangerZones(
						state.dangerZones,
						state.levelTime,
					);
				renderer.drawPowerUps(powerups.list);
				renderer.drawEnemies(enemies.list, state.levelTime);
				if (
					state.phase === "boss" ||
					state.phase === "transition"
				) {
					renderer.drawBoss(boss);
				}
				renderer.drawBullets(
					bullets,
					state.combo,
					state.rageMode,
				);
				renderer.drawParticles(particles.list);
				renderer.drawPlayer(
					player,
					state.levelTime,
					state.level,
					state.combo,
					state.rageMode,
				);
				renderer.drawMessages(
					state.messages,
					state.levelTime,
				);

				// Flash overlay
				if (state.flashTimer > 0) {
					ctx.fillStyle =
						"rgba(255,100,0," +
						state.flashTimer * 0.6 +
						")";
					ctx.fillRect(-shakeX, -shakeY, width, height);
				}

				ctx.restore();

				// Update HUD at most every 150 ms (not every frame)
				if (!_hudTimer) _hudTimer = 0;
				_hudTimer += dt;
				if (_hudTimer >= 0.15) {
					_hudTimer = 0;
					hud.renderHUD(state, player);
				}
			});

			function rectsOverlap(a, aw, ah, b, bw, bh) {
				var ax = a.x - aw / 2,
					ay = a.y - ah / 2;
				var bx = b.x - bw / 2,
					by = b.y - bh / 2;
				return (
					ax < bx + bw &&
					ax + aw > bx &&
					ay < by + bh &&
					ay + ah > by
				);
			}
		},
		{ preset: "landscape" },
	);
}); // end idb.preload().then