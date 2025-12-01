#!/usr/bin/env python3
"""
Script to sync song status with Suno API and retrieve all taskIds and audioIds.

This script:
1. Queries all songs from Firestore
2. For incomplete songs, fetches current status from Suno API
3. Updates Firestore with latest data
4. Displays all songs with their complete information
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
from app.services.suno_client import SunoClient, SunoAPIError
from app.services.song_storage import update_task_status


async def sync_and_retrieve_songs():
    """Sync songs with Suno API and retrieve all data."""
    
    print("=" * 80)
    print("SYNCING AND RETRIEVING ALL SONGS")
    print("=" * 80)
    print()
    
    try:
        # Initialize Firebase
        initialize_firebase()
        firestore_client = get_firestore_client()
        
        # Get Suno API credentials
        suno_api_key = os.getenv("SUNO_API_KEY")
        suno_base_url = os.getenv("SUNO_API_URL", "https://api.sunoapi.org")
        
        if not suno_api_key:
            print("❌ SUNO_API_KEY not found in environment variables")
            return
        
        # Query all songs
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
        
        # Sync incomplete songs with Suno API
        print("🔄 Syncing with Suno API...")
        print("-" * 80)
        
        async with SunoClient(api_key=suno_api_key, base_url=suno_base_url) as suno_client:
            for song in songs:
                task_id = song.get('task_id')
                status = song.get('status')
                
                # Skip if already completed or failed
                if status in ['completed', 'failed']:
                    print(f"⏭️  Skipping {task_id[:16]}... (already {status})")
                    continue
                
                print(f"🔄 Syncing {task_id[:16]}...", end=" ")
                
                try:
                    # Get status from Suno API
                    suno_status = await suno_client.get_task_status(task_id)
                    
                    # Map status
                    status_mapping = {
                        'PENDING': 'queued',
                        'TEXT_SUCCESS': 'processing',
                        'FIRST_SUCCESS': 'processing',
                        'GENERATING': 'processing',
                        'SUCCESS': 'completed',
                        'FAILED': 'failed',
                        'CREATE_TASK_FAILED': 'failed',
                        'GENERATE_AUDIO_FAILED': 'failed',
                        'CALLBACK_EXCEPTION': 'failed',
                        'SENSITIVE_WORD_ERROR': 'failed',
                    }
                    
                    mapped_status = status_mapping.get(suno_status.status, 'queued')
                    
                    # Convert variations to dicts
                    variations_dicts = [
                        {
                            'audio_url': var.audio_url,
                            'audio_id': var.audio_id,
                            'variation_index': var.variation_index
                        }
                        for var in suno_status.variations
                    ] if suno_status.variations else []
                    
                    # Update Firestore
                    await update_task_status(
                        task_id=task_id,
                        status=mapped_status,
                        progress=suno_status.progress,
                        song_url=suno_status.song_url,
                        error=suno_status.error,
                        variations=variations_dicts,
                    )
                    
                    # Update local data
                    song['status'] = mapped_status
                    song['progress'] = suno_status.progress
                    song['variations'] = variations_dicts
                    song['song_url'] = suno_status.song_url
                    song['error'] = suno_status.error
                    
                    print(f"✅ {suno_status.status} ({len(variations_dicts)} variations)")
                    
                except SunoAPIError as e:
                    print(f"⚠️  API Error: {e}")
                except Exception as e:
                    print(f"❌ Error: {e}")
        
        print()
        print("=" * 80)
        print("ALL SONGS WITH COMPLETE DATA")
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
                    print(f"\n🎵 Variations:    None (generation may be in progress or failed)")
            
            # Error message if failed
            error = song.get('error')
            if error:
                print(f"\n❌ Error:         {error}")
            
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
        print("\n💾 EXPORT DATA (CSV FORMAT)")
        print("-" * 80)
        print("\nCompleted Songs with Audio IDs:")
        print("task_id,variation_index,audio_id,audio_url,status")
        
        export_count = 0
        for song in songs:
            if song.get('status') == 'completed':
                variations = song.get('variations', [])
                for var in variations:
                    audio_id = var.get('audio_id', '')
                    audio_url = var.get('audio_url', '')
                    if audio_id:
                        print(f"{song.get('task_id')},{var.get('variation_index')},{audio_id},{audio_url},{song.get('status')}")
                        export_count += 1
        
        if export_count == 0:
            print("(No completed songs with audio IDs found)")
        
        print("\n" + "=" * 80)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(sync_and_retrieve_songs())
