var canvas = document.getElementById('canvas');
var isJsUpdateSize = 0;
var isJsGameState = 2;
var isJsInitGame = 0;
var showError = 0;
var landscapeMode = false;
var rscLink = "https://is-daouda.github.io/gxtg/";
var isJsPreload = 0;

const crazysdk = window.CrazyGames.CrazySDK.getInstance(); //Getting the SDK
crazysdk.init(); //Initializing the SDK, call as early as possible

function isJsGamePlayStart() {
	crazysdk.gameplayStart();
}

function isJsGamePlayStop() {
	crazysdk.gameplayStop();
}

function isJsHappyMoment() {
	crazysdk.happytime();
}

// Ads
function isJsShowGameAds() {
	if (isJsPreload === 0) {
		crazysdk.requestAd();
		isJsPreload = 1;
	}
	else {
		crazysdk.requestAd("midgame");
	}
}

function adStarted() {
	isJsGameState = 0;
};

function adError(){
	isJsGameState = 1;
};

function adFinished(){
	isJsGameState = 1;
};

crazysdk.addEventListener("adStarted", this.adStarted);
crazysdk.addEventListener("adError", this.adError);
crazysdk.addEventListener("adFinished", this.adFinished);

// Other Ads
function isJsUseAds() {
	return 1;
}

function isJsShowBannerAds(visible) {
	if (visible === 1) {
		crazysdk.requestBanner([
		{
			containerId: "banner-container",
			size: "300x50",
		}, ]);
		document.getElementById('banner-container').style.display = "block";
	}
	else {
		document.getElementById('banner-container').style.display = "none";
		crazysdk.clearAllBanners();
	}
}

// --- Page language >>>
document.documentElement.className = "loading_page";
document.body.className = "loading_page";

var langIndex = 0; // English
var userLang = navigator.language || navigator.userLanguage;
if (userLang === "fr" || userLang === "fr-FR" || userLang === "fr-fr") langIndex = 1;

var paramRscLink = rscLink;
var strLoadingError;

function loadObjDesc() {
	var txtFile = new XMLHttpRequest();
	var allParam = "";
	txtFile.onreadystatechange = function () {
		if (txtFile.readyState === XMLHttpRequest.DONE && txtFile.status === 200) {
			allParam = txtFile.responseText;
			var paramList = allParam.split('\n');
			document.getElementById('loading_msg').innerHTML = paramList[langIndex];
			document.getElementById('msg_start').innerHTML = paramList[2 + langIndex];
			strLoadingError = paramList[4 + langIndex];
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
}
// <<< Page language ---

// ---------------------------------------------------
// ---------------------- TIMER ----------------------
// ---------------------------------------------------
var timeToRestart = 0;
const MAX_TIME = 5; // 70;
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
}
setInterval("chrono()", 1000);

// Common functions
function showMsg() {
	var a = document.createElement('div');
	a.setAttribute('id', 'rotate_screen');
	document.body.appendChild(a);
}

function hideMsg() {
	var objDel = document.getElementById('rotate_screen');
	objDel.remove();
}

function checkScreenOrientation() {
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
	}
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
