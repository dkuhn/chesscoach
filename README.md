# 🏆 Chess Training Platform

A modern chess improvement platform that analyzes your Chess.com games to identify mistakes and provides intelligent spaced repetition training to help you learn from your errors. Built with React, FastAPI, and advanced spaced repetition algorithms.

![Chess Training Platform](https://img.shields.io/badge/React-18+-blue) ![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green) ![Python](https://img.shields.io/badge/Python-3.8+-brightgreen)

## ✨ What Makes This Special

This isn't just another chess puzzle trainer. It's a complete learning system that:

- 🎯 **Learns from YOUR games** - Analyzes your actual Chess.com games to find your specific weaknesses
- 🧠 **Uses proven spaced repetition** - Anki-style algorithm ensures you practice the right positions at the right time
- 📈 **Tracks real progress** - Persistent statistics show your improvement over time
- 🔄 **Adapts to your performance** - Difficult positions appear more often until mastered
- 💡 **Prevents frustration** - Auto-reveals solutions after 3 failed attempts
- 🚀 **Built for the modern web** - Clean React interface with professional backend

## 🌟 Key Features

### 🔍 **Intelligent Game Analysis**
- **Automatic Download**: Fetches all your Chess.com games via API
- **Deep Engine Analysis**: Stockfish analysis identifies blunders (200+ cp loss) and mistakes (100-199 cp loss)
- **Smart Filtering**: Creates focused training sets from your actual game positions
- **Multiple Time Controls**: Supports blitz, bullet, rapid, and classical games

### 🧠 **Advanced Spaced Repetition**
- **8-Level Mastery System**: Progress from "New" to "Mastered" with scientific intervals
- **Adaptive Scheduling**: Difficult positions return faster, mastered ones have longer intervals
- **Performance Tracking**: Every attempt, timing, and result is recorded
- **Auto-Reveal Logic**: Shows solution after 3 failed attempts to maintain flow

### 💻 **Professional Interface**
- **Multiple Training Modes**: Spaced repetition, practice mode, and game browsing
- **Real-time Statistics**: Live session tracking and historical progress
- **Database Viewer**: Admin interface for data inspection and management
- **Responsive Design**: Works seamlessly on desktop and mobile

### 🗄️ **Robust Backend**
- **FastAPI Architecture**: Modern, fast API with automatic documentation
- **SQLite Database**: Reliable local storage with full migration support
- **RESTful Endpoints**: Clean API design for statistics, sessions, and progress
- **Data Export/Import**: Backup and restore your training data

## 🚀 Quick Start

### Option 1: One-Command Setup
```bash
git clone https://github.com/your-repo/chesscoach.git
cd chesscoach
./install.sh
```

### Option 2: Manual Setup
```bash
# 1. Setup Python environment
conda create -n chesscoach python=3.9
conda activate chesscoach
pip install -r requirements.txt

# 2. Setup React frontend
cd web_trainer
npm install
cd ..

# 3. Configure Chess.com username
cp .env.example .env
echo "CHESSCOM_USERNAME=your_username" >> .env

# 4. Download and analyze your games
python analyze_chess_games.py

# 5. Start the system
cd backend && python app.py &
cd web_trainer && npm start
```

Open `http://localhost:3000` and start training!

## 📋 Requirements

### Essential
- **Python 3.8+** (3.9+ recommended)
- **Node.js 16+** and npm
- **Stockfish Chess Engine** ([Download](https://stockfishchess.org/download/))

### Stockfish Installation
The system auto-detects Stockfish in standard locations:
- **macOS (Homebrew)**: `/opt/homebrew/bin/stockfish`
- **macOS (Manual)**: `/usr/local/bin/stockfish`
- **Windows**: `C:/Stockfish/stockfish-windows-x64-avx2.exe`
- **Linux**: `/usr/games/stockfish` or `/usr/bin/stockfish`

Custom path: Set `STOCKFISH_PATH` in your `.env` file.

## 🎮 Training Workflow

### 1. **Game Analysis** 📊
```bash
# Download and analyze your games
python analyze_chess_games.py

# Optional: Manage your training data
python update_trainer_data.py
```

### 2. **Start Training System** 🚀
```bash
# Terminal 1: Start backend
cd backend && python app.py

# Terminal 2: Start frontend
cd web_trainer && npm start
```

### 3. **Train Effectively** 🎯
- **Spaced Repetition Mode**: Optimal learning with intelligent scheduling
- **Practice Mode**: Traditional training with immediate feedback
- **Browse Mode**: Explore all your analyzed positions

## 🏗️ Project Architecture

```
chesscoach/
├── 📂 backend/                    # FastAPI Server
│   ├── app.py                     # API endpoints & spaced repetition logic
│   ├── requirements.txt           # Backend dependencies
│   └── chess_training.db          # SQLite database (auto-created)
├── 📂 web_trainer/                # React Frontend
│   ├── src/
│   │   ├── components/            # React components
│   │   │   ├── ChessboardTrainer.js      # Main training interface
│   │   │   ├── SpacedRepetitionTrainer.js # Spaced repetition logic
│   │   │   └── DatabaseViewer.js          # Admin interface
│   │   ├── utils/
│   │   │   └── ChessTrainingAPI.js       # API communication
│   │   └── App.js                 # Main application
│   ├── public/                    # Static assets
│   └── package.json              # Frontend dependencies
├── 📂 game_analysis/              # Analysis output (auto-created)
├── analyze_chess_games.py         # Game analysis script
├── update_trainer_data.py        # Data management
├── validate_setup.py             # System validation
├── requirements.txt              # Python dependencies
└── install.sh                   # Automated setup
```

## 🎯 Training Modes Deep Dive

### 🧠 Spaced Repetition (Recommended)
**The Science**: Based on proven memory research, this mode optimizes when you see each position.

- **New Positions**: Shown frequently until first correct solution
- **Mastery Levels**: 8 levels from "New" (0) to "Mastered" (8)
- **Smart Intervals**: 1 day → 3 days → 1 week → 2 weeks → 1 month → etc.
- **Failure Recovery**: Wrong answers reset to shorter intervals
- **Auto-Reveal**: Solution shown after 3 attempts to prevent frustration
- **Session Limits**: Balanced mix of new and review positions

### ♟️ Practice Mode
**Immediate Learning**: Traditional training with instant feedback.

- **Immediate Feedback**: See the correct move after each attempt
- **All Positions**: Practice any subset of your analyzed games
- **Manual Control**: Navigate positions at your own pace
- **Context Rich**: Full game information and player details

### 📚 Browse Mode
**Exploration**: Examine all your analyzed positions.

- **Complete Library**: Every analyzed game position
- **Rich Context**: Game details, opponent info, time control
- **Direct Training**: Jump into practice mode from any position
- **Filtering**: Find specific types of mistakes or time periods

## 📊 Analytics & Progress Tracking

### 📈 Session Statistics
- **Problems Studied**: Count of positions practiced
- **Accuracy Rate**: Percentage of correct first attempts
- **Time Efficiency**: Average time per position
- **Auto-Reveals**: Positions where solution was shown
- **Current Streak**: Consecutive correct answers

### 📉 Long-term Progress
- **Mastery Distribution**: How many positions at each level
- **Category Performance**: Blunders vs. mistakes accuracy
- **Improvement Trends**: Progress over days/weeks/months
- **Problem History**: Complete attempt log for each position

### 🗃️ Database Management
- **Complete Overview**: All stored statistics and progress
- **Data Export**: Backup your training data
- **Data Import**: Restore from backups
- **Fresh Start**: Clear statistics while keeping positions

## ⚙️ Configuration & Customization

### Environment Setup (`.env`)
```bash
# Required
CHESSCOM_USERNAME=your_chess_username

# Optional customizations
STOCKFISH_PATH=/custom/path/to/stockfish
ANALYSIS_DEPTH=15
ENGINE_TIME_LIMIT=0.1
```

### Advanced Configuration
- **Training Limits**: Modify session limits in `SpacedRepetitionTrainer.js`
- **Spaced Intervals**: Adjust repetition timing in `backend/app.py`
- **Analysis Settings**: Change Stockfish depth in `analyze_chess_games.py`
- **UI Preferences**: Customize colors and themes in React components

## 🛠️ Troubleshooting

### Quick Validation
```bash
python validate_setup.py
```

### Common Solutions
| Problem | Solution |
|---------|----------|
| ❌ No games found | Verify Chess.com username in `.env` |
| ❌ Stockfish not found | Check installation path and permissions |
| ❌ Backend offline | Ensure FastAPI runs on port 8000 |
| ❌ React errors | Delete `node_modules`, run `npm install` |
| ❌ Database issues | Delete `backend/chess_training.db` to reset |

### Performance Tips
- **Large Game Collections**: Use `update_trainer_data.py` to manage datasets
- **Slow Analysis**: Reduce `ENGINE_TIME_LIMIT` for faster processing
- **Memory Issues**: Process games in smaller batches

## 🤝 Contributing & Development

This platform is designed for extensibility:

### Backend Extensions
- Add new API endpoints in `backend/app.py`
- Implement additional spaced repetition algorithms
- Create new statistical analysis features

### Frontend Enhancements
- Build new training modes in `web_trainer/src/components/`
- Add visualization components for progress tracking
- Implement user authentication and multi-user support

### Analysis Improvements
- Support additional chess platforms (Lichess, Chess24)
- Add opening/endgame specific analysis
- Implement tactical pattern recognition

## 📄 Output Format & Data Structure

The analysis generates structured data for each problematic position:

```json
{
  "fen": "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
  "move_number": 15,
  "player_color": "white",
  "player_move": "e2e4",
  "eval_before_move_cp": 25,
  "eval_after_move_cp": -175,
  "best_move": "d2d4",
  "error_type": "Blunder",
  "game_url": "https://www.chess.com/game/live/12345"
}
```

## 📜 License

This project is open source and available under the MIT License. Feel free to use, modify, and distribute.

## 🙏 Acknowledgments

- **Stockfish Team**: For the powerful chess engine
- **Chess.com**: For providing the public API
- **python-chess**: For excellent chess programming utilities
- **React & FastAPI**: For modern web development frameworks

---

**Ready to improve your chess?** Start by running `./install.sh` and begin your personalized training journey!
