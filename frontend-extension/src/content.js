// Content script runs on every page
console.log("SecureVault content script loaded");

// Listen for manual trigger to fill password
document.addEventListener("pm-fill-password", (event) => {
  const { username, password } = event.detail;

  // Find and fill username field
  const usernameInputs = document.querySelectorAll(
    'input[type="email"], input[type="text"][name*="user"], input[type="text"][name*="name"]'
  );
  if (usernameInputs.length > 0) {
    usernameInputs[0].value = username;
    usernameInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
  }

  // Find and fill password field
  const passwordInputs = document.querySelectorAll('input[type="password"]');
  if (passwordInputs.length > 0) {
    passwordInputs[0].value = password;
    passwordInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
  }
});