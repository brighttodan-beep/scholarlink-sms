// app.js - Main logic for ScholarLink SMS

// --- FIREBASE CONFIGURATION & INITIALIZATION ---

// YOUR UNIQUE firebaseConfig OBJECT IS NOW PASTE HERE!
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
const ATTENDANCE_COLLECTION = "attendanceRecords";

// --- 1. DOM Element References ---
const authStatusEl = document.getElementById('auth-status'); // Status bar for login
const authScreenEl = document.getElementById('auth-screen'); // Login form container
const mainAppScreenEl = document.getElementById('main-app-screen'); // Main app container

// Login/Register Inputs
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
const tableBody = document.getElementById('attendanceTableBody');


// --- 2. CORE UTILITY FUNCTIONS ---

function updateStatus(message, type = 'info') {
    authStatusEl.textContent = message; // Use the new auth status bar
    const colors = {
        info: { bg: '#e0f7fa', text: '#01579b' },
        success: { bg: '#d4edda', text: '#155724' },
        error: { bg: '#f8d7da', text: '#721c24' }
    };
    authStatusEl.style.background = colors[type].bg;
    authStatusEl.style.color = colors[type].text;
}

function switchModule(moduleId) {
    // Logic to switch between Attendance, Gradebook, etc.
    moduleSections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(moduleId).classList.add('active');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-module') === moduleId) {
            btn.classList.add('active');
        }
    });
    updateStatus(`Module ready: ${moduleId}.`);
}

// --- 3. AUTHENTICATION LOGIC ---

// This function runs every time the user's login status changes (refresh, login, logout)
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        authScreenEl.classList.remove('active');
        mainAppScreenEl.classList.add('active');
        
        userNameEl.textContent = user.email;
        updateStatus(`Welcome back, ${user.email}!`, 'success');
        switchModule('attendance'); // Show the app
    } else {
        // User is logged out
        authScreenEl.classList.add('active');
        mainAppScreenEl.classList.remove('active');
        updateStatus('Please sign in to access the system.', 'info');
    }
});


async function handleRegister() {
    const email = loginEmailEl.value;
    const password = loginPasswordEl.value;
    
    if (email.trim() === '' || password.trim() === '') {
        updateStatus("Error: Email and Password are required.", 'error');
        return;
    }

    try {
        updateStatus('Creating new account...', 'info');
        await auth.createUserWithEmailAndPassword(email, password);
        
        // Firebase automatically logs the user in upon successful creation
        // The onAuthStateChanged function above handles the screen switch
    } catch (error) {
        updateStatus(`Registration Error: ${error.message}`, 'error');
    }
}

async function handleLogin() {
    const email = loginEmailEl.value;
    const password = loginPasswordEl.value;
    
    if (email.trim() === '' || password.trim() === '') {
        updateStatus("Error: Email and Password are required.", 'error');
        return;
    }
    
    try {
        updateStatus('Signing in...', 'info');
        await auth.signInWithEmailAndPassword(email, password);
        // The onAuthStateChanged function handles the screen switch
    } catch (error) {
        updateStatus(`Login Error: ${error.message}`, 'error');
    }
}

function handleLogout() {
    auth.signOut();
    updateStatus('You have been signed out.', 'info');
}


// --- 4. ATTENDANCE LOGIC (Protected by Auth) ---

const DUMMY_STUDENTS = [
    "Kwame Nkrumah", "Yaa Asantewaa", "John Kufuor", "Ama Ghana", "Kofi Annan"
];

function renderAttendanceTable(students) {
    tableBody.innerHTML = ''; 
    students.forEach((student) => {
        const row = tableBody.insertRow();
        row.insertCell(0).textContent = student;
        const statusCell = row.insertCell(1);
        statusCell.innerHTML = `
            <select class="status-select" data-student="${student}">
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
            </select>
        `;
    });
    saveAttendanceBtn.disabled = students.length === 0;
}


function handleLoadStudents() {
    // Only loads students if a user is logged in
    if (!auth.currentUser) {
        updateStatus("Error: Please log in to load data.", 'error');
        return;
    }
    const selectedClass = attClassEl.value;
    const selectedDate = attDateEl.value;

    if (!selectedDate) {
        updateStatus("Error: Please select a date first.", 'error');
        return;
    }

    updateStatus(`Loading students for ${selectedClass} on ${selectedDate}...`);
    renderAttendanceTable(DUMMY_STUDENTS);
    updateStatus(`5 students loaded for ${selectedClass}. Mark attendance.`);
}

async function handleSaveAttendance() {
    // Check if the user is authenticated before saving to Firestore
    if (!auth.currentUser) {
        updateStatus("Security Error: You must be logged in to save data.", 'error');
        return;
    }

    const selectedClass = attClassEl.value;
    const selectedDate = attDateEl.value;
    const records = [];
    
    // Logic to gather records
    tableBody.querySelectorAll('tr').forEach(row => {
        const name = row.cells[0].textContent;
        const status = row.cells[1].querySelector('.status-select').value;
        records.push({ name, status });
    });
    
    if (records.length === 0) {
        updateStatus("Nothing to save.", 'error');
        return;
    }

    updateStatus('Saving attendance records to the Cloud...', 'info');
    
    try {
        const docId = `${selectedClass}_${selectedDate}`;
        
        await db.collection(ATTENDANCE_COLLECTION).doc(docId).set({
            class: selectedClass,
            date: selectedDate,
            records: records,
            savedBy: auth.currentUser.email, // Add the user's email for auditing
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        updateStatus(`SUCCESS! Records saved by ${auth.currentUser.email}.`, 'success');
    } catch (error) {
        console.error("Firebase Save Error:", error);
        updateStatus(`ERROR! Failed to save to Cloud. See console.`, 'error');
    }
}


// --- 5. EVENT LISTENERS & INITIAL SETUP ---

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
