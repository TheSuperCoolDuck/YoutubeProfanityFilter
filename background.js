const filterList = ["part","may","made","come","get","did","day","down","long","find","now","its","oil","who","call","been","water","first","than","my"];
const censorBeep = new Audio("censor-beep-10.mp3");

chrome.runtime.onMessage.addListener((msg)=>{
  if(msg.from=="content" && msg.subject=="beepVideo"){
      beepVideo()
  } else if(msg.from=="content" && msg.subject=="unbeepVideo"){
      unbeepVideo()
  } else if(msg.from=="content" && msg.subject=="getBlacklist"){
      getProfanityBlacklistTranscript(msg.data);
  }
});

//Check when the url changes in the current tab
chrome.tabs.onUpdated.addListener(function
  (tabId, changeInfo, tab) {
     if(changeInfo.url){
      chrome.tabs.query({currentWindow: true, active: true}, 
        function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {from:"background",subject:"newPage"});
      });
     }
  }
);

function beepVideo(){
    censorBeep.play();
}

function unbeepVideo(){
    censorBeep.pause();
    censorBeep.currentTime=0;
}

const getProfanityBlacklistTranscript = async(youtubeUrl) => {
    const captionUrl = await getVideoCaptionTrack(youtubeUrl);
    if(captionUrl != null){
      const transcript = await getYoutubeTranscript(captionUrl);
      const blacklistTranscript = applyFilter(transcript);

      chrome.tabs.query({currentWindow: true, active: true}, 
        function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {from:"background",subject:"blacklistTranscript",data:blacklistTranscript});
      });
    } else{
      chrome.tabs.query({currentWindow: true, active: true}, 
        function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {from:"background",subject:"blacklistTranscript",data:null});
      });
    }
  }
  
  const getVideoCaptionTrack = async(youtubeUrl) => {
  
    const videoId=getVideoId(youtubeUrl);
  
    const videoInfo = await fetch(`https://youtube.com/get_video_info?video_id=${videoId}`);
    const videoInfoTXT = await videoInfo.text();
    const videoInfoDecode = decodeURIComponent(videoInfoTXT);
  
    const captionTracksStart = videoInfoDecode.indexOf(`{"captionTracks":`);

    if(captionTracksStart==-1){
      return null;
    }
  
    let currentIndex = captionTracksStart;
    let openBrackets=1;
    while(openBrackets!=0){
      currentIndex++;
      currentChar = videoInfoDecode[currentIndex];
      if(currentChar=="{"){
        openBrackets++;
      }
      else if(currentChar=="}"){
        openBrackets--;
      }
    } 
    const captionTracksEnd=currentIndex + 1;
  
    const captionTracksJson = JSON.parse(videoInfoDecode.substring(captionTracksStart,captionTracksEnd))["captionTracks"];
  
    let captionTrack = [];
    for(let i=0;i<captionTracksJson.length;i++){
      if(captionTracksJson[i]["vssId"]=="a.en"){
        captionTrack = captionTracksJson[i];
        break;
       }                                //else if (captionTracksJson[i]["vssId"]==".en") {
                                        //   captionTrack = captionTracksJson[i];
                                        // }
    }
    return captionTrack["baseUrl"];  
  }
  
  function getVideoId(youtubeURl) {
    
    let videoId=youtubeURl;
   
     const videoIdStart = youtubeURl.indexOf("v=") + 2;   
   
    let videoIdEnd = videoId.length;
    if(videoId.includes("&")){
     videoIdEnd=videoId.indexOf("&");
    }
   
    videoId = videoId.substring(videoIdStart, videoIdEnd);
    return videoId;
  }
  
  const getYoutubeTranscript = async(captionTrackUrl) => {
    
    const transcriptData = await fetch(`${captionTrackUrl}&fmt=json3`);
    const transcriptJson = await transcriptData.json();
  
    return parseTranscript(transcriptJson["events"]);
    
  }
  
  function parseTranscript(events){
    let wordTimestamps=[];
    
    for(let i=0;i<events.length;i++){
      const eventLine = events[i];
  
      if(eventLine["segs"] == undefined){
        continue;
      }    
      
      let lineStartTime = events[i]["tStartMs"];
      for(let j=0;j<eventLine["segs"].length;j++){
  
        //Case -1: Start of line and End of transcript
        // start time = line start time
        // duration = line duration
  
        // Case 0: Start and End of line
        // start time = line start time
        // duration = next line start time - line start time 
  
        // Case 1: Start of a line
        // start time = line start time
        // duration = next word offset time
        
        // Case 2: Middle of a line
        // start time = line start time + this word offset time
        // duration = next word offset time - this word offset time
  
        // Case 3: End of a line 
        // start time = line start time + this word offset offset time
        // duration = next line start time - line start time - this word offset time 
  
        //Case 4: End of transcript
        // start time = line start time + this word offset offset time
        // duration = line duration - this word offset time
  
        let wordStartTime;
        let wordDuration;
        
        if(eventLine["segs"][j]["tOffsetMs"] == undefined && eventLine["segs"][j+1] == undefined && events[i+1]== undefined){
          //Case -1:
          wordStartTime = lineStartTime;
          wordDuration =  events[i]["dDurationMs"];
        }
        else if(eventLine["segs"][j]["tOffsetMs"] == undefined && eventLine["segs"][j+1] == undefined){
          //Case 0:
          wordStartTime = lineStartTime;
          wordDuration =   events[i+1]["tStartMs"] - wordStartTime;
        }
        else if(eventLine["segs"][j]["tOffsetMs"] == undefined && eventLine["segs"][j+1] != undefined){
          //Case 1:
          wordStartTime = lineStartTime;
          wordDuration = eventLine["segs"][j+1]["tOffsetMs"];
        } 
        else if(eventLine["segs"][j+1] != undefined) {
          //Case 2:
          wordStartTime = lineStartTime + eventLine["segs"][j]["tOffsetMs"];
          wordDuration = eventLine["segs"][j+1]["tOffsetMs"] - eventLine["segs"][j]["tOffsetMs"];
        }
        else if(events[i+1] != undefined) 
        {
          //Case 3:
          wordStartTime = lineStartTime + eventLine["segs"][j]["tOffsetMs"]
          wordDuration = events[i+1]["tStartMs"] - lineStartTime - eventLine["segs"][j]["tOffsetMs"];
        }
        else {
          //Case 4:
          wordStartTime = lineStartTime + eventLine["segs"][j]["tOffsetMs"]
          wordDuration = events[i]["dDurationMs"] - eventLine["segs"][j]["tOffsetMs"];
        }
  
        wordTimestamps.push({
          startTime:wordStartTime/1000,
          duration:wordDuration/1000,
          text:eventLine["segs"][j]["utf8"]
        });
      }
    }
  
    return wordTimestamps;
  }
    
  function applyFilter(transcript){
    
      blacklistTranscript=[];
    
      for(let i=0;i<transcript.length;i++){
          for(let j=0;j<filterList.length;j++){
    
              const transcriptLine = transcript[i]["text"].toUpperCase().replace(/[^a-zA-Z0-9 ]/g, "");
              const formattedWord = filterList[j].toUpperCase().replace(/[^a-zA-Z0-9 ]/g, " ");
    
              if(transcriptLine.split(" ").includes(formattedWord)){
                  blacklistTranscript.push(transcript[i]);
                  break;
              }
          }
      }
  
      return blacklistTranscript;
    }