// check_backend.js - run this: node check_backend.js
// It checks if your backend files are correct WITHOUT starting the server

const fs   = require('fs');
const path = require('path');

const checks = [
  // [file, must contain string, description]
  ['server.js',                        "require('./routes/notificationRoutes')", 'server.js mounts notificationRoutes'],
  ['server.js',                        "require('./routes/authRoutes')",          'server.js mounts authRoutes'],
  ['routes/authRoutes.js',             "authController.registerUser",             'authRoutes uses authController'],
  ['controllers/authController.js',    "bcrypt.hash",                             'authController hashes passwords'],
  ['controllers/authController.js',    "bcrypt.compare",                          'authController compares passwords'],
  ['controllers/authController.js',    "walletBalance",                           'authController returns walletBalance'],
  ['routes/authRoutes.js',             "wallet",                                  'authRoutes has wallet endpoint'],
  ['routes/notificationRoutes.js',     "mark-all-read",                           'notificationRoutes has mark-all-read'],
  ['routes/registrationRoutes.js',     "bulk-status",                             'registrationRoutes has bulk-status BEFORE /:id'],
  ['controllers/registrationController.js', "eventId",                            'registrationController uses eventId field'],
  ['models/User.js',                   "walletBalance",                           'User model has walletBalance'],
  ['models/Registration.js',           "hasFeedback",                             'Registration model has hasFeedback'],
];

// Check for express-validator (the bug that started all this)
const badChecks = [
  ['controllers/authController.js', "express-validator", 'authController must NOT use express-validator'],
];

let allOk = true;
console.log('Checking backend files...\n');

for (const [file, str, desc] of checks) {
  const fp = path.join(__dirname, file);
  if (!fs.existsSync(fp)) {
    console.log(`MISSING FILE: ${file}`);
    allOk = false;
    continue;
  }
  const content = fs.readFileSync(fp, 'utf8');
  if (content.includes(str)) {
    console.log(`${desc}`);
  } else {
    console.log(`FAIL: ${desc}\n   File: ${file}\n   Expected to contain: "${str}"`);
    allOk = false;
  }
}

console.log('');
for (const [file, str, desc] of badChecks) {
  const fp = path.join(__dirname, file);
  if (!fs.existsSync(fp)) continue;
  const content = fs.readFileSync(fp, 'utf8');
  if (!content.includes(str)) {
    console.log(`${desc}`);
  } else {
    console.log(`FAIL: ${desc}\n   File has: "${str}" - THIS IS THE BUG`);
    allOk = false;
  }
}

console.log('');
if (allOk) {
  console.log('All checks passed! Your backend files are correct.');
  console.log('   Run: npm run dev');
  console.log('   Then test: http://localhost:5000/api/test');
} else {
  console.log('Some files are wrong. Replace them with the correct versions.');
}