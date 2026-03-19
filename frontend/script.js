// API Base URL - use local backend by default
// Detect if running locally or on a server; use window.location for mobile compatibility
const API_URL = window.location.protocol === 'file:' ? 'http://localhost:5000/api' : `${window.location.protocol}//${window.location.hostname}:5000/api`;


let currentUser = null;
let currentUserType = null;
let currentToken = null;
let currentAssignIssueId = null;
let technicianTasksStore = { assigned: [], recommended: [], filter: 'all' };

// Check for stored login data on page load
function checkStoredLogin() {
    const storedUser = localStorage.getItem('currentUser');
    const storedType = localStorage.getItem('currentUserType');
    const storedToken = localStorage.getItem('currentToken');
    
    if (storedUser && storedType && storedToken) {
        currentUser = JSON.parse(storedUser);
        currentUserType = storedType;
        currentToken = storedToken;
        
        // Redirect to dashboard if on home page
        const currentPage = window.location.pathname;
        if (currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/')) {
            window.location.href = 'dashboard.html';
        }
    }
}

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
    
    // Auto scroll to login page
    document.getElementById('loginPage').scrollIntoView({ behavior: 'smooth' });
    
    const loginIcon = document.getElementById('loginIcon');
    const loginTitle = document.getElementById('loginTitle');
    const registerLink = document.getElementById('registerLink');
    const loginFooter = document.getElementById('loginFooter');
    
    if (userType === 'admin') {
        loginIcon.innerHTML = '<i class="fas fa-user-shield"></i><p style="font-size: 0.9rem; margin-top: 0.5rem;">Admin</p>';
        loginTitle.textContent = 'Admin Login';
        loginFooter.style.display = 'none';
    } else if (userType === 'teacher') {
        loginIcon.innerHTML = '<i class="fas fa-chalkboard-teacher"></i><p style="font-size: 0.9rem; margin-top: 0.5rem;">Teacher</p>';
        loginTitle.textContent = 'Teacher Login';
        loginFooter.style.display = 'block';
        registerLink.textContent = 'Register as Teacher';
    } else if (userType === 'student') {
        loginIcon.innerHTML = '<i class="fas fa-user-graduate"></i><p style="font-size: 0.9rem; margin-top: 0.5rem;">Student</p>';
        loginTitle.textContent = 'Student Login';
        loginFooter.style.display = 'block';
        registerLink.textContent = 'Register as Student';
    } else if (userType === 'technician') {
        loginIcon.innerHTML = '<i class="fas fa-tools"></i><p style="font-size: 0.9rem; margin-top: 0.5rem;">Technician</p>';
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
            // Store login data in localStorage
            localStorage.setItem('currentUser', JSON.stringify(data.user || { type: currentUserType, email }));
            localStorage.setItem('currentUserType', currentUserType);
            localStorage.setItem('currentToken', data.token);
            
            // Clear login page and redirect to dashboard
            document.body.innerHTML = '';
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 50);
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
        registerIcon.innerHTML = '<i class="fas fa-chalkboard-teacher"></i><p style="font-size: 0.9rem; margin-top: 0.5rem;">Teacher</p>';
        registerTitle.textContent = 'Teacher Registration';
        studentFields.style.display = 'none';
    } else if (currentUserType === 'student') {
        registerIcon.innerHTML = '<i class="fas fa-user-graduate"></i><p style="font-size: 0.9rem; margin-top: 0.5rem;">Student</p>';
        registerTitle.textContent = 'Student Registration';
        studentFields.style.display = 'block';
    } else if (currentUserType === 'technician') {
        registerIcon.innerHTML = '<i class="fas fa-tools"></i><p style="font-size: 0.9rem; margin-top: 0.5rem;">Technician</p>';
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

// ========== FORGOT PASSWORD FUNCTIONS ==========

// Store OTP and email temporarily during password reset
let forgotPasswordState = {
    email: '',
    otp: '',
    generatedOtp: null
};

async function sendOTP(event) {
    event.preventDefault();
    
    const email = document.getElementById('forgotEmail').value;
    const errorDiv = document.getElementById('forgotError');
    errorDiv.classList.remove('show');
    
    try {
        const response = await fetch(API_URL + '/forgot-password/send-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, userType: currentUserType })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Store the OTP and email
            forgotPasswordState.email = email;
            forgotPasswordState.generatedOtp = data.otp;
            
            // Show OTP verification form
            document.getElementById('forgotEmailForm').style.display = 'none';
            document.getElementById('verifyOTPForm').style.display = 'block';
            document.getElementById('sentEmail').textContent = email;
            document.getElementById('displayOTP').textContent = data.otp; // For testing
        } else {
            errorDiv.textContent = data.message || 'Email not found';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error';
        errorDiv.classList.add('show');
        console.error('Send OTP error:', error);
    }
}

async function verifyOTP(event) {
    event.preventDefault();
    
    const otpInput = document.getElementById('otpInput').value;
    const errorDiv = document.getElementById('otpError');
    errorDiv.classList.remove('show');
    
    if (otpInput === forgotPasswordState.generatedOtp.toString()) {
        // OTP matches
        document.getElementById('verifyOTPForm').style.display = 'none';
        document.getElementById('resetPasswordForm').style.display = 'block';
    } else {
        errorDiv.textContent = 'Invalid OTP. Please try again.';
        errorDiv.classList.add('show');
    }
}

function resendOTP() {
    document.getElementById('otpInput').value = '';
    document.getElementById('verifyOTPForm').style.display = 'none';
    document.getElementById('forgotEmailForm').style.display = 'block';
    document.getElementById('forgotEmail').value = forgotPasswordState.email;
}

async function resetPassword(event) {
    event.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('resetError');
    const successDiv = document.getElementById('resetSuccess');
    
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');
    
    if (newPassword !== confirmPassword) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.classList.add('show');
        return;
    }
    
    if (newPassword.length < 6) {
        errorDiv.textContent = 'Password must be at least 6 characters';
        errorDiv.classList.add('show');
        return;
    }
    
    try {
        const response = await fetch(API_URL + '/forgot-password/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: forgotPasswordState.email,
                newPassword: newPassword,
                userType: currentUserType
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            successDiv.textContent = 'Password reset successfully! Redirecting to login...';
            successDiv.classList.add('show');
            
            setTimeout(() => {
                // Reset the form
                document.getElementById('forgotEmailForm').style.display = 'block';
                document.getElementById('verifyOTPForm').style.display = 'none';
                document.getElementById('resetPasswordForm').style.display = 'none';
                document.getElementById('forgotEmail').value = '';
                document.getElementById('otpInput').value = '';
                document.getElementById('newPassword').value = '';
                document.getElementById('confirmPassword').value = '';
                
                showPage('loginPage');
            }, 2000);
        } else {
            errorDiv.textContent = data.message || 'Failed to reset password';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error';
        errorDiv.classList.add('show');
        console.error('Reset password error:', error);
    }
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
        loadUserIssues(); // Refresh stats
    } else if (section === 'report') {
        document.getElementById('reportSection').classList.add('active');
    } else if (section === 'issues') {
        document.getElementById('issuesSection').classList.add('active');
        loadUserIssues(); // Refresh issues list
    }
    
    // Always close sidebar when switching sections
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
}

async function handleIssueSubmit(event) {
    event.preventDefault();
    
    const errorDiv = document.getElementById('submitError');
    if (!errorDiv) {
        console.error('Error div not found');
        return false;
    }
    
    // Clear previous errors
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
    
    const issueTitle = document.getElementById('issueTitle').value.trim();
    const issueCategory = document.getElementById('issueCategory').value;
    const issueDescription = document.getElementById('issueDescription').value.trim();
    const issueFloor = document.getElementById('issueFloor').value;
    const issueClassNumber = document.getElementById('issueClassNumber').value.trim();
    const photoFile = document.getElementById('issuePhoto').files[0];
    
    // Validation
    if (!issueTitle) {
        errorDiv.textContent = 'Please enter an issue title';
        errorDiv.classList.add('show');
        return false;
    }
    
    if (!issueCategory) {
        errorDiv.textContent = 'Please select a category';
        errorDiv.classList.add('show');
        return false;
    }
    
    if (!issueDescription) {
        errorDiv.textContent = 'Please enter a description';
        errorDiv.classList.add('show');
        return false;
    }
    
    if (!issueFloor) {
        errorDiv.textContent = 'Please select a floor number';
        errorDiv.classList.add('show');
        return false;
    }

    if (!issueClassNumber) {
        errorDiv.textContent = 'Please enter a class/room number';
        errorDiv.classList.add('show');
        return false;
    }
    
    // Backend expects: userName, userType, userEmail, issueType, floor, classNumber, description, photo
    const issueData = {
        userName: currentUser?.name || 'User',
        userType: currentUserType || 'student',
        userEmail: currentUser?.email || 'unknown@college.edu',
        issueType: issueCategory,
        floor: issueFloor,
        classNumber: issueClassNumber,
        description: issueDescription,
        photo: null
    };
    
    // Convert photo to base64 if uploaded
    if (photoFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            issueData.photo = e.target.result;
            await submitDashboardIssue(issueData, errorDiv);
        };
        reader.readAsDataURL(photoFile);
    } else {
        await submitDashboardIssue(issueData, errorDiv);
    }
    
    return false;
}

