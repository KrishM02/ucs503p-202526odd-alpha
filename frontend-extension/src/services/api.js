const API_BASE_URL = process.env.API_BASE_URL; // Change to your backend URL

const api = {
  async request(method, endpoint, data = null, config = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
      ...config,
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `HTTP ${response.status}`);
      }

      return json;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  get(endpoint, config) {
    return this.request("GET", endpoint, null, config);
  },

  post(endpoint, data, config) {
    return this.request("POST", endpoint, data, config);
  },

  put(endpoint, data, config) {
    return this.request("PUT", endpoint, data, config);
  },

  delete(endpoint, config) {
    return this.request("DELETE", endpoint, null, config);
  },
};

export default api;