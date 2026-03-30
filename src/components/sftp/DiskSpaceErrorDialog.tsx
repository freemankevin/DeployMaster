import React from 'react';
import { AlertCircle, Info } from 'lucide-react';
import type { DiskInfo, FileInfo } from '@/services/sftpApi';

interface DiskSpaceErrorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  diskInfo: DiskInfo | null;
  fileInfo?: FileInfo | null;
  errorCode?: 'DISK_SPACE_THRESHOLD_EXCEEDED' | 'DISK_SPACE_INSUFFICIENT';
}

export function DiskSpaceErrorDialog({
  isOpen,
  onClose,
  diskInfo,
  fileInfo,
  errorCode,
}: DiskSpaceErrorDialogProps) {
  if (!isOpen) return null;

  const isThresholdExceeded = errorCode === 'DISK_SPACE_THRESHOLD_EXCEEDED';
  const usagePercent = diskInfo?.usage_percent?.replace('%', '') || '0';
  const usagePercentNum = parseInt(usagePercent, 10);

  // Calculate progress bar color based on usage
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return '#ef4444'; // red-500
    if (percent >= 70) return '#f59e0b'; // amber-500
    return '#22c55e'; // green-500
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-secondary, #1e1e1e)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '420px',
          width: '90%',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          border: '1px solid var(--border-color, #333)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AlertCircle
              size={24}
              style={{ color: '#ef4444' }}
            />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary, #fff)',
              }}
            >
              Insufficient Disk Space
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: '13px',
                color: 'var(--text-secondary, #888)',
              }}
            >
              {isThresholdExceeded
                ? 'Disk usage exceeds safe threshold'
                : 'Not enough space for upload'}
            </p>
          </div>
        </div>

        {/* File info */}
        {fileInfo && (
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary, #252525)',
              borderRadius: '8px',
              padding: '14px 16px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: 'var(--text-secondary, #888)',
                marginBottom: '8px',
              }}
            >
              File
            </div>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary, #fff)',
                fontFamily: 'JetBrains Mono, monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {fileInfo.name}
            </div>
          </div>
        )}

        {/* Disk usage visualization */}
        {diskInfo && (
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary, #252525)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            {/* Usage bar */}
            <div style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary, #888)',
                  }}
                >
                  Disk Usage
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: getProgressColor(usagePercentNum),
                  }}
                >
                  {diskInfo.usage_percent}
                </span>
              </div>
              <div
                style={{
                  height: '8px',
                  backgroundColor: 'var(--bg-primary, #1a1a1a)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.min(usagePercentNum, 100)}%`,
                    backgroundColor: getProgressColor(usagePercentNum),
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            {/* Stats in one row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary, #888)',
                    marginBottom: '4px',
                  }}
                >
                  Total
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-primary, #fff)',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {diskInfo.total_formatted}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary, #888)',
                    marginBottom: '4px',
                  }}
                >
                  Used
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#f59e0b',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {diskInfo.used_formatted}
                </div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary, #888)',
                    marginBottom: '4px',
                  }}
                >
                  Available
                </div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#22c55e',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  {diskInfo.available_formatted}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning message */}
        <div
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <Info
              size={18}
              style={{
                color: '#ef4444',
                marginTop: '1px',
              }}
            />
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ef4444',
                  marginBottom: '4px',
                }}
              >
                {isThresholdExceeded
                  ? `Usage exceeds ${diskInfo?.threshold || '90%'} safety threshold`
                  : 'Not enough available space'}
              </div>
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--text-secondary, #888)',
                  lineHeight: 1.5,
                }}
              >
                {isThresholdExceeded
                  ? 'Please free up disk space before uploading files to prevent system issues.'
                  : 'Please free up disk space or choose a different destination.'}
              </div>
            </div>
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'var(--accent-color, #007aff)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover, #0056b3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color, #007aff)';
          }}
        >
          Got it
        </button>
      </div>
    </div>
  );
}

export default DiskSpaceErrorDialog;