# Generate Lyrics API

## Endpoint
```
POST /api/v1/lyrics
```

## Request Body
```json
{
  "prompt": "A song about peaceful night in the city",
  "callBackUrl": "https://api.example.com/callback"
}
```

### Parameters
- `prompt` (string, required): Description of desired lyrics (max 200 words)
- `callBackUrl` (string, required): URL for completion notification

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

## Check Status
```
GET /api/v1/lyrics/record-info?taskId={taskId}
```

## Notes
- Lyrics are retained for 15 days
- Callback has only one stage: complete
- Generated lyrics include song structure markers ([Verse], [Chorus], etc.)
- Can be used as input for Generate Music endpoint
