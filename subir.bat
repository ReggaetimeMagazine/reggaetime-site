@echo off
cd C:\Users\coyot\Desktop\Reggaetime\reggaetime-site

echo.
echo ========================================
echo   REGGAETIME — SUBINDO ARQUIVOS
echo ========================================
echo.

echo [1/4] Adicionando todos os arquivos ao git...
git add .

echo.
echo [2/4] Fazendo commit...
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set DT=%%a
set DT=%DT:~6,2%/%DT:~4,2%/%DT:~0,4% %DT:~8,2%:%DT:~10,2%
git commit -m "update %DT%"

echo.
echo [3/4] Baixando atualizacoes do servidor (merge simples)...
git pull origin main --no-rebase
if errorlevel 1 (
  echo.
  echo [ERRO] Conflito ao fazer pull. Resolva o conflito e tente de novo.
  pause
  exit /b 1
)

echo.
echo [4/4] Enviando pro GitHub...
git push origin main
if errorlevel 1 (
  echo.
  echo [ERRO] Push falhou. Verifique sua conexao e permissoes.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   PRONTO! Aguarde ~60s para o site
echo   atualizar no GitHub Pages.
echo   Ultimos commits:
echo ========================================
git log --oneline -5
echo.
echo DICA: Se o site demorar, limpe o cache
echo do browser com Ctrl+Shift+R
echo.
pause
