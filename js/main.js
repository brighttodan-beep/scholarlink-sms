// =================================================================
// 1. FIREBASE CONFIGURATION & INITIALIZATION (Global Style)
// =================================================================

// IMPORTANT: Ensure the SDK script tags (v8) are in your index.html!
const firebaseConfig = {
    // You must verify your key and project details are correct here.
    apiKey: "AIzaSyDt1nGhKNXz6bLfLILUfJ_RnfD45_VgVX0",
    authDomain: "scholarlink-sms-app.firebaseapp.com",
    projectId: "scholarlink-sms-app",
    storageBucket: "scholarlink-sms-app.firebasestorage.app",
    messagingSenderId: "866758277016",
    appId: "1:866758277016:web:c848393d8a0cce4ea5dded",
    measurementId: "G-NLKTVVVQGZ"
};

// Initialize Firebase App globally.
firebase.initializeApp(firebaseConfig); 
const auth = firebase.auth();     
const db = firebase.firestore();  

// Global variable to store the user's schoolId after login.
// This is necessary for multi-tenancy reads (like fetching classes).
let GLOBAL_USER_SCHOOL_ID = null;


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
        'student-management',
        'parent-portal'
    ],
    'parent': [
        'parent-portal'
    ],
    // The default when the user role is not found or profile is missing:
    'guest': [] 
};

/**
 * Hides unauthorized tabs and sections based on the user's role.
 * @param {string} userRole - The role of the logged-in user.
 */
function applyRolePermissions(userRole) {
    // Use the role found, or default to 'guest' if the role lookup fails
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

    // Activate the first module the user is allowed to see
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
        // Clear existing classes and set new ones
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
// 3. TAB SWITCHING LOGIC & DATA FETCHING (NEW CLASS LOGIC HERE)
// =================================================================

/**
 * Fetches class data from Firestore and populates the class dropdown.
 */
async function fetchAndPopulateClasses() {
    const classSelect = document.getElementById('newStudentClass');
    if (!classSelect || !GLOBAL_USER_SCHOOL_ID) return; // Exit if no element or no school ID

    // 1. Clear existing options
    classSelect.innerHTML = '<option value="">Select Class</option>';

    try {
        // 2. Fetch the documents from the classes collection for the current school
        const classesSnapshot = await db.collection('classes')
            .where('schoolId', '==', GLOBAL_USER_SCHOOL_ID) // Use the global school ID
            .get(); 

        // 3. Populate the dropdown
        if (classesSnapshot.empty) {
            classSelect.innerHTML = '<option value="">No Classes Found</option>';
            return;
        }

        classesSnapshot.forEach(doc => {
            const classData = doc.data();
            const option = document.createElement('option');
            option.value = classData.name;
            option.textContent = classData.name;
            classSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Error fetching classes:", error);
        // This will often catch the 'Permission Denied' error if rules are wrong
        showStatus('studentRegStatus', 'Could not load classes list. Check permissions.', 'error');
    }
}

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
    
    // NEW: If we switch to the student-management module, fetch the classes
    if (moduleName === 'student-management') {
         fetchAndPopulateClasses();
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
    GLOBAL_USER_SCHOOL_ID = null; // Reset school ID on auth change

    if (user) {
        console.log("LOGGED-IN USER UID:", user.uid); // For provisioning help
        // User is logged in. Fetch role and display app.
        authSection.classList.add('hidden');
        
        // Fetch role from Firestore (Crucial step that relies on the rules!)
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                // 1. Check if the document EXISTS (Provisioning Check)
                if (!doc.exists) {
                    const userRole = 'guest'; // Use 'guest' for non-existent profiles
                    document.getElementById('userName').textContent = `${user.email} (Unprovisioned)`;

                    showStatus('auth-status', 
                               'Login successful, but user profile is missing in Firestore. Contact admin.', 
                               'error'); 
                    
                    applyRolePermissions(userRole); 
                    appSection.classList.remove('hidden'); 
                    return; 
                }

                // 2. Document exists: proceed to get role and set global school ID
                const userData = doc.data();
                
                // Set the global school ID for data queries
                GLOBAL_USER_SCHOOL_ID = userData.schoolId; // 👈 SET GLOBAL VARIABLE

                // ✅ FIX FOR SYNTAX ERROR: Safely default to 'guest' if role field is empty
                const userRole = userData.role || 'guest'; 
                
                document.getElementById('userName').textContent = `${user.email} (${userRole})`;
                
                applyRolePermissions(userRole); 
                
                appSection.classList.remove('hidden');

            })
            .catch(error => {
                // 3. Handle fatal error (e.g., Security Rules block the /users read)
                console.error("Fatal Error fetching user role:", error);
                
                showStatus('auth-status', 
                           `Access Error: ${error.message}. Check API key and Security Rules.`, 
                           'error');

                // Keep the app hidden if we can't confirm the user's role
                authSection.classList.remove('hidden');
                appSection.classList.add('hidden');
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
        // We rely on the GLOBAL_USER_SCHOOL_ID set during login
        if (!GLOBAL_USER_SCHOOL_ID) {
            showStatus(statusElementId, 'Error: Could not retrieve school ID. Please log out and back in.', 'error');
            return;
        }

        // We still need the user's role to pass the security rules
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();
        
        // Permission check: Allows admin and teacher now (based on your request and security rules)
        if (!userData || !['admin', 'teacher'].includes(userData.role) || userData.schoolId !== GLOBAL_USER_SCHOOL_ID) {
             showStatus(statusElementId, 'Access Denied: You must be a provisioned Admin or Teacher from this school.', 'error');
             return;
        }

        const studentData = {
            name: studentName,
            class: studentClass,
            registeredBy: user.email, 
            schoolId: GLOBAL_USER_SCHOOL_ID, // Use the global school ID
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
