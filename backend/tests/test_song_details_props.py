"""Property-based tests for song details models.

This module contains property-based tests using Hypothesis to verify
correctness properties of the song details models.

Requirements: 8.1, 8.4
"""

from datetime import datetime, timedelta, timezone

import pytest
from hypothesis import given, settings, strategies as st, HealthCheck

from app.models.songs import MusicStyle, SongDetails, ShareLinkResponse


# ============================================================================
# Strategies for generating test data
# ============================================================================

# Strategy for generating valid song IDs
song_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="-_"),
    min_size=1,
    max_size=64,
).filter(lambda x: len(x.strip()) > 0)

# Strategy for generating valid URLs (simplified for performance)
url_strategy = st.builds(
    lambda domain, path: f"https://{domain}.com/{path}.mp3",
    domain=st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789", min_size=3, max_size=10),
    path=st.text(alphabet="abcdefghijklmnopqrstuvwxyz0123456789-_", min_size=5, max_size=20),
)

# Strategy for generating valid lyrics (50-3000 chars)
lyrics_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N", "P", "Z")),
    min_size=50,
    max_size=500,  # Keep smaller for faster tests
).filter(lambda x: len(x.strip()) >= 50)

# Strategy for generating music styles
style_strategy = st.sampled_from(list(MusicStyle))

# Strategy for generating datetime values
datetime_strategy = st.datetimes(
    min_value=datetime(2020, 1, 1),
    max_value=datetime(2030, 12, 31),
    timezones=st.just(timezone.utc),
)

# Strategy for generating share tokens
share_token_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N")),
    min_size=16,
    max_size=64,
).filter(lambda x: len(x.strip()) > 0)


# ============================================================================
# Property Tests
# ============================================================================

class TestSongSerializationRoundTrip:
    """
    **Feature: page-c-song-playback, Property 6: Song Serialization Round Trip**
    **Validates: Requirements 8.4**
    
    For any valid SongDetails object, serializing to JSON and deserializing
    back SHALL produce an equivalent object with all fields preserved.
    """

    @given(
        song_id=song_id_strategy,
        song_url=url_strategy,
        lyrics=lyrics_strategy,
        style=style_strategy,
        created_at=datetime_strategy,
        expires_at=datetime_strategy,
        is_owner=st.booleans(),
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_song_details_round_trip(
        self,
        song_id: str,
        song_url: str,
        lyrics: str,
        style: MusicStyle,
        created_at: datetime,
        expires_at: datetime,
        is_owner: bool,
    ):
        """
        **Feature: page-c-song-playback, Property 6: Song Serialization Round Trip**
        **Validates: Requirements 8.4**
        
        Test that SongDetails can be serialized to JSON and deserialized back
        without losing any data.
        """
        # Create original SongDetails object
        original = SongDetails(
            song_id=song_id,
            song_url=song_url,
            lyrics=lyrics,
            style=style,
            created_at=created_at,
            expires_at=expires_at,
            is_owner=is_owner,
        )
        
        # Serialize to JSON (dict)
        json_data = original.model_dump(mode="json")
        
        # Deserialize back to SongDetails
        restored = SongDetails.model_validate(json_data)
        
        # Verify all fields are preserved
        assert restored.song_id == original.song_id
        assert restored.song_url == original.song_url
        assert restored.lyrics == original.lyrics
        assert restored.style == original.style
        assert restored.is_owner == original.is_owner
        
        # For datetime fields, compare ISO strings since JSON serialization
        # may lose microsecond precision
        assert restored.created_at.isoformat() == original.created_at.isoformat()
        assert restored.expires_at.isoformat() == original.expires_at.isoformat()

    @given(
        share_url=url_strategy,
        share_token=share_token_strategy,
        expires_at=datetime_strategy,
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_share_link_response_round_trip(
        self,
        share_url: str,
        share_token: str,
        expires_at: datetime,
    ):
        """
        **Feature: page-c-song-playback, Property 6: Song Serialization Round Trip**
        **Validates: Requirements 8.4**
        
        Test that ShareLinkResponse can be serialized to JSON and deserialized
        back without losing any data.
        """
        # Create original ShareLinkResponse object
        original = ShareLinkResponse(
            share_url=share_url,
            share_token=share_token,
            expires_at=expires_at,
        )
        
        # Serialize to JSON (dict)
        json_data = original.model_dump(mode="json")
        
        # Deserialize back to ShareLinkResponse
        restored = ShareLinkResponse.model_validate(json_data)
        
        # Verify all fields are preserved
        assert restored.share_url == original.share_url
        assert restored.share_token == original.share_token
        assert restored.expires_at.isoformat() == original.expires_at.isoformat()



class TestSongDetailsAPIResponseCompleteness:
    """
    **Feature: page-c-song-playback, Property 5: Song Details API Response Completeness**
    **Validates: Requirements 8.1**
    
    For any valid song in the database, the GET /api/songs/{song_id}/details
    response SHALL contain all required fields: song_id, song_url, lyrics,
    style, created_at, and expires_at.
    """

    @given(
        song_id=song_id_strategy,
        song_url=url_strategy,
        lyrics=lyrics_strategy,
        style=style_strategy,
        created_at=datetime_strategy,
        expires_at=datetime_strategy,
        is_owner=st.booleans(),
    )
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    def test_song_details_contains_all_required_fields(
        self,
        song_id: str,
        song_url: str,
        lyrics: str,
        style: MusicStyle,
        created_at: datetime,
        expires_at: datetime,
        is_owner: bool,
    ):
        """
        **Feature: page-c-song-playback, Property 5: Song Details API Response Completeness**
        **Validates: Requirements 8.1**
        
        Test that SongDetails model always contains all required fields when
        serialized to JSON for API response.
        """
        # Create SongDetails object
        song_details = SongDetails(
            song_id=song_id,
            song_url=song_url,
            lyrics=lyrics,
            style=style,
            created_at=created_at,
            expires_at=expires_at,
            is_owner=is_owner,
        )
        
        # Serialize to JSON (simulating API response)
        json_response = song_details.model_dump(mode="json")
        
        # Verify all required fields are present
        required_fields = [
            "song_id",
            "song_url",
            "lyrics",
            "style",
            "created_at",
            "expires_at",
            "is_owner",
        ]
        
        for field in required_fields:
            assert field in json_response, f"Required field '{field}' missing from response"
            assert json_response[field] is not None, f"Required field '{field}' is None"
        
        # Verify field values match input
        assert json_response["song_id"] == song_id
        assert json_response["song_url"] == song_url
        assert json_response["lyrics"] == lyrics
        assert json_response["style"] == style.value
        assert json_response["is_owner"] == is_owner
        
        # Verify datetime fields are properly formatted ISO strings
        assert isinstance(json_response["created_at"], str)
        assert isinstance(json_response["expires_at"], str)
        
        # Verify datetime strings can be parsed back
        parsed_created = datetime.fromisoformat(json_response["created_at"])
        parsed_expires = datetime.fromisoformat(json_response["expires_at"])
        assert parsed_created is not None
        assert parsed_expires is not None
