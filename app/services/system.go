package services

import (
	"fmt"
	"strconv"
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
		info.PrettyName = distroInfo["PRETTY_NAME"]
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

	var total, free, available, swapTotal, swapFree uint64
	for _, line := range strings.Split(output, "\n") {
		if strings.HasPrefix(line, "MemTotal:") {
			fmt.Sscanf(line, "MemTotal: %d", &total)
		} else if strings.HasPrefix(line, "MemFree:") {
			fmt.Sscanf(line, "MemFree: %d", &free)
		} else if strings.HasPrefix(line, "MemAvailable:") {
			fmt.Sscanf(line, "MemAvailable: %d", &available)
		} else if strings.HasPrefix(line, "SwapTotal:") {
			fmt.Sscanf(line, "SwapTotal: %d", &swapTotal)
		} else if strings.HasPrefix(line, "SwapFree:") {
			fmt.Sscanf(line, "SwapFree: %d", &swapFree)
		}
	}

	// Memory info (convert from KB to bytes)
	info.Total = total * 1024
	info.Free = free * 1024
	info.Available = available * 1024
	info.Used = info.Total - info.Available
	if info.Total > 0 {
		info.Usage = float64(info.Used) / float64(info.Total) * 100
	}

	// Swap info (convert from KB to bytes)
	info.SwapTotal = swapTotal * 1024
	info.SwapUsed = info.SwapTotal - (swapFree * 1024)
	if info.SwapTotal > 0 {
		info.SwapUsage = float64(info.SwapUsed) / float64(info.SwapTotal) * 100
	}

	return info
}

