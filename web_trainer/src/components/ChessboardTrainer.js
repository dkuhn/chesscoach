import React, { useState, useRef, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import ChessTrainingAPI from "../utils/ChessTrainingAPI";

// Helper function to get the position before the player's move
const getPositionBeforeMove = (position) => {
  if (!position || !position.fen || !position.player_move) return "start";
  
  try {
    // The FEN in our data is the position AFTER the player's move
    // We need to get the position BEFORE the move
    const afterMoveChess = new Chess(position.fen);
    
    // Get the move history
    const history = afterMoveChess.history({ verbose: true });
    
    if (history.length > 0) {
      // Undo the last move to get the position before
      afterMoveChess.undo();
      const beforeMoveFen = afterMoveChess.fen();
      
      // Ensure the turn matches the player color
      const fenParts = beforeMoveFen.split(' ');
      fenParts[1] = position.player_color === 'black' ? 'b' : 'w';
      
      return fenParts.join(' ');
    }
    
    // If no history, this might be a starting position issue
    // Try a different approach: manually reverse the move
    return reversePlayerMove(position);
    
  } catch (error) {
    console.error("Error calculating position before move:", error);
    // Fallback: try to manually reverse the move
    return reversePlayerMove(position);
  }
};

// Helper function to manually reverse a move
const reversePlayerMove = (position) => {
  try {
    // Start with the position after the move
    const chess = new Chess(position.fen);
    
    // Parse the player move (UCI format: e2e4)
    const move = position.player_move;
    if (!move || move.length < 4) return position.fen;
    
    const fromSquare = move.substring(0, 2);
    const toSquare = move.substring(2, 4);
    
    // Get what piece is currently on the destination square
    const piece = chess.get(toSquare);
    if (!piece) {
      console.warn("No piece found on destination square, using original position");
      return position.fen;
    }
    
    // Remove the piece from the destination
    chess.remove(toSquare);
    
    // Put the piece back on the source square
    chess.put(piece, fromSquare);
    
    // Switch the turn to the player who should be moving
    // If the position says player_color is 'black', then it should be black's turn
    const fenParts = chess.fen().split(' ');
    fenParts[1] = position.player_color === 'black' ? 'b' : 'w';
    
    // Also need to adjust move numbers if it was black's move
    if (position.player_color === 'black') {
      const moveNumber = parseInt(fenParts[5]);
      fenParts[5] = Math.max(1, moveNumber - 1).toString();
    }
    
    const correctedFen = fenParts.join(' ');
    
    return correctedFen;
    
  } catch (error) {
    console.error("Error reversing move manually:", error);
    return position.fen;
  }
};

function ChessboardTrainer({ 
  positions, 
  initialIndex = 0, 
  solved, 
  setSolved, 
  onIncorrectAttempt,
  showSolutionOverride = false
}) {
  const [current, setCurrent] = useState(initialIndex);
  const [feedback, setFeedback] = useState("");
  const [attempts, setAttempts] = useState(Array(positions.length).fill(0));
  const [boardFen, setBoardFen] = useState(() => {
    const pos = positions[initialIndex];
    return pos ? getPositionBeforeMove(pos) : "start";
  });
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [showPlayerMove, setShowPlayerMove] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [stats, setStats] = useState({
    totalProblems: 0,
    totalCorrect: 0,
    totalAttempts: 0,
    successRate: 0,
    streak: 0,
    bestStreak: 0,
    lastUpdate: new Date().toISOString(),
    problemStats: {},
    categoryStats: {},
    dailyStats: {}
  });
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const chessRef = useRef();
  const apiService = useRef(new ChessTrainingAPI());

  const pos = positions[current];

  // Initialize session and stats on component mount
  useEffect(() => {
    const initializeStats = async () => {
      try {
        // Check backend availability
        const backendAvailable = await apiService.current.checkBackendAvailability();
        setIsBackendAvailable(backendAvailable);
        
        if (backendAvailable) {
          // Initialize session and load stats from backend
          const session = apiService.current.startSession();
          setCurrentSession(session);
          
          const currentStats = await apiService.current.getStats();
          setStats(currentStats);
        } else {
          // Fallback to default stats if backend unavailable
          const session = apiService.current.startSession();
          setCurrentSession(session);
          setStats(apiService.current.getDefaultStats());
        }
      } catch (error) {
        console.error('Error initializing stats:', error);
        // Fallback to default stats
        const session = apiService.current.startSession();
        setCurrentSession(session);
        setStats(apiService.current.getDefaultStats());
        setIsBackendAvailable(false);
      }
    };
    
    initializeStats();
  }, []);

  // Generate a unique problem ID
  const getProblemId = (position, index) => {
    return `${position.fen}_${position.player_move}_${index}`;
  };

  // Update when initialIndex changes (from external navigation)
  useEffect(() => {
    setCurrent(initialIndex);
    setShowHint(false);
    setShowSolution(false);
  }, [initialIndex]);

  // Reset board when changing problem
  React.useEffect(() => {
    if (pos && pos.fen) {
      const beforeMoveFen = getPositionBeforeMove(pos);
      
      chessRef.current = new Chess(beforeMoveFen);
      setBoardFen(beforeMoveFen);
    } else {
      chessRef.current = new Chess();
      setBoardFen("start");
    }
    setFeedback("");
    setShowHint(false);
    setShowSolution(false);
    setShowPlayerMove(false);
  }, [current, pos && pos.fen]);

  // Return early if no position is available - AFTER all hooks
  if (!pos) {
    return (
      <div style={{textAlign: "center", padding: "20px"}}>
        <h2>No training positions available</h2>
        <p>Please make sure training data is loaded properly.</p>
      </div>
    );
  }

  // Helper function to get piece name
  const getPieceName = (square) => {
    if (!chessRef.current) return "";
    const piece = chessRef.current.get(square);
    if (!piece) return "";
    const names = {
      'p': 'pawn', 'r': 'rook', 'n': 'knight', 
      'b': 'bishop', 'q': 'queen', 'k': 'king'
    };
    return names[piece.type] || "";
  };

  const getHint = () => {
    if (!pos.best_move || pos.best_move.length < 4) return "Look for the best move in this position.";
    
    const fromSquare = pos.best_move.substring(0, 2);
    const toSquare = pos.best_move.substring(2, 4);
    const pieceName = getPieceName(fromSquare);
    
    return `Try moving your ${pieceName} from ${fromSquare}.`;
  };

  function next() {
    setCurrent(c => Math.min(positions.length - 1, c + 1));
  }
  function prev() {
    setCurrent(c => Math.max(0, c - 1));
  }

  return (
    <div>
      <h2>Problem {current + 1} / {positions.length}</h2>
      <div style={{marginBottom: 15, padding: 10, backgroundColor: "#f5f5f5", borderRadius: 5}}>
        <div><b>Move:</b> {pos.move_number} | <b>Playing as:</b> {pos.player_color} | <b>Error Type:</b> {pos.error_type}</div>
        <div style={{marginTop: 5, fontSize: "14px", color: "#666"}}>
          Find the best move in this position. 
          {showPlayerMove && (
            <span style={{color: "#dc3545", fontWeight: "bold"}}> Your move was: <code>{pos.player_move}</code></span>
          )}
        </div>
      </div>
      
      <div style={{ width: 400, margin: "auto" }}>
        <Chessboard
          position={boardFen}
          boardWidth={400}
          id={"trainer-board-" + current}
          boardOrientation={pos.player_color}
          arePiecesDraggable={!solved[current]}
          customArrowColor="rgba(255, 0, 0, 0.8)"
          customArrows={[
            // Red arrow for player's move
            ...(showPlayerMove && pos.player_move && pos.player_move.length >= 4 ? [
              [pos.player_move.substring(0, 2), pos.player_move.substring(2, 4), 'rgba(255, 0, 0, 0.8)']
            ] : []),
            // Green arrow for best move
            ...((showSolution || showSolutionOverride) && pos.best_move && pos.best_move.length >= 4 ? [
              [pos.best_move.substring(0, 2), pos.best_move.substring(2, 4), 'rgba(0, 255, 0, 0.8)']
            ] : [])
          ]}
          onPieceDrop={async (sourceSquare, targetSquare) => {
            if (!chessRef.current) {
              console.error("Chess instance not initialized");
              return false;
            }
            
            // Ensure the chess instance is in the correct position
            const expectedFen = getPositionBeforeMove(pos);
            if (chessRef.current.fen() !== expectedFen) {
              console.warn("Board state mismatch, resetting to correct position");
              chessRef.current = new Chess(expectedFen);
              setBoardFen(expectedFen);
            }
            
            const chess = chessRef.current;
            
            // Check if this is a pawn promotion move before attempting
            const piece = chess.get(sourceSquare);
            
            const needsPromotion = piece && piece.type === 'p' && 
              ((piece.color === 'w' && targetSquare[1] === '8') || 
               (piece.color === 'b' && targetSquare[1] === '1'));
            
            // Try the move with appropriate parameters
            let move;
            try {
              if (needsPromotion) {
                // For pawn promotion, include promotion parameter
                move = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
              } else {
                // For regular moves, no promotion
                move = chess.move({ from: sourceSquare, to: targetSquare });
              }
            } catch (error) {
              console.error("Error making move:", error);
              move = null;
            }
            
            if (!move) {
              console.error(`Invalid move: ${sourceSquare} to ${targetSquare}`);
              setFeedback("❌ Invalid move. Please try again.");
              return false;
            }
            
            setBoardFen(chess.fen());
            
            // Update attempts count
            const newAttempts = [...attempts];
            newAttempts[current] += 1;
            setAttempts(newAttempts);
            
            // Compare with best_move (in UCI format)
            const userUci = sourceSquare + targetSquare;
            const isCorrect = userUci === pos.best_move;
            const problemId = getProblemId(pos, current);
            
            if (isCorrect) {
              setFeedback("✅ Excellent! You found the best move!");
              setSolved(s => { const copy = [...s]; copy[current] = true; return copy; });
              
              // Record successful attempt
              if (isBackendAvailable) {
                try {
                  const updatedStats = await apiService.current.recordAttempt(
                    problemId, 
                    pos, 
                    true, 
                    newAttempts[current]
                  );
                  setStats(updatedStats);
                } catch (error) {
                  console.error('Error recording successful attempt:', error);
                  setIsBackendAvailable(false);
                }
              }
              
              // Update session
              if (currentSession) {
                currentSession.correctAnswers++;
                currentSession.totalAttempts++;
                if (newAttempts[current] === 1) {
                  currentSession.completedProblems++;
                }
                currentSession.problems.push({
                  problemId,
                  attempts: newAttempts[current],
                  solved: true,
                  move: userUci,
                  timestamp: new Date().toISOString()
                });
              }
            } else {
              const evalLoss = (pos.eval_before_move_cp != null && pos.eval_after_move_cp != null) 
                ? pos.eval_before_move_cp - pos.eval_after_move_cp 
                : 0;
              
              // Different feedback for spaced repetition vs regular practice
              if (onIncorrectAttempt) {
                // Spaced repetition mode - don't reveal the answer
                setFeedback("❌ Not the best move. Try again or the solution will be revealed after 3 attempts.");
              } else {
                // Regular practice mode - show the answer
                setFeedback(`❌ Not the best move. The best move was: ${pos.best_move} (saves ${Math.abs(evalLoss)} centipawns)`);
              }
              
              // Record failed attempt
              if (isBackendAvailable) {
                try {
                  const updatedStats = await apiService.current.recordAttempt(
                    problemId, 
                    pos, 
                    false, 
                    newAttempts[current]
                  );
                  setStats(updatedStats);
                } catch (error) {
                  console.error('Error recording failed attempt:', error);
                  setIsBackendAvailable(false);
                }
              }
              
              // Update session
              if (currentSession) {
                currentSession.totalAttempts++;
                currentSession.problems.push({
                  problemId,
                  attempts: newAttempts[current],
                  solved: false,
                  move: userUci,
                  timestamp: new Date().toISOString()
                });
              }

              // Callback for spaced repetition attempt tracking
              if (onIncorrectAttempt) {
                onIncorrectAttempt();
              }
            }
            
            return true;
          }}
        />
      </div>
      
      <div style={{margin: "15px 0", minHeight: 30, textAlign: "center", fontSize: "16px"}}>
        {feedback}
      </div>

      {/* Action buttons */}
      <div style={{textAlign: "center", marginBottom: 15}}>
        <button 
          onClick={() => setShowPlayerMove(!showPlayerMove)}
          style={{
            marginRight: 10, 
            padding: "8px 16px", 
            fontSize: "14px",
            backgroundColor: showPlayerMove ? "#dc3545" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          {showPlayerMove ? "Hide" : "Show"} Your Move
        </button>
        
        <button 
          onClick={() => setShowHint(!showHint)}
          style={{
            marginRight: 10, 
            padding: "8px 16px", 
            fontSize: "14px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          💡 {showHint ? "Hide" : "Show"} Hint
        </button>
        
        <button 
          onClick={() => setShowSolution(!showSolution)}
          style={{
            marginRight: 10,
            padding: "8px 16px", 
            fontSize: "14px",
            backgroundColor: "#ffc107",
            color: "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          🔍 {showSolution ? "Hide" : "Show"} Solution
        </button>
        
        <button 
          onClick={async () => {
            if (!pos.best_move) return;
            
            // Reset to original position first
            const beforeMoveFen = getPositionBeforeMove(pos);
            chessRef.current = new Chess(beforeMoveFen);
            
            // Play the best move automatically using the same logic as user moves
            const fromSquare = pos.best_move.substring(0, 2);
            const toSquare = pos.best_move.substring(2, 4);
            
            const chess = chessRef.current;
            
            // Check if this is a pawn promotion move before attempting
            const piece = chess.get(fromSquare);
            const needsPromotion = piece && piece.type === 'p' && 
              ((piece.color === 'w' && toSquare[1] === '8') || 
               (piece.color === 'b' && toSquare[1] === '1'));
            
            // Try the move with appropriate parameters
            let move;
            try {
              if (needsPromotion) {
                // For pawn promotion, include promotion parameter
                move = chess.move({ from: fromSquare, to: toSquare, promotion: 'q' });
              } else {
                // For regular moves, no promotion
                move = chess.move({ from: fromSquare, to: toSquare });
              }
            } catch (error) {
              console.error("Error playing best move:", error);
              move = null;
            }
            
            if (move) {
              setBoardFen(chess.fen());
              setFeedback("🎓 Best move played! This is what you should have done. Click 'Reset Position' to try again.");
              
              // Mark as solved and update attempts
              setSolved(s => { const copy = [...s]; copy[current] = true; return copy; });
              const newAttempts = [...attempts];
              newAttempts[current] += 1;
              setAttempts(newAttempts);
              
              const problemId = getProblemId(pos, current);
              
              // Record as successful attempt in backend
              if (isBackendAvailable) {
                try {
                  const updatedStats = await apiService.current.recordAttempt(
                    problemId, 
                    pos, 
                    true, 
                    newAttempts[current]
                  );
                  setStats(updatedStats);
                } catch (error) {
                  console.error('Error recording best move attempt:', error);
                  setIsBackendAvailable(false);
                }
              }
              
              // Update session with successful solve
              if (currentSession) {
                currentSession.correctAnswers++;
                currentSession.totalAttempts++;
                if (newAttempts[current] === 1) {
                  currentSession.completedProblems++;
                }
                currentSession.problems.push({
                  problemId,
                  attempts: newAttempts[current],
                  solved: true,
                  move: pos.best_move,
                  assistedSolve: true, // Mark as assisted solve
                  timestamp: new Date().toISOString()
                });
              }
            } else {
              setFeedback("❌ Error playing the best move. Please try manually.");
            }
          }}
          style={{
            marginRight: 10,
            padding: "8px 16px", 
            fontSize: "14px",
            backgroundColor: "#17a2b8",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          🎓 Play Best Move
        </button>
        
        <button 
          onClick={() => {
            // Reset to the original position
            const beforeMoveFen = getPositionBeforeMove(pos);
            chessRef.current = new Chess(beforeMoveFen);
            setBoardFen(beforeMoveFen);
            setFeedback("");
          }}
          style={{
            padding: "8px 16px", 
            fontSize: "14px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer"
          }}
        >
          🔄 Reset Position
        </button>
      </div>

      {/* Hint display */}
      {showHint && (
        <div style={{
          margin: "10px auto",
          padding: "10px",
          backgroundColor: "#d4edda",
          border: "1px solid #c3e6cb",
          borderRadius: "4px",
          maxWidth: "400px",
          textAlign: "center",
          color: "#155724"
        }}>
          <strong>Hint:</strong> {getHint()}
        </div>
      )}

      {/* Solution display */}
      {(showSolution || showSolutionOverride) && (
        <div style={{
          margin: "10px auto",
          padding: "10px",
          backgroundColor: showSolutionOverride ? "#ffebee" : "#fff3cd",
          border: `1px solid ${showSolutionOverride ? "#f44336" : "#ffeaa7"}`,
          borderRadius: "4px",
          maxWidth: "400px",
          textAlign: "center",
          color: showSolutionOverride ? "#c62828" : "#856404"
        }}>
          <strong>{showSolutionOverride ? "Auto-Revealed Solution:" : "Best Move:"}</strong> {pos.best_move} 
          <br />
          <small>
            {showSolutionOverride 
              ? "Study this move carefully - it was revealed after 3 failed attempts"
              : `The best move saves ${pos.eval_after_move_cp != null && pos.eval_before_move_cp != null ? Math.abs((pos.eval_after_move_cp - pos.eval_before_move_cp) * -1) : 0} centipawns`
            }
          </small>
        </div>
      )}
      
      
      <div style={{textAlign: "center", marginBottom: 15}}>
        <button 
          onClick={prev} 
          disabled={current === 0}
          style={{marginRight: 10, padding: "8px 16px", fontSize: "14px"}}
        >
          ← Previous
        </button>
        <button 
          onClick={next} 
          disabled={current === positions.length - 1}
          style={{padding: "8px 16px", fontSize: "14px"}}
        >
          Next →
        </button>
      </div>
      
      <div style={{textAlign: "center", color: "#666", fontSize: "14px"}}>
        <div style={{marginBottom: 5}}>
          <strong>Progress:</strong> {solved.filter(Boolean).length} / {positions.length} solved
        </div>
        <div style={{marginBottom: 5}}>
          <strong>This problem:</strong> {attempts[current]} attempt{attempts[current] !== 1 ? 's' : ''}
        </div>
        <div style={{marginBottom: 5}}>
          <strong>Evaluation:</strong> {(pos.eval_before_move_cp != null ? (pos.eval_before_move_cp > 0 ? '+' : '') + pos.eval_before_move_cp : 'N/A')} → {(pos.eval_after_move_cp != null ? (pos.eval_after_move_cp > 0 ? '+' : '') + pos.eval_after_move_cp : 'N/A')} centipawns
        </div>
        
        {/* Backend Status Indicator */}
        <div style={{
          marginTop: "10px",
          padding: "8px 12px",
          backgroundColor: isBackendAvailable ? "#d4edda" : "#f8d7da",
          color: isBackendAvailable ? "#155724" : "#721c24",
          border: `1px solid ${isBackendAvailable ? "#c3e6cb" : "#f5c6cb"}`,
          borderRadius: "6px",
          fontSize: "12px",
          display: "inline-block"
        }}>
          {isBackendAvailable ? "🟢 Backend Connected" : "🔴 Backend Offline (Local Only)"}
        </div>
        
        {/* Session Statistics */}
        {currentSession && (
          <div style={{
            marginTop: "15px",
            padding: "10px",
            backgroundColor: "#e9ecef",
            borderRadius: "8px",
            display: "inline-block"
          }}>
            <div style={{fontWeight: "bold", marginBottom: "5px"}}>📊 Current Session</div>
            <div style={{fontSize: "12px"}}>
              <span style={{marginRight: "15px"}}>
                Correct: {currentSession.correctAnswers}/{currentSession.totalAttempts}
              </span>
              <span style={{marginRight: "15px"}}>
                Success Rate: {currentSession.totalAttempts > 0 ? 
                  Math.round((currentSession.correctAnswers / currentSession.totalAttempts) * 100) : 0}%
              </span>
              <span>
                Problems: {currentSession.completedProblems}
              </span>
            </div>
          </div>
        )}
        
        {/* Overall Statistics */}
        <div style={{
          marginTop: "10px",
          padding: "10px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          display: "inline-block"
        }}>
          <div style={{fontWeight: "bold", marginBottom: "5px"}}>🏆 Overall Stats</div>
          <div style={{fontSize: "12px"}}>
            <span style={{marginRight: "15px"}}>
              Success Rate: {typeof stats.successRate === 'number' ? stats.successRate.toFixed(1) : '0.0'}%
            </span>
            <span style={{marginRight: "15px"}}>
              Current Streak: {stats.streak || 0}
            </span>
            <span>
              Best Streak: {stats.bestStreak || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChessboardTrainer;
