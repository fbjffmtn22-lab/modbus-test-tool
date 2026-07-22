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
    const api = window.modbusAPI;

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
        setupIPCEvents();
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
            if (CONFIG.statusTextEl.textContent !== '已连接') CONFIG.connectBtn.disabled = false;
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
        if (result.success) { addLog('写入成功', 'ok'); }
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
                addLog('扫描到 ' + data.ports.length + ' 个串口', 'info');
            } else {
                sel.innerHTML = '<option value="">未检测到串口</option>';
                addLog('未检测到串口', 'err');
            }
        } catch(err) {
            addLog('扫描串口失败', 'err');
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
            addLog('自动轮询已启动', 'info');
        } else {
            stopPoll();
        }
    }

    function stopPoll() {
        polling = false;
        document.getElementById('pollToggle').checked = false;
        api.stopPoll();
        addLog('自动轮询已停止', 'info');
    }

    function renderData(result) {
        var tbody = CONFIG.dataBody;
        var data = result.data;
        var addr = result.address;
        var fc = result.fc;
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">无数据</td></tr>';
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

    function setConnected(connected) {
        CONFIG.statusEl.className = 'status-dot ' + (connected ? 'connected' : 'disconnected');
        CONFIG.statusTextEl.textContent = connected ? '已连接' : '未连接';
        CONFIG.connectBtn.disabled = connected;
        CONFIG.disconnectBtn.disabled = !connected;
        if (connected) addLog('连接成功', 'ok');
    }

    function addLog(msg, type) {
        var logBox = CONFIG.logBox;
        var time = new Date().toLocaleTimeString('zh-CN', { hour12: false });
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