func getDiskInfo(hostID uint) []config.DiskInfo {
	var disks []config.DiskInfo

	// Virtual filesystems to exclude
	// These are temporary or kernel-managed filesystems not suitable for display
	virtualFS := map[string]bool{
		"tmpfs":       true,
		"devtmpfs":    true,
		"devfs":       true,
		"squashfs":    true,
		"overlay":     true,
		"cgroup":      true,
		"cgroup2":     true,
		"proc":        true,
		"sysfs":       true,
		"securityfs":  true,
		"pstore":      true,
		"hugetlbfs":   true,
		"debugfs":     true,
		"tracefs":     true,
		"configfs":    true,
		"fusectl":     true,
		"binfmt_misc": true,
		"ramfs":       true,
		"run":         true,
		"nsfs":        true,
		"hugetlb":     true,
		"bpf":         true,
		"trace":       true,
		"mqueue":      true,
		"fuse.gvfsd":  true,
		"autofs":      true,
	}

	// Mount points to exclude (not meaningful for end-user display)
	// Includes boot, temporary, and system-managed directories
	excludedMounts := map[string]bool{
		// Boot partitions (not user data)
		"/boot":       true,
		"/boot/efi":   true,
		"/boot/grub":  true,
		"/boot/grub2": true,
		
		// Temporary filesystems (cleared on reboot)
		"/tmp":        true,
		"/var/tmp":    true,
		"/run":        true,
		"/run/lock":   true,
		"/run/user":   true,
		
		// System-managed directories
		"/var":        true,
		"/var/log":    true,
		"/var/cache":  true,
		"/var/lib":    true,
		"/var/spool":  true,
		"/var/mail":   true,
		
		// Container/namespace mounts
		"/proc":       true,
		"/sys":        true,
		"/dev":        true,
		"/dev/shm":    true,
		"/dev/pts":    true,
		
		// Snap/flatpak mounts (application-specific)
		"/snap":       true,
		"/var/lib/snapd/snaps": true,
		
		// Kubernetes/Docker mounts
		"/var/lib/docker": true,
		"/var/lib/kubelet": true,
		"/run/containerd": true,
		
		// Other system mounts
		"/efi":        true,
		"/mnt":        true,  // Empty by convention
		"/media":      true,  // Removable media mounts
		"/lost+found": true,
	}

	// Step 1: Get all mounted filesystems using df -Th
	// Format: Filesystem Type Size Used Avail Use% Mounted on
	// Include all /dev/* devices (including LVM like /dev/mapper/*)
	dfOutput, err := config.Pool.ExecuteCommand(hostID, "df -Th -B1 2>/dev/null | grep '^/dev'")
	if err != nil {
		return disks
	}

	// Track which physical disks have been seen
	seenPhysicalDisks := make(map[string]bool)

	// Parse df output
	for _, line := range strings.Split(dfOutput, "\n") {
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 7 {
			continue
		}

		device := parts[0]       // e.g., /dev/sda1 or /dev/mapper/ubuntu--vg-ubuntu--lv
		fsType := parts[1]       // e.g., ext4, xfs
		mountPoint := parts[6]   // e.g., /, /data

		// Skip virtual filesystems
		if virtualFS[fsType] {
			continue
		}

		// Skip excluded mount points (like /boot)
		if excludedMounts[mountPoint] {
			continue
		}

		// Parse size values - they are already in bytes due to -B1 flag
		// df -B1 outputs raw byte numbers without suffixes (e.g., "19327352832" not "18G")
		var total, used, free uint64
		// Use strconv.ParseUint for reliable parsing of large byte values
		total = parseUint64(parts[2])
		used = parseUint64(parts[3])
		free = parseUint64(parts[4])

		// Skip invalid entries with zero total size
		if total == 0 {
			continue
		}

		// Calculate usage percentage from actual values
		usagePercent := float64(0)
		if total > 0 {
			usagePercent = float64(used) / float64(total) * 100
		}

		// Get the physical disk device (resolve LVM to physical disk)
		physicalDisk := getPhysicalDiskDevice(hostID, device)
		physicalName := getPhysicalDiskName(physicalDisk)
		seenPhysicalDisks[physicalName] = true

		disks = append(disks, config.DiskInfo{
			Device:       device,
			PhysicalDisk: physicalDisk,
			MountPoint:   mountPoint,
			FileSystem:   device,
			FSType:       fsType,
			Total:        total,
			Used:         used,
			Free:         free,
			Usage:        usagePercent,
			Status:       "mounted",
			IsVirtual:    false,
		})
	}

	// Step 2: Get all physical disks to find unmounted/unformatted ones
	// First, get all LVM physical volumes to exclude them
	// We need to track both the PV device itself AND its parent disk
	lvmPVs := make(map[string]bool)
	lvmPVPrefixes := make(map[string]bool) // Track disk prefixes that have LVM partitions

	// Method 1: Use pvs command to get LVM physical volumes
	pvsOutput, err := config.Pool.ExecuteCommand(hostID, "pvs --noheadings -o pv_name 2>/dev/null")
	if err == nil {
		for _, line := range strings.Split(pvsOutput, "\n") {
			line = strings.TrimSpace(line)
			if line != "" {
				// Extract device name from /dev/sdb or /dev/sdb1 -> sdb or sdb1
				deviceName := strings.TrimPrefix(line, "/dev/")
				lvmPVs[deviceName] = true

				// Also mark the parent disk
				// e.g., sdb1 -> sdb, nvme0n1p1 -> nvme0n1
				parentDisk := extractParentDisk(deviceName)
				if parentDisk != "" && parentDisk != deviceName {
					lvmPVPrefixes[parentDisk] = true
				}
			}
		}
	}

	// Method 2: Use lsblk to detect LVM2_member filesystem type
	// This catches cases where pvs might not be available
	// Use -o NAME,FSTYPE without -d to include partitions
	lsblkPVOutput, err := config.Pool.ExecuteCommand(hostID, "lsblk -o NAME,FSTYPE -b 2>/dev/null")
	if err == nil {
		for _, line := range strings.Split(lsblkPVOutput, "\n") {
			if line == "" {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				name := parts[0]
				fsType := parts[1]
				// LVM physical volumes have FSTYPE="LVM2_member"
				if fsType == "LVM2_member" {
					lvmPVs[name] = true
					// Also mark the parent disk
					parentDisk := extractParentDisk(name)
					if parentDisk != "" && parentDisk != name {
						lvmPVPrefixes[parentDisk] = true
					}
				}
			}
		}
	}

	// Method 3: Check for LVM logical volumes using lsblk
	// If a disk has children with TYPE="lvm", it's part of LVM
	lsblkLVMOutput, err := config.Pool.ExecuteCommand(hostID, "lsblk -o NAME,TYPE -b 2>/dev/null")
	if err == nil {
		for _, line := range strings.Split(lsblkLVMOutput, "\n") {
			if line == "" {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				name := parts[0]
				devType := parts[1]
				// If device is part of LVM (type = lvm)
				if devType == "lvm" {
					// Mark the parent disk
					parentDisk := extractParentDisk(name)
					if parentDisk != "" {
						lvmPVPrefixes[parentDisk] = true
					}
				}
			}
		}
	}

	lsblkOutput, err := config.Pool.ExecuteCommand(hostID, "lsblk -d -o NAME,SIZE,TYPE -b 2>/dev/null")
	if err != nil {
		return disks
	}

	for _, line := range strings.Split(lsblkOutput, "\n") {
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) < 3 {
			continue
		}

		name := parts[0]
		var size uint64
		var devType string
		fmt.Sscanf(parts[1], "%d", &size)
		if len(parts) >= 3 {
			devType = parts[2]
		}

		// Skip loop devices, cdrom, floppy
		if strings.HasPrefix(name, "loop") || strings.HasPrefix(name, "sr") || strings.HasPrefix(name, "fd") {
			continue
		}

		// Skip if size < 1GB
		if size < 1024*1024*1024 {
			continue
		}

		// Only process disk type devices
		if devType == "disk" {
			// Check if this disk or any of its partitions are already in our list
			if seenPhysicalDisks[name] {
				continue
			}

			// Check if any partition of this disk is mounted
			hasMountedPart := false
			for _, d := range disks {
				physName := getPhysicalDiskName(d.PhysicalDisk)
				if physName == name {
					hasMountedPart = true
					break
				}
			}
			if hasMountedPart {
				continue
			}

			// Skip if this disk is an LVM physical volume
			// These disks are already in use by LVM logical volumes
			if lvmPVs[name] {
				continue
			}

			// Skip if this disk contains LVM partitions (e.g., sdb has sdb1 as LVM PV)
			// These disks are already in use by LVM logical volumes
			if lvmPVPrefixes[name] {
				continue
			}

			// This is an unmounted/unformatted disk
			disks = append(disks, config.DiskInfo{
				Device:       "/dev/" + name,
				PhysicalDisk: "/dev/" + name,
				MountPoint:   "",
				FileSystem:   "",
				FSType:       "",
				Total:        size,
				Used:         0,
				Free:         size,
				Usage:        0,
				Status:       "unmounted",
				IsVirtual:    false,
			})
		}
	}

	// Sort: root mount point first, then by mount point
	sortDisks(disks)

	return disks
}

