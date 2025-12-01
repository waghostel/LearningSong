"""Property-based tests for dual song selection functionality.

This module contains property-based tests using Hypothesis to verify
correctness properties of the dual song selection feature.

**Feature: dual-song-selection, Property 1: Dual song extraction completeness**
**Validates: Requirements 1.1, 7.1**
"""

import pytest
from datetime import timedelta
from hypothesis import given, settings, strategies as st, HealthCheck
from unittest.mock import AsyncMock, MagicMock

from app.services.suno_client import (
    SunoClient,
    SunoStatus,
    SongVariation,
)


# ============================================================================
# Strategies for generating test data
# ============================================================================

# Strategy for generating valid task IDs
task_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="-_"),
    min_size=1,
    max_size=64,
).filter(lambda x: len(x.strip()) > 0)

# Strategy for generating valid audio URLs
url_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters=":/.-_"),
    min_size=10,
    max_size=200,
).map(lambda x: f"https://example.com/{x}.mp3")

# Strategy for generating valid audio IDs
audio_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), whitelist_characters="-_"),
    min_size=1,
    max_size=64,
).filter(lambda x: len(x.strip()) > 0)


# Strategy for generating a single track in sunoData
@st.composite
def suno_track_strategy(draw):
    """Generate a valid Suno API track object."""
    audio_url = draw(url_strategy)
    audio_id = draw(audio_id_strategy)
    
    return {
        "audioUrl": audio_url,
        "id": audio_id,
        "title": "Test Song",
        "duration": 180,
    }


# Strategy for generating Suno API response with 1 or 2 tracks
@st.composite
def suno_response_strategy(draw):
    """Generate a valid Suno API response with sunoData array."""
    num_tracks = draw(st.integers(min_value=1, max_value=2))
    tracks = [draw(suno_track_strategy()) for _ in range(num_tracks)]
    
    return {
        "code": 200,
        "msg": "success",
        "data": {
            "taskId": draw(task_id_strategy),
            "status": "SUCCESS",
            "response": {
                "sunoData": tracks
            }
        }
    }


# ============================================================================
# Property Tests
# ============================================================================

class TestDualSongExtraction:
    """
    **Feature: dual-song-selection, Property 1: Dual song extraction completeness**
    **Validates: Requirements 1.1, 7.1**
    
    For any valid Suno API response containing a sunoData array, the system should
    extract all available song variations (up to 2) with their audio URLs and audio IDs.
    """

    @given(response=suno_response_strategy())
    @settings(max_examples=100, suppress_health_check=[HealthCheck.too_slow])
    @pytest.mark.asyncio
    async def test_extracts_all_variations_from_suno_response(self, response: dict):
        """
        Property: For any Suno API response with sunoData, all variations should be extracted.
        
        This test verifies that:
        1. The number of extracted variations matches the number in sunoData (up to 2)
        2. Each variation has the correct audio_url, audio_id, and variation_index
        3. Variation indices are sequential starting from 0
        """
        # Arrange
        mock_http_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = response
        mock_response.raise_for_status = MagicMock()
        
        mock_http_client.get = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        task_id = response["data"]["taskId"]
        expected_tracks = response["data"]["response"]["sunoData"]
        
        # Act
        result = await client.get_task_status(task_id)
        
        # Assert
        assert isinstance(result, SunoStatus)
        assert result.status == "SUCCESS"
        
        # Verify all variations were extracted
        assert len(result.variations) == len(expected_tracks)
        
        # Verify each variation has correct data
        for idx, (variation, expected_track) in enumerate(zip(result.variations, expected_tracks)):
            assert isinstance(variation, SongVariation)
            assert variation.audio_url == expected_track["audioUrl"]
            assert variation.audio_id == expected_track["id"]
            assert variation.variation_index == idx
        
        # Verify backward compatibility fields
        if result.variations:
            assert result.song_url == result.variations[0].audio_url
            assert result.audio_id == result.variations[0].audio_id


