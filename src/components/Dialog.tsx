import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2, X, Info, CheckCircle, AlertCircle } from 'lucide-react';

export type DialogType = 'delete' | 'confirm' | 'info' | 'warning' | 'success' | 'error';

export interface DialogProps {
  isOpen: boolean;
  type: DialogType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

// Heartbeat animation styles
const heartbeatKeyframes = `
@keyframes heartbeat {
  0%, 100% { transform: scale(1); }
  10% { transform: scale(1.05); }
  20% { transform: scale(1); }
  30% { transform: scale(1.05); }
  40% { transform: scale(1); }
  50% { transform: scale(1.02); }
  60% { transform: scale(1); }
}

@keyframes glow-pulse {
  0%, 100% { 
    opacity: 0.3;
    transform: scale(1);
  }
  50% { 
    opacity: 0.6;
    transform: scale(1.1);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-5px); }
}

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
`;

export const Dialog = ({
  isOpen,
  type,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  itemName,
  onConfirm,
  onCancel,
}: DialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onCancel();
      setIsClosing(false);
    }, 200);
  }, [onCancel]);

  const handleConfirm = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onConfirm();
      setIsClosing(false);
    }, 150);
  }, [onConfirm]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node) && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const isDelete = type === 'delete';
  const isDanger = type === 'delete' || type === 'error';

  const getIcon = () => {
    switch (type) {
      case 'delete':
        return <Trash2 className="w-6 h-6 text-status-error" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-status-warning" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-status-error" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-status-success" />;
      case 'info':
      default:
        return <Info className="w-6 h-6 text-primary" />;
    }
  };

  const getGlowColor = () => {
    switch (type) {
      case 'delete':
      case 'error':
        return 'from-status-error/20 via-status-error/10 to-transparent';
      case 'warning':
        return 'from-status-warning/20 via-status-warning/10 to-transparent';
      case 'success':
        return 'from-status-success/20 via-status-success/10 to-transparent';
      case 'info':
      default:
        return 'from-primary/20 via-primary/10 to-transparent';
    }
  };

  const getButtonColor = () => {
    if (isDanger) {
      return 'bg-status-error hover:bg-red-600 shadow-status-error/25';
    }
    return 'bg-primary hover:bg-primary-dark shadow-primary/25';
  };

  // Use Portal to render dialog at document.body level
  // This ensures the overlay covers everything including sticky headers
  return createPortal(
    <>
      <style>{heartbeatKeyframes}</style>
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
          isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
      >
        {/* Background overlay - frosted glass effect */}
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 ${
            isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Dialog container */}
        <div
          ref={dialogRef}
          className={`relative w-full max-w-[420px] transform transition-all duration-300 ${
            isVisible && !isClosing
              ? 'scale-100 opacity-100 translate-y-0'
              : 'scale-95 opacity-0 translate-y-4'
          }`}
        >
          {/* Background glow effect */}
          <div
            className={`absolute -inset-1 bg-gradient-to-r ${getGlowColor()} rounded-2xl blur-2xl transition-opacity duration-500 ${
              isVisible ? 'opacity-100' : 'opacity-0'
            } ${isDelete ? 'animate-[glow-pulse_2s_ease-in-out_infinite]' : ''}`}
          />

          {/* Main dialog card */}
          <div className="relative bg-[#1e1e1e]/95 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Top decoration line */}
            <div
              className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent ${
                isDanger ? 'via-red-500/50' : 'via-blue-500/50'
              } to-transparent`}
            />

            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content area */}
            <div className="p-6">
              {/* Icon and title */}
              <div className="flex items-start gap-4">
                {/* Icon container - with breathing effect */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDelete
                      ? 'bg-red-500/10 animate-[heartbeat_2s_ease-in-out_infinite]'
                      : isDanger
                      ? 'bg-red-500/10'
                      : type === 'warning'
                      ? 'bg-amber-500/10'
                      : type === 'success'
                      ? 'bg-emerald-500/10'
                      : 'bg-blue-500/10'
                  }`}
                >
                  {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-gray-100 leading-tight">
                    {title}
                  </h3>
                  {message && (
                    <p className="mt-2 text-[13px] text-gray-400 leading-relaxed">
                      {message}
                      {itemName && (
                        <span className="text-gray-300 font-medium">「{itemName}」</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Button area */}
              <div className="flex items-center justify-end gap-2.5 mt-6">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-[13px] font-medium text-gray-400 hover:text-gray-200
                           hover:bg-white/5 rounded-lg transition-all duration-200
                           active:scale-[0.98]"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-[13px] font-medium text-white rounded-lg
                           transition-all duration-200 active:scale-[0.98]
                           shadow-lg ${getButtonColor()}`}
                >
                  {confirmText || (isDelete ? 'Delete' : 'Confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

// Simple confirmation dialog hook for quick usage
export const useDialog = () => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: DialogType;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    itemName?: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  const showDialog = useCallback(
    (params: {
      type: DialogType;
      title: string;
      message?: string;
      confirmText?: string;
      cancelText?: string;
      itemName?: string;
    }) => {
      return new Promise<boolean>((resolve) => {
        setDialogState({
          ...params,
          isOpen: true,
          onConfirm: () => {
            setDialogState((prev) => ({ ...prev, isOpen: false }));
            resolve(true);
          },
          onCancel: () => {
            setDialogState((prev) => ({ ...prev, isOpen: false }));
            resolve(false);
          },
        });
      });
    },
    []
  );

  const dialogComponent = (
    <Dialog
      isOpen={dialogState.isOpen}
      type={dialogState.type}
      title={dialogState.title}
      message={dialogState.message}
      confirmText={dialogState.confirmText}
      cancelText={dialogState.cancelText}
      itemName={dialogState.itemName}
      onConfirm={dialogState.onConfirm}
      onCancel={dialogState.onCancel}
    />
  );

  return { showDialog, dialogComponent };
};

export default Dialog;
