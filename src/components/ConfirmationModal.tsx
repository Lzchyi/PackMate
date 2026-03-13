import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export default function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  onCancel,
  title, 
  message,
  confirmText,
  cancelText,
  variant = 'danger'
}: Props) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const Icon = variant === 'danger' ? AlertTriangle : Sparkles;

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-stone-800 rounded-3xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`flex items-center gap-3 ${variant === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
            <Icon className="w-6 h-6" />
            <h3 className="text-lg font-bold text-stone-900 dark:text-white">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 dark:text-stone-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-stone-600 dark:text-stone-300 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2.5 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 font-medium rounded-xl transition-colors"
          >
            {cancelText || t('common.cancel')}
          </button>
          <button
            onClick={() => {
              console.log('ConfirmationModal confirm clicked');
              onConfirm();
              onClose();
            }}
            className={`flex-1 px-4 py-2.5 text-white font-medium rounded-xl transition-colors shadow-sm ${
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' : 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700'
            }`}
          >
            {confirmText || (variant === 'danger' ? t('common.delete') : t('common.confirm'))}
          </button>
        </div>
      </div>
    </div>
  );
}
