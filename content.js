console.log("✅ SmartLearn content script loaded");

// Helper to get YouTube video id from URL
function getYouTubeVideoId() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("v");
  } catch (e) {
    return null;
  }
}

function sendEvent(eventName, time) {
  const videoId = getYouTubeVideoId() || null;
  chrome.runtime.sendMessage({ event: eventName, time: Number(time), videoId });
}

let lastTime = 0;

function attachVideoListeners(video) {
  if (video._smartlearn_attached) return;
  video._smartlearn_attached = true;

  video.addEventListener("play", () => sendEvent("Play", video.currentTime.toFixed(2)));
  video.addEventListener("pause", () => sendEvent("Pause", video.currentTime.toFixed(2)));
  video.addEventListener("seeked", () => {
    let newTime = video.currentTime;
    if (newTime < lastTime) sendEvent("Rewind", newTime.toFixed(2));
    else if (newTime > lastTime) sendEvent("Forward", newTime.toFixed(2));
    lastTime = newTime;
  });

  // also capture ratechange or ended if helpful
  video.addEventListener("ratechange", () => sendEvent("RateChange", video.playbackRate));
}

// Wait for video element (handles YouTube SPA)
function waitForVideo() {
  const video = document.querySelector("video");
  if (!video) {
    setTimeout(waitForVideo, 500);
  } else {
    // store initial time
    lastTime = video.currentTime;
    attachVideoListeners(video);
  }
}

waitForVideo();

// Also observe for new video elements (in case YouTube swaps players)
const obs = new MutationObserver(() => {
  const video = document.querySelector("video");
  if (video && !video._smartlearn_attached) {
    attachVideoListeners(video);
  }
});
obs.observe(document, { childList: true, subtree: true });
