#!/usr/bin/env python3
"""
Script to retrieve all taskIds and audioIds from Firestore.

This script queries the 'songs' collection and displays all stored songs
with their taskId, audioId(s), status, and creation time.
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Add backend to path
backend_path = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_path))

# Load environment variables from backend/.env
env_path = backend_path / ".env"
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from: {env_path}\n")
else:
    print(f"⚠️  Warning: .env file not found at {env_path}\n")

from app.core.firebase import initialize_firebase, get_firestore_client


async def retrieve_all_songs():
    """Retrieve all songs from Firestore and display their IDs."""
    
    print("=" * 80)
    print("RETRIEVING ALL SONGS FROM FIRESTORE")
    print("=" * 80)
    print()
    
    try:
        # Initialize Firebase
        initialize_firebase()
        firestore_client = get_firestore_client()
        
        # Query all songs, ordered by creation time (newest first)
        songs_ref = (
            firestore_client.collection("songs")
            .order_by("created_at", direction="DESCENDING")
        )
        
        songs = []
        for doc in songs_ref.stream():
            song_data = doc.to_dict()
            song_data['doc_id'] = doc.id
            songs.append(song_data)
        
        if not songs:
            print("❌ No songs found in the database.")
            return
        
        print(f"✅ Found {len(songs)} song(s) in the database\n")
        print("=" * 80)
        
        for idx, song in enumerate(songs, 1):
            print(f"\n📀 SONG #{idx}")
            print("-" * 80)
            
            # Basic info
            task_id = song.get('task_id', 'N/A')
            user_id = song.get('user_id', 'N/A')
            status = song.get('status', 'N/A')
            style = song.get('style', 'N/A')
            
            print(f"Task ID:        {task_id}")
            print(f"User ID:        {user_id[:16]}..." if len(user_id) > 16 else f"User ID:        {user_id}")
            print(f"Status:         {status}")
            print(f"Style:          {style}")
            
            # Timestamps
            created_at = song.get('created_at')
            expires_at = song.get('expires_at')
            
            if created_at:
                if hasattr(created_at, 'timestamp'):
                    created_dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
                elif isinstance(created_at, datetime):
                    created_dt = created_at
                else:
                    created_dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
                print(f"Created:        {created_dt.strftime('%Y-%m-%d %H:%M:%S UTC')}")
            
            if expires_at:
                if hasattr(expires_at, 'timestamp'):
                    expires_dt = datetime.fromtimestamp(expires_at.timestamp(), tz=timezone.utc)
                elif isinstance(expires_at, datetime):
                    expires_dt = expires_at
                else:
                    expires_dt = datetime.fromisoformat(str(expires_at).replace('Z', '+00:00'))
                
                is_expired = datetime.now(timezone.utc) > expires_dt
                expiry_status = "⚠️  EXPIRED" if is_expired else "✅ Active"
                print(f"Expires:        {expires_dt.strftime('%Y-%m-%d %H:%M:%S UTC')} {expiry_status}")
            
            # Variations (audio URLs and IDs)
            variations = song.get('variations', [])
            primary_index = song.get('primary_variation_index', 0)
            
            if variations:
                print(f"\n🎵 Variations:    {len(variations)} variation(s)")
                print(f"Primary:        Variation {primary_index}")
                
                for var in variations:
                    var_index = var.get('variation_index', 'N/A')
                    audio_id = var.get('audio_id', 'N/A')
                    audio_url = var.get('audio_url', 'N/A')
                    
                    is_primary = "⭐ PRIMARY" if var_index == primary_index else ""
                    print(f"\n  Variation {var_index}: {is_primary}")
                    print(f"    Audio ID:   {audio_id}")
                    print(f"    Audio URL:  {audio_url[:60]}..." if len(audio_url) > 60 else f"    Audio URL:  {audio_url}")
            else:
                # Check for legacy format
                song_url = song.get('song_url')
                audio_id = song.get('audio_id')
                
                if song_url or audio_id:
                    print(f"\n🎵 Legacy Format:")
                    if audio_id:
                        print(f"    Audio ID:   {audio_id}")
                    if song_url:
                        print(f"    Song URL:   {song_url[:60]}..." if len(song_url) > 60 else f"    Song URL:   {song_url}")
                else:
                    print(f"\n🎵 Variations:    None (generation may be in progress)")
            
            # Timestamped lyrics info
            has_timestamps = song.get('has_timestamps', False)
            aligned_words = song.get('aligned_words', [])
            
            if has_timestamps:
                print(f"\n📝 Timestamps:    ✅ Available ({len(aligned_words)} words)")
            else:
                print(f"\n📝 Timestamps:    ❌ Not available")
            
            # Lyrics preview
            lyrics = song.get('lyrics', '')
            if lyrics:
                lyrics_preview = lyrics[:100].replace('\n', ' ')
                print(f"\n📄 Lyrics:        {lyrics_preview}..." if len(lyrics) > 100 else f"\n📄 Lyrics:        {lyrics_preview}")
                print(f"    Length:       {len(lyrics)} characters")
            
            print("-" * 80)
        
        # Summary
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        
        total_songs = len(songs)
        completed_songs = sum(1 for s in songs if s.get('status') == 'completed')
        failed_songs = sum(1 for s in songs if s.get('status') == 'failed')
        in_progress = sum(1 for s in songs if s.get('status') in ['queued', 'processing'])
        
        # Count variations
        total_variations = sum(len(s.get('variations', [])) for s in songs)
        songs_with_timestamps = sum(1 for s in songs if s.get('has_timestamps', False))
        
        print(f"Total Songs:           {total_songs}")
        print(f"  ✅ Completed:        {completed_songs}")
        print(f"  ⏳ In Progress:      {in_progress}")
        print(f"  ❌ Failed:           {failed_songs}")
        print(f"\nTotal Variations:      {total_variations}")
        print(f"Songs with Timestamps: {songs_with_timestamps}")
        
        print("\n" + "=" * 80)
        
        # Export option
        print("\n💾 Export Data")
        print("-" * 80)
        
        export_data = []
        for song in songs:
            variations = song.get('variations', [])
            for var in variations:
                export_data.append({
                    'task_id': song.get('task_id'),
                    'variation_index': var.get('variation_index'),
                    'audio_id': var.get('audio_id'),
                    'audio_url': var.get('audio_url'),
                    'status': song.get('status'),
                    'has_timestamps': song.get('has_timestamps', False),
                })
        
        if export_data:
            print(f"\nTask IDs and Audio IDs (CSV format):")
            print("task_id,variation_index,audio_id,status,has_timestamps")
            for item in export_data:
                print(f"{item['task_id']},{item['variation_index']},{item['audio_id']},{item['status']},{item['has_timestamps']}")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error retrieving songs: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(retrieve_all_songs())
