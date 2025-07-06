import React, { useState } from "react";

function GameBrowser({ positions, onSelectPosition }) {
  const [filters, setFilters] = useState({
    errorType: "all",
    playerColor: "all",
    sortBy: "evaluation_loss"
  });
  const [viewMode, setViewMode] = useState("positions"); // "positions" or "games"

  // Group positions by game URL for better organization
  const gameGroups = positions.reduce((groups, position, index) => {
    const gameId = position.game_url || `game-${Math.floor(index / 20)}`; // Estimate game groups
    if (!groups[gameId]) {
      groups[gameId] = [];
    }
    groups[gameId].push({ ...position, originalIndex: index });
    return groups;
  }, {});

  // Apply filters
  const filteredPositions = positions
    .map((pos, index) => ({ ...pos, originalIndex: index }))
    .filter(pos => {
      if (filters.errorType !== "all" && pos.error_type !== filters.errorType) return false;
      if (filters.playerColor !== "all" && pos.player_color !== filters.playerColor) return false;
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case "evaluation_loss":
          return (a.eval_before_move_cp - a.eval_after_move_cp) - (b.eval_before_move_cp - b.eval_after_move_cp);
        case "move_number":
          return a.move_number - b.move_number;
        case "error_type":
          return a.error_type.localeCompare(b.error_type);
        default:
          return 0;
      }
    });

  const errorTypeCounts = positions.reduce((counts, pos) => {
    counts[pos.error_type] = (counts[pos.error_type] || 0) + 1;
    return counts;
  }, {});

  const colorCounts = positions.reduce((counts, pos) => {
    counts[pos.player_color] = (counts[pos.player_color] || 0) + 1;
    return counts;
  }, {});

  return (
    <div style={{ padding: "20px" }}>
      <h2>🏆 Game Analysis Browser</h2>
      
      {/* View Mode Toggle */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <div style={{ 
          display: "inline-flex", 
          backgroundColor: "#f8f9fa", 
          borderRadius: "8px", 
          padding: "4px",
          border: "1px solid #dee2e6"
        }}>
          <button
            onClick={() => setViewMode("positions")}
            style={{
              padding: "8px 16px",
              backgroundColor: viewMode === "positions" ? "#007bff" : "transparent",
              color: viewMode === "positions" ? "white" : "#495057",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            📍 All Positions
          </button>
          <button
            onClick={() => setViewMode("games")}
            style={{
              padding: "8px 16px",
              backgroundColor: viewMode === "games" ? "#007bff" : "transparent",
              color: viewMode === "games" ? "white" : "#495057",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            🎲 By Games
          </button>
        </div>
      </div>

      {/* Statistics Overview */}
      {viewMode === "positions" && (
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: "15px", 
          marginBottom: "25px" 
        }}>
          <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>Total Positions</h4>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>
              {positions.length}
            </div>
          </div>
          
          <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>Error Types</h4>
            {Object.entries(errorTypeCounts).map(([type, count]) => (
              <div key={type} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{type}:</span>
                <span style={{ fontWeight: "bold" }}>{count}</span>
              </div>
            ))}
          </div>
          
          <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>By Color</h4>
            {Object.entries(colorCounts).map(([color, count]) => (
              <div key={color} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{color}:</span>
                <span style={{ fontWeight: "bold" }}>{count}</span>
              </div>
            ))}
          </div>

          <div style={{ padding: "15px", backgroundColor: "#f8f9fa", borderRadius: "8px" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>Total Games</h4>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
              {Object.keys(gameGroups).length}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ 
        display: "flex", 
        gap: "15px", 
        marginBottom: "25px", 
        padding: "15px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "8px",
        flexWrap: "wrap"
      }}>
        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Error Type:</label>
          <select 
            value={filters.errorType} 
            onChange={(e) => setFilters(prev => ({ ...prev, errorType: e.target.value }))}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="all">All Types</option>
            <option value="Blunder">Blunders Only</option>
            <option value="Mistake">Mistakes Only</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Player Color:</label>
          <select 
            value={filters.playerColor} 
            onChange={(e) => setFilters(prev => ({ ...prev, playerColor: e.target.value }))}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="all">Both Colors</option>
            <option value="white">White Only</option>
            <option value="black">Black Only</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold" }}>Sort By:</label>
          <select 
            value={filters.sortBy} 
            onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
            style={{ padding: "5px 10px", borderRadius: "4px", border: "1px solid #ccc" }}
          >
            <option value="evaluation_loss">Evaluation Loss</option>
            <option value="move_number">Move Number</option>
            <option value="error_type">Error Type</option>
          </select>
        </div>
      </div>

      {/* Position List */}
      {viewMode === "positions" && (
        <div style={{ marginBottom: "20px" }}>
          <h3>Positions ({filteredPositions.length} shown)</h3>
          <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #ddd", borderRadius: "8px" }}>
            {filteredPositions.map((position, index) => {
              const evalLoss = position.eval_before_move_cp - position.eval_after_move_cp;
              const severity = position.error_type === "Blunder" ? "#dc3545" : "#fd7e14";
              
              return (
                <div 
                  key={index}
                  onClick={() => onSelectPosition(position.originalIndex)}
                  style={{
                    padding: "12px 15px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "white",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "white"}
                >
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                      Move {position.move_number} ({position.player_color})
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      Played: {position.player_move} → Best: {position.best_move}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: "right" }}>
                    <div style={{ 
                      color: severity, 
                      fontWeight: "bold",
                      marginBottom: "4px"
                    }}>
                      {position.error_type}
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      -{evalLoss} cp
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Game Group List */}
      {viewMode === "games" && (
        <div style={{ marginBottom: "20px" }}>
          <h3>Games ({Object.keys(gameGroups).length} total)</h3>
          <div style={{ 
            border: "1px solid #ddd", 
            borderRadius: "8px", 
            overflow: "hidden",
            backgroundColor: "white"
          }}>
            {Object.entries(gameGroups).map(([gameId, gamePositions]) => {
              const firstPosition = gamePositions[0];
              const evalLoss = firstPosition.eval_before_move_cp - firstPosition.eval_after_move_cp;
              const severity = firstPosition.error_type === "Blunder" ? "#dc3545" : "#fd7e14";
              const moveCount = gamePositions.length;
              
              return (
                <div 
                  key={gameId}
                  onClick={() => onSelectPosition(firstPosition.originalIndex)}
                  style={{
                    padding: "12px 15px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    transition: "background-color 0.2s"
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "white"}
                >
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                      Game {gameId} - {moveCount} Moves
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      First Move: {firstPosition.player_move} → Best: {firstPosition.best_move}
                    </div>
                  </div>
                  
                  <div style={{ textAlign: "right" }}>
                    <div style={{ 
                      color: severity, 
                      fontWeight: "bold",
                      marginBottom: "4px"
                    }}>
                      {firstPosition.error_type}
                    </div>
                    <div style={{ fontSize: "14px", color: "#666" }}>
                      -{evalLoss} cp
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default GameBrowser;
