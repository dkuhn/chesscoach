import requests
import chess
import chess.engine
import chess.pgn
import json
import os
import io # Required for chess.pgn.read_game
import argparse
import hashlib
from datetime import datetime
from dotenv import load_dotenv
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing
from tqdm import tqdm

# Load environment variables from .env file
load_dotenv()

# --- Configuration (User MUST update these) ---
# Replace with your Chess.com username in the .env file. This is crucial for downloading your games.
CHESSCOM_USERNAME = os.getenv("CHESSCOM_USERNAME", "")
# Replace with the actual, full path to your Stockfish executable.
# You can set this in the .env file or update the default path below.
# You need to download Stockfish separately from https://stockfishchess.org/download/
# Examples:
# On Windows: "C:/Stockfish/stockfish-windows-x64-avx2.exe"
# On macOS: "/opt/homebrew/bin/stockfish" (if installed via Homebrew) or "/usr/local/bin/stockfish"
# On Linux: "/usr/games/stockfish" or similar, depending on installation
STOCKFISH_PATH = os.getenv("STOCKFISH_PATH", "/opt/homebrew/bin/stockfish")

# Output directory for the analysis results.
OUTPUT_DIR = "game_analysis"

# Cache directory for storing analyzed games
CACHE_DIR = "game_cache"

# Engine analysis time per move in seconds. Higher values lead to better analysis but take longer.
ENGINE_TIME_LIMIT = 0.1

# Number of parallel workers for game analysis (default: number of CPU cores)
MAX_WORKERS = min(multiprocessing.cpu_count(), 8)  # Cap at 8 to avoid overwhelming the system

# Centipawn drop thresholds to classify errors (from the player's perspective):
# A drop of 200 centipawns (2 pawns) or more.
BLUNDER_THRESHOLD_CP = 200
# A drop of 100-199 centipawns (1 to just under 2 pawns).
MISTAKE_THRESHOLD_CP = 100


