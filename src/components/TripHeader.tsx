import React from 'react';
import { useTranslation } from 'react-i18next';
import { Map as MapIcon, Car, Calendar, Clock } from 'lucide-react';
import { Trip } from '../types';
import { formatDateRange } from '../utils/date';

interface TripHeaderProps {
  trip: Trip;
  daysUntil: string | null;
}

export const TripHeader: React.FC<TripHeaderProps> = ({ trip, daysUntil }) => {
  const { t } = useTranslation();

  return (
    <div className="relative rounded-3xl overflow-hidden bg-stone-900">
      {trip.imageUrl ? (
        <>
          <img src={trip.imageUrl} alt={trip.name} className="w-full h-64 sm:h-64 object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/30" />
        </>
      ) : (
        <div className="w-full h-64 sm:h-48 bg-gradient-to-r from-emerald-800 to-teal-900" />
      )}
      {trip.participants && (
        <div className="absolute top-4 right-4 flex -space-x-2">
          {Array.from(new Set([trip.uid, ...(trip.participants || [])])).filter(Boolean).map(uid => {
            const participant = trip.participantProfiles?.[uid as string];
            return (
              <div key={uid} className="w-8 h-8 rounded-full border-2 border-stone-900 bg-stone-200 flex items-center justify-center text-xs font-bold text-stone-500 overflow-hidden">
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
      
      <div className="absolute inset-0 p-6 flex flex-col justify-end">
        <div className="text-white mb-4">
          <h2 className="text-3xl font-bold text-white drop-shadow-md">{trip.name}</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 pb-2">
          <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
            <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs sm:text-base font-medium whitespace-nowrap">
              <MapIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-emerald-400" />
              {t(`type.${trip.tripType}`, trip.tripType)}
            </div>
            {trip.transportationType && (
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs sm:text-base font-medium whitespace-nowrap">
                <Car className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-400" />
                {t(`transport.${trip.transportationType}`, trip.transportationType)}
              </div>
            )}
          </div>
          <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar">
            <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs sm:text-base font-medium whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-purple-400" />
              {trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : trip.duration}
            </div>
            {daysUntil && (
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:px-5 sm:py-2.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs sm:text-base font-medium whitespace-nowrap">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-400" />
                {daysUntil}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
