import React, { useState, useRef } from 'react';
import { UserProfile, InventoryItem } from '../types';
import { User, Save, LogOut, ShieldCheck, Globe, Shield, X, Camera, Trash2, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { User as FirebaseUser } from 'firebase/auth';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  profile: UserProfile | null;
  user: FirebaseUser | null;
  isGuest: boolean;
  inventory: InventoryItem[];
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

export default function ProfileView({ profile, user, isGuest, inventory, onUpdateProfile, onSignOut, onDeleteAccount }: Props) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState(profile?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const mustBringItems = inventory.filter(item => item.isMaster);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !profile) return;

    try {
      await onUpdateProfile({
        ...profile,
        name: name.trim()
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update profile', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile) return;

    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await onUpdateProfile({
        ...profile,
        avatarUrl: downloadURL
      });
    } catch (err) {
      console.error('Failed to upload image', err);
    }
  };

  const handleRemoveImage = async () => {
    if (!user || !profile) return;

    try {
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await deleteObject(storageRef).catch(() => {}); // Ignore if file doesn't exist
      await onUpdateProfile({
        ...profile,
        avatarUrl: ''
      });
    } catch (err) {
      console.error('Failed to remove image', err);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLanguageChange = async (lang: 'en-GB' | 'zh-CN') => {
    if (!profile) return;
    try {
      await onUpdateProfile({
        ...profile,
        language: lang
      });
      i18n.changeLanguage(lang);
    } catch (err) {
      console.error('Failed to update language', err);
    }
  };

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t('profile.title')}</h2>
          <p className="text-stone-500 mt-1">{t('app.tagline')}</p>
        </div>
        {isGuest && (
          <div className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg flex items-center gap-2 text-amber-700 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            {t('auth.guestWarning')}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="relative group w-24 h-24">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-sm" />
            ) : (
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-4 border-white shadow-sm text-2xl font-bold">
                {profile?.name ? getInitials(profile.name) : <User className="w-10 h-10" />}
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-full">
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-white rounded-full text-stone-700 hover:text-emerald-600">
                <Camera className="w-4 h-4" />
              </button>
              {profile?.avatarUrl && (
                <button onClick={() => setIsDeleteModalOpen(true)} className="p-1.5 bg-white rounded-full text-stone-700 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>
        </div>
        <ConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleRemoveImage}
          title={t('profile.removePhoto')}
          message={t('profile.removePhotoConfirm')}
        />

        {isEditing ? (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{t('inventory.yourName')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-center text-lg"
                required
              />
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-5 h-5" />
                {t('common.save')}
              </button>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-stone-900">{profile?.name}</h3>
              <p className="text-stone-500 mt-1">
                {t('profile.joined')} {new Date(profile?.joinedAt || Date.now()).toLocaleDateString()}
              </p>
              {isGuest && (
                <p className="text-xs text-amber-600 mt-2 font-medium">{t('auth.guestWarning')}</p>
              )}
            </div>
            <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors"
              >
                {t('common.edit')}
              </button>
              <button
                onClick={() => setIsSignOutModalOpen(true)}
                className="px-6 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {isGuest ? t('common.cancel') : t('auth.signOut')}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={onSignOut}
        title={t('profile.signOutConfirmTitle')}
        message={t('profile.signOutConfirmMessage')}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">{t('profile.language')}</h3>
          </div>
          <div className="flex flex-nowrap bg-stone-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => handleLanguageChange('en-GB')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${i18n.language === 'en-GB' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              English
            </button>
            <button
              onClick={() => handleLanguageChange('zh-CN')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${i18n.language === 'zh-CN' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              简体中文
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowPrivacy(true)}
            className="flex items-center gap-3 flex-1 text-left p-0"
          >
            <div className="p-2 bg-stone-100 text-stone-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">{t('profile.privacy')}</h3>
          </button>
        </div>
      </div>

      {profile && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('inventory.master')}</h3>
              <p className="text-sm text-stone-500">{t('app.tagline')}</p>
            </div>
          </div>

          <div className="space-y-2">
            {mustBringItems.length === 0 ? (
              <p className="text-center text-stone-500 py-4 text-sm bg-stone-50 rounded-xl border border-stone-100 border-dashed">
                {t('inventory.noEssentials')}
              </p>
            ) : (
              mustBringItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 bg-stone-50/50 transition-colors">
                  <div>
                    <p className="font-medium text-stone-900 text-sm">{t(`item.${item.name}`, item.name)}</p>
                    <p className="text-xs text-stone-500">{t(`category.${item.category}`, item.category)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="pt-4">
        <button
          onClick={() => setIsDeleteAccountModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium border border-red-100"
        >
          <Trash2 className="w-5 h-5" />
          {t('profile.deleteAccount')}
        </button>
      </div>

      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowPrivacy(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">{t('privacy.title')}</h3>
              <button onClick={() => setShowPrivacy(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="prose prose-stone">
              <p className="text-stone-600 leading-relaxed">
                {t('privacy.content')}
              </p>
            </div>
            <button
              onClick={() => setShowPrivacy(false)}
              className="w-full mt-8 bg-stone-900 text-white font-medium rounded-xl px-6 py-3 hover:bg-stone-800 transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}

      {isDeleteAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsDeleteAccountModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3 text-red-600">
                <Trash2 className="w-6 h-6" />
                <h3 className="text-2xl font-bold">{t('profile.deleteAccountConfirmTitle')}</h3>
              </div>
              <button onClick={() => setIsDeleteAccountModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-stone-600 leading-relaxed">
                {t('profile.deleteAccountConfirmMessage')}
              </p>
              <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
                <p className="text-sm text-red-700 font-medium mb-3">
                  {t('profile.deleteAccountWarning')}
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={t('profile.deleteAccountInputPlaceholder')}
                  className="w-full bg-white border border-red-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsDeleteAccountModalOpen(false)}
                className="flex-1 px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                disabled={deleteConfirmText !== 'Delete Confirm'}
                onClick={() => {
                  onDeleteAccount();
                  setIsDeleteAccountModalOpen(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white font-medium rounded-xl px-6 py-3 transition-colors"
              >
                {t('profile.deleteAccountButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
