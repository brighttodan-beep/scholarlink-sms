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
const statusEl = document.getElementById('app-status');
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
    statusEl.textContent = message;
    const colors = {
        info: { bg: '#e0f7fa', text: '#01579b' },
        success: { bg: '#d4edda', text: '#155724' },
        error: { bg: '#f8d7da', text: '#721c24' }
    };
    statusEl.style.background = colors[type].bg;
    statusEl.style.color = colors[type].text;
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
    updateStatus(`Switched to the ${moduleId} module.`);
}

// --- 3. ATTENDANCE LOGIC (Cloud Integration) ---

// Dummy data for testing (will be replaced by Firebase query later)
const DUMMY_STUDENTS = [
    "Kwame Nkrumah",
    "Yaa Asantewaa",
    "John Kufuor",
    "Ama Ghana",
    "Kofi Annan"
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
    const selectedClass = attClassEl.value;
    const selectedDate = attDateEl.value;

    if (!selectedDate) {
        updateStatus("Error: Please select a date first.", 'error');
        return;
    }

    updateStatus(`Loading students for ${selectedClass} on ${selectedDate}...`);
    
    // Using dummy data for now
    renderAttendanceTable(DUMMY_STUDENTS);

    updateStatus(`5 students loaded for ${selectedClass}. Mark attendance.`);
}

async function handleSaveAttendance() {
    const selectedClass = attClassEl.value;
    const selectedDate = attDateEl.value;
    const records = [];
    
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
        // Create a unique ID for the document (e.g., JHS3_2025-11-29)
        const docId = `${selectedClass}_${selectedDate}`;
        
        await db.collection(ATTENDANCE_COLLECTION).doc(docId).set({
            class: selectedClass,
            date: selectedDate,
            records: records,
            savedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        updateStatus(`SUCCESS! ${records.length} records saved to Firebase.`, 'success');
    } catch (error) {
        console.error("Firebase Save Error:", error);
        updateStatus(`ERROR! Failed to save to Cloud. See console.`, 'error');
    }
}

// --- 4. EVENT LISTENERS & INITIAL SETUP ---

// Switch modules when tabs are clicked
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchModule(btn.getAttribute('data-module')));
});

// Attendance Module Event Listeners
loadStudentsBtn.addEventListener('click', handleLoadStudents);
saveAttendanceBtn.addEventListener('click', handleSaveAttendance);

// Set default date to today
attDateEl.valueAsDate = new Date(); 

switchModule('attendance');