async function submitDashboardIssue(issueData, errorDiv) {
    try {
        const response = await fetch(API_URL + '/issue/create', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + currentToken
            },
            body: JSON.stringify(issueData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear error messages
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');
            
            // Show success message
            const successDiv = document.createElement('div');
            successDiv.className = 'success-message show';
            successDiv.textContent = 'Issue submitted successfully!';
            errorDiv.parentNode.insertBefore(successDiv, errorDiv);
            
            // Reset form
            document.getElementById('issueForm').reset();
            const photoPreview = document.getElementById('photoPreview');
            if (photoPreview) {
                photoPreview.style.display = 'none';
            }
            
            // Close sidebar menu - use setTimeout to ensure DOM is updated
            setTimeout(() => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }, 100);
            
            // Reload issues and redirect
            setTimeout(() => {
                successDiv.remove();
                loadUserIssues();
                showDashboardSection('issues');
                // Ensure sidebar is closed
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.remove('active');
                }
            }, 1500);
        } else {
            errorDiv.textContent = 'Error: ' + (data.message || 'Failed to submit issue');
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Issue submit error:', error);
        errorDiv.textContent = 'Connection error. Please check if backend is running.';
        errorDiv.classList.add('show');
    }
}

async function submitIssue(issueData, successDiv, errorDiv) {
    try {
        const response = await fetch(API_URL + '/issue/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(issueData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear error messages
            if (errorDiv) {
                errorDiv.textContent = '';
                errorDiv.classList.remove('show');
            }
            
            successDiv.textContent = 'Issue reported successfully!';
            successDiv.classList.add('show');
            
            document.getElementById('issueForm').reset();
            document.getElementById('photoPreview').style.display = 'none';
            
            // Close sidebar menu if it's open
            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
                sidebar.classList.remove('active');
            }
            
            setTimeout(() => {
                successDiv.classList.remove('show');
                showDashboardSection('overview');
            }, 1500);
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Error: ' + (data.message || 'Failed to submit issue');
                errorDiv.classList.add('show');
            } else {
                alert('Error: ' + (data.message || 'Failed to submit issue'));
            }
        }
    } catch (error) {
        console.error('Issue submit error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Connection error. Please check if backend is running.';
            errorDiv.classList.add('show');
        } else {
            alert('Error submitting issue. Please try again.');
        }
    }
}

