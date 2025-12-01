#!/usr/bin/env python3
"""
Download audio files for songs with timestamped lyrics.

This script downloads the MP3 audio files from the URLs stored in the
timestamped lyrics JSON files and saves them locally.
"""

import asyncio
import json
import sys
from pathlib import Path
import httpx


async def download_audio_file(url: str, output_path: Path, task_id: str, var_index: int):
    """Download an audio file from URL."""
    
    print(f"📥 Downloading variation {var_index} of {task_id[:16]}...")
    print(f"   URL: {url[:60]}...")
    
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            # Save the file
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            file_size_mb = len(response.content) / (1024 * 1024)
            print(f"   ✅ Downloaded: {output_path.name} ({file_size_mb:.2f} MB)")
            return True
            
    except httpx.TimeoutException:
        print(f"   ❌ Timeout downloading audio file")
        return False
    except httpx.HTTPStatusError as e:
        print(f"   ❌ HTTP error {e.response.status_code}")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False


async def download_all_audio_files():
    """Download all audio files from timestamped lyrics."""
    
    print("=" * 80)
    print("DOWNLOADING AUDIO FILES")
    print("=" * 80)
    print()
    
    # Get timestamped lyrics directory
    lyrics_dir = Path(__file__).parent.parent / "report" / "timestamped_lyrics"
    
    if not lyrics_dir.exists():
        print("❌ Timestamped lyrics directory not found")
        return
    
    # Create audio directory
    audio_dir = lyrics_dir / "audio"
    audio_dir.mkdir(exist_ok=True)
    
    print(f"📁 Output directory: {audio_dir}\n")
    
    # Find all timestamped lyrics files
    json_files = list(lyrics_dir.glob("*_var*_timestamps.json"))
    
    if not json_files:
        print("❌ No timestamped lyrics files found")
        return
    
    print(f"✅ Found {len(json_files)} timestamped lyrics file(s)\n")
    
    downloaded = 0
    failed = 0
    
    for json_file in sorted(json_files):
        print("-" * 80)
        
        # Load the JSON file
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        task_id = data['task_id']
        var_index = data['variation_index']
        audio_url = data['audio_url']
        audio_id = data['audio_id']
        
        # Create output filename
        output_filename = f"{task_id}_var{var_index}_{audio_id}.mp3"
        output_path = audio_dir / output_filename
        
        # Check if already downloaded
        if output_path.exists():
            file_size_mb = output_path.stat().st_size / (1024 * 1024)
            print(f"⏭️  Already exists: {output_filename} ({file_size_mb:.2f} MB)")
            downloaded += 1
            continue
        
        # Download the file
        success = await download_audio_file(audio_url, output_path, task_id, var_index)
        
        if success:
            downloaded += 1
        else:
            failed += 1
        
        print()
    
    # Also download the 4th audio (the one that timed out on lyrics)
    print("-" * 80)
    print("📥 Downloading 4th audio file (timeout on lyrics fetch)...")
    
    # This is Song #2, Variation 1
    task_id_4 = "fe6786e7117c2f2ca67f6dad2990a22a"
    audio_id_4 = "7bd3112f-07dc-4138-8e61-54b360e12462"
    audio_url_4 = "https://musicfile.api.box/N2JkMzExMmYtMDdkYy00MTM4LThlNjEtNTRiMzYwZTEyNDYy.mp3"
    
    output_filename_4 = f"{task_id_4}_var1_{audio_id_4}.mp3"
    output_path_4 = audio_dir / output_filename_4
    
    if output_path_4.exists():
        file_size_mb = output_path_4.stat().st_size / (1024 * 1024)
        print(f"⏭️  Already exists: {output_filename_4} ({file_size_mb:.2f} MB)")
        downloaded += 1
    else:
        success = await download_audio_file(audio_url_4, output_path_4, task_id_4, 1)
        if success:
            downloaded += 1
            
            # Create a placeholder JSON for this one (no timestamps)
            placeholder_json = audio_dir.parent / f"{task_id_4}_var1_audio_only.json"
            with open(placeholder_json, 'w') as f:
                json.dump({
                    'task_id': task_id_4,
                    'variation_index': 1,
                    'audio_id': audio_id_4,
                    'audio_url': audio_url_4,
                    'note': 'Timestamped lyrics fetch timed out, but audio file is available',
                    'has_timestamps': False
                }, f, indent=2)
            print(f"   📝 Created placeholder JSON: {placeholder_json.name}")
        else:
            failed += 1
    
    print()
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    print(f"Total Files:        {len(json_files) + 1}")
    print(f"✅ Downloaded:      {downloaded}")
    print(f"❌ Failed:          {failed}")
    print(f"\n📁 Audio files saved to: {audio_dir}")
    print("=" * 80)
    
    # List all downloaded files
    if downloaded > 0:
        print("\n📀 Downloaded Audio Files:")
        print("-" * 80)
        
        audio_files = sorted(audio_dir.glob("*.mp3"))
        for audio_file in audio_files:
            file_size_mb = audio_file.stat().st_size / (1024 * 1024)
            print(f"   {audio_file.name} ({file_size_mb:.2f} MB)")
        
        print()
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(download_all_audio_files())
