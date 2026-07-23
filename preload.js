const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modbusAPI', {
    // 请求/响应式 API
    connect: (params) => ipcRenderer.invoke('modbus:connect', params),
    disconnect: () => ipcRenderer.invoke('modbus:disconnect'),
    getStatus: () => ipcRenderer.invoke('modbus:status'),
    read: (params) => ipcRenderer.invoke('modbus:read', params),
    write: (params) => ipcRenderer.invoke('modbus:write', params),
    getSerialPorts: () => ipcRenderer.invoke('modbus:serial-ports'),
    getLanguage: () => ipcRenderer.invoke('language:get'),
    setLanguage: (language) => ipcRenderer.invoke('language:set', language),

    // 轮询 - 主进程推送事件
    startPoll: (params) => ipcRenderer.send('poll:start', params),
    stopPoll: () => ipcRenderer.send('poll:stop'),

    // 事件监听
    onPollData: (callback) => {
        ipcRenderer.on('poll:data', (_event, data) => callback(data));
    },
    onPollError: (callback) => {
        ipcRenderer.on('poll:error', (_event, data) => callback(data));
    },
    onLog: (callback) => {
        ipcRenderer.on('log', (_event, msg) => callback(msg));
    },
    onFrame: (callback) => {
        ipcRenderer.on('frame', (_event, frame) => callback(frame));
    },
    onLanguageChanged: (callback) => {
        ipcRenderer.on('language:changed', (_event, language) => callback(language));
    },
    onConnectionChanged: (callback) => {
        ipcRenderer.on('connection:changed', (_event, connected) => callback(connected));
    },
    removeAllListeners: () => {
        ipcRenderer.removeAllListeners('poll:data');
        ipcRenderer.removeAllListeners('poll:error');
        ipcRenderer.removeAllListeners('log');
        ipcRenderer.removeAllListeners('frame');
        ipcRenderer.removeAllListeners('language:changed');
        ipcRenderer.removeAllListeners('connection:changed');
    }
});
