const filter_checkbox = document.getElementById("removeProfanity")

const filterList = ["part","may","made","come","get","did","day","down","long","find","now","its","oil","who","call","been","water","first","than","my"];

chrome.runtime.onMessage.addListener((msg)=>{
  if(msg.from=="content" && msg.subject=="censorState"){
    restorePopupState(msg.data);
  }
})

window.onload = function() {
  chrome.tabs.query({currentWindow: true, active: true}, 
    function (tabs) {
       chrome.tabs.sendMessage(tabs[0].id, {from:"popup",subject:"checkCensoringState"});
    });
}

function restorePopupState(state){
  if(state=="cannot"){
    filter_checkbox.disabled=true;
    filter_checkbox.classList.add("inactive");
  } 
  else{
    filter_checkbox.checked=state;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  filter_checkbox.addEventListener('change', onChange, false)
}, false)

function onChange () {
  if(filter_checkbox.checked) 
  {
    chrome.tabs.query({currentWindow: true, active: true}, 
        function (tabs) {
           chrome.tabs.sendMessage(tabs[0].id, {from:"popup",subject:"useFilter"});
        })
  } 
  else{
    chrome.tabs.query({currentWindow: true, active: true}, 
      function (tabs) {
         chrome.tabs.sendMessage(tabs[0].id, {from:"popup",subject:"turnOffFilter"});
      })
  }
}   
