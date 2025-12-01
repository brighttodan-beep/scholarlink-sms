// =================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION (Global Style)
// =================================================================

// This is the Configuration object you provided.
const firebaseConfig = {
    apiKey: "AIzaSyDt1nGhKNXz6bLfLILUfJ_RnfD45_VgVX0",
    authDomain: "scholarlink-sms-app.firebaseapp.com",
    projectId: "scholarlink-sms-app",
    storageBucket: "scholarlink-sms-app.firebasestorage.app",
    messagingSenderId: "866758277016",
    appId: "1:866758277016:web:c848393d8a0cce4ea5dded",
    measurementId: "G-NLKTVVVQGZ" // We will ignore this for core functions
};

// Initialize Firebase App globally, which makes firebase.auth() and firebase.firestore() available.
// This assumes the required SDK script tags are loaded in index.html!
firebase.initializeApp(firebaseConfig); 
const auth = firebase.auth();     // Defines the 'auth' variable globally for this script
const db = firebase.firestore();  // Defines the 'db' variable globally for this script


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
    'guest': [] 
};

/**
 * Hides unauthorized tabs and sections based on the user's role.
 * @param {string} userRole - The role of the logged-in user.
 */
function applyRolePermissions(userRole) {
    const allowedModules = ROLE_PERMISSIONS[userRole] || ROLE_PERMISSIONS['guest'];
    const allTabButtons = document.querySelectorAll('.tab-btn');
    const allSections = document.querySelectorAll('.module-section');
    
    allTabButtons.forEach(tabBtn => {
        const moduleName = tabBtn.getAttribute('data-module');
        if (allowedModules.includes(moduleName)) {
            tabBtn.classList.remove('hidden'); 
        } else {
            tabBtn.classList.add('hidden');    
        }
    });

    allSections.forEach(section => {
        section.classList.remove('active');
        section.classList.add('hidden');
    });

    if (allowedModules.length > 0) {
        activateModule(allowedModules[0]); 
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
        statusEl.className = 'status-message alert mb-3 hidden';
        statusEl.classList.add(`alert-${type}`);
        statusEl.textContent = message;
        statusEl.classList.remove('hidden');
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
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.module-section').forEach(section => section.classList.remove('active'));
    document.querySelectorAll('.module-section').forEach(section => section.classList.add('hidden'));

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
        
        // Fetch role from Firestore (Crucial step that relies on the rules!)
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                const userRole = doc.data()?.role || 'guest'; // Default to 'guest' if role is missing/profile not found
                
                document.getElementById('userName').textContent = `${user.email} (${userRole})`;
                
                applyRolePermissions(userRole); 
                
                appSection.classList.remove('hidden');

            })
            .catch(error => {
                console.error("Error fetching user role:", error);
                // If fetching the user profile fails (e.g., due to strict rules),
                // we treat them as a guest to prevent app display for unprovisioned users.
                applyRolePermissions('guest'); 
                appSection.classList.remove('hidden');
            });
            
    } else {
        // User is logged out. Show login form.
        appSection.classList.add('hidden');
        authSection.classList.remove('hidden');
        document.getElementById('auth-status').textContent = 'Please log in.';
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
        authStatus.textContent = 'Login successful!';
        
    } catch (error) {
        console.error("Login error:", error.message);
        // This is where you will see the API Key error or the "no user record" error
        authStatus.textContent = `Error: ${error.message}`;
    }
});

// Logout Button Handler
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout error:", error);
    }
});


// =================================================================
// 5. STUDENT REGISTRATION LOGIC
// =================================================================

document.getElementById('addStudentBtn').addEventListener('click', async () => {
    const studentName = document.getElementById('newStudentName').value.trim();
    const studentClass = document.getElementById('newStudentClass').value;
    const statusElementId = 'studentRegStatus'; 

    if (!studentName || !studentClass) {
        showStatus(statusElementId, 'Please enter a name and select a class.', 'error');
        return;
    }

    const user = auth.currentUser; 
    if (!user) {
        showStatus(statusElementId, 'Authentication required to register students.', 'error');
        return;
    }

    try {
        // We need the user's role and schoolId to pass the security rules
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        if (!userData || userData.role !== 'admin' || !userData.schoolId) {
             showStatus(statusElementId, 'Access Denied: You must be a provisioned Admin.', 'error');
             return;
        }

        const studentData = {
            name: studentName,
            class: studentClass,
            registeredBy: user.email, 
            schoolId: userData.schoolId, // Crucial for passing the security rule
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        await db.collection('students').add(studentData); 
        
        showStatus(statusElementId, `Student "${studentName}" successfully registered!`, 'success');

        document.getElementById('newStudentName').value = '';
        
    } catch (error) {
        console.error("Error adding student:", error);
        // Check for permission denied error due to security rules
        if (error.message.includes('permission denied')) {
            showStatus(statusElementId, 'Permission Denied. Check your user role and school ID in Firestore.', 'error');
        } else {
            showStatus(statusElementId, `Error registering student: ${error.message}`, 'error');
        }
    }
});
