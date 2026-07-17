# Modbus 测试工具

一个基于 Electron 的桌面端 Modbus TCP/RTU 测试工具。无需浏览器，无需搭建 Web 服务器，开箱即用。

![screenshot](screenshot.png)

---

## 兼容运行系统

| 操作系统 | 架构 | 状态 |
|---------|------|------|
| Windows 10 或更高版本 | x64, arm64 | 已验证 |
| macOS 11+ (Big Sur) | x64, arm64 (Apple Silicon) | 理论兼容 |
| Ubuntu 20.04+ / Debian 11+ | x64 | 理论兼容 |

> 依赖 Node.js 24+ 及 Electron 43，上述非 Windows 系统未经完整测试，如有问题欢迎提 Issue。

## 主要功能

### 连接方式
- **Modbus TCP**：通过 IP 地址和端口连接远程设备
- **Modbus RTU**：通过串口连接本地设备（支持波特率、数据位、停止位、校验位配置）
- 从站 ID 可配置（1-247），超时时间可调整
- 自动扫描可用串口

### 读取功能
| 功能码 | 操作 | 说明 |
|--------|------|------|
| FC1 | 读线圈 | 读取连续的线圈（DO）状态 |
| FC2 | 读离散输入 | 读取连续的离散输入（DI）状态 |
| FC3 | 读保持寄存器 | 读取连续的保持寄存器（AO）值 |
| FC4 | 读输入寄存器 | 读取连续的输入寄存器（AI）值 |

### 写入功能
| 功能码 | 操作 | 说明 |
|--------|------|------|
| FC5 | 写单个线圈 | 写入单个线圈的开关状态 |
| FC6 | 写单个寄存器 | 写入单个寄存器的值 |
| FC15 | 写多个线圈 | 批量写入多个线圈状态 |
| FC16 | 写多个寄存器 | 批量写入多个寄存器值 |

### 数据显示
- **十进制**：寄存器原始数值（0-65535）
- **十六进制**：0x 格式十六进制显示
- **二进制**：16 位二进制字符串
- **Float**：32 位 IEEE 754 浮点数（大端序，相邻两寄存器为一组）
- **Char**：ASCII 可打印字符（不可打印显示为 .）

### 自动轮询
- 可启用定时自动读取
- 轮询间隔可配置（100ms 起步）
- 数据实时刷新到表格

### 界面特性
- 浅色/深色主题自动适配
- 操作日志记录每次连接、读写请求
- 日志按类型颜色区分（成功/错误/信息）

## 下载安装的完整记录

### 从 GitHub Releases 下载（推荐）

在 [Releases 页面](https://github.com/fbjffmtn22-lab/modbus-test-tool/releases) 下载对应系统的安装包：

```
Windows:    ModbusTestTool-Setup-x.x.x.exe
macOS:      ModbusTestTool-x.x.x.dmg
Linux:      ModbusTestTool-x.x.x.deb / ModbusTestTool-x.x.x.AppImage
```

下载后双击安装即可，无需额外配置。

### 通过 npm 全局安装

```
npm install -g modbus-test-tool
modbus-test-tool
```

## 数据与卸载

### 数据存储
- 本工具是纯客户端应用，不存储任何用户数据到远程服务器
- 所有 Modbus 通信仅在本地网络中进行
- 无配置文件、无数据库、无本地缓存

### 卸载

**Windows 用户**：
1. 打开设置 -- 应用 -- 已安装的应用
2. 找到 ModbusTestTool -- 点击卸载

**通过 npm 安装的用户**：
```
npm uninstall -g modbus-test-tool
```

**从源码构建的用户**：
直接删除项目目录即可，无残留文件。

## 从源码构建

### 前置要求
- Node.js 20 或更高版本
- npm（随 Node.js 一起安装）
- Git（用于克隆仓库）

### 构建步骤

```
# 1. 克隆仓库
git clone https://github.com/fbjffmtn22-lab/modbus-test-tool.git
cd modbus-test-tool

# 2. 安装依赖
npm install

# 3. 启动开发模式
npm start

# 4. 打包为可分发安装包
npm run build:win   # Windows 安装包
npm run build:mac   # macOS DMG
npm run build:linux # Linux AppImage / deb
```

### 构建产物位置
打包完成后，安装包位于项目目录下的 dist/ 文件夹中。

## 独立实现

本项目完全自主实现，不依赖任何第三方 Modbus 测试工具或闭源组件：

- **Electron 主进程** (main.js)：独立实现设备连接管理、读写逻辑、自动轮询调度
- **IPC 桥接层** (preload.js)：前后端通信完全通过 Electron IPC 实现，无 HTTP 服务依赖
- **前端界面** (public/)：原生 HTML/CSS/JavaScript 实现，无任何前端框架依赖
- **Modbus 协议**：基于 [modbus-serial](https://github.com/yaacov/node-modbus-serial) 库（MIT 许可证）
- **串口通信**：基于 [serialport](https://serialport.io/) 库（MIT 许可证）

项目架构图：

```
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
|  |  Modbus Device      |  |
|  +---------------------+  |
+---------------------------+
```

## 安全说明

- **网络隔离**：本工具仅在本地网络中发起 Modbus TCP 连接，不会向互联网发送任何数据
- **串口安全**：访问串口需要操作系统授权，工具不会修改串口设备配置
- **权限最小化**：应用仅申请 Modbus 通信所需的网络和串口权限
- **代码开源**：全部源代码公开在 GitHub，无任何隐藏逻辑遥测或数据收集
- **依赖审计**：所有第三方依赖均使用 MIT 许可证的开源库，可审计
- **报告漏洞**：如发现安全问题，请通过 GitHub Issues 私信报告，不要公开披露

## 许可证

MIT

---

> 如有问题或建议，欢迎提交 [Issue](https://github.com/fbjffmtn22-lab/modbus-test-tool/issues) 或 [Pull Request](https://github.com/fbjffmtn22-lab/modbus-test-tool/pulls)。
