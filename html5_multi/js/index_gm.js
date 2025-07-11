const cssLink = document.createElement('link');
cssLink.rel = 'stylesheet';
cssLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.css';
document.head.appendChild(cssLink);

const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/nprogress/0.2.0/nprogress.min.js';
script.onload = initNProgress;
document.body.appendChild(script);

function initNProgress() {
	// NProgress style
	const style = document.createElement('style');
	style.textContent = `
	#nprogress .bar {
		background: white !important;
		height: 3px;
	}
	#nprogress .peg {
		box-shadow: 0 0 10px white, 0 0 5px white;
	}
	`;
	document.head.appendChild(style);
	NProgress.start();
}
// <<< NProgress ---

var canvas = document.getElementById('canvas');
var isJsUpdateSize = 0;
var isJsInitGame = 0;
var normalScreen = (window.innerWidth > window.innerHeight);
var rscLink = "https://is-daouda.github.io/html5_multi/";

var elem = document.getElementById("gamescreen");
function openFullscreen() {
	if (elem.requestFullscreen) {
		elem.requestFullscreen();
	}
	else if (elem.webkitRequestFullscreen) { /* Safari */
		elem.webkitRequestFullscreen();
 	 }
	else if (elem.msRequestFullscreen) { /* IE11 */
		elem.msRequestFullscreen();
	}
}

// --- I Can Transform v2.5 >>>
document.documentElement.className = "loading_page";
document.body.className = "loading_page";

var langIndex = 0; // English
var userLang = navigator.language || navigator.userLanguage;
if (userLang === "fr" || userLang === "fr-FR" || userLang === "fr-fr") langIndex = 1;

var paramRscLink = rscLink;
var isJsParam1, isJsParam2, isJsParam3;
var strLoadingError;

function loadObjDesc() {
	var txtFile = new XMLHttpRequest();
	var allParam = "";
	txtFile.onreadystatechange = function () {
		if (txtFile.readyState === XMLHttpRequest.DONE && txtFile.status === 200) {
			allParam = txtFile.responseText;
			var paramList = allParam.split('\n');
			
			document.getElementById('loading_title').innerHTML = paramList[langIndex];
			document.getElementById('loading_msg').innerHTML = paramList[2 + langIndex];
			document.getElementById('msg_start').innerHTML = paramList[4 + langIndex];
			isJsParam1 = paramList[6];
			isJsParam2 = paramList[7];
			isJsParam3 = paramList[8];
			strLoadingError = paramList[9 + langIndex];
		}
	}
	txtFile.open("GET", paramRscLink + "param.txt", true);
	txtFile.send(null);		
}

loadObjDesc();

function hideLoadingScreen() {
	document.getElementById("screen_loading").remove();
	document.documentElement.className = "game_page";
	document.body.className = "game_page";
	NProgress.done();
	document.getElementById('screen_cover').style.display = "block";
}
// <<< I Can Transform v2.5 ---

////////////////////////////////////////////////////////////////////////////
//						---	MULTIPLAYER >>>
////////////////////////////////////////////////////////////////////////////

// ---------------------- DATABASE ----------------------
function initMultiPlayerDB() {
	const firebaseConfig = {
	apiKey: "AIzaSyCKAOqjqn-0IUAtbaf7603yPRV-qlZRsP4",
		authDomain: "ict-html5.firebaseapp.com",
		databaseURL: "https://ict-html5-default-rtdb.firebaseio.com",
		projectId: "ict-html5",
		storageBucket: "ict-html5.appspot.com",
		messagingSenderId: "792013620073",
		appId: "1:792013620073:web:480e1943e47fc9b3fd73f8"
	};
	  
	firebase.initializeApp(firebaseConfig);
}

// ---------------------- VARIABLES ----------------------
var playerId;
var playerRef;
var players = {};
var playersKey = {};

var profileRef;
var profiles;
var profileId;

var roomRef;	
var rooms;
var roomId;

var isJsPlayers = {};
var canLockRoom = true;
var isJsMultiPlayerNotif = 0;

