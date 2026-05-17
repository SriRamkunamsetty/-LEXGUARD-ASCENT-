import logging
import asyncio
from typing import Any, Dict, Optional
from tenacity import retry, wait_exponential, stop_after_attempt, retry_if_exception_type
from google.genai import Client
from google.genai.errors import APIError
from app.core.exceptions import AIProcessingError

logger = logging.getLogger(__name__)

# Reusable safe wrapper for AI calls
class GeminiAIWrapper:
    def __init__(self, project_id: str, location: str):
        # Assumes ADC (Application Default Credentials) are set via Cloud Run env
        self.client = Client(vertexai=True, project=project_id, location=location)

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=10),
        stop=stop_after_attempt(3),
        retry=retry_if_exception_type(APIError),
        reraise=True
    )
    async def safe_generate_content(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        model: str = "gemini-2.5-pro",
        temperature: float = 0.1,
        response_schema: Optional[Any] = None
    ) -> str:
        """
        Enterprise-grade generation wrapper.
        Includes automatic retry for transient API errors, structured logging, 
        and strict temperature control for factual legal reasoning.
        """
        try:
            logger.info("Initiating Gemini generation", extra={"model": model})
            
            config = {}
            if system_instruction:
                config["system_instruction"] = system_instruction
            if temperature is not None:
                config["temperature"] = temperature
            if response_schema:
                config["response_mime_type"] = "application/json"
                config["response_schema"] = response_schema

            # Async call execution
            # Note: adapt based on synchronous or async google.genai methods
            # Here assuming we wrap the sync call in an executor if async is not directly available, 
            # but newer genai SDK provides async client support.
            response = await asyncio.to_thread(
                self.client.models.generate_content,
                model=model,
                contents=prompt,
                config=config,
            )
            
            logger.info("Successfully generated AI sequence")
            return response.text
            
        except APIError as e:
            logger.error("Gemini API Transient Error", extra={"error_details": str(e)})
            raise
        except Exception as e:
            logger.exception("Unexpected AI processing error")
            raise AIProcessingError(
                message="Failed to process document through the AI orchestrator.",
                details={"raw_error": str(e)}
            )
