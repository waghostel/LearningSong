"""
Structured logging configuration for the application.

This module provides JSON-formatted logging for better observability
and integration with log aggregation systems. It includes middleware
for request/response logging with performance metrics.
"""

import json
import logging
import time
from datetime import datetime, timezone
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class JSONFormatter(logging.Formatter):
    """
    Custom JSON formatter for structured logging.
    
    Outputs log records as JSON objects with consistent fields:
    - timestamp: ISO 8601 formatted timestamp
    - level: Log level (INFO, ERROR, etc.)
    - logger: Logger name
    - message: Log message
    - Additional fields from extra dict
    """
    
    def format(self, record: logging.LogRecord) -> str:
        """
        Format a log record as a JSON string.
        
        Args:
            record: The log record to format
            
        Returns:
            JSON-formatted log string
        """
        log_data = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields from the record
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        # Add standard fields that might be useful
        if hasattr(record, 'funcName'):
            log_data['function'] = record.funcName
        if hasattr(record, 'lineno'):
            log_data['line'] = record.lineno
        
        return json.dumps(log_data)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware for logging HTTP requests and responses.
    
    Logs:
    - Request method, path, and headers
    - Response status code
    - Request processing time
    - User ID if available from auth
    """
    
    def __init__(self, app: ASGIApp):
        """
        Initialize the middleware.
        
        Args:
            app: The ASGI application
        """
        super().__init__(app)
        self.logger = logging.getLogger('api.requests')
    
    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        """
        Process the request and log details.
        
        Args:
            request: The incoming request
            call_next: The next middleware or route handler
            
        Returns:
            The response from the application
        """
        # Start timing
        start_time = time.time()
        
        # Extract request details
        request_id = request.headers.get('X-Request-ID', 'unknown')
        method = request.method
        path = request.url.path
        client_host = request.client.host if request.client else 'unknown'
        
        # Log request
        self.logger.info(
            f"Request started: {method} {path}",
            extra={
                'extra_fields': {
                    'request_id': request_id,
                    'method': method,
                    'path': path,
                    'client_host': client_host,
                    'user_agent': request.headers.get('user-agent', 'unknown'),
                }
            }
        )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Log response
            self.logger.info(
                f"Request completed: {method} {path} - {response.status_code}",
                extra={
                    'extra_fields': {
                        'request_id': request_id,
                        'method': method,
                        'path': path,
                        'status_code': response.status_code,
                        'processing_time': round(processing_time, 3),
                        'client_host': client_host,
                    }
                }
            )
            
            # Add processing time header
            response.headers['X-Processing-Time'] = str(round(processing_time, 3))
            
            return response
            
        except Exception as e:
            # Calculate processing time
            processing_time = time.time() - start_time
            
            # Log error
            self.logger.error(
                f"Request failed: {method} {path} - {str(e)}",
                extra={
                    'extra_fields': {
                        'request_id': request_id,
                        'method': method,
                        'path': path,
                        'processing_time': round(processing_time, 3),
                        'client_host': client_host,
                        'error': str(e),
                    }
                },
                exc_info=True
            )
            raise


def configure_logging(log_level: str = "INFO") -> None:
    """
    Configure application-wide logging with JSON formatting.
    
    Sets up:
    - Root logger with JSON formatter
    - Console handler for stdout
    - Appropriate log levels for different modules
    
    Args:
        log_level: The log level to use (DEBUG, INFO, WARNING, ERROR, CRITICAL)
    """
    # Create JSON formatter
    json_formatter = JSONFormatter()
    
    # Configure console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(json_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))
    root_logger.addHandler(console_handler)
    
    # Configure specific loggers
    # API request logger
    api_logger = logging.getLogger('api.requests')
    api_logger.setLevel(logging.INFO)
    
    # Service loggers
    service_logger = logging.getLogger('app.services')
    service_logger.setLevel(logging.INFO)
    
    # Reduce noise from third-party libraries
    logging.getLogger('uvicorn.access').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)
    logging.getLogger('httpcore').setLevel(logging.WARNING)
    
    # Log that logging is configured
    root_logger.info(
        "Logging configured",
        extra={
            'extra_fields': {
                'log_level': log_level,
                'formatter': 'JSON'
            }
        }
    )


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with the specified name.
    
    This is a convenience function for getting loggers with
    consistent configuration.
    
    Args:
        name: The logger name (typically __name__)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)
