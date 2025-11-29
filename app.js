// app.js - Main logic for ScholarLink SMS

// --- FIREBASE CONFIGURATION & INITIALIZATION ---

// YOUR UNIQUE firebaseConfig OBJECT IS NOW PASTED HERE!
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

// Initialize Firebase using the simple method
firebase.initializeApp(firebaseConfig);

// Database and Authentication References
const db = firebase.firestore();
const auth = firebase.auth();

// FIREBASE COLLECTION NAMES
const ATTENDANCE_COLLECTION = "attendanceRecords";
const GRADING_ITEM_COLLECTION = "gradingItems";
const GRADES_COLLECTION = "grades";


// --- 1. DOM Element References ---
const authStatusEl = document.getElementById('auth-status');
const authScreenEl = document.getElementById('auth-screen');
const mainAppScreenEl = document.getElementById('main-app-screen');

// Auth/User Info
const loginEmailEl = document.getElementById('loginEmail');
const loginPasswordEl = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userNameEl = document.getElementById('userName');

// Main App Elements
const tabBtns = document.querySelectorAll('.tab-btn');
const moduleSections = document.querySelectorAll('.module-section');

// Attendance Module References
const attClassEl = document.getElementById('attClass');
const attDateEl = document.getElementById('attDate');
const loadStudentsBtn = document.getElementById('loadStudentsBtn');
const saveAttendanceBtn = document.getElementById('saveAttendanceBtn');
const attendanceTableBody = document.getElementById('attendanceTableBody');

// Gradebook Module References
const gradeSubjectEl = document.getElementById('gradeSubject');
const gradeItemNameEl = document.getElementById('gradeItemName');
const totalMarksEl = document.getElementById('totalMarks');
const addGradeItemBtn = document.getElementById('addGradeItemBtn');

const gradingItemSelectEl = document.getElementById('gradingItemSelect');
const gradeClassEl = document.getElementById('gradeClass');
const loadGradeStudentsBtn = document.getElementById('loadGradeStudentsBtn');
const gradesTableBody = document.getElementById('gradesTableBody');
const saveGradesBtn = document.getElementById('saveGradesBtn');

// Parent Portal References (NEW)
const lookupNameEl = document.getElementById('lookupName');
const lookupClassEl = document.getElementById('lookupClass');
const lookupBtn = document.getElementById('lookupBtn');
const studentNameDisplayEl = document.getElementById('studentNameDisplay');
const attendanceSummaryEl = document.getElementById('attendanceSummary');
const gradesSummaryBodyEl = document.getElementById('gradesSummaryBody');


// --- 2. CORE UTILITY FUNCTIONS ---

function updateStatus(message, type = 'info') {
    authStatusEl.textContent = message;
    const colors = {
        info: { bg: '#e0f7fa', text: '#01579b' },
        success: { bg: '#d4edda', text: '#155724' },
        error: { bg: '#f8d7da', text: '#721c24' }
    };
    authStatusEl.style.background = colors[type].bg;
    authStatusEl.style.color = colors[type].text;
}

function switchModule(moduleId) {
    moduleSections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(moduleId).classList.add('active');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-module') === moduleId) {
            btn.classList.add('active');
        }
    });
    
    if (moduleId === 'grade') {
        loadGradingItems();
    }
    
    updateStatus(`Module ready: ${moduleId}.`);
}

// --- 3. AUTHENTICATION LOGIC (UNCHANGED) ---

auth.onAuthStateChanged(user => {
    if (user) {
        authScreenEl.classList.remove('active');
        mainAppScreenEl.classList.add('active');
        userNameEl.textContent = user.email;
        updateStatus(`Welcome back, ${user.email}!`, 'success');
        switchModule('attendance');
    } else {
        authScreenEl.classList.add('active');
        mainAppScreenEl.classList.remove('active');
        updateStatus('Please sign in to access the system.', 'info');
    }
});


async function handleRegister() {
    const email = loginEmailEl.value;
    const password = loginPasswordEl.value;
    // ... (registration logic unchanged)
}

async function handleLogin() {
    const email = loginEmailEl.value;
    const password = loginPasswordEl.value;
    // ... (login logic unchanged)
}

function handleLogout() {
    auth.signOut();
    updateStatus('You have been signed out.', 'info');
}


// --- 4. ATTENDANCE LOGIC (UNCHANGED) ---

const DUMMY_STUDENTS = [
    "Kwame Nkrumah", "Yaa Asantewaa", "John Kufuor", "Ama Ghana", "Kofi Annan"
];

function renderAttendanceTable(students) {
    // ... (render attendance table logic unchanged)
}

function handleLoadStudents() {
    // ... (load student logic unchanged)
}

async function handleSaveAttendance() {
    // ... (save attendance logic unchanged)
}


// --- 5. GRADEBOOK LOGIC (FIXED) ---

async function handleAddGradeItem() {
    // ... (add grade item logic unchanged)
}