class TestVariationIndexValidation:
    """
    Test that variation_index validation works correctly.
    """

    @given(
        audio_url=url_strategy,
        audio_id=audio_id_strategy,
        variation_index=st.integers(min_value=0, max_value=1),
    )
    @settings(max_examples=100)
    def test_valid_variation_indices_accepted(
        self,
        audio_url: str,
        audio_id: str,
        variation_index: int,
    ):
        """
        Property: For any variation_index in [0, 1], SongVariation should be created successfully.
        """
        variation = SongVariation(
            audio_url=audio_url,
            audio_id=audio_id,
            variation_index=variation_index,
        )
        
        assert variation.audio_url == audio_url
        assert variation.audio_id == audio_id
        assert variation.variation_index == variation_index

    @given(
        audio_url=url_strategy,
        audio_id=audio_id_strategy,
        variation_index=st.integers().filter(lambda x: x not in (0, 1)),
    )
    @settings(max_examples=100)
    def test_invalid_variation_indices_rejected(
        self,
        audio_url: str,
        audio_id: str,
        variation_index: int,
    ):
        """
        Property: For any variation_index not in [0, 1], SongVariation creation should fail.
        """
        with pytest.raises(ValueError, match="variation_index must be 0 or 1"):
            SongVariation(
                audio_url=audio_url,
                audio_id=audio_id,
                variation_index=variation_index,
            )


class TestMalformedVariationHandling:
    """
    Test that malformed variation data is handled gracefully.
    """

    @pytest.mark.asyncio
    async def test_skips_variations_without_audio_url(self):
        """
        Test that variations missing audioUrl are skipped with a warning.
        """
        response = {
            "code": 200,
            "msg": "success",
            "data": {
                "taskId": "test-task",
                "status": "SUCCESS",
                "response": {
                    "sunoData": [
                        {"id": "audio-1"},  # Missing audioUrl
                        {"audioUrl": "https://example.com/song2.mp3", "id": "audio-2"},
                    ]
                }
            }
        }
        
        mock_http_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = response
        mock_response.raise_for_status = MagicMock()
        
        mock_http_client.get = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        result = await client.get_task_status("test-task")
        
        # Should only extract the valid variation
        assert len(result.variations) == 1
        assert result.variations[0].audio_url == "https://example.com/song2.mp3"
        assert result.variations[0].audio_id == "audio-2"
        # Note: variation_index should be 1 because it's the second item in the array
        assert result.variations[0].variation_index == 1

    @pytest.mark.asyncio
    async def test_skips_variations_without_audio_id(self):
        """
        Test that variations missing id are skipped with a warning.
        """
        response = {
            "code": 200,
            "msg": "success",
            "data": {
                "taskId": "test-task",
                "status": "SUCCESS",
                "response": {
                    "sunoData": [
                        {"audioUrl": "https://example.com/song1.mp3", "id": "audio-1"},
                        {"audioUrl": "https://example.com/song2.mp3"},  # Missing id
                    ]
                }
            }
        }
        
        mock_http_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = response
        mock_response.raise_for_status = MagicMock()
        
        mock_http_client.get = AsyncMock(return_value=mock_response)
        mock_http_client.is_closed = False
        
        client = SunoClient(api_key="test-api-key")
        client._client = mock_http_client
        
        result = await client.get_task_status("test-task")
        
        # Should only extract the valid variation
        assert len(result.variations) == 1
        assert result.variations[0].audio_url == "https://example.com/song1.mp3"
        assert result.variations[0].audio_id == "audio-1"
        assert result.variations[0].variation_index == 0



# ============================================================================
# Property Tests for Variation Storage
# ============================================================================

