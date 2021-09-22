const filter_checkbox = document.getElementById("removeProfanity")

chrome.runtime.onMessage.addListener((msg)=>{
  if(msg.from=="content" && msg.subject=="censorState"){
    restorePopupState(msg.data);
  }
  if(msg.from=="content" && msg.subject=="disableCheckbox"){
    disableCheckbox();
  }
})

window.onload = function() {
  chrome.tabs.query({currentWindow: true, active: true}, 
    function (tabs) {
       chrome.tabs.sendMessage(tabs[0].id, {from:"popup",subject:"checkCensoringState"});
    });
}

function restorePopupState(state){
  filter_checkbox.removeAttribute('disabled');
  filter_checkbox.checked=state;
}

function disableCheckbox(){
  filter_checkbox.setAttribute('disabled','');
  filter_checkbox.checked=false;
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
