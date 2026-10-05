// check.js — все качества артефактов
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

function walkDir(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) walkDir(filePath, fileList);
        else if (file.endsWith('.json')) fileList.push(filePath);
    }
    return fileList;
}

const allFiles = walkDir(DATA_DIR);
const artifactFiles = allFiles.filter(f => {
    const rel = path.relative(DATA_DIR, f);
    return rel.includes('artefact') || rel.includes('artifact');
});

// Собираем все ключи качества из infoBlocks
const qualityKeys = {};
const rarityExamples = {};

artifactFiles.forEach(file => {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (!data.infoBlocks) return;
        
        for (const block of data.infoBlocks) {
            if (!block.elements) continue;
            for (const el of block.elements) {
                if (el.type !== 'key-value') continue;
                const k = el.key;
                if (k && k.type === 'translation' && k.key && k.key.startsWith('core.quality.')) {
                    const qkey = k.key;
                    const ruName = (k.lines && k.lines.ru) || qkey;
                    qualityKeys[qkey] = (qualityKeys[qkey] || 0) + 1;
                    if (!rarityExamples[qkey]) {
                        rarityExamples[qkey] = { ru: ruName, example: data.id + ' / ' + ((data.name.lines && data.name.lines.ru) || '') };
                    }
                }
            }
        }
    } catch (e) {}
});

console.log('═══════════════════════════════════════');
console.log('Ключи качества (core.quality.*):');
console.log(JSON.stringify(qualityKeys, null, 2));
console.log('\nПримеры:');
Object.entries(rarityExamples).forEach(([k, v]) => {
    console.log(`  ${k} → ${v.ru}  (пример: ${v.example})`);
});

// Также проверим оружие — есть ли у них что-то похожее
const weaponFiles = allFiles.filter(f => {
    const rel = path.relative(DATA_DIR, f);
    return rel.includes('weapon') && rel.includes('items');
});

const weaponQuality = {};
weaponFiles.slice(0, 500).forEach(file => {
    try {
        const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
        if (data.color) weaponQuality[data.color] = (weaponQuality[data.color] || 0) + 1;
    } catch (e) {}
});
console.log('\nПример color у оружия:', weaponQuality);