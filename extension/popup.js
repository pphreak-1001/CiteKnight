document.getElementById("toggle").addEventListener("click", () => {
    chrome.tabs.create({ url: "https://en.wikipedia.org/wiki/Special:MyPage" });
  });
  
  