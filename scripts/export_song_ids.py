#!/usr/bin/env python3
"""
Simple script to export all taskIds and audioIds from Firestore.
"""

import asyncio
import sys
import os
import json
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Load environment variables
env_path = backend_path / ".env"
if env_path.exists():
    load_dotenv(env_path)

from app.core.firebase import initialize_firebase, get_firestore_client


async def export_song_ids():
    """Export all song IDs in various formats."""
    
    try:
        # Initialize Firebase
        initialize_firebase()
        firestore_client = get_firestore_client()
        
        # Query all songs
        songs_ref = firestore_client.collection("songs").order_by("created_at", direction="DESCENDING")
        
        songs = []
        for doc in songs_ref.stream():
            song_data = doc.to_dict()
            songs.append(song_data)
        
        print("=" * 80)
        print(f"FOUND {len(songs)} SONGS IN DATABASE")
        print("=" * 80)
        print()
        
        # Export 1: Simple list of task IDs
        print("📋 ALL TASK IDs:")
        print("-" * 80)
        for song in songs:
            task_id = song.get('task_id', 'N/A')
            status = song.get('status', 'N/A')
            style = song.get('style', 'N/A')
            print(f"{task_id} | {status:12} | {style}")
        
        print()
        print("=" * 80)
        print()
        
        # Export 2: Task IDs with Audio IDs (variations format)
        print("🎵 TASK IDs WITH AUDIO IDs (NEW FORMAT - VARIATIONS):")
        print("-" * 80)
        print("task_id | variation_index | audio_id | status")
        print("-" * 80)
        
        found_variations = False
        for song in songs:
            task_id = song.get('task_id', 'N/A')
            status = song.get('status', 'N/A')
            variations = song.get('variations', [])
            
            if variations:
                found_variations = True
                for var in variations:
                    var_idx = var.get('variation_index', 'N/A')
                    audio_id = var.get('audio_id', 'N/A')
                    print(f"{task_id} | {var_idx} | {audio_id} | {status}")
        
        if not found_variations:
            print("(No songs with variations format found)")
        
        print()
        print("=" * 80)
        print()
        
        # Export 3: Legacy format (old schema)
        print("🎵 TASK IDs WITH AUDIO IDs (LEGACY FORMAT):")
        print("-" * 80)
        print("task_id | audio_id | status")
        print("-" * 80)
        
        found_legacy = False
        for song in songs:
            task_id = song.get('task_id', 'N/A')
            status = song.get('status', 'N/A')
            audio_id = song.get('audio_id')
            
            # Only show if has audio_id and no variations
            if audio_id and not song.get('variations'):
                found_legacy = True
                print(f"{task_id} | {audio_id} | {status}")
        
        if not found_legacy:
            print("(No songs with legacy format found)")
        
        print()
        print("=" * 80)
        print()
        
        # Export 4: JSON format for programmatic use
        print("📦 JSON EXPORT (for programmatic use):")
        print("-" * 80)
        
        export_data = []
        for song in songs:
            task_id = song.get('task_id')
            status = song.get('status')
            style = song.get('style')
            
            # Check for variations (new format)
            variations = song.get('variations', [])
            if variations:
                for var in variations:
                    export_data.append({
                        'task_id': task_id,
                        'variation_index': var.get('variation_index'),
                        'audio_id': var.get('audio_id'),
                        'audio_url': var.get('audio_url'),
                        'status': status,
                        'style': style,
                        'format': 'variations'
                    })
            else:
                # Check for legacy format
                audio_id = song.get('audio_id')
                song_url = song.get('song_url')
                if audio_id or song_url:
                    export_data.append({
                        'task_id': task_id,
                        'audio_id': audio_id,
                        'song_url': song_url,
                        'status': status,
                        'style': style,
                        'format': 'legacy'
                    })
                else:
                    # No audio data yet
                    export_data.append({
                        'task_id': task_id,
                        'status': status,
                        'style': style,
                        'format': 'no_audio'
                    })
        
        print(json.dumps(export_data, indent=2))
        
        print()
        print("=" * 80)
        print()
        
        # Export 5: Summary statistics
        print("📊 SUMMARY:")
        print("-" * 80)
        
        total = len(songs)
        completed = sum(1 for s in songs if s.get('status') == 'completed')
        failed = sum(1 for s in songs if s.get('status') == 'failed')
        in_progress = sum(1 for s in songs if s.get('status') in ['queued', 'processing'])
        
        with_variations = sum(1 for s in songs if s.get('variations'))
        with_legacy_audio = sum(1 for s in songs if s.get('audio_id') and not s.get('variations'))
        with_timestamps = sum(1 for s in songs if s.get('has_timestamps'))
        
        print(f"Total Songs:              {total}")
        print(f"  ✅ Completed:           {completed}")
        print(f"  ⏳ In Progress:         {in_progress}")
        print(f"  ❌ Failed:              {failed}")
        print()
        print(f"Songs with Variations:    {with_variations}")
        print(f"Songs with Legacy Audio:  {with_legacy_audio}")
        print(f"Songs with Timestamps:    {with_timestamps}")
        
        print()
        print("=" * 80)
        
        # Save to file
        output_file = Path(__file__).parent.parent / "report" / "song_ids_export.json"
        output_file.parent.mkdir(exist_ok=True)
        
        with open(output_file, 'w') as f:
            json.dump({
                'exported_at': datetime.now(timezone.utc).isoformat(),
                'total_songs': total,
                'songs': export_data
            }, f, indent=2)
        
        print(f"\n💾 Data exported to: {output_file}")
        print()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(export_song_ids())