var timeNotifCount = -1;
var timeWaitCount = -1;
var TIME_WAIT_MAX = 0;
var TIME_QUIT_ROOM = 15;
const TIME_WAIT_DEFAULT = 5;
var timerAction = "";

// ---------------------- TIMER FUNCTIONS ----------------------
function getDateSys() {
	let currentDate = new Date();
	return currentDate.getDate() + "/" + (currentDate.getMonth() + 1) + "/" + currentDate.getFullYear() + " " +
			currentDate.getHours() + ":" + currentDate.getMinutes() + ":" + currentDate.getSeconds();
}

function timerStop() {
	timeWaitCount = -1;
}

function timerNotifStart(notifIndex) {
	if (timeNotifCount === -1) {
		isJsMultiPlayerNotif = notifIndex;
		timeNotifCount = 10;
	}
}

function timerNotifStop() {
	isJsMultiPlayerNotif = 0;
	timeNotifCount = -1;
}

function timerSetAction(action, time = TIME_WAIT_DEFAULT) {
	timeWaitCount = 0;
	TIME_WAIT_MAX = time;
	timerAction = action;
}

// ---------------------- IN GAME FUNCTIONS ----------------------
function isJsGetOtherPlayerX(id) {
	return isJsPlayers[id].x;
}

function isJsGetOtherPlayerY(id) {
	return isJsPlayers[id].y;
}

function isJsGetOtherPlayerXScale(id) {
	return isJsPlayers[id].xscale;
}

function isJsGetOtherPlayerYScale(id) {
	return isJsPlayers[id].yscale;
}

function isJsGetOtherPlayerAngle(id) {
	return isJsPlayers[id].angle;
}

function isJsGetOtherPlayerFrame(id) {
	return isJsPlayers[id].frame;
}

function isJsGetOtherPlayerDisqualify(id) {
	return isJsPlayers[id].disqualify;
}

function isJsGetOtherPlayerQuit(id) {
	return isJsPlayers[id].quit;
}

function isJsGetOtherPlayerFinish(id) {
	return isJsPlayers[id].finish;
}

function isJsGetOtherPlayerLevelTime(id) {
	return isJsPlayers[id].levelTime;
}

function isJsGetOtherPlayerPoint(id) {
	return isJsPlayers[id].point;
}

function isJsGetOtherPlayerLevel(id) {
	return isJsPlayers[id].playerLevel;
}

function isJsGetOtherPlayerUsername(id, codeIndex) {
	switch(codeIndex) {
		case 0: return isJsPlayers[id].username_code0; break;
		case 1: return isJsPlayers[id].username_code1; break;
		case 2: return isJsPlayers[id].username_code2; break;
		case 3: return isJsPlayers[id].username_code3; break;
		case 4: return isJsPlayers[id].username_code4; break;
		case 5: return isJsPlayers[id].username_code5; break;
		case 6: return isJsPlayers[id].username_code6; break;
		case 7: return isJsPlayers[id].username_code7; break;
		case 8: return isJsPlayers[id].username_code8; break;
		case 9: return isJsPlayers[id].username_code9; break;
		default: return -1;
	}
}

function isJsSetPlayerData(linkCode, point, playerLevel, usernameCode0, usernameCode1, usernameCode2, usernameCode3, usernameCode4,
							usernameCode5, usernameCode6, usernameCode7, usernameCode8, usernameCode9) {
	try {/*
		profiles[profileId].datePlay = getDateSys();
		profiles[profileId].point = point;
		profiles[profileId].playerLevel = playerLevel;
		profiles[profileId].username_code0 = usernameCode0;
		profiles[profileId].username_code1 = usernameCode1;
		profiles[profileId].username_code2 = usernameCode2;
		profiles[profileId].username_code3 = usernameCode3;
		profiles[profileId].username_code4 = usernameCode4;
		profiles[profileId].username_code5 = usernameCode5;
		profiles[profileId].username_code6 = usernameCode6;
		profiles[profileId].username_code7 = usernameCode7;
		profiles[profileId].username_code8 = usernameCode8;
		profiles[profileId].username_code9 = usernameCode9;
		profileRef.set(profiles[profileId]);*/
	
		players[playerId].isJsLinkCode = linkCode;
		players[playerId].point = point;
		players[playerId].playerLevel = playerLevel;
		players[playerId].username_code0 = usernameCode0;
		players[playerId].username_code1 = usernameCode1;
		players[playerId].username_code2 = usernameCode2;
		players[playerId].username_code3 = usernameCode3;
		players[playerId].username_code4 = usernameCode4;
		players[playerId].username_code5 = usernameCode5;
		players[playerId].username_code6 = usernameCode6;
		players[playerId].username_code7 = usernameCode7;
		players[playerId].username_code8 = usernameCode8;
		players[playerId].username_code9 = usernameCode9;
		playerRef.set(players[playerId]);
	}
	catch(err) {console.log(err);}
}

