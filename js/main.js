// --- START OF COMPLETE REPLACEMENT CODE: js/main.js ---

// --- FIREBASE CONFIGURATION & INITIALIZATION ---

// !!! IMPORTANT: YOU MUST REPLACE ALL KEYS IN THIS OBJECT WITH YOUR ACTUAL FIREBASE CONFIG !!!
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE", // Example: "AIzaSyDt1nGhKNXz6bLfLILUfJ_RnfD45_VgVX0",
    authDomain: "YOUR_AUTH_DOMAIN_HERE.firebaseapp.com", // Example: "scholarlink-sms-app.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID_HERE", // Example: "scholarlink-sms-app",
    storageBucket: "YOUR_STORAGE_BUCKET_HERE.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID_HERE",
    appId: "YOUR_APP_ID_HERE",
    measurementId: "YOUR_MEASUREMENT_ID_HERE"
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
        console.error("[FATAL] Login button element (ID: 'loginBtn') not found.");
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
        attachGlobalListeners();
        
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
                <option value="Present">Present</option>
                <option value="Absent">Absent</option>
                <option value="Late">Late</option>
            </select>
        `;
    });
    if (saveAttendanceBtn) saveAttendanceBtn.disabled = students.length === 0;
}

async function handleLoadStudents() {
    if (!auth.currentUser || !attClassEl || !attDateEl || !attendanceTableBody || !userSchoolId) return;
    const selectedClass = attClassEl.value;
    const selectedDate = attDateEl.value;
    if (!selectedDate) {
        updateStatus("Error: Please select a date first.", 'error');
        return;
    }
    updateStatus(`Loading students for ${selectedClass} on ${selectedDate}...`);
    try {
        const snapshot = await db.collection(STUDENTS_COLLECTION)
            .where('schoolId', '==', userSchoolId) 
            .where('class', '==', selectedClass)
            .orderBy('name', 'asc')
            .get();
        const students = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
        if (students.length === 0) {
            updateStatus(`No students found for ${selectedClass} in your school.`, 'error');
            attendanceTableBody.innerHTML = '<tr><td colspan="2">No students found.</td></tr>';
            if (saveAttendanceBtn) saveAttendanceBtn.disabled = true;
            return;
        }
        renderAttendanceTable(students);
        updateStatus(`${students.length} students loaded for ${selectedClass}. Mark attendance.`);
    } catch (error) {
        updateStatus(`Error loading students: ${error.message}`, 'error');
    }
}

async function handleSaveAttendance() {
    if (!auth.currentUser || !attClassEl || !attDateEl || !attendanceTableBody || !userSchoolId) return;
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
        const docId = `${userSchoolId}_${selectedClass}_${selectedDate}`;
        await db.collection(ATTENDANCE_COLLECTION).doc(docId).set({
            class: selectedClass,
            date: selectedDate,
            records: records,
            schoolId: userSchoolId, 
            savedBy: auth.currentUser.email,
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateStatus(`SUCCESS! Records saved by ${auth.currentUser.email}.`, 'success');
    } catch (error) {
        console.error("Firebase Save Error:", error);
        updateStatus(`ERROR! Failed to save to Cloud. See console.`, 'error');
    }
}


// --- 5. GRADEBOOK LOGIC (Placeholders) ---

async function handleAddGradeItem() {
    if (!auth.currentUser || !gradeSubjectEl || !gradeItemNameEl || !totalMarksEl || !userSchoolId) return;
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
        schoolId: userSchoolId, 
        createdBy: auth.currentUser.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    updateStatus(`Adding new grading item: ${itemName}...`, 'info');
    try {
        const docId = `${userSchoolId}_${subject}_${itemName.replace(/\s/g, '_')}`;
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
    if (!auth.currentUser || !gradingItemSelectEl || !userSchoolId) return;
    try {
        const query = db.collection(GRADING_ITEM_COLLECTION)
            .where('schoolId', '==', userSchoolId)
            .orderBy('createdAt', 'desc');
        const snapshot = await query.get();
        gradingItemSelectEl.innerHTML = '<option value="">-- Select Test/Assignment --</option>';
        snapshot.forEach(doc => {
            const item = doc.data();
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = `${item.subject}: ${item.name} (Max: ${item.totalMarks})`;
            option.dataset.max = item.totalMarks;
            gradingItemSelectEl.appendChild(option);
        });
        updateStatus(`Loaded ${gradingItemSelectEl.options.length - 1} grading items.`);
    } catch (error) {
        updateStatus("Error loading grading items.", 'error');
    }
}

async function handleLoadGradeStudents() {
    if (!auth.currentUser || !gradingItemSelectEl || !gradeClassEl || !gradesTableBody || !userSchoolId) return;
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
            .where('schoolId', '==', userSchoolId) 
            .where('class', '==', selectedClass)
            .orderBy('name', 'asc')
            .get();
        const students = snapshot.docs.map(doc => doc.data());
        if (students.length === 0) {
            updateStatus(`No students found for ${selectedClass}.`, 'error');
            gradesTableBody.innerHTML = '<tr><td colspan="2">No students found.</td></tr>';
            if (saveGradesBtn) saveGradesBtn.disabled = true;
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
        if (saveGradesBtn) saveGradesBtn.disabled = students.length === 0;
        updateStatus(`Students loaded for ${selectedItem.textContent} (${selectedClass}). Enter scores.`);
    } catch (error) {
        updateStatus(`Error loading students for grading: ${error.message}`, 'error');
    }
}


async function handleSaveGrades() {
    if (!auth.currentUser || !gradingItemSelectEl || !gradeClassEl || !userSchoolId) return;
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
            schoolId: userSchoolId, 
            savedBy: auth.currentUser.email,
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        updateStatus(`SUCCESS! ${gradeRecords.length} grades saved for ${selectedClass}.`, 'success');
    } catch (error) {
        console.error("Firebase Grade Save Error:", error);
        updateStatus(`ERROR! Failed to save grades: ${error.message}`, 'error');
    }
}


// --- 6. PARENT PORTAL LOGIC (Placeholders) ---

async function handleLookupRecords() {
    if (!auth.currentUser || !lookupNameEl || !lookupClassEl || !studentNameDisplayEl || !attendanceSummaryEl || !gradesSummaryBodyEl || !userSchoolId) return;
    
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
            .where('schoolId', '==', userSchoolId)  
            .where('class', '==', lookupClass)
            .get();

        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;
        let totalDays = 0;

        attendanceSnapshot.forEach(doc => {
            const attendance = doc.data();
            const record = attendance.records.find(r => r.name.toLowerCase() === lookupName.toLowerCase());
            if (record) {
                totalDays++;
                if (record.status === 'Present') presentCount++;
                else if (record.status === 'Absent') absentCount++;
                else if (record.status === 'Late') lateCount++;
            }
        });

        if (totalDays > 0) {
            attendanceSummaryEl.innerHTML = `
                <li>Total Days Logged: <strong>${totalDays}</strong></li>
                <li>Present: <strong>${presentCount}</strong></li>
                <li>Absent: <strong>${absentCount}</strong></li>
                <li>Late: <strong>${lateCount}</strong></li>
            `;
        } else {
            attendanceSummaryEl.innerHTML = '<li>No attendance data found for this student.</li>';
        }

    } catch (error) {
        console.error("Attendance lookup error:", error);
        attendanceSummaryEl.innerHTML = '<li>Error loading attendance data.</li>';
    }


    // --- B. Fetch Grade Records ---
    try {
        const gradesSnapshot = await db.collection(GRADES_COLLECTION)
            .where('schoolId', '==', userSchoolId)
            .where('class', '==', lookupClass)
            .get();

        let foundGrades = [];

        gradesSnapshot.forEach(doc => {
            const gradeEntry = doc.data();
            const studentGrade = gradeEntry.grades.find(g => g.student.toLowerCase() === lookupName.toLowerCase());
            if (studentGrade) {
                foundGrades.push({
                    item: gradeEntry.gradingItemName,
                    score: studentGrade.score,
                    max: studentGrade.max
                });
            }
        });

        if (foundGrades.length > 0) {
            gradesSummaryBodyEl.innerHTML = foundGrades.map(grade => `
                <tr>
                    <td>${grade.item}</td>
                    <td>${grade.score}</td>
                    <td>${grade.max}</td>
                </tr>
            `).join('');
        } else {
            gradesSummaryBodyEl.innerHTML = '<tr><td colspan="3">No grades found for this student.</td></tr>';
        }
        
        updateStatus(`Records loaded for ${lookupName}.`);

    } catch (error) {
        console.error("Grades lookup error:", error);
        gradesSummaryBodyEl.innerHTML = '<tr><td colspan="3">Error loading grades data.</td></tr>';
        updateStatus("Error fetching grades.", 'error');
    }
}


// --- 7. ADMIN/STUDENT MANAGEMENT LOGIC (Placeholders) ---

async function loadStudentsByClass(selectedClass) {
    if (!auth.currentUser || !studentListBodyEl || !userSchoolId) return;

    updateStatus(`Loading student list for class ${selectedClass}...`, 'info');
    studentListBodyEl.innerHTML = '<tr><td colspan="2">Loading...</td></tr>';

    try {
        const snapshot = await db.collection(STUDENTS_COLLECTION)
            .where('schoolId', '==', userSchoolId)
            .where('class', '==', selectedClass)
            .orderBy('name', 'asc')
            .get();

        const students = snapshot.docs.map(doc => doc.data());
        
        studentListBodyEl.innerHTML = '';

        if (students.length === 0) {
            studentListBodyEl.innerHTML = '<tr><td colspan="2">No students registered in this class.</td></tr>';
        } else {
            students.forEach((student) => {
                const row = studentListBodyEl.insertRow();
                row.insertCell(0).textContent = student.name;
                row.insertCell(1).textContent = student.class;
            });
            updateStatus(`${students.length} students loaded for ${selectedClass}.`);
        }

    } catch (error) {
        console.error("Error loading student list:", error);
        studentListBodyEl.innerHTML = '<tr><td colspan="2">Error loading student list.</td></tr>';
        updateStatus(`Error loading student list: ${error.message}`, 'error');
    }
}

async function handleAddStudent() {
    if (!auth.currentUser || !newStudentNameEl || !newStudentClassEl || !userSchoolId) return;

    const studentName = newStudentNameEl.value.trim();
    const studentClass = newStudentClassEl.value;

    if (!studentName || !studentClass) {
        updateStatus("Error: Student Name and Class are required.", 'error');
        return;
    }

    const docId = `${userSchoolId}_${studentClass}_${studentName.replace(/\s/g, '_')}`;

    const studentData = {
        name: studentName,
        class: studentClass,
        schoolId: userSchoolId,
        addedBy: auth.currentUser.email,
        addedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    updateStatus(`Attempting to add student ${studentName}...`, 'info');

    try {
        await db.collection(STUDENTS_COLLECTION).doc(docId).set(studentData);
        
        updateStatus(`SUCCESS! Student ${studentName} added to ${studentClass}.`, 'success');

        newStudentNameEl.value = '';
        
        if (adminStudentClassSelectEl) loadStudentsByClass(adminStudentClassSelectEl.value);

    } catch (error) {
        console.error("Firebase Add Student Error:", error);
        updateStatus(`ERROR adding student: ${error.message}`, 'error');
    }
}


// --- 8. HEADMASTER DASHBOARD LOGIC (Placeholders) ---

async function loadDashboardSummary() {
    if (!auth.currentUser || !userSchoolId) return;

    updateStatus("Loading dashboard statistics...", 'info');

    try {
        // Metric 1: Total Teachers (Filter by role and school)
        const teacherSnapshot = await db.collection(USERS_COLLECTION)
            .where('schoolId', '==', userSchoolId)
            .where('role', '==', 'Teacher')
            .get();
        if (totalTeachersEl) totalTeachersEl.textContent = teacherSnapshot.size;

        // Metric 2 & 3: Attendance Summary 
        const attendanceSnapshot = await db.collection(ATTENDANCE_COLLECTION)
            .where('schoolId', '==', userSchoolId)
            .get();
        
        let totalDaysLogged = attendanceSnapshot.size;
        let totalAttendanceEntries = 0;
        let totalPresent = 0;
        
        attendanceSnapshot.forEach(doc => {
            const record = doc.data();
            totalAttendanceEntries += record.records.length;
            totalPresent += record.records.filter(r => r.status === 'Present').length;
        });

        if (totalAttendanceDaysEl) totalAttendanceDaysEl.textContent = totalDaysLogged;
        
        let avgRate = (totalAttendanceEntries > 0) 
            ? ((totalPresent / totalAttendanceEntries) * 100).toFixed(1) 
            : '0.0';
        if (avgAttendanceRateEl) avgAttendanceRateEl.textContent = `${avgRate}%`;


        // Metric 4: Recent Grade Entries 
        const gradesSnapshot = await db.collection(GRADES_COLLECTION)
            .where('schoolId', '==', userSchoolId)
            .orderBy('savedAt', 'desc')
            .limit(5)
            .get();

        if (recentGradesBodyEl) recentGradesBodyEl.innerHTML = '';
        
        if (gradesSnapshot.empty) {
            recentGradesBodyEl.innerHTML = '<tr><td colspan="4">No recent grades.</td></tr>';
        } else {
            gradesSnapshot.forEach(doc => {
                const gradeEntry = doc.data();
                const count = gradeEntry.grades ? gradeEntry.grades.length : 0;
                const row = recentGradesBodyEl.insertRow();
                row.insertCell(0).textContent = gradeEntry.gradingItemName;
                row.insertCell(1).textContent = gradeEntry.class;
                row.insertCell(2).textContent = count;
                row.insertCell(3).textContent = gradeEntry.savedBy.split('@')[0];
            });
        }
        
        updateStatus("Dashboard summary loaded.", 'success');

    } catch (error) {
        console.error("Dashboard load error:", error);
        updateStatus(`Dashboard Error: ${error.message}`, 'error');
    }
}


// --- ATTACH LISTENERS ON WINDOW LOAD TO ENSURE ALL ELEMENTS ARE READY ---
window.onload = attachGlobalListeners;
// --- END OF COMPLETE REPLACEMENT CODE: js/main.js ---
