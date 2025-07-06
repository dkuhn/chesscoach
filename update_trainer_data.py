#!/usr/bin/env python3
"""
Script to update the chess trainer with different analysis data.
Usage: python update_trainer_data.py [blitz|bullet]
"""

import sys
import shutil
import os
from pathlib import Path

def main():
    # Get the script directory (chess coach root)
    root_dir = Path(__file__).parent
    game_analysis_dir = root_dir / "game_analysis"
    web_trainer_public = root_dir / "web_trainer" / "public"
    
    # Check if directories exist
    if not game_analysis_dir.exists():
        print(f"Error: {game_analysis_dir} does not exist")
        return 1
    
    if not web_trainer_public.exists():
        print(f"Error: {web_trainer_public} does not exist")
        return 1
    
    # Determine which analysis file to use
    if len(sys.argv) > 1:
        game_type = sys.argv[1].lower()
        source_file = game_analysis_dir / f"robofresh_{game_type}_analysis.json"
        
        if not source_file.exists():
            print(f"Error: {source_file} does not exist")
            print("Available files:")
            for file in game_analysis_dir.glob("*_analysis.json"):
                print(f"  {file.name}")
            return 1
    else:
        # List available files
        analysis_files = list(game_analysis_dir.glob("*_analysis.json"))
        if not analysis_files:
            print("No analysis files found in game_analysis/")
            return 1
        
        print("Available analysis files:")
        for i, file in enumerate(analysis_files):
            print(f"  {i+1}. {file.name}")
        
        try:
            choice = int(input("Select file (number): ")) - 1
            if 0 <= choice < len(analysis_files):
                source_file = analysis_files[choice]
            else:
                print("Invalid choice")
                return 1
        except (ValueError, KeyboardInterrupt):
            print("\nCancelled")
            return 1
    
    # Copy the file
    dest_file = web_trainer_public / "analysis_results.json"
    
    try:
        shutil.copy2(source_file, dest_file)
        print(f"✅ Successfully updated trainer with {source_file.name}")
        
        # Count positions
        import json
        with open(dest_file) as f:
            data = json.load(f)
        print(f"📊 Loaded {len(data)} training positions")
        
        # Show error type breakdown
        error_types = {}
        for pos in data:
            error_type = pos.get('error_type', 'Unknown')
            error_types[error_type] = error_types.get(error_type, 0) + 1
        
        print("🎯 Error type breakdown:")
        for error_type, count in sorted(error_types.items()):
            print(f"   {error_type}: {count}")
            
    except Exception as e:
        print(f"Error copying file: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
