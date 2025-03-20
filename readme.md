=======Mở port PowerShell Admin
New-NetFirewallRule -DisplayName "Allow Node.js" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

=====start server
pm2 start app.js --name esp32
pm2 save

======Xem logs
pm2 logs esp32

=====Restart server:
pm2 restart esp32

=====Xem list server
pm2 list

====Auto script:
@echo off
cd /d C:\www\ESP32\esp32

echo Pulling latest code from Git...
git pull origin master

echo Installing dependencies...
npm install

echo Restarting server with PM2...
pm2 restart myapp

echo Done!
pause

==== Stop and Restart
pm2 stop esp32
pm2 delete esp32
pm2 start app.js --name esp32
pm2 save


4. Set Up IIS for Deployment

Step 1: Install IIS & Reverse Proxy
Open Control Panel → Programs → Turn Windows features on or off.
Check Internet Information Services (IIS) and Application Request Routing (ARR).
Click OK and restart your system.

Step 2: Create an IIS Website
Open IIS Manager (inetmgr).
Right-click Sites → Add Website.
Set:
Site Name: MyExpressApp
Physical Path: Path to your Express app
Port: 8080 (or another available port)
Click OK.

Step 3: Set Up Reverse Proxy
Open URL Rewrite in IIS.
Click Add Rules → Reverse Proxy.
Set Destination to: http://localhost:3000
Click Apply.

5. Run the App as a Windows Service

- Install pm2-windows-service:
npm install -g pm2 pm2-windows-service
pm2-service-install

Then, start your app:
pm2 start server.js --name myapp
pm2 save

Restart your system and check if the app runs automatically:
pm2 list

SQL Server
- Enable Properties>Security>SQL Server and Windows Mode
- Open SQL Config Manager > Enable TCP/IP > Restart