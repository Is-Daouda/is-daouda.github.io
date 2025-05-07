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
		background: gray !important;
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
var isJsGameState = 2;
var isJsInitGame = 0;
var gameStarted = false;
var rscLink = "https://is-daouda.github.io/gxtg/";

GamePix.pause = function() {
	isJsGameState = 0;
}

GamePix.resume = function() {
	isJsGameState = 1;
}

function isJsUpdateScore(value) {
	GamePix.updateScore(value);
}

function isJsUpdateLevel(value) {
	GamePix.updateLevel(value);
}

function isJsHappyMoment() {
	GamePix.happyMoment();
}

function isJsShowGameAds() {
	GamePix.interstitialAd().then(function (res){});
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
	NProgress.done();
	document.getElementById('screen_cover').style.display = "block";
}
// <<< Page language ---

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
}
setInterval("chrono()", 1000);

// Common functions
function onResize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	isJsUpdateSize = 1;
}

window.addEventListener("resize", onResize, true);		

function removeCover(event) {
   if (isJsInitGame === 1) {
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
		if (!gameStarted) {
			GamePix.loading(100);
			GamePix.loaded().then(function () {
				hideLoadingScreen();
				gameStarted = true;
			})
		}
		for(ms of [0, 100, 1000, 3000])
			window.setTimeout(onResize, ms);
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