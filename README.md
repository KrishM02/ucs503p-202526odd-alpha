# **SecureVault \- End-to-End Encrypted Password Manager**

SecureVault is a secure, browser-based password manager extension built with React (Vite) and Next.js. It features a zero-knowledge architecture, meaning encryption happens entirely on the client side using AES-256-GCM.

## **📂 Project Structure**

This structure reflects the project **after** moving index.html to the root and configuring Vite for Chrome Extensions.

password-manager/  
├── backend-api/              \# Next.js Server  
│   ├── src/pages/api/        \# API Endpoints  
│   ├── .env.local            \# Server Secrets  
│   └── package.json  
│  
└── frontend-extension/       \# Chrome Extension (Vite)  
    ├── dist/                 \# Build Output (Load this folder into Chrome)  
    │   ├── background.js  
    │   ├── content.js  
    │   ├── index.html  
    │   └── manifest.json  
    ├── public/  
    │   └── manifest.json     \# Source Manifest  
    ├── src/  
    │   ├── components/  
    │   ├── services/  
    │   ├── background.js     \# Background Service Worker  
    │   └── content.js        \# Content Script  
    ├── index.html            \# Entry Point (Moved from public/popup.html)  
    ├── vite.config.js        \# Extension Build Config  
    └── package.json

## **⚙️ Setup Instructions**

### **1\. Backend Setup (Next.js)**

1. **Install & Configure:**  
   cd backend-api  
   npm install

2. Environment Variables:  
   Create .env.local in backend-api/:  
   MONGODB\_URI=mongodb+srv://\<user\>:\<pass\>@cluster.mongodb.net/password\_manager  
   JWT\_SECRET=your\_secure\_random\_secret  
   CORS\_ORIGIN=chrome-extension://\<ID\_FROM\_STEP\_3\>

3. **Run Server:**  
   npm run dev

### **2\. Frontend Extension Setup**

1. **Install Dependencies:**  
   cd frontend-extension  
   npm install

2. Critical Configuration (Fixes "Content Script" Errors):  
   Ensure your vite.config.js looks exactly like this to output flat files in dist/:  
   // frontend-extension/vite.config.js  
   import { defineConfig } from "vite";  
   import react from "@vitejs/plugin-react";  
   import { resolve } from "path";

   export default defineConfig({  
     plugins: \[react()\],  
     build: {  
       outDir: "dist",  
       emptyOutDir: true,  
       rollupOptions: {  
         input: {  
           popup: resolve(\_\_dirname, "index.html"),  
           background: resolve(\_\_dirname, "src/background.js"),  
           content: resolve(\_\_dirname, "src/content.js"),  
         },  
         output: {  
           entryFileNames: "\[name\].js",  
           chunkFileNames: "\[name\].js",  
           assetFileNames: "\[name\].\[ext\]",  
         },  
       },  
     },  
   });

3. **Build the Extension:**  
   npm run build

   *This generates the dist/ folder containing manifest.json, background.js, content.js, and index.html.*

### **3\. Load into Chrome**

1. Open Chrome and navigate to chrome://extensions/.  
2. Enable **Developer mode** (toggle in top-right).  
3. Click **Load unpacked**.  
4. Select the **password-manager/frontend-extension/dist** folder.  
   * *Do not select the src or root folder. You must select dist.*  
5. Copy the generated **Extension ID** (e.g., abcdefghijkl...).  
6. Paste this ID into your backend .env.local as CORS\_ORIGIN.  
7. Restart the backend server.

## **🐛 Common Troubleshooting**

**Error: "Could not load javascript 'content.js' for script"**

* **Cause:** Vite put content.js inside an assets/ folder or the filename includes a hash (e.g., content-123.js).  
* **Fix:** Verify vite.config.js matches the code above (specifically entryFileNames: "\[name\].js") and run npm run build again.

**Error: "Popup not found" or 404**

* **Cause:** manifest.json points to popup.html but Vite built it as index.html.  
* **Fix:** Ensure manifest.json has "default\_popup": "index.html" and that you renamed your source file to index.html.

**Error: Network Error / CORS**

* **Cause:** The backend doesn't trust the extension ID.  
* **Fix:** Update CORS\_ORIGIN in backend-api/.env.local with the exact ID from chrome://extensions/ and restart the Next.js server.

## **🔐 Security Features**

* **AES-256-GCM:** Used for vault encryption.  
* **PBKDF2:** Used for Master Key derivation (300k iterations).  
* **Zero-Knowledge:** The server never receives the encryption key in plain text.