async function loadUserIssues() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(API_URL + '/issue/user/' + currentUser.email);
        const issues = await response.json();
        
        // Update stats with correct IDs
        document.getElementById('totalCount').textContent = issues.length;
        document.getElementById('pendingCount').textContent = issues.filter(i => i.status === 'pending' || i.status === 'assigned').length;
        document.getElementById('resolvedCount').textContent = issues.filter(i => i.status === 'resolved').length;
        
        // Separate active and resolved issues
        const activeIssues = issues.filter(i => i.status !== 'resolved');
        const resolvedIssues = issues.filter(i => i.status === 'resolved');
        
        const activeIssuesList = document.getElementById('activeIssuesList');
        const resolvedIssuesList = document.getElementById('resolvedIssuesList');
        
        // Display active issues
        if (activeIssues.length === 0) {
            activeIssuesList.innerHTML = '<div class="empty-state"><i class="fas fa-check"></i><p>All issues resolved!</p></div>';
        } else {
            activeIssuesList.innerHTML = buildIssuesHTML(activeIssues);
        }
        
        // Display resolved issues
        if (resolvedIssues.length === 0) {
            resolvedIssuesList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No resolved issues yet</p></div>';
        } else {
            resolvedIssuesList.innerHTML = buildIssuesHTML(resolvedIssues);
        }
    } catch (error) {
        console.error('Load issues error:', error);
    }
}

function buildIssuesHTML(issues) {
    let html = '';
    issues.forEach(issue => {
        const statusIcon = issue.status === 'resolved' ? 'fa-check-circle' : (issue.status === 'assigned' ? 'fa-hourglass-half' : 'fa-clock');
        
        html += '<div class="issue-item ' + issue.status + '" onclick="toggleIssueDetails(this)" style="cursor: pointer;">';
        
        // Header row with title, menu, and status
        html += '<div class="issue-header">';
        html += '<div style="display: flex; align-items: center; gap: 0.75rem; flex: 1;">';
        html += '<i class="fas fa-exclamation-circle" style="color: #f59e0b; font-size: 1.1rem;"></i>';
        html += '<span style="font-weight: 600; color: #1f2937; font-size: 1rem;">' + issue.issue_type + '</span>';
        html += '</div>';
        
        html += '<div class="issue-actions" style="display: flex; align-items: center; gap: 1rem;">';
        if (issue.status === 'pending') {
            html += '<button class="btn-menu" onclick="event.stopPropagation(); toggleIssueMenu(' + issue.id + ', this)" style="background: none; border: none; color: #6b7280; cursor: pointer; font-size: 1.2rem; padding: 0;">';
            html += '<i class="fas fa-ellipsis-v"></i>';
            html += '</button>';
            html += '<div class="issue-menu" id="menu-' + issue.id + '" style="display:none;">';
            html += '<button onclick="event.stopPropagation(); editIssue(' + issue.id + ')"><i class="fas fa-edit"></i> Edit</button>';
            html += '<button onclick="event.stopPropagation(); deleteIssue(' + issue.id + ')"><i class="fas fa-trash"></i> Delete</button>';
            html += '</div>';
        }
        html += '<span class="issue-status ' + issue.status + '" style="padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.8rem; font-weight: 700; white-space: nowrap;">';
        html += issue.status.toUpperCase();
        html += '</span>';
        html += '</div>';
        html += '</div>';
        
        // Details row - Floor, Class, Date (compact)
        html += '<div style="display: flex; gap: 1.5rem; margin-top: 0.75rem; font-size: 0.9rem; color: #6b7280; flex-wrap: wrap;">';
        html += '<div style="display: flex; align-items: center; gap: 0.4rem;">';
        html += '<i class="fas fa-building" style="color: #ef4444; font-size: 0.9rem;"></i>';
        html += '<span><strong>Floor</strong> ' + issue.floor + '</span>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 0.4rem;">';
        html += '<i class="fas fa-door-open" style="color: #ef4444; font-size: 0.9rem;"></i>';
        html += '<span><strong>Class</strong> ' + issue.class_number + '</span>';
        html += '</div>';
        html += '<div style="display: flex; align-items: center; gap: 0.4rem;">';
        html += '<i class="fas fa-calendar" style="color: #ef4444; font-size: 0.9rem;"></i>';
        html += '<span>' + new Date(issue.created_at).toLocaleDateString() + '</span>';
        html += '</div>';
        html += '</div>';
        
        // Description - collapsible
        html += '<div style="margin-top: 0.75rem; color: #4b5563; font-size: 0.9rem; line-height: 1.5;">';
        html += issue.description;
        html += '</div>';
        
        // Add photo if exists
        if (issue.photo) {
            html += '<div class="issue-photo" style="margin-top: 0.75rem;">';
            html += '<img src="' + issue.photo + '" style="max-width: 100%; max-height: 250px; border-radius: 6px; border: 1px solid #e5e7eb; cursor: pointer;" onclick="event.stopPropagation(); expandPhoto(this.src)">';
            html += '</div>';
        }
        
        html += '</div>';
    });
    return html;
}

