@echo off
cd C:\Users\coyot\Desktop\Reggaetime\reggaetime-site

echo.
echo ========================================
echo   REGGAETIME — SUBINDO ARQUIVOS
echo ========================================
echo.

:: ── Copia os arquivos baixados para o projeto
echo [1/4] Copiando arquivos...

:: index.html — baixado aqui
if exist "%USERPROFILE%\Downloads\index.html" (
    copy /Y "%USERPROFILE%\Downloads\index.html" index.html
    echo     OK: index.html copiado
) else (
    echo     AVISO: index.html nao encontrado em Downloads
)

:: worker.js — baixado aqui
if exist "%USERPROFILE%\Downloads\worker.js" (
    copy /Y "%USERPROFILE%\Downloads\worker.js" worker.js
    echo     OK: worker.js copiado
) else (
    echo     AVISO: worker.js nao encontrado em Downloads (opcional)
)

:: og-image.jpg — imagem padrao do site
if exist "%USERPROFILE%\Downloads\og-image.jpg" (
    copy /Y "%USERPROFILE%\Downloads\og-image.jpg" og-image.jpg
    echo     OK: og-image.jpg copiado
) else (
    echo     AVISO: og-image.jpg nao encontrado em Downloads (opcional)
)

:: noticias.json — exportado do admin
if exist "%USERPROFILE%\Downloads\noticias.json" (
    copy /Y "%USERPROFILE%\Downloads\noticias.json" data\noticias.json
    echo     OK: noticias.json copiado
) else (
    echo     AVISO: noticias.json nao encontrado em Downloads (opcional)
)

:: admin/index.html — se tiver atualizado
if exist "%USERPROFILE%\Downloads\admin_index.html" (
    copy /Y "%USERPROFILE%\Downloads\admin_index.html" admin\index.html
    echo     OK: admin/index.html copiado
)

echo.
echo [2/4] Adicionando ao git...
git add .

echo.
echo [3/4] Fazendo commit...
:: Pega a data/hora atual pro commit
for /f "tokens=1-5 delims=/ " %%a in ("%date%") do set DT=%%a/%%b/%%c
for /f "tokens=1-2 delims=: " %%a in ("%time%") do set TM=%%a:%%b
git commit -m "update %DT% %TM%"

echo.
echo [4/4] Enviando pro GitHub...
git pull origin main --rebase
git push origin main

echo.
echo ========================================
echo   PRONTO! Ultimos commits:
echo ========================================
git log --oneline -5
echo.
pause
