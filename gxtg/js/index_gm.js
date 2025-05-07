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
		background: blue !important;
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
var rscLink = "https://is-daouda.github.io/gxtg/";

var mobileOS = false;
let ua = navigator.userAgent;
if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
	mobileOS = true;
}
else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
	mobileOS = true;
}

var elem = document.getElementById("gamescreen");
function openFullscreen() {
	if (mobileOS) {
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
}

var sdkState = 0;
window.SDK_OPTIONS = {
	gameId: "n4kqbaxolqc7oqp6324wenfbg85v8uri",
	onEvent: function (a) {
		switch (a.name) {
		case "SDK_GAME_PAUSE": isJsGameState = 0; break;
		case "SDK_GAME_START": isJsGameState = 1; break;
		case "SDK_READY": sdkState = 1; break;
		}
	}
};

(function (a, b, c) {
	var d = a.getElementsByTagName(b)[0];
	a.getElementById(c) || (a = a.createElement(b), 
	a.id = c, 
	a.src = "https://api.gamemonetize.com/sdk.js", 
	d.parentNode.insertBefore(a, d))
})(document, "script", "gamemonetize-sdk");

function isJsShowGameAds() {
	if (typeof sdk !== 'undefined' && sdk.showBanner !== 'undefined') sdk.showBanner();
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
	normalScreen = (window.innerWidth > window.innerHeight);
	if (normalScreen) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		isJsUpdateSize = 1;			
	}
}

window.addEventListener("resize", onResize, true);

function removeCover(event) {
   if (isJsInitGame === 1) {/*
		openFullscreen();*/
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
