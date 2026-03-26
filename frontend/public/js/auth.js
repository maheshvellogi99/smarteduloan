document.addEventListener('DOMContentLoaded', () => {
    // ---- Login Logic ----
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const errorDiv = document.getElementById('error-message');
            const role = document.getElementById('role-select').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            errorDiv.style.display = 'none';
            btn.disabled = true;
            btn.textContent = 'Authenticating...';

            try {
                const res = await api.post('/auth/login', { email, password });
                
                // Verify correct portal role attempts
                if (res.data.user.role !== role) {
                    throw new Error(`Unauthorized. Please use the ${res.data.user.role} portal.`);
                }

                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));

                utils.showToast('Login successful!');
                window.location.href = `/${role}/dashboard.html`;
            } catch (err) {
                errorDiv.textContent = err.response?.data?.message || err.message || 'Login failed';
                errorDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Sign In';
            }
        });
    }

    // ---- Register Logic ----
    const regForm = document.getElementById('register-form');
    if (regForm) {
        const roleSelect = document.getElementById('reg-role');
        const bankFields = document.getElementById('bank-fields');

        // Toggle fields based on role
        roleSelect.addEventListener('change', (e) => {
            if (e.target.value === 'bank') {
                bankFields.style.display = 'block';
            } else {
                bankFields.style.display = 'none';
            }
        });

        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('reg-submit-btn');
            const errorDiv = document.getElementById('error-message');
            
            errorDiv.style.display = 'none';
            btn.disabled = true;
            btn.textContent = 'Registering...';

            const payload = {
                role: roleSelect.value,
                name: document.getElementById('reg-name').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value
            };

            if (payload.role === 'bank') {
                payload.bankName = document.getElementById('reg-bankName').value;
                payload.bankCode = document.getElementById('reg-bankCode').value;
                
                if(!payload.bankName || !payload.bankCode) {
                    errorDiv.textContent = 'Bank name and code are required.';
                    errorDiv.style.display = 'block';
                    btn.disabled = false;
                    btn.textContent = 'Create Account';
                    return;
                }
            }

            try {
                const res = await api.post('/auth/register', payload);
                
                localStorage.setItem('token', res.data.token);
                localStorage.setItem('user', JSON.stringify(res.data.user));

                utils.showToast('Registration successful!');
                window.location.href = `/${payload.role}/dashboard.html`;
            } catch (err) {
                errorDiv.textContent = err.response?.data?.message || err.message || 'Registration failed';
                errorDiv.style.display = 'block';
            } finally {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        });
    }
});
