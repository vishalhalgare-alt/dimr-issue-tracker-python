// API Base URL - use local backend by default
const API_URL = 'http://127.0.0.1:5000/api';


let currentUser = null;
let currentUserType = null;
let currentToken = null;
let currentAssignIssueId = null;
let technicianTasksStore = { assigned: [], recommended: [], filter: 'all' };

// ========== PAGE NAVIGATION ==========

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// ========== LOGIN ==========

function showLogin(userType) {
    currentUserType = userType;
    showPage('loginPage');
    
    const loginIcon = document.getElementById('loginIcon');
    const loginTitle = document.getElementById('loginTitle');
    const registerLink = document.getElementById('registerLink');
    const loginFooter = document.getElementById('loginFooter');
    
    if (userType === 'admin') {
        loginIcon.innerHTML = '<i class="fas fa-user-shield"></i>';
        loginTitle.textContent = 'Admin Login';
        loginFooter.style.display = 'none';
    } else if (userType === 'teacher') {
        loginIcon.innerHTML = '<i class="fas fa-chalkboard-teacher"></i>';
        loginTitle.textContent = 'Teacher Login';
        loginFooter.style.display = 'block';
        registerLink.textContent = 'Register as Teacher';
    } else if (userType === 'student') {
        loginIcon.innerHTML = '<i class="fas fa-user-graduate"></i>';
        loginTitle.textContent = 'Student Login';
        loginFooter.style.display = 'block';
        registerLink.textContent = 'Register as Student';
    } else if (userType === 'technician') {
        loginIcon.innerHTML = '<i class="fas fa-tools"></i>';
        loginTitle.textContent = 'Technician Login';
        loginFooter.style.display = 'block';
        registerLink.textContent = 'Register as Technician';
    }
    
    document.getElementById('loginForm').reset();
    document.getElementById('loginError').classList.remove('show');
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
        let endpoint = '';
        if (currentUserType === 'admin') {
            endpoint = '/admin/login';
        } else if (currentUserType === 'teacher') {
            endpoint = '/teacher/login';
        } else if (currentUserType === 'student') {
            endpoint = '/student/login';
        } else if (currentUserType === 'technician') {
            endpoint = '/technician/login';
        }
        
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (currentUserType === 'admin') {
                currentUser = { type: 'admin', email };
                currentToken = data.token;
                showPage('adminDashboardPage');
                loadAdminData();
            } else if (currentUserType === 'technician') {
                currentUser = { ...data.user, type: 'technician' };
                currentToken = data.token;
                showPage('technicianDashboardPage');
                loadTechnicianDashboard();
            } else {
                currentUser = { ...data.user, type: currentUserType };
                currentToken = data.token;
                showPage('dashboardPage');
                updateUserDashboard();
                loadUserIssues();
                loadPendingFeedback();
            }
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please check if backend is running.';
        errorDiv.classList.add('show');
        console.error('Login error:', error);
    }
    
    return false;
}

// ========== REGISTRATION ==========

