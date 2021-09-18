//NOTE: ADD VARIABLES TO CACHE WHEN I AM CENSORING
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
        else{
            if(canCensor==true){
                chrome.runtime.sendMessage({from:"content",subject:"censorState",data:isUsingFilter});
            }
            else{
                chrome.runtime.sendMessage({from:"content",subject:"censorState",data:"cannot"});
            }
        }
    } 
    else if(msg.from=="background"&&msg.subject=="blacklistTranscript"){
        console.log(msg.data);
        if(msg.data!=null){
            blacklistTranscript=msg.data; 
            canCensor=true;
            chrome.runtime.sendMessage({from:"content",subject:"censorState",data:false});
        } else{
            canCensor=false;
            chrome.runtime.sendMessage({from:"content",subject:"censorState",data:"cannot"});
        }
    }
    else if(msg.from=="popup"&&msg.subject=="useFilter") {
        console.log("is censoring");
        useProfanityFilter();
    }
    else if(msg.from=="popup"&&msg.subject=="turnOffFilter") {
        console.log("not censoring");
        isUsingFilter=null;
        isCensoring=null;
        currentTranscriptLine=null;
    }
    else if(msg.from=="background"&&msg.subject=="newPage"){
        console.log("new page");
        clearInterval(censorBlacklistLoop);
        isUsingFilter=null;
        canCensor=null;
        isCensoring=null;
        blacklistTranscript=[];
        currentTranscriptLine=null; 
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

    console.log(defaultMuted);

    if(video!=null && !video.paused){
        if(!isCensoring){
            for(let i = 0; i < blacklistTranscript.length; i++) {
                if(isWithinLine(blacklistTranscript[i]["startTime"], blacklistTranscript[i]["duration"], video.currentTime)) {
                   console.log(`the word "${blacklistTranscript[i]["text"]}" was filtered for ${blacklistTranscript[i]["duration"]} seconds`);
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