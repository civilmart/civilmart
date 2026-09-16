@echo off
cd /d D:\WD\civilmart
if exist ".next" rd /s /q ".next"
if exist "node_modules\.cache" rd /s /q "node_modules\.cache"
npx prisma generate
echo GEN_DONE
