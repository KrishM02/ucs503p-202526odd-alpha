// Background service worker for extension
chrome.runtime.onInstalled.addListener(() => {
  console.log("SecureVault extension installed");
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_STORED_CREDENTIAL") {
    // Retrieve password for auto-fill
    chrome.storage.local.get(
      [`password_${request.domain}`],
      (result) => {
        sendResponse({
          success: true,
          credential: result[`password_${request.domain}`],
        });
      }
    );
    return true; // Will send response asynchronously
  }
});