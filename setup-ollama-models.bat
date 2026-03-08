@echo off
REM Ollama Model Management Script
REM Usage: setup-ollama-models.bat <command> [model-name]
REM Commands: list, run, create

setlocal enabledelayedexpansion

set OLLAMA=D:\Users\CASE\AppData\Local\Programs\Ollama\ollama.exe

if "%~1"=="" goto :showmenu
if "%~1"=="list" goto :listmodels
if "%~1"=="run" goto :runmodel
if "%~1"=="create" goto :createmodel

echo Unknown command: %~1
goto :showmenu

:showmenu
echo ========================================
echo Ollama Model Management
echo ========================================
echo.
echo Usage: setup-ollama-models.bat ^<command^> [model-name]
echo.
echo Commands:
echo   list              - List all available models
echo   run ^<model^>       - Run a model interactively
echo   create ^<name^> ^<path^> - Create model from GGUF file
echo.
echo Already installed models:
%OLLAMA% list
exit /b 0

:listmodels
echo ========================================
echo Available Ollama Models
echo ========================================
%OLLAMA% list
exit /b 0

:runmodel
if "%~2"=="" (
    echo Usage: setup-ollama-models.bat run ^<model-name^>
    exit /b 1
)
echo Running model: %~2
%OLLAMA% run %~2
exit /b 0

:createmodel
if "%~2"=="" (
    echo Usage: setup-ollama-models.bat create ^<model-name^> ^<gguf-path^>
    exit /b 1
)
if "%~3"=="" (
    echo ERROR: Please provide path to GGUF file
    exit /b 1
)
if not exist "%~3" (
    echo ERROR: File not found: %~3
    exit /b 1
)

set MODEL_NAME=%~2
set MODEL_PATH=%~3

echo ========================================
echo Creating model: %MODEL_NAME%
echo ========================================
echo Model path: %MODEL_PATH%

set MODELFILE=%~dp0Modelfile.%MODEL_NAME%
echo FROM %MODEL_PATH% > "%MODELFILE%"

echo Creating Modelfile: %MODELFILE%
echo Building model in Ollama...
%OLLAMA% create %MODEL_NAME% -f "%MODELFILE%"

if errorlevel 1 (
    echo.
    echo ERROR: Failed to create model
    exit /b 1
)

echo.
echo SUCCESS: Model '%MODEL_NAME%' created!
exit /b 0
