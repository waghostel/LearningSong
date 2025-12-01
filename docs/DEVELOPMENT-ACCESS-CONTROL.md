# Development Access Control Guide

This guide explains how to restrict access to your LearningSong service during development, ensuring only you can use it while testing.

## Overview

By default, Firebase allows anonymous authentication, which means anyone with your public URL can sign up and use your service. This guide provides two complementary approaches to lock down access during development.

## Approach 1: Disable Anonymous Authentication (Recommended First Step)

This is the quickest way to block all public access immediately.

### Steps

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your LearningSong project
3. Navigate to **Authentication** → **Sign-in method** tab
4. Find the **Anonymous** provider
5. Click the toggle to turn it **OFF**
6. Click **Save**

### Result

- ✅ No one can sign up anonymously
- ✅ Public URL becomes inaccessible
- ⚠️ You'll need to manually create test accounts or use dev mode

### When to Use

- **Immediate protection** while you're still developing
- **Simple and fast** - no code changes needed
- **Best for**: Preventing accidental public access

---

## Approach 2: Whitelist Authentication (For Testing Multiple Accounts)

This approach allows specific Firebase UIDs to access the service while blocking everyone else.

### Setup

#### Step 1: Get Your Firebase UID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Authentication** → **Users** tab
4. Create a test account or note your existing UID
5. Copy the UID (looks like: `abc123def456...`)

#### Step 2: Add Whitelist Check to Backend

Create or update `backend/app/core/auth.py`:

```python
import os
from fastapi import HTTPException

# Load whitelisted UIDs from environment
ALLOWED_USERS = set(os.getenv('ALLOWED_USERS', '').split(','))
IS_DEVELOPMENT = os.getenv('ENVIRONMENT', 'development').lower() == 'development'

async def verify_dev_access(user_id: str) -> bool:
    """
    Verify user is whitelisted for development access.
    
    Args:
        user_id: Firebase user ID
        
    Raises:
        HTTPException: 403 Forbidden if user not whitelisted
    """
    if not IS_DEVELOPMENT:
        return True  # Skip check in production
    
    if user_id not in ALLOWED_USERS:
        raise HTTPException(
            status_code=403,
            detail="Access denied. This service is in development mode."
        )
    return True
```

#### Step 3: Add Whitelist Check to API Endpoints

Update your main API routes (e.g., `backend/app/api/songs.py`):

```python
from app.core.auth import verify_dev_access

@router.post("/generate")
async def generate_song(
    request: SongRequest,
    user_id: str = Depends(get_current_user)
):
    # Add this line at the start
    await verify_dev_access(user_id)
    
    # ... rest of your endpoint logic
```

#### Step 4: Configure Environment Variables

Update `backend/.env`:

```env
ENVIRONMENT=development
ALLOWED_USERS=your-uid-1,your-uid-2,your-uid-3
```

Replace `your-uid-1`, etc. with actual Firebase UIDs.

### Result

- ✅ Only whitelisted users can access the API
- ✅ Can test with multiple accounts
- ✅ Easy to add/remove users by editing `.env`
- ✅ Code-based control (can be toggled per environment)

### When to Use

- **Multiple test accounts** needed
- **Flexible access control** during development
- **Easy to scale** when adding team members

---

## Approach 3: Development Mode (Unlimited Testing)

For unlimited testing without rate limits, use development mode.

### Setup

#### Step 1: Enable Development Mode

Update `backend/.env`:

```env
ENVIRONMENT=development
```

#### Step 2: Use Dev User ID in Frontend

When testing locally, use the dev user ID instead of Firebase auth:

```typescript
// frontend/src/api/client.ts
const getUserId = () => {
  if (process.env.NODE_ENV === 'development') {
    return 'dev-user-local';  // Unlimited testing
  }
  return getFirebaseUserId();  // Normal auth
};
```

### Result

- ✅ **Unlimited songs** per day (no 3-song limit)
- ✅ **Unlimited testing** without rate limit resets
- ✅ **Instant feedback** during development

### When to Use

- **Local development** on your machine
- **Rapid iteration** and testing
- **Debugging** rate limit logic

---

## Recommended Setup for Development

Combine all three approaches for maximum security and flexibility:

```env
# backend/.env
ENVIRONMENT=development
ALLOWED_USERS=your-firebase-uid
```

**Steps:**

1. ✅ Disable anonymous auth in Firebase Console
2. ✅ Set `ENVIRONMENT=development` in `.env`
3. ✅ Add your Firebase UID to `ALLOWED_USERS`
4. ✅ Use `dev-user-local` in frontend for unlimited testing

**Result:**
- Public URL is blocked (no anonymous auth)
- Only your UID can access via normal auth
- Dev mode allows unlimited testing locally
- Easy to transition to production

---

## Transitioning to Production

When ready to go public:

1. **Re-enable anonymous auth** in Firebase Console
2. **Set `ENVIRONMENT=production`** in backend `.env`
3. **Remove whitelist check** or set `ALLOWED_USERS` to empty
4. **Remove dev user ID** from frontend
5. **Deploy** to production

---

## Troubleshooting

### "Access denied" error

- Check your Firebase UID is correct
- Verify `ALLOWED_USERS` in `.env` matches your UID
- Ensure `ENVIRONMENT=development` is set
- Restart backend server after `.env` changes

### Still seeing rate limit in dev mode

- Confirm `ENVIRONMENT=development` is set
- Check frontend is using `dev-user-local` user ID
- Verify `IS_DEVELOPMENT` flag is True in `rate_limiter.py`
- Check logs for "Rate limit bypassed for dev user"

### Can't access with whitelisted UID

- Verify UID format (should be long alphanumeric string)
- Check for typos in `ALLOWED_USERS`
- Ensure Firebase auth is still enabled (just anonymous is disabled)
- Test with Firebase Console to confirm UID exists

---

## Quick Reference

| Scenario | Solution |
|----------|----------|
| Block all public access immediately | Disable anonymous auth in Firebase |
| Allow specific users only | Use whitelist approach + `.env` |
| Unlimited testing locally | Set `ENVIRONMENT=development` |
| Multiple team members | Add UIDs to `ALLOWED_USERS` |
| Go public | Re-enable anonymous auth + set production env |

---

## Security Notes

- **Never commit `.env`** with real UIDs to version control
- **Use `.env.example`** to document required variables
- **Rotate UIDs** if you suspect compromise
- **Monitor Firestore** for unexpected access patterns
- **Use Firebase Security Rules** for additional protection (see Firebase docs)

