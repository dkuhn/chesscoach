// API Service for Chess Training Statistics
class ChessTrainingAPI {
  constructor(baseURL = 'http://localhost:8000/api') {
    this.baseURL = baseURL;
    this.userId = 'default_user'; // Can be extended to support multiple users
  }

  // Helper method for API calls
  async apiCall(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API call to ${url} failed:`, error);
      throw error;
    }
  }

  // Get current statistics
  async getStats() {
    try {
      const stats = await this.apiCall(`/stats?user_id=${this.userId}`);
      
      // Ensure all required properties exist with default values
      return {
        totalProblems: stats.totalProblems || 0,
        totalCorrect: stats.totalCorrect || 0,
        totalAttempts: stats.totalAttempts || 0,
        successRate: stats.successRate || 0,
        streak: stats.streak || 0,
        bestStreak: stats.bestStreak || 0,
        lastUpdate: stats.lastUpdate || new Date().toISOString(),
        problemStats: stats.problemStats || {},
        categoryStats: stats.categoryStats || {},
        dailyStats: stats.dailyStats || {}
      };
    } catch (error) {
      console.error('Error loading stats:', error);
      return this.getDefaultStats();
    }
  }

  // Get default statistics structure (fallback)
  getDefaultStats() {
    return {
      totalProblems: 0,
      totalCorrect: 0,
      totalAttempts: 0,
      successRate: 0,
      streak: 0,
      bestStreak: 0,
      lastUpdate: new Date().toISOString(),
      problemStats: {},
      categoryStats: {
        blunders: { total: 0, correct: 0, attempts: 0 },
        mistakes: { total: 0, correct: 0, attempts: 0 },
        white: { total: 0, correct: 0, attempts: 0 },
        black: { total: 0, correct: 0, attempts: 0 }
      },
      dailyStats: {},
    };
  }

  // Record a training attempt
  async recordAttempt(problemId, position, isCorrect, attemptNumber = 1) {
    try {
      const response = await this.apiCall(`/record-attempt?user_id=${this.userId}`, {
        method: 'POST',
        body: JSON.stringify({
          problem_id: problemId,
          position: {
            error_type: position.error_type,
            player_color: position.player_color,
            move_number: position.move_number,
            player_move: position.player_move,
            best_move: position.best_move,
            eval_before_move_cp: position.eval_before_move_cp,
            eval_after_move_cp: position.eval_after_move_cp
          },
          is_correct: isCorrect,
          attempt_number: attemptNumber
        })
      });

      // Return updated stats
      return await this.getStats();
    } catch (error) {
      console.error('Error recording attempt:', error);
      throw error;
    }
  }

  // Get training sessions history
  async getSessions(limit = 100) {
    try {
      return await this.apiCall(`/sessions?user_id=${this.userId}&limit=${limit}`);
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  // Create or update a training session
  async saveSession(session) {
    try {
      return await this.apiCall(`/sessions?user_id=${this.userId}`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: session.id.toString(),
          start_time: session.startTime,
          end_time: session.endTime,
          problems: session.problems || [],
          total_attempts: session.totalAttempts || 0,
          correct_answers: session.correctAnswers || 0,
          completed_problems: session.completedProblems || 0
        })
      });
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  // Start a new training session
  startSession() {
    return {
      id: Date.now(),
      startTime: new Date().toISOString(),
      endTime: null,
      problems: [],
      totalAttempts: 0,
      correctAnswers: 0,
      completedProblems: 0
    };
  }

  // End and save a training session
  async endSession(session) {
    session.endTime = new Date().toISOString();
    await this.saveSession(session);
    return session;
  }

  // Clear all data (for reset functionality)
  async clearAllData() {
    try {
      return await this.apiCall(`/stats/reset?user_id=${this.userId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  // Export data for backup
  async exportData() {
    try {
      return await this.apiCall(`/export?user_id=${this.userId}`);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  // Import data from backup (if we implement this endpoint)
  async importData(data) {
    try {
      return await this.apiCall(`/import?user_id=${this.userId}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }

  // Health check to verify backend connectivity
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL.replace('/api', '')}/`);
      return response.ok;
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }

  // Check if backend is available and switch to fallback if needed
  async checkBackendAvailability() {
    const isAvailable = await this.healthCheck();
    if (!isAvailable) {
      console.warn('Backend not available, falling back to localStorage');
      // Could implement localStorage fallback here
    }
    return isAvailable;
  }
}

export default ChessTrainingAPI;
