# 🌿 MediCare Pharmacy Assistant (Django + Groq AI)

An AI-powered digital pharmacy chatbot with a responsive web interface built using **Django** and powered by **Groq** (`openai/gpt-oss-120b`).

## ✨ Key Features
- **Pharmacy & Medication Guidance**: Explains medicine usage, side effects, precautions, common symptoms, and interaction warnings.
- **Safety Safeguards**:
  - Never makes definitive diagnoses or prescribes prescription drugs.
  - Warns about high-risk profiles (pregnancy, elderly, children, allergies).
  - Built-in Emergency Warning banner & modal with emergency helpline advice.
- **Modern Web Interface**:
  - Medical Glassmorphism theme (Dark / Light mode support).
  - Real-time token streaming via Server-Sent Events (SSE).
  - Rich Markdown parsing with bold terms, bullet points, and dosage notices.
  - One-click copy & Text-to-Speech (TTS) voice readout.
  - Voice-to-Text input (Microphone button).
  - Quick consultation suggestion chips.
- **Creator Credit**:
  - Footer with avatar linking to [Jakir Hossain Niloy](https://jakirniloy.github.io/).

## 🚀 How to Run

### Method 1: One-Click Run
Double-click `run.bat` (or `H:\Web\run_pharmacy.bat`). It will launch the Django server and open your browser at:
`http://127.0.0.1:8000/`

### Method 2: Command Line
```powershell
cd H:\Web\pharmacy_chatbot
python manage.py runserver 127.0.0.1:8000
```
Then visit [http://127.0.0.1:8000/](http://127.0.0.1:8000/) in your browser.

## 🛠️ Configuration
- The Groq API key is configured in `medicare_project/settings.py` (or via environment variable `GROQ_API_KEY`).
- Model name can be modified in `settings.py` (default: `openai/gpt-oss-120b`).
