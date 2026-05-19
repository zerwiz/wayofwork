import React, { createContext, useContext } from 'react';

interface ToastOptions {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const showToast = (options: ToastOptions) => {
    console.log(`[Toast ${options.type}] ${options.message}`);
    // In a real app, this would show a UI notification
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    return { showToast: (options: ToastOptions) => console.log(`[Toast ${options.type}] ${options.message}`) };
  }
  return context;
};
