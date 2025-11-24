"""Tests for Google Search service."""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import HTTPException
import httpx

from app.services.google_search import GoogleSearchService, get_search_service


@pytest.fixture
def mock_env_vars(monkeypatch):
    """Set up mock environment variables for Google Search API."""
    monkeypatch.setenv("GOOGLE_SEARCH_API_KEY", "test_api_key_123")
    monkeypatch.setenv("GOOGLE_SEARCH_ENGINE_ID", "test_engine_id_456")


@pytest.fixture
def search_service(mock_env_vars):
    """Create a GoogleSearchService instance with mocked environment."""
    return GoogleSearchService()


@pytest.fixture
def sample_search_results():
    """Sample Google Search API response data."""
    return [
        {
            "title": "Introduction to Machine Learning",
            "snippet": "Machine learning is a subset of artificial intelligence that enables computers to learn from data.",
            "link": "https://example.com/ml-intro"
        },
        {
            "title": "Deep Learning Fundamentals",
            "snippet": "Deep learning uses neural networks with multiple layers to process complex patterns.",
            "link": "https://example.com/deep-learning"
        },
        {
            "title": "AI Applications in Education",
            "snippet": "Artificial intelligence is transforming education through personalized learning experiences.",
            "link": "https://example.com/ai-education"
        }
    ]


class TestGoogleSearchServiceInit:
    """Tests for GoogleSearchService initialization."""
    
    def test_initializes_with_env_vars(self, mock_env_vars):
        """Test that service initializes with environment variables."""
        service = GoogleSearchService()
        
        assert service.api_key == "test_api_key_123"
        assert service.search_engine_id == "test_engine_id_456"
        assert service.base_url == "https://www.googleapis.com/customsearch/v1"
    
    def test_initializes_without_env_vars(self, monkeypatch):
        """Test that service initializes even without environment variables."""
        monkeypatch.delenv("GOOGLE_SEARCH_API_KEY", raising=False)
        monkeypatch.delenv("GOOGLE_SEARCH_ENGINE_ID", raising=False)
        
        service = GoogleSearchService()
        
        assert service.api_key is None
        assert service.search_engine_id is None


class TestSearchAndEnrich:
    """Tests for search_and_enrich method."""
    
    @pytest.mark.asyncio
    async def test_raises_error_when_api_key_missing(self, monkeypatch):
        """Test that HTTPException is raised when API key is not configured."""
        monkeypatch.delenv("GOOGLE_SEARCH_API_KEY", raising=False)
        monkeypatch.delenv("GOOGLE_SEARCH_ENGINE_ID", raising=False)
        
        service = GoogleSearchService()
        
        with pytest.raises(HTTPException) as exc_info:
            await service.search_and_enrich("test query")
        
        assert exc_info.value.status_code == 500
        assert "not configured" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_successful_search_returns_formatted_results(
        self, search_service, sample_search_results
    ):
        """Test that successful search returns formatted results."""
        with patch.object(
            search_service, '_perform_search', new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = sample_search_results
            
            result = await search_service.search_and_enrich("machine learning")
            
            assert isinstance(result, str)
            assert "Introduction to Machine Learning" in result
            assert "Deep Learning Fundamentals" in result
            assert "AI Applications in Education" in result
            assert "https://example.com/ml-intro" in result
            mock_search.assert_called_once_with("machine learning", 5)
    
    @pytest.mark.asyncio
    async def test_respects_max_results_parameter(self, search_service):
        """Test that max_results parameter is passed correctly."""
        with patch.object(
            search_service, '_perform_search', new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []
            
            await search_service.search_and_enrich("test query", max_results=3)
            
            mock_search.assert_called_once_with("test query", 3)
    
    @pytest.mark.asyncio
    async def test_handles_http_errors(self, search_service):
        """Test that HTTP errors are caught and re-raised as HTTPException."""
        with patch.object(
            search_service, '_perform_search', new_callable=AsyncMock
        ) as mock_search:
            mock_search.side_effect = httpx.HTTPError("Connection failed")
            
            with pytest.raises(HTTPException) as exc_info:
                await search_service.search_and_enrich("test query")
            
            assert exc_info.value.status_code == 500
            assert "Google Search API error" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_handles_empty_results(self, search_service):
        """Test that empty results are handled gracefully."""
        with patch.object(
            search_service, '_perform_search', new_callable=AsyncMock
        ) as mock_search:
            mock_search.return_value = []
            
            result = await search_service.search_and_enrich("test query")
            
            assert result == ""


class TestPerformSearch:
    """Tests for _perform_search method."""
    
    @pytest.mark.asyncio
    async def test_makes_correct_api_call(self, search_service):
        """Test that API call is made with correct parameters."""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "items": [
                {"title": "Test", "snippet": "Test snippet", "link": "https://test.com"}
            ]
        }
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            result = await search_service._perform_search("test query", 5)
            
            # Verify API call parameters
            mock_client.get.assert_called_once()
            call_args = mock_client.get.call_args
            
            assert call_args[0][0] == "https://www.googleapis.com/customsearch/v1"
            assert call_args[1]["params"]["key"] == "test_api_key_123"
            assert call_args[1]["params"]["cx"] == "test_engine_id_456"
            assert call_args[1]["params"]["q"] == "test query"
            assert call_args[1]["params"]["num"] == 5
    
    @pytest.mark.asyncio
    async def test_limits_max_results_to_10(self, search_service):
        """Test that max_results is capped at 10 (API limit)."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"items": []}
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            await search_service._perform_search("test query", 15)
            
            # Verify num parameter is capped at 10
            call_args = mock_client.get.call_args
            assert call_args[1]["params"]["num"] == 10
    
    @pytest.mark.asyncio
    async def test_returns_items_from_response(self, search_service, sample_search_results):
        """Test that items are extracted from API response."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"items": sample_search_results}
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            result = await search_service._perform_search("test query", 5)
            
            assert result == sample_search_results
    
    @pytest.mark.asyncio
    async def test_returns_empty_list_when_no_items(self, search_service):
        """Test that empty list is returned when API response has no items."""
        mock_response = MagicMock()
        mock_response.json.return_value = {}  # No 'items' key
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            result = await search_service._perform_search("test query", 5)
            
            assert result == []
    
    @pytest.mark.asyncio
    async def test_raises_for_http_status_errors(self, search_service):
        """Test that HTTP status errors are raised."""
        mock_response = MagicMock()
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
            "404 Not Found", request=MagicMock(), response=MagicMock()
        )
        
        with patch('httpx.AsyncClient') as mock_client_class:
            mock_client = AsyncMock()
            mock_client.__aenter__.return_value = mock_client
            mock_client.get.return_value = mock_response
            mock_client_class.return_value = mock_client
            
            with pytest.raises(httpx.HTTPStatusError):
                await search_service._perform_search("test query", 5)


