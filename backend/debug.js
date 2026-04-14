// debug_server.js
// Copy this into your backend/ folder and run: node debug_server.js
// It will show EXACTLY what is failing

console.log('=== BACKEND STARTUP DEBUG ===\n');

// Test 1: Core packages
const packages = ['express','cors','mongoose','bcryptjs','jsonwebtoken','multer','dotenv'];
for (const p of packages) {
  try { require(p); console.log(`Package OK: ${p}`); }
  catch(e) { console.log(`Package MISSING: ${p} → ${e.message}`); }
}

console.log('');

// Test 2: Each route file individually
const path = require('path');
const routes = [
  './routes/authRoutes',
  './routes/eventRoutes', 
  './routes/registrationRoutes',
  './routes/notificationRoutes',
];

for (const r of routes) {
  try {
    const mod = require(path.join(__dirname, r));
    console.log(`Route loads OK: ${r}`);
  } catch(e) {
    console.log(`Route CRASH: ${r}`);
    console.log(`   Error: ${e.message}`);
    console.log(`   Stack: ${e.stack.split('\n').slice(0,4).join('\n   ')}`);
  }
}

console.log('');

// Test 3: Each controller individually
const controllers = [
  './controllers/authController',
  './controllers/registrationController',
];
for (const c of controllers) {
  try {
    require(path.join(__dirname, c));
    console.log(`Controller loads OK: ${c}`);
  } catch(e) {
    console.log(`Controller CRASH: ${c}`);
    console.log(`   Error: ${e.message}`);
  }
}

console.log('');

// Test 4: Each model individually
const models = ['./models/User','./models/Event','./models/Registration','./models/Notification'];
for (const m of models) {
  try {
    require(path.join(__dirname, m));
    console.log(`Model loads OK: ${m}`);
  } catch(e) {
    console.log(`Model CRASH: ${m}`);
    console.log(`   Error: ${e.message}`);
  }
}

console.log('\n=== END DEBUG ===');