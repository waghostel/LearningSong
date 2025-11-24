"""
Google Custom Search API integration for content enrichment.
"""
import os
from typing import List, Dict, Optional
import httpx
from fastapi import HTTPException


class GoogleSearchService:
    """Service for enriching content using Google Custom Search API."""
    
    def __init__(self):
        self.api_key = os.getenv("GOOGLE_SEARCH_API_KEY")
        self.search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")
        self.base_url = "https://www.googleapis.com/customsearch/v1"
        
    async def search_and_enrich(self, query: str, max_results: int = 5) -> str:
        """
        Search Google and enrich content with top results.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to include (default: 5)
            
        Returns:
            Formatted string with search results
            
        Raises:
            HTTPException: If API call fails
        """
        if not self.api_key or not self.search_engine_id:
            raise HTTPException(
                status_code=500,
                detail="Google Search API not configured"
            )
        
        try:
            results = await self._perform_search(query, max_results)
            return self._format_results(results)
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Google Search API error: {str(e)}"
            )
    
    async def _perform_search(self, query: str, max_results: int) -> List[Dict]:
        """
        Perform the actual Google Custom Search API call.
        
        Args:
            query: Search query string
            max_results: Maximum number of results to retrieve
            
        Returns:
            List of search result dictionaries
        """
        params = {
            "key": self.api_key,
            "cx": self.search_engine_id,
            "q": query,
            "num": min(max_results, 10)  # API max is 10
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()
            
        return data.get("items", [])
    
    def _format_results(self, results: List[Dict]) -> str:
        """
        Format search results into a readable string.
        
        Args:
            results: List of search result dictionaries from Google API
            
        Returns:
            Formatted string with titles, snippets, and links
        """
        if not results:
            return ""
        
        formatted_parts = []
        for i, item in enumerate(results, 1):
            title = item.get("title", "No title")
            snippet = item.get("snippet", "No description")
            link = item.get("link", "")
            
            formatted_parts.append(
                f"{i}. {title}\n"
                f"   {snippet}\n"
                f"   Source: {link}"
            )
        
        return "\n\n".join(formatted_parts)


# Singleton instance
_search_service: Optional[GoogleSearchService] = None


def get_search_service() -> GoogleSearchService:
    """Get or create the Google Search service singleton."""
    global _search_service
    if _search_service is None:
        _search_service = GoogleSearchService()
    return _search_service
