// Modbus 测试工具 - 前端逻辑 (Electron 客户端版)
(function() {
    const CONFIG = {
        statusEl: document.getElementById('connStatus'),
        statusTextEl: document.getElementById('connStatusText'),
        connectBtn: document.getElementById('connectBtn'),
        disconnectBtn: document.getElementById('disconnectBtn'),
        logBox: document.getElementById('logBox'),
        dataBody: document.getElementById('dataBody')
    };

    let polling = false;
    let connected = false;
    let currentLanguage = 'zh-CN';
    const api = window.modbusAPI;
    const I18N = {
        'zh-CN': {
            appTitle: '⚡ Modbus 测试工具', language: '界面语言', connectionConfig: '连接配置', mode: '模式', host: '主机', port: '端口',
            serialPort: '串口', baudRate: '波特率', dataBits: '数据位', stopBits: '停止位', parity: '校验', none: '无', even: '偶校验', odd: '奇校验',
            scanPorts: '扫描串口', slaveId: '从站 ID', timeout: '超时(s)', connect: '连接', disconnect: '断开', operations: '操作', read: '读取', write: '写入',
            functionCode: '功能码', startAddress: '起始地址', quantity: '数量', executeRead: '执行读取', address: '地址', value: '值', valuePlaceholder: '0 或 0x1A',
            executeWrite: '执行写入', data: '数据', autoPoll: '自动轮询', interval: '间隔(ms)', decimalValue: '值（十进制）', hexadecimal: '十六进制', binary: '二进制',
            noDataYet: '暂无数据，请先连接并读取', noData: '无数据', logs: '日志', connected: '已连接', disconnected: '未连接', writeSuccess: '写入成功',
            pollStarted: '自动轮询已启动', pollStopped: '自动轮询已停止', noPorts: '未检测到串口', scanFailed: '扫描串口失败', portsFound: '扫描到 {count} 个串口',
            frameMonitor: '报文监听', clearLogs: '清空', addressHint: '协议地址从 0 开始，例如 40001 通常填写 0'
        },
        'en-US': {
            appTitle: '⚡ Modbus Test Tool', language: 'Language', connectionConfig: 'Connection', mode: 'Mode', host: 'Host', port: 'Port',
            serialPort: 'Serial Port', baudRate: 'Baud Rate', dataBits: 'Data Bits', stopBits: 'Stop Bits', parity: 'Parity', none: 'None', even: 'Even', odd: 'Odd',
            scanPorts: 'Scan Ports', slaveId: 'Slave ID', timeout: 'Timeout (s)', connect: 'Connect', disconnect: 'Disconnect', operations: 'Operations', read: 'Read', write: 'Write',
            functionCode: 'Function', startAddress: 'Start Address', quantity: 'Quantity', executeRead: 'Read', address: 'Address', value: 'Value', valuePlaceholder: '0 or 0x1A',
            executeWrite: 'Write', data: 'Data', autoPoll: 'Auto Poll', interval: 'Interval (ms)', decimalValue: 'Decimal', hexadecimal: 'Hex', binary: 'Binary',
            noDataYet: 'No data. Connect and read first.', noData: 'No data', logs: 'Logs', connected: 'Connected', disconnected: 'Disconnected', writeSuccess: 'Write succeeded',
            pollStarted: 'Auto polling started', pollStopped: 'Auto polling stopped', noPorts: 'No serial ports found', scanFailed: 'Failed to scan serial ports', portsFound: 'Found {count} serial port(s)',
            frameMonitor: 'Frame Monitor', clearLogs: 'Clear', addressHint: 'Protocol addresses are zero-based; register 40001 usually means address 0'
        }
    };

    function t(key) { return I18N[currentLanguage][key] || key; }

    function applyLanguage(language, syncMain) {
        currentLanguage = language === 'en-US' ? 'en-US' : 'zh-CN';
        document.documentElement.lang = currentLanguage;
        document.title = t('appTitle').replace('⚡ ', '');
        document.getElementById('languageSelect').value = currentLanguage;
        document.querySelectorAll('[data-i18n]').forEach(function(el) { el.textContent = t(el.dataset.i18n); });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) { el.placeholder = t(el.dataset.i18nPlaceholder); });
        setFunctionCodeLabels();
        setConnected(connected, false);
        if (syncMain) api.setLanguage(currentLanguage);
    }

    function setFunctionCodeLabels() {
        var names = currentLanguage === 'zh-CN'
            ? { 1: 'FC1 - 读线圈', 2: 'FC2 - 读离散输入', 3: 'FC3 - 读保持寄存器', 4: 'FC4 - 读输入寄存器', 5: 'FC5 - 写单个线圈', 6: 'FC6 - 写单个寄存器', 15: 'FC15 - 写多个线圈', 16: 'FC16 - 写多个寄存器' }
            : { 1: 'FC1 - Read Coils', 2: 'FC2 - Read Discrete Inputs', 3: 'FC3 - Read Holding Registers', 4: 'FC4 - Read Input Registers', 5: 'FC5 - Write Single Coil', 6: 'FC6 - Write Single Register', 15: 'FC15 - Write Multiple Coils', 16: 'FC16 - Write Multiple Registers' };
        document.querySelectorAll('#readFc option, #writeFc option').forEach(function(option) { option.textContent = names[option.value]; });
    }

    init();
    function init() {
        toggleConnMode();
        document.getElementById('connMode').addEventListener('change', toggleConnMode);
        document.getElementById('scanSerialBtn').addEventListener('click', scanSerialPorts);
        document.querySelectorAll('.tab').forEach(function(t) { t.addEventListener('click', switchTab); });
        document.getElementById('connectBtn').addEventListener('click', doConnect);
        document.getElementById('disconnectBtn').addEventListener('click', doDisconnect);
        document.getElementById('readBtn').addEventListener('click', doRead);
        document.getElementById('writeBtn').addEventListener('click', doWrite);
        document.getElementById('pollToggle').addEventListener('change', togglePoll);
        document.getElementById('languageSelect').addEventListener('change', function(e) { applyLanguage(e.target.value, true); });
        document.getElementById('clearLogBtn').addEventListener('click', function() { CONFIG.logBox.replaceChildren(); });
        setupIPCEvents();
        api.getLanguage().then(function(language) { applyLanguage(language, false); });
        checkStatus();
    }

    function toggleConnMode() {
        var mode = document.getElementById('connMode').value;
        document.getElementById('tcpConfig').style.display = mode === 'tcp' ? '' : 'none';
        document.getElementById('rtuConfig').style.display = mode === 'rtu' ? '' : 'none';
    }

    function switchTab(e) {
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
        e.target.classList.add('active');
        document.getElementById(e.target.dataset.tab + 'Panel').classList.add('active');
    }

    function setupIPCEvents() {
        api.onLog(function(msg) { addLog(msg, 'info'); });
        api.onFrame(function(frame) {
            if (!document.getElementById('frameMonitorToggle').checked) return;
            addLog(frame.direction + ' ' + frame.mode + ' [' + frame.length + 'B]  ' + frame.hex, frame.direction.toLowerCase(), frame.timestamp);
        });
        api.onLanguageChanged(function(language) { applyLanguage(language, false); });
        api.onConnectionChanged(function(value) { setConnected(value); });
        api.onPollData(function(data) { renderData(data); });
        api.onPollError(function(data) {
            addLog(data.message, 'err');
            stopPoll();
        });
    }

    async function doConnect() {
        var mode = document.getElementById('connMode').value;
        var body = {
            mode: mode,
            slaveId: document.getElementById('connSlaveId').value,
            timeout: document.getElementById('connTimeout').value
        };
        if (mode === 'rtu') {
            body.path = document.getElementById('connPortRtu').value;
            body.baudRate = document.getElementById('connBaud').value;
            body.dataBits = document.getElementById('connDataBits').value;
            body.stopBits = document.getElementById('connStopBits').value;
            body.parity = document.getElementById('connParity').value;
        } else {
            body.host = document.getElementById('connHost').value;
            body.port = document.getElementById('connPort').value;
        }
        CONFIG.connectBtn.disabled = true;
        try {
            var result = await api.connect(body);
            if (result.success) { setConnected(true); }
            else { addLog(result.message, 'err'); }
        } catch (err) {
            addLog('连接失败: ' + err.message, 'err');
        } finally {
            if (!connected) CONFIG.connectBtn.disabled = false;
        }
    }

    async function doDisconnect() {
        if (polling) stopPoll();
        await api.disconnect();
        setConnected(false);
    }

    async function doRead() {
        var fc = document.getElementById('readFc').value;
        var addr = document.getElementById('readAddr').value;
        var qty = document.getElementById('readQty').value;
        var result = await api.read({ fc: fc, addr: addr, qty: qty });
        if (result.success) { renderData(result); }
        else { addLog(result.message, 'err'); }
    }

    async function doWrite() {
        var fc = document.getElementById('writeFc').value;
        var addr = document.getElementById('writeAddr').value;
        var val = document.getElementById('writeValue').value.trim();
        var values;
        if (val.startsWith('0x') || val.startsWith('0X')) {
            values = parseInt(val, 16);
        } else if (val.indexOf(',') >= 0) {
            values = val.split(',').map(function(v) { v = v.trim(); return v.startsWith('0x') ? parseInt(v, 16) : parseInt(v); });
        } else {
            values = parseInt(val);
        }
        var result = await api.write({ fc: fc, addr: addr, values: values });
        if (result.success) { addLog(t('writeSuccess'), 'ok'); }
        else { addLog(result.message, 'err'); }
    }

    async function scanSerialPorts() {
        var sel = document.getElementById('connPortRtu');
        try {
            var data = await api.getSerialPorts();
            if (data.success && data.ports.length > 0) {
                sel.replaceChildren();
                data.ports.forEach(function(p) {
                    var option = document.createElement('option');
                    option.value = p.path;
                    option.textContent = p.path + (p.manufacturer ? ' - ' + p.manufacturer : '');
                    sel.appendChild(option);
                });
                addLog(t('portsFound').replace('{count}', data.ports.length), 'info');
            } else {
                sel.replaceChildren(new Option(t('noPorts'), ''));
                addLog(t('noPorts'), 'err');
            }
        } catch(err) {
            addLog(t('scanFailed'), 'err');
        }
    }

    function togglePoll() {
        var enabled = document.getElementById('pollToggle').checked;
        if (enabled) {
            polling = true;
            api.startPoll({
                fc: document.getElementById('readFc').value,
                addr: document.getElementById('readAddr').value,
                qty: document.getElementById('readQty').value,
                interval: document.getElementById('pollInterval').value
            });
            addLog(t('pollStarted'), 'info');
        } else {
            stopPoll();
        }
    }

    function stopPoll() {
        polling = false;
        document.getElementById('pollToggle').checked = false;
        api.stopPoll();
        addLog(t('pollStopped'), 'info');
    }

    function renderData(result) {
        var tbody = CONFIG.dataBody;
        var data = result.data;
        var addr = result.address;
        var fc = result.fc;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">' + t('noData') + '</td></tr>';
            return;
        }
        var html = '';
        if (fc === 1 || fc === 2) {
            for (var i = 0; i < data.length; i++) {
                html += '<tr><td>' + (addr + i) + '</td><td class="' + (data[i] ? 'coil-on' : 'coil-off') + '">' + (data[i] ? 'ON' : 'OFF') + '</td><td>' + (data[i] ? '1' : '0') + '</td><td>' + (data[i] ? '1' : '0') + '</td><td>-</td><td>' + (data[i] ? '\\x01' : '\\x00') + '</td></tr>';
            }
        } else {
            for (var i = 0; i < data.length; i++) {
                var val = data[i];
                var hex = '0x' + val.toString(16).toUpperCase().padStart(4, '0');
                var bin = val.toString(2).padStart(16, '0');
                var f = i % 2 === 0 && i + 1 < data.length
                    ? bytesToFloat(val, data[i + 1]).toFixed(4)
                    : '-';
                var ch = val >= 32 && val <= 126 ? String.fromCharCode(val) : '.';
                html += '<tr><td>' + (addr + i) + '</td><td>' + val + '</td><td>' + hex + '</td><td>' + bin + '</td><td>' + f + '</td><td>' + ch + '</td></tr>';
            }
        }
        tbody.innerHTML = html;
    }

    function bytesToFloat(hi, lo) {
        var buf = new ArrayBuffer(4);
        var view = new DataView(buf);
        view.setUint16(0, hi, false);
        view.setUint16(2, lo, false);
        return view.getFloat32(0, false);
    }

    function setConnected(value, writeLog) {
        connected = Boolean(value);
        CONFIG.statusEl.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
        CONFIG.statusTextEl.textContent = connected ? t('connected') : t('disconnected');
        CONFIG.connectBtn.disabled = connected;
        CONFIG.disconnectBtn.disabled = !connected;
        if (connected && writeLog !== false) addLog(t('connected'), 'ok');
    }

    function addLog(msg, type, timestamp) {
        var logBox = CONFIG.logBox;
        var time = new Date(timestamp || Date.now()).toLocaleTimeString(currentLanguage, { hour12: false, fractionalSecondDigits: 3 });
        var el = document.createElement('div');
        el.innerHTML = '<span class="log-time">[' + time + ']</span><span class="log-' + (type || 'info') + '">' + escapeHtml(msg) + '</span>';
        logBox.appendChild(el);
        logBox.scrollTop = logBox.scrollHeight;
    }

    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async function checkStatus() {
        try {
            var data = await api.getStatus();
            if (data.connected) setConnected(true);
        } catch(e) { /* app not ready */ }
    }
})();
