'use strict';

function integer(value, name, min, max) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
        throw new Error(`${name}必须是 ${min} 到 ${max} 之间的整数`);
    }
    return parsed;
}

function validateConnectParams(params = {}) {
    const mode = params.mode === 'rtu' ? 'rtu' : params.mode === 'tcp' ? 'tcp' : null;
    if (!mode) throw new Error('通信模式必须是 TCP 或 RTU');

    const result = {
        mode,
        slaveId: integer(params.slaveId, '从站 ID', 1, 247),
        timeout: integer(params.timeout, '超时时间', 1, 60)
    };

    if (mode === 'tcp') {
        const host = String(params.host || '').trim();
        if (!host || host.length > 253) throw new Error('请输入有效的主机地址');
        result.host = host;
        result.port = integer(params.port, 'TCP 端口', 1, 65535);
    } else {
        const path = String(params.path || '').trim();
        if (!path || path.length > 260) throw new Error('请选择有效串口');
        result.path = path;
        result.baudRate = integer(params.baudRate, '波特率', 1, 4000000);
        result.dataBits = integer(params.dataBits, '数据位', 5, 8);
        result.stopBits = integer(params.stopBits, '停止位', 1, 2);
        if (!['none', 'even', 'odd'].includes(params.parity)) throw new Error('校验方式无效');
        result.parity = params.parity;
    }
    return result;
}

function validateReadParams(params = {}) {
    const fc = integer(params.fc, '功能码', 1, 4);
    const maxQuantity = fc <= 2 ? 2000 : 125;
    return {
        fc,
        address: integer(params.addr, '起始地址', 0, 65535),
        quantity: integer(params.qty, '读取数量', 1, maxQuantity)
    };
}

function validateWriteParams(params = {}) {
    const fc = Number(params.fc);
    if (![5, 6, 15, 16].includes(fc)) throw new Error('不支持的写入功能码');
    const address = integer(params.addr, '写入地址', 0, 65535);
    const raw = Array.isArray(params.values) ? params.values : [params.values];
    const maxQuantity = fc === 15 ? 1968 : fc === 16 ? 123 : 1;
    if (raw.length < 1 || raw.length > maxQuantity) throw new Error(`写入值数量必须是 1 到 ${maxQuantity}`);

    let values;
    if (fc === 5 || fc === 15) {
        values = raw.map((value) => {
            if (value === true || value === 1 || value === '1') return true;
            if (value === false || value === 0 || value === '0') return false;
            throw new Error('线圈值只能是 0 或 1');
        });
    } else {
        values = raw.map((value) => integer(value, '寄存器值', 0, 65535));
    }
    return { fc, address, values };
}

function validatePollInterval(value) {
    return integer(value, '轮询间隔', 100, 3600000);
}

module.exports = { validateConnectParams, validateReadParams, validateWriteParams, validatePollInterval };
