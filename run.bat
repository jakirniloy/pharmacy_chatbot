@echo off
title MediCare Pharmacy Assistant - Django Server
cd /d "%~dp0"
echo ======================================================================
echo             MediCare Pharmacy Assistant (Django App)
echo ======================================================================
echo  Developed by: Jakir Hossain Niloy
echo  Model: openai/gpt-oss-120b (Groq API)
echo  Local Server: http://127.0.0.1:8000/
echo ======================================================================
echo.
echo Starting Django Development Server...
start "" "http://127.0.0.1:8000/"
python manage.py runserver 127.0.0.1:8000
pause
