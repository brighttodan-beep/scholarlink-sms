// =================================================================
// 1. FIREBASE CONFIGURATION (REPLACE WITH YOUR ACTUAL CONFIG)
// =================================================================

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
 * Populates all class dropdown selectors with data from the global cache.
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

    classSelectors.forEach(selectEl => {
        // Only set innerHTML if the element exists
        if (selectEl) {
            selectEl.innerHTML = fullHtml;
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
            .orderBy('sortOrder', 'asc') // Assuming you have a field for ordering
            .get();

        const classes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || doc.id // Use 'name' field if available, otherwise use doc.id
        }));

        CLASS_LIST_CACHE = classes;
        populateClassSelectors(classes);

        console.log(`Successfully loaded ${classes.length} classes for school: ${GLOBAL_USER_SCHOOL_ID}`);

    } catch (error) {
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

            // --- CRUCIAL STEP 2: Initialize other modules after classes are loaded ---
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

    try {
        authSection.querySelector('#auth-status').textContent = "Logging in...";
        await auth.signInWithEmailAndPassword(email, password);
        // handleAuthState will take over upon success
    } catch (error) {
        console.error("Login failed:", error);
        authSection.querySelector('#auth-status').textContent = `Login failed: ${error.message}`;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});

// Tab switching logic (basic implementation)
document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        // 1. Update active button state
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        // 2. Update visible section
        const moduleId = e.target.getAttribute('data-module');
        document.querySelectorAll('.module-section').forEach(section => {
            if (section.id === moduleId) {
                section.classList.add('active');
            } else {
                section.classList.remove('active');
            }
        });
    });
});


// =================================================================
// 5. INITIALIZATION
// =================================================================
auth.onAuthStateChanged(handleAuthState);
