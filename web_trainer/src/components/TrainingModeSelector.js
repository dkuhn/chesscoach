import React, { useState } from "react";

function TrainingModeSelector({ onModeSelect, positions }) {
  const [selectedMode, setSelectedMode] = useState(null);
  
  const errorTypeCounts = positions.reduce((counts, pos) => {
    counts[pos.error_type] = (counts[pos.error_type] || 0) + 1;
    return counts;
  }, {});

  const trainingModes = [
    {
      id: "all",
      title: "All Positions",
      description: "Train on all your mistakes and blunders",
      count: positions.length,
      color: "#007bff",
      icon: "🎯"
    },
    {
      id: "blunders",
      title: "Blunders Only",
      description: "Focus on your biggest mistakes (200+ centipawn loss)",
      count: errorTypeCounts["Blunder"] || 0,
      color: "#dc3545",
      icon: "💥"
    },
    {
      id: "mistakes",
      title: "Mistakes Only", 
      description: "Work on medium-sized errors (100-199 centipawn loss)",
      count: errorTypeCounts["Mistake"] || 0,
      color: "#fd7e14", 
      icon: "⚠️"
    },
    {
      id: "white",
      title: "White Pieces",
      description: "Practice positions where you played as White",
      count: positions.filter(p => p.player_color === "white").length,
      color: "#6c757d",
      icon: "⚪"
    },
    {
      id: "black", 
      title: "Black Pieces",
      description: "Practice positions where you played as Black",
      count: positions.filter(p => p.player_color === "black").length,
      color: "#343a40",
      icon: "⚫"
    },
    {
      id: "random",
      title: "Random Selection",
      description: "Get a random mix of 20 positions for variety",
      count: Math.min(20, positions.length),
      color: "#28a745",
      icon: "🎲"
    }
  ];

  const handleModeSelect = (mode) => {
    setSelectedMode(mode.id);
    
    let filteredPositions = [...positions];
    
    switch (mode.id) {
      case "blunders":
        filteredPositions = positions.filter(p => p.error_type === "Blunder");
        break;
      case "mistakes":
        filteredPositions = positions.filter(p => p.error_type === "Mistake");
        break;
      case "white":
        filteredPositions = positions.filter(p => p.player_color === "white");
        break;
      case "black":
        filteredPositions = positions.filter(p => p.player_color === "black");
        break;
      case "random":
        filteredPositions = positions
          .sort(() => Math.random() - 0.5)
          .slice(0, 20);
        break;
      default:
        // "all" - use all positions
        break;
    }
    
    onModeSelect(filteredPositions, mode);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h1 style={{ marginBottom: "10px" }}>Chess Training Modes</h1>
        <p style={{ color: "#666", fontSize: "16px" }}>
          Choose how you want to practice and improve your chess skills
        </p>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
        gap: "20px" 
      }}>
        {trainingModes.map((mode) => (
          <div
            key={mode.id}
            onClick={() => handleModeSelect(mode)}
            style={{
              padding: "25px",
              border: `2px solid ${selectedMode === mode.id ? mode.color : "#e9ecef"}`,
              borderRadius: "12px",
              cursor: "pointer",
              transition: "all 0.3s ease",
              backgroundColor: selectedMode === mode.id ? `${mode.color}10` : "white",
              boxShadow: selectedMode === mode.id ? `0 4px 15px ${mode.color}30` : "0 2px 8px rgba(0,0,0,0.1)"
            }}
            onMouseEnter={(e) => {
              if (selectedMode !== mode.id) {
                e.target.style.borderColor = mode.color;
                e.target.style.backgroundColor = `${mode.color}05`;
              }
            }}
            onMouseLeave={(e) => {
              if (selectedMode !== mode.id) {
                e.target.style.borderColor = "#e9ecef";
                e.target.style.backgroundColor = "white";
              }
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              marginBottom: "15px" 
            }}>
              <span style={{ fontSize: "24px", marginRight: "12px" }}>
                {mode.icon}
              </span>
              <h3 style={{ 
                margin: 0, 
                color: mode.color,
                fontSize: "18px"
              }}>
                {mode.title}
              </h3>
            </div>
            
            <p style={{ 
              color: "#666", 
              marginBottom: "15px",
              lineHeight: "1.5"
            }}>
              {mode.description}
            </p>
            
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <span style={{ 
                fontWeight: "bold", 
                color: mode.color,
                fontSize: "18px"
              }}>
                {mode.count} positions
              </span>
              
              <button
                style={{
                  padding: "8px 16px",
                  backgroundColor: mode.color,
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.target.style.opacity = "0.9"}
                onMouseLeave={(e) => e.target.style.opacity = "1"}
              >
                Start Training
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div style={{ 
        marginTop: "40px", 
        padding: "20px", 
        backgroundColor: "#f8f9fa", 
        borderRadius: "12px",
        textAlign: "center"
      }}>
        <h3 style={{ marginBottom: "15px", color: "#495057" }}>Your Training Progress</h3>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", 
          gap: "15px" 
        }}>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>
              {positions.length}
            </div>
            <div style={{ color: "#666", fontSize: "14px" }}>Total Positions</div>
          </div>
          
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#dc3545" }}>
              {errorTypeCounts["Blunder"] || 0}
            </div>
            <div style={{ color: "#666", fontSize: "14px" }}>Blunders</div>
          </div>
          
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#fd7e14" }}>
              {errorTypeCounts["Mistake"] || 0}
            </div>
            <div style={{ color: "#666", fontSize: "14px" }}>Mistakes</div>
          </div>
          
          <div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
              {((errorTypeCounts["Blunder"] || 0) + (errorTypeCounts["Mistake"] || 0))}
            </div>
            <div style={{ color: "#666", fontSize: "14px" }}>Total Errors</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TrainingModeSelector;