function showRegisterPage() {
    showPage('registerPage');
    
    const registerIcon = document.getElementById('registerIcon');
    const registerTitle = document.getElementById('registerTitle');
    const studentFields = document.getElementById('studentFields');
    
    if (currentUserType === 'teacher') {
        registerIcon.innerHTML = '<i class="fas fa-chalkboard-teacher"></i>';
        registerTitle.textContent = 'Teacher Registration';
        studentFields.style.display = 'none';
    } else if (currentUserType === 'student') {
        registerIcon.innerHTML = '<i class="fas fa-user-graduate"></i>';
        registerTitle.textContent = 'Student Registration';
        studentFields.style.display = 'block';
    } else if (currentUserType === 'technician') {
        registerIcon.innerHTML = '<i class="fas fa-tools"></i>';
        registerTitle.textContent = 'Technician Registration';
        studentFields.style.display = 'none';
        
        // Show specialization field for technician
        const form = document.getElementById('registerForm');
        let techField = document.getElementById('technicianSpecialization');
        if (!techField) {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';
            formGroup.innerHTML = `
                <label><i class="fas fa-cog"></i> Specialization</label>
                <select id="technicianSpecialization" required>
                    <option value="">Select Specialization</option>
                    <option value="Computer Hardware">Computer Hardware</option>
                    <option value="Network & WiFi">Network & WiFi</option>
                    <option value="Digital Board">Digital Board</option>
                    <option value="General Electrical">General Electrical</option>
                </select>
            `;
            const errorDiv = document.getElementById('registerError');
            form.insertBefore(formGroup, errorDiv);
        }
    }
    
    document.getElementById('registerForm').reset();
    document.getElementById('registerError').classList.remove('show');
    document.getElementById('registerSuccess').classList.remove('show');
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('regName').value;
    const phone = document.getElementById('regPhone').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const errorDiv = document.getElementById('registerError');
    const successDiv = document.getElementById('registerSuccess');
    
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');
    
    let userData = { name, phone, email, password };
    
    if (currentUserType === 'student') {
        userData.course = document.getElementById('regCourse').value;
        userData.division = document.getElementById('regDivision').value;
    } else if (currentUserType === 'technician') {
        userData.specialization = document.getElementById('technicianSpecialization').value;
    }
    
    try {
        let endpoint = '';
        if (currentUserType === 'teacher') endpoint = '/teacher/register';
        else if (currentUserType === 'student') endpoint = '/student/register';
        else if (currentUserType === 'technician') endpoint = '/technician/register';
        
        const response = await fetch(API_URL + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            successDiv.textContent = data.message;
            successDiv.classList.add('show');
            
            setTimeout(() => {
                showPage('loginPage');
            }, 2000);
        } else {
            errorDiv.textContent = data.message;
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please check if backend is running.';
        errorDiv.classList.add('show');
        console.error('Registration error:', error);
    }
    
    return false;
}

// ========== USER DASHBOARD FUNCTIONS ==========

function updateUserDashboard() {
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('sidebarName').textContent = currentUser.name;
    document.getElementById('sidebarEmail').textContent = currentUser.email;
    
    if (currentUser.type === 'student') {
        document.getElementById('sidebarInfo').textContent = currentUser.course + ' - Division ' + currentUser.division;
    } else {
        document.getElementById('sidebarInfo').textContent = 'Faculty Member';
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('active');
}

function showDashboardSection(section) {
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    if (section === 'overview') {
        document.getElementById('overviewSection').classList.add('active');
        loadUserIssues();
    } else if (section === 'reportIssue') {
        document.getElementById('reportIssueSection').classList.add('active');
    } else if (section === 'myIssues') {
        document.getElementById('myIssuesSection').classList.add('active');
        loadUserIssues();
    }
    
    if (window.innerWidth <= 768) {
        toggleSidebar();
    }
}

async function handleIssueSubmit(event) {
    event.preventDefault();
    
    const issueType = document.querySelector('input[name="issueType"]:checked');
    if (!issueType) {
        alert('Please select an issue type');
        return false;
    }
    
    const floor = document.getElementById('issueFloor').value;
    const classNumber = document.getElementById('issueClass').value;
    const description = document.getElementById('issueDescription').value;
    const successDiv = document.getElementById('issueSuccess');
    
    const issueData = {
        userName: currentUser.name,
        userType: currentUser.type,
        userEmail: currentUser.email,
        issueType: issueType.value,
        floor: floor,
        classNumber: classNumber,
        description: description
    };
    
    try {
        const response = await fetch(API_URL + '/issue/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issueData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            successDiv.textContent = 'Issue reported successfully!';
            successDiv.classList.add('show');
            
            document.getElementById('issueForm').reset();
            
            setTimeout(() => {
                successDiv.classList.remove('show');
                showDashboardSection('myIssues');
            }, 1500);
        } else {
            alert('Error: ' + data.message);
        }
    } catch (error) {
        console.error('Issue submit error:', error);
        alert('Error submitting issue. Please try again.');
    }
    
    return false;
}

async function loadUserIssues() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(API_URL + '/issue/user/' + currentUser.email);
        const issues = await response.json();
        
        document.getElementById('totalIssues').textContent = issues.length;
        document.getElementById('pendingIssues').textContent = issues.filter(i => i.status === 'pending' || i.status === 'assigned').length;
        document.getElementById('resolvedIssues').textContent = issues.filter(i => i.status === 'resolved').length;
        
        const issuesList = document.getElementById('issuesList');
        
        if (issues.length === 0) {
            issuesList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No issues reported yet</p></div>';
        } else {
            let html = '';
            issues.forEach(issue => {
                html += '<div class="issue-item ' + issue.status + '">';
                html += '<div class="issue-header">';
                html += '<div class="issue-title">';
                html += '<i class="fas fa-exclamation-circle"></i> ';
                html += issue.issue_type;
                html += '</div>';
                html += '<span class="issue-status ' + issue.status + '">';
                html += issue.status.toUpperCase();
                html += '</span>';
                html += '</div>';
                html += '<div class="issue-details">';
                html += '<i class="fas fa-building"></i> Floor ' + issue.floor;
                html += ' <span style="margin: 0 1rem">|</span> ';
                html += '<i class="fas fa-door-open"></i> Class ' + issue.class_number;
                html += '</div>';
                html += '<div class="issue-details">';
                html += '<i class="fas fa-calendar"></i> ' + new Date(issue.created_at).toLocaleDateString();
                html += '</div>';
                html += '<div class="issue-description">';
                html += issue.description;
                html += '</div>';
                html += '</div>';
            });
            issuesList.innerHTML = html;
        }
    } catch (error) {
        console.error('Load issues error:', error);
    }
}

