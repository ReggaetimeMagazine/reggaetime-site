@echo off
cd C:\Users\coyot\Desktop\Reggaetime\reggaetime-site

echo.
echo ========================================
echo   REGGAETIME — SUBINDO ARQUIVOS
echo ========================================
echo.

echo [1/3] Adicionando todos os arquivos ao git...
git add .

echo.
echo [2/3] Fazendo commit...
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set DT=%%a
set DT=%DT:~6,2%/%DT:~4,2%/%DT:~0,4% %DT:~8,2%:%DT:~10,2%
git commit -m "update %DT%"

echo.
echo [3/3] Enviando pro GitHub...
git pull origin main --rebase
git push origin main

echo.
echo ========================================
echo   PRONTO! Ultimos commits:
echo ========================================
git log --oneline -5
echo.
pause
