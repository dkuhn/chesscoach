#!/usr/bin/env python3
"""
Chess Training Platform - Package Validation Script
Validates that all required packages are installed and working correctly.
"""

import sys
import subprocess
#!/usr/bin/env python3
"""
Quick verification script to test that all components are working correctly.
"""
import sys
import os
from dotenv import load_dotenv
import chess
import chess.engine
import chess.pgn

def test_imports():
    """Test that all required imports work."""
    print("✓ All imports successful")
    return True

def test_env_loading():
    """Test that environment variables load correctly."""
    load_dotenv()
    username = os.getenv("CHESSCOM_USERNAME", "")
    if username:
        print(f"✓ Environment variable loaded: CHESSCOM_USERNAME={username}")
        return True
    else:
        print("✗ Environment variable not found")
        return False

def test_stockfish():
    """Test that Stockfish is accessible."""
    # Load environment variables first
    load_dotenv()
    # Use the same logic as the main script
    stockfish_path = os.getenv("STOCKFISH_PATH", "/opt/homebrew/bin/stockfish")
    if os.path.exists(stockfish_path):
        print(f"✓ Stockfish found at: {stockfish_path}")
        try:
            # Try to initialize the engine briefly (using synchronous version)
            with chess.engine.SimpleEngine.popen_uci(stockfish_path) as engine:
                # Just test that we can create the engine
                pass
            print("✓ Stockfish engine can be initialized")
            return True
        except Exception as e:
            print(f"✗ Stockfish engine error: {e}")
            return False
    else:
        print(f"✗ Stockfish not found at: {stockfish_path}")
        print("  You can set STOCKFISH_PATH in your .env file if it's in a different location")
        return False

def test_chess_library():
    """Test basic chess library functionality."""
    try:
        board = chess.Board()
        print(f"✓ Chess library working: {len(list(board.legal_moves))} legal moves from starting position")
        return True
    except Exception as e:
        print(f"✗ Chess library error: {e}")
        return False

def run_funcational_tests():
    """Run all tests."""
    print("🔍 Running Chess Analyzer Verification Tests\n")
    
    tests = [
        ("Imports", test_imports),
        ("Environment Variables", test_env_loading), 
        ("Stockfish Engine", test_stockfish),
        ("Chess Library", test_chess_library)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"Testing {test_name}...")
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"✗ {test_name} failed with exception: {e}")
            results.append(False)
        print()
    
    if all(results):
        print("🎉 All tests passed! Your chess analyzer setup is ready to use.")
        print("\nTo run the analyzer:")
        print("  python analyze_chess_games.py")
        return 0
    else:
        print("❌ Some tests failed. Please check the errors above.")
        return 1


def check_package(package_name, import_name=None):
    """Check if a package is installed and can be imported"""
    if import_name is None:
        import_name = package_name.replace('-', '_')
    
    try:
        __import__(import_name)
        print(f"✅ {package_name}")
        return True
    except ImportError:
        print(f"❌ {package_name} - NOT INSTALLED")
        return False

def get_package_version(package_name):
    """Get the version of an installed package"""
    try:
        result = subprocess.run([sys.executable, '-c', f'import {package_name}; print({package_name}.__version__)'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
    except:
        pass
    return "unknown"

def check_conda_environment():
    """Check if running in the correct conda environment"""
    try:
        import os
        conda_env = os.environ.get('CONDA_DEFAULT_ENV')
        if conda_env == 'chesscoach':
            print(f"✅ Running in conda environment: {conda_env}")
            return True
        elif conda_env:
            print(f"⚠️  Running in conda environment: {conda_env} (expected: chesscoach)")
            print("   Run: conda activate chesscoach")
            return False
        else:
            print("⚠️  Not running in a conda environment")
            print("   Recommended: conda activate chesscoach")
            return False
    except:
        return True

def check_environment_setup():
    """Check various environment setup aspects"""
    print("\n🌍 Environment Setup:")
    
    # Check conda environment
    check_conda_environment()
    
    # Check Python version
    major, minor = sys.version_info[:2]
    if major == 3 and minor >= 8:
        print(f"✅ Python version: {major}.{minor}")
    else:
        print(f"⚠️  Python version: {major}.{minor} (recommended: 3.8+)")
    
    # Check if .env file exists
    import os
    if os.path.exists('.env'):
        print("✅ .env file found")
    else:
        print("⚠️  .env file not found (copy .env.example to .env)")
    
    # Check if Stockfish path is configured
    try:
        from dotenv import load_dotenv
        load_dotenv()
        stockfish_path = os.environ.get('STOCKFISH_PATH')
        if stockfish_path and os.path.exists(stockfish_path):
            print("✅ Stockfish path configured and found")
        elif stockfish_path:
            print("⚠️  Stockfish path configured but file not found")
        else:
            print("ℹ️  Stockfish path not configured in .env")
    except:
        print("ℹ️  Could not check Stockfish configuration")

def main():
    print("Chess Training Platform - Package Validation")
    print("=" * 50)
    
    # Check environment setup
    check_environment_setup()
    
    # Core packages
    print("\n📦 Core Analysis Packages:")
    packages = [
        ("requests", "requests"),
        ("python-chess", "chess"),
        ("python-dotenv", "dotenv"),
    ]
    
    core_ok = True
    for pkg_name, import_name in packages:
        if not check_package(pkg_name, import_name):
            core_ok = False
    
    # Backend packages
    print("\n🚀 Backend API Packages:")
    backend_packages = [
        ("fastapi", "fastapi"),
        ("uvicorn", "uvicorn"),
        ("pydantic", "pydantic"),
    ]
    
    backend_ok = True
    for pkg_name, import_name in backend_packages:
        if not check_package(pkg_name, import_name):
            backend_ok = False
    
    # Optional packages
    print("\n🔧 Development Packages:")
    dev_packages = [
        ("pytest", "pytest"),
        ("httpx", "httpx"),
    ]
    
    for pkg_name, import_name in dev_packages:
        check_package(pkg_name, import_name)
    
    # Version information
    print("\n📋 Package Versions:")
    version_packages = ['requests', 'chess', 'fastapi', 'pydantic']
    for pkg in version_packages:
        version = get_package_version(pkg)
        print(f"  {pkg}: {version}")
    
    # Summary
    print("\n" + "=" * 50)
    if core_ok and backend_ok:
        print("🎉 All required packages are installed and working!")
        print("\n✅ You can now:")
        print("  • Run chess analysis: python3 analyze_chess_games.py")
        print("  • Start backend: cd backend && ./start_backend.sh")
        print("  • Start frontend: cd web_trainer && npm start")
    else:
        print("❌ Some required packages are missing.")
        print("   Recommended: ./install.sh (uses conda)")
        print("   Alternative: pip install -r requirements.txt")
        return 1
    
    return 0

if __name__ == "__main__":
    main()
    run_funcational_tests()
