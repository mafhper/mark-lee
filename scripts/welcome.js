
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",

    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

const ASCII_ART = `
${COLORS.fg.cyan}
  __  __            _        _                
 |  \\/  | __ _ _ __| | __   | |    ___  ___   
 | |\\/| |/ _\` | '__| |/ /   | |   / _ \\/ _ \\  
 | |  | | (_| | |  |   <    | |__|  __/  __/  
 |_|  |_|\\__,_|_|  |_|\\_\\___|_____\\___|\\___|  
                       |_____|                
${COLORS.reset}
`;

async function main() {
    console.clear();
    console.log(ASCII_ART);

    try {
        const pkgPath = path.join(__dirname, '..', 'package.json');
        const pkgData = JSON.parse(await fs.readFile(pkgPath, 'utf8'));

        console.log(`${COLORS.bright}🚀 Starting ${pkgData.name} v${pkgData.version}${COLORS.reset}`);
        console.log(`${COLORS.dim}   ${pkgData.description}${COLORS.reset}\n`);

        console.log(`${COLORS.fg.green}✅ System Ready${COLORS.reset}`);
        console.log(`${COLORS.fg.yellow}⚡ Mode: Development${COLORS.reset}`);
        console.log(`${COLORS.fg.blue}📂 Project: ${path.resolve(__dirname, '..')}${COLORS.reset}`);
        console.log(`\n${COLORS.dim}Press Ctrl+C to stop the server${COLORS.reset}\n`);

    } catch (err) {
        console.error('Error reading package info:', err);
    }
}

main();
