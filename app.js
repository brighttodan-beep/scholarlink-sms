// main.js - Main logic for ScholarLink SMS (now supporting Multi-Page Architecture)

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
const STUDENTS_COLLECTION = "students";
const ATTENDANCE_COLLECTION = "attendanceRecords";
const GRADING_ITEM_COLLECTION = "gradingItems";
const GRADES_COLLECTION = "grades";


// --- CONFIGURABLE SYSTEM VARIABLES ---
const SCHOOL_CLASSES = [
    "K1", "K2", "P1", "P2", "P3", "P4", "P5", "P6", 
    "JHS1", "JHS2", "JHS3", "SHS1", "SHS2", "SHS3"
];

// --- 1. DOM Element References ---
const authStatusEl = document.getElementById('auth-status');

// Auth/User Info (only needed on index.html)
const loginEmailEl = document.getElementById('loginEmail');
const loginPasswordEl = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');

// Main App Elements (only needed on app.html)
const logoutBtn = document.getElementById('logoutBtn');
const userNameEl = document.getElementById('userName');
const tabBtns = document.querySelectorAll('.tab-btn');
const moduleSections = document.querySelectorAll('.module-section'); // Used for module switching within app.html

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

// Parent Portal References
const lookupNameEl = document.getElementById('lookupName');
const lookupClassEl = document.getElementById('lookupClass');
const lookupBtn = document.getElementById('lookupBtn');
const studentNameDisplayEl = document.getElementById('studentNameDisplay');
const attendanceSummaryEl = document.getElementById('attendanceSummary');
const gradesSummaryBodyEl = document.getElementById('gradesSummaryBody');

// Headmaster Dashboard References
const totalTeachersEl = document.getElementById('totalTeachers');
const totalAttendanceDaysEl = document.getElementById('totalAttendanceDays');
const avgAttendanceRateEl = document.getElementById('avgAttendanceRate');
const recentGradesBodyEl = document.getElementById('recentGradesBody');
const newStudentNameEl = document.getElementById('newStudentName');
const newStudentClassEl = document.getElementById('newStudentClass');
const addStudentBtn = document.getElementById('addStudentBtn');
const studentListBodyEl = document.getElementById('studentListBody');


// --- 2. CORE UTILITY FUNCTIONS ---

function updateStatus(message, type = 'info') {
    if (authStatusEl) { // Check if the status element exists on this page
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
    // Collect all class dropdown elements that exist on the current page
    const classSelects = [attClassEl, gradeClassEl, lookupClassEl, newStudentClassEl].filter(el => el != null);
    
    classSelects.forEach(selectEl => {
        selectEl.innerHTML = ''; // Clear existing options
        SCHOOL_CLASSES.forEach(className => {
            const option = document.createElement('option');
            option.value = className.replace(/\s/g, ''); 
            option.textContent = className;
            selectEl.appendChild(option);
        });
    });
}

function switchModule(moduleId) {
    // This logic only runs on app.html
    moduleSections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(moduleId).classList.add('active');

    tabBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-module') === moduleId) {
            btn.classList.add('active');
        }
    });
    
    // Auto-scroll is no longer needed since we are using separate pages, 
    // but the SPA logic for module switching is kept for the app.html view
    
    if (moduleId === 'grade') {
        loadGradingItems();
    } else if (moduleId === 'headmaster-dashboard') {
        loadDashboardSummary(); 
        loadStudentsByClass();
    }
    
    updateStatus(`Module ready: ${moduleId}.`);
}

// --- 3. AUTHENTICATION LOGIC ---

