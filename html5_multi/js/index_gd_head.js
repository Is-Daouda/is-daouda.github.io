var isJsGameState = 2;
var sdkState = 0;
var adStep = 0;

// init SDK
window["GD_OPTIONS"] = {
    "gameId": "d3c66467f11247f084fd4d201e043ad3",
    "onEvent": function(event) {
        switch (event.name) {
            case "SDK_GAME_START":
                isJsGameState = 1;
                adStep++;
                break;
            case "SDK_GAME_PAUSE":
                isJsGameState = 0;
                break;
            case "SDK_READY":
                sdkState = 1;
                break;
        }
    },
};

(function(d, s, id) {
    var js, fjs = d.getElementsByTagName(s)[0];
    if (d.getElementById(id)) return;
    js = d.createElement(s);
    js.id = id;
    js.src = 'https://html5.api.gamedistribution.com/main.min.js';
    fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'gamedistribution-jssdk'));

function isJsShowHTML5GameEndAd() {return 1;}

function isJsShowGameAds() {
	if (typeof gdsdk !== 'undefined' && gdsdk.showAd !== 'undefined') {
         gdsdk.showAd();
        adStep++;
    }
}