function isJsSetPlayerInGameData(x, y, xscale, yscale, angle, frame, disqualify, finish, levelTime) {
	players[playerId].x = x;
	players[playerId].y = y;
	players[playerId].xscale = xscale;
	players[playerId].yscale = yscale;
	players[playerId].angle = angle;
	players[playerId].frame = frame;
	players[playerId].disqualify = disqualify;
	players[playerId].finish = finish;
	players[playerId].levelTime = levelTime;
	playerRef.set(players[playerId]);
}

function updateIsJsPlayers(key) {
	if (playersKey[key]) {
		for(id = 0; id < players[playerId].isJsPlayerCount; id++) {
			if (isJsPlayers[id].id === key) {
				isJsPlayers[id] = players[key];
			}
		}
	}
}

function isJsGameStarted() {
	players[playerId].isJsRoomStep = 4;
	playerRef.set(players[playerId]);
}

function isJsPlayerReady() {
	players[playerId].ready = 1;
	playerRef.set(players[playerId]);
}

function isJsRoomStepValue() {
	return players[playerId].isJsRoomStep;
}

function isJsRoomStepUpdate(value) {
	players[playerId].isJsRoomStep = value;
	playerRef.set(players[playerId]);
}

function isJsGameLevelValue() {
	return players[playerId].isJsGameLevel;
}

function isJsCrossWorldValue() {
	return players[playerId].isJsCrossWorld;
}

function isJsAvoidChangeRoomValue() {
	return players[playerId].isJsAvoidChangeRoom;
}

function isJsPlayerCountValue() {
	return players[playerId].isJsPlayerCount;
}

function isJsLinkCodeValue() {
	return players[playerId].isJsLinkCode;
}

function isJsAllPlayersReady() {
	let playerReadyCount = 0;
	Object.keys(players).forEach((key) => {
		if (players[key].roomId === roomId && players[key].ready === 1) {
			playerReadyCount++;
		}
	});
		
	for(id = 0; id < players[playerId].isJsPlayerCount; id++) {
		try {
			if (players[isJsPlayers[id].id].ready === 1) {/*Check if player is connected*/}
		}
		catch(err) {
			if (isJsPlayers[id].quit === 0) {
				console.log("ERROR: A Player has left the game!");
				isJsPlayers[id].quit = 1;			
			}
			playerReadyCount++;
		}
	}
	return ((playerReadyCount > players[playerId].isJsPlayerCount) ? 1 : 0);
}

// ---------------------- MAIN MENU FUNCTIONS ----------------------
var isJsGlobalProfileCount = -1;

function isJsProfileMaxValue() {
	try {return Object.keys(profiles).length;}
	catch(err) {return 0;}
}

