@echo off
cd C:\Users\coyot\Desktop\Reggaetime\reggaetime-site

echo.
echo ========================================
echo   REGGAETIME — SUBINDO ARQUIVOS
echo ========================================
echo.

echo [1/4] Adicionando arquivos...
git add .

echo.
echo [2/4] Verificando mudancas...
git diff --cached --quiet
if not errorlevel 1 (
  echo.
  echo ATENCAO: Nenhuma mudanca detectada!
  echo Voce colou o noticias.json novo em data\ ?
  echo.
  pause
  exit /b 0
)

echo [3/4] Fazendo commit...
git commit -m "update"

echo.
echo [4/4] Enviando pro GitHub...
git pull origin main --no-rebase
if errorlevel 1 (
  echo ERRO no pull. Tente de novo.
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo ERRO no push.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   PRONTO! Aguarde 60s e abra o site.
echo   Se ainda aparecer antigo: Ctrl+Shift+R
echo ========================================
echo.
pause
