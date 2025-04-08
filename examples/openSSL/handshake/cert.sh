#!/bin/bash

# 获取脚本所在目录
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# 创建 cert 目录
mkdir -p "$SCRIPT_DIR/cert"
cd "$SCRIPT_DIR/cert"

# 生成私钥和证书
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes -subj "/CN=localhost"