async function isJsCreatePlayerProfile() {
	try {
		let ref = firebase.database().ref(`profiles`);
		const snapshot = await ref.once('value');
		profiles = snapshot.val() || {};
		
		isJsGlobalProfileCount = 0;	
		Object.keys(profiles).forEach((key) => {
			const profile = profiles[key];
			if (typeof(profile) !== "undefined") {
				isJsGlobalProfileCount++;
			}
		});
		
		profileId = firebase.database().ref().child('profiles').push().key;
		profileRef = firebase.database().ref(`profiles/${profileId}`);
		profileRef.set({
			id: profileId,
			isJsProfileId: isJsGlobalProfileCount,
			dateCreate: getDateSys(),
			datePlay: "",
			point: 0,
			playerLevel: 0,
			locked: 0,
			username_code0: -1,
			username_code1: -1,
			username_code2: -1,
			username_code3: -1,
			username_code4: -1,
			username_code5: -1,
			username_code6: -1,
			username_code7: -1,
			username_code8: -1,
			username_code9: -1,
			data_1: "",
			data_2: "",
			data_3: "",
			data_4: "",
			data_5: "",
			data_6: "",
			data_7: ""
		});
		
		// Force array update
		ref = firebase.database().ref(`profiles`);
		const snapshotUpdate = await ref.once('value');
		profiles = snapshotUpdate.val() || {};
	}
	catch(err) {console.log(err);}
	return isJsGlobalProfileCount;
}

async function isJsLoadPlayerProfile(id) {
	try {
		let ref = firebase.database().ref(`profiles`);
		const snapshot = await ref.once('value');
		profiles = snapshot.val() || {};
		
		Object.keys(profiles).forEach((key) => {
			const profile = profiles[key];
			if (typeof(profile) !== "undefined") {
				if (profile.isJsProfileId === id) {
					profileId = profile.id;
					profileRef = firebase.database().ref(`profiles/${profileId}`);
				}
			}
		});
	}
	catch(err) {console.log(err);}
	return 0;
}

function isJsGetOtherProfilesData(id, value) {
	let result = -1;
	try {
		Object.keys(profiles).forEach((key) => {
			const profile = profiles[key];
			if (typeof(profile) !== "undefined") {
				if (profile.isJsProfileId === id) {
					switch(value) {
						case 0: result = profile.username_code0; break;
						case 1: result = profile.username_code1; break;
						case 2: result = profile.username_code2; break;
						case 3: result = profile.username_code3; break;
						case 4: result = profile.username_code4; break;
						case 5: result = profile.username_code5; break;
						case 6: result = profile.username_code6; break;
						case 7: result = profile.username_code7; break;
						case 8: result = profile.username_code8; break;
						case 9: result = profile.username_code9; break;
						case 10: result = profile.point; break;
						case 11: result = profile.playerLevel; break;
						default: result = -1; break;
					}
				}
			}
		});
	}
	catch(err) {console.log(err);}
	return result;
}

function clearPlayersArray() {
	Object.keys(playersKey).forEach(key => delete playersKey[key]);
	Object.keys(isJsPlayers).forEach(key => delete isJsPlayers[key]);
}

function isJsGetPlayersNumber() {
	return Object.keys(players).length;
}

function lockRoom() {
	if (canLockRoom) {
		if (typeof(rooms[roomId]) !== "undefined") {
			rooms[roomId].locked = 1;
			roomRef.set(rooms[roomId]);		
		}
		canLockRoom = false;
	}
}

async function isJsCreateAI() {
	timerAction = "";
	timerStop();
    let ref = firebase.database().ref(`rooms`);
    const snapshot = await ref.once('value');
	try {
		rooms = snapshot.val() || {};
		rooms[roomId].useAI = 1;
		rooms[roomId].locked = 1;
		roomRef.set(rooms[roomId]);
	}
	catch(err) {console.log(err);}
	isJsRoomStepUpdate(3);
}

function addOtherPlayer(id) {
	if (players[playerId].isJsPlayerCount < 3) {
		if (!playersKey[id]) {
			playersKey[id] = id;
			isJsPlayers[players[playerId].isJsPlayerCount] = players[id];
			players[playerId].isJsPlayerCount++;

			let tempTime = TIME_WAIT_DEFAULT;
			if (players[playerId].isJsPlayerCount === 3) {
				lockRoom();
				tempTime = 1;
			}
			timerSetAction("action_start_game", tempTime);
			playerRef.set(players[playerId]);		
		}
	}	
}

