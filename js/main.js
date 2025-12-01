// =================================================================
// 1. LOCAL DATA SETUP & UTILITIES
// =================================================================

// Define the structure for local data storage
const LOCAL_STORAGE_KEY = 'ScholarLinkData';
let localData = {
    users: {}, // Simulates user roles, etc.
    students: [
        { id: 'S001', name: 'Alice Smith', class: 'Grade 1A' },
        { id: 'S002', name: 'Bob Johnson', class: 'Grade 2B' }
    ],
    classes: ['Grade 1A', 'Grade 2B', 'Grade 3C'],
    grades: []
};

// Map of user credentials for local testing
const LOCAL_USERS = {
    'admin@school.com': { password: 'password', role: 'admin' },
    'teacher@school.com': { password: 'password', role: 'teacher' }
};

// Map of roles to the section IDs (data-module attributes) they can access
const ROLE_PERMISSIONS = {
    'admin': ['attendance', 'grade', 'student-management', 'parent-portal', 'headmaster-dashboard'],
    'teacher': ['attendance', 'grade', 'parent-portal'],
    'guest': [] 
};

/**
 * Initializes local storage with default data if empty.
 */
function initLocalData() {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
        localData = JSON.parse(storedData);
    } else {
        // Save initial data if nothing exists
        saveLocalData();
    }
}

/**
 * Saves the current localData object back to localStorage.
 */
function saveLocalData() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localData));
}


// Global variable to track the currently logged-in user
let currentUser = null; 


// =================================================================
// 2. UI HELPERS (Status, Permissions, Tabs - UNCHANGED)
// =================================================================

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

function activateModule(moduleName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.module-section').forEach(section => section.classList.remove('active', 'hidden'));
    document.querySelectorAll('.module-section').forEach(section => section.classList.add('hidden'));

    const activeBtn = document.querySelector(`.tab-btn[data-module="${moduleName}"]`);
    const activeSection = document.getElementById(moduleName);

    if (activeBtn) activeBtn.classList.add('active');
    if (activeSection) {
        activeSection.classList.add('active');
        activeSection.classList.remove('hidden');
    }
}

document.querySelectorAll('.tab-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const moduleName = e.target.getAttribute('data-module');
        activateModule(moduleName);
    });
});


// =================================================================
// 3. LOCAL AUTHENTICATION (Simulated Login)
// =================================================================

function handleAuthStateChange() {
    const authSection = document.getElementById('auth-section');
    const appSection = document.getElementById('app-section');

    if (currentUser) {
        // Logged In
        authSection.classList.add('hidden');
        appSection.classList.remove('hidden');
        
        document.getElementById('userName').textContent = `${currentUser.email} (${currentUser.role})`;
        applyRolePermissions(currentUser.role); 
        
        // Load class data into dropdowns (Placeholder for actual data population)
        loadClassesDropdowns();

    } else {
        // Logged Out
        appSection.classList.add('hidden');
        authSection.classList.remove('hidden');
        document.getElementById('auth-status').textContent = 'Please log in. (Registration is disabled)';
    }
}

document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const authStatus = document.getElementById('auth-status');
    
    authStatus.textContent = 'Logging in via Firebase...';

    try {
        // Attempt to sign in using the new client email/password
        await auth.signInWithEmailAndPassword(email, password);
        
        // If successful, the auth.onAuthStateChanged listener will handle the UI update
        authStatus.textContent = 'Login successful!';
        
    } catch (error) {
        console.error("Login error:", error.message);
        // This is where you will see the API Key error or an "invalid credentials" error
        authStatus.textContent = `Error: ${error.message}`;
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    handleAuthStateChange();
});


// =================================================================
// 4. STUDENT REGISTRATION LOGIC (LOCAL STORAGE)
// =================================================================

document.getElementById('addStudentBtn').addEventListener('click', () => {
    const studentName = document.getElementById('newStudentName').value.trim();
    const studentClass = document.getElementById('newStudentClass').value;
    const statusElementId = 'studentRegStatus'; 

    if (!studentName || !studentClass) {
        showStatus(statusElementId, 'Please enter a name and select a class.', 'error');
        return;
    }

    if (!currentUser || currentUser.role !== 'admin') {
        showStatus(statusElementId, 'Access Denied: Only Admins can register students.', 'error');
        return;
    }

    // --- LOCAL STORAGE ADDITION ---
    const newStudent = {
        id: `S${Date.now()}`, // Simple unique ID generation
        name: studentName,
        class: studentClass,
        registeredBy: currentUser.email,
        timestamp: new Date().toISOString()
    };

    localData.students.push(newStudent);
    saveLocalData();
    // ------------------------------
    
    showStatus(statusElementId, `Student "${studentName}" successfully registered locally!`, 'success');

    // Clear input fields
    document.getElementById('newStudentName').value = '';
    
    // Optional: Refresh the student list if you have a display function
    // loadStudentList(studentClass); 
});

// =================================================================
// 5. INITIAL DATA LOADERS
// =================================================================

/**
 * Populates all class SELECT elements using data from localData.classes
 */
function loadClassesDropdowns() {
    const classSelectors = document.querySelectorAll(
        '#attClass, #gradeClass, #newStudentClass, #adminStudentClassSelect, #lookupClass'
    );
    
    classSelectors.forEach(selectEl => {
        // Clear existing options
        selectEl.innerHTML = '<option value="">-- Select Class --</option>'; 
        
        localData.classes.forEach(className => {
            const option = document.createElement('option');
            option.value = className;
            option.textContent = className;
            selectEl.appendChild(option);
        });
    });
}


// =================================================================
// 6. INITIALIZATION
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    initLocalData();
    handleAuthStateChange(); // Check initial state (will default to logged out)
});



