import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error';
  message: string;
  onClose: (id: string) => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ id, type, message, onClose, duration = 5000 }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) return 0;
        return prev - (100 / (duration / 50)); // Update every 50ms
      });
    }, 50);

    return () => {
      clearTimeout(timer);
      clearInterval(progressInterval);
    };
  }, [id, duration, onClose]);

  const baseClasses = "fixed top-4 right-4 z-50 max-w-sm w-80 bg-white rounded-xl shadow-2xl border-l-4 p-5 transform transition-all duration-300 ease-in-out backdrop-blur-sm bg-white/95 overflow-hidden hover:shadow-3xl hover:scale-[1.02] cursor-default";
  const typeClasses = type === 'success' 
    ? "border-green-500 shadow-green-100/50 hover:shadow-green-200/50" 
    : "border-red-500 shadow-red-100/50 hover:shadow-red-200/50";
  
  const iconClasses = type === 'success' 
    ? "text-green-500 bg-green-50 ring-1 ring-green-100" 
    : "text-red-500 bg-red-50 ring-1 ring-red-100";

  const progressBarColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';

  const Icon = type === 'success' ? CheckCircle : XCircle;

  return (
    <div className={`${baseClasses} ${typeClasses} animate-slide-in`}>
      {/* Progress Bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-100">
        <div 
          className={`h-full ${progressBarColor} transition-all duration-50 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className={`p-2.5 rounded-full ${iconClasses} transition-all duration-200`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="ml-4 flex-1 pt-0.5">
          <p className={`text-sm font-medium leading-relaxed ${
            type === 'success' ? 'text-green-900' : 'text-red-900'
          }`}>
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => onClose(id)}
            className={`inline-flex rounded-full p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${
              type === 'success' 
                ? 'text-green-400 hover:text-green-600 hover:bg-green-50 focus:ring-green-500' 
                : 'text-red-400 hover:text-red-600 hover:bg-red-50 focus:ring-red-500'
            }`}
            title="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
