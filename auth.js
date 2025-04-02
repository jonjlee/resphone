// Authentication using worker endpoint
const WORKER_URL = 'https://resphone.jonjlee.workers.dev/auth';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const utc = Math.floor(Date.now() / 1000);

        // Create hash of utc|password
        const hash = await crypto.subtle.digest('SHA-256',
            new TextEncoder().encode(`${utc}|${password}`))
            .then(hash => Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(''));

        try {
            const response = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ hash, utc }),
            });

            if (response.ok) {
                // Store authentication state and password in sessionStorage
                sessionStorage.setItem('authenticated', 'true');
                sessionStorage.setItem('password', password);
                // Redirect to main page
                window.location.href = 'main.html';
            } else {
                throw new Error('Authentication failed');
            }
        } catch (error) {
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-text';
            errorDiv.textContent = 'Invalid password. Please try again.';

            // Remove any existing error messages
            const existingError = document.querySelector('.error-text');
            if (existingError) {
                existingError.remove();
            }

            // Insert error message after the form
            loginForm.parentNode.insertBefore(errorDiv, loginForm.nextSibling);

            // Clear password field
            document.getElementById('password').value = '';
        }
    });
}); 