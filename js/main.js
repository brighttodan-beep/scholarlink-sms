// =================================================================
// 1. FIREBASE CONFIGURATION (USING YOUR VALIDATED KEY)
// =================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDt1nGhKNXz6bLfLILUfJ_RnfD45_VgVX0", 
    authDomain: "scholarlink-sms-app.firebaseapp.com",
    projectId: "scholarlink-sms-app",
    storageBucket: "scholarlink-sms-app.firebasestorage.app",
    messagingSenderId: "866758277016",
    appId: "1:866758277016:web:c848393d8a0cce4ea5dded",
};

// Initialize Firebase (Namespaced SDK style)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// =================================================================
// 2. GLOBAL VARIABLES
// =================================================================
let GLOBAL_USER_ROLE = null;
let GLOBAL_USER_SCHOOL_ID = null;
let CLASS_LIST_CACHE = []; // Cache to hold the fetched classes

// References to HTML elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userNameEl = document.getElementById('userName');

// Select elements that need the class list
const classSelectors = [
    document.getElementById('attClass'),
    document.getElementById('gradeClass'),
    document.getElementById('newStudentClass'),
    document.getElementById('adminStudentClassSelect'),
    document.getElementById('lookupClass')
];


// =================================================================
// 3. CORE APPLICATION FUNCTIONS
// =================================================================

/**
 * Shows/hides navigation tabs and modules based on the user's role (RBAC).
 * This ensures users only see what their role allows.
 */
function enforceRoleVisibility() {
    console.log(`Enforcing visibility for role: ${GLOBAL_USER_ROLE}`);
    
    // 🔑 Define which roles can see which module sections 🔑
    // Map the module section ID to an array of allowed roles
    const moduleRoleMap = {
        'students-module': ['admin'],                    // Student Registration/Management (Admin only)
        'attendance-module': ['admin', 'teacher'],       // Attendance Tracking
        'gradebook-module': ['admin', 'teacher'],        // Grade Entry/Viewing
        'lookup-module': ['admin', 'teacher'],           // Student/Data Lookup
        'admin-tools-module': ['admin'],                 // Admin specific settings
        'parent-portal-module': ['parent'],              // Parent-specific views (e.g., viewing child's grades)
        // Add all your remaining module IDs here
    };
    
    // Ensure all modules start hidden/inactive for clean slate before enforcing visibility
    document.querySelectorAll('.module-section').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.add('hidden');
        btn.classList.remove('active');
    });

    // 1. Hide/Show Modules and Navigation Buttons based on GLOBAL_USER_ROLE
    let firstVisibleButton = null;

    document.querySelectorAll('.module-section').forEach(section => {
        const moduleId = section.id;
        // Find the navigation button corresponding to this section
        const navButton = document.querySelector(`.tab-btn[data-module="${moduleId}"]`);
        
        // Get allowed roles and check permission
        const allowedRoles = moduleRoleMap[moduleId] || [];
        // Note: Using toLowerCase() here for robustness against case variations in the database.
        const isAllowed = allowedRoles.includes(GLOBAL_USER_ROLE ? GLOBAL_USER_ROLE.toLowerCase() : null);

        if (isAllowed) {
            section.classList.remove('hidden'); // SHOW module content
            if (navButton) {
                navButton.classList.remove('hidden'); // SHOW navigation button
                // Capture the first button found for automatic activation later
                if (!firstVisibleButton) {
                    firstVisibleButton = navButton;
                }
            }
        }
        // If not allowed, it remains hidden due to the initial reset above
    });

    // 2. Automatically activate the first visible tab
    if (firstVisibleButton) {
        firstVisibleButton.click(); // Trigger the click event to show the content and activate the button style
    } else {
        console.warn("No visible modules found for this user role.");
        // You might want to display a "Welcome" or "Unauthorized" message here
    }
}


/**
 * Populates all class dropdown selectors with data from the global cache.
 * Includes enhanced logging to catch missing elements.
 * @param {Array<Object>} classes - Array of class objects { id: '...', name: '...' }
 */
function populateClassSelectors(classes) {
    if (classes.length === 0) {
        console.warn("No classes found to populate selectors.");
        return;
    }

    const defaultOption = '<option value="">-- Select Class --</option>';
    const optionsHtml = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    const fullHtml = defaultOption + optionsHtml;

    // Array of the original IDs for logging purposes
    const selectorNames = ['attClass', 'gradeClass', 'newStudentClass', 'adminStudentClassSelect', 'lookupClass'];
    
    classSelectors.forEach((selectEl, index) => {
        const selectorName = selectorNames[index];
        
        // Only set innerHTML if the element exists
        if (selectEl) {
            selectEl.innerHTML = fullHtml;
            console.log(`✅ Success: Populated selector ID: ${selectorName}`);
        } else {
            // Specific error for the missing element
            console.error(`🔴 ERROR: Class selector element with ID '${selectorName}' was not found in the DOM. This is the likely cause of the issue.`);
        }
    });
}


