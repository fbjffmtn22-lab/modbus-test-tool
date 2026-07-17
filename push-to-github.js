// 通过 GitHub API 推送代码到 GitHub
// 用法: node push-to-github.js <用户名> <仓库名> <Personal Access Token>
const fs = require('fs');
const path = require('path');

const [,, username, repoName, token] = process.argv;
if (!username || !repoName || !token) {
    console.log('用法: node push-to-github.js <用户名> <仓库名> <Personal Access Token>');
    console.log('示例: node push-to-github.js myname modbus-test-tool ghp_xxxxxxxxxxxx');
    process.exit(1);
}

const API = 'https://api.github.com';
const headers = {
    'Authorization': 'token ' + token,
    'Content-Type': 'application/json',
    'User-Agent': 'modbus-push-script'
};

const IGNORE = new Set([
    'node_modules', '.portable-git', '.git',
    'git-installer.exe', 'git-portable.7z',
    'server-out.txt', 'out.txt', 'server.log', 'server.err'
]);

async function request(method, url, body) {
    const res = await fetch(url, {
        method, headers,
        body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    return res.status === 204 ? null : await res.json();
}

async function collectFiles(dir) {
    const files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (IGNORE.has(entry.name) || entry.name.startsWith('.')) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectFiles(fullPath));
        } else {
            const rel = path.relative('.', fullPath).replace(/\\/g, '/');
            const content = fs.readFileSync(fullPath);
            files.push({ path: rel, content: content.toString('base64') });
        }
    }
    return files;
}

async function main() {
    console.log('1. 检查仓库是否存在...');
    try {
        await request('GET', `${API}/repos/${username}/${repoName}`);
        console.log('   仓库已存在，继续上传...');
    } catch (e) {
        console.log('   仓库不存在，尝试创建...');
        try {
            await request('POST', `${API}/user/repos`, {
                name: repoName,
                description: 'Modbus 测试工具 - 桌面客户端 (Electron)',
                private: false,
                auto_init: false
            });
        } catch (e2) {
            console.log('   创建失败:', e2.message);
            console.log('   请先在 GitHub 上手动创建仓库!');
            process.exit(1);
        }
    }

    console.log('2. 收集文件...');
    const files = await collectFiles('.');
    console.log(`   共 ${files.length} 个文件`);

    console.log('3. 上传文件...');
    for (let i = 0; i < files.length; i++) {
        const f = files[i];
        process.stdout.write(`   [${i+1}/${files.length}] ${f.path} ... `);
        try {
            await request('PUT', `${API}/repos/${username}/${repoName}/contents/${f.path}`, {
                message: f.path === 'README.md' ? 'Initial commit' : `Add ${f.path}`,
                content: f.content
            });
            console.log('ok');
        } catch (e) {
            if (e.message.includes('422') || e.message.includes('409')) {
                // 文件已存在，更新
                try {
                    const existing = await request('GET', `${API}/repos/${username}/${repoName}/contents/${f.path}`);
                    await request('PUT', `${API}/repos/${username}/${repoName}/contents/${f.path}`, {
                        message: `Update ${f.path}`,
                        content: f.content,
                        sha: existing.sha
                    });
                    console.log('updated');
                } catch (e2) {
                    console.log('failed:', e2.message);
                }
            } else {
                console.log('failed:', e.message);
            }
        }
    }

    console.log('\n完成! https://github.com/' + username + '/' + repoName);
}

main().catch(e => {
    console.error('错误:', e.message);
    process.exit(1);
});
