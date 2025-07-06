#!/bin/bash

# Chess Training Backend Launcher
echo "Starting Chess Training Backend..."

# Navigate to backend directory
cd "$(dirname "$0")"

# Check if conda is available
if ! command -v conda &> /dev/null; then
    echo "Error: Conda is not installed or not in PATH"
    echo "Please install Anaconda/Miniconda or activate the conda environment manually"
    exit 1
fi

# Check if we're in the correct conda environment
if [ "$CONDA_DEFAULT_ENV" != "chesscoach" ]; then
    echo "Activating conda environment 'chesscoach'..."
    eval "$(conda shell.bash hook)"
    conda activate chesscoach
    
    if [ $? -ne 0 ]; then
        echo "Error: Could not activate conda environment 'chesscoach'"
        echo "Please run: conda activate chesscoach"
        exit 1
    fi
fi

# Install requirements (conda should handle this, but just in case)
echo "Ensuring dependencies are installed..."
pip install -r requirements.txt

# Start the server
echo "Starting FastAPI server..."
echo "Backend will be available at: http://localhost:8000"
echo "API documentation at: http://localhost:8000/docs"
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app:app --host 0.0.0.0 --port 8000 --reload
