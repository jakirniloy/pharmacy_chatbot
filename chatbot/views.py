import json
from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from .groq_service import stream_pharmacy_response, get_pharmacy_response_sync, MODEL_NAME

def index(request):
    """
    Renders the main chat user interface.
    """
    context = {
        "model_name": MODEL_NAME,
        "author_name": "Jakir Hossain Niloy",
        "author_url": "https://jakirniloy.github.io/",
        "author_img": "https://res.cloudinary.com/eac9fvys/image/upload/v1785865579/portfolio/images/ChatGPT-Image-May-16--2026--03-21-45-PM-1785865578469-88347923.png"
    }
    return render(request, "index.html", context)

@csrf_exempt
def chat_stream(request):
    """
    Streaming SSE endpoint for real-time AI response delivery.
    """
    if request.method != "POST":
        return HttpResponseBadRequest("Method not allowed. Use POST.")

    try:
        body = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseBadRequest("Invalid JSON body.")

    user_message = body.get("message", "").strip()
    history = body.get("history", [])

    if not user_message:
        return HttpResponseBadRequest("Message cannot be empty.")

    response = StreamingHttpResponse(
        stream_pharmacy_response(user_message, history),
        content_type="text/event-stream"
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response

@csrf_exempt
def chat_sync(request):
    """
    Synchronous fallback endpoint for non-streaming clients.
    """
    if request.method != "POST":
        return HttpResponseBadRequest("Method not allowed. Use POST.")

    try:
        body = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponseBadRequest("Invalid JSON body.")

    user_message = body.get("message", "").strip()
    history = body.get("history", [])

    if not user_message:
        return HttpResponseBadRequest("Message cannot be empty.")

    answer = get_pharmacy_response_sync(user_message, history)
    return JsonResponse({"response": answer})

def health(request):
    """
    Service health check endpoint.
    """
    return JsonResponse({
        "status": "healthy",
        "service": "MediCare Pharmacy Assistant",
        "model": MODEL_NAME,
        "framework": "Django 6.1.1"
    })
