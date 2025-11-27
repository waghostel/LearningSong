# Product Overview

LearningSong transforms learning materials into memorable songs using AI.

## Core Flow
1. User pastes educational content (Page A: Text Input)
2. AI generates singable lyrics via LangChain/LangGraph
3. User edits lyrics if needed (Page B: Lyrics Editing)
4. Suno API creates the final song

## Features
- **Text-to-Lyrics**: LangGraph pipeline converts content to structured lyrics
- **Music Generation**: Suno API with 8 styles (Pop, Rap, Folk, Electronic, Rock, Jazz, Children's, Classical)
- **Google Search Grounding**: Optional enrichment for short content
- **Real-time Updates**: WebSocket status + browser notifications

## MVP Constraints
- Anonymous auth only (Firebase)
- 3 songs/day rate limit
- 48-hour data retention
- Max 10,000 words input
- Content caching for cost reduction