class TestFormatResults:
    """Tests for _format_results method."""
    
    def test_formats_single_result(self, search_service):
        """Test formatting of a single search result."""
        results = [
            {
                "title": "Test Title",
                "snippet": "Test snippet content",
                "link": "https://example.com/test"
            }
        ]
        
        formatted = search_service._format_results(results)
        
        assert "1. Test Title" in formatted
        assert "Test snippet content" in formatted
        assert "Source: https://example.com/test" in formatted
    
    def test_formats_multiple_results(self, search_service, sample_search_results):
        """Test formatting of multiple search results."""
        formatted = search_service._format_results(sample_search_results)
        
        # Check all results are numbered
        assert "1. Introduction to Machine Learning" in formatted
        assert "2. Deep Learning Fundamentals" in formatted
        assert "3. AI Applications in Education" in formatted
        
        # Check all snippets are included
        assert "subset of artificial intelligence" in formatted
        assert "neural networks with multiple layers" in formatted
        assert "transforming education" in formatted
        
        # Check all links are included
        assert "https://example.com/ml-intro" in formatted
        assert "https://example.com/deep-learning" in formatted
        assert "https://example.com/ai-education" in formatted
    
    def test_handles_empty_results(self, search_service):
        """Test that empty results list returns empty string."""
        formatted = search_service._format_results([])
        
        assert formatted == ""
    
    def test_handles_missing_fields(self, search_service):
        """Test that missing fields are handled with defaults."""
        results = [
            {
                # Missing title, snippet, and link
            }
        ]
        
        formatted = search_service._format_results(results)
        
        assert "1. No title" in formatted
        assert "No description" in formatted
        assert "Source:" in formatted
    
    def test_handles_partial_missing_fields(self, search_service):
        """Test that partially missing fields are handled correctly."""
        results = [
            {
                "title": "Test Title",
                # Missing snippet and link
            }
        ]
        
        formatted = search_service._format_results(results)
        
        assert "1. Test Title" in formatted
        assert "No description" in formatted
    
    def test_results_separated_by_double_newlines(self, search_service):
        """Test that results are separated by double newlines."""
        results = [
            {
                "title": "First",
                "snippet": "First snippet",
                "link": "https://first.com"
            },
            {
                "title": "Second",
                "snippet": "Second snippet",
                "link": "https://second.com"
            }
        ]
        
        formatted = search_service._format_results(results)
        
        # Should have double newline between results
        assert "\n\n" in formatted
        parts = formatted.split("\n\n")
        assert len(parts) == 2


class TestGetSearchService:
    """Tests for get_search_service singleton function."""
    
    def test_returns_search_service_instance(self, mock_env_vars):
        """Test that function returns a GoogleSearchService instance."""
        service = get_search_service()
        
        assert isinstance(service, GoogleSearchService)
    
    def test_returns_same_instance_on_multiple_calls(self, mock_env_vars):
        """Test that singleton pattern returns same instance."""
        # Reset singleton
        import app.services.google_search as gs_module
        gs_module._search_service = None
        
        service1 = get_search_service()
        service2 = get_search_service()
        
        assert service1 is service2
