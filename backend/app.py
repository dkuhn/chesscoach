from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime, date
from typing import Dict, List, Optional
import sqlite3
import json
import os

app = FastAPI(title="Chess Training Statistics API", version="1.0.0")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_PATH = "chess_training.db"

def init_database():
    """Initialize the SQLite database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create main statistics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT DEFAULT 'default_user',
            total_problems INTEGER DEFAULT 0,
            total_correct INTEGER DEFAULT 0,
            total_attempts INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0.0,
            current_streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Create problem-specific statistics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS problem_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT DEFAULT 'default_user',
            problem_id TEXT NOT NULL,
            attempts INTEGER DEFAULT 0,
            solved BOOLEAN DEFAULT FALSE,
            first_try_solved BOOLEAN DEFAULT FALSE,
            last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, problem_id)
        )
    """)
    
    # Create category statistics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS category_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT DEFAULT 'default_user',
            category_type TEXT NOT NULL,
            category_value TEXT NOT NULL,
            total INTEGER DEFAULT 0,
            correct INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, category_type, category_value)
        )
    """)
    
    # Create daily statistics table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS daily_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT DEFAULT 'default_user',
            date DATE NOT NULL,
            problems INTEGER DEFAULT 0,
            correct INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            UNIQUE(user_id, date)
        )
    """)
    
    # Create training sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT DEFAULT 'default_user',
            session_id TEXT NOT NULL,
            start_time TIMESTAMP NOT NULL,
            end_time TIMESTAMP,
            total_attempts INTEGER DEFAULT 0,
            correct_answers INTEGER DEFAULT 0,
            completed_problems INTEGER DEFAULT 0,
            problems_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # Insert default stats if not exists
    cursor.execute("SELECT COUNT(*) FROM training_stats WHERE user_id = 'default_user'")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
            INSERT INTO training_stats (user_id) VALUES ('default_user')
        """)
    
    conn.commit()
    conn.close()

def upgrade_database():
    """Add spaced repetition columns to existing database"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if columns exist and add them if they don't
        cursor.execute("PRAGMA table_info(problem_stats)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'mastery_level' not in columns:
            cursor.execute("ALTER TABLE problem_stats ADD COLUMN mastery_level INTEGER DEFAULT 0")
            
        if 'next_review_date' not in columns:
            cursor.execute("ALTER TABLE problem_stats ADD COLUMN next_review_date DATE")
            
        if 'consecutive_correct' not in columns:
            cursor.execute("ALTER TABLE problem_stats ADD COLUMN consecutive_correct INTEGER DEFAULT 0")
            
        if 'last_interval_days' not in columns:
            cursor.execute("ALTER TABLE problem_stats ADD COLUMN last_interval_days INTEGER DEFAULT 0")
        
        conn.commit()
        
    except Exception as e:
        print(f"Database upgrade error: {e}")
        conn.rollback()
    finally:
        conn.close()

# Initialize database on startup
init_database()
upgrade_database()

# Pydantic models
class TrainingAttempt(BaseModel):
    problem_id: str
    position: Dict
    is_correct: bool
    attempt_number: int = 1

class TrainingSession(BaseModel):
    session_id: str
    start_time: str
    end_time: Optional[str] = None
    problems: List[Dict] = []
    total_attempts: int = 0
    correct_answers: int = 0
    completed_problems: int = 0

class StatsResponse(BaseModel):
    total_problems: int
    total_correct: int
    total_attempts: int
    success_rate: float
    streak: int
    best_streak: int
    last_update: str
    problem_stats: Dict
    category_stats: Dict
    daily_stats: Dict

def get_db_connection():
    """Get database connection"""
    return sqlite3.connect(DATABASE_PATH)

@app.get("/")
async def root():
    return {"message": "Chess Training Statistics API"}

@app.get("/api/stats", response_model=StatsResponse)
async def get_stats(user_id: str = "default_user"):
    """Get current training statistics"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get main stats
        cursor.execute("""
            SELECT total_problems, total_correct, total_attempts, success_rate, 
                   current_streak, best_streak, last_update
            FROM training_stats WHERE user_id = ?
        """, (user_id,))
        
        main_stats = cursor.fetchone()
        if not main_stats:
            raise HTTPException(status_code=404, detail="User stats not found")
        
        # Get problem stats
        cursor.execute("""
            SELECT problem_id, attempts, solved, first_try_solved
            FROM problem_stats WHERE user_id = ?
        """, (user_id,))
        
        problem_stats = {}
        for row in cursor.fetchall():
            problem_stats[row[0]] = {
                "attempts": row[1],
                "solved": bool(row[2]),
                "firstTrySolved": bool(row[3])
            }
        
        # Get category stats
        cursor.execute("""
            SELECT category_type, category_value, total, correct, attempts
            FROM category_stats WHERE user_id = ?
        """, (user_id,))
        
        category_stats = {}
        for row in cursor.fetchall():
            if row[0] not in category_stats:
                category_stats[row[0]] = {}
            category_stats[row[0]][row[1]] = {
                "total": row[2],
                "correct": row[3],
                "attempts": row[4]
            }
        
        # Get daily stats
        cursor.execute("""
            SELECT date, problems, correct, attempts
            FROM daily_stats WHERE user_id = ?
            ORDER BY date DESC LIMIT 30
        """, (user_id,))
        
        daily_stats = {}
        for row in cursor.fetchall():
            daily_stats[row[0]] = {
                "problems": row[1],
                "correct": row[2],
                "attempts": row[3]
            }
        
        return StatsResponse(
            total_problems=main_stats[0],
            total_correct=main_stats[1],
            total_attempts=main_stats[2],
            success_rate=main_stats[3],
            streak=main_stats[4],
            best_streak=main_stats[5],
            last_update=main_stats[6],
            problem_stats=problem_stats,
            category_stats=category_stats,
            daily_stats=daily_stats
        )
        
    finally:
        conn.close()

@app.post("/api/record-attempt")
async def record_attempt(attempt: TrainingAttempt, user_id: str = "default_user"):
    """Record a training attempt"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        conn.execute("BEGIN")
        
        # Get current stats
        cursor.execute("""
            SELECT total_problems, total_correct, total_attempts, current_streak, best_streak
            FROM training_stats WHERE user_id = ?
        """, (user_id,))
        
        current_stats = cursor.fetchone()
        if not current_stats:
            raise HTTPException(status_code=404, detail="User stats not found")
        
        total_problems, total_correct, total_attempts, current_streak, best_streak = current_stats
        
        # Update main stats
        total_attempts += 1
        if attempt.is_correct:
            total_correct += 1
            current_streak += 1
            best_streak = max(best_streak, current_streak)
        else:
            current_streak = 0
        
        success_rate = (total_correct / total_attempts) * 100 if total_attempts > 0 else 0
        
        cursor.execute("""
            UPDATE training_stats 
            SET total_correct = ?, total_attempts = ?, success_rate = ?, 
                current_streak = ?, best_streak = ?, last_update = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (total_correct, total_attempts, success_rate, current_streak, best_streak, user_id))
        
        # Update or insert problem stats
        cursor.execute("""
            INSERT OR IGNORE INTO problem_stats (user_id, problem_id, attempts, solved, first_try_solved, mastery_level, consecutive_correct)
            VALUES (?, ?, 0, FALSE, FALSE, 0, 0)
        """, (user_id, attempt.problem_id))
        
        cursor.execute("""
            SELECT attempts, solved, consecutive_correct, mastery_level FROM problem_stats 
            WHERE user_id = ? AND problem_id = ?
        """, (user_id, attempt.problem_id))
        
        problem_data = cursor.fetchone()
        attempts, solved, consecutive_correct, mastery_level = problem_data
        
        attempts += 1
        new_solved = solved or attempt.is_correct
        first_try_solved = attempt.is_correct and attempts == 1
        
        # Update consecutive correct and mastery level for spaced repetition
        if attempt.is_correct:
            consecutive_correct += 1
            # Increase mastery level based on performance
            if first_try_solved:
                mastery_level = min(8, mastery_level + 2)  # Bonus for first try
            else:
                mastery_level = min(8, mastery_level + 1)
        else:
            consecutive_correct = 0
            mastery_level = max(0, mastery_level - 1)  # Decrease mastery on failure
        
        # Calculate next review date based on mastery level
        intervals = {0: 0, 1: 1, 2: 3, 3: 7, 4: 14, 5: 30, 6: 90, 7: 180, 8: 365}
        interval_days = intervals.get(mastery_level, 0)
        
        # Calculate next review date
        from datetime import datetime, timedelta
        next_review_date = (datetime.now() + timedelta(days=interval_days)).date()
        
        if not solved and attempt.is_correct:
            total_problems += 1
            cursor.execute("""
                UPDATE training_stats SET total_problems = ? WHERE user_id = ?
            """, (total_problems, user_id))
        
        cursor.execute("""
            UPDATE problem_stats 
            SET attempts = ?, solved = ?, first_try_solved = ?, last_attempt = CURRENT_TIMESTAMP,
                mastery_level = ?, consecutive_correct = ?, next_review_date = ?, last_interval_days = ?
            WHERE user_id = ? AND problem_id = ?
        """, (attempts, new_solved, first_try_solved, mastery_level, consecutive_correct, 
              next_review_date, interval_days, user_id, attempt.problem_id))
        
        # Update category stats
        position = attempt.position
        error_type = position.get('error_type', '').lower()
        player_color = position.get('player_color', '')
        
        for category_type, category_value in [('error_type', error_type), ('player_color', player_color)]:
            if category_value:
                cursor.execute("""
                    INSERT OR IGNORE INTO category_stats 
                    (user_id, category_type, category_value, total, correct, attempts)
                    VALUES (?, ?, ?, 0, 0, 0)
                """, (user_id, category_type, category_value))
                
                cursor.execute("""
                    UPDATE category_stats 
                    SET total = total + ?, correct = correct + ?, attempts = attempts + 1,
                        last_update = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND category_type = ? AND category_value = ?
                """, (1 if not solved and attempt.is_correct else 0, 
                     1 if attempt.is_correct else 0, user_id, category_type, category_value))
        
        # Update daily stats
        today = date.today().isoformat()
        cursor.execute("""
            INSERT OR IGNORE INTO daily_stats (user_id, date, problems, correct, attempts)
            VALUES (?, ?, 0, 0, 0)
        """, (user_id, today))
        
        cursor.execute("""
            UPDATE daily_stats 
            SET problems = problems + ?, correct = correct + ?, attempts = attempts + 1
            WHERE user_id = ? AND date = ?
        """, (1 if not solved and attempt.is_correct else 0, 
             1 if attempt.is_correct else 0, user_id, today))
        
        conn.commit()
        return {"message": "Attempt recorded successfully"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.post("/api/sessions")
async def create_session(session: TrainingSession, user_id: str = "default_user"):
    """Create or update a training session"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            INSERT OR REPLACE INTO training_sessions 
            (user_id, session_id, start_time, end_time, total_attempts, 
             correct_answers, completed_problems, problems_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, session.session_id, session.start_time, session.end_time,
              session.total_attempts, session.correct_answers, session.completed_problems,
              json.dumps(session.problems)))
        
        conn.commit()
        return {"message": "Session saved successfully"}
        
    finally:
        conn.close()

@app.get("/api/sessions")
async def get_sessions(user_id: str = "default_user", limit: int = 100):
    """Get training sessions history"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            SELECT session_id, start_time, end_time, total_attempts, 
                   correct_answers, completed_problems, problems_data
            FROM training_sessions 
            WHERE user_id = ?
            ORDER BY start_time DESC 
            LIMIT ?
        """, (user_id, limit))
        
        sessions = []
        for row in cursor.fetchall():
            sessions.append({
                "id": row[0],
                "startTime": row[1],
                "endTime": row[2],
                "totalAttempts": row[3],
                "correctAnswers": row[4],
                "completedProblems": row[5],
                "problems": json.loads(row[6]) if row[6] else []
            })
        
        return sessions
        
    finally:
        conn.close()

