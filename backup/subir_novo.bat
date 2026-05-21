@echo off
cd C:\Users\coyot\Desktop\Reggaetime\reggaetime-site

echo.
echo ========================================
echo   REGGAETIME — SUBINDO ARQUIVOS
echo ========================================
echo.

REM Gera versao com data/hora atual
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMddHHmm"') do set VER=%%i
echo Versao: %VER%
echo.

REM Injeta a versao no index.html — forca GitHub Pages a servir JSON novo
echo Atualizando versao no index.html...
powershell -NoProfile -Command "$c=[IO.File]::ReadAllText('index.html'); $c=$c -replace 'v=\d{12}','v=%VER%'; [IO.File]::WriteAllText('index.html',$c)"

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
git commit -m "update %VER%"

echo.
echo [4/4] Enviando pro GitHub...
git pull origin main --no-rebase
if errorlevel 1 (
  echo ERRO no pull.
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
echo   PRONTO! Versao %VER% no ar.
echo   Aguarde 60s e abra o site.
echo ========================================
echo.
pause
