// --- START OF COMPLETE & FINAL CODE: js/main.js ---

// --- FIREBASE CONFIGURATION & INITIALIZATION ---

// These are the actual keys for your project: scholarlink-sms-app
const firebaseConfig = {
    apiKey: "AIzaSyDt1nGhKNXz6bLfLILUfJ_RnfD45_VgVX0", 
    authDomain: "scholarlink-sms-app.firebaseapp.com", 
    projectId: "scholarlink-sms-app", 
    storageBucket: "scholarlink-sms-app.firebasestorage.app",
    messagingSenderId: "866758277016",
    appId: "1:866758277016:web:c848393d8a0cce4ea5dded",
    measurementId: "G-NLKTVVVQGZ"
};
// --- END FIREBASE CONFIGURATION ---

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("[STATUS] Firebase App Initialized Successfully.");
} catch (e) {
    console.error("[FATAL ERROR] Firebase Initialization Failed. Check firebaseConfig object.", e);
    // Exit if initialization fails to prevent crashes later
    alert("System Error: Could not connect to the database. Check console for details.");
}


// Database and Authentication References
const db = firebase.firestore();
const auth = firebase.auth();

// FIREBASE COLLECTION NAMES
const STUDENTS_COLLECTION = "students";
const ATTENDANCE_COLLECTION = "attendanceRecords";
const GRADING_ITEM_COLLECTION = "gradingItems";
const GRADES_COLLECTION = "grades";
const USERS_COLLECTION = "users"; 

// --- GLOBAL MULTI-TENANCY & RBAC VARIABLES ---
let userSchoolId = null; 
let userRole = null;     

// --- CONFIGURABLE SYSTEM VARIABLES ---
const SCHOOL_CLASSES = [
    "K1", "K2", "P1", "P2", "P3", "P4", "P5", "P6", 
    "JHS1", "JHS2", "JHS3", "SHS1", "SHS2", "SHS3"
];

// --- 1. DOM Element References ---

// Main Sections
const authSectionEl = document.getElementById('auth-section'); 
const appSectionEl = document.getElementById('app-section');    

// General/Auth
const authStatusEl = document.getElementById('auth-status');
const loginEmailEl = document.getElementById('loginEmail');
const loginPasswordEl = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userNameEl = document.getElementById('userName');

// App Modules
const tabBtns = document.querySelectorAll('.tab-btn');
const moduleSections = document.querySelectorAll('.module-section'); 

// Module specific references (Included for completeness, assuming they exist in the HTML)
const attClassEl = document.getElementById('attClass');
const attDateEl = document.getElementById('attDate');
const loadStudentsBtn = document.getElementById('loadStudentsBtn');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const attendanceTableBody = document.getElementById('attendanceTableBody');
const gradeSubjectEl = document.getElementById('gradeSubject');
const gradeItemNameEl = document.getElementById('gradeItemName');
const totalMarksEl = document.getElementById('totalMarks');
const addGradeItemBtn = document.getElementById('addGradeItemBtn');
const gradingItemSelectEl = document.getElementById('gradingItemSelect');
const gradeClassEl = document.getElementById('gradeClass');
const loadGradeStudentsBtn = document.getElementById('loadGradeStudentsBtn');
const gradesTableBody = document.getElementById('gradesTableBody');
const saveGradesBtn = document.getElementById('saveGradesBtn');
const lookupNameEl = document.getElementById('lookupName');
const lookupClassEl = document.getElementById('lookupClass');
const lookupBtn = document.getElementById('lookupBtn');
const studentNameDisplayEl = document.getElementById('studentNameDisplay');
const attendanceSummaryEl = document.getElementById('attendanceSummary');
const gradesSummaryBodyEl = document.getElementById('gradesSummaryBodyEl');
const totalTeachersEl = document.getElementById('totalTeachers');
const totalAttendanceDaysEl = document.getElementById('totalAttendanceDays');
const avgAttendanceRateEl = document.getElementById('avgAttendanceRate');
const recentGradesBodyEl = document.getElementById('recentGradesBodyEl');

// Student Management
const newStudentNameEl = document.getElementById('newStudentName');
const newStudentClassEl = document.getElementById('newStudentClass');
const addStudentBtn = document.getElementById('addStudentBtn');
const studentListBodyEl = document.getElementById('studentListBodyEl');
const adminStudentClassSelectEl = document.getElementById('adminStudentClassSelect');


