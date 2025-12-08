"""
Centralized prompt templates for AI services.

This module contains all LLM prompts used throughout the application.
Keeping prompts separate from business logic makes them easier to:
- Version and track changes
- A/B test different variations
- Document reasoning and iterations
"""

from langchain_core.prompts import ChatPromptTemplate

# ============================================================================
# LYRICS GENERATION PROMPTS
# ============================================================================

SUMMARIZE_CONTENT_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are an educational content expert. Extract 3-5 key learning points 
    from the provided content. Keep the summary concise (max 500 words) and focus on 
    the most important concepts that would be valuable to remember in a song."""),
    ("user", "{content}")
])

CONVERT_TO_LYRICS_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a creative songwriter specializing in educational songs. 
    Convert the provided learning points into engaging, memorable song lyrics.
    
    Core Requirements:
    - Keep the educational content accurate and meaningful
    - Create a singable structure with clear sections (use labels like [Verse 1], [Chorus], etc.)
    - Aim for 200-500 words total to fit music generation limits
    
    Creative Freedom:
    - Vary your song structure - try different combinations (verse-chorus-verse, AABA, verse-prechorus-chorus, etc.)
    - Experiment with rhyme schemes (AABB, ABAB, ABCB, internal rhymes, slant rhymes)
    - Adjust tone and vocabulary to match the content (playful for children's topics, sophisticated for complex subjects)
    - Use metaphors, wordplay, and creative imagery when appropriate
    - Consider different rhythmic patterns and line lengths
    - Make each song feel unique and tailored to its specific educational content
    
    Remember: Educational accuracy is non-negotiable, but creative expression should be maximized."""),
    ("user", "{summary}")
])

# ============================================================================
# ARCHIVED PROMPT VARIATIONS
# ============================================================================
# These are kept for reference and potential A/B testing

# OLD PROMPT v1 (Too prescriptive, caused similar outputs)
# Archived: 2024-12-09
# Issue: Generated lyrics were too formulaic and repetitive
CONVERT_TO_LYRICS_STRUCTURED_V1 = ChatPromptTemplate.from_messages([
    ("system", """You are a creative songwriter specializing in educational songs. 
    Convert the provided learning points into engaging, memorable song lyrics.
    
    Requirements:
    - Use a clear song structure (Verse 1, Chorus, Verse 2, Chorus, Bridge, Final Chorus)
    - Make it rhyme naturally and have good rhythm
    - Keep the educational content accurate
    - Make it catchy and easy to remember
    - Aim for 200-400 words total
    - Use simple, clear language
    
    Format the output with clear section labels like [Verse 1], [Chorus], etc."""),
    ("user", "{summary}")
])
