// main.js - FINAL SINGLE-PAGE APPLICATION (SPA) VERSION.
// All logic consolidated into index.html, using show/hide for authentication flow.

// --- FIREBASE CONFIGURATION & INITIALIZATION ---

// REPLACE THIS OBJECT WITH YOUR ACTUAL FIREBASE CONFIGURATION!
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
firebase.initializeApp(firebaseConfig);

// Database and Authentication References
const db = firebase.firestore();
const auth = firebase.auth();

// FIREBASE COLLECTION NAMES
const STUDENTS_COLLECTION = "students";
const ATTENDANCE_COLLECTION = "attendanceRecords";
const GRADING_ITEM_COLLECTION = "gradingItems";
const GRADES_COLLECTION = "grades";


// --- CONFIGURABLE SYSTEM VARIABLES ---
const SCHOOL_CLASSES = [
    "K1", "K2", "P1", "P2", "P3", "P4", "P5", "P6", 
    "JHS1", "JHS2", "JHS3", "SHS1", "SHS2", "SHS3"
];

// --- 1. DOM Element References (All now assumed to be in index.html) ---

// Main Sections
const authSectionEl = document.getElementById('auth-section'); // The login box container
const appSectionEl = document.getElementById('app-section');   // The main application container

// General/Auth
const authStatusEl = document.getElementById('auth-status');
const loginEmailEl = document.getElementById('loginEmail');
const loginPasswordEl = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userNameEl = document.getElementById('userName');

// App Modules
const tabBtns = document.querySelectorAll('.tab-btn');
const moduleSections = document.querySelectorAll('.module-section'); 

// (Remaining module references omitted for brevity, they remain the same)
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
const newStudentNameEl = document.getElementById('newStudentName');
const newStudentClassEl = document.getElementById('newStudentClass');
const addStudentBtn = document.getElementById('addStudentBtn');
const studentListBodyEl = document.getElementById('studentListBodyEl');


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
    // ... (Function content remains the same) ...
    const classSelects = [attClassEl, gradeClassEl, lookupClassEl, newStudentClassEl].filter(el => el != null);
    
    classSelects.forEach(selectEl => {
        selectEl.innerHTML = ''; 
        SCHOOL_CLASSES.forEach(className => {
            const option = document.createElement('option');
            option.value = className.replace(/\s/g, ''); 
            option.textContent = className;
            selectEl.appendChild(option);
        });
    });
}

function switchModule(moduleId) {
    // ... (Function content remains the same) ...
    if (!moduleSections || moduleSections.length === 0) return; 

    moduleSections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(moduleId).classList.add('active');

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
        loadStudentsByClass();
    }
    
    updateStatus(`Module ready: ${moduleId}.`);
}

// --- 3. AUTHENTICATION LOGIC (Modified for SPA) ---

function initializeApplicationLogic(user) {
    // 1. Swap Views: Hide login, Show App
    authSectionEl.classList.add('hidden');
    appSectionEl.classList.remove('hidden');

    // 2. Display User Info and Status
    userNameEl.textContent = user.email;
    updateStatus(`Welcome back, ${user.email}!`, 'success');
    
    // 3. Set up all App Event Listeners (Only on initial load)
    populateClassDropdowns();

    // Module Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchModule(btn.getAttribute('data-module')));
    });

    // Logout Button
    logoutBtn.addEventListener('click', handleLogout);

    // Module specific listeners (Check if element exists before adding listener)
    if (loadStudentsBtn) loadStudentsBtn.addEventListener('click', handleLoadStudents);
    if (saveAttendanceBtn) saveAttendanceBtn.addEventListener('click', handleSaveAttendance);
    if (addGradeItemBtn) addGradeItemBtn.addEventListener('click', handleAddGradeItem);
    if (loadGradeStudentsBtn) loadGradeStudentsBtn.addEventListener('click', handleLoadGradeStudents);
    if (saveGradesBtn) saveGradesBtn.addEventListener('click', handleSaveGrades);
    if (lookupBtn) lookupBtn.addEventListener('click', handleLookupRecords);
    if (addStudentBtn) addStudentBtn.addEventListener('click', handleAddStudent);
    if (newStudentClassEl) newStudentClassEl.addEventListener('change', loadStudentsByClass);
    
    // Start on the Attendance Module on load
    switchModule('attendance');
}

