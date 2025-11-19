import os
import sqlite3
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database.db')
# Point to the frontend directory located at the project root (one level above backend)
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')  # Ensure frontend folder exists
JWT_SECRET = os.environ.get('JWT_SECRET', 'your_secret_key_here')  # Change for production!
JWT_ALGORITHM = 'HS256'
JWT_EXP_DAYS = 7

# Admin credentials
ADMIN_EMAIL = "admin@college.edu"
ADMIN_PASSWORD_PLAIN = "admin123"
ADMIN_PASSWORD_HASH = bcrypt.hashpw(ADMIN_PASSWORD_PLAIN.encode(), bcrypt.gensalt())

app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

# Database connection helper
def get_db():
    if 'db' not in g:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA foreign_keys = ON;')
        g.db = conn
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()

# Initialize database
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('PRAGMA foreign_keys = ON;')
    # Teachers table
    c.execute('''
    CREATE TABLE IF NOT EXISTS teachers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    # Students table
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
    )''')
    # Technicians table
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
    )''')
    # Issues table
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
    )''')
    # Notifications table
    c.execute('''
    CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT NOT NULL,
        user_type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        is_read INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    # Feedback table
    c.execute('''
    CREATE TABLE IF NOT EXISTS feedback (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        issue_id INTEGER NOT NULL,
        user_email TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE
    )''')
    conn.commit()
    conn.close()
    print("✓ Database initialized/checked")

init_db()

# JWT Token helpers
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

# Authentication decorator
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
            if role and data.get('role') != role:
                return jsonify({'success': False, 'message': 'Insufficient permissions'}), 403
            request.user = data
            return f(*args, **kwargs)
        return wrapped
    return decorator

# (moved) Serve frontend files: defined at bottom to avoid intercepting API routes

# Admin login
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

# Password helpers
def hash_password(plain):
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain, hashed):
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

# Password reset (user)
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

# Admin password reset
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

# User registration routes
@app.route('/api/teacher/register', methods=['POST'])
def teacher_register():
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')
    if not all([name, phone, email, password]):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO teachers (name, phone, email, password, status) VALUES (?, ?, ?, ?, ?)',
            (name, phone, email, hash_password(password), 'pending')
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already registered'}), 400
    return jsonify({'success': True, 'message': 'Registration submitted. Wait for admin approval.'})

@app.route('/api/student/register', methods=['POST'])
def student_register():
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')
    course = data.get('course')
    division = data.get('division')
    if not all([name, phone, email, password, course, division]):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO students (name, phone, email, password, course, division) VALUES (?, ?, ?, ?, ?, ?)',
            (name, phone, email, hash_password(password), course, division)
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already registered'}), 400
    return jsonify({'success': True, 'message': 'Registration successful'})

@app.route('/api/technician/register', methods=['POST'])
def technician_register():
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')
    specialization = data.get('specialization')
    if not all([name, phone, email, password, specialization]):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    conn = get_db()
    try:
        conn.execute(
            'INSERT INTO technicians (name, phone, email, password, specialization, status) VALUES (?, ?, ?, ?, ?, ?)',
            (name, phone, email, hash_password(password), specialization, 'active')
        )
        conn.commit()
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already registered'}), 400
    return jsonify({'success': True, 'message': 'Technician registered successfully'})

# User login helper
def _user_login(table, email, password, extra_fields=None, require_active=False):
    conn = get_db()
    query = f'SELECT * FROM {table} WHERE email=?'
    params = [email]
    if require_active and table == 'teachers':
        query += " AND status=?"
        params.append('active')
    row = conn.execute(query, params).fetchone()
    if not row or not verify_password(password, row['password']):
        return None
    user_dict = dict(row)
    if extra_fields:
        user_dict = {field: user_dict.get(field) for field in extra_fields}
    return user_dict

@app.route('/api/teacher/login', methods=['POST'])
def teacher_login():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    user = _user_login('teachers', email, password, ['id', 'name', 'email', 'phone'], require_active=True)
    if not user:
        return jsonify({'success': False, 'message': 'Invalid credentials or not approved yet'}), 401
    token = create_token({'email': user['email'], 'role': 'teacher', 'name': user['name']})
    return jsonify({'success': True, 'token': token, 'user': user})

@app.route('/api/student/login', methods=['POST'])
def student_login():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    user = _user_login('students', email, password, ['id', 'name', 'email', 'phone', 'course', 'division'])
    if not user:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    token = create_token({
        'email': user['email'],
        'role': 'student',
        'name': user['name'],
        'course': user.get('course'),
        'division': user.get('division')
    })
    return jsonify({'success': True, 'token': token, 'user': user})

@app.route('/api/technician/login', methods=['POST'])
def technician_login():
    data = request.get_json(silent=True) or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400
    user = _user_login('technicians', email, password, ['id', 'name', 'email', 'phone', 'specialization', 'status'])
    if not user:
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    token = create_token({
        'email': user['email'],
        'role': 'technician',
        'name': user['name'],
        'specialization': user.get('specialization')
    })
    return jsonify({'success': True, 'token': token, 'user': user})

# Issue reporting routes
@app.route('/api/issue/create', methods=['POST'])
def create_issue():
    data = request.get_json(silent=True) or {}
    user_name = data.get('userName')
    user_type = data.get('userType')
    user_email = data.get('userEmail')
    issue_type = data.get('issueType')
    floor = data.get('floor')
    class_number = data.get('classNumber')
    description = data.get('description')
    if not all([user_name, user_type, user_email, issue_type, floor, class_number, description]):
        return jsonify({'success': False, 'message': 'Missing fields'}), 400
    conn = get_db()
    conn.execute(
        '''INSERT INTO issues (user_name, user_type, user_email, issue_type, floor, class_number, description)
           VALUES (?, ?, ?, ?, ?, ?, ?)''',
        (user_name, user_type, user_email, issue_type, floor, class_number, description)
    )
    conn.commit()
    return jsonify({'success': True, 'message': 'Issue created'})

@app.route('/api/issue/user/<email>', methods=['GET'])
def get_user_issues(email):
    conn = get_db()
    rows = conn.execute('SELECT * FROM issues WHERE user_email=? ORDER BY created_at DESC', (email,)).fetchall()
    issues = [dict(row) for row in rows]
    return jsonify(issues)

# Admin teacher / student / technician management
@app.route('/api/admin/pending-teachers', methods=['GET'])
def admin_pending_teachers():
    conn = get_db()
    rows = conn.execute("SELECT * FROM teachers WHERE status='pending' ORDER BY created_at ASC").fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/admin/approve-teacher/<int:teacher_id>', methods=['POST'])
def admin_approve_teacher(teacher_id):
    conn = get_db()
    conn.execute("UPDATE teachers SET status='active' WHERE id=?", (teacher_id,))
    conn.commit()
    return jsonify({'success': True})

@app.route('/api/admin/reject-teacher/<int:teacher_id>', methods=['DELETE'])
def admin_reject_teacher(teacher_id):
    conn = get_db()
    conn.execute('DELETE FROM teachers WHERE id=?', (teacher_id,))
    conn.commit()
    return jsonify({'success': True})

@app.route('/api/admin/teachers', methods=['GET'])
def admin_teachers():
    conn = get_db()
    rows = conn.execute("SELECT * FROM teachers WHERE status='active' ORDER BY created_at DESC").fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/admin/students', methods=['GET'])
def admin_students():
    conn = get_db()
    rows = conn.execute('SELECT * FROM students ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/admin/technicians', methods=['GET'])
def admin_technicians():
    conn = get_db()
    rows = conn.execute('SELECT * FROM technicians ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in rows])

# Feedback routes
@app.route('/api/feedback/user/<email>', methods=['GET'])
def feedback_pending_for_user(email):
    conn = get_db()
    rows = conn.execute(
        '''SELECT i.* FROM issues i
           LEFT JOIN feedback f ON f.issue_id = i.id
           WHERE i.user_email=? AND i.status='resolved' AND f.id IS NULL
           ORDER BY i.created_at DESC''',
        (email,)
    ).fetchall()
    issues = [dict(row) for row in rows]
    return jsonify({'success': True, 'issues': issues})

# Health check
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'running', 'database': 'connected' if os.path.exists(DB_PATH) else 'not_found'})

# Serve frontend files (placed after API routes so /api/* takes precedence)
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(os.path.join(FRONTEND_DIR, path)):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, 'index.html')

# Run app
if __name__ == '__main__':
    print("="*60)
    print("DIMR Technical Issue Tracker - Backend")
    print("="*60)
    print("Serving frontend from:", FRONTEND_DIR)
    print("Server listening on http://localhost:5000")
    print("="*60)
    app.run(debug=True, host='127.0.0.1', port=5000)