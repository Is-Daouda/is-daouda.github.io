var canvas = document.getElementById('canvas');
var isJsUpdateSize = 0;
var isJsGameState = 2;
var isJsInitGame = 0;
var showError = 0;
var showAds = 0;
var landscapeMode = false;
var rscLink = ""; // "https://is-daouda.github.io/html5_multi/";

// Android Support
var isJsExportGameData = 0;
var exportedData;
var exportedDataCurrentLine = 0;
var AndroidVersionData;

function getAppVersion(data) {
	AndroidVersionData = JSON.parse(data);
}

function isJsCheckAndroidVersionCode(codeVersion) {
	try {
		return ((AndroidVersionData["0"] >= codeVersion) ? 1 : 0);
	}
	catch(err) {return 0;}
}

function getAndroidVersion() {
	try {
		return AndroidVersionData["1"];
	}
	catch(err) {return "0.0";}
}

// ---
// Deprecadted from Android Version Code >= 37
function webPageStarted(versionCode = 37) {
	if (isJsCheckAndroidVersionCode(versionCode) !== 1) {
		Android.mainPageLoaded();
	}
}
// ---

function setGameState(state) {
	isJsGameState = state;
}

function setExportedData(data) {
	isJsExportGameData = 1;
	exportedData = JSON.parse(data);
}

function isJsGetExportedData() {
	let data = exportedData[exportedDataCurrentLine];
	exportedDataCurrentLine++;
	return data;
}

function isJsAndroidDeleteExportedDataFile()
{
	isJsExportGameData = 2;
	Android.deleteExportedDataFile();
}

function isJsAndroidCloseApp()
{
	Android.closeApp();
}

var isJsBackKeyPressed = 0;

function backKeyPressed() {
	if (showAds === 1) hideAds();
	else isJsBackKeyPressed = 1;
}

function AndroidHideConnectionWidgets() {
	try {
		Android.hideConnectionWidgets();
	}
	catch(err) {}
}

AndroidHideConnectionWidgets();

// Admob Support
function isJsUseAndroidAds() {
	return isJsCheckAndroidVersionCode(37);
}

function isJsAndroidShowBannerAds(visible) {
	if (visible === 1) Android.showBannerAds();
	else Android.hideBannerAds();
}

function isJsAndroidShowInterstitialAds() {
	Android.showInterstitialAds();
}

// Ads
function isJsShowGameAds() {
	if (isJsUseAndroidAds() === 1) {
		isJsAndroidShowInterstitialAds();
	}
	else {
		document.getElementById('3').click();
		document.getElementById('adspopup').style.display = "block";
		showAds = 1;	
	}
}

function hideAds() {
	document.getElementById('adspopup').style.display = 'none';
	showAds = 0;
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
	if (landscapeMode) document.getElementById('screen_cover').style.display = "block";
	
	// Change Android back key function
	try {
		if (isJsCheckAndroidVersionCode(37) === 1) Android.mainPageLoaded();
	}
	catch(err) {}
	
}
// <<< I Can Transform v2.5 ---

////////////////////////////////////////////////////////////////////////////
//							MULTI PLAYER
////////////////////////////////////////////////////////////////////////////

// ---------------------- DATABASE ----------------------
/////// Database ///////
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

// ---------------------- VARIABLES ----------------------
var playerId;
var playerRef;
var players = {};
var playersKey = {};

var roomRef;	
var rooms;
var roomId;

var isJsPlayerCount = 0;
var isJsPlayers = {};
var isJsGameLevel = 0;
var isJsCrossWorld = 0;
var isJsAvoidChangeRoom = 0;
var isJsMultiPlayerStarted = 0;
var canLockRoom = true;

var timeWait = -1;
var TIME_WAIT_MAX = 15;
var timerAction = "";

// ---------------------- TIMER FUNCTIONS ----------------------

function timerStop() {
	timeWait = -1;
}

function timerSetAction(action, time = 7) {
	timeWait = 0;
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
	if (isJsPlayers[id].quit === 1) return 1;
	return isJsPlayers[id].disqualify;
}

