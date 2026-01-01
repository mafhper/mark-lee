
import { execSync, spawn } from 'child_process';
import os from 'os';
import fs from 'fs';

const COLORS = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    bold: "\x1b[1m"
};

const platform = os.platform();

function log(color, msg) {
    console.log(`${color}${msg}${COLORS.reset}`);
}

function checkCommand(cmd) {
    try {
        execSync(cmd, { stdio: 'ignore' });
        return true;
    } catch (e) {
        return false;
    }
}

async function runCommand(cmd, args) {
    return new Promise((resolve, reject) => {
        console.log(`${COLORS.dim}> ${cmd} ${args.join(' ')}${COLORS.reset}`);
        const child = spawn(cmd, args, { stdio: 'inherit', shell: true });
        child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

async function installRust() {
    log(COLORS.cyan, "📦 Installing Rust...");
    if (platform === 'win32') {
        await runCommand('winget', ['install', '-e', '--id', 'Rustlang.Rustup']);
    } else {
        await runCommand('curl', ['--proto', "'=https'", '--tlsv1.2', '-sSf', 'https://sh.rustup.rs', '|', 'sh', '-s', '--', '-y']);
    }
}

async function installBuildTools() {
    log(COLORS.cyan, "📦 Installing Build Tools...");
    if (platform === 'win32') {
        log(COLORS.yellow, "⚠️  This will install Visual Studio Build Tools. It may require Admin privileges and take a while.");
        // Installing "Desktop development with C++" workload
        const installArgs = [
            'install', '-e', '--id', 'Microsoft.VisualStudio.2022.BuildTools',
            '--override', '"--passive --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"'
        ];
        try {
            await runCommand('winget', installArgs);
        } catch (e) {
            log(COLORS.red, "❌ Failed to install Build Tools via winget.");
            log(COLORS.yellow, "Please install manually: https://visualstudio.microsoft.com/visual-cpp-build-tools/");
        }
    } else if (platform === 'linux') {
        await runCommand('sudo', ['apt-get', 'update']);
        await runCommand('sudo', ['apt-get', 'install', '-y', 'build-essential', 'libwebkit2gtk-4.0-dev', 'libappindicator3-dev', 'librsvg2-dev', 'patchelf']);
    } else if (platform === 'darwin') {
        await runCommand('xcode-select', ['--install']);
    }
}

async function main() {
    console.clear();
    log(COLORS.bold, "🛠️  Mark-Lee System Verification\n");

    let missingRequirements = false;

    // 1. Check Node.js
    if (checkCommand('node --version')) {
        log(COLORS.green, "✅ Node.js detected");
    } else {
        log(COLORS.red, "❌ Node.js is missing (Required)");
        missingRequirements = true;
    }

    // 2. Check Rust
    if (checkCommand('rustc --version')) {
        log(COLORS.green, "✅ Rust detected");
    } else {
        log(COLORS.yellow, "⚠️  Rust is missing");
        try {
            await installRust();
            log(COLORS.green, "✅ Rust installed (Please restart terminal after setup)");
        } catch (e) {
            log(COLORS.red, "❌ Failed to install Rust automatically.");
            missingRequirements = true;
        }
    }

    // 3. Check Build Tools (Rough check)
    // On Windows, checking for link.exe is tricky without VS env. 
    // We'll check if cargo fails a basic check or just assume if on Win32.
    if (platform === 'win32') {
        // Check if 'cl' or 'link' is available? Usually not in PATH unless dev prompt.
        // Basic heuristic: check default path or rely on user.
        // Let's rely on standard path existence or just prompt.
        const defaultPath = "C:\\Program Files (x86)\\Microsoft Visual Studio";
        // Correct check strictly is hard. Let's try to run the install command with --list/status or validwing check.
        // Simpler: Just ask 'winget' if it's installed.
        try {
            execSync('winget list Microsoft.VisualStudio.2022.BuildTools', { stdio: 'ignore' });
            log(COLORS.green, "✅ Visual Studio Build Tools detected (via winget)");
        } catch (e) {
            log(COLORS.yellow, "⚠️  Visual Studio Build Tools not detected");
            await installBuildTools();
        }
    }

    console.log("\n--------------------------------");
    if (missingRequirements) {
        log(COLORS.red, "❌ Setup incomplete. Please fix errors above.");
        process.exit(1);
    } else {
        log(COLORS.green, "✅ System appears ready!");
        log(COLORS.cyan, "Run `npm run tauri dev` to start.");
    }
}

main();
