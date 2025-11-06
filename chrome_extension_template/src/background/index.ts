// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.action === "openWorksManager") {
    // Open the side panel
    if (sender.tab?.windowId) {
      chrome.sidePanel.open({ windowId: sender.tab.windowId });
    }
  }
});

export default chrome.runtime.onInstalled.addListener(() => {
  console.log("ORCID Works Manager extension installed");
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "open_side_panel") {
    chrome.windows.getCurrent((w) => {
      chrome.sidePanel.open({ windowId: w.id! });
      console.log("Works Manager panel opened");
    });
  }
});