// ========== ADMIN DASHBOARD ==========

async function loadAdminData() {
    await showAdminTab('pending');
}

async function showAdminTab(tab, buttonElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (buttonElement) {
        buttonElement.classList.add('active');
    } else {
        document.querySelector(`.tab-btn[onclick*="${tab}"]`)?.classList.add('active');
    }
    
    if (tab === 'pending') {
        document.getElementById('pendingTab').classList.add('active');
        await loadPendingTeachers();
    } else if (tab === 'teachers') {
        document.getElementById('teachersTab').classList.add('active');
        await loadAllTeachers();
    } else if (tab === 'students') {
        document.getElementById('studentsTab').classList.add('active');
        await loadAllStudents();
    } else if (tab === 'technicians') {
        document.getElementById('techniciansTab').classList.add('active');
        await loadAllTechnicians();
    } else if (tab === 'issues') {
        document.getElementById('issuesTab').classList.add('active');
        await loadAllIssues();
    } else if (tab === 'feedback') {
        document.getElementById('feedbackTab').classList.add('active');
        await loadFeedbackReport();
    } else if (tab === 'analytics') {
        document.getElementById('analyticsTab').classList.add('active');
        await loadAnalytics();
    }
    
    return false;
}

async function loadPendingTeachers() {
    try {
        const response = await fetch(API_URL + '/admin/pending-teachers', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const teachers = await response.json();
        
        const container = document.getElementById('pendingTab');
        
        if (teachers.length === 0) {
            container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-user-clock"></i> Pending Teacher Approvals</div><div class="empty-state"><i class="fas fa-check-circle"></i><p>No pending approvals</p></div></div>';
        } else {
            let html = '<div class="data-table"><div class="table-header"><i class="fas fa-user-clock"></i> Pending Teacher Approvals (' + teachers.length + ')</div>';
            html += '<div class="professional-table"><table><thead><tr>';
            html += '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Applied Date</th><th>Actions</th>';
            html += '</tr></thead><tbody>';
            
            teachers.forEach((teacher, index) => {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + teacher.name + '</td>';
                html += '<td>' + teacher.email + '</td>';
                html += '<td>' + teacher.phone + '</td>';
                html += '<td>' + new Date(teacher.created_at).toLocaleDateString() + '</td>';
                html += '<td class="action-cell">';
                html += '<button class="btn-action btn-approve" onclick="approveTeacher(' + teacher.id + ')"><i class="fas fa-check"></i> Approve</button>';
                html += '<button class="btn-action btn-reject" onclick="rejectTeacher(' + teacher.id + ')"><i class="fas fa-times"></i> Reject</button>';
                html += '</td></tr>';
            });
            
            html += '</tbody></table></div></div>';
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Load pending teachers error:', error);
    }
}

async function approveTeacher(teacherId) {
    if (confirm('Approve this teacher?')) {
        try {
            const response = await fetch(`${API_URL}/admin/approve-teacher/${teacherId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Teacher approved successfully!');
                loadPendingTeachers();
            }
        } catch (error) {
            console.error('Approve error:', error);
            alert('Error approving teacher');
        }
    }
}

async function rejectTeacher(teacherId) {
    if (confirm('Are you sure you want to reject this teacher?')) {
        try {
            const response = await fetch(`${API_URL}/admin/reject-teacher/${teacherId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Teacher rejected!');
                loadPendingTeachers();
            }
        } catch (error) {
            console.error('Reject error:', error);
            alert('Error rejecting teacher');
        }
    }
}

async function loadAllTeachers() {
    try {
        const response = await fetch(API_URL + '/admin/teachers', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const teachers = await response.json();
        
        const container = document.getElementById('teachersTab');
        
        if (teachers.length === 0) {
            container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-chalkboard-teacher"></i> Approved Teachers</div><div class="empty-state"><i class="fas fa-inbox"></i><p>No approved teachers yet</p></div></div>';
        } else {
            let html = '<div class="data-table"><div class="table-header"><i class="fas fa-chalkboard-teacher"></i> Approved Teachers (' + teachers.length + ')</div>';
            html += '<div class="professional-table"><table><thead><tr>';
            html += '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined Date</th>';
            html += '</tr></thead><tbody>';
            
            teachers.forEach((teacher, index) => {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + teacher.name + '</td>';
                html += '<td>' + teacher.email + '</td>';
                html += '<td>' + teacher.phone + '</td>';
                html += '<td>' + new Date(teacher.created_at).toLocaleDateString() + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table></div></div>';
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Load teachers error:', error);
    }
}

async function loadAllStudents() {
    try {
        const response = await fetch(API_URL + '/admin/students', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const students = await response.json();
        
        const container = document.getElementById('studentsTab');
        
        if (students.length === 0) {
            container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-user-graduate"></i> Registered Students</div><div class="empty-state"><i class="fas fa-inbox"></i><p>No students registered yet</p></div></div>';
        } else {
            let html = '<div class="data-table"><div class="table-header"><i class="fas fa-user-graduate"></i> Registered Students (' + students.length + ')</div>';
            html += '<div class="professional-table"><table><thead><tr>';
            html += '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Course</th><th>Division</th><th>Joined Date</th>';
            html += '</tr></thead><tbody>';
            
            students.forEach((student, index) => {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + student.name + '</td>';
                html += '<td>' + student.email + '</td>';
                html += '<td>' + student.phone + '</td>';
                html += '<td>' + student.course + '</td>';
                html += '<td>' + student.division + '</td>';
                html += '<td>' + new Date(student.created_at).toLocaleDateString() + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table></div></div>';
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Load students error:', error);
    }
}

async function loadAllTechnicians() {
    try {
        const response = await fetch(API_URL + '/admin/technicians', {
            headers: {
                'Authorization': `Bearer ${currentToken}`
            }
        });
        const technicians = await response.json();
        
        const container = document.getElementById('techniciansTab');
        
        if (technicians.length === 0) {
            container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-tools"></i> Registered Technicians</div><div class="empty-state"><i class="fas fa-inbox"></i><p>No technicians registered yet</p></div></div>';
        } else {
            let html = '<div class="data-table"><div class="table-header"><i class="fas fa-tools"></i> Registered Technicians (' + technicians.length + ')</div>';
            html += '<div class="professional-table"><table><thead><tr>';
            html += '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Specialization</th><th>Status</th><th>Joined Date</th>';
            html += '</tr></thead><tbody>';
            
            technicians.forEach((tech, index) => {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + tech.name + '</td>';
                html += '<td>' + tech.email + '</td>';
                html += '<td>' + tech.phone + '</td>';
                html += '<td>' + tech.specialization + '</td>';
                html += '<td><span class="status-badge ' + tech.status + '">' + tech.status.toUpperCase() + '</span></td>';
                html += '<td>' + new Date(tech.created_at).toLocaleDateString() + '</td>';
                html += '</tr>';
            });
            
            html += '</tbody></table></div></div>';
            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Load technicians error:', error);
    }
}

async function loadAllIssues() {
    const container = document.getElementById('issuesTab');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading issues...</div>';
    try {
        const resp = await fetch(API_URL + '/admin/issues', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await resp.json();
        if (!data.success) {
            container.innerHTML = '<div class="empty-state"><p>Error loading issues</p></div>';
            return;
        }
        const issues = data.issues || [];
        if (issues.length === 0) {
            container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-exclamation-triangle"></i> All Issues</div><div class="empty-state"><i class="fas fa-inbox"></i><p>No issues reported yet</p></div></div>';
            return;
        }

        let html = '<div class="data-table"><div class="table-header"><i class="fas fa-exclamation-triangle"></i> All Issues (' + issues.length + ')</div>';
        html += '<div class="professional-table"><table><thead><tr>';
        html += '<th>#</th><th>Reporter</th><th>Type</th><th>Location</th><th>Description</th><th>Status</th><th>Assigned To</th><th>Created</th><th>Actions</th>';
        html += '</tr></thead><tbody>';

        issues.forEach((issue, idx) => {
            const assigned = issue.technician_name ? issue.technician_name + ' (' + (issue.technician_specialization||'') + ')' : 'Unassigned';
            html += '<tr>';
            html += '<td>' + (idx + 1) + '</td>';
            html += '<td>' + (issue.user_name || '') + '<br/><small>' + issue.user_email + ' (' + issue.user_type + ')</small></td>';
            html += '<td>' + issue.issue_type + '</td>';
            html += '<td>Floor ' + issue.floor + ' | ' + issue.class_number + '</td>';
            html += '<td>' + (issue.description ? (issue.description.length > 80 ? issue.description.substring(0,80) + '...' : issue.description) : '') + '</td>';
            html += '<td>' + (issue.status || '') + '</td>';
            html += '<td>' + assigned + '</td>';
            html += '<td>' + new Date(issue.created_at).toLocaleDateString() + '</td>';
            html += '<td>';
            html += '<button class="btn-action" onclick="openAssignModal(' + issue.id + ')"><i class="fas fa-user-plus"></i> Assign</button>';
            html += '</td>';
            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('Load all issues error:', error);
        container.innerHTML = '<div class="empty-state"><p>Connection error while loading issues</p></div>';
    }
}

// ========== ASSIGN MODAL HANDLERS ==========
function openAssignModal(issueId) {
    currentAssignIssueId = issueId;
    // Show modal
    const modal = document.getElementById('assignModal');
    const info = document.getElementById('assignIssueInfo');
    info.textContent = 'Loading technicians...';
    modal.style.display = 'flex';

    // Fetch technicians list
    fetch(API_URL + '/admin/technicians', { headers: { 'Authorization': `Bearer ${currentToken}` } })
        .then(r => r.json())
        .then(list => {
            const select = document.getElementById('assignTechSelect');
            select.innerHTML = '';
            if (!Array.isArray(list) || list.length === 0) {
                info.textContent = 'No technicians available to assign.';
                return;
            }
            info.textContent = '';
            list.forEach(tech => {
                const opt = document.createElement('option');
                opt.value = tech.id;
                opt.textContent = tech.name + ' — ' + tech.specialization + ' (' + tech.email + ')';
                select.appendChild(opt);
            });
        })
        .catch(err => {
            console.error('Load technicians error:', err);
            document.getElementById('assignIssueInfo').textContent = 'Error loading technicians';
        });

    // wire confirm button
    const confirmBtn = document.getElementById('confirmAssignBtn');
    confirmBtn.onclick = () => assignIssue(currentAssignIssueId);
}

function closeAssignModal() {
    const modal = document.getElementById('assignModal');
    modal.style.display = 'none';
    currentAssignIssueId = null;
}

async function assignIssue(issueId) {
    const select = document.getElementById('assignTechSelect');
    const techId = select.value;
    if (!techId) {
        alert('Please choose a technician');
        return;
    }
    try {
        const resp = await fetch(API_URL + '/admin/assign-issue/' + issueId, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ technician_id: parseInt(techId, 10) })
        });
        const data = await resp.json();
        if (data.success) {
            alert('Issue assigned successfully');
            closeAssignModal();
            await loadAllIssues();
        } else {
            alert('Assignment failed: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Assign issue error:', error);
        alert('Connection error while assigning');
    }
}

// ========== FEEDBACK ==========

async function loadPendingFeedback() {
    if (!currentUser || !currentUser.email) return;
    
    try {
        const response = await fetch(API_URL + '/feedback/user/' + currentUser.email);
        const data = await response.json();
        
        if (data.success && data.issues.length > 0) {
            showFeedbackPrompt(data.issues.length);
        }
        
    } catch (error) {
        console.error('Load pending feedback error:', error);
    }
}

function showFeedbackPrompt(count) {
    const banner = document.createElement('div');
    banner.className = 'feedback-prompt-banner';
    banner.innerHTML = `
        <div class="banner-content">
            <i class="fas fa-star"></i>
            <span>You have ${count} resolved issue${count > 1 ? 's' : ''} waiting for feedback</span>
            <button onclick="openFeedbackCenter()" class="btn-feedback">
                Give Feedback
            </button>
            <button onclick="closeFeedbackPrompt()" class="btn-close-banner">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    const dashboard = document.querySelector('.dashboard-content');
    if (dashboard && !document.querySelector('.feedback-prompt-banner')) {
        dashboard.insertBefore(banner, dashboard.firstChild);
        setTimeout(() => banner.classList.add('show'), 100);
    }
}

function closeFeedbackPrompt() {
    const banner = document.querySelector('.feedback-prompt-banner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 300);
    }
}

async function loadFeedbackReport() {
    const container = document.getElementById('feedbackTab');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading feedback...</div>';
    
    // This will be completed when you add the feedback API
    container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-star"></i> Feedback Report</div><div class="empty-state"><i class="fas fa-info-circle"></i><p>Feedback system coming soon...</p></div></div>';
}

// ========== ANALYTICS ==========

let analyticsCharts = {};

async function loadAnalytics() {
    const container = document.getElementById('analyticsTab');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading analytics...</div>';
    
    // This will be completed when you add the analytics API
    container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-chart-line"></i> Analytics Dashboard</div><div class="empty-state"><i class="fas fa-info-circle"></i><p>Analytics dashboard coming soon...</p></div></div>';
}

// ========== TECHNICIAN DASHBOARD ==========

async function loadTechnicianDashboard() {
    document.getElementById('techName').textContent = currentUser.name;
    document.getElementById('techEmail').textContent = currentUser.email || '';
    document.getElementById('techSpecialization').textContent = currentUser.specialization || '';

    // Load technician tasks
    await loadTechnicianTasks();
    // Load notifications for technician
    await loadTechnicianNotifications();
}

async function loadTechnicianNotifications() {
    if (!currentUser || !currentUser.email) return;
    try {
        const resp = await fetch(API_URL + '/notifications/' + encodeURIComponent(currentUser.email));
        const data = await resp.json();
        const listEl = document.getElementById('notifList');
        const noEl = document.getElementById('noNotif');
        const badge = document.getElementById('notifCount');
        listEl.innerHTML = '';
        if (!data.success || !Array.isArray(data.notifications) || data.notifications.length === 0) {
            noEl.style.display = 'block';
            badge.style.display = 'none';
            return;
        }
        noEl.style.display = 'none';
        const notifs = data.notifications;
        let unread = 0;
        notifs.forEach(n => {
            if (n.is_read === 0) unread++;
            const card = document.createElement('div');
            card.className = 'notification-card';
            card.style = 'background:#f9fafb;padding:0.8rem;border-radius:8px;border-left:4px solid #2563eb;' + (n.is_read === 0 ? 'font-weight:600;' : '');
            card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:start"><div><strong>${n.title}</strong><div style="font-size:0.9rem;color:#6b7280;margin-top:0.25rem">${n.message}</div><div style="font-size:0.8rem;color:#9ca3af;margin-top:0.5rem">${new Date(n.created_at).toLocaleString()}</div></div></div>`;
            
            // Mark as read when user views it
            if (n.is_read === 0) {
                fetch(API_URL + '/notifications/' + n.id + '/mark-read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }).catch(err => console.error('Mark read error:', err));
            }
            
            listEl.appendChild(card);
        });
        if (unread > 0) {
            badge.style.display = 'inline-block';
            badge.textContent = unread;
        } else {
            badge.style.display = 'none';
        }
    } catch (err) {
        console.error('Load notifications error:', err);
    }
}

function openNotifModal() {
    document.getElementById('notifModal').style.display = 'flex';
}

function closeNotifModal() {
    document.getElementById('notifModal').style.display = 'none';
}

async function loadTechnicianTasks() {
    const container = document.getElementById('techTaskList');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tasks...</div>';
    try {
        const resp = await fetch(API_URL + '/technician/tasks', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const data = await resp.json();
        if (!data.success) {
            container.innerHTML = '<div class="empty-state"><p>Error loading tasks</p></div>';
            return;
        }

        technicianTasksStore.assigned = data.assigned || [];
        technicianTasksStore.recommended = data.recommended || [];
        technicianTasksStore.filter = 'all';

        renderTechnicianTasks();
    } catch (error) {
        console.error('Load technician tasks error:', error);
        container.innerHTML = '<div class="empty-state"><p>Connection error while loading tasks</p></div>';
    }
}

function renderTechnicianTasks() {
    const container = document.getElementById('techTaskList');
    const { assigned, recommended, filter } = technicianTasksStore;

    const completedStatuses = ['resolved', 'completed', 'closed', 'done'];

    // Update technician counters
    const totalTasks = (assigned ? assigned.length : 0) + (recommended ? recommended.length : 0);
    const completedTasks = (assigned ? assigned.filter(i => completedStatuses.includes((i.status || '').toLowerCase())).length : 0);
    const pendingTasks = Math.max(0, totalTasks - completedTasks);
    const totalEl = document.getElementById('techTotalTasks');
    const pendingEl = document.getElementById('techPendingTasks');
    const completedEl = document.getElementById('techCompletedTasks');
    if (totalEl) totalEl.textContent = totalTasks;
    if (pendingEl) pendingEl.textContent = pendingTasks;
    if (completedEl) completedEl.textContent = completedTasks;

    // combine based on filter
    let items = [];
    if (filter === 'all') {
        // show assigned first then recommended
        items = (assigned || []).concat((recommended || []).map(r => ({ ...r, recommended: true })));
    } else if (filter === 'assigned') {
        items = assigned || [];
    } else if (filter === 'resolved') {
        items = (assigned || []).filter(i => completedStatuses.includes((i.status || '').toLowerCase()));
    }

    if (!items || items.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No tasks found</p></div>';
        return;
    }

    let html = '';
    items.forEach(issue => {
        const statusLower = (issue.status || '').toLowerCase();
        html += '<div class="issue-item ' + (issue.status || '') + '">';
        html += '<div class="issue-header">';
        html += '<div class="issue-title"><i class="fas fa-exclamation-circle"></i> ' + issue.issue_type + '</div>';
        html += '<span class="issue-status ' + (issue.status || '') + '">' + (issue.status ? issue.status.toUpperCase() : 'NEW') + '</span>';
        html += '</div>';
        html += '<div class="issue-details">';
        html += '<i class="fas fa-building"></i> Floor ' + issue.floor + ' <span style="margin:0 0.5rem">|</span> <i class="fas fa-door-open"></i> ' + issue.class_number;
        html += '</div>';
        html += '<div class="issue-details"><i class="fas fa-user"></i> ' + (issue.user_name || issue.user_email) + '</div>';
        html += '<div class="issue-description">' + (issue.description || '') + '</div>';
        if (issue.recommended) {
            html += '<div class="issue-recommend"><small>Recommended (matching your specialization)</small></div>';
        }
        html += '<div style="margin-top:0.5rem;display:flex;gap:0.5rem;justify-content:flex-end">';
        if (!completedStatuses.includes(statusLower)) {
            html += '<button class="btn-action" onclick="markIssueResolved(' + issue.id + ')"><i class="fas fa-check"></i> Mark Resolved</button>';
        }
        html += '</div>';
        html += '</div>';
    });

    container.innerHTML = html;
}

async function markIssueResolved(issueId) {
    try {
        const resp = await fetch(API_URL + '/issue/update-status/' + issueId, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ status: 'resolved' })
        });
        const data = await resp.json();
        if (data.success) {
            await loadTechnicianTasks();
        } else {
            alert('Failed to mark resolved: ' + (data.message || 'Unknown'));
        }
    } catch (err) {
        console.error('Mark resolved error:', err);
        alert('Connection error');
    }
}

function filterTasks(status) {
    technicianTasksStore.filter = status;
    // update button states if present
    document.querySelectorAll('.task-filters .filter-btn').forEach(b => b.classList.remove('active'));
    const btns = document.querySelectorAll('.task-filters .filter-btn');
    btns.forEach(b => { if (b.getAttribute('onclick')?.includes("filterTasks('"+status+"')")) b.classList.add('active'); });
    renderTechnicianTasks();
}

// ========== LOGOUT ==========

function logout() {
    currentUser = null;
    currentUserType = null;
    currentToken = null;
    showPage('homePage');
}

// ========== INITIALIZE ==========

document.addEventListener('DOMContentLoaded', function() {
    // Any initialization code can go here
    console.log('College Technical Issue Tracker Loaded');
});