async function isJsStartMultiPlayerGame(level, crossworld) {
	clearPlayersArray();
	let roomExists = false;
    let ref = firebase.database().ref(`rooms`);
    const snapshot = await ref.once('value');
	try {
		rooms = snapshot.val() || {};
		Object.keys(rooms).forEach((key) => {
			const room = rooms[key];
			if (typeof(room) !== "undefined") {
				if (room.locked === 0 && room.isJsLinkCode === players[playerId].isJsLinkCode) {
					roomId = room.id;
					roomExists = true;
					canLockRoom = false;
					players[playerId].isJsGameLevel = room.level;
					players[playerId].isJsCrossWorld = room.crossworld;
					roomRef = firebase.database().ref(`rooms/${roomId}`);
				}
			}
		});
		if (!roomExists) {
			roomId = firebase.database().ref().child('rooms').push().key;
			roomRef = firebase.database().ref(`rooms/${roomId}`);
			roomRef.set({
				id: roomId,
				isJsLinkCode: players[playerId].isJsLinkCode,
				level: level,
				crossworld: crossworld,
				id_player: playerId,
				player_quit: 0,
				useAI: 0,
				locked: 0,
				date: getDateSys()
			});
			
			players[playerId].isJsGameLevel = level;
			players[playerId].isJsCrossWorld = crossworld;
			timerSetAction("action_quit_room", TIME_QUIT_ROOM);
		}
	}
	catch(err) {console.log(err);}
	canLockRoom = true;
	players[playerId].isJsRoomStep = 2;
	players[playerId].isJsMultiPlayerStarted = 1;
	players[playerId].isJsAvoidChangeRoom = ((roomExists) ? 0 : 1);
	players[playerId].isJsPlayerCount = 0;
	players[playerId].quit = 0;
	players[playerId].finish = 0;
	players[playerId].ready = 0;
	players[playerId].roomId = roomId;
	playerRef.set(players[playerId]);
}

async function removeRoom() {
	clearPlayersArray();
	try {
		if (typeof(roomRef) !== "undefined") {
			let ref = firebase.database().ref(`rooms`);
			const snapshot = await ref.once('value');
			try {
				rooms = snapshot.val() || {};
				if (rooms[roomId].locked === 0)	roomRef.remove();
			}
			catch(err) {
				roomRef.remove();
				console.log(err);
			}
		}
	}
	catch(err) {console.log(err);}
}

function leaveWithoutDanger(updateRoomStep)
{
	removeRoom();
	roomId = "";
	if (updateRoomStep) {
		players[playerId].isJsMultiPlayerStarted = 0;
		players[playerId].isJsRoomStep = 0;
		players[playerId].roomId = playerId;
		playerRef.set(players[playerId]);
	}
}

function isJsPlayerLeave(disconnectPlayer) {
	try {
		if (players[playerId].isJsRoomStep > 0) {				
			let quitWithPenalize = 0;
			
			if (players[playerId].isJsRoomStep === 4) {
				players[playerId].disqualify = 1;
				quitWithPenalize = 1;
			}
			else {
				if (players[playerId].isJsPlayerCount > 0) {
					quitWithPenalize = 1;
				}
				else {
					if (players[playerId].isJsAvoidChangeRoom === 1) removeRoom();
					timerStop();
				}
			}
			if (disconnectPlayer) {
				players[playerId].isJsMultiPlayerStarted = 0;
				players[playerId].isJsAvoidChangeRoom = 0;
				players[playerId].isJsRoomStep = 0;			
			}
			players[playerId].quit = quitWithPenalize;
			players[playerId].roomId = playerId;
			playerRef.set(players[playerId]);
		}
	}
	catch(err) {console.log(err);}
}

function isJsConnected()
{
   try {
       players[playerId].isJsRoomStep = 1;
   }
   catch(err) {
       console.log("ERROR: Player disconnected!");
       return 0;
   }
   return 1;
}

