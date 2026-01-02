import sqlite3
import hashlib
import os
import json
import datetime

DB_NAME = "football_planner.db"

def init_db():
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Create Users Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'player',
            status TEXT DEFAULT 'APPROVED',
            parent_coach_id INTEGER,
            team_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Create Sessions Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            date TEXT,
            time TEXT DEFAULT '10:00',
            status TEXT,
            data TEXT,
            assigned_to_id INTEGER, -- Optional: Assign to specific player
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Create Performance Logs Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS performance_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            date TEXT,
            metric_id TEXT, -- e.g. 'speed', 'stamina', 'accuracy'
            value REAL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Create Notifications Table
    c.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_user_id INTEGER,
            from_user_id INTEGER,
            title TEXT,
            message TEXT,
            is_read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(target_user_id) REFERENCES users(id)
        )
    ''')
    # Backward compatibility
    try:
        c.execute('ALTER TABLE sessions ADD COLUMN time TEXT DEFAULT "10:00"')
    except: pass
    try:
        c.execute('ALTER TABLE users ADD COLUMN role TEXT DEFAULT "player"')
    except: pass
    try:
        c.execute('ALTER TABLE users ADD COLUMN status TEXT DEFAULT "APPROVED"')
    except: pass
    try:
        c.execute('ALTER TABLE users ADD COLUMN parent_coach_id INTEGER')
    except: pass
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(username, password, role='player', team_name="My Team", coach_username=None):
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        pwd_hash = hash_password(password)
        
        # Determine status
        status = 'APPROVED' if role == 'coach' else 'PENDING'
        
        # Find coach_id and coach team name if provided
        coach_id = None
        final_team_name = team_name
        if coach_username:
            c.execute('SELECT id, team_name FROM users WHERE username = ? AND role = "coach"', (coach_username,))
            res = c.fetchone()
            if res: 
                coach_id = res[0]
                final_team_name = res[1] # Inherit team name
            else: return False, f"Coach '{coach_username}' not found"

        c.execute('INSERT INTO users (username, password_hash, role, status, parent_coach_id, team_name) VALUES (?, ?, ?, ?, ?, ?)', 
                  (username, pwd_hash, role, status, coach_id, final_team_name))
        conn.commit()
        conn.close()
        return True, "User created successfully"
    except sqlite3.IntegrityError:
        return False, "Username already exists"
    except Exception as e:
        return False, str(e)

def verify_user(username, password):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    pwd_hash = hash_password(password)
    c.execute('SELECT id, username, team_name, role, status FROM users WHERE username = ? AND password_hash = ?', (username, pwd_hash))
    user = c.fetchone()
    conn.close()
    
    if user:
        if user[4] == 'PENDING':
            return {'error': 'Wait for coach approval'}
        return {
            'id': user[0],
            'username': user[1],
            'team_name': user[2],
            'role': user[3],
            'status': user[4]
        }
    return None

def approve_player(player_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('UPDATE users SET status = "APPROVED" WHERE id = ?', (player_id,))
    conn.commit()
    conn.close()

# --- Notifications ---

def create_notification(target_id, from_id, title, msg):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('INSERT INTO notifications (target_user_id, from_user_id, title, message) VALUES (?, ?, ?, ?)', 
              (target_id, from_id, title, msg))
    conn.commit()
    conn.close()

def get_notifications(user_id):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM notifications WHERE target_user_id = ? ORDER BY created_at DESC', (user_id,))
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res

def mark_read(notif_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('UPDATE notifications SET is_read = 1 WHERE id = ?', (notif_id,))
    conn.commit()
    conn.close()

# --- Performance & Analytics ---

def log_performance(user_id, metric_id, value, date=None):
    if not date: date = datetime.date.today().strftime("%Y-%m-%d")
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('INSERT INTO performance_logs (user_id, date, metric_id, value) VALUES (?, ?, ?, ?)', 
              (user_id, date, metric_id, value))
    conn.commit()
    conn.close()

def get_performance_data(user_id, metric_id, limit=10):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT date, value FROM performance_logs WHERE user_id = ? AND metric_id = ? ORDER BY date ASC LIMIT ?', 
              (user_id, metric_id, limit))
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res

def get_team_average(coach_id, metric_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('''
        SELECT AVG(value) FROM performance_logs 
        JOIN users ON performance_logs.user_id = users.id 
        WHERE users.parent_coach_id = ? AND metric_id = ?
    ''', (coach_id, metric_id))
    avg = c.fetchone()[0]
    conn.close()
    return avg or 0

def get_pending_players(coach_id):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT id, username, team_name FROM users WHERE parent_coach_id = ? AND status = "PENDING"', (coach_id,))
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res

def get_team_players(coach_id):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT id, username, team_name FROM users WHERE parent_coach_id = ? AND status = "APPROVED"', (coach_id,))
    res = [dict(r) for r in c.fetchall()]
    conn.close()
    return res

def delete_all_users():
    try:
        conn = sqlite3.connect(DB_NAME)
        c = conn.cursor()
        c.execute('DELETE FROM users')
        c.execute('DELETE FROM sessions') # Clear sessions too
        conn.commit()
        conn.close()
        print("All users and sessions deleted successfully.")
        return True
    except Exception as e:
        print(f"Error deleting users: {e}")
        return False

# --- Session Management ---

def create_session(user_id, title, date, time, status, data_dict):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    # Serialize data
    data_json = json.dumps(data_dict)
    c.execute('INSERT INTO sessions (user_id, title, date, time, status, data) VALUES (?, ?, ?, ?, ?, ?)',
              (user_id, title, date, time, status, data_json))
    conn.commit()
    conn.close()

def update_session(session_id, data_dict, title=None, time=None):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    data_json = json.dumps(data_dict)
    if title and time:
        c.execute('UPDATE sessions SET data = ?, title = ?, time = ? WHERE id = ?', (data_json, title, time, session_id))
    elif title:
        c.execute('UPDATE sessions SET data = ?, title = ? WHERE id = ?', (data_json, title, session_id))
    elif time:
        c.execute('UPDATE sessions SET data = ?, time = ? WHERE id = ?', (data_json, time, session_id))
    else:
        c.execute('UPDATE sessions SET data = ? WHERE id = ?', (data_json, session_id))
    conn.commit()
    conn.close()

def get_user_sessions(user_id):
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    
    # Check if user is player
    c.execute('SELECT role, parent_coach_id FROM users WHERE id = ?', (user_id,))
    u = c.fetchone()
    target_id = user_id
    if u and u['role'] == 'player' and u['parent_coach_id']:
        target_id = u['parent_coach_id']

    c.execute('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC', (target_id,))
    rows = c.fetchall()
    conn.close()
    
    sessions = []
    for r in rows:
        sess = dict(r)
        try:
            sess['data'] = json.loads(sess['data'])
        except:
            sess['data'] = {}
        sessions.append(sess)
    return sessions

def delete_session(session_id):
    conn = sqlite3.connect(DB_NAME)
    c = conn.cursor()
    c.execute('DELETE FROM sessions WHERE id = ?', (session_id,))
    conn.commit()
    conn.close()

# Initialize on import
init_db()
