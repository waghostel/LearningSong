import { toast } from 'sonner';
import { AxiosError } from 'axios';

interface RetryOptions {
  onRetry: () => void;
  maxRetries?: number;
}

/**
 * Show a network error toast with retry option
 */
export const showNetworkError = (error: unknown, retryOptions?: RetryOptions) => {
  const message = error instanceof AxiosError 
    ? error.response?.data?.detail || error.message || 'Network request failed'
    : 'Network request failed';

  if (retryOptions) {
    toast.error('Network Error', {
      description: message,
      action: {
        label: 'Retry',
        onClick: retryOptions.onRetry,
      },
      duration: 5000,
    });
  } else {
    toast.error('Network Error', {
      description: message,
      duration: 5000,
    });
  }
};

/**
 * Show a rate limit error toast with countdown
 */
export const showRateLimitError = (resetTime?: Date) => {
  let description = 'You have reached your daily limit of 3 songs.';
  
  if (resetTime) {
    const now = new Date();
    const diff = resetTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      description += ` Resets in ${hours}h ${minutes}m.`;
    } else if (minutes > 0) {
      description += ` Resets in ${minutes}m.`;
    } else {
      description += ' Resets soon.';
    }
  }

  toast.error('Rate Limit Reached', {
    description,
    duration: 7000,
  });
};

/**
 * Show a validation error toast
 */
export const showValidationError = (message: string) => {
  toast.error('Validation Error', {
    description: message,
    duration: 4000,
  });
};

/**
 * Show a generic error toast
 */
export const showError = (title: string, message: string) => {
  toast.error(title, {
    description: message,
    duration: 5000,
  });
};

/**
 * Show a success toast
 */
export const showSuccess = (title: string, message?: string) => {
  toast.success(title, {
    description: message,
    duration: 3000,
  });
};

/**
 * Show an info toast
 */
export const showInfo = (title: string, message?: string) => {
  toast.info(title, {
    description: message,
    duration: 3000,
  });
};

/**
 * Handle API errors and show appropriate toast
 */
export const handleApiError = (error: unknown, retryOptions?: RetryOptions) => {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail;

    switch (status) {
      case 429: {
        // Rate limit error
        const retryAfter = error.response?.data?.retry_after;
        const resetTime = retryAfter 
          ? new Date(Date.now() + retryAfter * 1000)
          : undefined;
        showRateLimitError(resetTime);
        break;
      }
      
      case 400:
        // Validation error
        showValidationError(detail || 'Invalid request. Please check your input.');
        break;
      
      case 401:
        // Authentication error
        showError('Authentication Error', 'Please refresh the page and try again.');
        break;
      
      case 500:
      case 502:
      case 503:
        // Server error
        showNetworkError(error, retryOptions);
        break;
      
      default:
        // Generic error
        showNetworkError(error, retryOptions);
    }
  } else if (error instanceof Error) {
    showError('Error', error.message);
  } else {
    showError('Error', 'An unexpected error occurred.');
  }
};