// getPhysicalDiskName extracts the physical disk name from a device path
// e.g., /dev/sda3 -> sda, /dev/mapper/ubuntu--vg-ubuntu--lv -> sda (via lsblk)
func getPhysicalDiskName(device string) string {
	return strings.TrimPrefix(device, "/dev/")
}

// extractParentDisk extracts the parent disk name from a partition name
// e.g., sda1 -> sda, sdb2 -> sdb, nvme0n1p1 -> nvme0n1
// Returns empty string if the input doesn't look like a partition
func extractParentDisk(partitionName string) string {
	// Handle NVMe devices: nvme0n1p1 -> nvme0n1
	if strings.HasPrefix(partitionName, "nvme") {
		// Find the 'p' that precedes the partition number
		pIndex := strings.LastIndex(partitionName, "p")
		if pIndex > 0 {
			return partitionName[:pIndex]
		}
		return partitionName
	}

	// Handle SD/VD devices: sda1 -> sda, vdb2 -> vdb
	// Pattern: letters followed by optional numbers, then partition number
	// e.g., sda1, sdb2, vda3, etc.
	for i := len(partitionName) - 1; i >= 0; i-- {
		if partitionName[i] < '0' || partitionName[i] > '9' {
			// Found a non-digit character
			// If this is not the last character, we found a partition number
			if i < len(partitionName)-1 {
				return partitionName[:i+1]
			}
			break
		}
	}

	// No partition number found, return as-is
	return partitionName
}

// sortDisks sorts disks with "/" first, then by mount point
func sortDisks(disks []config.DiskInfo) {
	for i := 0; i < len(disks); i++ {
		for j := i + 1; j < len(disks); j++ {
			// Root mount point comes first
			if disks[i].MountPoint != "/" && disks[j].MountPoint == "/" {
				disks[i], disks[j] = disks[j], disks[i]
			} else if disks[i].MountPoint == "/" || disks[j].MountPoint == "/" {
				// Keep root at position 0
			} else if disks[i].MountPoint > disks[j].MountPoint {
				// Sort others by mount point
				disks[i], disks[j] = disks[j], disks[i]
			}
		}
	}
}

