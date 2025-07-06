#!/usr/bin/env python3
"""
Chess Training Backend Setup and Launcher
"""

import os
import sys
import subprocess
import sqlite3
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    print(f"✓ Python {sys.version.split()[0]} detected")

def install_dependencies():
    """Install required Python packages"""
    print("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✓ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"Error installing dependencies: {e}")
        sys.exit(1)

def init_database():
    """Initialize the SQLite database"""
    print("Initializing database...")
    try:
        # Import and run the FastAPI app to initialize the database
        from app import init_database
        init_database()
        print("✓ Database initialized successfully")
    except ImportError:
        print("Error: Cannot import app.py. Make sure dependencies are installed.")
        sys.exit(1)
    except Exception as e:
        print(f"Error initializing database: {e}")
        sys.exit(1)

def start_server(host="0.0.0.0", port=8000):
    """Start the FastAPI server"""
    print(f"Starting Chess Training Backend on {host}:{port}...")
    try:
        subprocess.check_call([
            sys.executable, "-m", "uvicorn", 
            "app:app", 
            "--host", host, 
            "--port", str(port),
            "--reload"
        ])
    except subprocess.CalledProcessError as e:
        print(f"Error starting server: {e}")
        sys.exit(1)

def main():
    """Main setup and launch function"""
    print("Chess Training Backend Setup")
    print("=" * 40)
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    # Check Python version
    check_python_version()
    
    # Install dependencies
    install_dependencies()
    
    # Initialize database
    init_database()
    
    print("\n" + "=" * 40)
    print("Setup complete! Starting server...")
    print("Backend will be available at: http://localhost:8000")
    print("API documentation at: http://localhost:8000/docs")
    print("Press Ctrl+C to stop the server")
    print("=" * 40 + "\n")
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
