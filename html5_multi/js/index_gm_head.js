var isJsGameState = 2;
var sdkState = 0;
window.SDK_OPTIONS = {
  gameId: "3pve1sz9o9lpu8bbzi0ab73bbytb1gub",
  onEvent: function (a) {
	 switch (a.name) {
		case "SDK_GAME_PAUSE":
		   isJsGameState = 0;
		   break;
		case "SDK_GAME_START":
		   isJsGameState = 1;
		   break;
		case "SDK_READY":
		   sdkState = 1;
		   break;
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
	if (typeof sdk !== 'undefined' && sdk.showBanner !== 'undefined') {
		sdk.showBanner();
	}
}