// find_server.js
// Run from your backend folder: node find_server.js
// This tells you EXACTLY which server.js node is actually loading

const path = require('path');
const fs   = require('fs');

console.log('=== SERVER LOCATION CHECK ===\n');
console.log('Current working directory:', process.cwd());
console.log('This script location:     ', __dirname);
console.log('');

// Check what server.js exists here
const serverPath = path.join(__dirname, 'server.js');
if (fs.existsSync(serverPath)) {
  const content = fs.readFileSync(serverPath, 'utf8');
  console.log('server.js found at:', serverPath);
  console.log('server.js size:', content.length, 'bytes');
  console.log('');
  
  // Check what routes it mounts
  const authLine    = content.includes("require('./routes/authRoutes')");
  const notifLine   = content.includes("require('./routes/notificationRoutes')");
  const regLine     = content.includes("require('./routes/registrationRoutes')");
  const eventLine   = content.includes("require('./routes/eventRoutes')");
  const oldChatLine = content.includes("require('./routes/chatRoutes')");
  
  console.log('Routes mounted in server.js:');
  console.log(authLine  ? '  authRoutes'         : '  authRoutes MISSING');
  console.log(notifLine ? '  notificationRoutes' : '  notificationRoutes MISSING ← THIS IS THE BUG');
  console.log(regLine   ? '  registrationRoutes' : '  registrationRoutes MISSING');
  console.log(eventLine ? '  eventRoutes'        : '  eventRoutes MISSING');
  
  if (oldChatLine) console.log('   chatRoutes is also mounted (may cause crash)');
  
  console.log('');
  
  // Show first 20 lines of server.js
  const lines = content.split('\n').slice(0, 25);
  console.log('First 25 lines of your server.js:');
  lines.forEach((l, i) => console.log(`  ${String(i+1).padStart(2)}: ${l}`));
  
} else {
  console.log('No server.js found at', serverPath);
}

// Check package.json to see what script is being run
const pkgPath = path.join(__dirname, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  console.log('\npackage.json scripts:', JSON.stringify(pkg.scripts, null, 2));
  console.log('package.json main:   ', pkg.main);
}