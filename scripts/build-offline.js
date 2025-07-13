#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const offlineDir = path.join(rootDir, 'offline-bundle');


const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function cleanup() {
  log('Cleaning up previous builds...', 'blue');
  if (fs.existsSync(offlineDir)) {
    fs.rmSync(offlineDir, { recursive: true, force: true });
  }
  fs.mkdirSync(offlineDir, { recursive: true });
}


function buildProduction() {
  log('Building production version...', 'blue');
  try {
    execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
    log('Production build complete!', 'green');
  } catch (error) {
    log('Build failed!', 'red');
    process.exit(1);
  }
}


function createServerScript() {
  log('Creating local server script...', 'blue');
  
  const serverScript = `#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 8080;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
  let parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;
  
  // Default to index.html
  if (pathname === '/') {
    pathname = '/index.html';
  }
  
  const ext = path.parse(pathname).ext;
  const filePath = path.join(__dirname, 'dist', pathname);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Try to serve index.html for client-side routing
        fs.readFile(path.join(__dirname, 'dist', 'index.html'), (err2, data2) => {
          if (err2) {
            res.statusCode = 404;
            res.end('File not found');
          } else {
            res.setHeader('Content-Type', 'text/html');
            res.end(data2);
          }
        });
      } else {
        res.statusCode = 500;
        res.end('Server error');
      }
    } else {
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'text/plain');
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log('\\x1b[32mLighter Key Generator is running!\\x1b[0m');
  console.log('\\x1b[34mOpen your browser and visit:\\x1b[0m \\x1b[33mhttp://localhost:' + PORT + '\\x1b[0m');
  console.log('\\x1b[90mPress Ctrl+C to stop the server\\x1b[0m');
});
`;

  fs.writeFileSync(path.join(offlineDir, 'server.js'), serverScript);
}

function createStartScripts() {
  log('Creating start scripts...', 'blue');
  
 
  const windowsScript = `@echo off
echo Starting Lighter Key Generator...
node server.js
pause
`;
  
 
  const unixScript = `#!/bin/bash
echo "Starting Lighter Key Generator..."
node server.js
`;
  
  fs.writeFileSync(path.join(offlineDir, 'start-windows.bat'), windowsScript);
  fs.writeFileSync(path.join(offlineDir, 'start-mac-linux.sh'), unixScript);
  
  
  if (process.platform !== 'win32') {
    fs.chmodSync(path.join(offlineDir, 'start-mac-linux.sh'), '755');
  }
}


function createReadme() {
  log('Creating README...', 'blue');
  
  const readme = `# Lighter Key Generator - Offline Version

This is the offline version of the Lighter Key Generator. You can run this application locally on your computer for enhanced security.

## Security Benefits

- Application runs locally on your computer
- Your private keys never leave your computer
- No tracking or analytics
- Full control over your key generation environment

Note: Internet connection is still required for API calls to Lighter's servers (checking accounts, submitting transactions, etc.)

## How to Use

### Prerequisites
You need Node.js installed on your computer. If you don't have it:
- Download from: https://nodejs.org/
- Choose the LTS version
- Follow the installation instructions for your operating system

### Running the Application

#### Windows:
1. Double-click on \`start-windows.bat\`
2. Your browser will open automatically
3. If not, open your browser and go to: http://localhost:8080

#### Mac/Linux:
1. Open Terminal in this folder
2. Run: \`./start-mac-linux.sh\`
3. Your browser will open automatically
4. If not, open your browser and go to: http://localhost:8080

### Alternative Method (All Platforms):
1. Open Terminal/Command Prompt in this folder
2. Run: \`node server.js\`
3. Open your browser and go to: http://localhost:8080

## Important Notes

- This application runs entirely on your local computer
- Keep this folder secure - it contains the application files
- You can move this folder anywhere on your computer
- Internet connection is required for Lighter API operations
- To stop the server, press Ctrl+C in the terminal

## Security Recommendations

1. Run this on a secure, malware-free computer
2. Verify you're connecting to legitimate Lighter API endpoints
3. Store your generated keys securely
4. Never share your private keys with anyone
5. Consider using a dedicated computer for key generation

## Files Included

- \`dist/\` - The application files
- \`server.js\` - Local web server
- \`start-windows.bat\` - Windows starter script
- \`start-mac-linux.sh\` - Mac/Linux starter script
- \`README.md\` - This file

## Support

For issues or questions, visit: https://github.com/yeule0/lighter-web-keygen
`;
  
  fs.writeFileSync(path.join(offlineDir, 'README.md'), readme);
}


function copyDistFiles() {
  log('Copying built files...', 'blue');
  const targetDistDir = path.join(offlineDir, 'dist');
  fs.cpSync(distDir, targetDistDir, { recursive: true });
}


async function createZipArchive() {
  log('Creating ZIP archive...', 'blue');
  
  const zipPath = path.join(rootDir, 'lighter-keygen-offline.zip');
  const publicZipPath = path.join(rootDir, 'public', 'lighter-keygen-offline.zip');
  
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      log(`ZIP archive created: lighter-keygen-offline.zip (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`, 'green');
      
      
      if (fs.existsSync(path.join(rootDir, 'public'))) {
        fs.copyFileSync(zipPath, publicZipPath);
        log('Copied ZIP to public directory for serving', 'green');
      }
      
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    archive.directory(offlineDir, false);
    archive.finalize();
  });
}


async function main() {
  log('Building Lighter Key Generator Offline Bundle', 'bright');
  log('================================================\n', 'bright');
  
  try {
    cleanup();
    buildProduction();
    copyDistFiles();
    createServerScript();
    createStartScripts();
    createReadme();
    await createZipArchive();
    
    log('\nBuild complete!', 'green');
    log('Offline bundle created: lighter-keygen-offline.zip', 'green');
    log('Offline files available in: offline-bundle/', 'green');
  } catch (error) {
    log(`\nBuild failed: ${error.message}`, 'red');
    process.exit(1);
  }
}


main();