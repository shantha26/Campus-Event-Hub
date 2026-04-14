const { spawn } = require('child_process');
const fs = require('fs');
const logStream = fs.createWriteStream('full_startup.log');

const child = spawn('node', ['server.js']);

child.stdout.pipe(logStream);
child.stderr.pipe(logStream);

child.on('exit', (code) => {
  logStream.write(`\nChild process exited with code ${code}\n`);
  logStream.end();
  process.exit(code);
});
