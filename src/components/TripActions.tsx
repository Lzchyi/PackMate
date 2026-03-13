import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit3, Upload, Users, LogOut } from 'lucide-react';

interface TripActionsProps {
  isOwner: boolean;
  onInvite: () => void;
  onEdit: () => void;
  onExport: () => void;
  onDelete: () => void;
  onLeave: () => void;
}

export const TripActions: React.FC<TripActionsProps> = ({ 
  isOwner, 
  onInvite, 
  onEdit, 
  onExport, 
  onDelete, 
  onLeave 
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2">
      {isOwner && (
        <button
          onClick={onInvite}
          className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-medium rounded-xl transition-colors flex items-center justify-center"
          title={t('trips.invite', 'Invite')}
          aria-label={t('trips.invite', 'Invite')}
        >
          <Users className="w-4 h-4" />
        </button>
      )}
      {isOwner && (
        <button
          onClick={onEdit}
          className="w-10 h-10 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl transition-colors flex items-center justify-center"
          title={t('common.edit')}
          aria-label={t('common.edit')}
        >
          <Edit3 className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onExport}
        className="w-10 h-10 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl transition-colors flex items-center justify-center"
        title={t('common.export')}
        aria-label={t('common.export')}
      >
        <Upload className="w-4 h-4" />
      </button>
      <button
        onClick={isOwner ? onDelete : onLeave}
        className="w-10 h-10 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center"
        title={isOwner ? t('common.delete') : t('trips.leave', 'Leave')}
        aria-label={isOwner ? t('common.delete') : t('trips.leave', 'Leave')}
      >
        {isOwner ? <Trash2 className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
      </button>
    </div>
  );
};