function isJsClearPrevMutliPlayerGame() {
	clearPlayersArray();
	try {
		players[playerId].isJsPlayerCount = 0;
		players[playerId].isJsAvoidChangeRoom = 0;
		players[playerId].isJsMultiPlayerStarted = 0;
		players[playerId].isJsRoomStep = 0;
		players[playerId].quit = 0;
		players[playerId].disqualify = 0;
		players[playerId].ready = 0;
		players[playerId].roomId = playerId;
		playerRef.set(players[playerId]);			
	}
	catch(err) {console.log("ERROR: Clear data : " + err);}
}

// ---------------------------------------------------
// ---------------------- TIMER ----------------------
// ---------------------------------------------------
var timeToRestart = 0;
const MAX_TIME = 70;
const RESTART_TIME = 5;

function chrono() {	
	// ------- PAGE AUTO RESTART -------
	if (document.body.className === "loading_page") {
		if (timeToRestart > -1) timeToRestart++;
		if (timeToRestart > MAX_TIME) {
			document.getElementById('loading_msg').innerHTML = strLoadingError;
			if (timeToRestart > MAX_TIME + RESTART_TIME) {
				window.location.reload();
				timeToRestart = -1;
			}
		}
	}

	// ------- MULTIPLAYER -------
	if (timeNotifCount > 0) timeNotifCount--;
	if (timeNotifCount === 0) {
		timerNotifStop();
	}
	if (timeWaitCount > -1) timeWaitCount++;
	if (timeWaitCount > TIME_WAIT_MAX) {
		if (timerAction === "action_start_game") {
			lockRoom();
			isJsRoomStepUpdate(3);
		}
		else if (timerAction === "action_quit_room") {
			leaveWithoutDanger(true);
		}
		else console.log("ERROR: UNKNOW ACTION !");
		timerStop();
	}
}
setInterval("chrono()", 1000);

// ---------------------- MULTIPLAYER INIT FUNCTIONS ----------------------
function initMultiPlayer() {
	
	function initMultiPlayerSubFunctions() {
	
		const allProfilesRef = firebase.database().ref(`profiles`);
		allProfilesRef.on("value", (snapshot) => {
			profiles = snapshot.val() || {};
		});

		const allPlayersRef = firebase.database().ref(`players`);
		allPlayersRef.on("value", (snapshot) => {
			try {
				players = snapshot.val() || {};
				if (typeof(players[playerId]) !== "undefined") {
					Object.keys(players).forEach((key) => {
						if (players[playerId].isJsMultiPlayerStarted === 1) {
							if (players[key].roomId === roomId && players[key].isJsLinkCode === players[playerId].isJsLinkCode && players[key].id !== playerId) {
								if (players[playerId].isJsRoomStep === 2) {
									addOtherPlayer(key);
								}
								else if (players[playerId].isJsRoomStep === 4) {
									updateIsJsPlayers(key);
								}
							}
						}
						else {							
							// Friendly Game
							if (players[playerId].isJsLinkCode > 0 && players[key].isJsLinkCode === players[playerId].isJsLinkCode &&
								players[key].id !== playerId && players[key].isJsRoomStep === 2 && players[key].isJsAvoidChangeRoom === 1) {
								timerNotifStart(3); // Value 2 is allows to check if players are connected
							}
							else // Normal Game
							if (players[key].isJsLinkCode === 0 && players[key].id !== playerId && players[key].isJsRoomStep === 2 && players[key].isJsAvoidChangeRoom === 1) {
								timerNotifStart(1);
							}
						}
					});
				}
			}
			catch(err) {console.log("ERROR: Players loop() : " + err)}
		});
		
		allPlayersRef.on("child_removed", (snapshot) => {
			if (typeof(players[playerId]) !== "undefined") {
				if (players[playerId].isJsMultiPlayerStarted === 1) {
					const key = snapshot.val().id;
					if (key === playerId) {
						isJsPlayerLeave(true);
					}
					else if (players[playerId].isJsRoomStep === 4) {
						if (playersKey[key]) {
							for(id = 0; id < players[playerId].isJsPlayerCount; id++) {
								if (isJsPlayers[id].id === key) {
									isJsPlayers[id].quit = 1;
								}
							}
						}					
					}
				}
			}
		});
	}

	firebase.auth().onAuthStateChanged((user) => {
	//console.log(user)
		if (user) {
			playerId = user.uid;
			playerRef = firebase.database().ref(`players/${playerId}`);

			playerRef.set({
				id: playerId,
				isJsLinkCode: 0,
				isJsRoomStep: 0,
				isJsMultiPlayerStarted: 0,
				isJsGameLevel: 0,
				isJsCrossWorld: 0,
				isJsAvoidChangeRoom: 0,
				isJsPlayerCount: 0,
				roomId: "0",
				ready: 0,
				quit: 0,			
				x: 0,
				y: 0,
				xscale: 1,
				yscale: 1,
				angle: 0,
				frame: 0,
				levelTime: 0,
				disqualify: 0,
				finish: 0,
				point: 0,
				playerLevel: 0,
				username_code0: -1,
				username_code1: -1,
				username_code2: -1,
				username_code3: -1,
				username_code4: -1,
				username_code5: -1,
				username_code6: -1,
				username_code7: -1,
				username_code8: -1,
				username_code9: -1
			})

			//Remove me from Firebase when I diconnect
			playerRef.onDisconnect().remove();

			//Begin the game now that we are signed in
			initMultiPlayerSubFunctions();
		}
		else {
		}
	})

	firebase.auth().signInAnonymously().catch((error) => {
		var errorCode = error.code;
		var errorMessage = error.message;
		// ...
		console.log(errorCode, errorMessage);
	});
}

