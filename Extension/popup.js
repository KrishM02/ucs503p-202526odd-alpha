console.log('Popup script loaded');

async function apiRequest(method, endpoint, body = null, params = null) {
  console.log('Making API request:', method, endpoint);
  
  return new Promise((resolve, reject) => {
    const message = {
      action: 'apiRequest',
      data: {method, endpoint, body, params}
    };
    
    console.log('Sending message to background:', message);
    
    chrome.runtime.sendMessage(message, response => {
      console.log('Got response:', response);
      
      if (chrome.runtime.lastError) {
        console.error('Chrome runtime error:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      if (response && response.success) {
        resolve(response.data);
      } else {
        const error = response ? response.error : 'No response from background script';
        console.error('API request failed:', error);
        reject(new Error(error));
      }
    });
  });
}

async function checkApiConnection() {
  console.log('Checking API connection...');
  const statusDiv = document.getElementById('apiStatus');
  statusDiv.textContent = 'Checking connection...';
  statusDiv.className = 'api-status';
  
  try {
    const result = await apiRequest('GET', '/passwords');
    console.log('Connection successful, got:', result);
    statusDiv.textContent = '✓ Connected to MongoDB';
    statusDiv.className = 'api-status connected';
    return true;
  } catch (error) {
    console.error('Connection error:', error);
    statusDiv.textContent = '✗ Cannot connect - Make sure server is running on http://localhost:3000';
    statusDiv.className = 'api-status disconnected';
    return false;
  }
}

async function loadPasswords() {
  console.log('Loading passwords...');
  const list = document.getElementById('password-list');
  
  const connected = await checkApiConnection();
  if (!connected) {
    list.innerHTML = '<div class="no-passwords">Unable to load passwords. Check API connection.</div>';
    return;
  }
  
  try {
    const passwords = await apiRequest('GET', '/passwords');
    console.log('Loaded passwords:', passwords);
    
    if (passwords.length === 0) {
      list.innerHTML = '<div class="no-passwords">No saved passwords yet</div>';
      return;
    }
    
    list.innerHTML = passwords.map((p, idx) => `
      <div class="password-item">
        <strong>${p.url}</strong>
        <div>Username: ${p.email}</div>
        <div>Password: <span id="pwd-${idx}">••••••••</span>
          <button class="show-password" data-idx="${idx}">Show</button>
        </div>
        <button class="delete-btn" data-id="${p._id}">Delete</button>
      </div>
    `).join('');
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        try {
          await apiRequest('DELETE', `/passwords/${id}`);
          loadPasswords();
        } catch (error) {
          alert('Error deleting password: ' + error.message);
        }
      });
    });
    
    document.querySelectorAll('.show-password').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const span = document.getElementById(`pwd-${idx}`);
        if (span.textContent === '••••••••') {
          span.textContent = passwords[idx].password;
          e.target.textContent = 'Hide';
        } else {
          span.textContent = '••••••••';
          e.target.textContent = 'Show';
        }
      });
    });
  } catch (error) {
    console.error('Error loading passwords:', error);
    list.innerHTML = `<div class="no-passwords">Error: ${error.message}</div>`;
  }
}

console.log('Starting loadPasswords...');
loadPasswords();