let isUsingFilter = false;
let canCensor = null;
let isCensoring = false;
let blacklistTranscript = [];
let currentTranscriptLine = null;
let censorBlacklistLoop = null;
let defaultMuted = false;

chrome.runtime.onMessage.addListener((msg)=>{
    if(msg.from=="popup" && msg.subject=="checkCensoringState") {
        if(canCensor==null){
            chrome.runtime.sendMessage({from:"content",subject:"getBlacklist",data:window.location.href});
        }
        else if (canCensor){
            chrome.runtime.sendMessage({from:"content",subject:"censorState",data:isUsingFilter});
        }
    } 
    else if(msg.from=="background"&&msg.subject=="blacklistTranscript"){
        if(msg.data!=null){
            blacklistTranscript=msg.data; 
            canCensor=true;
            chrome.runtime.sendMessage({from:"content",subject:"censorState",data:false});
        }
    }
    else if(msg.from=="popup"&&msg.subject=="useFilter") {
        useProfanityFilter();
    }
    else if(msg.from=="popup"&&msg.subject=="turnOffFilter") {
        isUsingFilter=null;
        isCensoring=null;
        currentTranscriptLine=null;
    }
    else if(msg.from=="background"&&msg.subject=="newPage"){
        clearInterval(censorBlacklistLoop);
        isUsingFilter = false;
        canCensor = null;
        isCensoring = false;
        blacklistTranscript = [];
        currentTranscriptLine = null;
        censorBlacklistLoop = null;
        defaultMuted = false;
        chrome.runtime.sendMessage({from:"content",subject:"disableCheckbox"});
    }
})
    

function useProfanityFilter(){
    isUsingFilter=true;
    const video = document.getElementsByTagName('video')[0];
    censorBlacklistLoop = setInterval(function() {censorVideo(video); }, 1);
}

function censorVideo(video){

    chrome.runtime.sendMessage({from:"content",subject:"setBeepVolume",data:video.volume});

    if(!isCensoring&&video.muted){
        defaultMuted=true;
    }
    if(!video.muted){
        defaultMuted=false;
    }

    if(video!=null && !video.paused){
        if(!isCensoring){
            for(let i = 0; i < blacklistTranscript.length; i++) {
                if(isWithinLine(blacklistTranscript[i]["startTime"], blacklistTranscript[i]["duration"], video.currentTime)) {
                   currentTranscriptLine = blacklistTranscript[i];
                   if(!defaultMuted){
                        chrome.runtime.sendMessage({from:"content",subject:"beepVideo"});
                   }
                   video.muted = true;
                   isCensoring=true;
                   return;
                }
            }
        } 
        else if(!isWithinLine(currentTranscriptLine["startTime"],currentTranscriptLine["duration"],video.currentTime)){
            chrome.runtime.sendMessage({from:"content",subject:"unbeepVideo"});
            isCensoring = false;
            if(!defaultMuted){
                video.muted = false;
            }
        }
    }else if(isCensoring){
        chrome.runtime.sendMessage({from:"content",subject:"unbeepVideo"});
        isCensoring=false;
    }
}

function isWithinLine(startTime, duration, currentTime){
    return startTime <= currentTime && startTime + duration > currentTime;
}