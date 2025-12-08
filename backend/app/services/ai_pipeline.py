"""AI Pipeline Service for generating lyrics from educational content."""

import hashlib
import logging
import time
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from app.services.google_search import get_search_service
from app.prompts import SUMMARIZE_CONTENT_PROMPT, CONVERT_TO_LYRICS_PROMPT

# Configure logging
logger = logging.getLogger(__name__)


class PipelineState(TypedDict):
    """State object for the lyrics generation pipeline."""
    user_input: str
    search_enabled: bool
    enriched_content: str
    cleaned_text: str
    summary: str
    summary_valid: bool
    lyrics: str
    error: Optional[str]
    content_hash: str
    current_stage: str


class LyricsPipeline:
    """LangGraph-based pipeline for converting educational content to lyrics."""
    
    def __init__(self):
        """Initialize the lyrics generation pipeline."""
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.7)
        self.graph = self._build_graph()
        logger.info("LyricsPipeline initialized")
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph state machine for lyrics generation."""
        workflow = StateGraph(PipelineState)
        
        # Add all nodes
        workflow.add_node("check_search", self._check_search_needed)
        workflow.add_node("google_search", self._google_search_grounding)
        workflow.add_node("clean", self._clean_text)
        workflow.add_node("summarize", self._summarize)
        workflow.add_node("validate", self._validate_summary_length)
        workflow.add_node("convert", self._convert_to_lyrics)
        workflow.add_node("error", self._handle_error)
        
        # Set entry point
        workflow.set_entry_point("check_search")
        
        # Add conditional edge from check_search
        def route_after_check(state: PipelineState) -> str:
            """Route to google_search if enabled, otherwise to clean."""
            return "google_search" if state["search_enabled"] else "clean"
        
        workflow.add_conditional_edges(
            "check_search",
            route_after_check,
            {
                "google_search": "google_search",
                "clean": "clean"
            }
        )
        
        # Add edge from google_search to clean
        workflow.add_edge("google_search", "clean")
        
        # Add edge from clean to summarize
        workflow.add_edge("clean", "summarize")
        
        # Add edge from summarize to validate
        workflow.add_edge("summarize", "validate")
        
        # Add conditional edge from validate
        def route_after_validate(state: PipelineState) -> str:
            """Route to convert if valid, otherwise to error."""
            if state.get("error"):
                return "error"
            return "convert" if state["summary_valid"] else "error"
        
        workflow.add_conditional_edges(
            "validate",
            route_after_validate,
            {
                "convert": "convert",
                "error": "error"
            }
        )
        
        # Add edges to END
        workflow.add_edge("convert", END)
        workflow.add_edge("error", END)
        
        # Compile and return the graph
        return workflow.compile()
    
    async def _check_search_needed(self, state: PipelineState) -> PipelineState:
        """
        Check if Google Search grounding is needed.
        
        Args:
            state: Current pipeline state
            
        Returns:
            Updated state with current_stage set
        """
        logger.info(
            f"Pipeline stage: check_search_needed",
            extra={
                'extra_fields': {
                    'stage': 'check_search',
                    'search_enabled': state['search_enabled']
                }
            }
        )
        state["current_stage"] = "checking_search"
        return state
    
    async def _google_search_grounding(self, state: PipelineState) -> PipelineState:
        """
        Enrich content using Google Search API.
        
        Args:
            state: Current pipeline state
            
        Returns:
            Updated state with enriched_content
        """
        start_time = time.time()
        logger.info(
            "Pipeline stage: google_search_grounding",
            extra={
                'extra_fields': {
                    'stage': 'google_search',
                    'query_length': len(state["user_input"][:200])
                }
            }
        )
        state["current_stage"] = "searching"
        
        try:
            search_service = get_search_service()
            # Extract key terms from user input for search query
            search_results = await search_service.search_and_enrich(
                state["user_input"][:200],  # Use first 200 chars as query
                max_results=5
            )
            
            # Combine original content with search results
            state["enriched_content"] = (
                f"Original Content:\n{state['user_input']}\n\n"
                f"Additional Context from Search:\n{search_results}"
            )
            
            elapsed_time = time.time() - start_time
            logger.info(
                "Google Search grounding completed",
                extra={
                    'extra_fields': {
                        'stage': 'google_search',
                        'execution_time': round(elapsed_time, 3),
                        'enriched_length': len(state["enriched_content"])
                    }
                }
            )
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(
                f"Google Search failed: {str(e)}",
                extra={
                    'extra_fields': {
                        'stage': 'google_search',
                        'execution_time': round(elapsed_time, 3),
                        'error': str(e)
                    }
                }
            )
            # Fall back to original content if search fails
            state["enriched_content"] = state["user_input"]
        
        return state
    
    async def _clean_text(self, state: PipelineState) -> PipelineState:
        """
        Clean and normalize text content.
        
        Args:
            state: Current pipeline state
            
        Returns:
            Updated state with cleaned_text
        """
        start_time = time.time()
        logger.info(
            "Pipeline stage: clean_text",
            extra={
                'extra_fields': {
                    'stage': 'clean'
                }
            }
        )
        state["current_stage"] = "cleaning"
        
        # Use enriched content if available, otherwise use original input
        content = state.get("enriched_content") or state["user_input"]
        
        # Remove HTML tags
        import re
        cleaned = re.sub(r'<[^>]+>', '', content)
        
        # Normalize whitespace
        cleaned = re.sub(r'\s+', ' ', cleaned)
        cleaned = cleaned.strip()
        
        state["cleaned_text"] = cleaned
        
        elapsed_time = time.time() - start_time
        logger.info(
            f"Text cleaned: {len(cleaned)} characters",
            extra={
                'extra_fields': {
                    'stage': 'clean',
                    'execution_time': round(elapsed_time, 3),
                    'input_length': len(content),
                    'output_length': len(cleaned)
                }
            }
        )
        return state
    
    async def _summarize(self, state: PipelineState) -> PipelineState:
        """
        Extract 3-5 key learning points from content.
        
        Args:
            state: Current pipeline state
            
        Returns:
            Updated state with summary
        """
        start_time = time.time()
        logger.info(
            "Pipeline stage: summarize",
            extra={
                'extra_fields': {
                    'stage': 'summarize',
                    'input_length': len(state["cleaned_text"])
                }
            }
        )
        state["current_stage"] = "summarizing"
        
        chain = SUMMARIZE_CONTENT_PROMPT | self.llm
        
        try:
            response = await chain.ainvoke({"content": state["cleaned_text"]})
            state["summary"] = response.content
            
            elapsed_time = time.time() - start_time
            logger.info(
                f"Summary generated: {len(state['summary'])} characters",
                extra={
                    'extra_fields': {
                        'stage': 'summarize',
                        'execution_time': round(elapsed_time, 3),
                        'summary_length': len(state['summary']),
                        'word_count': len(state['summary'].split())
                    }
                }
            )
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(
                f"Summarization failed: {str(e)}",
                extra={
                    'extra_fields': {
                        'stage': 'summarize',
                        'execution_time': round(elapsed_time, 3),
                        'error': str(e)
                    }
                }
            )
            state["error"] = f"Failed to summarize content: {str(e)}"
        
        return state
    
    async def _validate_summary_length(self, state: PipelineState) -> PipelineState:
        """
        Validate that summary fits within Suno API limits.
        
        Args:
            state: Current pipeline state
            
        Returns:
            Updated state with summary_valid flag
        """
        logger.info(
            "Pipeline stage: validate_summary_length",
            extra={
                'extra_fields': {
                    'stage': 'validate'
                }
            }
        )
        state["current_stage"] = "validating"
        
        # Suno API typically accepts up to ~3000 characters for lyrics
        # We'll be conservative and aim for 2000 characters after conversion
        word_count = len(state["summary"].split())
        char_count = len(state["summary"])
        
        # Summary should be reasonable for lyrics conversion
        # Max 500 words as per design, which should convert to ~2000 chars of lyrics
        if word_count <= 500 and char_count <= 3000:
            state["summary_valid"] = True
            logger.info(
                f"Summary valid: {word_count} words, {char_count} chars",
                extra={
                    'extra_fields': {
                        'stage': 'validate',
                        'valid': True,
                        'word_count': word_count,
                        'char_count': char_count
                    }
                }
            )
        else:
            state["summary_valid"] = False
            state["error"] = (
                f"Summary too long: {word_count} words, {char_count} chars. "
                f"Maximum is 500 words and 3000 characters."
            )
            logger.warning(
                state["error"],
                extra={
                    'extra_fields': {
                        'stage': 'validate',
                        'valid': False,
                        'word_count': word_count,
                        'char_count': char_count
                    }
                }
            )
        
        return state
    
    async def _convert_to_lyrics(self, state: PipelineState) -> PipelineState:
        """
        Convert summary into structured song lyrics.
        
        Args:
            state: Current pipeline state
            
        Returns:
            Updated state with lyrics
        """
        start_time = time.time()
        logger.info(
            "Pipeline stage: convert_to_lyrics",
            extra={
                'extra_fields': {
                    'stage': 'convert',
                    'summary_length': len(state["summary"])
                }
            }
        )
        state["current_stage"] = "converting"
        
        chain = CONVERT_TO_LYRICS_PROMPT | self.llm
        
        try:
            response = await chain.ainvoke({"summary": state["summary"]})
            state["lyrics"] = response.content
            
            # Generate content hash
            state["content_hash"] = hashlib.sha256(
                state["user_input"].strip().lower().encode()
            ).hexdigest()
            
            elapsed_time = time.time() - start_time
            logger.info(
                f"Lyrics generated: {len(state['lyrics'])} characters",
                extra={
                    'extra_fields': {
                        'stage': 'convert',
                        'execution_time': round(elapsed_time, 3),
                        'lyrics_length': len(state['lyrics']),
                        'word_count': len(state['lyrics'].split()),
                        'content_hash': state["content_hash"][:16]
                    }
                }
            )
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(
                f"Lyrics conversion failed: {str(e)}",
                extra={
                    'extra_fields': {
                        'stage': 'convert',
                        'execution_time': round(elapsed_time, 3),
                        'error': str(e)
                    }
                }
            )
            state["error"] = f"Failed to convert to lyrics: {str(e)}"
        
        return state
    
    async def _handle_error(self, state: PipelineState) -> PipelineState:
        """
        Handle pipeline errors.
        
        Args:
            state: Current pipeline state
            
        Returns:
            Updated state with error logged
        """
        logger.error(
            f"Pipeline error: {state.get('error', 'Unknown error')}",
            extra={
                'extra_fields': {
                    'stage': 'error',
                    'error': state.get('error', 'Unknown error'),
                    'current_stage': state.get('current_stage', 'unknown')
                }
            }
        )
        state["current_stage"] = "error"
        return state
    
    async def execute(self, content: str, search_enabled: bool) -> dict:
        """
        Execute the lyrics generation pipeline.
        
        Args:
            content: Educational content to convert to lyrics
            search_enabled: Whether to use Google Search grounding
            
        Returns:
            Dictionary with lyrics, content_hash, cached flag, and processing_time
            
        Raises:
            Exception: If pipeline execution fails
        """
        start_time = time.time()
        
        logger.info(
            f"Starting pipeline execution",
            extra={
                'extra_fields': {
                    'search_enabled': search_enabled,
                    'content_length': len(content),
                    'word_count': len(content.split())
                }
            }
        )
        
        # Initialize state
        initial_state: PipelineState = {
            "user_input": content,
            "search_enabled": search_enabled,
            "enriched_content": "",
            "cleaned_text": "",
            "summary": "",
            "summary_valid": False,
            "lyrics": "",
            "error": None,
            "content_hash": "",
            "current_stage": "initializing"
        }
        
        try:
            # Invoke the graph
            result = await self.graph.ainvoke(initial_state)
            
            # Check for errors
            if result.get("error"):
                logger.error(f"Pipeline failed: {result['error']}")
                raise Exception(result["error"])
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            logger.info(
                f"Pipeline completed successfully in {processing_time:.2f}s",
                extra={
                    'extra_fields': {
                        'total_execution_time': round(processing_time, 3),
                        'success': True,
                        'lyrics_length': len(result["lyrics"]),
                        'content_hash': result["content_hash"][:16]
                    }
                }
            )
            
            return {
                "lyrics": result["lyrics"],
                "content_hash": result["content_hash"],
                "cached": False,
                "processing_time": processing_time
            }
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(
                f"Pipeline execution failed after {processing_time:.2f}s: {str(e)}",
                extra={
                    'extra_fields': {
                        'total_execution_time': round(processing_time, 3),
                        'success': False,
                        'error': str(e)
                    }
                },
                exc_info=True
            )
            raise
