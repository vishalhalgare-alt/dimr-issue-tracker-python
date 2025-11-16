# app.py
import os
import sqlite3
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS

# -------- CONFIG --------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database.db')
FRONTEND_DIR = os.path.join(BASE_DIR, '..', 'frontend')  # ../frontend
JWT_SECRET = os.environ.get('JWT_SECRET', 'replace_this_with_a_strong_secret')
JWT_ALGORITHM = 'HS256'
JWT_EXP_DAYS = 7

# Admin creds (for demo only) - you can change or load from env later
ADMIN_EMAIL = "admin@college.edu"
ADMIN_PASSWORD_PLAIN = "admin123"  # demo only
# store admin hashed
ADMIN_PASSWORD_HASH = bcrypt.hashpw(ADMIN_PASSWORD_PLAIN.encode(), bcrypt.gensalt())

# -------- APP SETUP --------
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

# -------- DB HELPERS --------
def get_db():
    if 'db' not in g:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        # enforce foreign keys
        conn.execute('PRAGMA foreign_keys = ON;')
        g.db = conn
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('PRAGMA foreign_keys = ON;')

    # users tables
    c.execute('''
    CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    c.execute('''
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        course TEXT NOT NULL,
        division TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    c.execute('''
    CREATE TABLE IF NOT EXISTS technicians (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        specialization TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    c.execute('''
    CREATE TABLE IF NOT EXISTS issues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_name TEXT NOT NULL,
        user_type TEXT NOT NULL,
        user_email TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        floor TEXT NOT NULL,
        class_number TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        assigned_to INTEGER,
        priority TEXT DEFAULT 'normal',
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES technicians(id) ON DELETE SET NULL
    )
    ''')
    c.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        user_type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    c.execute('''
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    )
    ''')
    conn.commit()
    conn.close()
    print("✓ Database initialized/checked")

init_db()

# --------- AUTH HELPERS ---------
def create_token(data, days=JWT_EXP_DAYS):
    payload = data.copy()
    payload['exp'] = datetime.utcnow() + timedelta(days=days)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        return None
    except Exception:
        return None

def auth_required(role=None):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            auth = request.headers.get('Authorization', None)
            if not auth or not auth.startswith('Bearer '):
                return jsonify({'success': False, 'message': 'Missing auth token'}), 401
            token = auth.split(' ', 1)[1]
            data = decode_token(token)
            if not data:
                return jsonify({'success': False, 'message': 'Invalid or expired token'}), 401
            # role check
            if role and data.get('role') != role:
                return jsonify({'success': False, 'message': 'Insufficient permissions'}), 403
            # attach user info to request context
            request.user = data
            return f(*args, **kwargs)
        return wrapped
    return decorator

# --------- STATIC SERVE ---------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """
    Serve static frontend files. If not found, fall back to index.html
    This allows SPA frontends and direct file requests (style.css, script.js, images/...).
    """
    if path != "" and os.path.exists(os.path.join(FRONTEND_DIR, path)):
        return send_from_directory(FRONTEND_DIR, path)
    # default to index.html
    return send_from_directory(FRONTEND_DIR, 'index.html')

# --------- ADMIN LOGIN (demo) ---------
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    if email == ADMIN_EMAIL and bcrypt.checkpw(password.encode(), ADMIN_PASSWORD_HASH):
        token = create_token({'email': email, 'role': 'admin', 'name': 'admin'})
        return jsonify({'success': True, 'token': token})
    return jsonify({'success': False, 'message': 'Invalid admin credentials'}), 401

# --------- REGISTER / LOGIN HELP (common) ---------
def hash_password(plain):
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain, hashed):
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

# --------- TEACHER ROUTES ---------
@app.route('/api/teacher/register', methods=['POST'])
def teacher_register():
    data = request.get_json(silent=True) or {}
    required = ['name', 'phone', 'email', 'password']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    conn = get_db()
    try:
        conn.execute('INSERT INTO teachers (name, phone, email, password) VALUES (?, ?, ?, ?)',
                     (data['name'], data['phone'], data['email'], hash_password(data['password'])))
        conn.commit()
        return jsonify({'success': True, 'message': 'Registration submitted. Wait for admin approval.'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/teacher/login', methods=['POST'])
def teacher_login():
    data = request.get_json(silent=True) or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    conn = get_db()
    row = conn.execute('SELECT * FROM teachers WHERE email=?', (data['email'],)).fetchone()
    if row and row['status'] == 'approved' and verify_password(data['password'], row['password']):
        token = create_token({'id': row['id'], 'email': row['email'], 'role': 'teacher', 'name': row['name']})
        return jsonify({'success': True, 'token': token, 'user': dict(row)})
    return jsonify({'success': False, 'message': 'Invalid credentials or not approved'}), 401

# --------- STUDENT ROUTES ---------
@app.route('/api/student/register', methods=['POST'])
def student_register():
    data = request.get_json(silent=True) or {}
    required = ['name', 'phone', 'email', 'password', 'course', 'division']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    conn = get_db()
    try:
        conn.execute('INSERT INTO students (name, phone, email, password, course, division) VALUES (?, ?, ?, ?, ?, ?)',
                     (data['name'], data['phone'], data['email'], hash_password(data['password']), data['course'], data['division']))
        conn.commit()
        return jsonify({'success': True, 'message': 'Registration successful'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/student/login', methods=['POST'])
def student_login():
    data = request.get_json(silent=True) or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    conn = get_db()
    row = conn.execute('SELECT * FROM students WHERE email=?', (data['email'],)).fetchone()
    if row and verify_password(data['password'], row['password']):
        token = create_token({'id': row['id'], 'email': row['email'], 'role': 'student', 'name': row['name']})
        return jsonify({'success': True, 'token': token, 'user': dict(row)})
    return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

# --------- TECHNICIAN ROUTES ---------
@app.route('/api/technician/register', methods=['POST'])
def technician_register():
    data = request.get_json(silent=True) or {}
    required = ['name', 'phone', 'email', 'password', 'specialization']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    conn = get_db()
    try:
        conn.execute('INSERT INTO technicians (name, phone, email, password, specialization) VALUES (?, ?, ?, ?, ?)',
                     (data['name'], data['phone'], data['email'], hash_password(data['password']), data['specialization']))
        conn.commit()
        return jsonify({'success': True, 'message': 'Technician registered successfully'})
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/technician/login', methods=['POST'])
def technician_login():
    data = request.get_json(silent=True) or {}
    if not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    conn = get_db()
    row = conn.execute('SELECT * FROM technicians WHERE email=?', (data['email'],)).fetchone()
    if row and row['status'] == 'active' and verify_password(data['password'], row['password']):
        token = create_token({'id': row['id'], 'email': row['email'], 'role': 'technician', 'name': row['name']})
        return jsonify({'success': True, 'token': token, 'user': dict(row)})
    return jsonify({'success': False, 'message': 'Invalid credentials or inactive account'}), 401

# --------- ISSUE ROUTES ---------
@app.route('/api/issue/create', methods=['POST'])
@auth_required()  # any authenticated user
def create_issue():
    data = request.get_json(silent=True) or {}
    required = ['issue_type', 'floor', 'class_number', 'description']
    if not all(k in data for k in required):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    # use token info for user_name/email/role
    user = request.user
    conn = get_db()
    try:
        conn.execute('''
            INSERT INTO issues (user_name, user_type, user_email, issue_type, floor, class_number, description)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user.get('name'), user.get('role'), user.get('email'), data['issue_type'], data['floor'], data['class_number'], data['description']))
        conn.commit()
        return jsonify({'success': True, 'message': 'Issue reported successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/issue/user/<email>', methods=['GET'])
@auth_required()
def get_user_issues(email):
    # allow only the user themselves or admin
    user = request.user
    if user.get('role') != 'admin' and user.get('email') != email:
        return jsonify({'success': False, 'message': 'Forbidden'}), 403
    conn = get_db()
    issues = conn.execute('SELECT * FROM issues WHERE user_email=? ORDER BY created_at DESC', (email,)).fetchall()
    return jsonify([dict(i) for i in issues])

# --------- ADMIN: APPROVE / ASSIGN / LIST ---------
@app.route('/api/admin/pending-teachers', methods=['GET'])
@auth_required(role='admin')
def admin_pending_teachers():
    conn = get_db()
    rows = conn.execute('SELECT * FROM teachers WHERE status="pending" ORDER BY created_at DESC').fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/admin/approve-teacher/<int:teacher_id>', methods=['POST'])
@auth_required(role='admin')
def admin_approve_teacher(teacher_id):
    conn = get_db()
    conn.execute('UPDATE teachers SET status="approved" WHERE id=?', (teacher_id,))
    conn.commit()
    return jsonify({'success': True, 'message': 'Teacher approved'})

@app.route('/api/admin/assign-issue/<int:issue_id>/<int:tech_id>', methods=['POST'])
@auth_required(role='admin')
def admin_assign_issue(issue_id, tech_id):
    conn = get_db()
    tech = conn.execute('SELECT id, name, email FROM technicians WHERE id=?', (tech_id,)).fetchone()
    issue = conn.execute('SELECT * FROM issues WHERE id=?', (issue_id,)).fetchone()
    if not tech or not issue:
        return jsonify({'success': False, 'message': 'Technician or issue not found'}), 404
    try:
        conn.execute('UPDATE issues SET assigned_to=?, status="assigned" WHERE id=?', (tech_id, issue_id))
        # create notification for technician
        message = f"New task assigned: {issue['issue_type']} at Floor {issue['floor']}, Class {issue['class_number']}"
        conn.execute('INSERT INTO notifications (user_email, user_type, title, message) VALUES (?, ?, ?, ?)',
                     (tech['email'], 'technician', 'New Task Assigned', message))
        conn.commit()
        return jsonify({'success': True, 'message': 'Issue assigned to technician'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/technician/tasks/<int:tech_id>', methods=['GET'])
@auth_required(role='technician')
def technician_tasks(tech_id):
    # technician can only fetch own tasks
    user = request.user
    if user.get('id') != tech_id:
        return jsonify({'success': False, 'message': 'Forbidden'}), 403
    conn = get_db()
    rows = conn.execute('SELECT * FROM issues WHERE assigned_to=? ORDER BY created_at DESC', (tech_id,)).fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/technician/complete-task/<int:issue_id>', methods=['POST'])
@auth_required(role='technician')
def technician_complete(issue_id):
    user = request.user
    conn = get_db()
    issue = conn.execute('SELECT * FROM issues WHERE id=?', (issue_id,)).fetchone()
    if not issue:
        return jsonify({'success': False, 'message': 'Issue not found'}), 404
    if issue['assigned_to'] != user.get('id'):
        return jsonify({'success': False, 'message': 'You are not assigned to this issue'}), 403
    try:
        conn.execute('UPDATE issues SET status="resolved", resolved_at=CURRENT_TIMESTAMP WHERE id=?', (issue_id,))
        # notify the user who created issue
        msg = f'Your issue ({issue["issue_type"]}) has been resolved.'
        conn.execute('INSERT INTO notifications (user_email, user_type, title, message) VALUES (?, ?, ?, ?)',
                     (issue['user_email'], 'user', 'Issue Resolved', msg))
        conn.commit()
        return jsonify({'success': True, 'message': 'Task marked complete'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# --------- ADMIN: list technicians (for assignment) ---------
@app.route('/api/admin/technicians', methods=['GET'])
@auth_required(role='admin')
def admin_get_technicians():
    conn = get_db()
    rows = conn.execute('SELECT * FROM technicians ORDER BY name').fetchall()
    return jsonify([dict(r) for r in rows])

# --------- NOTIFICATIONS ---------
@app.route('/api/notifications/<email>', methods=['GET'])
@auth_required()
def get_notifications(email):
    user = request.user
    if user.get('role') != 'admin' and user.get('email') != email:
        return jsonify({'success': False, 'message': 'Forbidden'}), 403
    conn = get_db()
    rows = conn.execute('SELECT * FROM notifications WHERE user_email=? ORDER BY created_at DESC', (email,)).fetchall()
    return jsonify([dict(r) for r in rows])

# --------- PASSWORD RESET (secure-ish) ---------
# Option A: user can change password if they provide current password
@app.route('/api/change-password', methods=['POST'])
@auth_required()
def change_password():
    data = request.get_json(silent=True) or {}
    current = data.get('current_password')
    newpw = data.get('new_password')
    if not current or not newpw:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    user = request.user
    role = user.get('role')
    email = user.get('email')
    conn = get_db()
    table = 'teachers' if role == 'teacher' else ('students' if role == 'student' else 'technicians')
    row = conn.execute(f'SELECT password FROM {table} WHERE email=?', (email,)).fetchone()
    if not row or not verify_password(current, row['password']):
        return jsonify({'success': False, 'message': 'Current password incorrect'}), 400
    conn.execute(f'UPDATE {table} SET password=? WHERE email=?', (hash_password(newpw), email))
    conn.commit()
    return jsonify({'success': True, 'message': 'Password changed'})

# Admin-only password reset for users (for demos/admin use)
@app.route('/api/admin/reset-user-password', methods=['POST'])
@auth_required(role='admin')
def admin_reset_user_password():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    role = data.get('role')
    newpw = data.get('new_password')
    if not email or not role or not newpw:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    table = 'teachers' if role == 'teacher' else ('students' if role == 'student' else 'technicians')
    conn = get_db()
    conn.execute(f'UPDATE {table} SET password=? WHERE email=?', (hash_password(newpw), email))
    conn.commit()
    return jsonify({'success': True, 'message': 'Password reset by admin'})

# --------- HEALTH & ADMIN LISTS ---------
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'running', 'database': 'connected' if os.path.exists(DB_PATH) else 'not_found'})

@app.route('/api/admin/teachers', methods=['GET'])
@auth_required(role='admin')
def admin_get_teachers():
    conn = get_db()
    rows = conn.execute('SELECT * FROM teachers WHERE status="approved" ORDER BY name').fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/admin/students', methods=['GET'])
@auth_required(role='admin')
def admin_get_students():
    conn = get_db()
    rows = conn.execute('SELECT * FROM students ORDER BY name').fetchall()
    return jsonify([dict(r) for r in rows])

@app.route('/api/admin/issues', methods=['GET'])
@auth_required(role='admin')
def admin_get_issues():
    conn = get_db()
    rows = conn.execute('SELECT * FROM issues ORDER BY created_at DESC').fetchall()
    return jsonify([dict(r) for r in rows])

# --------- FEEDBACK ---------
@app.route('/api/feedback/submit', methods=['POST'])
@auth_required()
def submit_feedback():
    data = request.get_json(silent=True) or {}
    issue_id = data.get('issue_id')
    rating = data.get('rating')
    comment = data.get('comment', '')
    if not issue_id or not rating:
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    if rating < 1 or rating > 5:
        return jsonify({'success': False, 'message': 'Rating must be 1-5'}), 400
    conn = get_db()
    conn.execute('INSERT INTO feedback (issue_id, user_email, rating, comment) VALUES (?, ?, ?, ?)',
                 (issue_id, request.user.get('email'), rating, comment))
    conn.commit()
    return jsonify({'success': True, 'message': 'Feedback submitted'})

# --------- SIMPLE ANALYTICS (admin) ---------
@app.route('/api/admin/analytics/summary', methods=['GET'])
@auth_required(role='admin')
def analytics_summary():
    conn = get_db()
    # simple counts
    total_issues = conn.execute('SELECT COUNT(*) as c FROM issues').fetchone()['c']
    pending = conn.execute('SELECT COUNT(*) as c FROM issues WHERE status="pending"').fetchone()['c']
    resolved = conn.execute('SELECT COUNT(*) as c FROM issues WHERE status="resolved"').fetchone()['c']
    total_students = conn.execute('SELECT COUNT(*) as c FROM students').fetchone()['c']
    total_teachers = conn.execute('SELECT COUNT(*) as c FROM teachers WHERE status="approved"').fetchone()['c']
    total_techs = conn.execute('SELECT COUNT(*) as c FROM technicians WHERE status="active"').fetchone()['c']
    return jsonify({'success': True, 'summary': {
        'total_issues': total_issues, 'pending': pending, 'resolved': resolved,
        'students': total_students, 'teachers': total_teachers, 'technicians': total_techs
    }})

# --------- START APP ---------
if __name__ == '__main__':
    print("="*60)
    print(" College Issue Tracker - Backend (dev mode)")
    print("="*60)
    print("Serving frontend from:", FRONTEND_DIR)
    print("Server listening: http://0.0.0.0:5000")
    print("="*60)
    app.run(debug=True, host='0.0.0.0', port=5000)
