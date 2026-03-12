import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message }: Props) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-bold">{title}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-stone-600 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors"
          >
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
