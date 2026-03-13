import React from 'react';
import { Plane, Car, Calendar, Clock } from 'lucide-react';
import { parseISO, differenceInDays, startOfDay } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { Trip, UserProfile } from '../types';
import { formatDateRange } from '../utils/date';

interface TripCardProps {
  trip: Trip;
  onSelectTrip: (id: string) => void;
  profile?: UserProfile;
}

export const TripCard: React.FC<TripCardProps> = ({ trip, onSelectTrip, profile }) => {
  const { t } = useTranslation();
  const packedCount = trip.items.filter(i => i.isPacked).length;
  const totalCount = trip.items.length;
  const progress = totalCount === 0 ? 0 : Math.round((packedCount / totalCount) * 100);

  let daysUntil = null;
  if (trip.startDate) {
    const start = parseISO(trip.startDate);
    const today = startOfDay(new Date());
    const days = differenceInDays(start, today);
    if (days > 0) daysUntil = t('trips.daysUntil', { count: days });
    else if (days === 0) daysUntil = t('trips.today');
  }

  return (
    <div
      key={trip.id}
      onClick={() => onSelectTrip(trip.id)}
      className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:border-emerald-500/50 hover:shadow-md transition-all text-left group relative cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label={`View details for trip: ${trip.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectTrip(trip.id);
        }
      }}
    >
      <div className="h-64 sm:h-56 relative w-full">
        {trip.imageUrl ? (
          <img src={trip.imageUrl} alt={trip.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700" />
        )}
        {trip.participants && (
          <div className="absolute top-3 right-3 flex -space-x-2">
            {Array.from(new Set([trip.uid, ...(trip.participants || [])])).filter(Boolean).map(uid => {
              const participant = trip.participantProfiles?.[uid as string];
              return (
                <div key={uid} className="w-8 h-8 rounded-full border-2 border-white bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500 overflow-hidden">
                  {participant?.avatarUrl ? (
                    <img src={participant.avatarUrl} alt={participant?.name || ''} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    participant?.name.charAt(0).toUpperCase()
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-2xl font-bold text-white drop-shadow-md mb-2 truncate">
            {trip.name}
          </h3>
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="flex items-center gap-1 px-2 py-0.5 sm:px-4 sm:py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-sm text-white font-medium whitespace-nowrap">
              <Plane className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-emerald-400" /> 
              {t(`type.${trip.tripType}`, trip.tripType)}
            </span>
            {trip.transportationType && (
              <span className="flex items-center gap-1 px-2 py-0.5 sm:px-4 sm:py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-sm text-white font-medium whitespace-nowrap">
                <Car className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-blue-400" /> 
                {t(`transport.${trip.transportationType}`, trip.transportationType)}
              </span>
            )}
            <span className="flex items-center gap-1 px-2 py-0.5 sm:px-4 sm:py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-sm text-white font-medium whitespace-nowrap">
              <Calendar className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-purple-400" /> 
              {trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : trip.duration}
            </span>
            {daysUntil && (
              <span className="flex items-center gap-1 px-2 py-0.5 sm:px-4 sm:py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] sm:text-sm text-white font-medium whitespace-nowrap">
                <Clock className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-amber-400" /> 
                {daysUntil}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-400 rounded-full" 
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] font-medium text-white/80">{packedCount}/{totalCount}</span>
          </div>
        </div>

        {profile?.avatarUrl && (
          <img src={profile.avatarUrl} alt="Avatar" className="absolute top-3 left-3 w-8 h-8 rounded-full border-2 border-white/20 shadow-sm object-cover" referrerPolicy="no-referrer" />
        )}
      </div>
    </div>
  );
};
