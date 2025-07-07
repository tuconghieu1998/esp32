@echo off
cd /d C:\www\ESP32\esp32

pm2 start app.js --name esp32
pm2 save

pause