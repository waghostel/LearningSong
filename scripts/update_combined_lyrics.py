#!/usr/bin/env python3
"""
Update the combined timestamped lyrics file with all 4 variations.
"""

import json
from pathlib import Path
from datetime import datetime, timezone


def update_combined_file():
    """Update all_timestamped_lyrics.json with all 4 variations."""
    
    lyrics_dir = Path(__file__).parent.parent / "report" / "timestamped_lyrics"
    
    # Find all timestamped lyrics files
    json_files = sorted(lyrics_dir.glob("*_var*_timestamps.json"))
    
    print(f"Found {len(json_files)} timestamped lyrics files")
    
    all_songs = {}
    
    for json_file in json_files:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        task_id = data['task_id']
        
        if task_id not in all_songs:
            all_songs[task_id] = {
                'task_id': task_id,
                'style': data['style'],
                'status': 'completed',
                'variations': []
            }
        
        all_songs[task_id]['variations'].append({
            'variation_index': data['variation_index'],
            'audio_id': data['audio_id'],
            'audio_url': data['audio_url'],
            'has_timestamps': True,
            'aligned_words': data['aligned_words'],
            'waveform_data': data['waveform_data'],
            'hoot_cer': data['hoot_cer'],
            'is_streamed': data['is_streamed'],
            'word_count': len(data['aligned_words'])
        })
    
    # Create combined file
    combined_data = {
        'fetched_at': datetime.now(timezone.utc).isoformat(),
        'total_songs': len(all_songs),
        'total_variations': sum(len(s['variations']) for s in all_songs.values()),
        'songs': list(all_songs.values())
    }
    
    combined_file = lyrics_dir / "all_timestamped_lyrics.json"
    with open(combined_file, 'w') as f:
        json.dump(combined_data, f, indent=2)
    
    print(f"✅ Updated: {combined_file.name}")
    print(f"   Total songs: {combined_data['total_songs']}")
    print(f"   Total variations: {combined_data['total_variations']}")


if __name__ == "__main__":
    update_combined_file()
