# Modbus 测试工具

我做这个工具，是为了在调试工业自动化设备时，能够快速、直观地读写 Modbus TCP/RTU 从站，同时不依赖浏览器或 Web 服务器。它是一个基于 Electron 的纯桌面应用，开箱即用。

当前版本为 1.0.0，提供 Windows x64 安装包和 npm 包。个人使用免费。仓库使用 MIT 许可证，可自由使用、修改和分发。

![screenshot](screenshot.png)

## 下载与安装

正式安装包和源码发布在 GitHub 的 **Releases** 页面，文件名为：

`
ModbusTestTool-Setup-x.x.x.exe
`

安装步骤：

1. 从 [Releases](https://github.com/fbjffmtn22-lab/modbus-test-tool/releases) 下载最新安装包。
2. 双击安装包，按向导提示完成安装。
3. 启动桌面程序，无需打开浏览器或终端。

### 通过 npm 安装

`
npm install -g modbus-test-tool
modbus-test-tool
`

### 从源码运行

`
git clone https://github.com/fbjffmtn22-lab/modbus-test-tool.git
cd modbus-test-tool
npm install
npm start
`

## 兼容运行系统

| 操作系统 | 架构 | 状态 |
|---------|------|------|
| Windows 10 | x64 | 已验证 |
| Windows 11 | x64 | 已验证 |
| Windows Server 2022+ | x64 | 理论兼容 |
| macOS 11+ (Big Sur) | x64, arm64 | 理论兼容 |
| Ubuntu 20.04+ / Debian 11+ | x64 | 理论兼容 |

当前 1.0.0 已在 Windows 11 x64 完成桌面启动、TCP/RTU 连接读取、写入和自动轮询验收。macOS 和 Linux 未经实机测试，如有问题欢迎提交 Issue。

## 主要功能

- 同时支持 **Modbus TCP** 和 **Modbus RTU** 两种通信模式。
- **读取**：FC1 读线圈、FC2 读离散输入、FC3 读保持寄存器、FC4 读输入寄存器。
- **写入**：FC5 写单个线圈、FC6 写单个寄存器、FC15 写多个线圈、FC16 写多个寄存器。
- **数据显示**：地址、十进制值、十六进制（0x）、二进制、32位 IEEE 754 浮点数、ASCII 字符。
- **自动轮询**：启动后按设定间隔持续读取并实时刷新数据表。
- **自动扫描可用串口**，无需手动输入端口号。
- 操作日志按时间记录每次连接、读写请求，按类型（成功/错误/信息）颜色区分。
- 浅色和深色主题跟随系统自动切换。

## 三分钟开始监控

1. 打开本工具。
2. 在左侧连接配置面板选择 **TCP** 或 **RTU** 模式，填写设备参数。
3. 点击连接，状态指示灯变绿表示已连接。
4. 在右侧读取面板选择功能码（如 FC3 读保持寄存器），填写起始地址和数量。
5. 点击执行读取，数据表格展示结果。
6. 如需写入，切换到写入标签，填写地址和值（支持十进制和 0x 十六进制）。
7. 勾选自动轮询可定时刷新，间隔在右侧可调。

如果连接失败，请先确认设备 IP 或串口参数正确，并检查从站 ID 和超时设置。

## 数据与卸载

本工具是纯客户端应用，不存储任何用户数据到远程服务器。所有 Modbus 通信仅在本地网络中进行。无配置文件、无数据库、无本地缓存。

### 卸载

**Windows 用户**：
1. 打开设置 -- 应用 -- 已安装的应用。
2. 找到 ModbusTestTool -- 点击卸载。

**通过 npm 安装的用户**：
`
npm uninstall -g modbus-test-tool
`

**从源码构建的用户**：
直接删除项目目录即可，无残留文件。

## 从源码构建

### 前置要求

- Node.js 20 或更高版本
- npm（随 Node.js 一起安装）
- Git（用于克隆仓库）

### 构建打包

`ash
# 克隆仓库
git clone https://github.com/fbjffmtn22-lab/modbus-test-tool.git
cd modbus-test-tool

# 安装依赖
npm install

# 启动开发模式
npm start

# 打包为可分发安装包
npm run build:win   # Windows 安装包
npm run build:mac   # macOS DMG
npm run build:linux # Linux AppImage / deb
`

打包完成后，安装包位于项目目录下的 dist/ 文件夹中。

## 独立实现

本项目的代码、界面和通信处理均为独立实现，核心架构不依赖任何第三方 Modbus 测试工具或闭源组件：

- **Electron 主进程**（main.js）：独立实现设备连接管理、读写逻辑、自动轮询调度。
- **IPC 桥接层**（preload.js）：前后端通信完全通过 Electron IPC 实现，无 HTTP 服务依赖。
- **前端界面**（public/）：原生 HTML/CSS/JavaScript 实现，无任何前端框架依赖。
- **Modbus 协议**：基于 [modbus-serial](https://github.com/yaacov/node-modbus-serial) 库（MIT 许可证）。
- **串口通信**：基于 [serialport](https://serialport.io/) 库（MIT 许可证）。

项目架构：

`
+---------------------------+
|      Electron Window      |
|  +---------------------+  |
|  |  Renderer Process   |  |
|  |  index.html+app.js  |  |
|  +---------+-----------+  |
|            | IPC          |
|  +---------v-----------+  |
|  |   Main Process      |  |
|  |  main.js+modbus     |  |
|  +---------+-----------+  |
|            | TCP/Serial   |
|  +---------v-----------+  |
|  |  Modbus 设备         |  |
|  +---------------------+  |
+---------------------------+
`

## 安全说明

- **网络隔离**：本工具仅在本地网络中发起 Modbus TCP 连接，不会向互联网发送任何数据。
- **串口安全**：访问串口需要操作系统授权，工具不会修改串口设备配置。
- **权限最小化**：应用仅申请 Modbus 通信所需的网络和串口权限。
- **代码开源**：全部源代码公开在 GitHub，无任何隐藏逻辑、遥测或数据收集。
- **依赖审计**：所有第三方依赖均使用 MIT 许可证的开源库，可审计。
- **报告漏洞**：如发现安全问题，请通过 GitHub Issues 私信报告，不要公开披露。

## 许可证

MIT

---

> 如有问题或建议，欢迎提交 [Issue](https://github.com/fbjffmtn22-lab/modbus-test-tool/issues) 或 [Pull Request](https://github.com/fbjffmtn22-lab/modbus-test-tool/pulls)。
