
# Chess Trainer Web App

An interactive React-based chess training platform that helps you improve by practicing positions from your own Chess.com games. Powered by spaced repetition, persistent statistics, and error-focused training.


## Quick Start

1. **Install dependencies:**
   ```bash
   cd web_trainer
   npm install
   ```

2. **Load your training data:**
   ```bash
   # From the root directory (chesscoach/)
   python update_trainer_data.py blitz
   # or
   python update_trainer_data.py bullet
   # or just run without arguments to see available options
   python update_trainer_data.py
   ```

3. **Start the development server:**
   ```bash
   cd web_trainer
   npm start
   ```

4. **Open your browser:**
   Go to [http://localhost:3000](http://localhost:3000)


## Key Features

- **Spaced Repetition Training:** Practice positions using a proven memory technique (like Anki) for maximum retention.
- **Persistent Progress Tracking:** All your attempts, mastery, and stats are stored in a database—never lose your progress.
- **Error-Focused Practice:** Filter and train on Blunders, Mistakes, or all errors to target your weaknesses.
- **Interactive Chessboard:** Drag and drop pieces to make moves, with instant feedback.
- **Detailed Feedback:** See your move, the best move, and how it changed the evaluation.
- **Session Stats:** Track your accuracy, auto-reveals, and review queue in real time.
- **Game Context:** Each position shows move number, color, error type, game date, and player name.


## How to Use

1. **Study the position:** Review the board, move number, error type, and game context.
2. **Make your move:** Drag a piece to play your answer.
3. **Get instant feedback:** See if your move matches the engine's best move and how it affects the evaluation.
4. **Auto-reveal:** After 3 failed attempts, the solution is shown automatically.
5. **Filter training:** Use the filter bar to focus on Blunders, Mistakes, or all errors.
6. **Track your progress:** Session stats and mastery are updated and stored automatically.


## Data Source

Training positions are generated from your Chess.com games using the `analyze_chess_games.py` script. Each position includes:

- Board state (FEN)
- Your move and the engine's best move
- Evaluation before and after your move
- Error type (Blunder, Mistake, Inaccuracy)
- Game context: move number, color, date played, player name


## Tips for Effective Training

- **Focus on patterns:** Look for recurring tactical and positional motifs.
- **Review your mistakes:** Understand why the best move is superior.
- **Practice regularly:** Consistency is key to improvement.
- **Use filters:** Target your weakest areas by training only blunders or mistakes.


## Troubleshooting

- **No positions loading:** Ensure `analysis_results.json` exists in the `public/` folder.
- **Board not displaying:** Make sure all npm dependencies are installed.
- **Data not updating:** Re-run the `update_trainer_data.py` script after analyzing new games.
- **Stats not saving:** Confirm the backend server is running and accessible.

r2qkb1r/pp3p1p/2n2p2/3ppb2/3P4/2N2N2/PPP1BPPP/R2Q1RK1 w kq - 0 10

## File Structure

```
web_trainer/
├── public/
│   ├── analysis_results.json    # Training positions (auto-generated)
│   └── index.html
├── src/
│   ├── components/
│   │   ├── SpacedRepetitionTrainer.js # Main spaced repetition component
│   │   └── ChessboardTrainer.js      # Chessboard UI
│   ├── utils/
│   │   └── ChessTrainingAPI.js       # API for backend stats
│   ├── App.js                        # Main app component
│   └── index.js
└── package.json
```

## License

MIT License

## Contributing

Contributions are welcome! Please open an issue or pull request with improvements, bug fixes, or new features.