async function loadGradingItems() {
    if (!auth.currentUser) return;
    
    try {
        const snapshot = await db.collection(GRADING_ITEM_COLLECTION).get();
        
        gradingItemSelectEl.innerHTML = '<option value="">-- Select Test/Assignment --</option>';
        
        snapshot.forEach(doc => {
            const item = doc.data();
            // Client-side filter to only show items created by the current user (FIX)
            if (item.createdBy === auth.currentUser.email) { 
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = `${item.subject}: ${item.name} (Max: ${item.totalMarks})`;
                option.dataset.max = item.totalMarks;
                gradingItemSelectEl.appendChild(option);
            }
        });
        
        updateStatus(`Loaded ${gradingItemSelectEl.options.length - 1} grading items.`);
    } catch (error) {
        updateStatus("Error loading grading items.", 'error');
    }
}

function handleLoadGradeStudents() {
    // ... (load grade students logic unchanged)
}


async function handleSaveGrades() {
    // ... (save grades logic unchanged)
}

// --- 6. PARENT PORTAL LOGIC (NEW) ---

async function handleLookupRecords() {
    if (!auth.currentUser) {
        updateStatus("Error: Please log in to view data.", 'error');
        return;
    }
    
    const lookupName = lookupNameEl.value.trim();
    const lookupClass = lookupClassEl.value;

    if (!lookupName) {
        updateStatus("Error: Please enter the student's full name.", 'error');
        return;
    }

    // Clear previous results
    studentNameDisplayEl.textContent = lookupName;
    attendanceSummaryEl.innerHTML = '';
    gradesSummaryBodyEl.innerHTML = '';
    updateStatus(`Searching for records for ${lookupName} in ${lookupClass}...`, 'info');

    // --- A. Fetch Attendance Records ---
    try {
        const attendanceSnapshot = await db.collection(ATTENDANCE_COLLECTION)
            .where('class', '==', lookupClass)
            .get();

        let totalAttendanceDays = 0;
        let presentCount = 0;
        let absentCount = 0;

        attendanceSnapshot.forEach(doc => {
            const record = doc.data().records.find(r => r.name === lookupName);
            if (record) {
                totalAttendanceDays++;
                if (record.status === 'Present') {
                    presentCount++;
                } else if (record.status === 'Absent') {
                    absentCount++;
                }
            }
        });

        const presentPct = totalAttendanceDays > 0 ? ((presentCount / totalAttendanceDays) * 100).toFixed(1) : '0';
        
        attendanceSummaryEl.innerHTML = `
            <li>Total Days Marked: <strong>${totalAttendanceDays}</strong></li>
            <li>Present: <strong>${presentCount}</strong> (${presentPct}%)</li>
            <li>Absent: <strong>${absentCount}</strong></li>
            <li style="color: grey;">(Attendance data is aggregated across all recorded days in the class.)</li>
        `;
        
    } catch (error) {
        updateStatus(`Error retrieving attendance: ${error.message}`, 'error');
    }


    // --- B. Fetch Grades Records ---
    try {
        const gradesSnapshot = await db.collection(GRADES_COLLECTION)
            .where('class', '==', lookupClass)
            .get();

        if (gradesSnapshot.empty) {
            gradesSummaryBodyEl.innerHTML = `<tr><td colspan="3">No grades found for this class.</td></tr>`;
        }

        gradesSnapshot.forEach(doc => {
            const gradeRecord = doc.data().grades.find(g => g.student === lookupName);
            if (gradeRecord) {
                const row = gradesSummaryBodyEl.insertRow();
                row.insertCell(0).textContent = doc.data().gradingItemName.split(':')[1].trim(); // Get test name only
                row.insertCell(1).textContent = gradeRecord.score;
                row.insertCell(2).textContent = gradeRecord.max;
            }
        });

        if (gradesSummaryBodyEl.children.length === 0) {
             gradesSummaryBodyEl.innerHTML = `<tr><td colspan="3">Student not found in any saved grade entries.</td></tr>`;
        }
        
    } catch (error) {
         updateStatus(`Error retrieving grades: ${error.message}`, 'error');
    }
    
    updateStatus(`Records successfully loaded for ${lookupName}.`, 'success');
}


// --- 7. EVENT LISTENERS & INITIAL SETUP ---

// Authentication Buttons
registerBtn.addEventListener('click', handleRegister);
loginBtn.addEventListener('click', handleLogin);
logoutBtn.addEventListener('click', handleLogout);

// Module Tabs
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.getAttribute('data-module')));
});

// Attendance Module
loadStudentsBtn.addEventListener('click', handleLoadStudents);
saveAttendanceBtn.addEventListener('click', handleSaveAttendance);

// Gradebook Module
addGradeItemBtn.addEventListener('click', handleAddGradeItem);
loadGradeStudentsBtn.addEventListener('click', handleLoadGradeStudents);
saveGradesBtn.addEventListener('click', handleSaveGrades);

// Parent Portal Module (NEW)
lookupBtn.addEventListener('click', handleLookupRecords);
