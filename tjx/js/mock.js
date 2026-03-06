/**
 * ASTROCADE LOCAL MOCK
 * Simule l'environnement de la plateforme pour un usage hors-ligne.
 */

// 1. Configuration globale (extraite de votre fichier 'config') [cite: 27]
window.gameConfig = {
  "theme": "tropical_green",
  "playerColor": "#ffffff",
  "coinColor": "gold",
  "fuelCapacity": 50,
  "fuelConsumptionRate": "normal",
  "gravityStrength": "light",
  "startingSpeed": "fast",
  "starColor": "gold",
  "masterVolume": 0.7,
  "character": "null",
  "language": "en"
};

// 2. Mode de jeu [cite: 7]
window.mode = 'play'; 

link = "https://is-daouda.github.io/tjx/";

// 3. Définition de l'objet lib [cite: 1, 8]
window.lib = {
	// Mappe les assets du fichier 'asset_map' [cite: 29]
	assets : {
	  "player_character": {
		"url": link + "assets/player_character.webp",
		"type": "image",
		"aspect_ratio": [832, 1244]
	  },
	  "cannon": {
		"url": link + "assets/cannon.webp",
		"type": "image",
		"aspect_ratio": [851, 587]
	  },
	  "energy_reserve": {
		"url": link + "assets/energy_reserve.webp",
		"type": "image",
		"aspect_ratio": [640, 634]
	  },
	  "coin": {
		"url": link + "assets/coin.webp",
		"type": "image",
		"aspect_ratio": [859, 895]
	  },
	  "thorny_vine_top": {
		"url": link + "assets/thorny_vine_top.webp",
		"type": "image",
		"aspect_ratio": [555, 1530]
	  },
	  "thorny_vine_bottom": {
		"url": link + "assets/thorny_vine_bottom.webp",
		"type": "image",
		"aspect_ratio": [463, 1411]
	  },
	  "background_far": {
		"url": link + "assets/background_far.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "background_mid": {
		"url": link + "assets/background_mid.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "background_foreground": {
		"url": link + "assets/background_foreground.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "ground": {
		"url": link + "assets/ground.webp",
		"type": "image",
		"aspect_ratio": [1536, 1024]
	  },
	  "sfx_launch": {
		"url": link + "assets/sfx_launch.mp3",
		"type": "audio"
	  },
	  "sfx_coin": {
		"url": link + "assets/sfx_coin.mp3",
		"type": "audio"
	  },
	  "sfx_energy": {
		"url": link + "assets/sfx_energy.mp3",
		"type": "audio"
	  },
	  "sfx_hit": {
		"url": link + "assets/sfx_hit.mp3",
		"type": "audio"
	  },
	  "sfx_shield": {
		"url": link + "assets/sfx_shield.mp3",
		"type": "audio"
	  },
	  "sfx_jetpack_powerup": {
		"url": link + "assets/sfx_jetpack_powerup.mp3",
		"type": "audio"
	  },
	  "sfx_jetpack_thrust": {
		"url": link + "assets/sfx_jetpack_thrust.mp3",
		"type": "audio"
	  },
	  "music_jungle": {
		"url": link + "assets/music_jungle.mp3",
		"type": "audio"
	  },
	  "menu_background": {
		"url": link + "assets/menu_background.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "vulture": {
		"url": link + "assets/vulture.webp",
		"type": "image",
		"aspect_ratio": [938, 667]
	  },
	  "coconut": {
		"url": link + "assets/meteorite.webp",
		"type": "image",
		"aspect_ratio": [796, 792]
	  },
	  "magnet_powerup": {
		"url": link + "assets/magnet_powerup.webp",
		"type": "image",
		"aspect_ratio": [939, 887]
	  },
	  "jetpack_powerup": {
		"url": link + "assets/jetpack_powerup.webp",
		"type": "image",
		"aspect_ratio": [780, 880]
	  },
	  "background_forest_far_1": {
		"url": link + "assets/background_forest_far_1.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "background_forest_mid_1": {
		"url": link + "assets/background_forest_mid_1.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "background_forest_foreground_1": {
		"url": link + "assets/background_forest_foreground_1.webp",
		"type": "image",
		"aspect_ratio": [832, 1248]
	  },
	  "background_forest_far_2": {
		"url": link + "assets/background_forest_far_2.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "background_forest_mid_2": {
		"url": link + "assets/background_forest_mid_2.webp",
		"type": "image",
		"aspect_ratio": [832, 1248]
	  },
	  "background_forest_foreground_2": {
		"url": link + "assets/background_forest_foreground_2.webp",
		"type": "image",
		"aspect_ratio": [1024, 1536]
	  },
	  "sfx_click": {
		"url": link + "assets/sfx_click.mp3",
		"type": "audio"
	  },
	  "is_daouda_logo": {
		"url": link + "assets/is_daouda_logo.png",
		"type": "image",
		"aspect_ratio": [720, 540]
	  },
	  "logo_sound": {
		"url": link + "assets/logo_sound.mp3",
		"type": "audio"
	  }
	},

	// Récupère un asset par son ID [cite: 9]
	getAsset: function(id) {
		console.log(`[Lib] Récupération de l'asset: ${id}`);
		return this.assets[id];
	},

	// Simule le système d'animation [cite: 10, 14]
	getAnimationPlayer: function(assetId) {
		console.log(`[Lib] Création d'un player d'animation pour: ${assetId}`);
		return {
			update: (ts) => {},
			draw: (ctx, x, y, w, h) => {
				ctx.fillStyle = "magenta";
				ctx.fillRect(x, y, w, h); // Placeholder visuel
			},
			getCurrentFrame: () => ({ index: 0, total: 1 }),
			reset: () => {}
		};
	},

	// Simule le préchargement [cite: 15]
	preloadAnimation: async function(assetId) {
		return Promise.resolve();
	},

	addPlayerScoreToLeaderboard: async function(score) {
        const saved = localStorage.getItem('astrocade_save');
        const state = saved ? JSON.parse(saved) : {};
        const playerName = state.playerNickname || "Unknown";

        if (window.firebaseAPI) {
            await window.firebaseAPI.addScore(playerName, score);
            return { success: true };
        }
		if (GamePix) {
			GamePix.updateScore(score); // Envoie le score au classement officiel GamePix
		}
        console.error("Firebase non chargé");
        return { success: false };
    },

	getTopNEntriesFromLeaderboard: async function(n = 100) {
		if (window.firebaseAPI) {
			try {
				// 1. On récupère les données brutes de firebase-service.js
				const rawScores = await window.firebaseAPI.getTopScores(n);
				
				// 2. On "map" les données pour être SÛR d'envoyer les bonnes clés au jeu
				const formattedEntries = rawScores.map(entry => {
					return {
						// On force la clé "name" car c'est ce que le jeu utilise pour l'affichage
						username: entry.name || entry.playerNickname || "Unknown",
						// On s'assure que le score est bien un nombre
						score: parseInt(entry.score) || 0
					};
				});

				return { 
					success: true, 
					entries: formattedEntries 
				};
			} catch (error) {
				console.error("[Lib] Erreur lors de la récupération :", error);
				return { success: false, entries: [] };
			}
		}
		return { success: false, entries: [] };
	},

	// Persistance des données utilisateur (Local Storage) [cite: 23, 24, 26]
	saveUserGameState: async function(state) {
        if (!state) return { success: false };

        try {
            // 1. Sauvegarde via le SDK GamePix si disponible
            if (GamePix && GamePix.localStorage) {
                // GamePix attend souvent des paires clé/valeur simples
                GamePix.localStorage.setItem('astrocade_save', JSON.stringify(state));
                console.log("💾 Sauvegardé via SDK GamePix");
            }
            
            // 2. Double sauvegarde locale (sécurité)
            localStorage.setItem('astrocade_save', JSON.stringify(state));
            
            return { success: true, state: state };
        } catch (e) {
            console.error("Erreur sauvegarde:", e);
            return { success: false };
        }
    },

    getUserGameState: async function() {
        let saved = null;

        // 1. Tentative de lecture via GamePix
        if (GamePix && GamePix.localStorage) {
            saved = GamePix.localStorage.getItem('astrocade_save');
        }

        // 2. Secours via LocalStorage classique si GamePix est vide
        if (!saved) {
            saved = localStorage.getItem('astrocade_save');
        }

        return { 
            success: true, 
            state: saved ? JSON.parse(saved) : null 
        };
    },

	deleteUserGameState: async function() {
		localStorage.removeItem('astrocade_save');
		return { success: true };
	},
	
	log: function(message) {
		console.log("%c[Log]", "color: #00ff00; font-weight: bold;", message);
	},
	
	showGameParameters: function(config) {
		console.log("%c[Lib] showGameParameters", "color: #2196F3; font-weight: bold;", config);
	}
};

if (typeof window.setupGame === 'function') {
    window.setupGame();
}

// 4. Lancement automatique au chargement de la page 
window.onload = () => {
	if (typeof run === 'function') {
		console.log("Lancement de run('play')...");
		run(window.mode);
	} else {
		console.error("[Error] La fonction run(mode) n'est pas définie dans votre code de jeu.");
	}
};