/**
 * ============================================================================
 * MARK-LEE ICON GENERATOR
 * ============================================================================
 * 
 * Gera todos os ícones necessários para a aplicação Tauri a partir de SVGs.
 * 
 * USO:
 *   node scripts/generate-icons.cjs [icon.svg] [light-logo.svg] [dark-logo.svg]
 * 
 * EXEMPLOS:
 *   # Usando arquivos padrão da pasta assets/
 *   node scripts/generate-icons.cjs
 *   
 *   # Fornecendo apenas o ícone principal
 *   node scripts/generate-icons.cjs meu-icone.svg
 *   
 *   # Fornecendo ícone + logos de tema
 *   node scripts/generate-icons.cjs icone.svg logo-claro.svg logo-escuro.svg
 * 
 * ARQUIVOS GERADOS:
 *   src-tauri/icons/     - Todos os ícones para build (ico, icns, pngs)
 *   public/              - Logos para uso no app (logo-bg_blk.svg, logo-bg_gray.svg)
 *   assets/              - Backup dos SVGs fonte
 * 
 * ============================================================================
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const PATHS = {
    assets: path.join(__dirname, '../assets'),
    icons: path.join(__dirname, '../src-tauri/icons'),
    public: path.join(__dirname, '../public/img'),
};

// Arquivos padrão (usados se nenhum argumento for fornecido)
const DEFAULTS = {
    icon: 'logo-icon.svg',        // Ícone principal (quadrado, simples)
    lightLogo: 'logo-bg_blk.svg', // Logo para temas claros
    darkLogo: 'logo-bg_gray.svg', // Logo para temas escuros
};

// Tamanhos de ícone para Tauri
const ICON_SIZES = {
    // Essenciais para Tauri
    tauri: [
        { name: '32x32.png', size: 32 },
        { name: '128x128.png', size: 128 },
        { name: '128x128@2x.png', size: 256 },
        { name: 'icon.png', size: 512 },
    ],
    // Windows Store
    store: [
        { name: 'Square30x30Logo.png', size: 30 },
        { name: 'Square44x44Logo.png', size: 44 },
        { name: 'Square71x71Logo.png', size: 71 },
        { name: 'Square89x89Logo.png', size: 89 },
        { name: 'Square107x107Logo.png', size: 107 },
        { name: 'Square142x142Logo.png', size: 142 },
        { name: 'Square150x150Logo.png', size: 150 },
        { name: 'Square284x284Logo.png', size: 284 },
        { name: 'Square310x310Logo.png', size: 310 },
        { name: 'StoreLogo.png', size: 50 },
    ],
};

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function log(emoji, message) {
    console.log(`${emoji}  ${message}`);
}

function logSection(title) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`  ${title}`);
    console.log(`${'─'.repeat(60)}`);
}

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log('📁', `Criado diretório: ${path.basename(dirPath)}`);
    }
}

function resolveInput(input, defaultFile) {
    if (!input) {
        // Usar arquivo padrão da pasta assets
        const defaultPath = path.join(PATHS.assets, defaultFile);
        if (fs.existsSync(defaultPath)) {
            return defaultPath;
        }
        return null;
    }

    // Verificar se é caminho absoluto ou relativo
    if (path.isAbsolute(input)) {
        return fs.existsSync(input) ? input : null;
    }

    // Tentar resolver em diferentes locais
    const candidates = [
        input,                                    // Caminho relativo ao CWD
        path.join(PATHS.assets, input),           // Na pasta assets
        path.join(PATHS.public, input),           // Na pasta public
        path.join(__dirname, '..', input),        // Na raiz do projeto
    ];

    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

// ============================================================================
// GERAÇÃO DE ÍCONES
// ============================================================================

async function generatePNGs(svgPath, outputDir, sizes) {
    for (const { name, size } of sizes) {
        const outputPath = path.join(outputDir, name);
        await sharp(svgPath)
            .resize(size, size)
            .png()
            .toFile(outputPath);
        log('✅', `${name} (${size}x${size})`);
    }
}

async function generateNativeIcons(pngSourcePath) {
    log('🔧', 'Gerando icon.ico e icon.icns via Tauri CLI...');

    try {
        execSync(`npx tauri icon "${pngSourcePath}"`, {
            cwd: path.join(__dirname, '..'),
            stdio: 'pipe',
        });
        log('✅', 'icon.ico gerado');
        log('✅', 'icon.icns gerado');
        return true;
    } catch (error) {
        log('⚠️', 'Falha ao gerar ícones nativos. Verifique se o Tauri CLI está instalado.');
        log('💡', 'Execute manualmente: npx tauri icon src-tauri/icons/icon.png');
        return false;
    }
}

function copyThemeLogos(lightLogoPath, darkLogoPath) {
    if (lightLogoPath) {
        const destLight = path.join(PATHS.public, 'logo-bg_blk.svg');
        fs.copyFileSync(lightLogoPath, destLight);
        log('✅', `Logo claro copiado para public/logo-bg_blk.svg`);

        // Também salvar em assets como backup
        const assetLight = path.join(PATHS.assets, 'logo-bg_blk.svg');
        fs.copyFileSync(lightLogoPath, assetLight);
    }

    if (darkLogoPath) {
        const destDark = path.join(PATHS.public, 'logo-bg_gray.svg');
        fs.copyFileSync(darkLogoPath, destDark);
        log('✅', `Logo escuro copiado para public/logo-bg_gray.svg`);

        // Também salvar em assets como backup
        const assetDark = path.join(PATHS.assets, 'logo-bg_gray.svg');
        fs.copyFileSync(darkLogoPath, assetDark);
    }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║              MARK-LEE ICON GENERATOR                       ║
╚════════════════════════════════════════════════════════════╝
`);

    // Processar argumentos
    const args = process.argv.slice(2);
    const [iconArg, lightLogoArg, darkLogoArg] = args;

    // Resolver caminhos dos arquivos
    const iconPath = resolveInput(iconArg, DEFAULTS.icon);
    const lightLogoPath = resolveInput(lightLogoArg, DEFAULTS.lightLogo);
    const darkLogoPath = resolveInput(darkLogoArg, DEFAULTS.darkLogo);

    // Validar ícone principal (obrigatório)
    if (!iconPath) {
        console.error('❌ ERRO: Arquivo de ícone não encontrado!');
        console.error('');
        console.error('Forneça um arquivo SVG como argumento ou coloque em assets/logo-icon.svg');
        console.error('');
        console.error('Uso: node scripts/generate-icons.cjs [icon.svg] [light-logo.svg] [dark-logo.svg]');
        process.exit(1);
    }

    log('📄', `Ícone fonte: ${iconPath}`);
    if (lightLogoPath) log('📄', `Logo claro: ${lightLogoPath}`);
    if (darkLogoPath) log('📄', `Logo escuro: ${darkLogoPath}`);

    // Garantir que os diretórios existem
    ensureDir(PATHS.icons);
    ensureDir(PATHS.assets);
    ensureDir(PATHS.public);

    // Copiar SVG fonte para assets (backup)
    const iconBackupPath = path.join(PATHS.assets, 'logo-icon.svg');
    if (iconPath !== iconBackupPath) {
        fs.copyFileSync(iconPath, iconBackupPath);
        log('💾', 'Backup do ícone salvo em assets/logo-icon.svg');
    }

    // ──────────────────────────────────────────────────────────────────────────
    logSection('GERANDO PNGs PARA TAURI');
    // ──────────────────────────────────────────────────────────────────────────

    await generatePNGs(iconPath, PATHS.icons, ICON_SIZES.tauri);

    // ──────────────────────────────────────────────────────────────────────────
    logSection('GERANDO PNGs PARA WINDOWS STORE');
    // ──────────────────────────────────────────────────────────────────────────

    await generatePNGs(iconPath, PATHS.icons, ICON_SIZES.store);

    // ──────────────────────────────────────────────────────────────────────────
    logSection('GERANDO ÍCONES NATIVOS (.ico, .icns)');
    // ──────────────────────────────────────────────────────────────────────────

    const pngSource = path.join(PATHS.icons, 'icon.png');
    await generateNativeIcons(pngSource);

    // ──────────────────────────────────────────────────────────────────────────
    logSection('COPIANDO LOGOS DE TEMA');
    // ──────────────────────────────────────────────────────────────────────────

    if (lightLogoPath || darkLogoPath) {
        copyThemeLogos(lightLogoPath, darkLogoPath);
    } else {
        log('ℹ️', 'Nenhum logo de tema fornecido. Mantendo os atuais.');
    }

    // ──────────────────────────────────────────────────────────────────────────
    logSection('CONCLUÍDO');
    // ──────────────────────────────────────────────────────────────────────────

    console.log(`
✨ Todos os ícones foram gerados com sucesso!

📁 Arquivos criados:
   src-tauri/icons/    - Ícones para build (${ICON_SIZES.tauri.length + ICON_SIZES.store.length} PNGs + ico/icns)
   public/             - Logos de tema para o app
   assets/             - Backup dos SVGs fonte

🚀 Próximo passo:
   npm run tauri build
`);
}

// Executar
main().catch((err) => {
    console.error('❌ Erro fatal:', err.message);
    process.exit(1);
});
