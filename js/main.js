// =================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION
// =================================================================

// !!! IMPORTANT !!!
// REPLACE with your Firebase project credentials. You get these from your
// Firebase Project Settings -> General -> Your Apps.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =================================================================
// 2. GLOBAL ROLE PERMISSIONS & UI HELPERS
// =================================================================

// Map of roles to the section IDs (data-module attributes) they can access
const ROLE_PERMISSIONS = {
    'admin': [
        'attendance', 
        'grade', 
        'student-management', 
        'parent-portal', 
        'headmaster-dashboard'
    ],
    'teacher': [
        'attendance', 
        'grade', 
        'parent-portal'
    ],
    // Default fallback role for safety
    'guest': [] 
};

/**
 * Hides unauthorized tabs and sections based on the user's role.
 * @param {string} userRole - The role of the logged-in user (e.g., 'teacher', 'admin').
 */
function applyRolePermissions(userRole) {
    const allowedModules = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['guest'];
    const allTabButtons = document.querySelectorAll('.tab-btn');
    const allSections = document.querySelectorAll('.module-section');
    
    // 1. Filter Navigation Tabs: Show only allowed tabs
    allTabButtons.forEach(tabBtn => {
        const moduleName = tabBtn.getAttribute('data-module');
        if (allowedModules.includes(moduleName)) {
            tabBtn.classList.remove('hidden'); 
        } else {
            tabBtn.classList.add('hidden');    
        }
    });

    // 2. Deactivate all sections initially
    allSections.forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });

    // 3. Set a default visible module/tab for the user's role
    if (allowedModules.length > 0) {
        const defaultModule = allowedModules[0];
        // Manually trigger the tab switch function for the first allowed tab
        activateModule(defaultModule); 
    }
}


/**
 * Displays a temporary status message in a designated element.
 * @param {string} elementId - The ID of the div to display the message in.
 * @param {string} message - The message text.
 * @param {string} type - 'success', 'error', or 'info'.
 */
function showStatus(elementId, message, type) {
    const statusEl = document.getElementById(elementId);
    if (statusEl) {
        // Reset classes and hide
        statusEl.className = 'status-message alert mb-3 hidden';
        
        // Set new type class (alert-success, alert-danger, alert-info)
        statusEl.classList.add(`alert-${type}`);

        statusEl.textContent = message;
        statusEl.classList.remove('hidden');

        // Automatically hide the message after 3 seconds
        setTimeout(() => {
            statusEl.classList.add('hidden');
            statusEl.textContent = '';
        }, 3000); 
    }
}

// =================================================================
// 3. TAB SWITCHING LOGIC
// =================================================================

/**
 * Handles the logic for switching between application modules/tabs.
 * @param {string} moduleName - The ID of the module section to activate.
 */
function activateModule(moduleName) {
    // 1. Deactivate all tabs and content sections
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.module-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.module-section').forEach(section => section.classList.add('hidden'));

    // 2. Activate the selected tab and content section
    const activeBtn = document.querySelector(`.tab-btn[data-module="${moduleName}"]`);
    const activeSection = document.getElementById(moduleName);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.classList.remove('hidden');
    }
}

// Event listener for sidebar tabs
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const moduleName = e.target.getAttribute('data-module');
        activateModule(moduleName);
    });
});

// =================================================================
// 4. AUTHENTICATION & ROLE CHECK
// =================================================================

// Authentication state listener: runs on page load and on login/logout
auth.onAuthStateChanged(user => {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');

    if (user) {
        // User is logged in. Fetch role and display app.
        authSection.classList.add('hidden');
        
        // Fetch role from Firestore
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                const userRole = doc.data()?.role || 'teacher'; // Default to 'teacher'
                
                document.getElementById('userName').textContent = `${user.email} (${userRole})`;
                
                // --- CORE ROLE LOGIC ---
                applyRolePermissions(userRole); 
                // --- END CORE ROLE LOGIC ---
                
                appSection.classList.remove('hidden');

            })
            .catch(error => {
                console.error("Error fetching user role:", error);
                // Even if role fetch fails, show the app with minimal permissions
                applyRolePermissions('guest'); 
                appSection.classList.remove('hidden');
            });
            
    } else {
        // User is logged out. Show login form.
        appSection.classList.add('hidden');
        authSection.classList.remove('hidden');
        document.getElementById('auth-status').textContent = 'Please log in. (Registration is disabled)';
    }
});


// Login Button Handler
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const authStatus = document.getElementById('auth-status');
    
    authStatus.textContent = 'Logging in...';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // auth.onAuthStateChanged will handle the UI update on success
        authStatus.textContent = 'Login successful!';
        
    } catch (error) {
        console.error("Login error:", error.message);
        authStatus.textContent = `Error: ${error.message}`;
    }
});

// Logout Button Handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
        // auth.onAuthStateChanged will handle the UI update on sign out
        
    } catch (error) {
        console.error("Logout error:", error);
    }
});


// =================================================================
// 5. STUDENT REGISTRATION LOGIC (WITH STATUS)
// =================================================================

document.getElementById('addStudentBtn').addEventListener('click', async () => {
    const studentName = document.getElementById('newStudentName').value.trim();
    const studentClass = document.getElementById('newStudentClass').value;
    const statusElementId = 'studentRegStatus'; // The ID added to the HTML

    if (!studentName || !studentClass) {
        showStatus(statusElementId, 'Please enter a name and select a class.', 'error');
        return;
    }

    const user = auth.currentUser; 
    if (!user) {
        showStatus(statusElementId, 'Authentication error. Please log in again.', 'error');
        return;
    }

    const studentData = {
        name: studentName,
        class: studentClass,
        registeredBy: user.email || user.uid, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('students').add(studentData); 
        
        // Success Notification
        showStatus(statusElementId, `Student "${studentName}" successfully registered!`, 'success');

        // Clear input fields
        document.getElementById('newStudentName').value = '';
        // Note: You may want to reload or update the list view here too
        
    } catch (error) {
        console.error("Error adding student:", error);
        // Error Notification
        showStatus(statusElementId, `Error registering student: ${error.message}`, 'error');
    }
});

// =================================================================
// 6. INITIAL DATA LOADERS (Place your data loading functions here)
// =================================================================

// Example function placeholders for class dropdowns, etc.
// function loadClassesDropdowns() { /* ... code to fetch and populate SELECT elements ... */ }
// function loadStudentList(classId) { /* ... code to fetch and populate student table ... */ }

// Call initial data loaders on page load (but outside the auth listener)
// document.addEventListener('DOMContentLoaded', loadClassesDropdowns);