function toggleIssueDetails(element) {
    element.classList.toggle('expanded');
}

function expandPhoto(src) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:3000;cursor:pointer;';
    modal.onclick = () => modal.remove();
    
    const img = document.createElement('img');
    img.src = src;
    img.style.cssText = 'max-width:90%;max-height:90%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    img.onclick = (e) => e.stopPropagation();
    
    modal.appendChild(img);
    document.body.appendChild(modal);
}

function toggleIssueMenu(issueId, button) {
    // Close all other menus first
    document.querySelectorAll('.issue-menu').forEach(menu => {
        if (menu.id !== 'menu-' + issueId) {
            menu.style.display = 'none';
        }
    });
    
    const menu = document.getElementById('menu-' + issueId);
    const isVisible = menu.style.display === 'block';
    
    // Close menu if clicking the same button again
    if (isVisible) {
        menu.style.display = 'none';
    } else {
        menu.style.display = 'block';
    }
}

// Close menus when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.issue-actions')) {
        document.querySelectorAll('.issue-menu').forEach(menu => {
            menu.style.display = 'none';
        });
    }
});

async function editIssue(issueId) {
    // Close menu
    document.getElementById('menu-' + issueId).style.display = 'none';
    
    // Get current issue data
    try {
        const response = await fetch('/api/issue/user/' + currentUser.email, {
            headers: {
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            }
        });
        const issues = await response.json();
        const issue = issues.find(i => i.id === issueId);
        
        if (!issue) {
            alert('Issue not found');
            return;
        }
        
        // Populate edit form
        document.getElementById('editIssueId').value = issue.id;
        document.getElementById('editIssueType').value = issue.issue_type;
        document.getElementById('editIssueFloor').value = issue.floor;
        document.getElementById('editIssueClass').value = issue.class_number;
        document.getElementById('editIssueDescription').value = issue.description;
        
        // Show edit modal
        document.getElementById('editIssueModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Error loading issue for edit:', error);
        alert('Error loading issue details');
    }
}

async function deleteIssue(issueId) {
    // Close menu
    document.getElementById('menu-' + issueId).style.display = 'none';
    
    if (confirm('Are you sure you want to delete this issue? This action cannot be undone.')) {
        try {
            const response = await fetch('/api/issue/delete/' + issueId, {
                method: 'DELETE',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('token')
                }
            });
            
            const data = await response.json();
            if (data.success) {
                alert('Issue deleted successfully!');
                loadUserIssues(); // Reload issues
            } else {
                alert('Error: ' + (data.message || 'Failed to delete issue'));
            }
        } catch (error) {
            console.error('Delete issue error:', error);
            alert('Error deleting issue');
        }
    }
}

async function saveIssueEdit(event) {
    event.preventDefault();
    
    const issueId = document.getElementById('editIssueId').value;
    const issueType = document.getElementById('editIssueType').value;
    const floor = document.getElementById('editIssueFloor').value;
    const classNumber = document.getElementById('editIssueClass').value;
    const description = document.getElementById('editIssueDescription').value;
    
    try {
        const response = await fetch('/api/issue/update/' + issueId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({
                issue_type: issueType,
                floor: floor,
                class_number: classNumber,
                description: description
            })
        });
        
        const data = await response.json();
        if (data.success) {
            alert('Issue updated successfully!');
            document.getElementById('editIssueModal').style.display = 'none';
            loadUserIssues(); // Reload issues
        } else {
            alert('Error: ' + (data.message || 'Failed to update issue'));
        }
    } catch (error) {
        console.error('Update issue error:', error);
        alert('Error updating issue');
    }
}

