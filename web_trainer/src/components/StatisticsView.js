import React from "react";

function StatisticsView({ positions }) {
  // Calculate comprehensive statistics
  const stats = {
    total: positions.length,
    byErrorType: {},
    byColor: {},
    byMoveRange: {},
    averageEvalLoss: 0,
    worstBlunders: [],
    commonPatterns: {}
  };

  // Error type breakdown
  positions.forEach(pos => {
    stats.byErrorType[pos.error_type] = (stats.byErrorType[pos.error_type] || 0) + 1;
  });

  // Color breakdown
  positions.forEach(pos => {
    stats.byColor[pos.player_color] = (stats.byColor[pos.player_color] || 0) + 1;
  });

  // Move range analysis
  positions.forEach(pos => {
    const range = pos.move_number <= 10 ? "Opening (1-10)" :
                  pos.move_number <= 25 ? "Middlegame (11-25)" :
                  "Endgame (26+)";
    stats.byMoveRange[range] = (stats.byMoveRange[range] || 0) + 1;
  });

  // Average evaluation loss
  const totalEvalLoss = positions.reduce((sum, pos) => {
    return sum + (pos.eval_before_move_cp - pos.eval_after_move_cp);
  }, 0);
  stats.averageEvalLoss = Math.round(totalEvalLoss / positions.length);

  // Worst blunders (top 10)
  stats.worstBlunders = positions
    .map((pos, index) => ({
      ...pos,
      evalLoss: pos.eval_before_move_cp - pos.eval_after_move_cp,
      index
    }))
    .sort((a, b) => b.evalLoss - a.evalLoss)
    .slice(0, 10);

  // Common move patterns (simplified)
  positions.forEach(pos => {
    const moveType = pos.player_move.length === 4 ? "Normal Move" : "Capture/Special";
    stats.commonPatterns[moveType] = (stats.commonPatterns[moveType] || 0) + 1;
  });

  const StatCard = ({ title, value, subtitle, color = "#007bff" }) => (
    <div style={{
      padding: "20px",
      backgroundColor: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      textAlign: "center"
    }}>
      <h4 style={{ margin: "0 0 10px 0", color: "#666", fontSize: "14px" }}>
        {title}
      </h4>
      <div style={{ 
        fontSize: "28px", 
        fontWeight: "bold", 
        color: color, 
        marginBottom: "5px" 
      }}>
        {value}
      </div>
      {subtitle && (
        <div style={{ fontSize: "12px", color: "#999" }}>
          {subtitle}
        </div>
      )}
    </div>
  );

  const ChartBar = ({ label, value, maxValue, color }) => (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        marginBottom: "4px",
        fontSize: "14px"
      }}>
        <span>{label}</span>
        <span style={{ fontWeight: "bold" }}>{value}</span>
      </div>
      <div style={{
        width: "100%",
        height: "8px",
        backgroundColor: "#e9ecef",
        borderRadius: "4px",
        overflow: "hidden"
      }}>
        <div style={{
          width: `${(value / maxValue) * 100}%`,
          height: "100%",
          backgroundColor: color,
          transition: "width 0.3s ease"
        }} />
      </div>
    </div>
  );

  return (
    <div style={{ padding: "20px", backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      <h2 style={{ marginBottom: "30px", textAlign: "center" }}>Training Statistics</h2>
      
      {/* Key Metrics */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
        gap: "20px",
        marginBottom: "40px"
      }}>
        <StatCard 
          title="Total Positions"
          value={stats.total}
          subtitle="Analyzed mistakes"
          color="#007bff"
        />
        <StatCard 
          title="Average Loss"
          value={`${stats.averageEvalLoss} cp`}
          subtitle="Per mistake"
          color="#dc3545"
        />
        <StatCard 
          title="Blunders"
          value={stats.byErrorType["Blunder"] || 0}
          subtitle={`${Math.round(((stats.byErrorType["Blunder"] || 0) / stats.total) * 100)}% of errors`}
          color="#dc3545"
        />
        <StatCard 
          title="Mistakes"
          value={stats.byErrorType["Mistake"] || 0}
          subtitle={`${Math.round(((stats.byErrorType["Mistake"] || 0) / stats.total) * 100)}% of errors`}
          color="#fd7e14"
        />
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
        gap: "30px",
        marginBottom: "40px"
      }}>
        {/* Error Type Distribution */}
        <div style={{
          padding: "25px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ marginBottom: "20px" }}>Error Type Distribution</h3>
          {Object.entries(stats.byErrorType).map(([type, count]) => (
            <ChartBar
              key={type}
              label={type}
              value={count}
              maxValue={Math.max(...Object.values(stats.byErrorType))}
              color={type === "Blunder" ? "#dc3545" : "#fd7e14"}
            />
          ))}
        </div>

        {/* Color Analysis */}
        <div style={{
          padding: "25px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ marginBottom: "20px" }}>Mistakes by Color</h3>
          {Object.entries(stats.byColor).map(([color, count]) => (
            <ChartBar
              key={color}
              label={`Playing as ${color}`}
              value={count}
              maxValue={Math.max(...Object.values(stats.byColor))}
              color={color === "white" ? "#6c757d" : "#343a40"}
            />
          ))}
        </div>

        {/* Game Phase Analysis */}
        <div style={{
          padding: "25px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ marginBottom: "20px" }}>Mistakes by Game Phase</h3>
          {Object.entries(stats.byMoveRange).map(([range, count]) => (
            <ChartBar
              key={range}
              label={range}
              value={count}
              maxValue={Math.max(...Object.values(stats.byMoveRange))}
              color="#28a745"
            />
          ))}
        </div>

        {/* Improvement Insights */}
        <div style={{
          padding: "25px",
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
        }}>
          <h3 style={{ marginBottom: "20px" }}>Improvement Focus</h3>
          
          <div style={{ marginBottom: "15px" }}>
            <h5 style={{ color: "#495057", marginBottom: "8px" }}>Priority Areas:</h5>
            <ul style={{ paddingLeft: "20px", margin: 0 }}>
              {stats.byErrorType["Blunder"] > stats.byErrorType["Mistake"] ? (
                <li style={{ color: "#dc3545", marginBottom: "5px" }}>
                  Focus on avoiding blunders (your biggest weakness)
                </li>
              ) : (
                <li style={{ color: "#fd7e14", marginBottom: "5px" }}>
                  Work on reducing smaller mistakes
                </li>
              )}
              
              {stats.byColor["white"] > stats.byColor["black"] ? (
                <li style={{ color: "#6c757d", marginBottom: "5px" }}>
                  Practice more with White pieces
                </li>
              ) : (
                <li style={{ color: "#343a40", marginBottom: "5px" }}>
                  Practice more with Black pieces
                </li>
              )}
              
              {Object.entries(stats.byMoveRange).sort((a, b) => b[1] - a[1])[0] && (
                <li style={{ color: "#28a745", marginBottom: "5px" }}>
                  Focus on {Object.entries(stats.byMoveRange).sort((a, b) => b[1] - a[1])[0][0].toLowerCase()}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Worst Blunders Table */}
      <div style={{
        padding: "25px",
        backgroundColor: "white",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h3 style={{ marginBottom: "20px" }}>Your Worst Blunders</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8f9fa" }}>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Move</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Color</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Your Move</th>
                <th style={{ padding: "12px", textAlign: "left", borderBottom: "2px solid #dee2e6" }}>Best Move</th>
                <th style={{ padding: "12px", textAlign: "right", borderBottom: "2px solid #dee2e6" }}>Loss</th>
              </tr>
            </thead>
            <tbody>
              {stats.worstBlunders.map((blunder, index) => (
                <tr key={index}>
                  <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6" }}>
                    {blunder.move_number}
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6" }}>
                    {blunder.player_color}
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6", fontFamily: "monospace" }}>
                    {blunder.player_move}
                  </td>
                  <td style={{ padding: "12px", borderBottom: "1px solid #dee2e6", fontFamily: "monospace" }}>
                    {blunder.best_move}
                  </td>
                  <td style={{ 
                    padding: "12px", 
                    borderBottom: "1px solid #dee2e6", 
                    textAlign: "right",
                    color: "#dc3545",
                    fontWeight: "bold"
                  }}>
                    -{blunder.evalLoss} cp
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default StatisticsView;
