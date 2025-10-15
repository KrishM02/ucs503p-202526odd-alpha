let detectedForms = [];

const usernamePatterns = [
  'username', 'user', 'email', 'e-mail', 'login', 'account', 
  'userid', 'user-name', 'user_name', 'phone', 'mobile', 'tel'
];

const passwordPatterns = [
  'password', 'pass', 'pwd', 'passwd', 'password1', 'user-pass', 'current-password'
];

async function apiRequest(method, endpoint, body = null, params = null) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'apiRequest',
        data: {method, endpoint, body, params}
      },
      response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response ? response.error : 'No response from background script'));
        }
      }
    );
  });
}

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

function triggerInputEvents(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;
  nativeInputValueSetter.call(element, value);
  
  const events = [
    new Event('input', { bubbles: true, cancelable: true }),
    new Event('change', { bubbles: true, cancelable: true }),
    new KeyboardEvent('keydown', { bubbles: true, cancelable: true }),
    new KeyboardEvent('keyup', { bubbles: true, cancelable: true }),
    new Event('blur', { bubbles: true, cancelable: true })
  ];
  
  events.forEach(event => element.dispatchEvent(event));
  
  if (element._valueTracker) {
    element._valueTracker.setValue('');
  }
}

function findUsernameField(form) {
  let field = form.querySelector('input[type="email"]');
  if (field) return field;
  
  const textInputs = form.querySelectorAll('input[type="text"], input:not([type])');
  for (let input of textInputs) {
    if (matchesPattern(input, usernamePatterns)) {
      return input;
    }
  }
  
  field = form.querySelector('input[type="tel"]');
  if (field) return field;
  
  return form.querySelector('input[type="text"]');
}

function findPasswordField(form) {
  let field = form.querySelector('input[type="password"]');
  if (field) return field;
  
  const allInputs = form.querySelectorAll('input');
  for (let input of allInputs) {
    if (matchesPattern(input, passwordPatterns)) {
      return input;
    }
  }
  
  return null;
}

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

function detectStandaloneFields() {
  const allPasswordFields = document.querySelectorAll('input[type="password"]');
  const allInputs = document.querySelectorAll('input');
  const passwordFieldsByPattern = Array.from(allInputs).filter(input => 
    matchesPattern(input, passwordPatterns)
  );
  
  const passwordFields = new Set([...allPasswordFields, ...passwordFieldsByPattern]);
  
  passwordFields.forEach(passwordField => {
    if (detectedForms.some(f => f.passwordField === passwordField)) {
      return;
    }
    
    let emailField = null;
    const container = passwordField.closest('div, section, main, form, body');
    
    if (container) {
      const containerInputs = container.querySelectorAll('input');
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

function attachFormListener(form, emailField, passwordField) {
  form.addEventListener('submit', async (e) => {
    const email = emailField.value;
    const password = passwordField.value;
    const url = window.location.origin;
    
    if (email && password) {
      try {
        const passwords = await apiRequest('GET', '/passwords/url', null, {url});
        const existing = passwords.find(p => p.email === email);
        
        if (!existing) {
          showSavePrompt(email, password, url);
        }
      } catch (error) {
        console.error('Error checking existing passwords:', error);
        showSavePrompt(email, password, url);
      }
    }
  });
}

function attachStandaloneListener(emailField, passwordField) {
  const handler = async () => {
    const email = emailField.value;
    const password = passwordField.value;
    const url = window.location.origin;
    
    if (email && password) {
      try {
        const passwords = await apiRequest('GET', '/passwords/url', null, {url});
        const existing = passwords.find(p => p.email === email);
        
        if (!existing) {
          setTimeout(() => showSavePrompt(email, password, url), 500);
        }
      } catch (error) {
        console.error('Error checking existing passwords:', error);
        setTimeout(() => showSavePrompt(email, password, url), 500);
      }
    }
  };
  
  passwordField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handler();
  });
  
  emailField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handler();
  });
  
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
      const btnText = (btn.textContent || btn.value || '').toLowerCase();
      if (btnText.includes('log') || btnText.includes('sign') || 
          btnText.includes('submit') || btnText.includes('enter') ||
          btn.type === 'submit') {
        btn.addEventListener('click', () => setTimeout(handler, 100));
      }
    });
  });
}

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

async function saveCredentials(email, password, url) {
  try {
    await apiRequest('POST', '/passwords', {
      url,
      email,
      password,
      date: new Date().toISOString()
    });
    showNotification('Login information saved to MongoDB!');
  } catch (error) {
    console.error('Error saving credentials:', error);
    showNotification('Failed to save credentials: ' + error.message, true);
  }
}

function showNotification(message, isError = false) {
  const notif = document.createElement('div');
  notif.className = 'pm-notification' + (isError ? ' pm-error' : '');
  notif.textContent = message;
  document.body.appendChild(notif);
  
  setTimeout(() => notif.remove(), 3000);
}

async function checkAndAutoFill() {
  const url = window.location.origin;
  
  try {
    const matches = await apiRequest('GET', '/passwords/url', null, {url});
    
    if (matches.length > 0 && detectedForms.length > 0) {
      const {emailField, passwordField} = detectedForms[0];
      
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
      
      const rect = emailField.getBoundingClientRect();
      container.style.position = 'fixed';
      container.style.top = `${rect.bottom + window.scrollY + 5}px`;
      container.style.left = `${rect.left + window.scrollX}px`;
      container.style.width = `${Math.max(rect.width, 250)}px`;
      
      document.body.appendChild(container);
      
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
  } catch (error) {
    console.error('Error fetching passwords:', error);
  }
}

detectLoginForms();
detectStandaloneFields();
setTimeout(checkAndAutoFill, 500);

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