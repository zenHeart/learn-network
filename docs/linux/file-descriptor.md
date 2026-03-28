# Linux 文件句柄完全指南

> 本文档介绍 Linux 系统中文件句柄（File Descriptor）的概念、查看方法、常见错误排查以及模拟实验。

## 目录

- [1. 什么是文件句柄](#1-什么是文件句柄)
- [2. 查看进程文件句柄](#2-查看进程文件句柄)
- [3. 查看系统级文件句柄](#3-查看系统级文件句柄)
- [4. 文件句柄限制](#4-文件句柄限制)
- [5. 常见错误：Too many open files](#5-常见错误too-many-open-files)
- [6. 模拟文件句柄泄露](#6-模拟文件句柄泄露)
- [7. 排查步骤](#7-排查步骤)
- [8. 命令速查表](#8-命令速查表)

---

## 1. 什么是文件句柄

### 1.1 定义

**文件句柄（File Descriptor）**是 Linux 内核为进程分配的整数标识符，用于访问文件、网络连接、管道等资源。

### 1.2 标准文件描述符

每个进程启动时默认有三个标准文件描述符：

| FD | 名称 | 默认关联 |
|----|------|---------|
| 0 | stdin | 标准输入（键盘） |
| 1 | stdout | 标准输出（终端） |
| 2 | stderr | 标准错误输出（终端） |

### 1.3 文件句柄与文件指针的区别

- **文件句柄（FD）**：内核层面的整数标识符，进程通过它与内核交互
- **文件指针（FILE*）**：C 标准库封装后的结构体，包含 FD 和缓冲区的信息

---

## 2. 查看进程文件句柄

### 2.1 通过 /proc/<PID>/fd 目录查看

每个进程在 `/proc/<PID>/fd/` 目录下有其打开的所有文件句柄：

```bash
# 查看当前 shell 进程的文件句柄
ls -la /proc/$$/fd

# 查看指定进程的文件句柄
ls -la /proc/<PID>/fd

# 示例：查看 sshd 进程的 FD
ps aux | grep sshd
ls -la /proc/$(pgrep sshd)/fd | head -20
```

### 2.2 使用 lsof 命令

**lsof（List Open Files）** 是最常用的查看进程打开文件的工具：

```bash
# 基本用法：查看所有打开的文件
lsof

# 查看指定进程打开的文件
lsof -p <PID>

# 查看指定用户打开的文件
lsof -u <username>

# 查看网络连接（文件句柄）
lsof -i

# 查看 TCP 连接
lsof -iTCP

# 查看端口 80 上的进程
lsof -i:80

# 查看正在使用某个文件的进程
lsof /path/to/file

# 查看某个目录下的所有打开文件
lsof +D /path/to/directory
```

### 2.3 常用 lsof 输出字段

```
COMMAND  PID  USER  FD  TYPE  DEVICE  SIZE/OFF  NODE  NAME
sshd    1234  root  0u  CHR   136,0   0t0        3   /dev/pts/0
sshd    1234  root  1w  REG   253,0   0           12345 /var/log/auth.log
sshd    1234  root  3u  IPv4  12345   0t0        TCP  *:22 (LISTEN)
```

字段说明：
- **COMMAND**：进程名
- **PID**：进程 ID
- **USER**：运行用户
- **FD**：文件描述符编号，末尾的 `u` 表示读/写模式
- **TYPE**：文件类型（CHR=字符设备，REG= regular file，IPv4=网络连接等）
- **NAME**：文件路径或连接信息

---

## 3. 查看系统级文件句柄

### 3.1 查看文件系统挂载点

```bash
# 查看所有挂载的文件系统
mount

# 查看 df 信息（磁盘空间）
df -h

# 查看 inode 使用情况
df -i
```

### 3.2 查看打开的文件总数

```bash
# 系统级：所有进程打开的文件句柄总数
cat /proc/sys/fs/file-nr

# 输出示例：1200  0  65536
# 1200 = 已分配的文件句柄数
# 0 = 分配但未使用的数量
# 65536 = 系统最大文件句柄数
```

### 3.3 查看各进程文件句柄使用排名

```bash
# 找出打开文件最多的前 10 个进程
lsof 2>/dev/null | awk '{print $2}' | sort | uniq -c | sort -rn | head -10
```

---

## 4. 文件句柄限制

### 4.1 系统级限制

```bash
# 查看系统最大文件句柄数
cat /proc/sys/fs/file-max

# 临时修改（重启后失效）
echo 200000 > /proc/sys/fs/file-max

# 永久修改（编辑 /etc/sysctl.conf）
echo "fs.file-max = 200000" >> /etc/sysctl.conf
sysctl -p
```

### 4.2 用户级限制（ulimit）

```bash
# 查看当前用户的文件句柄限制
ulimit -n

# 临时修改（当前 shell 会话有效）
ulimit -n 4096

# 永久修改（编辑 /etc/security/limits.conf）
# 添加：
# * soft nofile 4096
# * hard nofile 4096
```

### 4.3 进程级限制

```bash
# 查看进程的限制
cat /proc/<PID>/limits

# 示例输出：
# Max open files            1024                 4096                 files
```

---

## 5. 常见错误：Too many open files

### 5.1 错误原因

当进程打开的文件句柄数达到系统或用户限制时，会触发此错误：
- 系统文件句柄达到 `fs.file-max`
- 用户文件句柄达到 `ulimit -n` 限制
- 进程文件句柄达到 `ulimit -n` 限制

### 5.2 错误信息

```
bash: cannot open so many files
Too many open files
Error: EMFILE (Too many open files)
```

### 5.3 常见触发场景

1. **文件句柄泄露**：程序打开文件后未正确关闭
2. **并发连接过多**：Web 服务器同时处理大量请求
3. **日志文件未轮转**：日志持续增长，打开大量日志文件
4. **小程序测试脚本**：循环创建文件未关闭

---

## 6. 模拟文件句柄泄露

### 6.1 Shell 脚本模拟

```bash
#!/bin/bash
# 文件句柄泄露模拟脚本

LIMIT=100
COUNT=0
FDS=()

echo "开始模拟文件句柄泄露..."
echo "当前限制: $(ulimit -n)"

while [ $COUNT -lt $LIMIT ]; do
    # 打开文件但不关闭（保持 FD 占用）
    exec {FD}<>/tmp/test_file_$COUNT.txt
    FDS+=($FD)
    echo "Opened FD $FD: /tmp/test_file_$COUNT.txt"
    ((COUNT++))
done

echo ""
echo "已打开 $COUNT 个文件句柄"
echo "当前限制: $(ulimit -n)"

# 清理
for FD in "${FDS[@]}"; do
    eval "exec ${FD}>&-"
done
echo "已清理所有文件句柄"
```

### 6.2 Python 脚本模拟

```python
#!/usr/bin/env python3
"""模拟文件句柄泄露"""

import sys
import os
import tempfile

def simulate_fd_leak(limit=100):
    """打开多个文件但不关闭"""
    fds = []
    count = 0
    
    print(f"开始模拟文件句柄泄露...")
    print(f"当前 ulimit: {os.popen('ulimit -n').read().strip()}")
    
    try:
        while count < limit:
            # 创建临时文件并保持打开
            fd = os.open(
                f"/tmp/fd_test_{count}.txt",
                os.O_CREAT | os.O_RDWR
            )
            fds.append(fd)
            print(f"Opened FD {fd}: /tmp/fd_test_{count}.txt")
            count += 1
        
        print(f"\n成功打开 {count} 个文件句柄")
        print(f"当前限制: {os.popen('ulimit -n').read().strip()}")
        
        # 验证
        import subprocess
        result = subprocess.run(
            ['lsof', '-p', str(os.getpid())],
            capture_output=True, text=True
        )
        open_files = len(result.stdout.strip().split('\n')) - 1
        print(f"lsof 统计: {open_files} 个打开文件")
        
    except OSError as e:
        if e.errno == 24:  # EMFILE
            print(f"\n错误: {e}")
            print("触发 'Too many open files' 错误！")
        raise
    
    finally:
        # 清理
        for fd in fds:
            os.close(fd)
        print("\n已清理所有文件句柄")

if __name__ == "__main__":
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    simulate_fd_leak(limit)
```

### 6.3 Node.js 脚本模拟

```javascript
#!/usr/bin/env node
/** 模拟文件句柄泄露 */

const fs = require('fs');
const path = require('path');

async function simulateFDLeak(limit = 100) {
  const fds = [];
  
  console.log('开始模拟文件句柄泄露...');
  console.log(`目标: 打开 ${limit} 个文件句柄`);
  
  try {
    for (let i = 0; i < limit; i++) {
      const filePath = `/tmp/fd_test_${i}.txt`;
      // 打开文件，获取 fd（不关闭）
      const fd = fs.openSync(filePath, 'w+');
      fds.push({ fd, path: filePath });
      console.log(`Opened FD ${fd}: ${filePath}`);
    }
    
    console.log(`\n成功打开 ${fds.length} 个文件句柄`);
    
  } catch (err) {
    if (err.code === 'EMFILE') {
      console.log(`\n错误: Too many open files (${err.code})`);
      console.log('已达到文件句柄限制！');
    }
    throw err;
    
  } finally {
    // 清理
    for (const { fd, path } of fds) {
      try {
        fs.closeSync(fd);
      } catch (e) {
        // 忽略
      }
    }
    console.log('\n已清理所有文件句柄');
  }
}

const limit = parseInt(process.argv[2]) || 100;
simulateFDLeak(limit).catch(console.error);
```

---

## 7. 排查步骤

### 7.1 发现问题

1. **应用报错**：日志中出现 "Too many open files"
2. **服务无响应**：新建连接失败
3. **系统异常**：特定服务无法启动

### 7.2 排查流程

```bash
# 1. 确认问题现象
echo "测试写入" > /tmp/test.txt

# 2. 查看当前文件句柄使用情况
cat /proc/sys/fs/file-nr

# 3. 查看最耗文件句柄的进程
lsof 2>/dev/null | awk '{print $2}' | sort | uniq -c | sort -rn | head -5

# 4. 查看具体进程的文件句柄
# 将 <PID> 替换为可疑进程
lsof -p <PID>

# 5. 查看网络连接（可能是网络句柄）
lsof -i

# 6. 检查是否有泄露
watch -n 1 'lsof -p <PID> | wc -l'
```

### 7.3 快速修复

```bash
# 临时提高用户限制
ulimit -n 65536

# 如果是某个进程，可以重启
systemctl restart <service>

# 或者重启应用
kill -9 <PID>
```

---

## 8. 命令速查表

| 命令 | 说明 |
|------|------|
| `lsof` | 列出所有打开的文件 |
| `lsof -p <PID>` | 查看指定进程的文件 |
| `lsof -u <USER>` | 查看指定用户的文件 |
| `lsof -i` | 查看网络连接 |
| `lsof -i:80` | 查看端口 80 的进程 |
| `lsof /path` | 查看使用某文件的进程 |
| `ls /proc/<PID>/fd` | 查看进程 FD 目录 |
| `cat /proc/sys/fs/file-nr` | 查看系统 FD 状态 |
| `ulimit -n` | 查看/设置用户 FD 限制 |
| `cat /proc/sys/fs/file-max` | 查看系统 FD 上限 |

---

## 参考资料

- [lsof man page](https://linux.die.net/man/8/lsof)
- [Linux kernel Documentation - file handles](https://www.kernel.org/doc/Documentation/filesystems/proc.txt)
- [/proc/sys/fs/file-nr 解释](https://www.baeldung.com/linux/file-nr-parameters)