/**
 * Fetches the list of classes for the authenticated user's school.
 */
async function fetchAndPopulateClasses() {
    if (!GLOBAL_USER_SCHOOL_ID) {
        console.error("Cannot fetch classes: GLOBAL_USER_SCHOOL_ID is missing.");
        return;
    }

    try {
        const classesRef = db.collection('classes');
        const querySnapshot = await classesRef
            .where('schoolId', '==', GLOBAL_USER_SCHOOL_ID)
            .orderBy('sortOrder', 'asc')
            .get();

        const classes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.id
        }));

        CLASS_LIST_CACHE = classes;
        populateClassSelectors(classes);

        console.log(`Successfully loaded ${classes.length} classes for school: ${GLOBAL_USER_SCHOOL_ID}`);

    } catch (error) {
        // This should now only catch network errors, as security rules were fixed.
        console.error("Error fetching classes:", error);
        alert("Failed to load class list. Check console for details.");
    }
}


/**
 * Fetches the user's profile, sets global role/schoolId, and loads application data.
 * @param {string} uid - The Firebase User UID
 */
async function fetchUserProfile(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();

        if (userDoc.exists) {
            const userData = userDoc.data();
            GLOBAL_USER_ROLE = userData.role || 'guest';
            GLOBAL_USER_SCHOOL_ID = userData.schoolId;

            userNameEl.textContent = `${userData.name} (${GLOBAL_USER_ROLE})`;
            console.log(`User Profile Loaded. Role: ${GLOBAL_USER_ROLE}, School ID: ${GLOBAL_USER_SCHOOL_ID}`);
            
            // --- CRUCIAL STEP 1: Fetch and populate the classes immediately after getting school ID ---
            await fetchAndPopulateClasses();

            // --- STEP 2: Enforce UI visibility based on the loaded role ---
            enforceRoleVisibility(); 

            // --- STEP 3: Initialize other modules after classes are loaded ---
            // initAttendanceModule();
            // initGradebookModule();
            // etc...

        } else {
            console.error("User profile document not found in /users collection.");
            authSection.querySelector('#auth-status').textContent = "Profile not provisioned. Contact administrator.";
            auth.signOut(); // Force sign out if profile is missing
        }
    } catch (error) {
        console.error("Error fetching user profile:", error);
        authSection.querySelector('#auth-status').textContent = `Error loading profile: ${error.message}`;
        auth.signOut();
    }
}


// =================================================================
// 4. AUTHENTICATION & UI HANDLERS
// =================================================================

/**
 * Handles the application state change (logged in vs. logged out).
 * @param {firebase.User} user - The authenticated user object or null.
 */
function handleAuthState(user) {
    if (user) {
        // User is signed in.
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        
        // Fetch profile and application data
        fetchUserProfile(user.uid);
        
    } else {
        // User is signed out.
        authSection.classList.remove('hidden');
        appSection.classList.add('hidden');
        
        // Reset global state
        GLOBAL_USER_ROLE = null;
        GLOBAL_USER_SCHOOL_ID = null;
        CLASS_LIST_CACHE = [];
        populateClassSelectors([]); // Clear dropdowns
        
        userNameEl.textContent = 'User';
        authSection.querySelector('#auth-status').textContent = "Please log in. (Registration is disabled)";
    }
}

// Attach listeners
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
        alert("Please enter both email and password.");
        return;
    }

    // ⭐ THIS IS THE CRITICAL SECTION THAT NEEDS A CATCH BLOCK ⭐
    try {
        authSection.querySelector('#auth-status').textContent = "Logging in...";
        await auth.signInWithEmailAndPassword(email, password);
        // handleAuthState will take over upon success
    } catch (error) { // <--- THIS CATCH BLOCK MUST BE PRESENT
        console.error("Login failed:", error);
        let errorMessage = error.message || "An unknown login error occurred.";
        if (error.code) {
             errorMessage = `Login failed (${error.code}).`;
        }
        authSection.querySelector('#auth-status').textContent = errorMessage;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});
// ... rest of the code follows

// =================================================================
// 5. INITIALIZATION
// =================================================================
auth.onAuthStateChanged(handleAuthState);


