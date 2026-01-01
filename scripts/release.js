
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COLORS = {
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    reset: "\x1b[0m",
    bold: "\x1b[1m"
};

async function updateTauriConfig(newVersion) {
    const tauriConfigPath = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
    try {
        const content = await fs.readFile(tauriConfigPath, 'utf8');
        const config = JSON.parse(content);
        config.version = newVersion;
        config.productName = "Mark-Lee"; // Ensure name is correct
        await fs.writeFile(tauriConfigPath, JSON.stringify(config, null, 2));
        console.log(`${COLORS.green}✔ Updated tauri.conf.json to version ${newVersion}${COLORS.reset}`);
    } catch (err) {
        console.error(`${COLORS.red}✘ Failed to update tauri.conf.json${COLORS.reset}`, err);
        process.exit(1);
    }
}

async function updatePackageJson(newVersion, type) {
    try {
        // We use npm version to update package.json, which also handles git tag if configured
        // But here we want more granular control, so we might just run the command
        await execAsync(`npm version ${type} --no-git-tag-version`);

        // Read the new version
        const pkgPath = path.join(__dirname, '..', 'package.json');
        const pkgData = JSON.parse(await fs.readFile(pkgPath, 'utf8'));
        return pkgData.version;
    } catch (err) {
        console.error(`${COLORS.red}✘ Failed to update package.json${COLORS.reset}`, err);
        process.exit(1);
    }
}

async function updateChangeLog(version) {
    const logPath = path.join(__dirname, '..', 'docs', 'plan', 'change.log');
    const date = new Date().toISOString().split('T')[0].replace(/-/g, '/');
    const newEntry = `\n[${date} - v${version}]\nReleased version v${version}.\n`;

    try {
        const content = await fs.readFile(logPath, 'utf8');
        await fs.writeFile(logPath, newEntry + content);
        console.log(`${COLORS.green}✔ Prepended to docs/plan/change.log${COLORS.reset}`);
    } catch (err) {
        console.warn(`${COLORS.yellow}⚠ Could not update change.log (file might not exist)${COLORS.reset}`);
    }
}

async function main() {
    const args = process.argv.slice(2);
    const type = args[0] || 'patch'; // patch, minor, major

    if (!['patch', 'minor', 'major'].includes(type)) {
        console.error(`${COLORS.red}Invalid version type. Use: patch, minor, or major${COLORS.reset}`);
        process.exit(1);
    }

    console.log(`${COLORS.bold}🚀 Automating Release: ${type}${COLORS.reset}\n`);

    // 1. Update package.json
    const newVersion = await updatePackageJson(null, type);
    console.log(`${COLORS.green}✔ package.json updated to ${newVersion}${COLORS.reset}`);

    // 2. Update tauri.conf.json
    await updateTauriConfig(newVersion);

    // 3. Update ChangeLog
    await updateChangeLog(newVersion);

    console.log(`\n${COLORS.bold}Next Steps:${COLORS.reset}`);
    console.log(`1. Review changes in ${COLORS.yellow}docs/plan/change.log${COLORS.reset}`);
    console.log(`2. Commit changes: ${COLORS.yellow}git add . && git commit -m "chore: release v${newVersion}"${COLORS.reset}`);
    console.log(`3. Tag release: ${COLORS.yellow}git tag v${newVersion}${COLORS.reset}`);
    console.log(`4. Push: ${COLORS.yellow}git push && git push --tags${COLORS.reset}`);
}

main();
