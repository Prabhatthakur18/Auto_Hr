import React from 'react';
import Toast, { ToastProps } from './Toast';

export interface ToastItem extends Omit<ToastProps, 'onClose'> {
  id: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onClose: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="transform transition-all duration-300 ease-in-out"
          style={{
            transform: `translateY(${index * 90}px)`,
          }}
        >
          <Toast
            {...toast}
            onClose={onClose}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
