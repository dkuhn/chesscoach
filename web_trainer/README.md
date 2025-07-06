# Chess Trainer Web App

This React-based web a## Data Source

The training positions come from your Chess.com game analysis, processed by the `analyze_chess_games.py` script. Each position includes:ication allows you to train on positions from your Chess.com game analysis.

## Setup

1. **Install dependencies:**
   ```bash
   cd web_trainer
   npm install
   ```

2. **Load training data:**
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
   Navigate to `http://localhost:3000`

## Features

- **Interactive chessboard:** Drag and drop pieces to make moves
- **Position training:** Practice finding the best moves from your actual games
- **Progress tracking:** See how many problems you've solved
- **Error categorization:** Focus on specific types of mistakes (Blunder, Mistake, Inaccuracy)
- **Evaluation display:** See how your moves affected the position evaluation

## How to Use

1. **Study the position:** Look at the board and try to find the best move
2. **Make your move:** Drag a piece to make your move on the board
3. **Get feedback:** The app will tell you if you found the best move
4. **Navigate:** Use Previous/Next buttons to move between problems
5. **Track progress:** Monitor your solving percentage and attempts

## Data Sources

The training positions come from your Chess.com game analysis, processed by the `analyze_chess_games.py` script. Each position includes:

- The board state (FEN)
- Your actual move vs. the best move
- Evaluation before and after the move
- Error classification (Blunder, Mistake, Inaccuracy)
- Game context (move number, color to play)

## Tips

- **Focus on pattern recognition:** Look for common tactical and positional themes
- **Review mistakes:** Pay attention to why the suggested move is better
- **Practice regularly:** Regular training helps improve pattern recognition
- **Analyze evaluations:** Understand how moves affect position evaluation

## Troubleshooting

- **No positions loading:** Make sure `analysis_results.json` exists in the `public/` folder
- **Board not displaying:** Ensure all npm dependencies are installed
- **Data not updating:** Re-run the `update_trainer_data.py` script

## File Structure

```
web_trainer/
├── public/
│   ├── analysis_results.json    # Training positions (auto-generated)
│   └── index.html
├── src/
│   ├── components/
│   │   └── ChessboardTrainer.js # Main training component
│   ├── App.js                   # Main app component
│   └── index.js
└── package.json
```
  - Flip board orientation
  - Reset to starting position
  - Load example positions
- **Real-time FEN Display**: See the current position in FEN format
- **Mobile Responsive**: Works on desktop and mobile devices

## Example FEN Position

The application comes with a pre-loaded example position:
```
r2qkb1r/pp3p1p/2n2p2/3ppb2/3P4/2N2N2/PPP1BPPP/R2Q1RK1 w kq - 0 10
```

## Installation

1. Clone or download the project:
```bash
git clone <repository-url>
cd chessboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Loading Positions
- Enter any valid FEN string in the input field and press Enter
- Use the "Load Example FEN" button to see a sample position
- Click "Reset Board" to return to the starting position

### Interacting with the Board
- Drag and drop pieces to move them
- Click "Flip Board" to change the board orientation
- The current position FEN is displayed at the bottom

### FEN Format
FEN (Forsyth-Edwards Notation) describes a chess position. Format:
```
[piece placement] [active color] [castling rights] [en passant] [halfmove] [fullmove]
```

Example: `rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1`

## Project Structure

```
chessboard/
├── server.js              # Express server
├── package.json           # Node.js dependencies
├── public/
│   ├── index.html         # Main HTML page
│   └── app.js            # Client-side JavaScript
├── .github/
│   └── copilot-instructions.md
└── README.md
```

## Dependencies

- **Express**: Web server framework
- **Chessground**: Lichess chess board component
- **Node.js**: Runtime environment

## Development

The application uses:
- Modern ES6+ JavaScript
- CSS Grid and Flexbox for responsive layout
- Chessground library for chess board functionality
- Express.js for serving static files

## Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License


ISC License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## API Reference

### Client-side Functions

- `loadPosition(fen)` - Load a position from FEN string
- `loadExamplePosition()` - Load the example position
- `resetBoard()` - Reset to starting position
- `flipBoard()` - Flip board orientation
- `updateFenDisplay()` - Update the FEN display

### Window Utils (Debug)

Access via `window.boardUtils`:
- `getCurrentFen()` - Get current position as FEN
- `getCurrentPosition()` - Get current position object
- `loadFen(fen)` - Load position from FEN
- `getBoard()` - Get Chessground board instance
