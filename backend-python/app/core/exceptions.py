from typing import Any, Dict, Optional

class LexGuardException(Exception):
    """Base exception for all LEXGUARD custom errors."""
    def __init__(self, message: str, status_code: int = 500, error_code: str = "INTERNAL_ERROR", details: Optional[Dict[str, Any]] = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)

class AIProcessingError(LexGuardException):
    """Raised when the AI model fails, timeouts, or returns unparseable output."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=502,
            error_code="AI_PROCESSING_FAILURE",
            details=details
        )

class AuthenticationError(LexGuardException):
    """Raised when JWT validation fails or user is unauthorized."""
    def __init__(self, message: str = "Authentication failed."):
        super().__init__(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED"
        )

class ValidationError(LexGuardException):
    """Raised when input validation fails (beyond standard Pydantic errors)."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="VALIDATION_FAILED",
            details=details
        )
