// API Base URL - CHANGE localhost TO YOUR IP ADDRESS
const API_URL = 'http://10.200.67.160:5000/api';


let currentUser = null;
let currentUserType = null;

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
                showPage('adminDashboardPage');
                loadAdminData();
            } else if (currentUserType === 'technician') {
                currentUser = { ...data.user, type: 'technician' };
                showPage('technicianDashboardPage');
                loadTechnicianDashboard();
            } else {
                currentUser = { ...data.user, type: currentUserType };
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
        const response = await fetch(API_URL + '/admin/pending-teachers');
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
                method: 'POST'
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
                method: 'DELETE'
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
        const response = await fetch(API_URL + '/admin/teachers');
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
        const response = await fetch(API_URL + '/admin/students');
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
        const response = await fetch(API_URL + '/admin/technicians');
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
    
    // This function will be completed when you add the backend API for all issues
    // For now, showing a placeholder
    container.innerHTML = '<div class="data-table"><div class="table-header"><i class="fas fa-exclamation-triangle"></i> All Issues</div><div class="empty-state"><i class="fas fa-info-circle"></i><p>Issue management coming soon...</p></div></div>';
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
    document.getElementById('techEmail').textContent = currentUser.email;
    document.getElementById('techSpecialization').textContent = currentUser.specialization;
    
    // Load technician tasks
    await loadTechnicianTasks();
}

async function loadTechnicianTasks() {
    // This will be completed when you add technician tasks API
    const container = document.getElementById('techTaskList');
    container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No tasks assigned yet</p></div>';
}

// ========== LOGOUT ==========

function logout() {
    currentUser = null;
    currentUserType = null;
    showPage('homePage');
}

// ========== INITIALIZE ==========

document.addEventListener('DOMContentLoaded', function() {
    // Any initialization code can go here
    console.log('College Technical Issue Tracker Loaded');
});
