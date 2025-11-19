# app.py
import os
import sqlite3
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, g, current_app
from flask_cors import CORS

# --------------------------
# Configuration
# --------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'database.db')
PROJECT_ROOT = os.path.dirname(BASE_DIR)
FRONTEND_DIR = os.path.join(PROJECT_ROOT, 'frontend')  # frontend folder at project root
JWT_SECRET = os.environ.get('JWT_SECRET', 'your_secret_key_here')  # change in prod
JWT_ALGORITHM = 'HS256'
JWT_EXP_DAYS = int(os.environ.get('JWT_EXP_DAYS', '7'))

# Admin credentials (dev-friendly, override with env in production)
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@college.edu')
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'kartan')
ADMIN_PASSWORD_PLAIN = os.environ.get('ADMIN_PASSWORD', 'admin123')

# Ensure admin password hash is stored as a decoded string (so DB and checks are consistent)
ADMIN_PASSWORD_HASH = bcrypt.hashpw(ADMIN_PASSWORD_PLAIN.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# --------------------------
# App setup
# --------------------------
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

# --------------------------
# Database helpers
# --------------------------
def get_db():
    # use check_same_thread=False to avoid sqlite threading issue with Flask dev server
    if 'db' not in g:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
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
    current_app = None
    print("✓ Database initialized/checked")

# Initialize DB on import/start
init_db()

# --------------------------
# JWT helpers
# --------------------------
def create_token(data, days=JWT_EXP_DAYS):
    payload = data.copy()
    payload['exp'] = datetime.utcnow() + timedelta(days=days)
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    # PyJWT sometimes returns bytes; ensure string
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token

def decode_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except Exception:
        return None

# --------------------------
# Auth decorator
# --------------------------
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
            # Attach user info to request for handlers
            request.user = data
            return f(*args, **kwargs)
        return wrapped
    return decorator

# --------------------------
# Password helpers
# --------------------------
def hash_password(plain):
    # Return decoded string to store in DB uniformly
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain, hashed):
    try:
        # hashed is stored as a decoded string, convert back to bytes
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# --------------------------
# Admin login
# --------------------------
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get('email') or data.get('username') or data.get('identifier') or '').strip()
    password = data.get('password')
    if not identifier or not password:
        return jsonify({'success': False, 'message': 'Missing credentials'}), 400

    ident_lower = identifier.lower()
    allowed_ident = ident_lower in (ADMIN_EMAIL.lower(), ADMIN_USERNAME.lower(), 'admin')
    if allowed_ident and verify_password(password, ADMIN_PASSWORD_HASH):
        token = create_token({'email': ADMIN_EMAIL, 'role': 'admin', 'name': ADMIN_USERNAME})
        return jsonify({'success': True, 'token': token})
    return jsonify({'success': False, 'message': 'Invalid admin credentials'}), 401

# --------------------------
# User registration & login
# --------------------------
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

# Generic user login helper
def _user_login(table, email, password, extra_fields=None, require_active=False):
    conn = get_db()
    # Use parameterized queries only
    if require_active and table == 'teachers':
        row = conn.execute('SELECT * FROM teachers WHERE email=? AND status=?', (email, 'active')).fetchone()
    else:
        row = conn.execute(f'SELECT * FROM {table} WHERE email=?', (email,)).fetchone()

    if not row:
        return None
    if not verify_password(password, row['password']):
        return None

    user_dict = dict(row)
    if extra_fields:
        # return only requested fields
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
        'id': user.get('id'),
        'email': user['email'],
        'role': 'technician',
        'name': user['name'],
        'specialization': user.get('specialization')
    })
    return jsonify({'success': True, 'token': token, 'user': user})


def create_notification(user_email, user_type, title, message):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        'INSERT INTO notifications (user_email, user_type, title, message, is_read) VALUES (?, ?, ?, ?, ?)',
        (user_email, user_type, title, message, 0)
    )
    conn.commit()
    conn.close()

# --------------------------
# Issue reporting
# --------------------------
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

# --------------------------
# Admin-protected endpoints
# --------------------------
@app.route('/api/admin/pending-teachers', methods=['GET'])
@auth_required(role='admin')
def admin_pending_teachers():
    conn = get_db()
    rows = conn.execute("SELECT * FROM teachers WHERE status='pending' ORDER BY created_at ASC").fetchall()
    return jsonify([dict(row) for row in rows])


