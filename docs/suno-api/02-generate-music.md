# Generate Music API

## Endpoint
```
POST /api/v1/generate
```

## Request Body

### Required Parameters
- `customMode` (boolean): Enable custom mode for advanced control
- `instrumental` (boolean): Generate instrumental-only music
- `model` (string): Model version (V3_5, V4, V4_5, V4_5PLUS, V5)
- `callBackUrl` (string): URL to receive completion notifications

### Optional Parameters (Custom Mode)
- `prompt` (string): Lyrics or description (max 3000-5000 chars depending on model)
- `style` (string): Music style/genre (max 200-1000 chars depending on model)
- `title` (string): Song title (max 80 chars)
- `personaId` (string): Persona ID for style application
- `negativeTags` (string): Styles to exclude
- `vocalGender` (string): "m" or "f"
- `styleWeight` (number): 0.00-1.00
- `weirdnessConstraint` (number): 0.00-1.00
- `audioWeight` (number): 0.00-1.00

## Response
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e"
  }
}
```

## Task Status
Use `GET /api/v1/generate/record-info?taskId={taskId}` to check status.

Status values:
- PENDING: Queued
- GENERATING: Processing
- SUCCESS: Complete
- FAILED: Failed

## Generation Time
- Stream URL: 30-40 seconds
- Downloadable URL: 2-3 minutes

## Concurrency Limit
20 requests per 10 seconds
