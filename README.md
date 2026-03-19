# 🎓 College Technical Issue Tracker

**Professional Issue Management System** for Educational Institutions

---

## 📁 Project Structure

```
college-issue-tracker/
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   └── database.db (auto-created)
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── README.md
```

---

## 🚀 Installation & Setup

### **Step 1: Setup Backend (Python Flask)**

```bash
# Create project folders
mkdir college-issue-tracker
cd college-issue-tracker
mkdir backend frontend

# Navigate to backend folder
cd backend

# Create app.py file and paste the backend code

# Create requirements.txt file and paste dependencies

# Create virtual environment (Optional but recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the backend server
python app.py
```

**Backend will run on:** `http://localhost:5000`

---

### **Step 2: Setup Frontend (HTML/CSS/JS)**

```bash
# Navigate to frontend folder
cd ../frontend

# Create three files:
# 1. index.html (paste HTML code)
# 2. style.css (paste CSS code)
# 3. script.js (paste JavaScript code)
```

---

### **Step 3: Run the Application**

#### **Option A: Using Python HTTP Server**
```bash
# Navigate to frontend folder
cd frontend

# Start simple HTTP server
python -m http.server 8000
```

**Open browser:** `http://localhost:8000`

#### **Option B: Using VS Code Live Server**
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Click "Open with Live Server"

#### **Option C: Direct File Opening**
- Simply double-click `index.html` file
- (Note: May have CORS issues with some browsers)

---

## 🔑 Default Login Credentials

### **Admin Login**
- **Email:** `admin@college.edu`
- **Password:** `admin123`

### **Technician Login**
- **Email:** `admin@gmail.com`
- **Password:** `admin123`

### **Teacher/Student**
- Register new accounts through the application
- Teachers need admin approval before login
- Students can login immediately after registration

---

## 📋 Features

### ✅ **Admin Panel**
- **Pending Approvals** - View and approve/reject teacher registration requests
- **Teachers Management** - View all teachers with delete functionality
- **Students Management** - View all students with delete functionality
- **Technicians Management** - View all technicians
- **All Issues** - Monitor all reported issues with status tracking and Done badges
- **Issue Assignment** - Assign unresolved issues to technicians with notifications
- **Feedback Reports** - View technician ratings, feedback summaries, and detailed feedback entries
- **Analytics Dashboard** - 
  - Issue summary (total, pending, resolved)
  - Issues by type (pie chart)
  - Issues by status (doughnut chart)
  - Technician performance metrics
  - Issues trend over time (line chart)
  - Resolution time by issue type
  - User distribution analysis
  - Technician progress chart with completion percentages
  - Export to PDF and Excel

### ✅ **Technician Portal**
- **My Tasks Dashboard** - View all assigned issues with status
- **Task Filters** - Filter tasks (All, Assigned, Completed)
- **Mark Resolved** - Mark issues as resolved with automatic feedback prompt to users
- **Notifications** - Real-time notifications for new task assignments
- **Performance Metrics** - View total tasks, pending tasks, completed tasks, and average rating
- **Feedback Reception** - Receive ratings (1-5 stars) and comments from users after issue resolution

### ✅ **Teacher Portal**
- Self-registration with admin approval workflow
- Login with email and password
- **Report Technical Issues** with details:
  - Issue type (Computer/WiFi/Digital Board/Other)
  - Floor number (1-5)
  - Class/Room number
  - Detailed description
- Track all reported issues and their status
- **Feedback System** - Rate resolved issues (1-5 stars) and provide comments
- **Forgot Password** - Reset password with OTP verification
- Real-time dashboard with issue statistics

### ✅ **Student Portal**
- Self-registration (instant activation)
- Course selection (MCA/MBA)
- Division selection (A/B/C)
- Report technical issues
- Track issue resolution status
- **Feedback System** - Rate technicians and provide comments
- **Forgot Password** - Secure password reset with OTP
- User-friendly dashboard with issue tracking

---

## 🛠️ Technical Stack

### **Frontend**
- HTML5
- CSS3 (Modern, Responsive Design)
- Vanilla JavaScript (ES6+)
- Font Awesome Icons
- Gradient & Glassmorphism UI

### **Backend**
- Python 3.x
- Flask (Web Framework)
- Flask-CORS (Cross-Origin Support)
- SQLite3 (Database)
- SHA-256 Password Hashing

---

## 🗄️ Database Schema

### **Complete ER Diagram**

