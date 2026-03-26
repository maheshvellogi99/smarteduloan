const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5001/api'
    : window.location.origin + '/api';

const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        try {
            const response = await fetch(`${API_URL}${endpoint}`, {
                ...options,
                headers
            });

            // Handle parsing response based on content-type
            const contentType = response.headers.get("content-type");
            let data = null;
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            }

            if (!response.ok) {
                if (response.status === 401) {
                    // Auto logout on unauthorized
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/';
                }
                const error = new Error(data?.message || 'API request failed');
                error.response = { data, status: response.status };
                throw error;
            }

            return { data };
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint, data, options = {}) {
        // Handle FormData separately (e.g., for file uploads)
        if (data instanceof FormData) {
            const token = localStorage.getItem('token');
            const headers = {
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            };
            return fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                body: data,
                headers
            }).then(async res => {
                const resData = await res.json();
                if (!res.ok) throw { response: { data: resData } };
                return { data: resData };
            });
        }
        
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    patch(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }
};

window.api = api;
