@echo off
title IF Tech Life Ops - Compilador Executavel
echo ========================================================
echo  IF TECH LIFE OPS // COMPILADOR DE EXECUTAVEL (.EXE)
echo ========================================================
echo.
echo [1/3] Limpando compilações anteriores (build e dist)...
if exist build rd /s /q build
if exist dist rd /s /q dist
if exist IFTech_LifeOps.spec del /q IFTech_LifeOps.spec

echo.
echo [2/3] Compilando executavel nativo via PyInstaller...
pyinstaller --noconsole --onefile --name "IFTech_LifeOps" --collect-all customtkinter main.py

if errorlevel 1 (
    echo.
    echo [ERRO] Falha durante a compilação! Verifique os erros acima.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo  SUCESSO! O executavel foi gerado em:
echo  dist\IFTech_LifeOps.exe
echo ========================================================
echo.
pause
