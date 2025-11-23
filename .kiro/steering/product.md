# Product Overview

LearningSong is an AI-powered educational tool that transforms learning materials into memorable songs. Users paste educational content, and the system generates singable lyrics and produces a complete song using AI.

## Core Features

- **Text-to-Lyrics Pipeline**: Converts educational content into structured, memorable song lyrics using LangChain/LangGraph
- **AI Music Generation**: Creates songs from lyrics using Suno API with 8 preset styles (Pop, Rap, Folk, Electronic, Rock, Jazz, Children's, Classical)
- **Google Search Grounding**: Optional feature to enrich short content with relevant educational context
- **Lyrics Editing**: Users can manually adjust AI-generated lyrics before song creation
- **Real-time Updates**: WebSocket-based status updates with browser notifications when songs are ready

## MVP Constraints

- Anonymous users only (Firebase anonymous auth)
- 3 songs per day rate limit
- 48-hour data retention for anonymous users
- Input text: max 10,000 words
- Content caching to reduce API costs (20-40% estimated savings)

## Target Users

Students, teachers, and self-learners who want to convert knowledge into engaging, memorable songs without requiring musical expertise.
