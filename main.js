const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ModbusRTU = require('modbus-serial');

let mainWindow = null;
let client = null;
let isConnected = false;
let pollTimer = null;

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
    const { mode, host, port, path: comPath, baudRate, dataBits, stopBits, parity, slaveId, timeout } = params;
    try {
        const c = createClient();
        if (mode === 'rtu') {
            await c.connectRTUBuffered(comPath, {
                baudRate: parseInt(baudRate) || 9600,
                dataBits: parseInt(dataBits) || 8,
                stopBits: parseInt(stopBits) || 1,
                parity: parity || 'none'
            });
        } else {
            await c.connectTCP(host, { port: parseInt(port) || 502 });
        }
        c.setID(parseInt(slaveId) || 1);
        c.setTimeout(parseInt(timeout) * 1000 || 5000);
        isConnected = true;
        sendLog(`已连接到 ${mode === 'rtu' ? comPath : host + ':' + port} (ID=${slaveId})`);
        return { success: true, message: '连接成功' };
    } catch (err) {
        isConnected = false;
        return { success: false, message: '连接失败: ' + err.message };
    }
});

ipcMain.handle('modbus:disconnect', () => {
    try {
        if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
        if (client) { client.close(); }
    } catch (e) { /* ignore */ }
    client = null;
    isConnected = false;
    sendLog('已断开连接');
    return { success: true };
});

ipcMain.handle('modbus:status', () => {
    return { connected: isConnected };
});

ipcMain.handle('modbus:read', async (event, params) => {
    if (!isConnected || !client) {
        return { success: false, message: '未连接到设备' };
    }
    const { fc, addr, qty } = params;
    const address = parseInt(addr) || 0;
    const quantity = parseInt(qty) || 10;
    try {
        let data;
        switch (parseInt(fc)) {
            case 1: data = await client.readCoils(address, quantity); break;
            case 2: data = await client.readDiscreteInputs(address, quantity); break;
            case 3: data = await client.readHoldingRegisters(address, quantity); break;
            case 4: data = await client.readInputRegisters(address, quantity); break;
            default: return { success: false, message: '不支持的功能码' };
        }
        const fcNames = { 1: '线圈', 2: '离散输入', 3: '保持寄存器', 4: '输入寄存器' };
        sendLog(`读取${fcNames[fc] || fc} 起始=${address} 数量=${quantity} 成功`);
        return { success: true, data: data.data, quantity, address, fc: parseInt(fc) };
    } catch (err) {
        return { success: false, message: '读取失败: ' + err.message };
    }
});

ipcMain.handle('modbus:write', async (event, params) => {
    if (!isConnected || !client) {
        return { success: false, message: '未连接到设备' };
    }
    const { fc, addr, values } = params;
    const address = parseInt(addr) || 0;
    try {
        switch (parseInt(fc)) {
            case 5:
                await client.writeCoil(address, values ? true : false);
                break;
            case 6:
                await client.writeRegister(address, parseInt(values) || 0);
                break;
            case 15: {
                const arr = Array.isArray(values) ? values : [values].filter(v => v !== undefined);
                await client.writeCoils(address, arr.map(v => v ? true : false));
                break;
            }
            case 16: {
                const arr = Array.isArray(values) ? values : [values].filter(v => v !== undefined);
                await client.writeRegisters(address, arr.map(v => parseInt(v) || 0));
                break;
            }
            default:
                return { success: false, message: '不支持的功能码' };
        }
        const fcNames = { 5: '写单个线圈', 6: '写单个寄存器', 15: '写多个线圈', 16: '写多个寄存器' };
        sendLog(`${fcNames[fc] || fc} 地址=${address} 成功`);
        return { success: true, message: '写入成功' };
    } catch (err) {
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

// 轮询 - 基于事件
ipcMain.on('poll:start', (event, params) => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    const interval = parseInt(params.interval) || 1000;
    const win = mainWindow;
    pollTimer = setInterval(async () => {
        if (!isConnected || !client || !win || win.isDestroyed()) {
            event.sender.send('poll:error', { message: '连接已断开' });
            if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
            return;
        }
        try {
            let data;
            switch (parseInt(params.fc)) {
                case 1: data = await client.readCoils(parseInt(params.addr) || 0, parseInt(params.qty) || 10); break;
                case 2: data = await client.readDiscreteInputs(parseInt(params.addr) || 0, parseInt(params.qty) || 10); break;
                case 3: data = await client.readHoldingRegisters(parseInt(params.addr) || 0, parseInt(params.qty) || 10); break;
                case 4: data = await client.readInputRegisters(parseInt(params.addr) || 0, parseInt(params.qty) || 10); break;
                default: return;
            }
            event.sender.send('poll:data', {
                fc: parseInt(params.fc),
                address: parseInt(params.addr) || 0,
                data: data.data,
                timestamp: Date.now()
            });
        } catch (err) {
            event.sender.send('poll:error', { message: err.message });
        }
    }, interval);
});

ipcMain.on('poll:stop', () => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
});

// ==================== App Lifecycle ====================

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (pollTimer) { clearInterval(pollTimer); }
    if (client) { try { client.close(); } catch (e) { /* ignore */ } }
    if (process.platform !== 'darwin') app.quit();
});
