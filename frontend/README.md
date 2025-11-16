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

### **Teacher/Student**
- Register new accounts through the application
- Teachers need admin approval before login
- Students can login immediately after registration

---

## 📋 Features

### ✅ **Admin Panel**
- View and approve/reject teacher registration requests
- View all registered teachers
- View all registered students
- Monitor all reported technical issues
- Real-time dashboard updates

### ✅ **Teacher Portal**
- Self-registration with admin approval workflow
- Login with email and password
- Report technical issues with details:
  - Issue type (Computer/WiFi/Digital Board/Other)
  - Floor number (1-5)
  - Class/Room number
  - Detailed description
- Track all reported issues and their status
- Forgot password functionality

### ✅ **Student Portal**
- Self-registration (instant activation)
- Course selection (MCA/MBA)
- Division selection (A/B/C)
- Report technical issues
- Track issue resolution status
- User-friendly dashboard

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

### **Teachers Table**
```sql
- id (Primary Key)
- name
- phone
- email (Unique)
- password (Hashed)
- status (pending/approved)
- created_at
```

### **Students Table**
```sql
- id (Primary Key)
- name
- phone
- email (Unique)
- password (Hashed)
- course (MCA/MBA)
- division (A/B/C)
- created_at
```

### **Issues Table**
```sql
- id (Primary Key)
- user_name
- user_type (teacher/student)
- user_email
- issue_type
- floor
- class_number
- description
- status (pending/resolved)
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

- [ ] Email notifications
- [ ] Issue resolution workflow
- [ ] File attachment support
- [ ] Mobile app (React Native/Flutter)
- [ ] Advanced reporting and analytics
- [ ] Real-time notifications
- [ ] Multi-language support
- [ ] PDF report generation
- [ ] Issue assignment to maintenance staff
- [ ] SMS alerts
- [ ] Dark mode theme

---

## 🎯 Project Highlights

✅ **Professional Design** - Modern UI/UX with gradient effects
✅ **Secure Authentication** - Password hashing and validation
✅ **Role-Based Access** - Admin, Teacher, Student portals
✅ **Complete CRUD** - Create, Read, Update, Delete operations
✅ **Real Database** - SQLite with proper relationships
✅ **Responsive** - Works on all devices
✅ **Production Ready** - Error handling and validation

---

**Made with ❤️ for Educational Excellence**