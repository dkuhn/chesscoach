# Chess Training Backend

A FastAPI-based backend service for persistent storage of chess training statistics and session data.

## Features

- **RESTful API** for training statistics management
- **SQLite Database** for persistent data storage
- **User Session Tracking** with detailed analytics
- **Problem-specific Statistics** including attempts and success rates
- **Category-based Analytics** by error type and player color
- **Daily Progress Tracking** with historical data
- **Data Export/Import** capabilities for backup and migration
- **CORS Support** for React frontend integration

## Quick Start

### Option 1: Using the Start Script
```bash
./start_backend.sh
```

### Option 2: Manual Setup
```bash
# Activate conda environment
conda activate chesscoach

# Install dependencies (if needed)
pip install -r requirements.txt

# Start the server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Option 3: Using Python Setup Script
```bash
python3 setup_and_run.py
```

## API Endpoints

### Statistics
- `GET /api/stats` - Get current training statistics
- `POST /api/record-attempt` - Record a training attempt
- `DELETE /api/stats/reset` - Reset all statistics

### Sessions
- `GET /api/sessions` - Get training session history
- `POST /api/sessions` - Save a training session

### Data Management
- `GET /api/export` - Export all user data
- `POST /api/import` - Import user data (if implemented)

### Health Check
- `GET /` - API health check

## Database Schema

The backend uses SQLite with the following tables:

### training_stats
Main statistics table storing overall progress metrics.

### problem_stats
Problem-specific statistics including attempts and success rates.

### category_stats
Statistics grouped by error type (blunder/mistake) and player color.

### daily_stats
Daily progress tracking for historical analysis.

### training_sessions
Complete session data with problem details.

## Configuration

- **Host**: 0.0.0.0 (accepts connections from any IP)
- **Port**: 8000
- **Database**: chess_training.db (SQLite)
- **CORS**: Enabled for localhost:3000 and localhost:3002

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Development

To modify the backend:

1. Edit `app.py` for API logic
2. Update `requirements.txt` for new dependencies
3. The database schema is auto-created on first run
4. Use `--reload` flag for auto-reloading during development

## Integration with Frontend

The React frontend uses the `ChessTrainingAPI` service to communicate with this backend. If the backend is unavailable, the frontend will fall back to local-only mode.

## Data Persistence

All data is stored in a local SQLite database file (`chess_training.db`) which persists between server restarts. This file can be backed up or migrated as needed.