auth.onAuthStateChanged(user => {
    // 1. If user is logged in:
    if (user) {
        // If the user is on the login page (index.html), redirect to the app page.
        if (document.title.includes("Login")) {
            window.location.href = 'app.html';
        } 
        // If the user is on the app page (app.html), populate user info.
        else if (document.title.includes("Application")) {
            userNameEl.textContent = user.email;
            updateStatus(`Welcome back, ${user.email}!`, 'success');
        }
    } 
    // 2. If user is NOT logged in:
    else {
        // If the user is on the app page (app.html), redirect to the login page.
        if (document.title.includes("Application")) {
            window.location.href = 'index.html';
        }
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
        // auth.onAuthStateChanged will handle the redirection on success
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
        // auth.onAuthStateChanged will handle the redirection on success
    } catch (error) {
        updateStatus(`Login Error: ${error.message}`, 'error');
    }
}

function handleLogout() {
    auth.signOut();
    // auth.onAuthStateChanged will handle the redirection back to index.html
}


// --- 4. ATTENDANCE LOGIC ---

function renderAttendanceTable(students) {
    attendanceTableBody.innerHTML = ''; 
    students.forEach((student) => {
        const row = attendanceTableBody.insertRow();
        row.insertCell(0).textContent = student.name;
        const statusCell = row.insertCell(1);
        statusCell.innerHTML = `
            <select class="status-select" data-student="${student.name}">
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
            </select>
        `;
    });
    saveAttendanceBtn.disabled = students.length === 0;
}


async function handleLoadStudents() {
    if (!auth.currentUser) return;
    const selectedClass = attClassEl.value;
    const selectedDate = attDateEl.value;

    if (!selectedDate) {
        updateStatus("Error: Please select a date first.", 'error');
        return;
    }

    updateStatus(`Loading students for ${selectedClass} on ${selectedDate}...`);
    
    try {
        const snapshot = await db.collection(STUDENTS_COLLECTION)
            .where('class', '==', selectedClass)
            .orderBy('name', 'asc')
            .get();
            
        const students = snapshot.docs.map(doc => doc.data());
        
        if (students.length === 0) {
            updateStatus(`No students found for ${selectedClass}. Please add students via the Dashboard.`, 'error');
            attendanceTableBody.innerHTML = '<tr><td colspan="2">No students found.</td></tr>';
            saveAttendanceBtn.disabled = true;
            return;
        }

        renderAttendanceTable(students);
        updateStatus(`${students.length} students loaded for ${selectedClass}. Mark attendance.`);

    } catch (error) {
        updateStatus(`Error loading students: ${error.message}`, 'error');
    }
}

async function handleSaveAttendance() {
    if (!auth.currentUser) return;

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


// --- 5. GRADEBOOK LOGIC ---

async function handleAddGradeItem() {
    if (!auth.currentUser) return;
    
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
        const snapshot = await db.collection(GRADING_ITEM_COLLECTION).get();
        
        gradingItemSelectEl.innerHTML = '<option value="">-- Select Test/Assignment --</option>';
        
        snapshot.forEach(doc => {
            const item = doc.data();
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

async function handleLoadGradeStudents() {
     if (!auth.currentUser) return;
    
    const selectedItem = gradingItemSelectEl.options[gradingItemSelectEl.selectedIndex];
    
    if (!selectedItem || !selectedItem.value) {
        updateStatus("Error: Please create or select a grading item first.", 'error');
        return;
    }
    
    const totalMarks = selectedItem.dataset.max;
    const selectedClass = gradeClassEl.value;

    gradesTableBody.innerHTML = '';
    
    try {
        const snapshot = await db.collection(STUDENTS_COLLECTION)
            .where('class', '==', selectedClass)
            .orderBy('name', 'asc')
            .get();
            
        const students = snapshot.docs.map(doc => doc.data());
        
        if (students.length === 0) {
            updateStatus(`No students found for ${selectedClass}.`, 'error');
            gradesTableBody.innerHTML = '<tr><td colspan="2">No students found.</td></tr>';
            saveGradesBtn.disabled = true;
            return;
        }
        
        students.forEach((student) => {
            const row = gradesTableBody.insertRow();
            row.insertCell(0).textContent = student.name;
            
            const inputCell = row.insertCell(1);
            inputCell.innerHTML = `
                <input type="number" class="score-input" data-student="${student.name}" min="0" max="${totalMarks}" placeholder="Score / ${totalMarks}">
            `;
        });

        saveGradesBtn.disabled = students.length === 0;
        updateStatus(`Students loaded for ${selectedItem.textContent} (${selectedClass}). Enter scores.`);
        
    } catch (error) {
        updateStatus(`Error loading students for grading: ${error.message}`, 'error');
    }
}


async function handleSaveGrades() {
    if (!auth.currentUser) return;

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


// --- 6. PARENT PORTAL LOGIC ---

async function handleLookupRecords() {
    if (!auth.currentUser) return;
    
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
                row.insertCell(0).textContent = doc.data().gradingItemName.split(':')[1].trim();
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


// --- 7. HEADMASTER DASHBOARD LOGIC (Includes Student Management) ---

async function handleAddStudent() {
    if (!auth.currentUser) return;
    
    const name = newStudentNameEl.value.trim();
    const classValue = newStudentClassEl.value;

    if (name === '' || classValue === '') {
        return updateStatus("Error: Student Name and Class are required.", 'error');
    }
    
    updateStatus(`Adding student ${name} to ${classValue}...`, 'info');
    
    try {
        await db.collection(STUDENTS_COLLECTION).add({
            name: name,
            class: classValue,
            addedBy: auth.currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        updateStatus(`SUCCESS! Student ${name} added to ${classValue}.`, 'success');
        newStudentNameEl.value = ''; // Clear input
        loadStudentsByClass(classValue); // Refresh list
    } catch (error) {
        updateStatus(`ERROR adding student: ${error.message}`, 'error');
    }
}

async function loadStudentsByClass(selectedClass = newStudentClassEl.value) {
    if (!auth.currentUser) return;
    
    try {
        const snapshot = await db.collection(STUDENTS_COLLECTION)
            .where('class', '==', selectedClass)
            .orderBy('name', 'asc')
            .get();
        
        studentListBodyEl.innerHTML = '';
        if (snapshot.empty) {
            studentListBodyEl.innerHTML = `<tr><td colspan="2">No students registered in ${selectedClass}.</td></tr>`;
        } else {
            snapshot.forEach(doc => {
                const student = doc.data();
                const row = studentListBodyEl.insertRow();
                row.insertCell(0).textContent = student.name;
                row.insertCell(1).textContent = student.class;
            });
        }
    } catch (error) {
        console.error("Student List Load Error:", error);
    }
}


async function loadDashboardSummary() {
    if (!auth.currentUser) return;
    updateStatus('Loading School Dashboard Summary...', 'info');

    try {
        // A. Teachers Count (Placeholder/Estimate from Auth)
        totalTeachersEl.textContent = '2+ (Based on current log-ins)';

        // B. Total Attendance Summary
        const attendanceSnapshot = await db.collection(ATTENDANCE_COLLECTION).get();
        let totalDays = attendanceSnapshot.docs.length;
        let totalStudentsMarked = 0;
        let totalPresent = 0;
        
        attendanceSnapshot.forEach(doc => {
            const records = doc.data().records;
            totalStudentsMarked += records.length;
            totalPresent += records.filter(r => r.status === 'Present').length;
        });

        const avgRate = totalStudentsMarked > 0 ? ((totalPresent / totalStudentsMarked) * 100).toFixed(1) : '0.0';

        totalAttendanceDaysEl.textContent = totalDays;
        avgAttendanceRateEl.textContent = `${avgRate}%`;


        // C. Recent Grades (Last 5 Entries)
        const gradesSnapshot = await db.collection(GRADES_COLLECTION)
            .orderBy('savedAt', 'desc')
            .limit(5)
            .get();

        recentGradesBodyEl.innerHTML = '';
        if (gradesSnapshot.empty) {
            recentGradesBodyEl.innerHTML = '<tr><td colspan="4">No grades saved yet.</td></tr>';
        } else {
            gradesSnapshot.forEach(doc => {
                const data = doc.data();
                const row = recentGradesBodyEl.insertRow();
                row.insertCell(0).textContent = data.gradingItemName.split(':')[1].trim();
                row.insertCell(1).textContent = data.class;
                row.insertCell(2).textContent = data.grades.length;
                row.insertCell(3).textContent = data.savedBy.split('@')[0];
            });
        }
        
        updateStatus('Dashboard loaded successfully!', 'success');

    } catch (error) {
        console.error("Dashboard Load Error:", error);
        updateStatus(`ERROR loading dashboard: ${error.message}`, 'error');
    }
}


// --- 8. EVENT LISTENERS & INITIAL SETUP ---

// Check which page we are on to attach correct listeners
if (document.title.includes("Login")) {
    // Authentication Buttons
    registerBtn.addEventListener('click', handleRegister);
    loginBtn.addEventListener('click', handleLogin);

} else if (document.title.includes("Application")) {
    // Module Tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => switchModule(btn.getAttribute('data-module')));
    });

    // Logout Button
    logoutBtn.addEventListener('click', handleLogout);

    // Attendance Module
    loadStudentsBtn.addEventListener('click', handleLoadStudents);
    saveAttendanceBtn.addEventListener('click', handleSaveAttendance);

    // Gradebook Module
    addGradeItemBtn.addEventListener('click', handleAddGradeItem);
    loadGradeStudentsBtn.addEventListener('click', handleLoadGradeStudents);
    saveGradesBtn.addEventListener('click', handleSaveGrades);

    // Parent Portal Module
    lookupBtn.addEventListener('click', handleLookupRecords);

    // Headmaster Dashboard Management
    addStudentBtn.addEventListener('click', handleAddStudent);
    newStudentClassEl.addEventListener('change', loadStudentsByClass);

    // Call setup functions (Populates all class dropdowns on app.html load)
    populateClassDropdowns();
    // Start on the Attendance Module on load
    switchModule('attendance');
}

