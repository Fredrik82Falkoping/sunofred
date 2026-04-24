// Authentication functionality

let isSignUpMode = false;

// Helper function to get the correct path (works both locally and on GitHub Pages)
function getRelativePath(path) {
  // Get current directory
  const currentPath = window.location.pathname;
  const currentDir = currentPath.substring(0, currentPath.lastIndexOf('/'));
  
  // If we're in /admin/, go up one level
  if (currentDir.endsWith('/admin')) {
    return '..' + path;
  }
  
  // If we're already in root or login page
  return '.' + path;
}

// Check if user is already logged in
async function checkAuthStatus() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    
    if (user) {
        // User is logged in, redirect to admin page
        window.location.href = getRelativePath('/admin/multi-upload.html');
    }
}

// Toggle between sign in and sign up
document.getElementById('toggleLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    
    const title = document.getElementById('authTitle');
    const button = document.getElementById('authButton');
    const toggleText = document.getElementById('toggleText');
    const toggleLink = document.getElementById('toggleLink');
    
    if (isSignUpMode) {
        title.textContent = 'Skapa konto';
        button.textContent = 'Registrera dig';
        toggleText.textContent = 'Har du redan ett konto?';
        toggleLink.textContent = 'Logga in';
    } else {
        title.textContent = 'Logga in';
        button.textContent = 'Logga in';
        toggleText.textContent = 'Har du inget konto?';
        toggleLink.textContent = 'Registrera dig';
    }
    
    // Clear messages
    hideMessages();
});

// Handle form submission
document.getElementById('authForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const button = document.getElementById('authButton');
    
    // Disable button during request
    button.disabled = true;
    button.textContent = 'Vänta...';
    
    hideMessages();
    
    try {
        if (isSignUpMode) {
            // Sign up
            const { data, error } = await supabaseClient.auth.signUp({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            if (data.user) {
                if (data.user.identities && data.user.identities.length === 0) {
                    // User already exists
                    showError('Ett konto med denna e-post finns redan. Försök logga in istället.');
                } else {
                    // Check if email confirmation is required
                    showSuccess('Konto skapat! Kontrollera din e-post för att bekräfta ditt konto.');
                    // Note: Depending on Supabase settings, user might be auto-confirmed
                    setTimeout(() => {
                        window.location.href = getRelativePath('/admin/multi-upload.html');
                    }, 2000);
                }
            }
        } else {
            // Sign in
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password,
            });
            
            if (error) throw error;
            
            if (data.user) {
                showSuccess('Inloggad! Omdirigerar...');
                setTimeout(() => {
                    window.location.href = getRelativePath('/admin/multi-upload.html');
                }, 1000);
            }
        }
    } catch (error) {
        console.error('Auth error:', error);
        showError(error.message || 'Ett fel uppstod. Försök igen.');
    } finally {
        // Re-enable button
        button.disabled = false;
        button.textContent = isSignUpMode ? 'Registrera dig' : 'Logga in';
    }
});

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
}

function hideMessages() {
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('successMessage').style.display = 'none';
}

// Check auth status on page load
if (window.location.pathname.includes('login.html')) {
    checkAuthStatus();
}