// --- 2. CORE UTILITY FUNCTIONS ---

function updateStatus(message, type = 'info') {
    if (authStatusEl) { 
        authStatusEl.textContent = message;
        const colors = {
            info: { bg: '#e0f7fa', text: '#01579b' },
            success: { bg: '#d4edda', text: '#155724' },
            error: { bg: '#f8d7da', text: '#721c24' }
        };
        authStatusEl.style.background = colors[type].bg;
        authStatusEl.style.color = colors[type].text;
    }
}

function populateClassDropdowns() {
    const classSelects = [attClassEl, gradeClassEl, lookupClassEl, newStudentClassEl, adminStudentClassSelectEl].filter(el => el != null);
    
    classSelects.forEach(selectEl => {
        selectEl.innerHTML = ''; 
        SCHOOL_CLASSES.forEach(className => {
            const option = document.createElement('option');
            option.value = className.replace(/\s/g, ''); 
            option.textContent = className;
            selectEl.appendChild(option);
        });
        if (selectEl === adminStudentClassSelectEl) {
            selectEl.value = SCHOOL_CLASSES[0].replace(/\s/g, '');
        }
    });
}

function applyRoleBasedAccess(role) {
    tabBtns.forEach(btn => btn.classList.add('hidden'));

    const modulePermissions = {
        'attendance': ['School_Admin', 'Teacher'],
        'grade': ['School_Admin', 'Teacher'],
        'student-management': ['School_Admin', 'Teacher'],
        'parent-portal': ['School_Admin', 'Teacher', 'Parent'], 
        'headmaster-dashboard': ['School_Admin']
    };

    tabBtns.forEach(btn => {
        const moduleId = btn.getAttribute('data-module');
        const allowedRoles = modulePermissions[moduleId] || [];

        if (allowedRoles.includes(role)) {
            btn.classList.remove('hidden');
        } else {
            const section = document.getElementById(moduleId);
            if (section) section.classList.add('hidden');
        }
    });
}

function switchModule(moduleId) {
    if (!moduleSections || moduleSections.length === 0) return; 

    moduleSections.forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(moduleId);
    if (targetSection) targetSection.classList.add('active');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn && btn.getAttribute('data-module') === moduleId) {
            btn.classList.add('active');
        }
    });
    
    if (moduleId === 'grade') {
        loadGradingItems();
    } else if (moduleId === 'headmaster-dashboard') {
        loadDashboardSummary(); 
    } else if (moduleId === 'student-management') {
        if (adminStudentClassSelectEl) loadStudentsByClass(adminStudentClassSelectEl.value);
    }
    
    updateStatus(`Module ready: ${moduleId}.`);
}

function attachGlobalListeners() {
    tabBtns.forEach(btn => {
        if (!btn.classList.contains('hidden')) {
            btn.addEventListener('click', () => switchModule(btn.getAttribute('data-module')));
        }
    });

    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // Module specific listeners (Add checks for existence before attaching)
    if (loadStudentsBtn) loadStudentsBtn.addEventListener('click', handleLoadStudents);
    if (saveAttendanceBtn) saveAttendanceBtn.addEventListener('click', handleSaveAttendance);
    if (addGradeItemBtn) addGradeItemBtn.addEventListener('click', handleAddGradeItem);
    if (loadGradeStudentsBtn) loadGradeStudentsBtn.addEventListener('click', handleLoadGradeStudents);
    if (saveGradesBtn) saveGradesBtn.addEventListener('click', handleSaveGrades);
    if (lookupBtn) lookupBtn.addEventListener('click', handleLookupRecords);

    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', handleAddStudent);
    }

    if (adminStudentClassSelectEl) {
        adminStudentClassSelectEl.addEventListener('change', () => loadStudentsByClass(adminStudentClassSelectEl.value));
    }
    
    // CRITICAL FIX: Ensure the login button listener is attached here after all elements are defined
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
        console.log("[DEBUG] Login button listener attached.");
    } else {
        // If this error shows, it means 'id="loginBtn"' is missing or misspelled in index.html
        console.error("[FATAL] Login button element (ID: 'loginBtn') not found. Check index.html.");
    }
}

// --- 3. AUTHENTICATION LOGIC (Updated for Multi-Tenancy & RBAC) ---

