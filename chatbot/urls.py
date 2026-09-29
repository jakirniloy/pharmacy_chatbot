from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('api/chat/stream/', views.chat_stream, name='chat_stream'),
    path('api/chat/', views.chat_sync, name='chat_sync'),
    path('api/health/', views.health, name='health'),
]
