// Open HoloSync app page when the extension icon is clicked
chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('app.html');
  chrome.tabs.query({ url: [url] }, (tabs) => {
    if (tabs && tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
    } else {
      chrome.tabs.create({ url });
    }
  });
});
