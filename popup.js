async function loadPasswords() {
  const stored = await chrome.storage.local.get('passwords');
  const passwords = stored.passwords || [];
  const list = document.getElementById('password-list');
  
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
      <button class="delete-btn" data-idx="${idx}">Delete</button>
    </div>
  `).join('');
  
  // Attach event listeners
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = parseInt(e.target.dataset.idx);
      passwords.splice(idx, 1);
      await chrome.storage.local.set({passwords});
      loadPasswords();
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
}

// Export passwords
document.getElementById('exportBtn').addEventListener('click', async () => {
  const stored = await chrome.storage.local.get('passwords');
  const passwords = stored.passwords || [];
  
  const dataStr = JSON.stringify(passwords, null, 2);
  const blob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `passwords_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
});

// Import passwords
document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        const stored = await chrome.storage.local.get('passwords');
        const existing = stored.passwords || [];
        
        // Merge passwords, avoiding duplicates
        const merged = [...existing];
        imported.forEach(imp => {
          const exists = merged.some(m => 
            m.url === imp.url && m.email === imp.email
          );
          if (!exists) {
            merged.push(imp);
          }
        });
        
        await chrome.storage.local.set({passwords: merged});
        alert(`Imported ${imported.length} passwords!`);
        loadPasswords();
      } else {
        alert('Invalid file format');
      }
    } catch (err) {
      alert('Error reading file: ' + err.message);
    }
  };
  reader.readAsText(file);
});

loadPasswords();