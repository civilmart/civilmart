@echo off
cd /d D:\WD\civilmart
set DATABASE_URL=__FROM_ENV__
npx next dev -p 3113