function closeEditModal() {
    document.getElementById('editIssueModal').style.display = 'none';
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

async function deleteTeacher(teacherId) {
    if (confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
        try {
            const response = await fetch(`${API_URL}/admin/teacher/${teacherId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Teacher deleted successfully!');
                loadAllTeachers();
            } else {
                alert('Error: ' + (data.message || 'Failed to delete teacher'));
            }
        } catch (error) {
            console.error('Delete teacher error:', error);
            alert('Connection error');
        }
    }
}

async function deleteStudent(studentId) {
    if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
        try {
            const response = await fetch(`${API_URL}/admin/student/${studentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`
                }
            });
            const data = await response.json();
            
            if (data.success) {
                alert('Student deleted successfully!');
                loadAllStudents();
            } else {
                alert('Error: ' + (data.message || 'Failed to delete student'));
            }
        } catch (error) {
            console.error('Delete student error:', error);
            alert('Connection error');
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
            html += '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Joined Date</th><th>Actions</th>';
            html += '</tr></thead><tbody>';
            
            teachers.forEach((teacher, index) => {
                html += '<tr>';
                html += '<td>' + (index + 1) + '</td>';
                html += '<td>' + teacher.name + '</td>';
                html += '<td>' + teacher.email + '</td>';
                html += '<td>' + teacher.phone + '</td>';
                html += '<td>' + new Date(teacher.created_at).toLocaleDateString() + '</td>';
                html += '<td class="action-cell">';
                html += '<button class="btn-action btn-delete" onclick="deleteTeacher(' + teacher.id + ')"><i class="fas fa-trash"></i> Delete</button>';
                html += '</td></tr>';
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
            html += '<th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>Course</th><th>Division</th><th>Joined Date</th><th>Actions</th>';
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
                html += '<td class="action-cell">';
                html += '<button class="btn-action btn-delete" onclick="deleteStudent(' + student.id + ')"><i class="fas fa-trash"></i> Delete</button>';
                html += '</td></tr>';
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
            // Show appropriate action: if resolved -> Done badge, else allow assign/reassign
            const st = (issue.status || '').toLowerCase();
            if (st === 'resolved' || st === 'done' || st === 'completed') {
                html += '<span class="badge done">Done</span>';
            } else {
                if (issue.technician_name) {
                    html += '<button class="btn-action" onclick="openAssignModal(' + issue.id + ')"><i class="fas fa-user-plus"></i> Reassign</button>';
                } else {
                    html += '<button class="btn-action" onclick="openAssignModal(' + issue.id + ')"><i class="fas fa-user-plus"></i> Assign</button>';
                }
            }
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
    try {
        const resp = await fetch(API_URL + '/admin/feedback-report', { headers: { 'Authorization': `Bearer ${currentToken}` } });
        const data = await resp.json();
        if (!data.success) {
            container.innerHTML = '<div class="empty-state"><p>Error loading feedback</p></div>';
            return;
        }

        let html = '<div class="data-table"><div class="table-header"><i class="fas fa-star"></i> Feedback Report</div>';
        html += '<div style="margin:1rem 0"><strong>Summary (per technician)</strong></div>';
        html += '<table class="data-table"><thead><tr><th>Technician</th><th>Avg Rating</th><th>Feedback Count</th></tr></thead><tbody>';
        (data.stats || []).forEach(s => {
            html += `<tr><td>${s.technician_name || 'Unassigned'}</td><td>${s.avg_rating || 0}</td><td>${s.feedback_count || 0}</td></tr>`;
        });
        html += '</tbody></table>';

        html += '<div style="margin-top:1rem"><strong>Recent Feedback</strong></div>';
        html += '<table class="data-table"><thead><tr><th>When</th><th>Issue ID</th><th>Technician</th><th>Rating</th><th>Comment</th></tr></thead><tbody>';
        (data.feedback || []).forEach(f => {
            html += `<tr><td>${new Date(f.created_at).toLocaleString()}</td><td>${f.issue_id}</td><td>${f.technician_name || 'N/A'}</td><td>${f.rating}</td><td>${(f.comment||'')}</td></tr>`;
        });
        html += '</tbody></table>';
        html += '</div>';

        container.innerHTML = html;
    } catch (err) {
        console.error('Load feedback report error:', err);
        container.innerHTML = '<div class="empty-state"><p>Error loading feedback</p></div>';
    }
}

// ========== FEEDBACK UI HANDLERS ==========
function openFeedbackCenter() {
    const modal = document.getElementById('feedbackModal');
    const listEl = document.getElementById('feedbackList');
    const formEl = document.getElementById('feedbackForm');
    listEl.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
    formEl.style.display = 'none';
    modal.classList.add('show');

    // fetch pending feedback issues for user
    fetch(API_URL + '/feedback/user/' + encodeURIComponent(currentUser.email))
        .then(r => r.json())
        .then(data => {
            if (!data.success) {
                listEl.innerHTML = '<div class="empty-state">No feedback items</div>';
                return;
            }
            const issues = data.issues || [];
            if (issues.length === 0) {
                listEl.innerHTML = '<div class="empty-state">No resolved issues awaiting feedback</div>';
                return;
            }
            let html = '<div style="display:flex;flex-direction:column;gap:0.5rem">';
            issues.forEach(i => {
                html += `<div style="padding:0.6rem;border:1px solid #e5e7eb;border-radius:8px;display:flex;justify-content:space-between;align-items:center"><div><strong>#${i.id} - ${i.issue_type}</strong><div style="font-size:0.9rem;color:#6b7280">${i.description || ''}</div></div><div><button class="btn btn-primary" onclick="startFeedback(${i.id})">Give Feedback</button></div></div>`;
            });
            html += '</div>';
            listEl.innerHTML = html;
        })
        .catch(err => {
            console.error('Open feedback error:', err);
            listEl.innerHTML = '<div class="empty-state">Error loading items</div>';
        });
}

function closeFeedbackCenter() {
    const modal = document.getElementById('feedbackModal');
    modal.classList.remove('show');
}

function startFeedback(issueId) {
    // show form and attach issue id
    document.getElementById('feedbackForm').style.display = 'block';
    document.getElementById('feedbackList').style.display = 'none';
    // store current issue id on form element
    document.getElementById('feedbackForm').setAttribute('data-issue-id', issueId);
    // reset stars and comment
    setStarRating(0);
    document.getElementById('feedbackComment').value = '';
}

function setStarRating(value) {
    const stars = document.querySelectorAll('#starRating .star');
    stars.forEach(s => {
        const v = parseInt(s.getAttribute('data-value'), 10);
        if (v <= value) s.classList.add('active'); else s.classList.remove('active');
    });
    document.getElementById('feedbackForm').setAttribute('data-rating', value);
}

document.addEventListener('click', function(e) {
    if (e.target.matches('#starRating .star')) {
        const v = parseInt(e.target.getAttribute('data-value'), 10);
        setStarRating(v);
    }
});

async function submitFeedback() {
    const form = document.getElementById('feedbackForm');
    const issueId = form.getAttribute('data-issue-id');
    const rating = parseInt(form.getAttribute('data-rating') || '0', 10);
    const comment = document.getElementById('feedbackComment').value || '';
    if (!issueId || !rating || rating < 1) {
        alert('Please select a rating (1-5)');
        return;
    }
    try {
        const resp = await fetch(API_URL + '/feedback/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ issue_id: parseInt(issueId, 10), user_email: currentUser.email, rating, comment })
        });
        const data = await resp.json();
        if (data.success) {
            alert('Thank you for your feedback');
            closeFeedbackCenter();
            // refresh admin feedback tab and pending banner
            await loadFeedbackReport();
            await loadPendingFeedback();
        } else {
            alert('Error: ' + (data.message || 'Unable to submit feedback'));
        }
    } catch (err) {
        console.error('Submit feedback error:', err);
        alert('Connection error while submitting feedback');
    }
}