```
╔════════════════════════════════════════════════════════════════════════════════════╗
║                    COLLEGE TECHNICAL ISSUE TRACKER - ER DIAGRAM                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DATABASE ENTITIES & RELATIONSHIPS                                       │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


                           ┏━━━━━━━━━━━━━━━━━━━━┓
                           ┃      ADMIN         ┃
                           ┣━━━━━━━━━━━━━━━━━━━━┫
                           ┃ ★ id (PK)          ┃
                           ┃   email (UNIQUE)   ┃
                           ┃   password         ┃
                           ┃   name             ┃
                           ┃   created_at       ┃
                           ┗━━━━━━━━━━━━━━━━━━━━┛
                                    │
                                    │ manages everything
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    │               │               │
        ┌───────────▼──────────┐    │    ┌──────────▼─────────┐
        ┃    TEACHERS          ┃    │    ┃  TECHNICIANS       ┃
        ┣──────────────────────┫    │    ┣────────────────────┫
        ┃ ★ id (PK)            ┃    │    ┃ ★ id (PK)          ┃
        ┃   name               ┃    │    ┃   name             ┃
        ┃   email (UNIQUE)     ┃    │    ┃   email (UNIQUE)   ┃
        ┃   password (hashed)  ┃    │    ┃   password (hash)  ┃
        ┃   phone              ┃    │    ┃   phone            ┃
        ┃   status             ┃    │    ┃   specialization   ┃
        ┃   (pending/approved) ┃    │    ┃   created_at       ┃
        ┃   created_at         ┃    │    ┗────────────────────┛
        ┗───────┬──────────────┘    │           ▲
                │                   │           │
                │                   │    assigned_to
                │                   │           │
                │        ┌──────────▼───────────┤
                │        │                      │
                │   ┌────▼──────────────────┐   │
                │   ┃      ISSUES           ┃   │
                │   ┣───────────────────────┫   │
                │   ┃ ★ id (PK)             ┃   │
                │   ┃   user_email          ┃───┼──> reports issue
                │   ┃   user_type           ┃   │
                │   ┃   (teacher/student)   ┃   │
                │   ┃   issue_type          ┃   │
                │   ┃   floor               ┃   │
                │   ┃   class_number        ┃   │
                │   ┃   description         ┃   │
                │   ┃   status              ┃   │
                │   ┃   (pending/assigned   ┃   │
                │   ┃    /resolved)         ┃   │
                │   ┃   assigned_to (FK)◄───┘   │
                │   ┃   resolved_at         ┃   │
                │   ┃   created_at          ┃   │
                │   ┗───────┬────────────────┘   │
                │           │                    │
                │           │ has feedback       │
                │           │                    │
                │       ┌───▼────────────────┐   │
                │       ┃    FEEDBACK        ┃   │
                │       ┣────────────────────┫   │
                │       ┃ ★ id (PK)          ┃   │
                │       ┃   issue_id (FK)◄───┤   │
                │       ┃   user_email       ┃   │
                │       ┃   rating (1-5)     ┃   │
                │       ┃   comment          ┃   │
                │       ┃   created_at       ┃   │
                │       ┗────────────────────┘   │
                │                                │
        ┌───────▼──────────┐                     │
        ┃    STUDENTS      ┃                     │
        ┣──────────────────┫                     │
        ┃ ★ id (PK)        ┃                     │
        ┃   name           ┃─────────────────────┘
        ┃   email(UNIQUE)  ┃   reports issue
        ┃   password(hash) ┃
        ┃   phone          ┃
        ┃   course         ┃
        ┃   (MCA/MBA)      ┃
        ┃   division       ┃
        ┃   (A/B/C)        ┃
        ┃   created_at     ┃
        ┗──────────────────┘


                    ┌────────────────────────────────────┐
                    │   NOTIFICATIONS (Central Hub)      │
                    ├────────────────────────────────────┤
                    │ ★ id (PK)                          │
                    │   user_email (linked to any user)  │
                    │   user_type (admin/teacher/        │
                    │              student/technician)   │
                    │   title                            │
                    │   message                          │
                    │   is_read (0/1)                    │
                    │   created_at                       │
                    └────────────────────────────────────┘
                              ▲
                    ┌─────────┼─────────┐
                    │         │         │
                    │         │         │
            notifies   notifies  notifies
            teacher    student  technician
                    │         │         │


╔════════════════════════════════════════════════════════════════════════════════════╗
║                              RELATIONSHIPS SUMMARY                                 ║
╠════════════════════════════════════════════════════════════════════════════════════╣
║ 1. ADMIN → ALL ENTITIES                                                            ║
║    • Creates/approves/rejects Teachers                                             ║
║    • Manages all Students                                                          ║
║    • Manages all Technicians                                                       ║
║    • Assigns Issues to Technicians                                                 ║
║    • Views/manages Feedback                                                        ║
║                                                                                    ║
║ 2. TEACHERS ↔ ISSUES                                                               ║
║    • Teachers report Issues                                                        ║
║    • status: pending/approved (by Admin)                                           ║
║    • Receive Notifications when issue assigned/resolved                            ║
║    • Can provide Feedback (rating/comment)                                         ║
║                                                                                    ║
║ 3. STUDENTS ↔ ISSUES                                                               ║
║    • Students report Issues                                                        ║
║    • Auto-approved (instant activation)                                            ║
║    • Receive Notifications when issue assigned/resolved                            ║
║    • Can provide Feedback (rating/comment)                                         ║
║                                                                                    ║
║ 4. TECHNICIANS ↔ ISSUES                                                            ║
║    • Assigned Issues by Admin                                                      ║
║    • Can Mark Issues as Resolved                                                   ║
║    • Receive Notifications for assignments                                         ║
║    • Receive Ratings/Feedback from Users                                           ║
║                                                                                    ║
║ 5. ISSUES ↔ FEEDBACK                                                               ║
║    • Each resolved Issue can have multiple Feedback entries                         ║
║    • Feedback contains: rating (1-5), comment, timestamp                           ║
║    • Admin views aggregated feedback per Technician                                ║
║                                                                                    ║
║ 6. ALL USERS ↔ NOTIFICATIONS                                                       ║
║    • Notifications sent to: Admin, Teachers, Students, Technicians                 ║
║    • Events: Issue reported, assigned, resolved, feedback received                 ║
║    • Real-time updates with read/unread status                                     ║
║                                                                                    ║
╚════════════════════════════════════════════════════════════════════════════════════╝

KEY:
★ = Primary Key (PK)
→ = Relationship/Reference
(FK) = Foreign Key
```

