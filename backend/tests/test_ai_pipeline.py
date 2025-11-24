"""Tests for AI Pipeline service."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.ai_pipeline import LyricsPipeline, PipelineState


@pytest.fixture
def sample_content():
    """Sample educational content for testing."""
    return """
    Python is a high-level programming language. It emphasizes code readability
    and allows programmers to express concepts in fewer lines of code. Python
    supports multiple programming paradigms including object-oriented, imperative,
    and functional programming.
    """


@pytest.fixture
def mock_llm_response():
    """Mock LLM response."""
    mock_response = MagicMock()
    mock_response.content = "Mocked LLM response"
    return mock_response


@pytest.fixture
def pipeline():
    """Create a LyricsPipeline instance with mocked LLM."""
    with patch('app.services.ai_pipeline.ChatOpenAI') as mock_openai:
        mock_llm = MagicMock()
        mock_openai.return_value = mock_llm
        pipeline = LyricsPipeline()
        pipeline.llm = mock_llm
        return pipeline


class TestPipelineNodes:
    """Test individual pipeline nodes."""
    
    @pytest.mark.asyncio
    async def test_check_search_needed(self, pipeline):
        """Test _check_search_needed node."""
        state: PipelineState = {
            "user_input": "test content",
            "search_enabled": True,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        result = await pipeline._check_search_needed(state)
        
        assert result["current_stage"] == "checking_search"
        assert result["search_enabled"] is True
    
    @pytest.mark.asyncio
    async def test_google_search_grounding_success(self, pipeline, sample_content):
        """Test _google_search_grounding node with successful search."""
        state: PipelineState = {
            "user_input": sample_content,
            "search_enabled": True,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        mock_search_service = MagicMock()
        mock_search_service.search_and_enrich = AsyncMock(
            return_value="Search result 1\nSearch result 2"
        )
        
        with patch('app.services.ai_pipeline.get_search_service', return_value=mock_search_service):
            result = await pipeline._google_search_grounding(state)
        
        assert result["current_stage"] == "searching"
        assert "Original Content:" in result["enriched_content"]
        assert "Additional Context from Search:" in result["enriched_content"]
        assert sample_content in result["enriched_content"]
    
    @pytest.mark.asyncio
    async def test_google_search_grounding_failure(self, pipeline, sample_content):
        """Test _google_search_grounding node with failed search."""
        state: PipelineState = {
            "user_input": sample_content,
            "search_enabled": True,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        mock_search_service = MagicMock()
        mock_search_service.search_and_enrich = AsyncMock(
            side_effect=Exception("Search API error")
        )
        
        with patch('app.services.ai_pipeline.get_search_service', return_value=mock_search_service):
            result = await pipeline._google_search_grounding(state)
        
        # Should fall back to original content
        assert result["enriched_content"] == sample_content
    
    @pytest.mark.asyncio
    async def test_clean_text(self, pipeline):
        """Test _clean_text node."""
        state: PipelineState = {
            "user_input": "<p>Test   content\n\nwith   HTML</p>",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        result = await pipeline._clean_text(state)
        
        assert result["current_stage"] == "cleaning"
        assert "<p>" not in result["cleaned_text"]
        assert "</p>" not in result["cleaned_text"]
        assert "Test content with HTML" == result["cleaned_text"]
    
    @pytest.mark.asyncio
    async def test_clean_text_with_enriched_content(self, pipeline):
        """Test _clean_text node with enriched content."""
        state: PipelineState = {
            "user_input": "original",
            "search_enabled": True,
            "enriched_content": "<div>enriched   content</div>",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        result = await pipeline._clean_text(state)
        
        assert result["cleaned_text"] == "enriched content"
    
    @pytest.mark.asyncio
    async def test_summarize_success(self, pipeline, mock_llm_response):
        """Test _summarize node with successful LLM call."""
        state: PipelineState = {
            "user_input": "test",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "Test content for summarization",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        mock_llm_response.content = "Key point 1: Python is readable\nKey point 2: Python is versatile"
        
        with patch('app.services.ai_pipeline.ChatPromptTemplate') as mock_template:
            mock_chain = MagicMock()
            mock_chain.ainvoke = AsyncMock(return_value=mock_llm_response)
            mock_template.from_messages.return_value.__or__ = MagicMock(return_value=mock_chain)
            
            result = await pipeline._summarize(state)
        
        assert result["current_stage"] == "summarizing"
        assert result["summary"] == mock_llm_response.content
        assert result["error"] is None
    
    @pytest.mark.asyncio
    async def test_summarize_failure(self, pipeline):
        """Test _summarize node with LLM failure."""
        state: PipelineState = {
            "user_input": "test",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "Test content",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        with patch('app.services.ai_pipeline.ChatPromptTemplate') as mock_template:
            mock_chain = MagicMock()
            mock_chain.ainvoke = AsyncMock(side_effect=Exception("LLM error"))
            mock_template.from_messages.return_value.__or__ = MagicMock(return_value=mock_chain)
            
            result = await pipeline._summarize(state)
        
        assert result["error"] is not None
        assert "Failed to summarize content" in result["error"]
    
    @pytest.mark.asyncio
    async def test_validate_summary_length_valid(self, pipeline):
        """Test _validate_summary_length with valid summary."""
        state: PipelineState = {
            "user_input": "test",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "Short summary with less than 500 words",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        result = await pipeline._validate_summary_length(state)
        
        assert result["current_stage"] == "validating"
        assert result["summary_valid"] is True
        assert result["error"] is None
    
    @pytest.mark.asyncio
    async def test_validate_summary_length_too_long(self, pipeline):
        """Test _validate_summary_length with too long summary."""
        # Create a summary with more than 500 words
        long_summary = " ".join(["word"] * 501)
        
        state: PipelineState = {
            "user_input": "test",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": long_summary,
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        result = await pipeline._validate_summary_length(state)
        
        assert result["summary_valid"] is False
        assert result["error"] is not None
        assert "Summary too long" in result["error"]
    
    @pytest.mark.asyncio
    async def test_convert_to_lyrics_success(self, pipeline, mock_llm_response):
        """Test _convert_to_lyrics node with successful conversion."""
        state: PipelineState = {
            "user_input": "original content",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "Key learning points",
            "summary_valid": True,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        mock_llm_response.content = "[Verse 1]\nLearning Python is fun\n[Chorus]\nCode all day long"
        
        with patch('app.services.ai_pipeline.ChatPromptTemplate') as mock_template:
            mock_chain = MagicMock()
            mock_chain.ainvoke = AsyncMock(return_value=mock_llm_response)
            mock_template.from_messages.return_value.__or__ = MagicMock(return_value=mock_chain)
            
            result = await pipeline._convert_to_lyrics(state)
        
        assert result["current_stage"] == "converting"
        assert result["lyrics"] == mock_llm_response.content
        assert result["content_hash"] != ""
        assert len(result["content_hash"]) == 64  # SHA-256 hash length
    
    @pytest.mark.asyncio
    async def test_convert_to_lyrics_failure(self, pipeline):
        """Test _convert_to_lyrics node with conversion failure."""
        state: PipelineState = {
            "user_input": "test",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "Summary",
            "summary_valid": True,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        with patch('app.services.ai_pipeline.ChatPromptTemplate') as mock_template:
            mock_chain = MagicMock()
            mock_chain.ainvoke = AsyncMock(side_effect=Exception("Conversion error"))
            mock_template.from_messages.return_value.__or__ = MagicMock(return_value=mock_chain)
            
            result = await pipeline._convert_to_lyrics(state)
        
        assert result["error"] is not None
        assert "Failed to convert to lyrics" in result["error"]
    
    @pytest.mark.asyncio
    async def test_handle_error(self, pipeline):
        """Test _handle_error node."""
        state: PipelineState = {
            "user_input": "test",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": "Test error message",
            "content_hash": "",
            "current_stage": ""
        }
        
        result = await pipeline._handle_error(state)
        
        assert result["current_stage"] == "error"
        assert result["error"] == "Test error message"


class TestGraphExecution:
    """Test the complete graph execution."""
    
    @pytest.mark.asyncio
    async def test_execute_without_search(self, pipeline, sample_content, mock_llm_response):
        """Test execute method without Google Search."""
        mock_llm_response.content = "Mocked lyrics output"
        
        with patch('app.services.ai_pipeline.ChatPromptTemplate') as mock_template:
            mock_chain = MagicMock()
            mock_chain.ainvoke = AsyncMock(return_value=mock_llm_response)
            mock_template.from_messages.return_value.__or__ = MagicMock(return_value=mock_chain)
            
            result = await pipeline.execute(sample_content, search_enabled=False)
        
        assert "lyrics" in result
        assert "content_hash" in result
        assert result["cached"] is False
        assert "processing_time" in result
        assert result["processing_time"] >= 0
    
    @pytest.mark.asyncio
    async def test_execute_with_search(self, pipeline, sample_content, mock_llm_response):
        """Test execute method with Google Search enabled."""
        mock_llm_response.content = "Mocked lyrics output"
        
        mock_search_service = MagicMock()
        mock_search_service.search_and_enrich = AsyncMock(
            return_value="Search results"
        )
        
        with patch('app.services.ai_pipeline.get_search_service', return_value=mock_search_service):
            with patch('app.services.ai_pipeline.ChatPromptTemplate') as mock_template:
                mock_chain = MagicMock()
                mock_chain.ainvoke = AsyncMock(return_value=mock_llm_response)
                mock_template.from_messages.return_value.__or__ = MagicMock(return_value=mock_chain)
                
                result = await pipeline.execute(sample_content, search_enabled=True)
        
        assert "lyrics" in result
        assert result["cached"] is False
        mock_search_service.search_and_enrich.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_execute_with_error(self, pipeline, sample_content):
        """Test execute method with pipeline error."""
        with patch('app.services.ai_pipeline.ChatPromptTemplate') as mock_template:
            mock_chain = MagicMock()
            mock_chain.ainvoke = AsyncMock(side_effect=Exception("Pipeline error"))
            mock_template.from_messages.return_value.__or__ = MagicMock(return_value=mock_chain)
            
            with pytest.raises(Exception) as exc_info:
                await pipeline.execute(sample_content, search_enabled=False)
            
            assert "summarize" in str(exc_info.value).lower() or "error" in str(exc_info.value).lower()


class TestErrorHandling:
    """Test error handling scenarios."""
    
    @pytest.mark.asyncio
    async def test_invalid_summary_length(self, pipeline):
        """Test that invalid summary length is caught."""
        # Create a very long summary
        long_summary = " ".join(["word"] * 600)
        
        state: PipelineState = {
            "user_input": "test",
            "search_enabled": False,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": long_summary,
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": ""
        }
        
        result = await pipeline._validate_summary_length(state)
        
        assert result["summary_valid"] is False
        assert result["error"] is not None
