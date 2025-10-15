let detectedForms = [];

// Common patterns for username/email fields
const usernamePatterns = [
  'username', 'user', 'email', 'e-mail', 'login', 'account', 
  'userid', 'user-name', 'user_name', 'phone', 'mobile', 'tel'
];

const passwordPatterns = [
  'password', 'pass', 'pwd', 'passwd', 'password1', 'user-pass', 'current-password'
];

// Check if input matches common patterns
function matchesPattern(input, patterns) {
  const id = (input.id || '').toLowerCase();
  const name = (input.name || '').toLowerCase();
  const placeholder = (input.placeholder || '').toLowerCase();
  const autocomplete = (input.autocomplete || '').toLowerCase();
  const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
  
  return patterns.some(pattern => 
    id.includes(pattern) || 
    name.includes(pattern) || 
    placeholder.includes(pattern) ||
    autocomplete.includes(pattern) ||
    ariaLabel.includes(pattern)
  );
}

// Trigger input events to notify the page
function triggerInputEvents(element, value) {
  // Set the value using native setter
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  nativeInputValueSetter.call(element, value);
  
  // Trigger all necessary events
  const events = [
    new Event('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true, cancelable: true }),
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
    new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
    new Event('blur', { bubbles: true, cancelable: true })
  ];
  
  events.forEach(event => element.dispatchEvent(event));
  
  // Also trigger React-specific events if React is detected
  if (element._valueTracker) {
    element._valueTracker.setValue('');
  }
}

// Find username/email field
function findUsernameField(form) {
  // Try type="email" first
  let field = form.querySelector('input[type="email"]');
  if (field) return field;
  
  // Try text inputs with common patterns
  const textInputs = form.querySelectorAll('input[type="text"], input:not([type])');
  for (let input of textInputs) {
    if (matchesPattern(input, usernamePatterns)) {
      return input;
    }
  }
  
  // Try tel inputs for phone-based login
  field = form.querySelector('input[type="tel"]');
  if (field) return field;
  
  // Fallback: first text input before password
  return form.querySelector('input[type="text"]');
}

// Find password field
function findPasswordField(form) {
  // Try type="password" first
  let field = form.querySelector('input[type="password"]');
  if (field) return field;
  
  // Try inputs with password-related patterns
  const allInputs = form.querySelectorAll('input');
  for (let input of allInputs) {
    if (matchesPattern(input, passwordPatterns)) {
      return input;
    }
  }
  
  return null;
}

// Detect login forms on page load
function detectLoginForms() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    const passwordField = findPasswordField(form);
    const emailField = findUsernameField(form);
    
    if (passwordField && emailField) {
      detectedForms.push({form, emailField, passwordField});
      attachFormListener(form, emailField, passwordField);
    }
  });
}

// Detect login fields outside forms (e.g., React/Vue apps)
function detectStandaloneFields() {
  // Find all password fields first
  const allPasswordFields = document.querySelectorAll('input[type="password"]');
  
  // Also check inputs by pattern matching (in case type is changed dynamically)
  const allInputs = document.querySelectorAll('input');
  const passwordFieldsByPattern = Array.from(allInputs).filter(input => 
    matchesPattern(input, passwordPatterns)
  );
  
  const passwordFields = new Set([...allPasswordFields, ...passwordFieldsByPattern]);
  
  passwordFields.forEach(passwordField => {
    // Skip if already detected in a form
    if (detectedForms.some(f => f.passwordField === passwordField)) {
      return;
    } 
    
    // Find nearest username field - search in document or parent container
    let emailField = null;
    
    // Strategy 1: Look in same parent container
    const container = passwordField.closest('div, section, main, form, body');
    if (container) {
      const containerInputs = container.querySelectorAll('input');
      
      // Find username field before password field
      for (let input of containerInputs) {
        if (input === passwordField) break;
        if (input.type === 'email' || 
            input.type === 'text' || 
            input.type === 'tel' ||
            !input.type ||
            matchesPattern(input, usernamePatterns)) {
          emailField = input;
        }
      }
    }
    
    // Strategy 2: Find by document order if not found
    if (!emailField) {
      const allDocInputs = Array.from(document.querySelectorAll('input'));
      const passwordIndex = allDocInputs.indexOf(passwordField);
      
      for (let i = passwordIndex - 1; i >= 0; i--) {
        const input = allDocInputs[i];
        if (input.type === 'email' || 
            input.type === 'text' || 
            input.type === 'tel' ||
            !input.type ||
            matchesPattern(input, usernamePatterns)) {
          emailField = input;
          break;
        }
      }
    }
    
    if (emailField) {
      detectedForms.push({form: null, emailField, passwordField});
      attachStandaloneListener(emailField, passwordField);
    }
  });
}

// Attach submit listener to form
function attachFormListener(form, emailField, passwordField) {
  form.addEventListener('submit', async (e) => {
    const email = emailField.value;
    const password = passwordField.value;
    const url = window.location.origin;
    
    if (email && password) {
      // Check if credentials already exist
      const stored = await chrome.storage.local.get('passwords');
      const passwords = stored.passwords || [];
      
      const existing = passwords.find(p => p.url === url && p.email === email);
      
      if (!existing) {
        showSavePrompt(email, password, url);
      }
    }
  });
}

