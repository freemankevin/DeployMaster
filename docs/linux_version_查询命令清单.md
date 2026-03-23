# Linux 系统版本信息查询命令清单

> 适用发行版：Ubuntu、Debian、CentOS、RHEL、Rocky、AlmaLinux、Alpine、Deepin、openEuler（欧拉）、麒麟（Kylin）、龙蜥（Anolis）、SUSE、Fedora 等

---

## 一、通用命令（所有发行版优先尝试）

```bash
# 标准发行版描述文件（最常用，推荐首选）
cat /etc/os-release

# 旧版兼容写法
cat /etc/os-release 2>/dev/null || cat /etc/system-release 2>/dev/null || cat /etc/issue

# LSB 标准接口（需安装 lsb-release 包）
lsb_release -a

# 仅显示描述行
lsb_release -d

# 内核版本
uname -r

# 完整系统信息（内核 + 主机名 + 架构等）
uname -a

# 查看处理器架构
arch
# 或
uname -m
```

---

## 二、各发行版专属命令

### Ubuntu / Debian

```bash
cat /etc/os-release
cat /etc/debian_version          # 显示 Debian 基础版本号
lsb_release -a
hostnamectl                      # systemd 系统可用，显示完整信息
```

### CentOS / RHEL / Rocky / AlmaLinux / Fedora

```bash
cat /etc/os-release
cat /etc/redhat-release          # 显示 Red Hat 系版本号
cat /etc/centos-release          # CentOS 专属
rpm -q centos-release            # 通过 RPM 包查询版本
rpm -q rocky-release             # Rocky Linux
rpm -q almalinux-release         # AlmaLinux
```

### Alpine Linux

```bash
cat /etc/alpine-release          # 仅显示版本号，如 3.18.0
cat /etc/os-release
```

### SUSE / openSUSE

```bash
cat /etc/os-release
cat /etc/SuSE-release            # 旧版 SUSE 专属文件
```

### openEuler（欧拉）

```bash
cat /etc/os-release
cat /etc/openEuler-release
```

### 麒麟（Kylin）

```bash
cat /etc/os-release
cat /etc/kylin-release
```

### 龙蜥（Anolis OS）

```bash
cat /etc/os-release
cat /etc/anolis-release
```

### Deepin / UOS

```bash
cat /etc/os-release
cat /etc/deepin-version
```

---

## 三、一键兼容脚本（自动适配所有发行版）

```bash
#!/bin/bash
# 自动检测并输出 Linux 系统完整版本信息

echo "===== 系统版本信息 ====="

# 1. 优先读取标准文件
if [ -f /etc/os-release ]; then
    cat /etc/os-release
elif [ -f /etc/system-release ]; then
    cat /etc/system-release
elif [ -f /etc/issue ]; then
    cat /etc/issue
fi

echo ""
echo "===== 内核版本 ====="
uname -r

echo ""
echo "===== 架构信息 ====="
uname -m

echo ""
echo "===== hostnamectl ====="
hostnamectl 2>/dev/null || echo "（systemd 不可用，跳过）"

echo ""
echo "===== lsb_release ====="
lsb_release -a 2>/dev/null || echo "（lsb_release 未安装，跳过）"

# 检查各发行版专属文件
for f in \
    /etc/debian_version \
    /etc/redhat-release \
    /etc/centos-release \
    /etc/alpine-release \
    /etc/SuSE-release \
    /etc/openEuler-release \
    /etc/kylin-release \
    /etc/anolis-release \
    /etc/deepin-version; do
    if [ -f "$f" ]; then
        echo ""
        echo "===== $f ====="
        cat "$f"
    fi
done
```

保存为 `check_os.sh` 后执行：

```bash
bash check_os.sh
```

---

## 四、关键字段说明（/etc/os-release）

| 字段 | 含义 | 示例 |
|------|------|------|
| `NAME` | 发行版名称 | `Ubuntu` |
| `VERSION` | 完整版本描述 | `22.04.3 LTS (Jammy Jellyfish)` |
| `VERSION_ID` | 纯版本号 | `22.04` |
| `PRETTY_NAME` | 对外展示名称（最常用） | `Ubuntu 22.04.3 LTS` |
| `ID` | 发行版 ID | `ubuntu` |
| `ID_LIKE` | 基于哪个发行版 | `debian` |

---

## 五、补充：硬件 & 运行环境

```bash
# 查看是否在容器/虚拟机中
systemd-detect-virt 2>/dev/null

# 查看 CPU 信息
lscpu | grep -E "Architecture|CPU|Model"

# 查看内存
free -h

# 查看磁盘
df -h

# 查看所有挂载的文件系统类型
cat /proc/mounts
```

---

> **提示**：在容器（Docker）中 `/etc/os-release` 反映的是镜像的发行版，`uname -r` 反映的是宿主机内核版本，两者不一定一致。
