#!/bin/bash

# Chess Training Platform - Complete Setup Script
echo "🏆 Setting up Chess Training Platform..."
echo "========================================="
echo ""

# Navigate to project root
cd "$(dirname "$0")"

# Check if conda is installed
if ! command -v conda &> /dev/null; then
    echo "❌ Error: Conda is not installed or not in PATH"
    echo ""
    echo "Please install Anaconda or Miniconda:"
    echo "  • Anaconda: https://www.anaconda.com/products/distribution"
    echo "  • Miniconda: https://docs.conda.io/en/latest/miniconda.html"
    echo ""
    echo "Alternative: This script requires conda for optimal dependency management."
    exit 1
fi

echo "✓ Conda detected: $(conda --version)"

# Check if environment already exists
if conda env list | grep -q "chesscoach"; then
    echo ""
    echo "⚠️  Environment 'chesscoach' already exists."
    read -p "Do you want to remove it and recreate? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "�️  Removing existing environment..."
        conda env remove -n chesscoach -y
    else
        echo "Aborting setup. To use existing environment:"
        echo "  conda activate chesscoach"
        exit 1
    fi
fi

# Create conda environment from environment.yml
echo ""
echo "📦 Creating conda environment from environment.yml..."
conda env create -f environment.yml

if [ $? -eq 0 ]; then
    echo "✓ Conda environment created successfully!"
else
    echo "❌ Failed to create conda environment"
    exit 1
fi

# Activate environment for the rest of setup
echo ""
echo "🔄 Activating conda environment..."
eval "$(conda shell.bash hook)"
conda activate chesscoach

# Verify Python environment
echo ""
echo "🔍 Verifying Python installation..."
python -c "
import sys
print(f'✓ Python {sys.version}')
import requests, chess, fastapi, pydantic
print('✓ All core Python packages verified!')
"

if [ $? -ne 0 ]; then
    echo "❌ Python package verification failed"
    exit 1
fi

# Setup frontend
echo ""
echo "🌐 Setting up frontend..."
cd web_trainer

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "⚠️  Warning: Node.js is not installed"
    echo ""
    echo "To use the web training platform, please install Node.js 16+:"
    echo "  • Visit: https://nodejs.org/"
    echo "  • Or use brew: brew install node"
    echo ""
    echo "You can still use the command-line analysis tool without Node.js"
    FRONTEND_INSTALLED=false
else
    echo "✓ Node.js detected: $(node --version)"
    
    # Check npm version
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not available (should come with Node.js)"
        FRONTEND_INSTALLED=false
    else
        echo "✓ npm detected: $(npm --version)"
        
        # Install npm dependencies
        echo "📦 Installing frontend dependencies..."
        npm install
        if [ $? -eq 0 ]; then
            echo "✓ Frontend dependencies installed successfully"
            FRONTEND_INSTALLED=true
        else
            echo "❌ Failed to install frontend dependencies"
            FRONTEND_INSTALLED=false
        fi
    fi
fi

# Go back to project root
cd ..

# Create .env file from example if it doesn't exist
echo ""
echo "⚙️  Setting up configuration..."
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✓ Created .env file from .env.example"
        echo "📝 Please edit .env and add your Chess.com username"
    else
        echo "Creating basic .env file..."
        cat > .env << 'EOF'
# Chess.com username (required)
CHESSCOM_USERNAME=your_username_here

# Optional: Custom Stockfish path
# STOCKFISH_PATH=/custom/path/to/stockfish

# Optional: Analysis settings
# ANALYSIS_DEPTH=15
# ENGINE_TIME_LIMIT=0.1
EOF
        echo "✓ Created basic .env file"
        echo "📝 Please edit .env and add your Chess.com username"
    fi
else
    echo "✓ .env file already exists"
fi

# Run validation
echo ""
echo "🧪 Running system validation..."
if [ -f "validate_setup.py" ]; then
    python validate_setup.py
else
    echo "⚠️  validate_setup.py not found, skipping validation"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo "================================="
echo ""
echo "📋 What's installed:"
echo "  ✅ Conda environment 'chesscoach' with Python $(python --version | cut -d' ' -f2)"
echo "  ✅ Chess analysis engine with all dependencies"
echo "  ✅ FastAPI backend with database support"
if [ "$FRONTEND_INSTALLED" = true ]; then
    echo "  ✅ React training platform (Node.js $(node --version))"
else
    echo "  ⚠️  React training platform (Node.js not available)"
fi
echo ""
echo "🚀 Quick start guide:"
echo "  1. Activate environment:  conda activate chesscoach"
echo "  2. Configure username:    Edit .env file with your Chess.com username"
echo "  3. Analyze games:         python analyze_chess_games.py"
echo "  4. Start backend:         cd backend && python app.py"
if [ "$FRONTEND_INSTALLED" = true ]; then
    echo "  5. Start frontend:        cd web_trainer && npm start"
    echo "  6. Open browser:          http://localhost:3000"
else
    echo "  5. Install Node.js:       https://nodejs.org/ (for web interface)"
fi
echo ""
echo "📚 Documentation:"
echo "  • Main README:            README.md"
echo "  • Backend API docs:       http://localhost:8000/docs (when running)"
echo "  • Setup validation:       python validate_setup.py"
echo ""
echo "🔧 Environment management:"
echo "  • Activate later:         conda activate chesscoach"
echo "  • Deactivate:             conda deactivate"
echo "  • Remove environment:     conda env remove -n chesscoach"
echo ""
echo "⚠️  Remember to:"
echo "  1. Edit .env with your Chess.com username before analyzing games"
echo "  2. Install Stockfish chess engine if not already installed"
echo "     • macOS: brew install stockfish"
echo "     • Download: https://stockfishchess.org/download/"
echo ""
