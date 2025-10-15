chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'exportPasswords') {
    chrome.storage.local.get('passwords', (data) => {
      const passwords = data.passwords || [];
      const blob = new Blob([JSON.stringify(passwords, null, 2)], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      
      chrome.downloads.download({
        url: url,
        filename: 'passwords.json',
        saveAs: true
      });
    });
  } else if (request.action === 'importPasswords') {
    // Will be handled via file input in popup
    sendResponse({success: true});
  }
});