#!/usr/bin/env python3
"""
Display timestamped lyrics in a readable format.
"""

import json
import sys
from pathlib import Path


def display_lyrics(json_file):
    """Display timestamped lyrics from a JSON file."""
    
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    print("=" * 80)
    print(f"TIMESTAMPED LYRICS")
    print("=" * 80)
    print(f"Task ID:        {data['task_id']}")
    print(f"Variation:      {data['variation_index']}")
    print(f"Audio ID:       {data['audio_id']}")
    print(f"Style:          {data['style']}")
    print(f"Total Words:    {len(data['aligned_words'])}")
    print("=" * 80)
    print()
    
    print("LYRICS WITH TIMESTAMPS:")
    print("-" * 80)
    
    current_line = []
    last_end_time = 0
    
    for word_data in data['aligned_words']:
        word = word_data['word']
        start_s = word_data['startS']
        end_s = word_data['endS']
        
        # Check if this is a new line (markdown formatting or large gap)
        if '\n' in word or (start_s - last_end_time > 1.0):
            # Print current line
            if current_line:
                line_text = ''.join(current_line)
                print(f"{line_text}")
                current_line = []
            
            # If it's a markdown header, print it separately
            if word.strip().startswith('**['):
                print(f"\n{word.strip()}")
                last_end_time = end_s
                continue
        
        # Add timestamp annotation every few words
        if len(current_line) % 10 == 0 and current_line:
            current_line.append(f" [{start_s:.1f}s]")
        
        current_line.append(word)
        last_end_time = end_s
    
    # Print remaining line
    if current_line:
        line_text = ''.join(current_line)
        print(f"{line_text}")
    
    print()
    print("=" * 80)
    print()
    
    # Show first 10 words with detailed timing
    print("DETAILED TIMING (First 10 words):")
    print("-" * 80)
    print(f"{'Word':<20} {'Start (s)':<12} {'End (s)':<12} {'Duration (s)':<12}")
    print("-" * 80)
    
    for i, word_data in enumerate(data['aligned_words'][:10]):
        word = word_data['word'].strip()
        start_s = word_data['startS']
        end_s = word_data['endS']
        duration = end_s - start_s
        
        # Truncate long words
        if len(word) > 18:
            word = word[:15] + "..."
        
        print(f"{word:<20} {start_s:<12.3f} {end_s:<12.3f} {duration:<12.3f}")
    
    print("=" * 80)


if __name__ == "__main__":
    # Get all timestamped lyrics files
    lyrics_dir = Path(__file__).parent.parent / "report" / "timestamped_lyrics"
    
    if not lyrics_dir.exists():
        print("❌ No timestamped lyrics directory found")
        sys.exit(1)
    
    json_files = list(lyrics_dir.glob("*_var*_timestamps.json"))
    
    if not json_files:
        print("❌ No timestamped lyrics files found")
        sys.exit(1)
    
    print(f"\n✅ Found {len(json_files)} timestamped lyrics file(s)\n")
    
    # Display each file
    for json_file in sorted(json_files):
        display_lyrics(json_file)
        print("\n\n")
