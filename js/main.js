async function initializeApplicationLogic(user) {
    // 1. Fetch User Profile
    try {
        const userDoc = await db.collection(USERS_COLLECTION).doc(user.uid).get();
        if (!userDoc.exists) {
            alert("Account not provisioned. Please contact your school administrator.");
            handleLogout(); 
            return;
        }
        
        const userData = userDoc.data();
        userSchoolId = userData.schoolId; 
        userRole = userData.role;       
        
        // 2. Swap Views: Hide login, Show App
        if (authSectionEl) authSectionEl.classList.add('hidden');
        if (appSectionEl) appSectionEl.classList.remove('hidden');

        // 3. Display User Info and Status
        if (userNameEl) userNameEl.textContent = `${user.email} (${userRole} | ${userSchoolId})`;
        updateStatus(`Welcome back, ${user.email}! Role: ${userRole}. School: ${userSchoolId}`, 'success');
        
        // --- NEW: RBAC SETUP ---
        applyRoleBasedAccess(userRole);
        // --- END RBAC SETUP ---

        // 4. Set up all App Event Listeners
        populateClassDropdowns();

        // Module Tabs (Only attach listeners for visible tabs)
        tabBtns.forEach(btn => {
            if (!btn.classList.contains('hidden')) {
                btn.addEventListener('click', () => switchModule(btn.getAttribute('data-module')));
            }
        });

        // Logout Button
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

        // Module specific listeners (These run regardless of role, but the UI is hidden)
        if (loadStudentsBtn) loadStudentsBtn.addEventListener('click', handleLoadStudents);
        if (saveAttendanceBtn) saveAttendanceBtn.addEventListener('click', handleSaveAttendance);
        if (addGradeItemBtn) addGradeItemBtn.addEventListener('click', handleAddGradeItem);
        if (loadGradeStudentsBtn) loadGradeStudentsBtn.addEventListener('click', handleLoadGradeStudents);
        if (saveGradesBtn) saveGradesBtn.addEventListener('click', handleSaveGrades);
        if (lookupBtn) lookupBtn.addEventListener('click', handleLookupRecords);
        if (addStudentBtn) addStudentBtn.addEventListener('click', handleAddStudent);
        if (newStudentClassEl) newStudentClassEl.addEventListener('change', loadStudentsByClass);
        
        // Start on the first active module based on the role
        const firstActiveModule = document.querySelector('.tab-btn:not(.hidden)').getAttribute('data-module');
        switchModule(firstActiveModule);

    } catch (error) {
        console.error("Initialization Error:", error);
        updateStatus(`Fatal Initialization Error: ${error.message}`, 'error');
        handleLogout();
    }
}
