import React, { useEffect, useState } from "react";
import ChessboardTrainer from "./components/ChessboardTrainer";
import TrainingModeSelector from "./components/TrainingModeSelector";
import GameBrowser from "./components/GameBrowser";
import StatisticsView from "./components/StatisticsView";
import DatabaseViewer from "./components/DatabaseViewer";
import SpacedRepetitionTrainer from "./components/SpacedRepetitionTrainer";
import NavigationBar from "./components/NavigationBar";

function App() {
  const [allPositions, setAllPositions] = useState([]);
  const [currentPositions, setCurrentPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("training-modes");
  const [currentTrainingMode, setCurrentTrainingMode] = useState(null);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [solved, setSolved] = useState([]);

  useEffect(() => {
    fetch("/analysis_results.json")
      .then(res => {
        if (!res.ok) throw new Error("Could not load analysis_results.json");
        return res.json();
      })
      .then(data => {
        console.log(`Loaded ${data.length} training positions`);
        setAllPositions(data);
        setLoading(false);
      })
      .catch(e => {
        console.error("Failed to load analysis data:", e);
        setError(e.message);
        setLoading(false);
      });
  }, []);

  const handleModeSelect = (filteredPositions, mode) => {
    setCurrentPositions(filteredPositions);
    setCurrentTrainingMode(mode);
    setCurrentPositionIndex(0);
    setSolved(new Array(filteredPositions.length).fill(false));
    setCurrentView("practice");
  };

  const handlePositionSelect = (index) => {
    // When selecting from browser, work with all positions
    setCurrentPositions(allPositions);
    setCurrentPositionIndex(index);
    setSolved(new Array(allPositions.length).fill(false));
    setCurrentView("practice");
  };

  const handleViewChange = (view) => {
    setCurrentView(view);
    if (view === "training-modes") {
      setCurrentTrainingMode(null);
    }
  };

  const trainingProgress = currentPositions.length > 0 ? {
    solved: solved.filter(Boolean).length,
    total: currentPositions.length
  } : null;

  if (loading) return (
    <div>
      <NavigationBar currentView={currentView} onViewChange={handleViewChange} />
      <div style={{maxWidth: 600, margin: "50px auto", textAlign: "center", padding: "20px"}}>
        <h1>Chess Training Center</h1>
        <div>Loading training positions...</div>
      </div>
    </div>
  );
  
  if (error) return (
    <div>
      <NavigationBar currentView={currentView} onViewChange={handleViewChange} />
      <div style={{maxWidth: 600, margin: "50px auto", textAlign: "center", padding: "20px"}}>
        <h1>Chess Training Center</h1>
        <div style={{color: 'red', padding: '20px', border: '1px solid red', borderRadius: '5px'}}>
          <strong>Error:</strong> {error}
          <br />
          <small>Make sure the analysis_results.json file is in the public folder.</small>
        </div>
      </div>
    </div>
  );
  
  if (!allPositions.length) return (
    <div>
      <NavigationBar currentView={currentView} onViewChange={handleViewChange} />
      <div style={{maxWidth: 600, margin: "50px auto", textAlign: "center", padding: "20px"}}>
        <h1>Chess Training Center</h1>
        <div>No training positions found in analysis_results.json.</div>
      </div>
    </div>
  );

  const renderCurrentView = () => {
    switch (currentView) {
      case "training-modes":
        return (
          <TrainingModeSelector 
            positions={allPositions} 
            onModeSelect={handleModeSelect} 
          />
        );
      
      case "spaced-repetition":
        return <SpacedRepetitionTrainer positions={allPositions} />;
      
      case "practice":
        if (currentPositions.length === 0) {
          return (
            <div style={{maxWidth: 600, margin: "50px auto", textAlign: "center", padding: "20px"}}>
              <h2>No Training Mode Selected</h2>
              <p>Please select a training mode first.</p>
              <button 
                onClick={() => setCurrentView("training-modes")}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer"
                }}
              >
                Choose Training Mode
              </button>
            </div>
          );
        }
        return (
          <div style={{maxWidth: 800, margin: "0 auto", padding: "20px"}}>
            {currentTrainingMode && (
              <div style={{
                backgroundColor: "#f8f9fa", 
                padding: "15px", 
                borderRadius: "8px", 
                marginBottom: "20px",
                textAlign: "center"
              }}>
                <h3 style={{margin: "0 0 5px 0"}}>
                  {currentTrainingMode.icon} {currentTrainingMode.title}
                </h3>
                <p style={{margin: 0, color: "#666"}}>
                  {currentTrainingMode.description}
                </p>
              </div>
            )}
            <ChessboardTrainer 
              positions={currentPositions} 
              initialIndex={currentPositionIndex}
              solved={solved}
              setSolved={setSolved}
            />
          </div>
        );
      
      case "browse":
        return (
          <GameBrowser 
            positions={allPositions} 
            onSelectPosition={handlePositionSelect} 
          />
        );
      
      case "stats":
        return <StatisticsView positions={allPositions} />;
      
      case "database":
        return <DatabaseViewer />;
      
      default:
        return <div>Unknown view</div>;
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8f9fa" }}>
      <NavigationBar 
        currentView={currentView} 
        onViewChange={handleViewChange}
        trainingProgress={trainingProgress}
      />
      {renderCurrentView()}
    </div>
  );
}

export default App;
