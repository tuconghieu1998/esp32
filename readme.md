Enable npm install - Open PowerShell as Admin
Set-ExecutionPolicy RemoteSigned 
=======Mở port PowerShell Admin
New-NetFirewallRule -DisplayName "Allow Node.js" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow

1. Install dependencies
npm install

2. Run local
npm start

3. Deploy
+ npm install -g pm2 pm2-windows-service
+ Set Path: C:\Users\<USER_NAME>\AppData\Roaming\npm 

=====start server
pm2 start app.js --name esp32
pm2 save

======Xem logs
pm2 logs esp32

=====Restart server:
pm2 restart esp32

=====Xem list server
pm2 list

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

5. SQL Server
- Enable Properties>Security>SQL Server and Windows Mode
- Open SQL Config Manager > Enable TCP/IP > Restart

6. Check port
netstat -ano | findStr "port_number"