@app.delete("/api/stats/reset")
async def reset_stats(user_id: str = "default_user"):
    """Reset all statistics for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        conn.execute("BEGIN")
        
        # Reset main stats
        cursor.execute("""
            UPDATE training_stats 
            SET total_problems = 0, total_correct = 0, total_attempts = 0,
                success_rate = 0.0, current_streak = 0, best_streak = 0,
                last_update = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (user_id,))
        
        # Clear other tables
        for table in ['problem_stats', 'category_stats', 'daily_stats', 'training_sessions']:
            cursor.execute(f"DELETE FROM {table} WHERE user_id = ?", (user_id,))
        
        conn.commit()
        return {"message": "Statistics reset successfully"}
        
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@app.get("/api/export")
async def export_data(user_id: str = "default_user"):
    """Export all user data"""
    stats = await get_stats(user_id)
    sessions = await get_sessions(user_id)
    
    return {
        "stats": stats.dict(),
        "sessions": sessions,
        "exportDate": datetime.now().isoformat(),
        "userId": user_id
    }

@app.get("/api/spaced-repetition/queue")
async def get_spaced_repetition_queue(user_id: str = "default_user", max_problems: int = 50):
    """Get problems scheduled for spaced repetition review"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all problem statistics with spaced repetition data
        cursor.execute("""
            SELECT problem_id, attempts, solved, first_try_solved, last_attempt, 
                   mastery_level, consecutive_correct, next_review_date, last_interval_days,
                   JULIANDAY('now') - JULIANDAY(last_attempt) as days_since_last_attempt
            FROM problem_stats 
            WHERE user_id = ?
            ORDER BY next_review_date ASC NULLS FIRST, last_attempt ASC
        """, (user_id,))
        
        problem_stats = []
        for row in cursor.fetchall():
            (problem_id, attempts, solved, first_try_solved, last_attempt, 
             mastery_level, consecutive_correct, next_review_date, last_interval_days, days_since) = row
            
            # Check if due for review
            from datetime import datetime, date
            today = date.today()
            review_date = datetime.strptime(next_review_date, '%Y-%m-%d').date() if next_review_date else today
            is_due = review_date <= today or mastery_level == 0
            
            # Calculate priority for sorting
            priority = 100
            
            # Higher priority for overdue problems
            if review_date < today:
                days_overdue = (today - review_date).days
                priority += days_overdue * 15
            
            # Higher priority for failed problems
            if not solved or mastery_level == 0:
                priority += 50
            
            # Higher priority for problems with many failed attempts
            if attempts > consecutive_correct:
                priority += (attempts - consecutive_correct) * 10
            
            # Lower priority for well-mastered problems
            priority -= mastery_level * 10
            
            # Add some randomness to avoid monotony
            import random
            priority += random.randint(-5, 5)
            
            problem_stats.append({
                "problem_id": problem_id,
                "attempts": attempts,
                "solved": bool(solved),
                "first_try_solved": bool(first_try_solved),
                "last_attempt": last_attempt,
                "days_since_last_attempt": days_since or 0,
                "mastery_level": mastery_level or 0,
                "consecutive_correct": consecutive_correct or 0,
                "next_review_date": next_review_date,
                "last_interval_days": last_interval_days or 0,
                "is_due": is_due,
                "priority": priority,
                "days_overdue": max(0, (today - review_date).days) if next_review_date else 0
            })
        
        # Sort by priority (highest first)
        problem_stats.sort(key=lambda x: x["priority"], reverse=True)
        
        # Filter to due problems and limit
        due_problems = [p for p in problem_stats if p["is_due"]][:max_problems]
        
        return {
            "due_problems": due_problems,
            "total_problems": len(problem_stats),
            "due_count": len([p for p in problem_stats if p["is_due"]]),
            "mastered_count": len([p for p in problem_stats if p["mastery_level"] >= 5]),
            "new_problems": len([p for p in problem_stats if p["mastery_level"] == 0])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

@app.get("/api/database/content")
async def get_database_content():
    """Get all database table contents for viewing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        result = {}
        
        # Get all tables
        tables = [
            'training_stats',
            'problem_stats', 
            'category_stats',
            'daily_stats',
            'training_sessions'
        ]
        
        for table in tables:
            cursor.execute(f"SELECT * FROM {table}")
            columns = [description[0] for description in cursor.description]
            rows = cursor.fetchall()
            
            # Convert rows to dictionaries
            result[table] = []
            for row in rows:
                row_dict = {}
                for i, value in enumerate(row):
                    row_dict[columns[i]] = value
                result[table].append(row_dict)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
