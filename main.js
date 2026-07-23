const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const ModbusRTU = require('modbus-serial');
const { validateConnectParams, validateReadParams, validateWriteParams, validatePollInterval } = require('./lib/validation');

let mainWindow = null;
let client = null;
let isConnected = false;
let pollTimer = null;
let operationQueue = Promise.resolve();
let currentLanguage = 'zh-CN';

const MENU_TEXT = {
    'zh-CN': {
        file: '文件', disconnect: '断开连接', exit: '退出', view: '视图', reload: '重新加载',
        devtools: '开发者工具', zoomIn: '放大', zoomOut: '缩小', zoomReset: '实际大小',
        language: '界面语言', chinese: '简体中文', english: 'English', help: '帮助', about: '关于'
    },
    'en-US': {
        file: 'File', disconnect: 'Disconnect', exit: 'Exit', view: 'View', reload: 'Reload',
        devtools: 'Developer Tools', zoomIn: 'Zoom In', zoomOut: 'Zoom Out', zoomReset: 'Actual Size',
        language: 'Language', chinese: '简体中文', english: 'English', help: 'Help', about: 'About'
    }
};

function setApplicationLanguage(language, notifyRenderer = true) {
    currentLanguage = language === 'en-US' ? 'en-US' : 'zh-CN';
    const t = MENU_TEXT[currentLanguage];
    const chooseLanguage = (value) => setApplicationLanguage(value);
    Menu.setApplicationMenu(Menu.buildFromTemplate([
        {
            label: t.file,
            submenu: [
                { label: t.disconnect, click: () => disconnectClient() },
                { type: 'separator' },
                { label: t.exit, role: 'quit' }
            ]
        },
        {
            label: t.view,
            submenu: [
                { label: t.reload, role: 'reload' },
                { label: t.devtools, role: 'toggleDevTools' },
                { type: 'separator' },
                { label: t.zoomIn, role: 'zoomIn' },
                { label: t.zoomOut, role: 'zoomOut' },
                { label: t.zoomReset, role: 'resetZoom' }
            ]
        },
        {
            label: t.language,
            submenu: [
                { label: t.chinese, type: 'radio', checked: currentLanguage === 'zh-CN', click: () => chooseLanguage('zh-CN') },
                { label: t.english, type: 'radio', checked: currentLanguage === 'en-US', click: () => chooseLanguage('en-US') }
            ]
        },
        { label: t.help, submenu: [{ label: t.about, role: 'about' }] }
    ]));
    if (notifyRenderer) sendToRenderer('language:changed', currentLanguage);
}

function runExclusive(operation) {
    const next = operationQueue.then(operation, operation);
    operationQueue = next.catch(() => {});
    return next;
}

function stopPolling() {
    if (pollTimer) clearTimeout(pollTimer);
    pollTimer = null;
}

function createClient() {
    if (client) {
        try { client.close(); } catch (e) { /* ignore */ }
    }
    client = new ModbusRTU();
    return client;
}