def fetch_chesscom_archives(username):
    """
    Fetches the URLs for a user's game archives from Chess.com API.

    Args:
        username (str): The Chess.com username.

    Returns:
        list: A list of archive URLs, or an empty list if an error occurs.
    """
    url = f"https://api.chess.com/pub/player/{username}/games/archives"
    print(f"Attempting to fetch archives from: {url}")
    
    # Add proper headers to identify the request
    headers = {
        'User-Agent': 'ChessTrainer/1.0 (https://github.com/chess-trainer; contact@example.com)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10) # Add headers and timeout
        response.raise_for_status()  # Raise an HTTPError for bad responses (4xx or 5xx)
        data = response.json()
        print(f"Successfully fetched {len(data.get('archives', []))} archives.")
        return data.get("archives", [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching archives for {username}: {e}")
        return []


def fetch_games_from_archive(archive_url):
    """
    Fetches games from a specific Chess.com archive URL.

    Args:
        archive_url (str): The URL of the game archive.

    Returns:
        list: A list of game dictionaries, or an empty list if an error occurs.
    """
    # Add proper headers to identify the request
    headers = {
        'User-Agent': 'ChessTrainer/1.0 (https://github.com/chess-trainer; contact@example.com)',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate'
    }
    
    try:
        response = requests.get(archive_url, headers=headers, timeout=30) # Add headers and longer timeout for game data
        response.raise_for_status()
        data = response.json()
        return data.get("games", [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching games from {archive_url}: {e}")
        return []


def download_games_by_type(username, game_type="blitz", max_games=None):
    """
    Downloads games of a specific type for a given user from Chess.com.

    Args:
        username (str): The Chess.com username.
        game_type (str): Type of games to download ("blitz", "bullet", "rapid", "daily").
        max_games (int, optional): Maximum number of games to download for testing.

    Returns:
        list: A list of PGN strings for all downloaded games of the specified type.
    """
    all_pgns = []
    print(f"Fetching game archives for {username}...")
    archives = fetch_chesscom_archives(username)

    if not archives:
        print("No archives found or an error occurred during archive fetching. Exiting game download.")
        return []

    print(f"Found {len(archives)} archives. Downloading {game_type} games...")
    
    # Process archives in reverse order (most recent first) for better testing experience
    for i, archive_url in enumerate(reversed(archives)):
        print(f"  ({i+1}/{len(archives)}) Downloading games from {archive_url}...")
        games = fetch_games_from_archive(archive_url)
        downloaded_count = 0
        for game_data in games:
            # Filter for games of the specified type
            if game_data.get("time_class") == game_type:
                pgn = game_data.get("pgn")
                if pgn:
                    all_pgns.append(pgn)
                    downloaded_count += 1
                    
                    # Check if we've reached the maximum number of games for testing
                    if max_games and len(all_pgns) >= max_games:
                        print(f"    Reached maximum of {max_games} games for testing.")
                        print(f"Finished downloading. Total {game_type} games collected: {len(all_pgns)}")
                        return all_pgns
                        
        print(f"    Downloaded {downloaded_count} {game_type} games from this archive.")
        
    print(f"Finished downloading. Total {game_type} games collected: {len(all_pgns)}")
    return all_pgns


def get_game_hash(pgn_string):
    """
    Generate a unique hash for a PGN game to use as cache key.
    
    Args:
        pgn_string (str): The PGN string of the game.
        
    Returns:
        str: SHA256 hash of the game content.
    """
    # Remove whitespace variations and normalize the PGN for consistent hashing
    normalized_pgn = ' '.join(pgn_string.split())
    return hashlib.sha256(normalized_pgn.encode('utf-8')).hexdigest()


def get_cache_filename(game_hash, username, game_type):
    """
    Generate cache filename for a specific game analysis.
    
    Args:
        game_hash (str): Hash of the game.
        username (str): Username being analyzed.
        game_type (str): Type of game (blitz, bullet, etc.).
        
    Returns:
        str: Full path to cache file.
    """
    cache_filename = f"{username}_{game_type}_{game_hash}.json"
    return os.path.join(CACHE_DIR, cache_filename)


def load_cached_analysis(game_hash, username, game_type):
    """
    Load cached analysis results for a game if available.
    
    Args:
        game_hash (str): Hash of the game.
        username (str): Username being analyzed.
        game_type (str): Type of game.
        
    Returns:
        list or None: Cached analysis results or None if not cached.
    """
    cache_file = get_cache_filename(game_hash, username, game_type)
    
    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"  Warning: Could not load cache file {cache_file}: {e}")
            # Remove corrupted cache file
            try:
                os.remove(cache_file)
            except OSError:
                pass
    
    return None


def save_analysis_to_cache(analysis_results, game_hash, username, game_type):
    """
    Save analysis results to cache for future use.
    
    Args:
        analysis_results (list): Analysis results to cache.
        game_hash (str): Hash of the game.
        username (str): Username being analyzed.
        game_type (str): Type of game.
    """
    cache_file = get_cache_filename(game_hash, username, game_type)
    
    # Create cache directory if it doesn't exist
    os.makedirs(CACHE_DIR, exist_ok=True)
    
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(analysis_results, f, indent=2)
    except IOError as e:
        print(f"  Warning: Could not save to cache file {cache_file}: {e}")


def analyze_game_with_engine(pgn_string, engine_path, time_limit=ENGINE_TIME_LIMIT, username_to_analyze=CHESSCOM_USERNAME):
    """
    Analyzes a single PGN game using a UCI chess engine (Stockfish)
    and identifies blunders/mistakes made by the specified user.

    Args:
        pgn_string (str): The PGN string of the game.
        engine_path (str): Path to the Stockfish executable.
        time_limit (float): Time in seconds for engine to think per move.
        username_to_analyze (str): The username whose

    Returns:
        list: A list of dictionaries, each representing a problematic position.
              Each dictionary contains:
              - "fen": FEN string of the position *after* the problematic move.
              - "move_number": The move number (e.g., 1 for 1.e4).
              - "player_color": "white" or "black" for the player who made the move.
              - "player_move": The move made by the player in UCI format (e.g., "e2e4").
              - "eval_before_move_cp": Engine evaluation before the player's move (in centipawns, from player's perspective).
              - "eval_after_move_cp": Engine evaluation after the player's move (in centipawns, from player's perspective).
              - "best_move": The engine's best move from the *original* position (before the player's move).
              - "error_type": "Blunder", "Mistake", or potentially "Inaccuracy" (if added).
              - "game_url": URL of the game on Chess.com (if available in PGN headers).
    """
    problematic_positions = []
    engine = None
    try:
        # Initialize the chess engine
        engine = chess.engine.SimpleEngine.popen_uci(engine_path)
        # Set engine options for better performance (adjust as needed)
        engine.configure({"Threads": 1, "Hash": 16})

        # Read the PGN game
        game = chess.pgn.read_game(io.StringIO(pgn_string))
        if not game:
            print("  Warning: Could not parse PGN. Skipping game.")
            return []

        # Determine which player is the user based on game headers
        user_is_white = game.headers.get("White", "").lower() == username_to_analyze.lower()
        user_is_black = game.headers.get("Black", "").lower() == username_to_analyze.lower()

        if not user_is_white and not user_is_black:
            # print(f"  User '{username_to_analyze}' not found in game headers. Skipping analysis for this game.")
            return [] # User was not one of the players in this game

        board = game.board()
        move_number = 0
        
        # Iterate through the moves in the game
        for move in game.mainline_moves():
            move_number += 1
            # Determine whose turn it was before the move
            current_player_color = "white" if board.turn == chess.WHITE else "black"
            player_who_moved = game.headers.get("White") if board.turn == chess.WHITE else game.headers.get("Black")

            # Get evaluation BEFORE the current move is made
            # Analyze from the perspective of the player whose turn it is
            info_before = engine.analyse(board, chess.engine.Limit(time=time_limit))
            # Score is from the perspective of the side to move.
            eval_before_move_cp = info_before["score"].relative.score(mate_score=10000)

            # Make the move on the board
            board.push(move)

            # Get evaluation AFTER the current move has been made
            # Now, the score is from the perspective of the *next* player to move (opponent)
            info_after = engine.analyse(board, chess.engine.Limit(time=time_limit))
            # Convert to the perspective of the player who *just* moved for comparison
            eval_after_move_cp = info_after["score"].relative.score(mate_score=10000) * -1

            # Calculate the drop in evaluation for the player who just moved
            # A positive eval_drop means the player's position got worse.
            eval_drop = eval_before_move_cp - eval_after_move_cp

            # Check if the move was made by the target user and if it's an error
            if player_who_moved and player_who_moved.lower() == username_to_analyze.lower():
                error_type = None
                if eval_drop >= BLUNDER_THRESHOLD_CP:
                    error_type = "Blunder"
                elif eval_drop >= MISTAKE_THRESHOLD_CP:
                    error_type = "Mistake"
                # You can add a threshold for "Inaccuracy" here if desired, e.g.,
                # elif eval_drop >= INACCURACY_THRESHOLD_CP:
                #     error_type = "Inaccuracy"

                if error_type:
                    # To find the best move, we need to go back to the position *before* the user's move
                    board.pop()
                    best_move_info = engine.analyse(board, chess.engine.Limit(time=time_limit))
                    best_move_uci = best_move_info["pv"][0].uci() if best_move_info["pv"] else "N/A"
                    board.push(move) # Push the user's move back to continue game analysis

                    problematic_positions.append({
                        "fen": board.fen(), # FEN *after* the problematic move
                        "move_number": move_number,
                        "player_color": current_player_color,
                        "player_move": move.uci(),
                        "eval_before_move_cp": eval_before_move_cp,
                        "eval_after_move_cp": eval_after_move_cp,
                        "best_move": best_move_uci,
                        "error_type": error_type,
                        "game_url": game.headers.get("Site", "N/A") # Get game URL if available
                    })

    except chess.engine.EngineError as e:
        print(f"  Chess engine error for game: {e}. Ensure Stockfish path is correct and it's executable.")
    except Exception as e:
        print(f"  An unexpected error occurred during game analysis: {e}")
    finally:
        if engine:
            engine.quit() # Always ensure the engine process is terminated
    return problematic_positions


def analyze_game_with_caching(pgn_string, engine_path, time_limit, username_to_analyze, game_type):
    """
    Analyze a game with caching support - check cache first, then analyze if needed.
    
    Args:
        pgn_string (str): The PGN string of the game.
        engine_path (str): Path to the Stockfish executable.
        time_limit (float): Time in seconds for engine to think per move.
        username_to_analyze (str): The username whose moves we want to analyze for errors.
        game_type (str): Type of game (for cache organization).
        
    Returns:
        list: Analysis results (from cache or fresh analysis).
    """
    # Generate hash for this game
    game_hash = get_game_hash(pgn_string)
    
    # Try to load from cache first
    cached_results = load_cached_analysis(game_hash, username_to_analyze, game_type)
    if cached_results is not None:
        print("  (Using cached analysis)")
        return cached_results
    
    # No cache found, perform fresh analysis
    analysis_results = analyze_game_with_engine(pgn_string, engine_path, time_limit, username_to_analyze)
    
    # Save results to cache for future use
    save_analysis_to_cache(analysis_results, game_hash, username_to_analyze, game_type)
    
    return analysis_results


def analyze_game_with_caching_parallel(args_tuple):
    # Helper for ProcessPoolExecutor: unpack tuple and call analyze_game_with_caching
    return analyze_game_with_caching(*args_tuple)


def analyze_games_in_parallel(pgns, stockfish_path, time_limit, username, game_type, max_workers=MAX_WORKERS):
    """
    Analyze multiple games in parallel using ProcessPoolExecutor.
    Returns all problematic positions from all games.
    """
    all_problematic_positions = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        futures = []
        for i, pgn in enumerate(pgns):
          print(f"Submitting game {i+1}/{len(pgns)} for analysis...")
          futures.append(executor.submit(
                analyze_game_with_caching_parallel,
                (pgn, stockfish_path, time_limit, username, game_type)
            ))
        with tqdm(total=len(futures), desc="Analyzing games") as pbar:
            for future in as_completed(futures):
                try:
                    game_problems = future.result()
                    if game_problems:
                        all_problematic_positions.extend(game_problems)
                        #print(f"  [Parallel] Found {len(game_problems)} problematic positions in a game.")
                    else:
                        pass
                        #print(f"  [Parallel] No significant errors found in a game or game skipped.")
                except Exception as e:
                    print(f"  [Parallel] Error analyzing a game: {e}")
                pbar.update(1)
    return all_problematic_positions


def save_analysis_results(analysis_data, filename):
    """
    Saves the aggregated analysis data to a JSON file.

    Args:
        analysis_data (list): A list of dictionaries containing problematic positions.
        filename (str): The full path and filename for the output JSON.
    """
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(analysis_data, f, indent=4)
        print(f"Analysis results successfully saved to {filename}")
    except IOError as e:
        print(f"Error saving analysis results to {filename}: {e}")


def parse_arguments():
    """
    Parse command-line arguments for the chess game analyzer.
    
    Returns:
        argparse.Namespace: Parsed command-line arguments.
    """
    parser = argparse.ArgumentParser(
        description="Download and analyze Chess.com games for training purposes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python analyze_chess_games.py --game-type blitz
  python analyze_chess_games.py --game-type bullet --test
  python analyze_chess_games.py --game-type rapid --max-games 50
  python analyze_chess_games.py --game-type blitz --clear-cache
        """
    )
    
    parser.add_argument(
        "--game-type", 
        choices=["blitz", "bullet", "rapid", "daily"],
        default="blitz",
        help="Type of games to download and analyze (default: blitz)"
    )
    
    parser.add_argument(
        "--test", 
        action="store_true",
        help="Test mode: only analyze the first 10 games for quick testing"
    )
    
    parser.add_argument(
        "--max-games",
        type=int,
        help="Maximum number of games to download and analyze (overrides --test)"
    )
    
    parser.add_argument(
        "--username",
        help="Chess.com username to analyze (overrides .env file setting)"
    )
    
    parser.add_argument(
        "--stockfish-path",
        help="Path to Stockfish executable (overrides .env file setting)"
    )
    
    parser.add_argument(
        "--clear-cache",
        action="store_true",
        help="Clear all cached analysis results before running"
    )
    
    return parser.parse_args()


def clear_cache():
    """
    Remove all cached analysis files from the cache directory.
    """
    if os.path.exists(CACHE_DIR):
        import shutil

        try:
            shutil.rmtree(CACHE_DIR)
            print(f"Cache directory '{CACHE_DIR}' cleared successfully.")
        except OSError as e:
            print(f"Error clearing cache directory '{CACHE_DIR}': {e}")
    else:
        print(f"Cache directory '{CACHE_DIR}' does not exist.")


def main():
    """
    Main function to orchestrate game download, analysis, and result saving.
    """
    # Parse command-line arguments
    args = parse_arguments()
    
    # Override configuration with command-line arguments if provided
    username = args.username if args.username else CHESSCOM_USERNAME
    stockfish_path = args.stockfish_path if args.stockfish_path else STOCKFISH_PATH
    game_type = args.game_type

    # Determine max games to analyze
    max_games = None
    if args.max_games:
        max_games = args.max_games
    elif args.test:
        max_games = 10
    
    print(f"--- Starting Chess.com {game_type.title()} Game Downloader and Analyzer ---")

    # Clear cache if requested
    if args.clear_cache:
        print("\n--- Clearing Cache ---")
        clear_cache()

    # --- Pre-flight Checks ---
    if not username:
        print("\nERROR: Please update 'CHESSCOM_USERNAME' in the .env file with your actual Chess.com username.")
        print("Create a .env file in the project directory and add: CHESSCOM_USERNAME=your_username_here")
        print("Or use the --username command-line option.")
        return
    if stockfish_path == "/path/to/your/stockfish" or not os.path.exists(stockfish_path):
        print(f"\nERROR: Stockfish executable not found at '{stockfish_path}'.")
        print("Please download Stockfish from https://stockfishchess.org/download/ and update 'STOCKFISH_PATH' in the script.")
        print("Make sure the path is correct for your operating system and the file is executable.")
        print("Or use the --stockfish-path command-line option.")
        return

    print(f"\nConfiguration:")
    print(f"  Chess.com Username: {username}")
    print(f"  Game Type: {game_type}")
    print(f"  Stockfish Path: {stockfish_path}")
    print(f"  Output Directory: {OUTPUT_DIR}")
    print(f"  Engine Time Limit per move: {ENGINE_TIME_LIMIT} seconds")
    print(f"  Blunder Threshold: {BLUNDER_THRESHOLD_CP} centipawns")
    print(f"  Mistake Threshold: {MISTAKE_THRESHOLD_CP} centipawns")
    if max_games:
        print(f"  Max Games to Analyze: {max_games} {'(test mode)' if args.test else ''}")

    # 1. Download Games
    print(f"\n--- Step 1: Downloading {game_type.title()} Games ---")
    pgns = download_games_by_type(username, game_type, max_games)

    if not pgns:
        print(f"No {game_type} games were downloaded. Analysis cannot proceed. Exiting.")
        return

    # 2. Analyze Games (parallelized)
    print("\n--- Step 2: Analyzing Downloaded Games ---")
    all_problematic_positions = analyze_games_in_parallel(
        pgns, stockfish_path, ENGINE_TIME_LIMIT, username, game_type, max_workers=MAX_WORKERS
    )

    print(f"\nTotal problematic positions identified across all games: {len(all_problematic_positions)}")

    # 3. Save Analysis Results
    print("\n--- Step 3: Saving Analysis Results ---")
    output_filename = os.path.join(OUTPUT_DIR, f"{username}_{game_type}_analysis.json")
    save_analysis_results(all_problematic_positions, output_filename)

    print("\n--- Analysis Complete! ---")
    print(f"You can now find your analysis results in: {os.path.abspath(output_filename)}")
    print("This JSON file contains the FENs and details of positions where you made blunders or mistakes.")
    print("You can use this data to build a custom trainer application.")


if __name__ == "__main__":
    main()