@app.route('/api/admin/assign-issue/<int:issue_id>', methods=['POST'])
@auth_required(role='admin')
def admin_assign_issue(issue_id):
    data = request.get_json(silent=True) or {}
    tech_id = data.get('technician_id')
    if not tech_id:
        return jsonify({'success': False, 'message': 'Missing technician_id'}), 400

    conn = get_db()
    # Check issue exists
    issue = conn.execute('SELECT * FROM issues WHERE id=?', (issue_id,)).fetchone()
    if not issue:
        return jsonify({'success': False, 'message': 'Issue not found'}), 404

    # Check technician exists
    tech = conn.execute('SELECT * FROM technicians WHERE id=?', (tech_id,)).fetchone()
    if not tech:
        return jsonify({'success': False, 'message': 'Technician not found'}), 404

    # Assign and update status
    conn.execute('UPDATE issues SET assigned_to=?, status=? WHERE id=?', (tech_id, 'assigned', issue_id))
    conn.commit()

    # Create notification for technician
    tech_email = tech['email']
    title = f'New issue assigned: #{issue_id}'
    message = f"Issue '{issue['issue_type']}' assigned to you by admin. Description: {issue['description']}"
    create_notification(tech_email, 'technician', title, message)

    # Notify original reporter
    reporter_email = issue['user_email']
    reporter_title = f'Your issue #{issue_id} assigned'
    reporter_message = f"Your issue has been assigned to technician {tech['name']}."
    create_notification(reporter_email, issue['user_type'], reporter_title, reporter_message)

    return jsonify({'success': True, 'message': 'Issue assigned and notifications sent'})

@app.route('/api/admin/approve-teacher/<int:teacher_id>', methods=['POST'])
@auth_required(role='admin')
def admin_approve_teacher(teacher_id):
    conn = get_db()
    conn.execute("UPDATE teachers SET status='active' WHERE id=?", (teacher_id,))
    conn.commit()
    return jsonify({'success': True})

@app.route('/api/admin/reject-teacher/<int:teacher_id>', methods=['DELETE'])
@auth_required(role='admin')
def admin_reject_teacher(teacher_id):
    conn = get_db()
    conn.execute('DELETE FROM teachers WHERE id=?', (teacher_id,))
    conn.commit()
    return jsonify({'success': True})

@app.route('/api/admin/teachers', methods=['GET'])
@auth_required(role='admin')
def admin_teachers():
    conn = get_db()
    rows = conn.execute("SELECT * FROM teachers WHERE status='active' ORDER BY created_at DESC").fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/admin/students', methods=['GET'])
