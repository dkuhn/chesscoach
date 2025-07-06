import React, { useState } from "react";

function NavigationBar({ currentView, onViewChange, trainingProgress }) {
  const views = [
    { id: "training-modes", label: "Training Modes", icon: "🎯" },
    { id: "spaced-repetition", label: "Spaced Repetition", icon: "🧠" },
    { id: "practice", label: "Practice", icon: "♟️" },
    { id: "browse", label: "Browse Games", icon: "📚" },
    { id: "stats", label: "Statistics", icon: "📊" },
    { id: "database", label: "Database", icon: "🗄️" }
  ];

  return (
    <nav style={{
      backgroundColor: "#2c3e50",
      padding: "10px 0",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      marginBottom: "0"
    }}>
      <div style={{ 
        maxWidth: "1200px", 
        margin: "0 auto", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        padding: "0 20px"
      }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center",
          color: "white",
          fontSize: "20px",
          fontWeight: "bold"
        }}>
          <span style={{ marginRight: "10px" }}>♔</span>
          Chess Training Center
        </div>
        
        <div style={{ display: "flex", gap: "5px" }}>
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => onViewChange(view.id)}
              style={{
                padding: "10px 16px",
                backgroundColor: currentView === view.id ? "#3498db" : "transparent",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "background-color 0.2s",
                fontSize: "14px",
                fontWeight: currentView === view.id ? "bold" : "normal"
              }}
              onMouseEnter={(e) => {
                if (currentView !== view.id) {
                  e.target.style.backgroundColor = "#34495e";
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== view.id) {
                  e.target.style.backgroundColor = "transparent";
                }
              }}
            >
              <span>{view.icon}</span>
              {view.label}
            </button>
          ))}
        </div>

        {trainingProgress && (
          <div style={{ 
            color: "white", 
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}>
            <span>Progress:</span>
            <div style={{
              backgroundColor: "#34495e",
              padding: "4px 8px",
              borderRadius: "4px",
              fontWeight: "bold"
            }}>
              {trainingProgress.solved}/{trainingProgress.total}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default NavigationBar;