async function initializeApplicationLogic(user) {
    // 1. Fetch User Profile
    try {
        console.log(`[DEBUG] Step 1: Attempting to fetch user profile for UID: ${user.uid}`); 
        const userDoc = await db.collection(USERS_COLLECTION).doc(user.uid).get();
        
        if (!userDoc.exists) {
            console.error(`[FATAL] Step 2: User document NOT found in ${USERS_COLLECTION} for UID: ${user.uid}`); 
            alert("Account not provisioned. Please contact your school administrator.");
            handleLogout(); 
            return;
        }
        
        const userData = userDoc.data();
        userSchoolId = userData.schoolId; 
        userRole = userData.role; 
        
        if (!userSchoolId || !userRole) {
             console.error(`[FATAL] Step 3: User profile is incomplete. schoolId: ${userSchoolId}, role: ${userRole}`); 
             alert("Account profile is incomplete (missing role or school ID). Please contact administrator.");
             handleLogout(); 
             return;
        }

        console.log(`[DEBUG] Step 4: User profile loaded successfully. Role: ${userRole}, SchoolID: ${userSchoolId}`); 

        // 2. Swap Views: Hide login, Show App
        if (authSectionEl) authSectionEl.classList.add('hidden');
        if (appSectionEl) appSectionEl.classList.remove('hidden');

        // 3. Display User Info and Status
        if (userNameEl) userNameEl.textContent = `${user.email} (${userRole} | ${userSchoolId})`;
        updateStatus(`Welcome back, ${user.email}! Role: ${userRole}. School: ${userSchoolId}`, 'success');
        
        // --- RBAC SETUP ---
        populateClassDropdowns();
        applyRoleBasedAccess(userRole);
        // --- END RBAC SETUP ---

        // 4. Set up all App Event Listeners
        // NOTE: We call attachGlobalListeners on window.onload, so no need to call it here.
        
        // 5. Start on the first active module based on the role
        const firstActiveModuleButton = document.querySelector('.tab-btn:not(.hidden)');
        if (firstActiveModuleButton) {
            const firstModuleId = firstActiveModuleButton.getAttribute('data-module');
            switchModule(firstModuleId);
            
            if (firstModuleId === 'student-management' && adminStudentClassSelectEl) {
                loadStudentsByClass(adminStudentClassSelectEl.value); 
            }
        }


    } catch (error) {
        console.error("[Initialization Error]:", error); 
        updateStatus(`Fatal Initialization Error: ${error.message}`, 'error');
        handleLogout();
    }
}

function resetApplicationView() {
    userSchoolId = null;
    userRole = null;
    
    if (authSectionEl) authSectionEl.classList.remove('hidden');
    if (appSectionEl) appSectionEl.classList.add('hidden');
    updateStatus('You have been logged out. Please log in.', 'info');
}


// Primary listener that handles login/logout and initialization
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`[DEBUG] auth.onAuthStateChanged: User is logged in. UID: ${user.uid}`); 
        initializeApplicationLogic(user);
    } else {
        console.log("[DEBUG] auth.onAuthStateChanged: User is logged out."); 
        resetApplicationView();
    }
});

async function handleLogin() {
    const email = loginEmailEl.value;
    const password = loginPasswordEl.value;
    
    if (email.trim() === '' || password.trim() === '') {
        updateStatus("Error: Email and Password are required.", 'error');
        return;
    }
    
    try {
        updateStatus('Signing in...', 'info');
        console.log(`[DEBUG] Attempting Firebase Auth signIn for: ${email}`); 
        await auth.signInWithEmailAndPassword(email, password);
        // auth.onAuthStateChanged handles the rest
    } catch (error) {
        // THIS IS THE CRITICAL LINE THAT REPORTS THE AUTHENTICATION PROBLEM!
        console.error("[Login Auth Error]:", error); 
        updateStatus(`Login Error: ${error.message}`, 'error');
    }
}

function handleLogout() {
    auth.signOut();
}


// --- 4. ATTENDANCE LOGIC (Placeholders) ---
function renderAttendanceTable(students) {
    if (!attendanceTableBody) return;
    attendanceTableBody.innerHTML = ''; 
    students.forEach((student) => {
        const row = attendanceTableBody.insertRow();
        row.insertCell(0).textContent = student.name;
        const statusCell = row.insertCell(1);
        statusCell.innerHTML = `
            <select class="status-select" data-student="${student.name}">
