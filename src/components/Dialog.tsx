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

// Simple pulse animation for delete dialog
const pulseKeyframes = `
@keyframes pulse-status {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
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
    }, 150);
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
        return <Trash2 className="w-5 h-5" style={{ color: 'var(--color-error)' }} />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />;
      case 'error':
        return <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />;
      case 'success':
        return <CheckCircle className="w-5 h-5" style={{ color: 'var(--color-success)' }} />;
      case 'info':
      default:
        return <Info className="w-5 h-5" style={{ color: 'var(--accent)' }} />;
    }
  };

  const getIconBg = () => {
    switch (type) {
      case 'delete':
      case 'error':
        return 'var(--color-error-muted)';
      case 'warning':
        return 'var(--color-warning-muted)';
      case 'success':
        return 'var(--color-success-muted)';
      case 'info':
      default:
        return 'var(--accent-muted)';
    }
  };

  // Use Portal to render dialog at document.body level
  return createPortal(
    <>
      <style>{pulseKeyframes}</style>
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-150 ${
          isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
      >
        {/* Background overlay - Railway style */}
        <div
          className="absolute inset-0 transition-opacity duration-150"
          style={{
            background: 'rgba(11, 13, 15, 0.85)',
            backdropFilter: 'blur(8px)',
            opacity: isVisible && !isClosing ? 1 : 0,
          }}
        />

        {/* Dialog container */}
        <div
          ref={dialogRef}
          className={`relative w-full max-w-[420px] transform transition-all duration-150 ${
            isVisible && !isClosing
              ? 'scale-100 opacity-100 translate-y-0'
              : 'scale-95 opacity-0 translate-y-2'
          }`}
        >
          {/* Main dialog card - Railway style */}
          <div 
            className="relative rounded-lg overflow-hidden"
            style={{
              background: 'var(--bg-overlay)',
              border: '0.5px solid var(--border-default)',
            }}
          >
            {/* Close button - Railway style */}
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 close-btn"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Content area */}
            <div className="p-6">
              {/* Icon and title */}
              <div className="flex items-start gap-4">
                {/* Icon container */}
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ 
                    background: getIconBg(),
                    animation: isDelete ? 'pulse-status 1.5s ease-in-out infinite' : undefined,
                  }}
                >
                  {getIcon()}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 
                    className="text-sm font-medium leading-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {title}
                  </h3>
                  {message && (
                    <p 
                      className="mt-2 text-[13px] leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {message}
                      {itemName && (
                        <span style={{ color: 'var(--text-primary)' }}> "{itemName}"</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Button area - Railway style */}
              <div className="flex items-center justify-end gap-2 mt-6">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-[13px] font-medium rounded-lg btn-ghost"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-[13px] font-medium text-white rounded-lg transition-all duration-150 ${
                    isDanger ? 'btn-danger-primary' : 'btn-primary'
                  }`}
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