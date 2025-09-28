@echo off
setlocal
REM Ensure UTF-8 to avoid mojibake on Windows terminals
chcp 65001 >NUL
echo Running tarot-adviser tests...
set SCRIPT_DIR=%~dp0
node "%SCRIPT_DIR%run-sample.js" || goto :err
node "%SCRIPT_DIR%test-cache.js" || goto :err
node "%SCRIPT_DIR%test-invalid-json.js" || goto :err
node "%SCRIPT_DIR%test-schema-mismatch.js" || goto :err
echo All tests passed.
exit /b 0
:err
echo A test failed. See output above.
exit /b 1