function sendToRenderer(channel, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

function sendLog(msg) {
    sendToRenderer('log', msg);
}

function sendFrame(direction, mode, data) {
    if (!Buffer.isBuffer(data) && !(data instanceof Uint8Array)) return;
    const buffer = Buffer.from(data);
    sendToRenderer('frame', {
        direction,
        mode: mode.toUpperCase(),
        hex: Array.from(buffer, byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' '),
        length: buffer.length,
        timestamp: Date.now()
    });
}

function attachFrameMonitor(modbusClient, mode) {
    const transport = modbusClient?._port?._client;
    if (!transport || transport.__modbusMonitorAttached) return;
    transport.__modbusMonitorAttached = true;
    transport.on('data', data => sendFrame('RX', mode, data));
    const originalWrite = transport.write.bind(transport);
    transport.write = function(data, ...args) {
        sendFrame('TX', mode, data);
        return originalWrite(data, ...args);
    };
}

function disconnectClient() {
    try {
        stopPolling();
        if (client) client.close();
    } catch (e) { /* ignore */ }
    client = null;
    isConnected = false;
    sendLog('已断开连接');
    sendToRenderer('connection:changed', false);
    return { success: true };
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1100,
        height: 800,
        title: 'Modbus 测试工具',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    mainWindow.loadFile(path.join(__dirname, 'public', 'index.html'));
    mainWindow.on('closed', () => { mainWindow = null; });
}

// ==================== IPC Handlers ====================

ipcMain.handle('modbus:connect', async (event, params) => {
    try {
        const config = validateConnectParams(params);
        stopPolling();
        isConnected = false;
        const c = createClient();
        if (config.mode === 'rtu') {
            await c.connectRTUBuffered(config.path, {
                baudRate: config.baudRate,
                dataBits: config.dataBits,
                stopBits: config.stopBits,
                parity: config.parity
            });
        } else {
            await c.connectTCP(config.host, { port: config.port });
        }
        c.setID(config.slaveId);
        c.setTimeout(config.timeout * 1000);
        attachFrameMonitor(c, config.mode);
        isConnected = true;
        sendLog(`已连接到 ${config.mode === 'rtu' ? config.path : config.host + ':' + config.port} (ID=${config.slaveId})`);
        return { success: true, message: '连接成功' };
    } catch (err) {
        isConnected = false;
        return { success: false, message: '连接失败: ' + err.message };
    }
});

ipcMain.handle('modbus:disconnect', () => {
    return disconnectClient();
});

ipcMain.handle('language:get', () => currentLanguage);
ipcMain.handle('language:set', (_event, language) => {
    setApplicationLanguage(language, false);
    return currentLanguage;
});

ipcMain.handle('modbus:status', () => {
    return { connected: isConnected };
});

ipcMain.handle('modbus:read', async (event, params) => {
    if (!isConnected || !client) {
        return { success: false, message: '未连接到设备' };
    }
    try {
        const { fc, address, quantity } = validateReadParams(params);
        const data = await runExclusive(() => readByFunctionCode(fc, address, quantity));
        const fcNames = { 1: '线圈', 2: '离散输入', 3: '保持寄存器', 4: '输入寄存器' };
        sendLog(`读取${fcNames[fc] || fc} 起始=${address} 数量=${quantity} 成功`);
        return { success: true, data: data.data, quantity, address, fc };
    } catch (err) {
        if (!client?.isOpen) isConnected = false;
        return { success: false, message: '读取失败: ' + err.message };
    }
});

ipcMain.handle('modbus:write', async (event, params) => {
    if (!isConnected || !client) {
        return { success: false, message: '未连接到设备' };
    }
    try {
        const { fc, address, values } = validateWriteParams(params);
        await runExclusive(async () => { switch (fc) {
            case 5:
                await client.writeCoil(address, values[0]);
                break;
            case 6:
                await client.writeRegister(address, values[0]);
                break;
            case 15:
                await client.writeCoils(address, values);
                break;
            case 16:
                await client.writeRegisters(address, values);
                break;
        }});
        const fcNames = { 5: '写单个线圈', 6: '写单个寄存器', 15: '写多个线圈', 16: '写多个寄存器' };
        sendLog(`${fcNames[fc] || fc} 地址=${address} 成功`);
        return { success: true, message: '写入成功' };
    } catch (err) {
        if (!client?.isOpen) isConnected = false;
        return { success: false, message: '写入失败: ' + err.message };
    }
});

ipcMain.handle('modbus:serial-ports', async () => {
    try {
        const { SerialPort } = require('serialport');
        const ports = await SerialPort.list();
        return { success: true, ports: ports.map(p => ({ path: p.path, manufacturer: p.manufacturer })) };
    } catch (err) {
        return { success: false, ports: [], message: err.message };
    }
});

function readByFunctionCode(fc, address, quantity) {
    switch (fc) {
        case 1: return client.readCoils(address, quantity);
        case 2: return client.readDiscreteInputs(address, quantity);
        case 3: return client.readHoldingRegisters(address, quantity);
        case 4: return client.readInputRegisters(address, quantity);
        default: throw new Error('不支持的功能码');
    }
}

// 轮询使用递归定时器，确保同一时刻只有一个 Modbus 请求。
ipcMain.on('poll:start', (event, params) => {
    stopPolling();
    let request;
    let interval;
    try {
        request = validateReadParams(params);
        interval = validatePollInterval(params.interval);
    } catch (err) {
        event.sender.send('poll:error', { message: err.message });
        return;
    }
    const tick = async () => {
        if (!isConnected || !client || !win || win.isDestroyed()) {
            event.sender.send('poll:error', { message: '连接已断开' });
            stopPolling();
            return;
        }
        try {
            const data = await runExclusive(() => readByFunctionCode(request.fc, request.address, request.quantity));
            event.sender.send('poll:data', {
                fc: request.fc,
                address: request.address,
                data: data.data,
                timestamp: Date.now()
            });
        } catch (err) {
            event.sender.send('poll:error', { message: err.message });
            if (!client?.isOpen) isConnected = false;
            stopPolling();
            return;
        }
        pollTimer = setTimeout(tick, interval);
    };
    const win = mainWindow;
    pollTimer = setTimeout(tick, 0);
});

ipcMain.on('poll:stop', () => {
    stopPolling();
});

// ==================== App Lifecycle ====================

app.whenReady().then(() => {
    setApplicationLanguage('zh-CN', false);
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    stopPolling();
    if (client) { try { client.close(); } catch (e) { /* ignore */ } }
    if (process.platform !== 'darwin') app.quit();
});
