# Modbus 测试工具

我做这个工具，是为了在调试工业自动化设备时，能够快速、直观地读写 Modbus TCP/RTU 从站，同时不依赖浏览器或 Web 服务器。它是一个基于 Electron 的纯桌面应用，开箱即用。

当前版本为 1.0.0，提供 Windows x64 安装版和免安装便携版。个人使用免费，项目使用 MIT 许可证，可自由使用、修改和分发。

## 功能亮点

- 同时支持 Modbus TCP 和 Modbus RTU。
- 支持 FC1、FC2、FC3、FC4 读取以及 FC5、FC6、FC15、FC16 写入。
- 实时监听 TX/RX 原始报文，便于分析地址、功能码、异常码和 CRC。
- 支持自动轮询，所有 Modbus 请求串行执行，避免请求重叠。
- 显示十进制、十六进制、二进制、Float 和 ASCII 数据。
- 自动扫描本机可用串口。
- 支持简体中文和 English 实时切换。
- 原生菜单、浅色和深色主题与桌面系统集成。
- 所有通信均在本机完成，不包含遥测和远程数据上传。

## 下载与安装

正式安装包发布在 GitHub 的 Releases 页面：

- `Modbus Test Tool Setup x.x.x.exe`：Windows 安装版。
- `Modbus Test Tool x.x.x.exe`：Windows 免安装便携版。

安装步骤：

1. 从 Releases 页面下载最新安装包。
2. 双击安装包，按向导提示完成安装。
3. 启动桌面程序，无需打开浏览器或终端。

从源码运行：

```
git clone https://github.com/fbjffmtn22-lab/modbus-test-tool.git
cd modbus-test-tool
npm install
npm start
```

## 兼容运行系统

| 操作系统 | 架构 | 状态 |
|---------|------|------|
| Windows 10 | x64 | 已验证 |
| Windows 11 | x64 | 已验证 |
| Windows Server 2022+ | x64 | 理论兼容 |
| macOS 11+ | x64, arm64 | 理论兼容 |
| Ubuntu 20.04+ / Debian 11+ | x64 | 理论兼容 |

当前 1.0.0 已在 Windows 11 x64 完成桌面启动、TCP/RTU 连接读取、写入和自动轮询验收。macOS 和 Linux 未经实机测试，如有问题欢迎提交 Issue。

## 支持的功能码

| 功能码 | 功能 | 类型 |
|-------|------|------|
| FC1 | 读线圈 | 读取 |
| FC2 | 读离散输入 | 读取 |
| FC3 | 读保持寄存器 | 读取 |
| FC4 | 读输入寄存器 | 读取 |
| FC5 | 写单个线圈 | 写入 |
| FC6 | 写单个寄存器 | 写入 |
| FC15 | 写多个线圈 | 写入 |
| FC16 | 写多个寄存器 | 写入 |

## 三分钟开始监控

1. 打开本工具。
2. 在左侧连接配置面板选择 TCP 或 RTU 模式，填写设备参数。
3. 点击连接，状态指示灯变绿表示已连接。
4. 在右侧读取面板选择功能码（如 FC3 读保持寄存器），填写起始地址和数量。
5. 点击执行读取，数据表格展示结果。
6. 如需写入，切换到写入标签，填写地址和值（支持十进制和 0x 十六进制）。
7. 勾选自动轮询可定时刷新，间隔在右侧可调。
8. 在日志区域查看 TX/RX 原始报文；不需要时可以关闭“报文监听”。

如果连接失败，请确认设备 IP 或串口参数正确，并检查从站 ID 和超时设置。

## 寄存器地址说明

本工具使用 Modbus PDU 中的零基地址。很多设备手册使用 `4xxxx` 或 `3xxxx` 形式表示寄存器，两者需要换算：

