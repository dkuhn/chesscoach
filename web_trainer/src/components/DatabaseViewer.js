import React, { useState, useEffect } from "react";
import ChessTrainingAPI from "../utils/ChessTrainingAPI";

function DatabaseViewer() {
  const [databaseData, setDatabaseData] = useState({
    training_stats: [],
    problem_stats: [],
    category_stats: [],
    daily_stats: [],
    training_sessions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('training_stats');
  const [isBackendAvailable, setIsBackendAvailable] = useState(false);

  const api = new ChessTrainingAPI();

  useEffect(() => {
    fetchDatabaseContent();
  }, []);

  const fetchDatabaseContent = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check backend availability first
      const backendAvailable = await api.checkBackendAvailability();
      setIsBackendAvailable(backendAvailable);
      
      if (!backendAvailable) {
        setError("Backend is not available. Please start the FastAPI server.");
        setIsLoading(false);
        return;
      }

      // Fetch all database tables
      const response = await fetch('http://localhost:8000/api/database/content');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDatabaseData(data);
      
    } catch (err) {
      console.error('Error fetching database content:', err);
      setError(`Failed to load database content: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/export');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chess_training_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Error exporting data:', err);
      alert(`Failed to export data: ${err.message}`);
    }
  };

  const clearDatabase = async () => {
    if (!window.confirm("Are you sure you want to clear all database content? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/reset', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      alert("Database cleared successfully!");
      fetchDatabaseContent(); // Refresh the data
      
    } catch (err) {
      console.error('Error clearing database:', err);
      alert(`Failed to clear database: ${err.message}`);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const formatJson = (jsonString) => {
    if (!jsonString) return 'N/A';
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  const renderTable = (tableName, data) => {
    if (!data || data.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
          No data found in {tableName} table
        </div>
      );
    }

    const columns = Object.keys(data[0]);

    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          fontSize: '12px'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              {columns.map(col => (
                <th key={col} style={{ 
                  border: '1px solid #dee2e6', 
                  padding: '8px', 
                  textAlign: 'left',
                  fontWeight: 'bold'
                }}>
                  {col.replace(/_/g, ' ').toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                {columns.map(col => (
                  <td key={col} style={{ 
                    border: '1px solid #dee2e6', 
                    padding: '8px',
                    maxWidth: '200px',
                    wordBreak: 'break-word'
                  }}>
                    {col.includes('time') || col.includes('date') || col === 'last_update' || col === 'created_at'
                      ? formatTimestamp(row[col])
                      : col === 'problems_data'
                      ? (
                          <details>
                            <summary style={{ cursor: 'pointer' }}>View JSON</summary>
                            <pre style={{ 
                              fontSize: '10px', 
                              backgroundColor: '#f1f1f1', 
                              padding: '5px',
                              margin: '5px 0',
                              maxHeight: '200px',
                              overflow: 'auto'
                            }}>
                              {formatJson(row[col])}
                            </pre>
                          </details>
                        )
                      : String(row[col] ?? 'N/A')
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const tabs = [
    { key: 'training_stats', label: '📊 Training Stats', description: 'Overall user statistics' },
    { key: 'problem_stats', label: '🎯 Problem Stats', description: 'Individual problem performance' },
    { key: 'category_stats', label: '📈 Category Stats', description: 'Performance by category' },
    { key: 'daily_stats', label: '📅 Daily Stats', description: 'Daily training progress' },
    { key: 'training_sessions', label: '🎮 Sessions', description: 'Training session records' }
  ];

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2>Loading Database Content...</h2>
        <div style={{ fontSize: '18px' }}>⏳</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <h2 style={{ color: '#dc3545' }}>Error Loading Database</h2>
        <p>{error}</p>
        <button 
          onClick={fetchDatabaseContent}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1>🗄️ Chess Training Database Viewer</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          View and manage the backend database content for chess training statistics.
        </p>
        
        {/* Backend Status */}
        <div style={{
          marginBottom: '20px',
          padding: '10px 15px',
          backgroundColor: isBackendAvailable ? '#d4edda' : '#f8d7da',
          color: isBackendAvailable ? '#155724' : '#721c24',
          border: `1px solid ${isBackendAvailable ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '6px',
          fontSize: '14px'
        }}>
          {isBackendAvailable ? '🟢 Backend Connected' : '🔴 Backend Offline'}
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: '20px' }}>
          <button 
            onClick={fetchDatabaseContent}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Refresh Data
          </button>
          
          <button 
            onClick={exportData}
            disabled={!isBackendAvailable}
            style={{
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: isBackendAvailable ? '#17a2b8' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isBackendAvailable ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            📥 Export Data
          </button>
          
          <button 
            onClick={clearDatabase}
            disabled={!isBackendAvailable}
            style={{
              padding: '8px 16px',
              backgroundColor: isBackendAvailable ? '#dc3545' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isBackendAvailable ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            🗑️ Clear Database
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          borderBottom: '2px solid #dee2e6',
          marginBottom: '20px'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '12px 20px',
                backgroundColor: activeTab === tab.key ? '#007bff' : 'transparent',
                color: activeTab === tab.key ? 'white' : '#495057',
                border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid #007bff' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.key ? 'bold' : 'normal',
                marginRight: '5px',
                marginBottom: '-2px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Tab Description */}
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '14px',
          color: '#666'
        }}>
          {tabs.find(tab => tab.key === activeTab)?.description}
          <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
            ({databaseData[activeTab]?.length || 0} records)
          </span>
        </div>
      </div>

      {/* Table Content */}
      <div style={{
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        backgroundColor: '#fff',
        padding: '15px'
      }}>
        {renderTable(activeTab, databaseData[activeTab])}
      </div>
    </div>
  );
}

export default DatabaseViewer;
