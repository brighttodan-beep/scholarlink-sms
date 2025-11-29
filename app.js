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
    // Hide all modules
    moduleSections.forEach(sec => sec.classList.remove('active'));
    // Show the selected module
    document.getElementById(moduleId).classList.add('active');

    // Update button styling
    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-module') === moduleId) {
            btn.classList.add('active');
        }
    });
    
    // Load grading items when gradebook tab is clicked
    if (moduleId === 'grade') {
        loadGradingItems();
    }
    
    updateStatus(`Module ready: ${moduleId}.`);
}

// --- 3. AUTHENTICATION LOGIC ---

// Handles screen switching based on login status
auth.onAuthStateChanged(user => {
    if (user) {
        authScreenEl.classList.remove('active');
        mainAppScreenEl.classList.add('active');
        userNameEl.textContent = user.email;
        updateStatus(`Welcome back, ${user.email}!`, 'success');
        switchModule('attendance'); // Default view
    } else {
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
    } catch (error) {
        updateStatus(`Login Error: ${error.message}`, 'error');
    }
}

function handleLogout() {
    auth.signOut();
    updateStatus('You have been signed out.', 'info');
}


// --- 4. ATTENDANCE LOGIC ---

const DUMMY_STUDENTS = [
    "Kwame Nkrumah", "Yaa Asantewaa", "John Kufuor", "Ama Ghana", "Kofi Annan"
];

function renderAttendanceTable(students) {
    attendanceTableBody.innerHTML = ''; 
    students.forEach((student) => {
        const row = attendanceTableBody.insertRow();
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
    if (!auth.currentUser) {
        updateStatus("Security Error: You must be logged in to save data.", 'error');
        return;
    }

    const selectedClass = attClassEl.value;
    const selectedDate = attDateEl.value;
    const records = [];
    
    document.querySelectorAll('#attendanceTableBody tr').forEach(row => {
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
            savedBy: auth.currentUser.email,
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        updateStatus(`SUCCESS! Records saved by ${auth.currentUser.email}.`, 'success');
    } catch (error) {
        console.error("Firebase Save Error:", error);
        updateStatus(`ERROR! Failed to save to Cloud. See console.`, 'error');
    }
}


// --- 5. GRADEBOOK LOGIC (FIXED) ---

async function handleAddGradeItem() {
    if (!auth.currentUser) {
        updateStatus("Security Error: You must be logged in to add a grading item.", 'error');
        return;
    }
    
    const subject = gradeSubjectEl.value;
    const itemName = gradeItemNameEl.value.trim();
    const totalMarks = parseInt(totalMarksEl.value);

    if (itemName === '' || isNaN(totalMarks) || totalMarks <= 0) {
        updateStatus("Error: Provide a valid Item Name and Total Marks.", 'error');
        return;
    }
    
    const itemData = {
        subject: subject,
        name: itemName,
        totalMarks: totalMarks,
        createdBy: auth.currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    updateStatus(`Adding new grading item: ${itemName}...`, 'info');
    
    try {
        const docId = `${auth.currentUser.uid}_${subject}_${itemName.replace(/\s/g, '_')}`;
        await db.collection(GRADING_ITEM_COLLECTION).doc(docId).set(itemData);
        
        updateStatus(`SUCCESS! Grading item '${itemName}' added.`, 'success');
        
        gradeItemNameEl.value = '';
        totalMarksEl.value = '';
        loadGradingItems(); 
    } catch (error) {
        console.error("Firebase Add Item Error:", error);
        updateStatus(`ERROR adding item: ${error.message}`, 'error');
    }
}


async function loadGradingItems() {
    if (!auth.currentUser) return;
    
    try {
        // FIX: Removed the .where() filter to bypass the index issue and ensure loading works.
        const snapshot = await db.collection(GRADING_ITEM_COLLECTION).get();
        
        gradingItemSelectEl.innerHTML = '<option value="">-- Select Test/Assignment --</option>';
        
        snapshot.forEach(doc => {
            const item = doc.data();
            const option = document.createElement('option');
            // Filter here in the code, ensuring only items created by the current user are shown (Client-side filter)
            if (item.createdBy === auth.currentUser.email) { 
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
     if (!auth.currentUser) {
        updateStatus("Error: Please log in to load data.", 'error');
        return;
    }
    
    const selectedItem = gradingItemSelectEl.options[gradingItemSelectEl.selectedIndex];
    
    if (!selectedItem || !selectedItem.value) {
        updateStatus("Error: Please create or select a grading item first.", 'error');
        return;
    }
    
    const totalMarks = selectedItem.dataset.max;
    const selectedClass = gradeClassEl.value;

    gradesTableBody.innerHTML = '';
    DUMMY_STUDENTS.forEach((student) => {
        const row = gradesTableBody.insertRow();
        row.insertCell(0).textContent = student;
        
        const inputCell = row.insertCell(1);
        inputCell.innerHTML = `
            <input type="number" class="score-input" data-student="${student}" min="0" max="${totalMarks}" placeholder="Score / ${totalMarks}">
        `;
    });
    
    saveGradesBtn.disabled = DUMMY_STUDENTS.length === 0;
    updateStatus(`Students loaded for ${selectedItem.textContent} (${selectedClass}). Enter scores.`);
}


async function handleSaveGrades() {
    if (!auth.currentUser) {
        updateStatus("Security Error: You must be logged in to save grades.", 'error');
        return;
    }

    const selectedItem = gradingItemSelectEl.options[gradingItemSelectEl.selectedIndex];
    
    if (!selectedItem || !selectedItem.value) {
         updateStatus("Error: No valid grading item selected.", 'error');
         return;
    }
    
    const selectedItemId = selectedItem.value;
    const selectedClass = gradeClassEl.value;
    const totalMarks = selectedItem.dataset.max;

    const gradeRecords = [];
    
    document.querySelectorAll('#gradesTableBody tr').forEach(row => {
        const studentName = row.cells[0].textContent;
        const scoreInput = row.cells[1].querySelector('.score-input');
        const score = parseInt(scoreInput.value);

        if (!isNaN(score) && scoreInput.value.trim() !== '' && score >= 0 && score <= totalMarks) {
             gradeRecords.push({ 
                student: studentName, 
                score: score, 
                max: totalMarks 
            });
        }
    });

    if (gradeRecords.length === 0) {
        updateStatus("Nothing to save.", 'error');
        return;
    }
    
    updateStatus('Saving student grades to the Cloud...', 'info');

    try {
        const docId = `${selectedItemId}_${selectedClass}`; 
        
        await db.collection(GRADES_COLLECTION).doc(docId).set({
            gradingItemId: selectedItemId,
            gradingItemName: selectedItem.textContent,
            class: selectedClass,
            totalMarks: totalMarks,
            grades: gradeRecords,
            savedBy: auth.currentUser.email,
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        updateStatus(`SUCCESS! ${gradeRecords.length} grades saved for ${selectedClass}.`, 'success');
    } catch (error) {
        console.error("Firebase Grade Save Error:", error);
        updateStatus(`ERROR! Failed to save grades: ${error.message}`, 'error');
    }
}


// --- 6. EVENT LISTENERS & INITIAL SETUP ---

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
