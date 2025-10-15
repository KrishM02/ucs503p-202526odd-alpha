// background.js
console.log('background.js loaded');
const API_CONFIG = {
  BASE_URL: 'http://localhost:3000/api',
  ENDPOINTS: {
    SAVE: '/passwords',
    GET_ALL: '/passwords',
    GET_BY_URL: '/passwords/url',
    DELETE: '/passwords'
  }
};

console.log('API_CONFIG:', API_CONFIG);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'apiRequest') {
    handleApiRequest(request.data)
      .then(response => sendResponse({success: true, data: response}))
      .catch(error => {
        console.error('API Request Error:', error);
        sendResponse({success: false, error: error.message});
      });
    return true;
  }
});

async function handleApiRequest(requestData) {
  const {method, endpoint, body, params} = requestData;
  
  let url = API_CONFIG.BASE_URL + endpoint;
  if (params) {
    url += '?' + new URLSearchParams(params);
  }
   
  const options = {
    method: method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}