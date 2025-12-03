#!/usr/bin/env python3
"""
Generate WebVTT caption files from timestamped lyrics.

This script converts the timestamped lyrics JSON files into WebVTT format
for displaying synchronized lyrics during audio playback.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict


def format_timestamp(seconds: float) -> str:
    """Convert seconds to WebVTT timestamp format (HH:MM:SS.mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"


def group_words_into_lines(aligned_words: List[Dict], max_words_per_line: int = 8) -> List[Dict]:
    """
    Group words into caption lines.
    
    Args:
        aligned_words: List of word dictionaries with timing info
        max_words_per_line: Maximum words per caption line
    
    Returns:
        List of caption line dictionaries with start, end, and text
    """
    lines = []
    current_line = []
    current_line_start = None
    
    for word_data in aligned_words:
        word = word_data['word']
        start_s = word_data['startS']
        end_s = word_data['endS']
        
        # Skip markdown headers (they're section markers)
        if word.strip().startswith('**[') and word.strip().endswith('**'):
            # If we have accumulated words, save them first
            if current_line:
                lines.append({
                    'start': current_line_start,
                    'end': current_line[-1]['endS'],
                    'text': ''.join([w['word'] for w in current_line]).strip()
                })
                current_line = []
                current_line_start = None
            
            # Add section marker as its own line
            lines.append({
                'start': start_s,
                'end': end_s,
                'text': word.strip().replace('**', '').strip()
            })
            continue
        
        # Check if word contains newline (end of lyric line)
        has_newline = '\n' in word
        
        # Add word to current line
        if current_line_start is None:
            current_line_start = start_s
        
        current_line.append(word_data)
        
        # Create a new caption line if:
        # 1. Word contains newline, OR
        # 2. We've reached max words per line
        if has_newline or len(current_line) >= max_words_per_line:
            line_text = ''.join([w['word'] for w in current_line]).strip()
            
            if line_text:  # Only add non-empty lines
                lines.append({
                    'start': current_line_start,
                    'end': end_s,
                    'text': line_text
                })
            
            current_line = []
            current_line_start = None
    
    # Add any remaining words
    if current_line:
        lines.append({
            'start': current_line_start,
            'end': current_line[-1]['endS'],
            'text': ''.join([w['word'] for w in current_line]).strip()
        })
    
    return lines


def generate_vtt(aligned_words: List[Dict], output_path: Path, max_words_per_line: int = 8):
    """
    Generate a WebVTT caption file from aligned words.
    
    Args:
        aligned_words: List of word dictionaries with timing info
        output_path: Path to save the VTT file
        max_words_per_line: Maximum words per caption line
    """
    # Group words into caption lines
    caption_lines = group_words_into_lines(aligned_words, max_words_per_line)
    
    # Write VTT file
    with open(output_path, 'w', encoding='utf-8') as f:
        # VTT header
        f.write('WEBVTT\n\n')
        
        # Write each caption
        for i, line in enumerate(caption_lines, 1):
            start_time = format_timestamp(line['start'])
            end_time = format_timestamp(line['end'])
            text = line['text']
            
            # Write caption number (optional but helpful)
            f.write(f"{i}\n")
            # Write timestamp
            f.write(f"{start_time} --> {end_time}\n")
            # Write text
            f.write(f"{text}\n\n")


def generate_all_vtt_files():
    """Generate VTT files for all timestamped lyrics."""
    
    print("=" * 80)
    print("GENERATING WEBVTT CAPTION FILES")
    print("=" * 80)
    print()
    
    # Get timestamped lyrics directory
    lyrics_dir = Path(__file__).parent.parent / "report" / "timestamped_lyrics"
    
    if not lyrics_dir.exists():
        print("❌ Timestamped lyrics directory not found")
        return
    
    # Create captions directory
    captions_dir = lyrics_dir / "captions"
    captions_dir.mkdir(exist_ok=True)
    
    print(f"📁 Output directory: {captions_dir}\n")
    
    # Find all timestamped lyrics files
    json_files = list(lyrics_dir.glob("*_var*_timestamps.json"))
    
    if not json_files:
        print("❌ No timestamped lyrics files found")
        return
    
    print(f"✅ Found {len(json_files)} timestamped lyrics file(s)\n")
    
    generated = 0
    failed = 0
    
    for json_file in sorted(json_files):
        print("-" * 80)
        
        try:
            # Load the JSON file
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            task_id = data['task_id']
            var_index = data['variation_index']
            audio_id = data['audio_id']
            style = data.get('style', 'unknown')
            aligned_words = data['aligned_words']
            
            print(f"📝 Processing: {task_id[:16]}... (var {var_index})")
            print(f"   Style: {style}")
            print(f"   Words: {len(aligned_words)}")
            
            # Create output filename
            output_filename = f"{task_id}_var{var_index}_{audio_id}.vtt"
            output_path = captions_dir / output_filename
            
            # Generate VTT file
            generate_vtt(aligned_words, output_path, max_words_per_line=8)
            
            print(f"   ✅ Generated: {output_filename}")
            generated += 1
            
        except Exception as e:
            print(f"   ❌ Error: {e}")
            failed += 1
        
        print()
    
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Files:        {len(json_files)}")
    print(f"✅ Generated:       {generated}")
    print(f"❌ Failed:          {failed}")
    print(f"\n📁 Caption files saved to: {captions_dir}")
    print("=" * 80)
    
    # List all generated files
    if generated > 0:
        print("\n📄 Generated Caption Files:")
        print("-" * 80)
        
        vtt_files = sorted(captions_dir.glob("*.vtt"))
        for vtt_file in vtt_files:
            file_size_kb = vtt_file.stat().st_size / 1024
            print(f"   {vtt_file.name} ({file_size_kb:.2f} KB)")
        
        print()
        print("=" * 80)
        print("\n💡 Usage Example:")
        print("-" * 80)
        print("HTML5 Audio with Captions:")
        print("""
<audio controls>
  <source src="audio.mp3" type="audio/mpeg">
  <track kind="captions" src="captions.vtt" srclang="en" label="English" default>
</audio>
        """)
        print("=" * 80)


if __name__ == "__main__":
    generate_all_vtt_files()