### **Detailed Table Specifications**

### **Admin Table** (NEW)
```sql
- id (Primary Key)
- email (Unique)
- password (Hashed with bcrypt)
- name
- created_at
```

### **Teachers Table**
```sql
- id (Primary Key)
- name
- phone
- email (Unique)
- password (Hashed with bcrypt)
- status (pending/approved) - Admin approval required
- created_at
```

### **Students Table**
```sql
- id (Primary Key)
- name
- phone
- email (Unique)
- password (Hashed with bcrypt)
- course (MCA/MBA)
- division (A/B/C)
- created_at
```

### **Technicians Table**
```sql
- id (Primary Key)
- name
- email (Unique)
- password (Hashed with bcrypt)
- phone
- specialization
- created_at
```

### **Issues Table**
```sql
- id (Primary Key)
- user_name
- user_type (teacher/student)
- user_email
- issue_type (Computer/WiFi/Digital Board/Other)
- floor (1-5)
- class_number
- description
- status (pending/assigned/resolved)
- assigned_to (Foreign Key → Technicians.id, nullable)
- resolved_at (timestamp, nullable)
- created_at
```

### **Notifications Table**
```sql
- id (Primary Key)
- user_email
- user_type (admin/teacher/student/technician)
- title
- message
- is_read (0=unread, 1=read)
- created_at
```

### **Feedback Table**
```sql
- id (Primary Key)
- issue_id (Foreign Key → Issues.id)
- user_email
- rating (1-5 stars)
- comment (optional)
- created_at
```

---

## 🎨 UI Features

- ✨ Modern gradient design
- 📱 Fully responsive (Mobile, Tablet, Desktop)
- 🎭 Smooth animations and transitions
- 🎨 Professional color scheme
- 📊 Interactive dashboard with statistics
- 🔔 Real-time status updates
- 🖼️ Beautiful hero section with college background

---

## 🔒 Security Features

- Password hashing (SHA-256)
- SQL injection protection (parameterized queries)
- CORS enabled for secure API calls
- Input validation on both frontend and backend
- Error handling and user feedback

---

## 📱 Responsive Design

- **Desktop:** Full-featured layout
- **Tablet:** Optimized grid layout
- **Mobile:** Stacked layout with hamburger menu

---

## 🐛 Troubleshooting

### **Backend not starting?**
```bash
# Check if Python is installed
python --version

# Check if dependencies are installed
pip list

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### **Frontend not connecting to backend?**
- Make sure backend is running on port 5000
- Check browser console for errors
- Verify CORS is enabled
- Check `API_URL` in `script.js`

### **Database errors?**
- Delete `database.db` file
- Restart backend (will recreate database)

---

## 📧 Contact & Support

For any issues or questions, contact:
- **Email:** support@technical-institute.edu
- **Phone:** +91 20 1234 5678

---

## 📄 License

This project is created for educational purposes.

---

## 🌟 Future Enhancements

- [ ] Email notifications (actual email sending)
- [ ] File attachment support for issues
- [ ] Mobile app (React Native/Flutter)
- [ ] WebSocket for real-time updates
- [ ] Advanced reporting and analytics enhancements
- [ ] SMS alerts
- [ ] Dark mode theme
- [ ] Issue priority levels
- [ ] SLA tracking for issues
- [ ] Department-wise issue categorization
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Two-factor authentication

---

## 🎯 Project Highlights

✅ **Professional Design** - Modern UI/UX with gradient effects and responsive layouts
✅ **Secure Authentication** - Password hashing, JWT tokens, and OTP-based password reset
✅ **Role-Based Access** - Admin, Technician, Teacher, and Student portals
✅ **Issue Management** - Complete CRUD with assignment workflow and status tracking
✅ **Technician Portal** - Task management, notifications, and performance metrics
✅ **Feedback System** - 1-5 star ratings and comments from users
✅ **Analytics Dashboard** - 7+ charts with visualization, trend analysis, and exports
✅ **Real Database** - SQLite with proper relationships and referential integrity
✅ **Responsive Design** - Works on desktop, tablet, and mobile devices
✅ **Admin Management** - Delete users, approve teachers, assign issues
✅ **Notification System** - Real-time updates for task assignments and status changes
✅ **Mobile Compatible** - Dynamic API URL detection for network access
✅ **Production Ready** - Error handling, validation, and security best practices

---

**Made with ❤️ for Educational Excellence**
