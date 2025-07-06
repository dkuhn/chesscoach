import React, { useState, useEffect, useRef } from "react";
import ChessboardTrainer from "./ChessboardTrainer";
import ChessTrainingAPI from "../utils/ChessTrainingAPI";

// Spaced repetition intervals (in days)
const REPETITION_INTERVALS = {
  0: 0,     // New/failed problems - show immediately
  1: 1,     // First success - show in 1 day
  2: 3,     // Second success - show in 3 days
  3: 7,     // Third success - show in 1 week
  4: 14,    // Fourth success - show in 2 weeks
  5: 30,    // Fifth success - show in 1 month
  6: 90,    // Sixth success - show in 3 months
  7: 180,   // Seventh success - show in 6 months
  8: 365    // Mastered - show in 1 year
};

function SpacedRepetitionTrainer({ positions }) {
  // Filter state: 'all', 'blunder', 'mistake'
  const [errorTypeFilter, setErrorTypeFilter] = useState('all');
  const [currentPositions, setCurrentPositions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [solved, setSolved] = useState([]);
  const [attempts, setAttempts] = useState([]); // Track attempts per position
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [sessionStats, setSessionStats] = useState({
    studied: 0,
    correct: 0,
    newProblems: 0,
    reviewProblems: 0,
    autoRevealed: 0
  });
  const [queueInfo, setQueueInfo] = useState({
    due: 0,
    new: 0,
    total: 0
  });
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  const [showIntroduction, setShowIntroduction] = useState(true);
  const [autoRevealTriggered, setAutoRevealTriggered] = useState(false);
  
  const apiService = useRef(new ChessTrainingAPI());

  const MAX_ATTEMPTS = 3; // Auto-reveal after 3 failed attempts


  useEffect(() => {
    initializeSpacedRepetition();
  }, [positions, errorTypeFilter]);

  // Update queue info when positions change
  useEffect(() => {
    if (currentPositions.length > 0) {
      updateQueueInfo();
    }
  }, [currentPositions, stats]);

  // Filter positions by error type
  const getFilteredPositions = () => {
    if (errorTypeFilter === 'all') return positions;
    return positions.filter(pos =>
      pos.error_type && pos.error_type.toLowerCase() === (errorTypeFilter === 'blunder' ? 'blunder' : 'mistake')
    );
  };

  const initializeSpacedRepetition = async () => {
    setIsLoading(true);
    
    try {
      // Check backend availability
      const backendAvailable = await apiService.current.checkBackendAvailability();
      setIsBackendAvailable(backendAvailable);
      

      const filteredPositions = getFilteredPositions();
      if (!backendAvailable) {
        // If backend unavailable, just show filtered positions
        setCurrentPositions(filteredPositions.slice(0, 20)); // Limit to 20 for performance
        setSolved(new Array(Math.min(20, filteredPositions.length)).fill(false));
        setAttempts(new Array(Math.min(20, filteredPositions.length)).fill(0));
        setIsLoading(false);
        return;
      }

      // Get current statistics
      const currentStats = await apiService.current.getStats();
      setStats(currentStats);

      // Calculate which positions to show based on spaced repetition
      const scheduledPositions = await calculateSpacedRepetitionQueue(filteredPositions, currentStats);

      setCurrentPositions(scheduledPositions);
      setSolved(new Array(scheduledPositions.length).fill(false));
      setAttempts(new Array(scheduledPositions.length).fill(0));
      
    } catch (error) {
      console.error('Error initializing spaced repetition:', error);
      // Fallback to showing all positions
      setCurrentPositions(positions.slice(0, 20));
      setSolved(new Array(20).fill(false));
      setAttempts(new Array(20).fill(0));
      setIsBackendAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSpacedRepetitionQueue = async (allPositions, currentStats) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const queuedPositions = [];
    const problemStats = currentStats.problemStats || {};
    
    // Separate positions into categories
    const newProblems = [];
    const dueProblems = [];
    const notDueProblems = [];
    
    for (let i = 0; i < allPositions.length; i++) {
      const position = allPositions[i];
      const problemId = `${position.fen}_${position.player_move}_${i}`;
      const problemStat = problemStats[problemId];
      
      if (!problemStat) {
        // New problem - never seen before
        newProblems.push({ position, index: i, priority: 0, isNew: true });
      } else {
        const masteryLevel = calculateMasteryLevel(problemStat);
        const daysSinceLastSeen = calculateDaysSince(problemStat.last_attempt);
        const intervalDays = REPETITION_INTERVALS[masteryLevel] || 0;
        
        if (daysSinceLastSeen >= intervalDays || masteryLevel === 0) {
          // Problem is due for review
          const priority = calculatePriority(problemStat, daysSinceLastSeen, intervalDays);
          dueProblems.push({ 
            position, 
            index: i, 
            priority, 
            masteryLevel, 
            daysSinceLastSeen,
            isNew: false 
          });
        } else {
          notDueProblems.push({ 
            position, 
            index: i, 
            priority: -1, 
            masteryLevel, 
            daysSinceLastSeen,
            isNew: false 
          });
        }
      }
    }
    
    // Sort problems by priority (higher priority first)
    dueProblems.sort((a, b) => b.priority - a.priority);
    
    // Limit new problems per session (similar to Anki)
    const maxNewProblems = 10;
    const maxReviewProblems = 50;
    
    const selectedNew = newProblems.slice(0, maxNewProblems);
    const selectedDue = dueProblems.slice(0, maxReviewProblems);
    
    // Combine and shuffle for variety
    const allSelected = [...selectedDue, ...selectedNew];
    const shuffled = shuffleArray(allSelected);
    
    // Update queue info
    setQueueInfo({
      due: dueProblems.length,
      new: newProblems.length,
      total: allPositions.length
    });
    
    return shuffled.map(item => item.position);
  };

  const calculateMasteryLevel = (problemStat) => {
    if (!problemStat.solved) return 0; // Failed or never solved
    
    const attempts = problemStat.attempts || 1;
    const firstTrySolved = problemStat.first_try_solved;
    
    if (firstTrySolved) {
      // Reward first-try solves
      return Math.min(3, attempts);
    } else {
      // Slower progression for multiple attempts
      return Math.min(2, Math.floor(attempts / 2));
    }
  };

  const calculateDaysSince = (lastAttemptStr) => {
    if (!lastAttemptStr) return Infinity;
    
    try {
      const lastAttempt = new Date(lastAttemptStr);
      const now = new Date();
      const diffTime = Math.abs(now - lastAttempt);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return Infinity;
    }
  };

  const calculatePriority = (problemStat, daysSinceLastSeen, intervalDays) => {
    let priority = 100;
    
    // Higher priority for overdue problems
    if (daysSinceLastSeen > intervalDays) {
      priority += (daysSinceLastSeen - intervalDays) * 10;
    }
    
    // Higher priority for failed problems
    if (!problemStat.solved) {
      priority += 50;
    }
    
    // Higher priority for problems with many attempts
    priority += (problemStat.attempts || 0) * 5;
    
    // Lower priority for recently mastered problems
    const masteryLevel = calculateMasteryLevel(problemStat);
    priority -= masteryLevel * 20;
    
    return priority;
  };

  const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const updateQueueInfo = () => {
    if (!stats) return;
    
    const problemStats = stats.problemStats || {};
    let dueCount = 0;
    let newCount = 0;
    
    for (let i = 0; i < positions.length; i++) {
      const position = positions[i];
      const problemId = `${position.fen}_${position.player_move}_${i}`;
      const problemStat = problemStats[problemId];
      
      if (!problemStat) {
        newCount++;
      } else {
        const masteryLevel = calculateMasteryLevel(problemStat);
        const daysSinceLastSeen = calculateDaysSince(problemStat.last_attempt);
        const intervalDays = REPETITION_INTERVALS[masteryLevel] || 0;
        
        if (daysSinceLastSeen >= intervalDays || masteryLevel === 0) {
          dueCount++;
        }
      }
    }
    
    setQueueInfo({
      due: dueCount,
      new: newCount,
      total: positions.length
    });
  };

  const handlePositionComplete = async (wasCorrect, wasAutoRevealed = false) => {
    // Update session stats
    setSessionStats(prev => ({
      ...prev,
      studied: prev.studied + 1,
      correct: prev.correct + (wasCorrect ? 1 : 0),
      autoRevealed: prev.autoRevealed + (wasAutoRevealed ? 1 : 0)
    }));

    // Store result in backend DB
    try {
      if (isBackendAvailable && currentPositions[currentIndex]) {
        const position = currentPositions[currentIndex];
        const problemId = `${position.fen}_${position.player_move}_${positions.indexOf(position)}`;
        await apiService.current.recordAttempt(
          problemId,
          position,
          wasCorrect,
          (attempts[currentIndex] || 1)
        );
      }
    } catch (err) {
      // Ignore errors for now
    }

    // Reset auto-reveal state for next position
    setAutoRevealTriggered(false);

    // Move to next position after a delay
    setTimeout(() => {
      if (currentIndex < currentPositions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Session complete - show summary and reload queue
        const finalStats = {
          studied: sessionStats.studied + 1,
          correct: sessionStats.correct + (wasCorrect ? 1 : 0),
          autoRevealed: sessionStats.autoRevealed + (wasAutoRevealed ? 1 : 0)
        };

        alert(`Session complete!\n` +
              `📖 Studied: ${finalStats.studied}\n` +
              `✅ Correct: ${finalStats.correct}\n` +
              `🎯 Accuracy: ${Math.round((finalStats.correct / finalStats.studied) * 100)}%\n` +
              `🔍 Auto-revealed: ${finalStats.autoRevealed}`);

        initializeSpacedRepetition(); // Reload queue
        setCurrentIndex(0);
        setSessionStats({ studied: 0, correct: 0, newProblems: 0, reviewProblems: 0, autoRevealed: 0 });
      }
    }, wasAutoRevealed ? 3000 : 1500); // Longer delay for auto-revealed to read solution
  };

  const handleIncorrectAttempt = () => {
    // Increment attempts for current position
    const newAttempts = [...attempts];
    newAttempts[currentIndex] = (newAttempts[currentIndex] || 0) + 1;
    setAttempts(newAttempts);
    
    // Check if we've reached the maximum attempts
    if (newAttempts[currentIndex] >= MAX_ATTEMPTS && !autoRevealTriggered) {
      setAutoRevealTriggered(true);
      
      // Auto-reveal the solution and mark as completed (but incorrect)
      setTimeout(() => {
        // Mark position as "solved" to trigger solution display
        const newSolved = [...solved];
        newSolved[currentIndex] = true;
        setSolved(newSolved);
        
        // Complete the position as incorrect but studied
        setTimeout(() => {
          handlePositionComplete(false, true);
        }, 4000); // Give time to see and understand the solution
        
      }, 1000); // Small delay before showing solution
    }
    
    return newAttempts[currentIndex];
  };

  if (isLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h2>Preparing Your Training Session...</h2>
        <div style={{ fontSize: "18px" }}>📚 Calculating spaced repetition schedule...</div>
      </div>
    );
  }

  if (currentPositions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <h2>🎉 All Caught Up!</h2>
        <p>No positions are due for review right now.</p>
        <div style={{ marginTop: "20px" }}>
          <button 
            onClick={initializeSpacedRepetition}
            style={{
              padding: "10px 20px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            🔄 Check for New Problems
          </button>
        </div>
      </div>
    );
  }

  // Helper to get current position's metadata
  const currentPosition = currentPositions[currentIndex] || {};
  const gameDate = currentPosition.game_date || currentPosition.date_played || '';
  const playerName = currentPosition.player_name || currentPosition.username || '';

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px" }}>
      {/* Filter Bar */}
      <div style={{ marginBottom: "18px", display: "flex", gap: "10px", alignItems: "center" }}>
        <span style={{ fontWeight: 500 }}>Show:</span>
        <button
          onClick={() => setErrorTypeFilter('all')}
          style={{
            backgroundColor: errorTypeFilter === 'all' ? '#1976d2' : '#e3f2fd',
            color: errorTypeFilter === 'all' ? 'white' : '#1976d2',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: errorTypeFilter === 'all' ? 600 : 400
          }}
        >
          All
        </button>
        <button
          onClick={() => setErrorTypeFilter('blunder')}
          style={{
            backgroundColor: errorTypeFilter === 'blunder' ? '#d32f2f' : '#ffebee',
            color: errorTypeFilter === 'blunder' ? 'white' : '#d32f2f',
            border: '1px solid #d32f2f',
            borderRadius: '4px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: errorTypeFilter === 'blunder' ? 600 : 400
          }}
        >
          Blunders
        </button>
        <button
          onClick={() => setErrorTypeFilter('mistake')}
          style={{
            backgroundColor: errorTypeFilter === 'mistake' ? '#fbc02d' : '#fffde7',
            color: errorTypeFilter === 'mistake' ? '#fff' : '#fbc02d',
            border: '1px solid #fbc02d',
            borderRadius: '4px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontWeight: errorTypeFilter === 'mistake' ? 600 : 400
          }}
        >
          Mistakes
        </button>
      </div>

      {/* Introduction Card */}
      {showIntroduction && (
        <div style={{
          backgroundColor: "#e8f5e8",
          padding: "20px",
          borderRadius: "12px",
          marginBottom: "20px",
          border: "1px solid #4caf50"
        }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#2e7d32" }}>
            🧠 Welcome to Spaced Repetition Training!
          </h3>
          <p style={{ margin: "0 0 10px 0", fontSize: "14px", lineHeight: "1.5" }}>
            This training mode uses the <strong>spaced repetition algorithm</strong> (similar to Anki flashcards) 
            to help you learn chess positions more effectively:
          </p>
          <ul style={{ margin: "0 0 15px 20px", fontSize: "14px", lineHeight: "1.5" }}>
            <li><strong>New positions</strong> appear frequently until you solve them correctly</li>
            <li><strong>Correctly solved positions</strong> appear less often over time</li>
            <li><strong>Difficult positions</strong> (ones you get wrong) appear more frequently</li>
            <li><strong>Auto-reveal</strong>: After 3 failed attempts, the solution is shown automatically</li>
            <li><strong>Mastered positions</strong> may not appear for weeks or months</li>
          </ul>
          <p style={{ margin: "0 0 15px 0", fontSize: "14px", fontStyle: "italic", color: "#666" }}>
            This method maximizes learning efficiency by focusing your time on positions you need to practice most.
          </p>
          <button
            onClick={() => setShowIntroduction(false)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px"
            }}
          >
            Got it! Start Training 🚀
          </button>
        </div>
      )}

      {/* Spaced Repetition Header */}
      <div style={{
        backgroundColor: "#e3f2fd",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "20px",
        border: "1px solid #2196f3"
      }}>
        <h2 style={{ margin: "0 0 15px 0", color: "#1976d2" }}>
          🧠 Spaced Repetition Training
        </h2>

        {/* Game Metadata Header */}
        {(gameDate || playerName) && (
          <div style={{
            background: '#f5f5f5',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '12px',
            fontSize: '15px',
            color: '#333',
            fontWeight: 500
          }}>
            {gameDate && (
              <span style={{ marginRight: 18 }}>🗓️ <b>Date:</b> {gameDate}</span>
            )}
            {playerName && (
              <span>👤 <b>Player:</b> {playerName}</span>
            )}
          </div>
        )}

        {/* Queue Information */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-around", 
          marginBottom: "15px",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#d32f2f" }}>
              {queueInfo.due}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Due for Review</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2e7d32" }}>
              {queueInfo.new}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>New Problems</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1976d2" }}>
              {currentIndex + 1}/{currentPositions.length}
            </div>
            <div style={{ fontSize: "12px", color: "#666" }}>Session Progress</div>
          </div>
        </div>

        {/* Session Stats */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          fontSize: "14px",
          color: "#666",
          flexWrap: "wrap"
        }}>
          <span>📖 Studied: {sessionStats.studied}</span>
          <span>✅ Correct: {sessionStats.correct}</span>
          <span>📊 Accuracy: {sessionStats.studied > 0 ? Math.round((sessionStats.correct / sessionStats.studied) * 100) : 0}%</span>
          {sessionStats.autoRevealed > 0 && (
            <span style={{ color: "#ff9800" }}>🔍 Auto-revealed: {sessionStats.autoRevealed}</span>
          )}
        </div>

        {/* Backend Status */}
        <div style={{
          marginTop: "10px",
          textAlign: "center",
          fontSize: "12px",
          color: isBackendAvailable ? "#2e7d32" : "#d32f2f"
        }}>
          {isBackendAvailable ? "🟢 Spaced repetition active" : "🔴 Showing random selection (backend offline)"}
        </div>
      </div>

      {/* Enhanced Chessboard Trainer */}
      <SpacedRepetitionChessboard
        positions={currentPositions}
        initialIndex={currentIndex}
        solved={solved}
        setSolved={setSolved}
        attempts={attempts}
        onPositionComplete={handlePositionComplete}
        onIncorrectAttempt={handleIncorrectAttempt}
        autoRevealTriggered={autoRevealTriggered}
        maxAttempts={MAX_ATTEMPTS}
        isSpacedRepetition={true}
      />
      
      {/* Introduction to Spaced Repetition */}
      {showIntroduction && (
        <div style={{
          backgroundColor: "#e8f5e9",
          padding: "15px",
          borderRadius: "6px",
          marginBottom: "20px",
          textAlign: "center",
          fontSize: "14px",
          color: "#2e7d32",
          border: "1px solid #c8e6c9"
        }}>
          <h3 style={{ margin: "0 0 10px 0" }}>Welcome to Spaced Repetition Training!</h3>
          <p style={{ margin: "0 0 10px 0" }}>
            This method helps you learn and remember chess positions effectively by scheduling reviews
            based on your performance.
          </p>
          <p style={{ margin: "0 0 10px 0" }}>
            🌟 <strong>New problems</strong> are shown immediately.
          </p>
          <p style={{ margin: "0 0 10px 0" }}>
            🔄 <strong>Review problems</strong> are scheduled at increasing intervals for better retention.
          </p>
          <p style={{ margin: "0" }}>
            Let's get started! Your first position is waiting.
          </p>
          
          <button
            onClick={() => setShowIntroduction(false)}
            style={{
              marginTop: "10px",
              padding: "10px 20px",
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Got it! Start Training
          </button>
        </div>
      )}
    </div>
  );
}

// Enhanced ChessboardTrainer for spaced repetition
function SpacedRepetitionChessboard({ 
  positions, 
  initialIndex, 
  solved, 
  setSolved, 
  attempts,
  onPositionComplete, 
  onIncorrectAttempt,
  autoRevealTriggered,
  maxAttempts,
  isSpacedRepetition 
}) {
  const [previousSolvedState, setPreviousSolvedState] = useState(false);
  const [showAutoRevealMessage, setShowAutoRevealMessage] = useState(false);
  
  // Monitor when a position gets solved
  useEffect(() => {
    const currentSolved = solved[initialIndex];
    if (currentSolved && !previousSolvedState) {
      // Position was just solved
      if (autoRevealTriggered) {
        setShowAutoRevealMessage(true);
        // Don't auto-advance for auto-revealed - let the parent handle timing
      } else {
        // Normal solve - advance after showing success
        setTimeout(() => {
          onPositionComplete(true, false);
        }, 2000);
      }
    }
    setPreviousSolvedState(currentSolved);
  }, [solved, initialIndex, previousSolvedState, onPositionComplete, autoRevealTriggered]);

  // Reset auto-reveal message when position changes
  useEffect(() => {
    setShowAutoRevealMessage(false);
  }, [initialIndex]);

  const currentAttempts = attempts[initialIndex] || 0;
  const remainingAttempts = Math.max(0, maxAttempts - currentAttempts);

  return (
    <div>
      {isSpacedRepetition && (
        <div style={{
          backgroundColor: "#fff3e0",
          padding: "10px",
          borderRadius: "6px",
          marginBottom: "15px",
          textAlign: "center",
          fontSize: "14px",
          color: "#ef6c00"
        }}>
          💡 This position was selected based on your learning progress and spaced repetition algorithm
          
          {/* Attempt counter */}
          <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
            {currentAttempts > 0 && (
              <span>
                Attempts: {currentAttempts}/{maxAttempts}
                {remainingAttempts > 0 && (
                  <span style={{ color: remainingAttempts === 1 ? "#d32f2f" : "#666" }}>
                    {" "}• {remainingAttempts} remaining before auto-reveal
                  </span>
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Auto-reveal message */}
      {showAutoRevealMessage && (
        <div style={{
          backgroundColor: "#ffebee",
          padding: "15px",
          borderRadius: "8px",
          marginBottom: "15px",
          textAlign: "center",
          border: "1px solid #f44336",
          color: "#c62828"
        }}>
          <div style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>
            🔍 Solution Auto-Revealed
          </div>
          <div style={{ fontSize: "14px" }}>
            After {maxAttempts} attempts, the correct move is being shown. 
            Study it carefully to improve next time!
          </div>
        </div>
      )}
      
      <ChessboardTrainer
        positions={positions}
        initialIndex={initialIndex}
        solved={solved}
        setSolved={setSolved}
        onIncorrectAttempt={onIncorrectAttempt}
        showSolutionOverride={autoRevealTriggered}
      />
      
      {isSpacedRepetition && (
        <div style={{
          marginTop: "15px",
          textAlign: "center",
          display: "flex",
          gap: "10px",
          justifyContent: "center",
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => onPositionComplete(false, false)}
            disabled={autoRevealTriggered}
            style={{
              padding: "8px 16px",
              backgroundColor: autoRevealTriggered ? "#ccc" : "#ff9800",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: autoRevealTriggered ? "not-allowed" : "pointer",
              fontSize: "14px"
            }}
          >
            ⏭️ Skip Position
          </button>
          
          <button
            onClick={() => onPositionComplete(true, false)}
            disabled={autoRevealTriggered}
            style={{
              padding: "8px 16px",
              backgroundColor: autoRevealTriggered ? "#ccc" : "#4caf50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: autoRevealTriggered ? "not-allowed" : "pointer",
              fontSize: "14px"
            }}
          >
            ✅ Mark as Correct
          </button>

          {autoRevealTriggered && (
            <button
              onClick={() => onPositionComplete(false, true)}
              style={{
                padding: "8px 16px",
                backgroundColor: "#2196f3",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px"
              }}
            >
              📚 Continue to Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default SpacedRepetitionTrainer;
