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
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format \"dd/MM/yyyy HH:mm\""') do set DT=%%i
git commit -m "update %DT%"

echo.
echo [3/4] Baixando atualizacoes do servidor...
git pull origin main --no-rebase
if errorlevel 1 (
  echo.
  echo [ERRO] Conflito ao fazer pull. Resolva e tente de novo.
  pause
  exit /b 1
)

echo.
echo [4/4] Enviando pro GitHub...
git push origin main
if errorlevel 1 (
  echo.
  echo [ERRO] Push falhou. Verifique conexao e permissoes.
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
echo DICA: Se ainda aparecer versao antiga,
echo pressione Ctrl+Shift+R no navegador.
echo.
pause
