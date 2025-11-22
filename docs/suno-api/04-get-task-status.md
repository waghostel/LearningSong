# Get Task Status API

## Endpoint
```
GET /api/v1/generate/record-info?taskId={taskId}
```

## Parameters
- `taskId` (string, required): Task ID from generation request

## Response
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "5c79****be8e",
    "status": "SUCCESS",
    "response": {
      "taskId": "5c79****be8e",
      "sunoData": [
        {
          "id": "8551****662c",
          "audioUrl": "https://example.cn/****.mp3",
          "streamAudioUrl": "https://example.cn/****",
          "imageUrl": "https://example.cn/****.jpeg",
          "prompt": "[Verse] 夜晚城市 灯火辉煌",
          "modelName": "chirp-v3-5",
          "title": "钢铁侠",
          "tags": "electrifying, rock",
          "createTime": "2025-01-01 00:00:00",
          "duration": 198.44
        }
      ]
    }
  }
}
```

## Status Values
- **PENDING**: Task is waiting to be processed
- **TEXT_SUCCESS**: Lyrics/text generation completed
- **FIRST_SUCCESS**: First track generation completed
- **SUCCESS**: All tracks generated successfully
- **CREATE_TASK_FAILED**: Failed to create task
- **GENERATE_AUDIO_FAILED**: Failed to generate music
- **CALLBACK_EXCEPTION**: Error during callback
- **SENSITIVE_WORD_ERROR**: Content contains prohibited words