@auth_required(role='admin')
def admin_students():
    conn = get_db()
    rows = conn.execute('SELECT * FROM students ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in rows])

@app.route('/api/admin/technicians', methods=['GET'])
@auth_required(role='admin')
def admin_technicians():
    conn = get_db()
    rows = conn.execute('SELECT * FROM technicians ORDER BY created_at DESC').fetchall()
    return jsonify([dict(row) for row in rows])


@app.route('/api/admin/issues', methods=['GET'])
@auth_required(role='admin')
def admin_all_issues():
    conn = get_db()
    rows = conn.execute('''
        SELECT i.*, t.name as technician_name, t.email as technician_email, t.specialization as technician_specialization
        FROM issues i
        LEFT JOIN technicians t ON i.assigned_to = t.id
        ORDER BY i.created_at DESC
    ''').fetchall()
    issues = [dict(r) for r in rows]
    return jsonify({'success': True, 'issues': issues})

# Admin reset user password (protected)
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

# --------------------------
# Feedback
# --------------------------
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


@app.route('/api/technician/tasks', methods=['GET'])
@auth_required(role='technician')
def technician_tasks():
    # Determine technician by token email
    token_data = request.user
    tech_email = token_data.get('email')
    conn = get_db()
    tech = conn.execute('SELECT * FROM technicians WHERE email=?', (tech_email,)).fetchone()
    if not tech:
        return jsonify({'success': False, 'message': 'Technician not found'}), 404

    tech_id = tech['id']
    tech_spec = tech['specialization']

    # Assigned tasks
    assigned_rows = conn.execute('SELECT * FROM issues WHERE assigned_to=? ORDER BY created_at DESC', (tech_id,)).fetchall()
    assigned = [dict(r) for r in assigned_rows]

    # Also provide unassigned issues that likely match technician specialization
    def map_issue_to_spec(issue_type):
        t = issue_type.lower()
        if 'computer' in t or 'desktop' in t:
            return 'Computer Hardware'
        if 'wifi' in t or 'wi-fi' in t:
            return 'Network & WiFi'
        if 'digital board' in t or 'board' in t:
            return 'Digital Board'
        return 'General Electrical'

    unassigned_rows = conn.execute('SELECT * FROM issues WHERE assigned_to IS NULL ORDER BY created_at DESC').fetchall()
    matching = []
    for r in unassigned_rows:
        if map_issue_to_spec(r['issue_type']) == tech_spec:
            matching.append(dict(r))

    return jsonify({'success': True, 'assigned': assigned, 'recommended': matching})


@app.route('/api/notifications/<email>', methods=['GET'])
def get_notifications(email):
    conn = get_db()
    rows = conn.execute('SELECT * FROM notifications WHERE user_email=? ORDER BY created_at DESC', (email,)).fetchall()
    notifs = [dict(r) for r in rows]
    return jsonify({'success': True, 'notifications': notifs})

@app.route('/api/notifications/<int:notif_id>/mark-read', methods=['POST'])
def mark_notification_read(notif_id):
    conn = get_db()
    try:
        conn.execute('UPDATE notifications SET is_read=1 WHERE id=?', (notif_id,))
        conn.commit()
        return jsonify({'success': True, 'message': 'Notification marked as read'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 400

# --------------------------
# Health check
# --------------------------
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'running', 'database': 'connected' if os.path.exists(DB_PATH) else 'not_found'})

# --------------------------
# Serve frontend files (after API routes)
# --------------------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    # if requested file exists in front-end directory, serve it; otherwise serve index.html
    if path:
        candidate = os.path.join(FRONTEND_DIR, path)
        if os.path.exists(candidate) and os.path.isfile(candidate):
            return send_from_directory(FRONTEND_DIR, path)
    # fallback to index.html if present
    index_file = os.path.join(FRONTEND_DIR, 'index.html')
    if os.path.exists(index_file):
        return send_from_directory(FRONTEND_DIR, 'index.html')
    return jsonify({'message': 'Frontend not found on server. Place built frontend in the frontend/ folder.'}), 404

# --------------------------
# Run app
# --------------------------
if __name__ == '__main__':
    print("="*60)
    print("DIMR Technical Issue Tracker - Backend")
    print("="*60)
    print("Serving frontend from:", FRONTEND_DIR)
    print("Server listening on http://127.0.0.1:5000")
    print("="*60)
    # For local dev keep debug=True; change host to '0.0.0.0' if you need external access
    app.run(debug=True, host='127.0.0.1', port=5000)


@app.route('/api/issue/update-status/<int:issue_id>', methods=['POST'])
@auth_required()
def update_issue_status(issue_id):
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    if not new_status:
        return jsonify({'success': False, 'message': 'Missing status'}), 400

    conn = get_db()
    issue = conn.execute('SELECT * FROM issues WHERE id=?', (issue_id,)).fetchone()
    if not issue:
        return jsonify({'success': False, 'message': 'Issue not found'}), 404

    resolved_at = None
    if new_status == 'resolved':
        resolved_at = datetime.utcnow()

    if resolved_at:
        conn.execute('UPDATE issues SET status=?, resolved_at=? WHERE id=?', (new_status, resolved_at, issue_id))
    else:
        conn.execute('UPDATE issues SET status=? WHERE id=?', (new_status, issue_id))
    conn.commit()

    # send notifications
    # notify reporter
    reporter_email = issue['user_email']
    title = f'Issue #{issue_id} status updated'
    message = f"Status changed to {new_status}"
    create_notification(reporter_email, issue['user_type'], title, message)

    # notify assigned technician if exists
    if issue['assigned_to']:
        tech = conn.execute('SELECT * FROM technicians WHERE id=?', (issue['assigned_to'],)).fetchone()
        if tech:
            tech_email = tech['email']
            create_notification(tech_email, 'technician', title, message)

    return jsonify({'success': True, 'message': 'Status updated'})