// getPhysicalDiskDevice returns the physical disk device for a given device path
// e.g., /dev/mapper/ubuntu--vg-ubuntu--lv -> /dev/sda, /dev/sda3 -> /dev/sda
// Always returns the root disk (e.g., /dev/sdb), not a partition (e.g., /dev/sdb1)
func getPhysicalDiskDevice(hostID uint, device string) string {
	// Normalize device name
	deviceName := strings.TrimPrefix(device, "/dev/")

	var underlyingDevice string

	// Special handling for LVM devices (mapper devices)
	// LVM devices have paths like /dev/mapper/vgname-lvname
	if strings.HasPrefix(device, "/dev/mapper/") || strings.Contains(deviceName, "-") {
		// Method 1: Use lsblk to get the underlying physical disk for LVM
		output, err := config.Pool.ExecuteCommand(hostID, "lsblk -d -no PKNAME "+device+" 2>/dev/null")
		if err == nil {
			parent := strings.TrimSpace(output)
			if parent != "" && parent != deviceName {
				underlyingDevice = parent
			}
		}

		// Method 2: use dmsetup to get device-mapper dependencies
		if underlyingDevice == "" {
			dmOutput, err := config.Pool.ExecuteCommand(hostID, "dmsetup deps -o devname "+deviceName+" 2>/dev/null")
			if err == nil {
				// Output format: "1 dependencies : (sdb1)" or similar
				if strings.Contains(dmOutput, "(") && strings.Contains(dmOutput, ")") {
					start := strings.Index(dmOutput, "(")
					end := strings.Index(dmOutput, ")")
					if start < end {
						underlyingDevice = dmOutput[start+1 : end]
					}
				}
			}
		}

		// Method 3: use lsblk with PKNAME,TYPE
		if underlyingDevice == "" {
			treeOutput, err := config.Pool.ExecuteCommand(hostID, "lsblk -no PKNAME,TYPE "+device+" 2>/dev/null | head -1")
			if err == nil {
				parts := strings.Fields(strings.TrimSpace(treeOutput))
				if len(parts) >= 1 {
					underlyingDevice = parts[0]
				}
			}
		}
	}

	// If we found an underlying device, check if it's a disk or partition
	if underlyingDevice != "" {
		// Check the type of the underlying device
		typeOutput, err := config.Pool.ExecuteCommand(hostID, "lsblk -d -no TYPE /dev/"+underlyingDevice+" 2>/dev/null")
		if err == nil {
			devType := strings.TrimSpace(typeOutput)
			if devType == "disk" {
				return "/dev/" + underlyingDevice
			}
			// If it's a partition, extract the parent disk
			if devType == "part" || devType == "lvm" {
				return extractRootDisk(underlyingDevice)
			}
		}
		// Fallback: try to extract root disk from partition name
		return extractRootDisk(underlyingDevice)
	}

	// Use lsblk to traverse up to the root physical disk
	currentDevice := deviceName
	for {
		output, err := config.Pool.ExecuteCommand(hostID, "lsblk -no PKNAME /dev/"+currentDevice+" 2>/dev/null")
		if err != nil || strings.TrimSpace(output) == "" {
			break
		}

		parent := strings.TrimSpace(output)
		if parent == "" || parent == currentDevice {
			break
		}

		typeOutput, err := config.Pool.ExecuteCommand(hostID, "lsblk -no TYPE /dev/"+parent+" 2>/dev/null")
		if err != nil {
			break
		}

		deviceType := strings.TrimSpace(typeOutput)
		if deviceType == "disk" {
			return "/dev/" + parent
		}

		currentDevice = parent
	}

	// Fallback: extract root disk from device name
	return extractRootDisk(deviceName)
}

// extractRootDisk extracts the root disk name from a device name
// e.g., sdb1 -> sdb, sda3 -> sda, nvme0n1p1 -> nvme0n1
// Returns "/dev/" + disk_name if successful, otherwise returns the original device
func extractRootDisk(deviceName string) string {
	// Handle NVMe devices: nvme0n1p1 -> nvme0n1
	if strings.HasPrefix(deviceName, "nvme") {
		pIndex := strings.LastIndex(deviceName, "p")
		if pIndex > 0 {
			// Check if there's a number after 'p'
			if pIndex+1 < len(deviceName) && deviceName[pIndex+1] >= '0' && deviceName[pIndex+1] <= '9' {
				return "/dev/" + deviceName[:pIndex]
			}
		}
	}

	// Handle SD/VD devices: sda1 -> sda, vdb2 -> vdb
	// Also handles cases like sdb, sdc (no partition number)
	for i := len(deviceName) - 1; i >= 0; i-- {
		if deviceName[i] < '0' || deviceName[i] > '9' {
			// Found a non-digit character
			// If this is not the last character, we found a partition number suffix
			if i < len(deviceName)-1 {
				return "/dev/" + deviceName[:i+1]
			}
			// No partition number, deviceName is already the disk
			break
		}
	}

	// Return as-is with /dev/ prefix
	return "/dev/" + deviceName
}

// parseUint64 safely parses a string to uint64, returning 0 on error
func parseUint64(s string) uint64 {
	v, err := strconv.ParseUint(s, 10, 64)
	if err != nil {
		return 0
	}
	return v
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