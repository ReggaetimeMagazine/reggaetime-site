@echo off
cd C:\Users\coyot\Desktop\Reggaetime\reggaetime-site

echo.
echo ========================================
echo   REGGAETIME — SUBINDO ARQUIVOS
echo ========================================
echo.

REM Gera versao com timestamp
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format \"yyyyMMddHHmm\""') do set VER=%%i

echo [1/5] Versao: %VER%

REM Renomeia o noticias.json para noticias.json mas injeta versao no index.html
REM O truque: muda o ?v= hardcoded no index.html pra forcar GitHub Pages a servir novo
echo [2/5] Atualizando versao no index.html...
powershell -NoProfile -Command "(Get-Content index.html -Raw) -replace 'noticias\.json\?v=[^''\"&]+', 'noticias.json?v=%VER%' | Set-Content index.html -NoNewline"

echo [3/5] Adicionando arquivos ao git...
git add .

echo.
echo Verificando mudancas...
git diff --cached --quiet
if not errorlevel 1 (
  echo Nenhuma mudanca detectada! Verifique se colou o noticias.json novo em data\
  pause
  exit /b 0
)

echo [4/5] Fazendo commit...
git commit -m "update %VER%"

echo.
echo [5/5] Enviando pro GitHub...
git pull origin main --no-rebase
git push origin main

echo.
echo ========================================
echo   PRONTO! Site atualiza em ~60s.
echo   Versao forcada: %VER%
echo ========================================
git log --oneline -3
echo.
pause
