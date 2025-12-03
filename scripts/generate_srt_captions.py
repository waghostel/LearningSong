#!/usr/bin/env python3
"""
Generate SRT (SubRip) caption files from timestamped lyrics.

SRT format is widely supported by desktop media players including:
- VLC Media Player
- Windows Media Player (with codec pack)
- MPC-HC (Media Player Classic)
- PotPlayer
- KMPlayer
"""

import json
import sys
from pathlib import Path
from typing import List, Dict


def format_srt_timestamp(seconds: float) -> str:
    """Convert seconds to SRT timestamp format (HH:MM:SS,mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


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


def generate_srt(aligned_words: List[Dict], output_path: Path, max_words_per_line: int = 8):
    """
    Generate an SRT caption file from aligned words.
    
    Args:
        aligned_words: List of word dictionaries with timing info
        output_path: Path to save the SRT file
        max_words_per_line: Maximum words per caption line
    """
    # Group words into caption lines
    caption_lines = group_words_into_lines(aligned_words, max_words_per_line)
    
    # Write SRT file
    with open(output_path, 'w', encoding='utf-8') as f:
        # Write each caption
        for i, line in enumerate(caption_lines, 1):
            start_time = format_srt_timestamp(line['start'])
            end_time = format_srt_timestamp(line['end'])
            text = line['text']
            
            # SRT format:
            # 1. Sequence number
            # 2. Start --> End timestamp
            # 3. Text
            # 4. Blank line
            f.write(f"{i}\n")
            f.write(f"{start_time} --> {end_time}\n")
            f.write(f"{text}\n\n")


def generate_all_srt_files():
    """Generate SRT files for all timestamped lyrics."""
    
    print("=" * 80)
    print("GENERATING SRT CAPTION FILES")
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
            output_filename = f"{task_id}_var{var_index}_{audio_id}.srt"
            output_path = captions_dir / output_filename
            
            # Generate SRT file
            generate_srt(aligned_words, output_path, max_words_per_line=8)
            
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
        print("\n📄 Generated SRT Caption Files:")
        print("-" * 80)
        
        srt_files = sorted(captions_dir.glob("*.srt"))
        for srt_file in srt_files:
            file_size_kb = srt_file.stat().st_size / 1024
            print(f"   {srt_file.name} ({file_size_kb:.2f} KB)")
        
        print()
        print("=" * 80)
        print("\n💡 Usage with Media Players:")
        print("-" * 80)
        print("VLC Media Player:")
        print("  1. Open the MP3 file in VLC")
        print("  2. Go to: Subtitle → Add Subtitle File...")
        print("  3. Select the .srt file with the same name")
        print()
        print("Windows Media Player:")
        print("  1. Place the .srt file in the same folder as the .mp3")
        print("  2. Give them the same filename (e.g., song.mp3 and song.srt)")
        print("  3. Open the MP3 file")
        print()
        print("MPC-HC / PotPlayer / KMPlayer:")
        print("  1. Right-click → Subtitles → Load Subtitle")
        print("  2. Select the .srt file")
        print("=" * 80)


if __name__ == "__main__":
    generate_all_srt_files()
