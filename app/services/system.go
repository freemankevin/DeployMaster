package services

import (
	"fmt"
	"strings"

	"deploy-master/config"
)

// GetSystemInfo 获取系统信息
func GetSystemInfo(hostID uint) (*config.SystemInfo, error) {
	_, exists := config.Pool.Get(hostID)
	if !exists {
		return nil, fmt.Errorf("not connected")
	}

	info := &config.SystemInfo{}

	// 获取系统信息
	commands := map[string]string{
		"hostname": "hostname",
		"kernel":   "uname -r",
		"os":       "cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d'\"' -f2 || uname -s",
		"uptime":   "uptime -p 2>/dev/null || uptime",
		"cpu":      "cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2 | xargs",
		"memory":   "free -h | grep Mem | awk '{print $2\" / \"$3\" used\"}'",
		"disk":     "df -h / | tail -1 | awk '{print $2\" / \"$3\" used\"}'",
		"ip":       "hostname -I 2>/dev/null | awk '{print $1}' || ip route get 1 | awk '{print $7}'",
	}

	for key, cmd := range commands {
		output, err := config.Pool.ExecuteCommand(hostID, cmd)
		if err == nil {
			switch key {
			case "hostname":
				info.Hostname = strings.TrimSpace(output)
			case "kernel":
				info.Kernel = strings.TrimSpace(output)
			case "os":
				info.OS = strings.TrimSpace(output)
			case "uptime":
				info.Uptime = strings.TrimSpace(output)
			case "cpu":
				info.CPU = strings.TrimSpace(output)
			case "memory":
				info.Memory = strings.TrimSpace(output)
			case "disk":
				info.Disk = strings.TrimSpace(output)
			case "ip":
				info.IP = strings.TrimSpace(output)
			}
		}
	}

	// 获取发行版信息
	if distroInfo, err := getDistroInfo(hostID); err == nil {
		info.Distro = distroInfo["ID"]
		info.DistroLike = distroInfo["ID_LIKE"]
		info.Version = distroInfo["VERSION_ID"]
	}

	return info, nil
}

// GetHardwareInfo 获取硬件信息
func GetHardwareInfo(hostID uint) (*config.HardwareInfo, error) {
	_, exists := config.Pool.Get(hostID)
	if !exists {
		return nil, fmt.Errorf("not connected")
	}

	info := &config.HardwareInfo{}

	// CPU 信息
	info.CPU = getCPUInfo(hostID)

	// 内存信息
	info.Memory = getMemoryInfo(hostID)

	// 磁盘信息
	info.Disks = getDiskInfo(hostID)

	// 网络信息
	info.Network = getNetworkInfo(hostID)

	return info, nil
}

func getDistroInfo(hostID uint) (map[string]string, error) {
	output, err := config.Pool.ExecuteCommand(hostID, "cat /etc/os-release 2>/dev/null")
	if err != nil {
		return nil, err
	}

	info := make(map[string]string)
	for _, line := range strings.Split(output, "\n") {
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := parts[0]
			value := strings.Trim(parts[1], "\"")
			info[key] = value
		}
	}

	return info, nil
}

func getCPUInfo(hostID uint) config.CPUInfo {
	info := config.CPUInfo{}

	// CPU 型号
	output, err := config.Pool.ExecuteCommand(hostID, "cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2 | xargs")
	if err == nil {
		info.Model = strings.TrimSpace(output)
	}

	// 核心数
	output, err = config.Pool.ExecuteCommand(hostID, "nproc")
	if err == nil {
		var cores int
		fmt.Sscanf(output, "%d", &cores)
		info.Cores = cores
		info.Threads = cores
	}

	// 负载
	output, err = config.Pool.ExecuteCommand(hostID, "cat /proc/loadavg")
	if err == nil {
		parts := strings.Fields(output)
		if len(parts) >= 3 {
			var load1, load5, load15 float64
			fmt.Sscanf(parts[0], "%f", &load1)
			fmt.Sscanf(parts[1], "%f", &load5)
			fmt.Sscanf(parts[2], "%f", &load15)
			info.LoadAvg = []float64{load1, load5, load15}
		}
	}

	// CPU 使用率
	output, err = config.Pool.ExecuteCommand(hostID, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1")
	if err == nil {
		var usage float64
		fmt.Sscanf(output, "%f", &usage)
		info.Usage = usage
	}

	return info
}

func getMemoryInfo(hostID uint) config.MemoryInfo {
	info := config.MemoryInfo{}

	output, err := config.Pool.ExecuteCommand(hostID, "cat /proc/meminfo")
	if err != nil {
		return info
	}

	var total, free, available uint64
	for _, line := range strings.Split(output, "\n") {
		if strings.HasPrefix(line, "MemTotal:") {
			fmt.Sscanf(line, "MemTotal: %d", &total)
		} else if strings.HasPrefix(line, "MemFree:") {
			fmt.Sscanf(line, "MemFree: %d", &free)
		} else if strings.HasPrefix(line, "MemAvailable:") {
			fmt.Sscanf(line, "MemAvailable: %d", &available)
		}
	}

	info.Total = total * 1024
	info.Free = free * 1024
	info.Available = available * 1024
	info.Used = info.Total - info.Available
	if info.Total > 0 {
		info.Usage = float64(info.Used) / float64(info.Total) * 100
	}

	return info
}

func getDiskInfo(hostID uint) []config.DiskInfo {
	var disks []config.DiskInfo

	output, err := config.Pool.ExecuteCommand(hostID, "df -B1 | grep '^/dev'")
	if err != nil {
		return disks
	}

	for _, line := range strings.Split(output, "\n") {
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 6 {
			var total, used, free uint64
			fmt.Sscanf(parts[1], "%d", &total)
			fmt.Sscanf(parts[2], "%d", &used)
			fmt.Sscanf(parts[3], "%d", &free)

			usage := float64(0)
			if total > 0 {
				usage = float64(used) / float64(total) * 100
			}

			disks = append(disks, config.DiskInfo{
				Device:     parts[0],
				MountPoint: parts[5],
				FileSystem: parts[0],
				Total:      total,
				Used:       used,
				Free:       free,
				Usage:      usage,
			})
		}
	}

	return disks
}

func getNetworkInfo(hostID uint) []config.NetInfo {
	var nets []config.NetInfo

	output, err := config.Pool.ExecuteCommand(hostID, "ip -o addr show | grep -v 'lo\\|127.0.0.1'")
	if err != nil {
		return nets
	}

	ifaceMap := make(map[string]*config.NetInfo)

	for _, line := range strings.Split(output, "\n") {
		if line == "" {
			continue
		}

		parts := strings.Fields(line)
		if len(parts) >= 4 {
			iface := parts[1]
			if _, exists := ifaceMap[iface]; !exists {
				ifaceMap[iface] = &config.NetInfo{Interface: iface}
			}

			if parts[2] == "inet" {
				ip := strings.Split(parts[3], "/")[0]
				ifaceMap[iface].IP = ip
			}
		}
	}

	// 获取 MAC 地址
	output, err = config.Pool.ExecuteCommand(hostID, "ip -o link show | grep -v lo")
	if err == nil {
		for _, line := range strings.Split(output, "\n") {
			if line == "" {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) >= 20 {
				iface := strings.TrimSuffix(parts[1], ":")
				mac := parts[16]
				if net, exists := ifaceMap[iface]; exists {
					net.MAC = mac
				}
			}
		}
	}

	for _, net := range ifaceMap {
		nets = append(nets, *net)
	}

	return nets
}