// Attach listener for standalone fields (no form)
function attachStandaloneListener(emailField, passwordField) {
  // Listen for Enter key or nearby button clicks
  const handler = async () => {
    const email = emailField.value;
    const password = passwordField.value;
    const url = window.location.origin;
    
    if (email && password) {
      const stored = await chrome.storage.local.get('passwords');
      const passwords = stored.passwords || [];
      const existing = passwords.find(p => p.url === url && p.email === email);
      
      if (!existing) {
        setTimeout(() => showSavePrompt(email, password, url), 500);
      }
    }
  };
  
  // Listen on both fields for Enter key
  passwordField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handler();
  });
  
  emailField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handler();
  });
  
  // Find nearby submit buttons - search more aggressively
  const searchContainers = [
    passwordField.closest('div'),
    passwordField.closest('section'),
    passwordField.closest('main'),
    passwordField.closest('form'),
    document.body
  ].filter(Boolean);
  
  searchContainers.forEach(container => {
    const buttons = container.querySelectorAll(
      'button[type="submit"], button:not([type]), input[type="submit"], [role="button"]'
    );
    buttons.forEach(btn => {
      // Check if button is likely a login button
      const btnText = (btn.textContent || btn.value || '').toLowerCase();
      if (btnText.includes('log') || btnText.includes('sign') || 
          btnText.includes('submit') || btnText.includes('enter') ||
          btn.type === 'submit') {
        btn.addEventListener('click', () => setTimeout(handler, 100));
      }
    });
  });
}

// Show save prompt
function showSavePrompt(email, password, url) {
  const existing = document.getElementById('pm-save-prompt');
  if (existing) existing.remove();
  
  const prompt = document.createElement('div');
  prompt.id = 'pm-save-prompt';
  prompt.innerHTML = `
    <div class="pm-prompt-content">
      <h3>Save Login Info?</h3>
      <p><strong>Site:</strong> ${url}</p>
      <p><strong>Username:</strong> ${email}</p>
      <div class="pm-prompt-buttons">
        <button id="pm-save-yes">Save</button>
        <button id="pm-save-no">Not Now</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(prompt);
  
  document.getElementById('pm-save-yes').addEventListener('click', () => {
    saveCredentials(email, password, url);
    prompt.remove();
  });
  
  document.getElementById('pm-save-no').addEventListener('click', () => {
    prompt.remove();
  });
}

// Save credentials to local storage
async function saveCredentials(email, password, url) {
  const stored = await chrome.storage.local.get('passwords');
  const passwords = stored.passwords || [];
  
  passwords.push({
    url,
    email,
    password,
    date: new Date().toISOString()
  });
  
  await chrome.storage.local.set({passwords});
  showNotification('Login information saved!');
}

// Show notification
function showNotification(message) {
  const notif = document.createElement('div');
  notif.className = 'pm-notification';
  notif.textContent = message;
  document.body.appendChild(notif);
  
  setTimeout(() => notif.remove(), 3000);
}

// Auto-fill if credentials exist
async function checkAndAutoFill() {
  const url = window.location.origin;
  const stored = await chrome.storage.local.get('passwords');
  const passwords = stored.passwords || [];
  
  const matches = passwords.filter(p => p.url === url);
  
  if (matches.length > 0 && detectedForms.length > 0) {
    const {emailField, passwordField} = detectedForms[0];
    
    // Create autofill UI
    const container = document.createElement('div');
    container.className = 'pm-autofill-container';
    container.innerHTML = `
      <div class="pm-autofill-header">
        <span>🔑 Saved Logins (${matches.length})</span>
        <button class="pm-close-btn">✕</button>
      </div>
      <div class="pm-autofill-list">
        ${matches.map((match, idx) => `
          <button class="pm-autofill-item" data-idx="${idx}">
            ${match.email}
          </button>
        `).join('')}
      </div>
    `;
    
    // Position near the email field
    const rect = emailField.getBoundingClientRect();
    container.style.position = 'fixed';
    container.style.top = `${rect.bottom + window.scrollY + 5}px`;
    container.style.left = `${rect.left + window.scrollX}px`;
    container.style.width = `${Math.max(rect.width, 250)}px`;
    
    document.body.appendChild(container);
    
    // Handle autofill clicks
    container.querySelectorAll('.pm-autofill-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const match = matches[idx];
        
        triggerInputEvents(emailField, match.email);
        triggerInputEvents(passwordField, match.password);
        
        container.remove();
        showNotification('Login filled!');
      });
    });
    
    container.querySelector('.pm-close-btn').addEventListener('click', () => {
      container.remove();
    });
    
    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function closeAutofill(e) {
        if (!container.contains(e.target) && 
            e.target !== emailField && 
            e.target !== passwordField) {
          container.remove();
          document.removeEventListener('click', closeAutofill);
        }
      });
    }, 100);
  }
}

// Initialize
detectLoginForms();
detectStandaloneFields();
setTimeout(checkAndAutoFill, 500);

// Re-detect after DOM changes (for SPAs)
const observer = new MutationObserver(() => {
  const currentFormCount = detectedForms.length;
  detectLoginForms();
  detectStandaloneFields();
  if (detectedForms.length > currentFormCount) {
    setTimeout(checkAndAutoFill, 500);
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});