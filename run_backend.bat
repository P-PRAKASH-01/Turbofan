@echo off
echo ========================================================
echo   ENGINE-TWIN: Starting FastAPI Diagnostic Model Backend
echo ========================================================
echo.
echo Host: http://127.0.0.1:8000
echo Docs: http://127.0.0.1:8000/docs
echo Health: http://127.0.0.1:8000/api/health
echo.
python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
pause