class TestVariationStorage:
    """
    **Feature: dual-song-selection, Property 2: Variation storage completeness**
    **Validates: Requirements 1.2, 7.3**
    
    For any set of song variations extracted from the API, all variations should be
    stored in the database with their audio_url, audio_id, and variation_index fields populated.
    """

    @given(
        variations=st.lists(
            st.builds(
                dict,
                audio_url=url_strategy,
                audio_id=audio_id_strategy,
                variation_index=st.integers(min_value=0, max_value=1),
            ),
            min_size=1,
            max_size=2,
        )
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_all_variations_stored_with_complete_data(self, variations: list[dict]):
        """
        Property: For any set of variations, all should be stored with complete data.
        
        This test verifies that:
        1. All variations are stored in the database
        2. Each variation has audio_url, audio_id, and variation_index
        3. The stored data matches the input data
        """
        from app.services.song_storage import store_song_task, get_task_from_firestore
        from app.models.songs import GenerateSongRequest, MusicStyle
        from unittest.mock import MagicMock, patch
        
        # Arrange
        task_id = "test-task-" + str(hash(str(variations)))[:16]
        user_id = "test-user"
        
        request = GenerateSongRequest(
            lyrics="Test lyrics for property test. " * 10,  # Make it long enough
            style=MusicStyle.POP,
            content_hash="test-hash",
        )
        
        # Mock Firestore client
        mock_firestore = MagicMock()
        mock_collection = MagicMock()
        mock_doc_ref = MagicMock()
        
        mock_firestore.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_doc_ref
        
        stored_data = {}
        
        def mock_set(data):
            stored_data.update(data)
        
        mock_doc_ref.set = mock_set
        
        with patch('app.services.song_storage.get_firestore_client', return_value=mock_firestore):
            # Act
            result = await store_song_task(
                user_id=user_id,
                task_id=task_id,
                request=request,
                variations=variations,
            )
        
        # Assert
        assert "variations" in stored_data
        assert len(stored_data["variations"]) == len(variations)
        
        # Verify each variation has complete data
        for stored_var, original_var in zip(stored_data["variations"], variations):
            assert "audio_url" in stored_var
            assert "audio_id" in stored_var
            assert "variation_index" in stored_var
            assert stored_var["audio_url"] == original_var["audio_url"]
            assert stored_var["audio_id"] == original_var["audio_id"]
            assert stored_var["variation_index"] == original_var["variation_index"]


class TestDefaultPrimaryVariation:
    """
    **Feature: dual-song-selection, Property 3: Default primary variation**
    **Validates: Requirements 1.3**
    
    For any newly completed song generation, the primary_variation_index should be set to 0.
    """

    @given(
        variations=st.lists(
            st.builds(
                dict,
                audio_url=url_strategy,
                audio_id=audio_id_strategy,
                variation_index=st.integers(min_value=0, max_value=1),
            ),
            min_size=1,
            max_size=2,
        )
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_default_primary_variation_is_zero(self, variations: list[dict]):
        """
        Property: For any new song, primary_variation_index should default to 0.
        """
        from app.services.song_storage import store_song_task
        from app.models.songs import GenerateSongRequest, MusicStyle
        from unittest.mock import MagicMock, patch
        
        # Arrange
        task_id = "test-task-" + str(hash(str(variations)))[:16]
        user_id = "test-user"
        
        request = GenerateSongRequest(
            lyrics="Test lyrics for property test. " * 10,
            style=MusicStyle.POP,
            content_hash="test-hash",
        )
        
        # Mock Firestore client
        mock_firestore = MagicMock()
        mock_collection = MagicMock()
        mock_doc_ref = MagicMock()
        
        mock_firestore.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_doc_ref
        
        stored_data = {}
        
        def mock_set(data):
            stored_data.update(data)
        
        mock_doc_ref.set = mock_set
        
        with patch('app.services.song_storage.get_firestore_client', return_value=mock_firestore):
            # Act
            result = await store_song_task(
                user_id=user_id,
                task_id=task_id,
                request=request,
                variations=variations,
            )
        
        # Assert
        assert "primary_variation_index" in stored_data
        assert stored_data["primary_variation_index"] == 0


class TestVariationOrderPreservation:
    """
    **Feature: dual-song-selection, Property 4: Variation order preservation**
    **Validates: Requirements 1.4**
    
    For any stored song variations, the variation_index field should match the array position.
    """

    @given(
        num_variations=st.integers(min_value=1, max_value=2)
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_variation_index_matches_array_position(self, num_variations: int):
        """
        Property: For any stored variations, variation_index should match array position.
        """
        from app.services.song_storage import store_song_task
        from app.models.songs import GenerateSongRequest, MusicStyle
        from unittest.mock import MagicMock, patch
        
        # Arrange
        variations = [
            {
                "audio_url": f"https://example.com/song{i}.mp3",
                "audio_id": f"audio-{i}",
                "variation_index": i,
            }
            for i in range(num_variations)
        ]
        
        task_id = f"test-task-{num_variations}"
        user_id = "test-user"
        
        request = GenerateSongRequest(
            lyrics="Test lyrics for property test. " * 10,
            style=MusicStyle.POP,
            content_hash="test-hash",
        )
        
        # Mock Firestore client
        mock_firestore = MagicMock()
        mock_collection = MagicMock()
        mock_doc_ref = MagicMock()
        
        mock_firestore.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_doc_ref
        
        stored_data = {}
        
        def mock_set(data):
            stored_data.update(data)
        
        mock_doc_ref.set = mock_set
        
        with patch('app.services.song_storage.get_firestore_client', return_value=mock_firestore):
            # Act
            result = await store_song_task(
                user_id=user_id,
                task_id=task_id,
                request=request,
                variations=variations,
            )
        
        # Assert
        assert "variations" in stored_data
        for i, variation in enumerate(stored_data["variations"]):
            assert variation["variation_index"] == i


class TestVariationDataPreservation:
    """
    **Feature: dual-song-selection, Property 13: Variation data preservation**
    **Validates: Requirements 4.3**
    
    For any update to the primary_variation_index, all variation records in the
    variations array should remain unchanged in the database.
    """

    @given(
        new_index=st.integers(min_value=0, max_value=1)
    )
    @settings(max_examples=100)
    @pytest.mark.asyncio
    async def test_updating_primary_preserves_variations(self, new_index: int):
        """
        Property: For any primary index update, variation data should remain unchanged.
        """
        from app.services.song_storage import update_primary_variation
        from unittest.mock import MagicMock, patch
        
        # Arrange
        task_id = f"test-task-{new_index}"
        
        # Mock Firestore client
        mock_firestore = MagicMock()
        mock_collection = MagicMock()
        mock_doc_ref = MagicMock()
        
        mock_firestore.collection.return_value = mock_collection
        mock_collection.document.return_value = mock_doc_ref
        
        updated_fields = {}
        
        def mock_update(data):
            updated_fields.update(data)
        
        mock_doc_ref.update = mock_update
        
        with patch('app.services.song_storage.get_firestore_client', return_value=mock_firestore):
            # Act
            result = await update_primary_variation(
                task_id=task_id,
                variation_index=new_index,
            )
        
        # Assert
        assert result is True
        assert "primary_variation_index" in updated_fields
        assert updated_fields["primary_variation_index"] == new_index
        # Verify that variations field is NOT in the update
        assert "variations" not in updated_fields



# ============================================================================
# Property Tests for API Response Format
# ============================================================================

class TestAPIResponseFormat:
    """
    **Feature: dual-song-selection, Property 20: API response format completeness**
    **Validates: Requirements 7.2, 7.4**
    
    For any song generation status response returned to the frontend, the response should
    include a variations array containing all available song variations with their audio URLs
    and audio IDs.
    """

    @given(
        variations=st.lists(
            st.builds(
                dict,
                audio_url=url_strategy,
                audio_id=audio_id_strategy,
                variation_index=st.integers(min_value=0, max_value=1),
            ),
            min_size=1,
            max_size=2,
        )
    )
    @settings(max_examples=100)
    def test_song_status_update_includes_variations_array(self, variations: list[dict]):
        """
        Property: For any SongStatusUpdate, variations array should contain all variations.
        
        This test verifies that:
        1. The variations field is present in the response
        2. All variations have audio_url, audio_id, and variation_index
        3. The variations array matches the input data
        """
        from app.models.songs import SongStatusUpdate, GenerationStatus, SongVariation
        
        # Arrange - Convert dict variations to SongVariation models
        variation_models = [
            SongVariation(
                audio_url=var["audio_url"],
                audio_id=var["audio_id"],
                variation_index=var["variation_index"],
            )
            for var in variations
        ]
        
        # Act - Create SongStatusUpdate with variations
        status_update = SongStatusUpdate(
            task_id="test-task",
            status=GenerationStatus.COMPLETED,
            progress=100,
            song_url=variations[0]["audio_url"] if variations else None,
            variations=variation_models,
        )
        
        # Assert
        assert hasattr(status_update, "variations")
        assert isinstance(status_update.variations, list)
        assert len(status_update.variations) == len(variations)
        
        # Verify each variation has complete data
        for response_var, original_var in zip(status_update.variations, variations):
            assert isinstance(response_var, SongVariation)
            assert response_var.audio_url == original_var["audio_url"]
            assert response_var.audio_id == original_var["audio_id"]
            assert response_var.variation_index == original_var["variation_index"]

    @given(
        variations=st.lists(
            st.builds(
                dict,
                audio_url=url_strategy,
                audio_id=audio_id_strategy,
                variation_index=st.integers(min_value=0, max_value=1),
            ),
            min_size=1,
            max_size=2,
        )
    )
    @settings(max_examples=100)
    def test_song_details_includes_variations_and_primary_index(self, variations: list[dict]):
        """
        Property: For any SongDetails, variations array and primary_variation_index should be present.
        
        This test verifies that:
        1. The variations field is present in the response
        2. The primary_variation_index field is present
        3. All variations have complete data
        """
        from app.models.songs import SongDetails, MusicStyle, SongVariation
        from datetime import datetime, timezone
        
        # Arrange - Convert dict variations to SongVariation models
        variation_models = [
            SongVariation(
                audio_url=var["audio_url"],
                audio_id=var["audio_id"],
                variation_index=var["variation_index"],
            )
            for var in variations
        ]
        
        # Act - Create SongDetails with variations
        song_details = SongDetails(
            song_id="test-song",
            song_url=variations[0]["audio_url"],
            variations=variation_models,
            primary_variation_index=0,
            lyrics="Test lyrics",
            style=MusicStyle.POP,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc),
            is_owner=True,
        )
        
        # Assert
        assert hasattr(song_details, "variations")
        assert hasattr(song_details, "primary_variation_index")
        assert isinstance(song_details.variations, list)
        assert isinstance(song_details.primary_variation_index, int)
        assert len(song_details.variations) == len(variations)
        assert song_details.primary_variation_index in (0, 1)
        
        # Verify each variation has complete data
        for response_var, original_var in zip(song_details.variations, variations):
            assert isinstance(response_var, SongVariation)
            assert response_var.audio_url == original_var["audio_url"]
            assert response_var.audio_id == original_var["audio_id"]
            assert response_var.variation_index == original_var["variation_index"]

    @pytest.mark.asyncio
    async def test_get_song_status_endpoint_returns_variations(self):
        """
        Integration test: Verify that GET /api/songs/{task_id} returns variations array.
        
        This test verifies the complete flow from API endpoint to response model.
        """
        from app.api.songs import get_song_status
        from app.models.songs import GenerationStatus, SongVariation
        from unittest.mock import AsyncMock, patch
        
        # Arrange
        task_id = "test-task-integration"
        user_id = "test-user"
        
        # Mock Firestore data with variations
        mock_task_data = {
            "user_id": user_id,
            "task_id": task_id,
            "status": GenerationStatus.COMPLETED.value,
            "progress": 100,
            "song_url": "https://example.com/song1.mp3",
            "variations": [
                {
                    "audio_url": "https://example.com/song1.mp3",
                    "audio_id": "audio-1",
                    "variation_index": 0,
                },
                {
                    "audio_url": "https://example.com/song2.mp3",
                    "audio_id": "audio-2",
                    "variation_index": 1,
                },
            ],
        }
        
        with patch('app.api.songs.get_task_from_firestore', new=AsyncMock(return_value=mock_task_data)):
            # Act
            result = await get_song_status(task_id=task_id, user_id=user_id)
        
        # Assert
        assert result.task_id == task_id
        assert result.status == GenerationStatus.COMPLETED
        assert hasattr(result, "variations")
        assert len(result.variations) == 2
        
        # Verify variations have complete data
        assert result.variations[0].audio_url == "https://example.com/song1.mp3"
        assert result.variations[0].audio_id == "audio-1"
        assert result.variations[0].variation_index == 0
        
        assert result.variations[1].audio_url == "https://example.com/song2.mp3"
        assert result.variations[1].audio_id == "audio-2"
        assert result.variations[1].variation_index == 1

    @pytest.mark.asyncio
    async def test_get_song_details_endpoint_returns_variations_and_primary_index(self):
        """
        Integration test: Verify that GET /api/songs/{song_id}/details returns variations and primary_variation_index.
        
        This test verifies the complete flow from API endpoint to response model.
        """
        from app.api.songs import get_song_details
        from app.models.songs import MusicStyle
        from unittest.mock import AsyncMock, patch
        from datetime import datetime, timezone
        
        # Arrange
        song_id = "test-song-integration"
        user_id = "test-user"
        
        # Mock Firestore data with variations
        mock_song_data = {
            "user_id": user_id,
            "task_id": song_id,
            "song_url": "https://example.com/song1.mp3",
            "variations": [
                {
                    "audio_url": "https://example.com/song1.mp3",
                    "audio_id": "audio-1",
                    "variation_index": 0,
                },
                {
                    "audio_url": "https://example.com/song2.mp3",
                    "audio_id": "audio-2",
                    "variation_index": 1,
                },
            ],
            "primary_variation_index": 1,
            "lyrics": "Test lyrics",
            "style": "pop",
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=48),
        }
        
        with patch('app.api.songs.get_task_from_firestore', new=AsyncMock(return_value=mock_song_data)):
            # Act
            result = await get_song_details(song_id=song_id, user_id=user_id)
        
        # Assert
        assert result.song_id == song_id
        assert hasattr(result, "variations")
        assert hasattr(result, "primary_variation_index")
        assert len(result.variations) == 2
        assert result.primary_variation_index == 1
        
        # Verify variations have complete data
        assert result.variations[0].audio_url == "https://example.com/song1.mp3"
        assert result.variations[0].audio_id == "audio-1"
        assert result.variations[0].variation_index == 0
        
        assert result.variations[1].audio_url == "https://example.com/song2.mp3"
        assert result.variations[1].audio_id == "audio-2"
        assert result.variations[1].variation_index == 1