function isJsGetOtherPlayerPoint(id) {
	return isJsPlayers[id].point;
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

function isJsSetPlayerData(point, usernameCode0, usernameCode1, usernameCode2, usernameCode3, usernameCode4,
							usernameCode5, usernameCode6, usernameCode7, usernameCode8, usernameCode9) {
	players[playerId].point = point;
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

function isJsSetPlayerInGameData(x, y, xscale, yscale, angle, frame, value) {
	players[playerId].x = x;
	players[playerId].y = y;
	players[playerId].xscale = xscale;
	players[playerId].yscale = yscale;
	players[playerId].angle = angle;
	players[playerId].frame = frame;
	players[playerId].disqualify = value;
	playerRef.set(players[playerId]);
}

function updateIsJsPlayers(key) {
	if (playersKey[key]) {
		for(id = 0; id < isJsPlayerCount; id++) {
			if (isJsPlayers[id].id === key) {
				isJsPlayers[id] = players[key];
				isJsPlayers[id].isJsId = id;
			}
		}
	}
}

function isJsPlayerReady() {
	players[playerId].isJsRoomStep = 4;
	players[playerId].ready = 1;
	playerRef.set(players[playerId]);
}

function isJsRoomStepValue() {
	return players[playerId].isJsRoomStep;
}

function isJsRoomStepUpdate(value) {
	playerRef.update({
				isJsRoomStep: value
	});
}

function isJsAllPlayersReady() {
	let playerReadyCount = 0;
	Object.keys(players).forEach((key) => {
		if (players[key].roomId === roomId && players[key].ready === 1) {
			playerReadyCount++;
		}
	});
	return ((playerReadyCount > isJsPlayerCount) ? 1 : 0);
}

// ---------------------- MAIN MENU FUNCTIONS ----------------------
function addOtherPlayer(id) {
	if (!playersKey[id]) {
		playersKey[id] = id;
		isJsPlayers[isJsPlayerCount] = players[id];
		isJsPlayers[isJsPlayerCount].isJsId = isJsPlayerCount; // Allows to check data
		console.log("log : " + playersKey[id] + " > pid : " + playerId + " > : " + isJsPlayers[isJsPlayerCount].isJsId);						
		isJsPlayerCount++;
		console.log("N : " + isJsPlayerCount);
		timerSetAction("action_start_game");

		if (isJsAvoidChangeRoom === 1 && isJsPlayerCount === 3) {
			lockRoom();
		}
	}	
}

function isJsStartMultiPlayerGame(level, crossworld) {
	isJsGameLevel = level;
	isJsCrossWorld =  crossworld;
	
	roomId = firebase.database().ref().child('rooms').push().key;
	console.log("init id : " + roomId);
	roomRef = firebase.database().ref(`rooms/${roomId}`);
	roomRef.set({
		id: roomId,
		level: isJsGameLevel,
		crossworld: isJsCrossWorld,
		id_player: playerId,
		player_quit: 0,
		locked: 0
	});
	
	players[playerId].isJsRoomStep = 1;
	players[playerId].quit = 0;
	players[playerId].ready = 0;
	players[playerId].roomId = roomId;
	playerRef.set(players[playerId]);
	
	isJsMultiPlayerStarted = 1;
	isJsIsPlaying = 1;
	isJsAvoidChangeRoom = 0;
	canLockRoom = true;
	playerQuit = 0;
	timerSetAction("action_quit_room", 15);
}

function lockRoom() {
	if (canLockRoom) {
		roomRef.update({
			locked: 1
		});
		canLockRoom = false;
	}
}

function removeRoom() {		
	roomRef.remove();
	let it = 0;
	Object.keys(players).forEach((key) => {
		delete playersKey[key];
		delete isJsPlayers[i];
		it++;
	});
	isJsPlayerCount = 0;
}

function leaveWithoutDanger(updateRoomStep)
{
	removeRoom();
	roomId = "";
	isJsMultiPlayerStarted = 0;
	//players[playerId].isJsRoomStep = 0;
	if (updateRoomStep) isJsRoomStepUpdate(0);
}

function isJsPlayerLeave() {
	if (players[playerId].isJsRoomStep > 0) {				
		let quitWithPenalize = 0;
		
		if (players[playerId].isJsRoomStep === 4) {
			players[playerId].disqualify = 1;
			quitWithPenalize = 1;
			alert("4");
		}
		else {
			if (isJsAvoidChangeRoom === 1) {
				if (isJsPlayerCount === 0) {
					leaveWithoutDanger(false);
				}
				else {
					rooms.player_quit = 1;
					roomRef.set(rooms[roomId]);
					quitWithPenalize = 1;
				}
			}
			else if (isJsPlayerCount > 0) {
				quitWithPenalize = 1;
				alert("3");
			}		
		}
		players[playerId].isJsRoomStep = 0;
		players[playerId].quit = quitWithPenalize;
		playerRef.set(players[playerId]);
	}
}

function isJsClearPrevMutliPlayerGame() {
	try {
		if (players[playerId].isJsRoomStep === 4) {
			isJsAvoidChangeRoom = 0;
			let it = 0;
			Object.keys(players).forEach((key) => {
				delete playersKey[key];
				delete isJsPlayers[it];
				it++;
			});
			isJsPlayerCount = 0;
			players[playerId].isJsRoomStep = 0;
			players[playerId].quit = 0;
			players[playerId].disqualify = 0;
			players[playerId].ready = 0;
			players[playerId].roomId = playerId;
			playerRef.set(players[playerId]);			
		}
	}
	catch(err) {console.log("ERROR: Can't clear previous game!");}
}

// ---------------------------------------------------
// ---------------------- TIMER ----------------------
// ---------------------------------------------------
var timeToRestart = 0;
const MAX_TIME = 70;
const RESTART_TIME = 5;

function chrono() {
	// ------- PAGE AUTO RESTART -------
	if (isJsGameState !== 1) isJsGameState = 1;
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

	// ------- MULTI PLAYER -------
	if (timeWait > -1) timeWait++;
	if (timeWait > TIME_WAIT_MAX) {
		lockRoom();
		
		if (timerAction === "action_start_game") {
			if (playerQuit === 1) {lockRoom(); console.log("OTHER LOCK ROOM!");}
			console.log("GAME START!!!");
			//players[playerId].isJsRoomStep = 3;
			isJsRoomStepUpdate(3);
		}
		else if (timerAction === "action_quit_room") {
			leaveWithoutDanger(true);
			console.log("QUIT!");
		}
		else console.log("ERROR : UNKNOW ACTION !");
		timerStop();
	}
}
setInterval("chrono()", 1000);

// ---------------------- MULTI PLAYER INIT FUNCTIONS ----------------------
function initMultiPlayer() {
	
	function initMultiPlayerSubFunctions() {
		const allPlayersRef = firebase.database().ref(`players`);
		const allRoomsRef = firebase.database().ref(`rooms`);
			
		allRoomsRef.on("value", (snapshot) => {
			try {
				rooms = snapshot.val() || {};
				let roomExists = false;
				//if (isJsMultiPlayerStarted === 1) {				
					Object.keys(rooms).forEach((key) => {
						const room = rooms[key];
						if (typeof(room) !== "undefined") {				
							if (players[playerId].isJsRoomStep === 1) {
								if (isJsAvoidChangeRoom === 0) {
									if (room.id != roomId) {
										if (room.locked === 0) {
											removeRoom();
											roomId = room.id;
											isJsGameLevel = room.level;
											isJsCrossWorld = room.crossworld;
											// roomRef = firebase.database().ref(`rooms/${roomId}`);
											roomExists = true;
											canLockRoom = false;
											//players[playerId].isJsRoomStep = 2;
											//isJsRoomStepUpdate(2);
											players[playerId].isJsRoomStep = 2;
											players[playerId].roomId = room.id;										
											playerRef.set(players[playerId]);
										}
									}	
								}
							}
							else if (players[playerId].isJsRoomStep === 2) {
								playerQuit = room.player_quit;
							}
						}
					});
					if (!roomExists) {
						isJsAvoidChangeRoom = 1;
						//players[playerId].isJsRoomStep = 2;
						isJsRoomStepUpdate(2);
					}
				//}
			}
			catch(err) {console.log("ERROR: Room Loop()")}
		});
		
		allPlayersRef.on("value", (snapshot) => {
			players = snapshot.val() || {};
			//if (isJsMultiPlayerStarted === 1) {				
				Object.keys(players).forEach((key) => {
					if (players[key].roomId === roomId && players[key].id !== playerId) {
						if (players[playerId].isJsRoomStep === 2) {
							addOtherPlayer(key);
						}
						else if (players[playerId].isJsRoomStep === 4) {
							updateIsJsPlayers(key);
						}
					}
				});
			//}
		});
		
		allPlayersRef.on("child_removed", (snapshot) => {
			const key = snapshot.val().id;
			if (key === playerId) isJsPlayerLeave();
		})
	}

	firebase.auth().onAuthStateChanged((user) => {
	console.log(user)
		if (user) {
			//You're logged in!
			playerId = user.uid;
			playerRef = firebase.database().ref(`players/${playerId}`);

			playerRef.set({
				id: playerId,
				isJsId: 0,
				isJsRoomStep: 0,
				roomId: "0",
				quit: 0,
				ready: 0,				
				x: 0,
				y: 0,
				xscale: 0,
				yscale: 0,
				angle: 0,
				frame: 0,
				disqualify: 0,
				point: 0,
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
////////////////////////////////////////////////////////////////////////////
//							MULTI PLAYER
////////////////////////////////////////////////////////////////////////////

function showMsg() {
	var a = document.createElement('div');
	a.setAttribute('id', 'rotate_screen');
	document.body.appendChild(a);
}

function hideMsg() {
	var objDel = document.getElementById('rotate_screen');
	objDel.remove();
}

function checkScreenOrientation() {/*
	landscapeMode = (canvas.width > (canvas.height + 100)) ? true : false;
	
	if (!landscapeMode && showError === 0)
		showError = 1;
	
	if (landscapeMode && showError > 0) {
		canvas.style.display = "block";
		hideMsg();
		showError = 0;
	}
	
	if (showError === 1) {
		canvas.style.display = "none";
		showMsg();
		showError = 2;
	}
	
	if (isJsInitGame === 1) {
		document.getElementById('screen_cover').style.display = ((landscapeMode) ? "block" : "none");
	}*/
}

function onResize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	checkScreenOrientation();
	isJsUpdateSize = 1;
}

window.addEventListener("resize", onResize, true);

function removeCover(event) {
   if (isJsInitGame === 1 && showError === 0) {
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
		//isJsShowGameAds();
		hideLoadingScreen();
		initMultiPlayer();
		
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

function randJs(maxValue) {
	return Math.floor(Math.random() * maxValue);
}