| 设备手册地址 | 常见功能码 | 工具内地址 |
|-------------|-----------|-----------|
| 40001 | FC3 | 0 |
| 40002 | FC3 | 1 |
| 30001 | FC4 | 0 |
| 30002 | FC4 | 1 |

不同厂商的手册可能已经使用零基地址。如果收到异常码 `02`（Illegal Data Address），请优先检查功能码、地址基准和读取数量。

## 报文监听

日志窗口默认启用报文监听，并使用不同颜色显示通信方向：

- `TX`：工具发送给设备的请求报文。
- `RX`：设备返回给工具的响应报文。
- `RTU`：显示包含从站地址和 CRC 的真实串口字节。
- `TCP`：显示包含 Transaction ID、Protocol ID、Length 和 Unit ID 的真实 MBAP 报文。

示例 RTU 请求：

```text
TX RTU [8B]  01 03 00 00 00 0A C5 CD
```

该报文表示向从站 `1` 使用 FC3，从地址 `0` 开始读取 `10` 个保持寄存器。日志提供毫秒级时间戳，可使用“清空”按钮快速开始新一轮诊断。

## 界面语言

默认界面为简体中文。可以通过以下任一入口实时切换语言：

- 页面右上角“界面语言”选择框。
- 桌面应用顶部“界面语言”菜单。

页面文字和 Electron 原生菜单会同步切换，目前支持简体中文和 English。

## 数据与卸载

本工具是纯客户端应用，不存储任何用户数据到远程服务器。所有 Modbus 通信仅在本地网络中进行。无配置文件、无数据库、无本地缓存。

Windows 用户卸载：

1. 打开设置 - 应用 - 已安装的应用。
2. 找到 ModbusTestTool，点击卸载。

从源码构建的用户：直接删除项目目录即可，无残留文件。

## 从源码构建

前置要求：Node.js 22.12 或更高版本，npm（随 Node.js 一起安装），Git。

```bash
git clone https://github.com/fbjffmtn22-lab/modbus-test-tool.git
cd modbus-test-tool
npm install
npm start
```

运行测试：

```bash
npm test
```

打包为可分发安装包：

```bash
npm run build:win   # Windows 安装包
npm run build:mac   # macOS DMG
npm run build:linux # Linux AppImage / deb
```

打包完成后，产物位于项目的 `dist/` 目录。Windows 构建会同时生成 NSIS 安装程序和便携版客户端。

## 独立实现

本项目的代码、界面和通信处理均为独立实现，核心架构不依赖任何第三方 Modbus 测试工具或闭源组件：

- Electron 主进程（main.js）：实现连接管理、参数校验、请求队列、自动轮询和原始报文监听。
- IPC 桥接层（preload.js）：前后端通信完全通过 Electron IPC 实现，无 HTTP 服务依赖。
- 前端界面（public/）：原生 HTML/CSS/JavaScript 实现，包括双语界面、数据表格和通信日志。
- 参数校验（lib/validation.js）：限制从站 ID、地址、数量、端口和写入值的协议范围。
- 自动化测试（test/）：使用 Node.js 内置测试运行器验证关键参数边界。
- Modbus 协议：基于 modbus-serial 库（MIT 许可证）。
- 串口通信：基于 serialport 库（MIT 许可证）。

## 安全说明

- 网络隔离：本工具仅在本地网络中发起 Modbus TCP 连接，不会向互联网发送任何数据。
- 串口安全：访问串口需要操作系统授权，工具不会修改串口设备配置。
- 权限最小化：应用仅申请 Modbus 通信所需的网络和串口权限。
- 代码开源：全部源代码公开在 GitHub，无任何隐藏逻辑、遥测或数据收集。
- 依赖审计：所有第三方依赖均使用 MIT 许可证的开源库，可审计。
- 报告漏洞：如发现安全问题，请通过 GitHub Issues 私信报告，不要公开披露。

## 许可证

MIT

---

如有问题或建议，欢迎提交 Issue 或 Pull Request。
