@echo off
cd /d C:\Users\coyot\Desktop\Reggaetime\reggaetime-site

echo.
echo ========================================
echo   REGGAETIME - SUBINDO ARQUIVOS
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
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH:mm"') do set VER=%%i
git commit -m "update %VER%"

echo.
echo [4/4] Enviando pro GitHub...
git pull origin main --no-rebase --no-edit
if errorlevel 1 (
  echo.
  echo ERRO no pull. Resolva o conflito e rode de novo.
  pause
  exit /b 1
)
git push origin main
if errorlevel 1 (
  echo.
  echo ERRO no push. Verifique conexao e permissoes.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   PRONTO! Versao %VER% enviada.
echo   Aguarde ~60s e abra o site (Ctrl+Shift+R).
echo ========================================
echo.
git log --oneline -3
echo.
pause
