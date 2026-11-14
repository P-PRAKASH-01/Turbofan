Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ENGINE-TWIN: Starting FastAPI Diagnostic Model Backend" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Host:   http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "Docs:   http://127.0.0.1:8000/docs" -ForegroundColor Yellow
Write-Host "Health: http://127.0.0.1:8000/api/health" -ForegroundColor Gray
Write-Host ""

python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000
