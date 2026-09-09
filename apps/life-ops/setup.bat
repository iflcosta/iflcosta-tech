@echo off
title IF Tech Life Ops - Instalador de Dependencias
echo ========================================================
echo  IF TECH LIFE OPS // INSTALADOR DE DEPENDENCIAS
echo ========================================================
echo.
echo [1/2] Verificando instalacao do Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Python nao encontrado no PATH! Por favor, instale o Python 3.10+.
    pause
    exit /b 1
)

echo [2/2] Instalando customtkinter, pillow e pyinstaller...
pip install -r requirements.txt
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias.
    pause
    exit /b 1
)

echo.
echo ========================================================
echo  SUCESSO! Ambiente configurado com sucesso.
echo  Para rodar o app, execute: python main.py
echo  Para compilar o .exe, execute: compile.bat
echo ========================================================
echo.
pause
