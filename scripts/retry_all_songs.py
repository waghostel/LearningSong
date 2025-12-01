#!/usr/bin/env python3
"""
Retry fetching all songs that previously failed or were queued.

This script checks all 6 songs and attempts to:
1. Get current status from Suno API
2. Download audio files if completed
3. Fetch timestamped lyrics if available
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
    print(f"✅ Loaded environment from: {env_path}\n")

from app.core.firebase import initialize_firebase, get_firestore_client
from app.services.suno_client import SunoClient, SunoAPIError
from app.services.song_storage import update_task_status
import httpx


# All 6 task IDs
ALL_TASK_IDS = [
    "11ac951c0b6596fc018e9866584d7de7",  # completed
    "fe6786e7117c2f2ca67f6dad2990a22a",  # was failed
    "7b15d64a44a9676ed39e00285080f7e0",  # queued
    "0d438065119ff1cf610a331b051a15b0",  # queued
    "28f199a2a7f6e9dfd3fdbb5aaee6ad02",  # queued
    "0197e0aff1635eb9dab53b8d99aef4de",  # queued
]


async def download_audio(url: str, output_path: Path) -> bool:
    """Download audio file."""
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            return True
    except Exception as e:
        print(f"      ❌ Download failed: {e}")
        return False


async def retry_all_songs():
    """Retry fetching all songs."""
    
    print("=" * 80)
    print("RETRYING ALL SONGS")
    print("=" * 80)
    print()
    
    # Initialize Firebase
    initialize_firebase()
    firestore_client = get_firestore_client()
    
    # Get Suno API credentials
    suno_api_key = os.getenv("SUNO_API_KEY")
    suno_base_url = os.getenv("SUNO_API_URL", "https://api.sunoapi.org")
    
    if not suno_api_key:
        print("❌ SUNO_API_KEY not found")
        return
    
    # Create output directories
    lyrics_dir = Path(__file__).parent.parent / "report" / "timestamped_lyrics"
    audio_dir = lyrics_dir / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    
    results = {
        'total': len(ALL_TASK_IDS),
        'completed': 0,
        'failed': 0,
        'expired': 0,
        'new_audio': 0,
        'new_lyrics': 0
    }
    
    async with SunoClient(api_key=suno_api_key, base_url=suno_base_url, timeout=60.0) as suno_client:
        
        for idx, task_id in enumerate(ALL_TASK_IDS, 1):
            print(f"\n{'=' * 80}")
            print(f"SONG #{idx}: {task_id[:16]}...")
            print(f"{'=' * 80}")
            
            # Get from Firestore
            songs_ref = firestore_client.collection("songs").document(task_id)
            song_doc = songs_ref.get()
            
            if not song_doc.exists:
                print(f"⚠️  Not found in Firestore")
                results['expired'] += 1
                continue
            
            song_data = song_doc.to_dict()
            current_status = song_data.get('status', 'unknown')
            style = song_data.get('style', 'unknown')
            
            print(f"Current DB Status: {current_status}")
            print(f"Style: {style}")
            print()
            
            # Check Suno API status
            print(f"🔄 Checking Suno API...")
            
            try:
                suno_status = await suno_client.get_task_status(task_id)
                print(f"✅ Suno Status: {suno_status.status}")
                print(f"   Progress: {suno_status.progress}%")
                
                if suno_status.status != "SUCCESS":
                    print(f"⏭️  Not completed yet (status: {suno_status.status})")
                    if suno_status.error:
                        print(f"   Error: {suno_status.error}")
                        results['failed'] += 1
                    continue
                
                # Song is completed!
                print(f"\n🎉 Song is COMPLETED on Suno!")
                
                if not suno_status.variations:
                    print(f"⚠️  No variations found")
                    continue
                
                print(f"   Found {len(suno_status.variations)} variation(s)")
                
                # Update Firestore
                variations_dicts = [
                    {
                        'audio_url': var.audio_url,
                        'audio_id': var.audio_id,
                        'variation_index': var.variation_index
                    }
                    for var in suno_status.variations
                ]
                
                await update_task_status(
                    task_id=task_id,
                    status='completed',
                    progress=100,
                    variations=variations_dicts,
                )
                
                results['completed'] += 1
                
                # Process each variation
                for var in suno_status.variations:
                    print(f"\n  📀 Variation {var.variation_index}:")
                    print(f"     Audio ID: {var.audio_id}")
                    
                    # Check if audio already exists
                    audio_filename = f"{task_id}_var{var.variation_index}_{var.audio_id}.mp3"
                    audio_path = audio_dir / audio_filename
                    
                    if not audio_path.exists():
                        print(f"     📥 Downloading audio...", end=" ")
                        if await download_audio(var.audio_url, audio_path):
                            file_size_mb = audio_path.stat().st_size / (1024 * 1024)
                            print(f"✅ {file_size_mb:.2f} MB")
                            results['new_audio'] += 1
                        else:
                            continue
                    else:
                        file_size_mb = audio_path.stat().st_size / (1024 * 1024)
                        print(f"     ⏭️  Audio exists ({file_size_mb:.2f} MB)")
                    
                    # Check if timestamps already exist
                    lyrics_filename = f"{task_id}_var{var.variation_index}_timestamps.json"
                    lyrics_path = lyrics_dir / lyrics_filename
                    
                    if not lyrics_path.exists():
                        print(f"     🎵 Fetching timestamps...", end=" ")
                        
                        try:
                            timestamped_lyrics = await suno_client.get_timestamped_lyrics(
                                task_id=task_id,
                                audio_id=var.audio_id
                            )
                            
                            if timestamped_lyrics is None:
                                print(f"❌ Not available")
                                continue
                            
                            # Convert to dict
                            aligned_words_dicts = [
                                {
                                    'word': word.word,
                                    'startS': word.start_s,
                                    'endS': word.end_s,
                                    'success': word.success,
                                    'palign': word.palign
                                }
                                for word in timestamped_lyrics.aligned_words
                            ]
                            
                            # Save
                            with open(lyrics_path, 'w') as f:
                                json.dump({
                                    'task_id': task_id,
                                    'variation_index': var.variation_index,
                                    'audio_id': var.audio_id,
                                    'audio_url': var.audio_url,
                                    'style': style,
                                    'fetched_at': datetime.now(timezone.utc).isoformat(),
                                    'aligned_words': aligned_words_dicts,
                                    'waveform_data': timestamped_lyrics.waveform_data,
                                    'hoot_cer': timestamped_lyrics.hoot_cer,
                                    'is_streamed': timestamped_lyrics.is_streamed
                                }, f, indent=2)
                            
                            print(f"✅ {len(aligned_words_dicts)} words")
                            results['new_lyrics'] += 1
                            
                        except Exception as e:
                            print(f"❌ Error: {e}")
                    else:
                        # Count words
                        with open(lyrics_path, 'r') as f:
                            data = json.load(f)
                        word_count = len(data.get('aligned_words', []))
                        print(f"     ⏭️  Timestamps exist ({word_count} words)")
                
            except SunoAPIError as e:
                print(f"❌ Suno API Error: {e}")
                if "not found" in str(e).lower() or e.status_code == 404:
                    print(f"   Song expired or deleted from Suno")
                    results['expired'] += 1
                else:
                    results['failed'] += 1
            except Exception as e:
                print(f"❌ Error: {e}")
                results['failed'] += 1
    
    # Summary
    print(f"\n{'=' * 80}")
    print("FINAL SUMMARY")
    print(f"{'=' * 80}\n")
    
    print(f"Total Songs Checked:     {results['total']}")
    print(f"✅ Completed:            {results['completed']}")
    print(f"❌ Failed:               {results['failed']}")
    print(f"⚠️  Expired:              {results['expired']}")
    print()
    print(f"📥 New Audio Files:      {results['new_audio']}")
    print(f"📝 New Lyrics Files:     {results['new_lyrics']}")
    
    print(f"\n{'=' * 80}\n")
    
    # List all files
    audio_files = sorted(audio_dir.glob("*.mp3"))
    lyrics_files = sorted(lyrics_dir.glob("*_var*_timestamps.json"))
    
    print(f"📁 Total Audio Files:    {len(audio_files)}")
    print(f"📁 Total Lyrics Files:   {len(lyrics_files)}")
    
    if results['new_audio'] > 0 or results['new_lyrics'] > 0:
        print(f"\n🎉 New files downloaded! Check report/timestamped_lyrics/")


if __name__ == "__main__":
    asyncio.run(retry_all_songs())
