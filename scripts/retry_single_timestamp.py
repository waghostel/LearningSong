#!/usr/bin/env python3
"""
Retry fetching timestamped lyrics for a specific song variation.
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

from app.services.suno_client import SunoClient, SunoAPIError


async def retry_fetch_timestamps():
    """Retry fetching timestamped lyrics for Song #2, Variation 1."""
    
    print("=" * 80)
    print("RETRYING TIMESTAMPED LYRICS FETCH")
    print("=" * 80)
    print()
    
    # Song #2, Variation 1 details
    task_id = "fe6786e7117c2f2ca67f6dad2990a22a"
    audio_id = "7bd3112f-07dc-4138-8e61-54b360e12462"
    variation_index = 1
    
    print(f"Task ID:        {task_id}")
    print(f"Audio ID:       {audio_id}")
    print(f"Variation:      {variation_index}")
    print()
    
    # Get Suno API credentials
    suno_api_key = os.getenv("SUNO_API_KEY")
    suno_base_url = os.getenv("SUNO_API_URL", "https://api.sunoapi.org")
    
    if not suno_api_key:
        print("❌ SUNO_API_KEY not found in environment variables")
        return
    
    print("🔄 Attempting to fetch timestamped lyrics...")
    print(f"   Using timeout: 60 seconds")
    print()
    
    try:
        # Increase timeout for this retry
        async with SunoClient(api_key=suno_api_key, base_url=suno_base_url, timeout=60.0) as suno_client:
            timestamped_lyrics = await suno_client.get_timestamped_lyrics(
                task_id=task_id,
                audio_id=audio_id
            )
            
            if timestamped_lyrics is None:
                print("❌ Failed to fetch timestamped lyrics")
                print("   The Suno API returned None (likely not available)")
                return
            
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
            
            print(f"✅ Successfully fetched {len(aligned_words_dicts)} words!")
            print()
            
            # Save to file
            output_dir = Path(__file__).parent.parent / "report" / "timestamped_lyrics"
            output_file = output_dir / f"{task_id}_var{variation_index}_timestamps.json"
            
            with open(output_file, 'w') as f:
                json.dump({
                    'task_id': task_id,
                    'variation_index': variation_index,
                    'audio_id': audio_id,
                    'audio_url': f"https://musicfile.api.box/N2JkMzExMmYtMDdkYy00MTM4LThlNjEtNTRiMzYwZTEyNDYy.mp3",
                    'style': 'electronic',
                    'fetched_at': datetime.now(timezone.utc).isoformat(),
                    'aligned_words': aligned_words_dicts,
                    'waveform_data': timestamped_lyrics.waveform_data,
                    'hoot_cer': timestamped_lyrics.hoot_cer,
                    'is_streamed': timestamped_lyrics.is_streamed
                }, f, indent=2)
            
            print(f"💾 Saved to: {output_file.name}")
            print()
            
            # Delete the placeholder file
            placeholder_file = output_dir / f"{task_id}_var{variation_index}_audio_only.json"
            if placeholder_file.exists():
                placeholder_file.unlink()
                print(f"🗑️  Deleted placeholder: {placeholder_file.name}")
            
            print()
            print("=" * 80)
            print("SUCCESS!")
            print("=" * 80)
            print(f"Total Words:        {len(aligned_words_dicts)}")
            print(f"Waveform Points:    {len(timestamped_lyrics.waveform_data)}")
            print(f"Character Error:    {timestamped_lyrics.hoot_cer}")
            print(f"Is Streamed:        {timestamped_lyrics.is_streamed}")
            print()
            
            # Show first few words
            print("First 10 words:")
            print("-" * 80)
            for i, word in enumerate(aligned_words_dicts[:10]):
                print(f"{i+1:2d}. {word['word']:<20} ({word['startS']:.2f}s - {word['endS']:.2f}s)")
            
            print()
            print("=" * 80)
            
    except asyncio.TimeoutError:
        print("❌ Timeout Error")
        print("   The request took longer than 60 seconds")
        print("   The Suno API may be slow or the data is not available")
    except SunoAPIError as e:
        print(f"❌ Suno API Error: {e}")
        print(f"   Status Code: {e.status_code}")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(retry_fetch_timestamps())
