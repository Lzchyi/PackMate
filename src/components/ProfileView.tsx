import React, { useState } from 'react';
import { UserProfile, InventoryItem } from '../types';
import { User, Save, LogOut, ShieldCheck, Globe, Shield, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { logout, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

interface Props {
  profile: UserProfile | null;
  user: FirebaseUser | null;
  isGuest: boolean;
  inventory: InventoryItem[];
  onUpdateProfile: (profile: UserProfile) => Promise<void>;
  onSignOut: () => Promise<void>;
}

export default function ProfileView({ profile, user, isGuest, inventory, onUpdateProfile, onSignOut }: Props) {
  const { t, i18n } = useTranslation();
  const [name, setName] = useState(profile?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  
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
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-4 border-white shadow-sm">
                <User className="w-10 h-10" />
              </div>
            )}
          </div>
        </div>

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
                onClick={onSignOut}
                className="px-6 py-2.5 text-red-600 hover:bg-red-50 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {isGuest ? t('common.cancel') : t('auth.signOut')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">{t('profile.language')}</h3>
          </div>
          <div className="flex bg-stone-100 p-1 rounded-xl">
            <button
              onClick={() => handleLanguageChange('en-GB')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${i18n.language === 'en-GB' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              English (UK)
            </button>
            <button
              onClick={() => handleLanguageChange('zh-CN')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${i18n.language === 'zh-CN' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              简体中文
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowPrivacy(true)}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-stone-100 hover:bg-stone-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 text-stone-600 rounded-lg">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold">{t('profile.privacy')}</h3>
          </div>
        </button>
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
                    <p className="font-medium text-stone-900 text-sm">{item.name}</p>
                    <p className="text-xs text-stone-500">{item.category}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

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
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