// ---------------------- MULTIPLAYER LIBRARIES ----------------------
let myScript1 = document.createElement("script");
myScript1.setAttribute("src", "https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
document.body.appendChild(myScript1);

myScript1.addEventListener("load", () => {
	let myScript2 = document.createElement("script");
	myScript2.setAttribute("src", "https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js");
	document.body.appendChild(myScript2);

	myScript2.addEventListener("load", () => {
		let myScript3 = document.createElement("script");
		myScript3.setAttribute("src", "https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js");
		document.body.appendChild(myScript3);
		
		myScript3.addEventListener("load", () => {
			initMultiPlayerDB();
			initMultiPlayer();
			}, false);
		}, false);
}, false);
////////////////////////////////////////////////////////////////////////////
//						<<<	MULTIPLAYER ---
////////////////////////////////////////////////////////////////////////////

// Common functions
function onResize() {
	normalScreen = (window.innerWidth > window.innerHeight);
	if (normalScreen) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		isJsUpdateSize = 1;			
	}
}

window.addEventListener("resize", onResize, true);

function removeCover(event) {
   if (isJsInitGame === 1) {
		// openFullscreen();
		document.getElementById('screen_cover').removeEventListener("click", removeCover);
		document.getElementById('screen_cover').remove();
		isJsInitGame = 2;
	}
}

document.getElementById('screen_cover').addEventListener("click", removeCover);

window.addEventListener("load", function() {
	window.focus();
	document.body.addEventListener("click", function(e) {
		window.focus();
	}, false);
});

window.Module = {
	preRun: [],
	postRun: [],
	canvas: canvas,
	onRuntimeInitialized: function() {
		isJsShowGameAds();
		hideLoadingScreen();
		
		for(ms of [0, 100, 1000, 3000]) {
			window.setTimeout(onResize, ms);
		}
	},
	print: console.log,
	printErr: console.error,
};

Module['locateFile'] = function(path, prefix) {
  if (path.endsWith(".data")) return rscLink + "isengine.data";
  return prefix + path;
}

function loadScriptAsync(src) {
	var s, r, t;
	r = false;
	s = document.createElement("script");
	s.type = "text/javascript";
	s.src = src;
	s.onload = s.onreadystatechange = function() {
		if (!r && (!this.readyState || this.readyState === "complete")) {
			r = true;
		}
	};
	t = document.getElementsByTagName('script')[0];
	t.parentNode.insertBefore(s, t);
}

loadScriptAsync(rscLink + "isengine.js");
