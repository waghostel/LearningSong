#!/usr/bin/env python3
"""
Script to fetch timestamped lyrics for all songs.

This script:
1. Queries all songs from Firestore
2. For each song, checks Suno API for current status
3. Extracts audio_id(s) from completed songs
4. Fetches timestamped lyrics for each audio_id
5. Saves all timestamped lyrics to files
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


async def fetch_all_timestamped_lyrics():
    """Fetch timestamped lyrics for all completed songs."""
    
    print("=" * 80)
    print("FETCHING TIMESTAMPED LYRICS FOR ALL SONGS")
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
        songs_ref = firestore_client.collection("songs").order_by("created_at", direction="DESCENDING")
        
        songs = []
        for doc in songs_ref.stream():
            song_data = doc.to_dict()
            songs.append(song_data)
        
        if not songs:
            print("❌ No songs found in the database.")
            return
        
        print(f"✅ Found {len(songs)} song(s) in the database\n")
        
        # Create output directory
        output_dir = Path(__file__).parent.parent / "report" / "timestamped_lyrics"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        all_lyrics_data = []
        
        async with SunoClient(api_key=suno_api_key, base_url=suno_base_url) as suno_client:
            
            for idx, song in enumerate(songs, 1):
                task_id = song.get('task_id')
                current_status = song.get('status')
                style = song.get('style')
                
                print(f"\n{'=' * 80}")
                print(f"SONG #{idx}: {task_id[:16]}...")
                print(f"{'=' * 80}")
                print(f"Current DB Status: {current_status}")
                print(f"Style: {style}")
                print()
                
                # Step 1: Get current status from Suno API
                print(f"🔄 Fetching current status from Suno API...")
                
                try:
                    suno_status = await suno_client.get_task_status(task_id)
                    print(f"✅ Suno Status: {suno_status.status}")
                    print(f"   Progress: {suno_status.progress}%")
                    
                    # Check if completed
                    if suno_status.status != "SUCCESS":
                        print(f"⏭️  Skipping - not completed (status: {suno_status.status})")
                        if suno_status.error:
                            print(f"   Error: {suno_status.error}")
                        continue
                    
                    # Step 2: Extract audio_ids from variations
                    if not suno_status.variations:
                        print(f"⚠️  No variations found in Suno response")
                        continue
                    
                    print(f"\n🎵 Found {len(suno_status.variations)} variation(s):")
                    
                    # Update Firestore with variations if needed
                    if current_status != 'completed' or not song.get('variations'):
                        print(f"📝 Updating Firestore with latest data...")
                        
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
                        print(f"✅ Firestore updated")
                    
                    # Step 3: Fetch timestamped lyrics for each variation
                    song_lyrics_data = {
                        'task_id': task_id,
                        'style': style,
                        'status': 'completed',
                        'variations': []
                    }
                    
                    for var in suno_status.variations:
                        print(f"\n  📀 Variation {var.variation_index}:")
                        print(f"     Audio ID: {var.audio_id}")
                        print(f"     Audio URL: {var.audio_url[:60]}...")
                        
                        # Fetch timestamped lyrics
                        print(f"     🎵 Fetching timestamped lyrics...", end=" ")
                        
                        try:
                            timestamped_lyrics = await suno_client.get_timestamped_lyrics(
                                task_id=task_id,
                                audio_id=var.audio_id
                            )
                            
                            if timestamped_lyrics is None:
                                print(f"❌ Failed to fetch")
                                song_lyrics_data['variations'].append({
                                    'variation_index': var.variation_index,
                                    'audio_id': var.audio_id,
                                    'audio_url': var.audio_url,
                                    'has_timestamps': False,
                                    'error': 'Failed to fetch from Suno API'
                                })
                                continue
                            
                            # Convert to dict format
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
                            
                            print(f"✅ Got {len(aligned_words_dicts)} words")
                            
                            # Save to song data
                            variation_data = {
                                'variation_index': var.variation_index,
                                'audio_id': var.audio_id,
                                'audio_url': var.audio_url,
                                'has_timestamps': True,
                                'aligned_words': aligned_words_dicts,
                                'waveform_data': timestamped_lyrics.waveform_data,
                                'hoot_cer': timestamped_lyrics.hoot_cer,
                                'is_streamed': timestamped_lyrics.is_streamed,
                                'word_count': len(aligned_words_dicts)
                            }
                            
                            song_lyrics_data['variations'].append(variation_data)
                            
                            # Save individual file for this variation
                            filename = f"{task_id}_var{var.variation_index}_timestamps.json"
                            filepath = output_dir / filename
                            
                            with open(filepath, 'w') as f:
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
                            
                            print(f"     💾 Saved to: {filename}")
                            
                        except Exception as e:
                            print(f"❌ Error: {e}")
                            song_lyrics_data['variations'].append({
                                'variation_index': var.variation_index,
                                'audio_id': var.audio_id,
                                'audio_url': var.audio_url,
                                'has_timestamps': False,
                                'error': str(e)
                            })
                    
                    if song_lyrics_data['variations']:
                        all_lyrics_data.append(song_lyrics_data)
                    
                except SunoAPIError as e:
                    print(f"❌ Suno API Error: {e}")
                except Exception as e:
                    print(f"❌ Error: {e}")
                    import traceback
                    traceback.print_exc()
        
        # Save combined file
        print(f"\n{'=' * 80}")
        print("SAVING COMBINED RESULTS")
        print(f"{'=' * 80}\n")
        
        combined_file = output_dir / "all_timestamped_lyrics.json"
        with open(combined_file, 'w') as f:
            json.dump({
                'fetched_at': datetime.now(timezone.utc).isoformat(),
                'total_songs': len(all_lyrics_data),
                'total_variations': sum(len(s['variations']) for s in all_lyrics_data),
                'songs': all_lyrics_data
            }, f, indent=2)
        
        print(f"💾 Combined file saved to: {combined_file}")
        
        # Summary
        print(f"\n{'=' * 80}")
        print("SUMMARY")
        print(f"{'=' * 80}\n")
        
        total_songs_processed = len(all_lyrics_data)
        total_variations = sum(len(s['variations']) for s in all_lyrics_data)
        successful_fetches = sum(
            1 for s in all_lyrics_data 
            for v in s['variations'] 
            if v.get('has_timestamps')
        )
        
        print(f"Songs Processed:           {total_songs_processed}")
        print(f"Total Variations:          {total_variations}")
        print(f"Successful Fetches:        {successful_fetches}")
        print(f"\nOutput Directory:          {output_dir}")
        print(f"Individual Files:          {successful_fetches} files")
        print(f"Combined File:             all_timestamped_lyrics.json")
        
        # List all files created
        if successful_fetches > 0:
            print(f"\n📁 Files Created:")
            for song in all_lyrics_data:
                for var in song['variations']:
                    if var.get('has_timestamps'):
                        filename = f"{song['task_id']}_var{var['variation_index']}_timestamps.json"
                        word_count = var.get('word_count', 0)
                        print(f"   - {filename} ({word_count} words)")
        
        print(f"\n{'=' * 80}\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(fetch_all_timestamped_lyrics())
