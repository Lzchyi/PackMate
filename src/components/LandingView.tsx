import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trip, UserProfile } from '../types';
import { Plane, Box, Calendar, MapPin, ChevronRight } from 'lucide-react';
import { parseISO, differenceInDays, startOfDay } from 'date-fns';

interface Props {
  profile: UserProfile | null;
  trips: Trip[];
  onNavigate: (tab: 'trips' | 'inventory') => void;
}

export default function LandingView({ profile, trips, onNavigate }: Props) {
  const { t } = useTranslation();

  const nextTrip = useMemo(() => {
    const now = startOfDay(new Date());
    const upcoming = trips
      .filter(trip => trip.startDate && parseISO(trip.startDate) >= now)
      .sort((a, b) => parseISO(a.startDate!).getTime() - parseISO(b.startDate!).getTime());
    
    return upcoming[0] || null;
  }, [trips]);

  const daysUntil = nextTrip ? differenceInDays(parseISO(nextTrip.startDate!), startOfDay(new Date())) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Welcome Message */}
      <div className="space-y-1">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 leading-tight">
          {t('landing.welcomeBackPrefix')} <br />
          <span className="text-emerald-600">{profile?.name || t('auth.traveler')}</span>
        </h2>
        <p className="text-stone-500 text-lg font-medium">
          {t('landing.whereToNext')}
        </p>
      </div>

      {/* Upcoming Trip Card */}
      {nextTrip && (
        <div 
          onClick={() => onNavigate('trips')}
          className="relative overflow-hidden rounded-3xl bg-stone-900 min-h-[240px] flex flex-col justify-end p-8 sm:p-10 text-white shadow-xl group cursor-pointer hover:shadow-2xl transition-all duration-500"
        >
          {nextTrip.imageUrl ? (
            <>
              <img 
                src={nextTrip.imageUrl} 
                alt={nextTrip.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              {nextTrip.uid && nextTrip.participantProfiles?.[nextTrip.uid] && (
                <div className="absolute top-6 left-6 w-10 h-10 rounded-full border-2 border-white/20 shadow-sm overflow-hidden z-10">
                  {nextTrip.participantProfiles[nextTrip.uid].avatarUrl ? (
                    <img src={nextTrip.participantProfiles[nextTrip.uid].avatarUrl} alt={nextTrip.participantProfiles[nextTrip.uid].name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-stone-200 flex items-center justify-center text-sm font-bold text-stone-500">
                      {nextTrip.participantProfiles[nextTrip.uid].name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
            </>
          )}
          
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider uppercase text-xs">
              <Calendar className="w-4 h-4" />
              {t('landing.upcomingTrip')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
              {t('landing.nextTripPrefix')} <span className="text-emerald-400">{daysUntil === 0 ? t('trips.today') : `${daysUntil} ${t('common.days')}`}</span> {t('landing.nextTripTo')} <br />
              <span className="inline-flex items-center gap-2 mt-1">
                <MapPin className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
                {nextTrip.name}
              </span>
            </h2>
          </div>
          
          <div className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-md rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <ChevronRight className="w-6 h-6" />
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <button
          onClick={() => onNavigate('trips')}
          className="group relative flex flex-col items-start p-8 bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 text-stone-100 group-hover:text-emerald-100 transition-colors">
            <Plane className="w-24 h-24 rotate-12" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl w-fit group-hover:bg-emerald-500 group-hover:text-white transition-colors duration-300">
              <Plane className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900">{t('landing.myTripView')}</h3>
              <p className="text-stone-500 mt-1">{t('landing.myTripViewDesc')}</p>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              {t('landing.exploreTrips')}
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('inventory')}
          className="group relative flex flex-col items-start p-8 bg-white rounded-3xl border border-stone-200 shadow-sm hover:shadow-xl hover:border-blue-500/50 transition-all duration-300 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 text-stone-100 group-hover:text-blue-100 transition-colors">
            <Box className="w-24 h-24 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl w-fit group-hover:bg-blue-500 group-hover:text-white transition-colors duration-300">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-stone-900">{t('landing.myInventory')}</h3>
              <p className="text-stone-500 mt-1">{t('landing.myInventoryDesc')}</p>
            </div>
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
              {t('landing.manageGear')}
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
