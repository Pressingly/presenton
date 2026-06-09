from fastapi import HTTPException
from anthropic import APIError as AnthropicAPIError
from openai import APIError as OpenAIAPIError
from google.genai.errors import APIError as GoogleAPIError
import traceback


def handle_llm_client_exceptions(e: Exception) -> HTTPException:
    traceback.print_exc()
    if isinstance(e, HTTPException):
        return e
    if isinstance(e, OpenAIAPIError):
        error_body = getattr(e, "body", None) or {}
        error_obj = error_body.get("error", {}) if isinstance(error_body, dict) else {}
        error_type = error_obj.get("type", "") if isinstance(error_obj, dict) else ""
        if error_type == "budget_exceeded" or "ExceededBudget" in str(getattr(e, "message", "")):
            return HTTPException(
                status_code=402,
                detail="Your API key has exceeded its budget limit. Please add credits to your account to continue.",
            )
        return HTTPException(status_code=500, detail=f"API error: {e.message}")
    if isinstance(e, GoogleAPIError):
        return HTTPException(status_code=500, detail=f"Google API error: {e.message}")
    if isinstance(e, AnthropicAPIError):
        return HTTPException(
            status_code=500, detail=f"Anthropic API error: {e.message}"
        )
    return HTTPException(status_code=500, detail=f"LLM API error: {e}")