function resetApplicationView() {
    // 1. Swap Views: Hide App, Show Login
    authSectionEl.classList.remove('hidden');
    appSectionEl.classList.add('hidden');
    updateStatus('You have been logged out. Please log in.', 'info');
}


// Primary listener that handles login/logout and initialization
auth.onAuthStateChanged(user => {
    if (user) {
        // Logged In: Initialize Application
        initializeApplicationLogic(user);
    } else {
        // Logged Out: Show Login/Registration
        resetApplicationView();
    }
});


async function handleRegister() {
    // ... (Function content remains the same) ...
    const email = loginEmailEl.value;
    const password = loginPasswordEl.value;
    
    if (email.trim() === '' || password.trim() === '') {
        updateStatus("Error: Email and Password are required.", 'error');
        return;
    }

    try {
        updateStatus('Creating new account...', 'info');
        await auth.createUserWithEmailAndPassword(email, password);
        // auth.onAuthStateChanged will automatically call initializeApplicationLogic
    } catch (error) {
        updateStatus(`Registration Error: ${error.message}`, 'error');
    }
}

async function handleLogin() {
    // ... (Function content remains the same) ...
    const email = loginEmailEl.value;
    const password = loginPasswordEl.value;
    
    if (email.trim() === '' || password.trim() === '') {
        updateStatus("Error: Email and Password are required.", 'error');
        return;
    }
    
    try {
        updateStatus('Signing in...', 'info');
        await auth.signInWithEmailAndPassword(email, password);
        // auth.onAuthStateChanged will automatically call initializeApplicationLogic
    } catch (error) {
        updateStatus(`Login Error: ${error.message}`, 'error');
    }
}

function handleLogout() {
    auth.signOut();
    // View is reset by auth.onAuthStateChanged
}


// --- 4. MODULE LOGIC (Functions below remain the same as previous full version) ---
/* (Remaining functions like renderAttendanceTable, handleLoadStudents, handleSaveAttendance,
   handleAddGradeItem, loadGradingItems, handleLoadGradeStudents, handleSaveGrades,
   handleLookupRecords, handleAddStudent, loadStudentsByClass, loadDashboardSummary
   are omitted here for response length, but you must paste the full content 
   from the previous corrected main.js file below this line in your GitHub file.)
*/

// --- 8. EVENT LISTENERS & INITIAL SETUP (Login Page Only) ---

// These listeners are outside of onAuthStateChanged so they are available immediately
if (loginBtn) loginBtn.addEventListener('click', handleLogin);
if (registerBtn) registerBtn.addEventListener('click', handleRegister);

// --- PASTE THE REMAINING MODULE LOGIC FUNCTIONS HERE FROM PREVIOUS MAIN.JS ---

function renderAttendanceTable(students) {
    // ... (Paste full function content) ...
}
async function handleLoadStudents() {
    // ... (Paste full function content) ...
}
async function handleSaveAttendance() {
    // ... (Paste full function content) ...
}
async function handleAddGradeItem() {
    // ... (Paste full function content) ...
}
async function loadGradingItems() {
    // ... (Paste full function content) ...
}
async function handleLoadGradeStudents() {
    // ... (Paste full function content) ...
}
async function handleSaveGrades() {
    // ... (Paste full function content) ...
}
async function handleLookupRecords() {
    // ... (Paste full function content) ...
}
async function handleAddStudent() {
    // ... (Paste full function content) ...
}
async function loadStudentsByClass(selectedClass = newStudentClassEl.value) {
    // ... (Paste full function content) ...
}
async function loadDashboardSummary() {
    // ... (Paste full function content) ...
}
