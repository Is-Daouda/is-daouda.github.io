var canvas = document.getElementById('canvas');
var updateSize = 0;
var gameState = 2;
var initGame = 0;
var showError = 0;
var landscapeMode = false;
var rscLink = "../";

// --- I Can Transform v2.5 >>>
document.documentElement.className = "loading_page";
document.body.className = "loading_page";

var langIndex = 0; // English
var userLang = navigator.language || navigator.userLanguage;
if (userLang === "fr" || userLang === "fr-FR" || userLang === "fr-fr") langIndex = 1;

function loadObjDesc() {
	var txtFile = new XMLHttpRequest();
	var allText = "";
	txtFile.onreadystatechange = function () {
		if (txtFile.readyState === XMLHttpRequest.DONE && txtFile.status == 200) {
			allText = txtFile.responseText;
			var objDescList = allText.split('\n');
			
			document.getElementById('loading_title').innerHTML = objDescList[langIndex];
			document.getElementById('loading_msg').innerHTML = objDescList[2 + langIndex];
			document.getElementById('msg_start').innerHTML = objDescList[4 + langIndex];
		}
	}
	txtFile.open("GET", rscLink + "obj_desc.txt", true);
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
	
	if (initGame === 1) {
		document.getElementById('screen_cover').style.display = ((landscapeMode) ? "block" : "none");
	}
}

function onResize() {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	checkScreenOrientation();
	updateSize = 1;
}

window.addEventListener("resize", onResize, true);

function removeCover(event) {
   if (initGame === 1 && showError === 0) {
		document.getElementById('screen_cover').removeEventListener("click", removeCover);
		document.getElementById('screen_cover').remove();
		initGame = 2;
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