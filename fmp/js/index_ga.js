var canvas = document.getElementById('canvas');
var isJsUpdateSize = 0;
var isJsGameState = 2;
var isJsInitGame = 0;
var showError = 0;
var landscapeMode = false;
var rscLink = "https://is-daouda.github.io/html5_multi/";

var sdkState = 0;
var GameArterSdk = new GamearterInstance({
	projectId:11166, // Insert your project id here 
	projectVersion:1, // Insert your project version here
	sdkMode:"B", // Use SDK in Basic mode
	sdkVersion:"2.0", // use SDK ver 2.0
	notifications: true, // enable SDK notification
	developmentMode: {
		debug: false, // do not print to console
		prerollAd: true, //  display preroll ad
		minAdTime: 60000 // set minimum time between ads at 1 minute
	}
}, function(err) {if(err) console.error(err);});

GameArterSdk.I.AddExternalCbListener("SdkInitialized", _GameArterSdkInitialized, function(err,res) {console.log(err,res);});

function _GameArterSdkInitialized() {
	console.log("--- SDK INITIALIZED !!! -? load the game ---");
	sdkState = 1;
}

function isJsShowGameAds() {
	GameArterSdk.I.CallAd("midroll", function(adState) {
		switch(adState) {
			case "loaded"    : isJsGameState = 0; break;
			case "completed" : isJsGameState = 1; break;
			default: break;
		}
	});
}

function hideObj() {
	var ele = document.getElementsByTagName("footer");
	return ele[0].parentNode.removeChild(ele[0]);
}

// --- I Can Transform v2.5 >>>
document.documentElement.className = "loading_page";
document.body.className = "loading_page";

var langIndex = 0; // English
var userLang = navigator.language || navigator.userLanguage;
if (userLang === "fr" || userLang === "fr-FR" || userLang === "fr-fr") langIndex = 1;

var paramRscLink = "https://is-daouda.github.io/html5_multi/";
var isJsParam1, isJsParam2, isJsParam3;

function loadObjDesc() {
	var txtFile = new XMLHttpRequest();
	var allParam = "";
	txtFile.onreadystatechange = function () {
		if (txtFile.readyState === XMLHttpRequest.DONE && txtFile.status == 200) {
			allParam = txtFile.responseText;
			var paramList = allParam.split('\n');
			
			document.getElementById('loading_title').innerHTML = paramList[langIndex];
			document.getElementById('loading_msg').innerHTML = paramList[2 + langIndex];
			document.getElementById('msg_start').innerHTML = paramList[4 + langIndex];
			isJsParam1 = paramList[6];
			isJsParam2 = paramList[7];
			isJsParam3 = paramList[8];
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
// <<< I Can Transform v2.5 ---

function showMsg() {
	var a = document.createElement('div');
	a.setAttribute('id', 'rotate_screen');
	document.getElementById('ga_game').appendChild(a);
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
		hideObj();
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