// ========== ANALYTICS ==========

let analyticsCharts = {};

async function loadAnalytics() {
    const container = document.getElementById('analyticsTab');
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading analytics...</div>';
    
    try {
        // Fetch all analytics data in parallel
        const [summary, issuesByType, issuesByStatus, techPerf, trend, resTime, userDist] = await Promise.all([
            fetch(API_URL + '/analytics/summary', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/issues-by-type', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/issues-by-status', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/technician-performance', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/issues-trend', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/resolution-time-by-type', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/user-distribution', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json())
        ]);

        let html = `
            <div class="analytics-container">
                <div class="analytics-header">
                    <h1><i class="fas fa-chart-line"></i> Analytics Dashboard</h1>
                    <div class="analytics-actions">
                        <button class="btn btn-primary" onclick="exportAnalyticsPDF()"><i class="fas fa-file-pdf"></i> Export PDF</button>
                        <button class="btn btn-primary" onclick="exportAnalyticsExcel()"><i class="fas fa-file-excel"></i> Export Excel</button>
                    </div>
                </div>

                <!-- Summary Cards -->
                <div class="analytics-summary">
                    <div class="summary-card">
                        <div class="card-icon" style="background:#3b82f6;"><i class="fas fa-exclamation-circle"></i></div>
                        <div class="card-content">
                            <h3>${summary.total_issues}</h3>
                            <p>Total Issues</p>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon" style="background:#10b981;"><i class="fas fa-check-circle"></i></div>
                        <div class="card-content">
                            <h3>${summary.resolved_issues}</h3>
                            <p>Resolved (${summary.resolution_rate}%)</p>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon" style="background:#f59e0b;"><i class="fas fa-clock"></i></div>
                        <div class="card-content">
                            <h3>${summary.avg_resolution_time_days} days</h3>
                            <p>Avg Resolution Time</p>
                        </div>
                    </div>
                    <div class="summary-card">
                        <div class="card-icon" style="background:#8b5cf6;"><i class="fas fa-users"></i></div>
                        <div class="card-content">
                            <h3>${summary.total_technicians}</h3>
                            <p>Active Technicians</p>
                        </div>
                    </div>
                </div>

                <!-- Charts Row 1 -->
                <div class="analytics-charts-row">
                    <div class="chart-container" style="flex:1;">
                        <h3>Issues Trend (Last 30 Days)</h3>
                        <canvas id="trendChart"></canvas>
                    </div>
                    <div class="chart-container" style="flex:1;">
                        <h3>Issues by Status</h3>
                        <canvas id="statusChart"></canvas>
                    </div>
                </div>

                <!-- Charts Row 2 -->
                <div class="analytics-charts-row">
                    <div class="chart-container" style="flex:1;">
                        <h3>Issues by Type</h3>
                        <canvas id="typeChart"></canvas>
                    </div>
                    <div class="chart-container" style="flex:1;">
                        <h3>Avg Resolution Time by Type</h3>
                        <canvas id="resolutionChart"></canvas>
                    </div>
                </div>

                <!-- Technician Progress Chart + Performance Table -->
                <div class="analytics-charts-row">
                    <div class="chart-container" style="flex:1; grid-column: 1 / -1;">
                        <h3>Technician Progress (Completed / Assigned)</h3>
                        <canvas id="techProgressChart"></canvas>
                    </div>
                </div>

                <div class="analytics-table">
                    <h3><i class="fas fa-tools"></i> Technician Performance</h3>
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Technician</th>
                                <th>Specialization</th>
                                <th>Total Assigned</th>
                                <th>Completed</th>
                                <th>Avg Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${techPerf.data.map(t => `
                                <tr>
                                    <td>${t.name}</td>
                                    <td>${t.specialization}</td>
                                    <td>${t.total_assigned}</td>
                                    <td>${t.completed}</td>
                                    <td><span style="color:#f59e0b;"><i class="fas fa-star"></i> ${t.avg_rating}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- User Distribution Table -->
                <div class="analytics-table">
                    <h3><i class="fas fa-users"></i> User Distribution</h3>
                    <table class="data-table">
                        <tr><td><strong>Teachers (Active)</strong></td><td>${summary.total_teachers}</td></tr>
                        <tr><td><strong>Students</strong></td><td>${summary.total_students}</td></tr>
                        <tr><td><strong>Technicians</strong></td><td>${summary.total_technicians}</td></tr>
                    </table>
                </div>
            </div>
        `;

        container.innerHTML = html;

        // Initialize charts
        setTimeout(() => {
            initTrendChart(trend.data);
            initStatusChart(issuesByStatus.data);
            initTypeChart(issuesByType.data);
            initResolutionChart(resTime.data);
            initTechnicianProgressChart(techPerf.data);
        }, 100);

    } catch (error) {
        console.error('Load analytics error:', error);
        container.innerHTML = '<div class="empty-state"><p>Error loading analytics</p></div>';
    }
}

function initTrendChart(data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;
    if (analyticsCharts.trend) analyticsCharts.trend.destroy();
    
    analyticsCharts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.date),
            datasets: [{
                label: 'Issues Created',
                data: data.map(d => d.count),
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function initStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;
    if (analyticsCharts.status) analyticsCharts.status.destroy();
    
    const colors = { 'pending': '#f59e0b', 'assigned': '#3b82f6', 'resolved': '#10b981', 'closed': '#6b7280' };
    
    analyticsCharts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: Object.keys(data).map(k => colors[k] || '#8b5cf6')
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function initTypeChart(data) {
    const ctx = document.getElementById('typeChart');
    if (!ctx) return;
    if (analyticsCharts.type) analyticsCharts.type.destroy();
    
    analyticsCharts.type = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.type),
            datasets: [
                {
                    label: 'Total',
                    data: data.map(d => d.count),
                    backgroundColor: '#3b82f6'
                },
                {
                    label: 'Resolved',
                    data: data.map(d => d.resolved),
                    backgroundColor: '#10b981'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: true } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

function initResolutionChart(data) {
    const ctx = document.getElementById('resolutionChart');
    if (!ctx) return;
    if (analyticsCharts.resolution) analyticsCharts.resolution.destroy();
    
    analyticsCharts.resolution = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.type),
            datasets: [{
                label: 'Days',
                data: data.map(d => d.avg_resolution_days),
                backgroundColor: '#f59e0b'
            }]
        },
        options: {
            responsive: true,
            indexAxis: 'y',
            scales: { x: { beginAtZero: true } }
        }
    });
}

function initTechnicianProgressChart(data) {
    const ctx = document.getElementById('techProgressChart');
    if (!ctx) return;
    if (analyticsCharts.techProgress) analyticsCharts.techProgress.destroy();
    // Normalize and compute completion rate, then sort by rate desc
    const normalized = (data || []).map(t => {
        const assigned = parseInt(t.total_assigned || 0, 10);
        const completed = parseInt(t.completed || 0, 10);
        const rate = assigned > 0 ? (completed / assigned) : 0;
        return {
            id: t.technician_id || t.technician_id,
            name: t.name || ('Tech ' + (t.technician_id || '')),
            assigned,
            completed,
            rate
        };
    }).sort((a, b) => {
        if (b.rate === a.rate) return b.completed - a.completed;
        return b.rate - a.rate;
    });

    const labels = normalized.map(t => t.name);
    const assigned = normalized.map(t => t.assigned);
    const completed = normalized.map(t => t.completed);
    const remaining = normalized.map((t, i) => Math.max(0, assigned[i] - completed[i]));

    // custom plugin to draw percentage labels on completed bars
    const percentLabelPlugin = {
        id: 'percentLabels',
        afterDatasetsDraw(chart, args, options) {
            const { ctx } = chart;
            ctx.save();
            const metaCompleted = chart.getDatasetMeta(0);
            for (let i = 0; i < metaCompleted.data.length; i++) {
                const bar = metaCompleted.data[i];
                const comp = completed[i] || 0;
                const tot = assigned[i] || 0;
                const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;
                const label = pct + '%';

                // bar coordinates
                const x = bar.x;
                const y = bar.y;
                const height = bar.base - bar.y; // positive height

                ctx.fillStyle = '#ffffff';
                ctx.font = '600 12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // If bar is tall enough, draw inside bar; otherwise draw above
                if (height > 18) {
                    ctx.fillText(label, x, y + height / 2 - height / 2 + 0);
                } else {
                    ctx.fillText(label, x, y - 8);
                }
            }
            ctx.restore();
        }
    };

    analyticsCharts.techProgress = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Completed',
                    data: completed,
                    backgroundColor: '#10b981'
                },
                {
                    label: 'Remaining',
                    data: remaining,
                    backgroundColor: '#94a3b8'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            const label = ctx.dataset.label || '';
                            return label + ': ' + ctx.parsed.y;
                        }
                    }
                }
            },
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            }
        },
        plugins: [percentLabelPlugin]
    });
}

async function exportAnalyticsPDF() {
    try {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Technical Issue Tracker - Analytics Report', 20, 20);
        doc.setFontSize(10);
        doc.text('Generated on: ' + new Date().toLocaleString(), 20, 30);
        
        // Fetch summary data
        const resp = await fetch(API_URL + '/analytics/summary', { 
            headers: { 'Authorization': `Bearer ${currentToken}` } 
        });
        const summary = await resp.json();
        
        let yPos = 50;
        doc.setFontSize(12);
        doc.text('Summary Statistics', 20, yPos);
        yPos += 10;
        
        const summaryData = [
            ['Total Issues', summary.total_issues],
            ['Resolved Issues', summary.resolved_issues],
            ['Pending Issues', summary.pending_issues],
            ['Resolution Rate', summary.resolution_rate + '%'],
            ['Avg Resolution Time', summary.avg_resolution_time_days + ' days'],
            ['Total Teachers', summary.total_teachers],
            ['Total Students', summary.total_students],
            ['Total Technicians', summary.total_technicians]
        ];
        
        doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: summaryData
        });
        
        doc.save('analytics-report.pdf');
        alert('PDF exported successfully!');
    } catch (error) {
        console.error('PDF export error:', error);
        alert('Error exporting PDF');
    }
}

async function exportAnalyticsExcel() {
    try {
        // Fetch all analytics data
        const [summary, issuesByType, techPerf] = await Promise.all([
            fetch(API_URL + '/analytics/summary', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/issues-by-type', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json()),
            fetch(API_URL + '/analytics/technician-performance', { headers: { 'Authorization': `Bearer ${currentToken}` } }).then(r => r.json())
        ]);
        
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Summary
        const summaryData = [
            ['Metric', 'Value'],
            ['Total Issues', summary.total_issues],
            ['Resolved Issues', summary.resolved_issues],
            ['Pending Issues', summary.pending_issues],
            ['Resolution Rate %', summary.resolution_rate],
            ['Avg Resolution Time (days)', summary.avg_resolution_time_days],
            ['Total Teachers', summary.total_teachers],
            ['Total Students', summary.total_students],
            ['Total Technicians', summary.total_technicians]
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Summary');
        
        // Sheet 2: Issues by Type
        const typeData = [['Issue Type', 'Total Count', 'Resolved']].concat(
            issuesByType.data.map(d => [d.type, d.count, d.resolved])
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(typeData), 'Issues by Type');
        
        // Sheet 3: Technician Performance
        const techData = [['Technician', 'Specialization', 'Total Assigned', 'Completed', 'Avg Rating']].concat(
            techPerf.data.map(t => [t.name, t.specialization, t.total_assigned, t.completed, t.avg_rating])
        );
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(techData), 'Technician Performance');
        
        XLSX.writeFile(wb, 'analytics-report.xlsx');
        alert('Excel report exported successfully!');
    } catch (error) {
        console.error('Excel export error:', error);
        alert('Error exporting Excel');
    }
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

// ========== PHOTO PREVIEW SETUP ==========
document.addEventListener('DOMContentLoaded', function() {
    const photoInput = document.getElementById('issuePhoto');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const preview = document.getElementById('photoPreview');
                    const previewImg = document.getElementById('previewImg');
                    previewImg.src = event.target.result;
                    preview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });
    }
});

// ========== LOGOUT ==========

function logout() {
    currentUser = null;
    currentUserType = null;
    currentToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserType');
    localStorage.removeItem('currentToken');
    
    // Clear page and redirect immediately
    document.body.innerHTML = '';
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 100);
}

function closeDashboard() {
    // Clear session and redirect to home
    currentUser = null;
    currentUserType = null;
    currentToken = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentUserType');
    localStorage.removeItem('currentToken');
    
    // Redirect to home page
    window.location.href = 'index.html';
}

// ========== INITIALIZE ==========

document.addEventListener('DOMContentLoaded', function() {
    checkStoredLogin();
    
    // Setup photo preview for issue form
    const photoInput = document.getElementById('issuePhoto');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const photoPreview = document.getElementById('photoPreview');
            const previewImg = document.getElementById('previewImg');
            
            if (file) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    previewImg.src = event.target.result;
                    photoPreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                photoPreview.style.display = 'none';
            }
        });
    }
    
    // Close sidebar when clicking outside
    document.addEventListener('click', function(event) {
        const sidebar = document.getElementById('sidebar');
        const menuToggle = document.querySelector('.menu-toggle');
        
        if (sidebar && sidebar.classList.contains('active')) {
            // Check if click is outside sidebar and menu toggle button
            if (menuToggle && !menuToggle.contains(event.target) && !sidebar.contains(event.target)) {
                sidebar.classList.remove('active');
            }
        }
    });
    
    // Any initialization code can go here
    console.log('College Technical Issue Tracker Loaded');
});
