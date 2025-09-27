@echo off
setlocal
echo Running tarot-adviser tests...
node doc\tarot-adviser-test\run-sample.js || goto :err
node doc\tarot-adviser-test\test-cache.js || goto :err
node doc\tarot-adviser-test\test-invalid-json.js || goto :err
echo All tests passed.
exit /b 0
:err
echo A test failed. See output above.
exit /b 1

