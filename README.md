# Modbus 测试工具

一个基于 Electron 的桌面端 Modbus TCP/RTU 测试工具。

![screenshot](screenshot.png)

## 功能特性

- **连接方式**：TCP（IP+端口）和 RTU（串口）
- **读取功能**：FC1 读线圈、FC2 读离散输入、FC3 读保持寄存器、FC4 读输入寄存器
- **写入功能**：FC5 写单个线圈、FC6 写单个寄存器、FC15 写多个线圈、FC16 写多个寄存器
- **数据展示**：十进制、十六进制、二进制、32位 IEEE 754 浮点数、ASCII 字符
- **自动轮询**：可配置间隔，持续读取并刷新数据
- **操作日志**：时间戳记录每次连接、读写操作
- **深色主题**：自动适配系统深色模式

## 快速开始

```bash
# 安装依赖
npm install

# 启动应用
npm start
```

## 使用说明

1. **连接配置**：选择 TCP 或 RTU 模式，填写设备参数，点击"连接"
2. **读取数据**：选择功能码和起始地址，点击"执行读取"
3. **写入数据**：切换到"写入"标签，输入地址和值，支持十进制和 `0x` 十六进制
4. **自动轮询**：勾选"自动轮询"可定时刷新数据，间隔可在右侧调整

## 技术栈

- [Electron](https://www.electronjs.org/) - 桌面应用框架
- [modbus-serial](https://github.com/yaacov/node-modbus-serial) - Modbus 协议库
- [serialport](https://serialport.io/) - 串口通信库

## 许可证

MIT
