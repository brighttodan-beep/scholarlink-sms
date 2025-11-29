// app.js - Main logic for ScholarLink SMS

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

// --- 3. ATTENDANCE LOGIC (Currently local placeholders) ---

// Dummy data for testing before Cloud Storage is added
const DUMMY_STUDENTS = [
    "Kwame Nkrumah",
    "Yaa Asantewaa",
    "John Kufuor",
    "Ama Ghana",
    "Kofi Annan"
];

function renderAttendanceTable(students) {
    tableBody.innerHTML = ''; // Clear existing rows
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

    // This simulates loading data for the selected class
    updateStatus(`Loading students for ${selectedClass} on ${selectedDate}...`);
    
    // Use dummy data for now
    renderAttendanceTable(DUMMY_STUDENTS);

    updateStatus(`5 students loaded for ${selectedClass}. Mark attendance.`);
}


function handleSaveAttendance() {
    updateStatus('Saving attendance records locally...', 'info');
    
    // This function will be replaced with Firebase Cloud Storage logic later.
    
    // Simulate reading the data
    const records = [];
    tableBody.querySelectorAll('tr').forEach(row => {
        const name = row.cells[0].textContent;
        const status = row.cells[1].querySelector('.status-select').value;
        records.push({ name, status });
    });

    console.log("Attendance Saved:", records);
    
    updateStatus(`SUCCESS! ${records.length} attendance records saved. Cloud setup is next!`, 'success');
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