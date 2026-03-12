import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { format, parseISO } from 'date-fns';
import { Trip, InventoryItem, UserProfile, CustomList, PackingItem } from '../types';
import { TRIP_TYPES, TRANSPORTATION_TYPES, SUGGESTED_ITEMS } from '../data/constants';
import { Map, Calendar, Plus, ChevronRight, Plane, Filter, ArrowUpDown, Image as ImageIcon, Download, X, Car } from 'lucide-react';
import { resizeImage } from '../utils/image';
import { formatDateRange } from '../utils/date';

interface Props {
  trips: Trip[];
  inventory: InventoryItem[];
  profile: UserProfile | null;
  customLists: CustomList[];
  onAddTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onSelectTrip: (id: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'name' | 'progress';

export default function TripListView({ trips, inventory, profile, customLists, onAddTrip, onDeleteTrip, onSelectTrip }: Props) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripType, setNewTripType] = useState(TRIP_TYPES[0]);
  const [newTripCustomType, setNewTripCustomType] = useState('');
  const [newTripTransportation, setNewTripTransportation] = useState(TRANSPORTATION_TYPES[0]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [newTripImage, setNewTripImage] = useState<string | undefined>();
  
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterType, setFilterType] = useState<string>('All');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImage(file, 800, 600);
      setNewTripImage(base64);
    } catch (err) {
      console.error('Failed to resize image', err);
      alert(t('trips.imageResizeError'));
    }
  };

  const handleImportTrip = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedTrip = JSON.parse(event.target?.result as string);
        // Basic validation
        if (importedTrip && importedTrip.name && Array.isArray(importedTrip.items)) {
          // Generate new ID to avoid collisions
          const newTrip: Trip = {
            ...importedTrip,
            id: Math.random().toString(36).substring(2, 9),
            createdAt: Date.now(),
            // Reset packed status for imported trips
            items: importedTrip.items.map((item: any) => ({
              ...item,
              id: Math.random().toString(36).substring(2, 9),
              isPacked: false
            }))
          };
          onAddTrip(newTrip);
          onSelectTrip(newTrip.id);
        } else {
          alert(t('trips.importError'));
        }
      } catch (err) {
        console.error('Failed to parse trip file', err);
        alert(t('trips.importError'));
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('must-bring');

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim() || !startDate || !endDate) return;

    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');

    let initialItems: PackingItem[] = [];
    if (selectedTemplateId === 'must-bring') {
      // Add items marked as "Must Bring" in inventory
      const masterItems = inventory.filter(item => item.isMaster).map(item => ({
        id: Math.random().toString(36).substring(2, 9),
        name: item.name,
        category: item.category,
        isPacked: false,
        quantity: item.quantity || 1
      }));
      
      // Also add "All Essentials" suggested items
      const essentialItems = (SUGGESTED_ITEMS['All'] || []).map(item => ({
        id: Math.random().toString(36).substring(2, 9),
        name: item.name,
        category: item.category,
        isPacked: false,
        quantity: 1
      }));

      // Combine and avoid duplicates by name
      const combined = [...masterItems];
      essentialItems.forEach(item => {
        if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
          combined.push(item);
        }
      });
      initialItems = combined;
    } else if (selectedTemplateId !== 'none') {
      const list = customLists?.find(l => l.id === selectedTemplateId);
      if (list) {
        initialItems = list.items.map(item => ({
          id: Math.random().toString(36).substring(2, 9),
          name: item.name,
          category: item.category,
          isPacked: false,
          quantity: 1
        }));
      }
    }

    const finalTripType = newTripType === 'Other' ? newTripCustomType.trim() || 'Other' : newTripType;

    const newTrip: Trip = {
      id: Math.random().toString(36).substring(2, 9),
      name: newTripName.trim(),
      tripType: finalTripType,
      transportationType: newTripTransportation,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      duration: `${formattedStartDate} ${t('trips.to')} ${formattedEndDate}`,
      items: initialItems,
      createdAt: Date.now(),
      imageUrl: newTripImage
    };

    // Optimistically close modal and reset fields
    setIsCreating(false);
    setNewTripName('');
    setDateRange([null, null]);
    setNewTripImage(undefined);

    // Navigate immediately to avoid delay
    onSelectTrip(newTrip.id);

    try {
      await onAddTrip(newTrip);
    } catch (err) {
      console.error('Failed to create trip', err);
      alert(t('trips.createError') || 'Failed to create trip. Please try again.');
    }
  };

  const { upcomingTrips, pastTrips } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filtered = [...trips];
    
    if (filterType !== 'All') {
      filtered = filtered.filter(t => t.tripType === filterType);
    }

    const upcoming: Trip[] = [];
    const past: Trip[] = [];

    filtered.forEach(trip => {
      const tripEndDate = trip.endDate ? parseISO(trip.endDate) : null;
      if (tripEndDate && tripEndDate < now) {
        past.push(trip);
      } else {
        upcoming.push(trip);
      }
    });

    // Sort upcoming: nearest first
    upcoming.sort((a, b) => {
      if (sortBy === 'newest') {
        const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
        const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
        return dateA - dateB;
      }
      // Other sorts
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'progress') {
        const progA = a.items.length ? a.items.filter(i => i.isPacked).length / a.items.length : 0;
        const progB = b.items.length ? b.items.filter(i => i.isPacked).length / b.items.length : 0;
        return progB - progA;
      }
      return b.createdAt - a.createdAt;
    });

    // Sort past: most recent first
    past.sort((a, b) => {
      const dateA = a.endDate ? parseISO(a.endDate).getTime() : 0;
      const dateB = b.endDate ? parseISO(b.endDate).getTime() : 0;
      return dateB - dateA;
    });

    return { upcomingTrips: upcoming, pastTrips: past };
  }, [trips, filterType, sortBy]);

  const renderTripCard = (trip: Trip) => {
    const packedCount = trip.items.filter(i => i.isPacked).length;
    const totalCount = trip.items.length;
    const progress = totalCount === 0 ? 0 : Math.round((packedCount / totalCount) * 100);

    return (
      <div
        key={trip.id}
        onClick={() => onSelectTrip(trip.id)}
        className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:border-emerald-500/50 hover:shadow-md transition-all text-left group flex flex-col sm:flex-row relative cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectTrip(trip.id); }}
      >
        <div className="h-40 sm:h-auto sm:w-56 relative shrink-0">
          {trip.imageUrl ? (
            <img src={trip.imageUrl} alt={trip.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-2xl font-bold text-white drop-shadow-md mb-2 truncate">
              {trip.name}
            </h3>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <span className="flex items-center gap-1 px-2 py-0.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] text-white font-medium whitespace-nowrap">
                <Plane className="w-2.5 h-2.5 text-emerald-400" /> 
                {t(`type.${trip.tripType}`, trip.tripType)}
              </span>
              {trip.transportationType && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] text-white font-medium whitespace-nowrap">
                  <Car className="w-2.5 h-2.5 text-blue-400" /> 
                  {t(`transport.${trip.transportationType}`, trip.transportationType)}
                </span>
              )}
              <span className="flex items-center gap-1 px-2 py-0.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] text-white font-medium whitespace-nowrap">
                <Calendar className="w-2.5 h-2.5 text-purple-400" /> 
                {trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : trip.duration}
              </span>
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
            <img src={profile.avatarUrl} alt="Avatar" className="absolute top-3 left-3 w-8 h-8 rounded-full border-2 border-white/20 shadow-sm object-cover" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">{t('trips.title')}</h2>
          <p className="text-stone-500 mt-1">{t('trips.tagline')}</p>
        </div>
        {!isCreating && (
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImportTrip} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl px-4 py-2 flex items-center justify-center gap-2 transition-colors"
              title={t('trips.import')}
            >
              <Download className="w-5 h-5" />
              <span>{t('trips.import')}</span>
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-4 py-2 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{t('trips.new')}</span>
            </button>
          </div>
        )}
      </div>

      {trips.length > 0 && !isCreating && (
        <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
          <div className="flex-1 flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-400" />
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 flex-1 sm:flex-none"
            >
              <option value="All">{t('trips.allTypes')}</option>
              {TRIP_TYPES.map(type => <option key={type} value={type}>{t(`type.${type}`, type)}</option>)}
            </select>
          </div>
          <div className="flex-1 flex items-center gap-2 sm:justify-end">
            <ArrowUpDown className="w-4 h-4 text-stone-400" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 flex-1 sm:flex-none"
            >
              <option value="newest">{t('trips.newest')}</option>
              <option value="oldest">{t('trips.oldest')}</option>
              <option value="name">{t('trips.name')}</option>
              <option value="progress">{t('trips.progress')}</option>
            </select>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 sm:p-8">
          <h3 className="text-lg font-semibold mb-6">{t('trips.createTitle')}</h3>
          <form onSubmit={handleCreateTrip} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">{t('trips.destination')}</label>
              <input
                type="text"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="e.g., Weekend in Paris"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                  <Map className="w-4 h-4 text-stone-400" />
                  {t('trips.type')}
                </label>
                <select
                  value={newTripType}
                  onChange={(e) => setNewTripType(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {TRIP_TYPES.map(type => <option key={type} value={type}>{t(`type.${type}`, type)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                  <Car className="w-4 h-4 text-stone-400" />
                  {t('trips.transportation')}
                </label>
                <select
                  value={newTripTransportation}
                  onChange={(e) => setNewTripTransportation(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {TRANSPORTATION_TYPES.map(transport => <option key={transport} value={transport}>{t(`transport.${transport}`, transport)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {newTripType === 'Other' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">{t('trips.customType')}</label>
                  <input
                    type="text"
                    value={newTripCustomType}
                    onChange={(e) => setNewTripCustomType(e.target.value)}
                    placeholder="e.g., Photography Trip"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  {t('trips.dates')}
                </label>
                <DatePicker
                  selectsRange={true}
                  startDate={startDate}
                  endDate={endDate}
                  onChange={(update) => {
                    setDateRange(update as [Date | null, Date | null]);
                  }}
                  placeholderText={t('trips.selectDates')}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  wrapperClassName="w-full"
                  dateFormat="yyyy-MM-dd"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('trips.template')}</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="must-bring">{t('trips.defaultTemplate')}</option>
                  <option value="none">{t('trips.emptyList')}</option>
                  {customLists.map(list => (
                    <option key={list.id} value={list.id}>{list.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-stone-400" />
                {t('trips.image')}
              </label>
              <div className="flex items-center gap-4">
                {newTripImage && (
                  <div className="relative shrink-0">
                    <img src={newTripImage} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-stone-200" />
                    <button
                      type="button"
                      onClick={() => setNewTripImage(undefined)}
                      className="absolute -top-2 -right-2 bg-white text-red-500 rounded-full p-1 shadow-md hover:bg-red-50 transition-colors"
                      title={t('trips.removeImage')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <label className="flex-1 bg-stone-50 border border-stone-200 border-dashed rounded-xl px-4 py-4 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 transition-colors">
                  <span className="text-sm text-stone-500 font-medium">{t('trips.uploadImage')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl px-4 py-2.5 transition-colors"
              >
                {t('trips.createAction')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {upcomingTrips.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest px-1">{t('trips.upcoming')}</h3>
            <div className="grid grid-cols-1 gap-4">
              {upcomingTrips.map(renderTripCard)}
            </div>
          </div>
        )}

        {pastTrips.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest px-1">{t('trips.past')}</h3>
            <div className="grid grid-cols-1 gap-4 opacity-75 grayscale-[0.2]">
              {pastTrips.map(renderTripCard)}
            </div>
          </div>
        )}

        {trips.length === 0 && !isCreating && (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 border-dashed">
            <Plane className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-stone-900">{t('trips.noTrips')}</h3>
            <p className="text-stone-500 mt-1 mb-6">{t('trips.noTripsTagline')}</p>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl px-4 py-2 inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('trips.createTitle')}
            </button>
          </div>
        )}
        {trips.length > 0 && upcomingTrips.length === 0 && pastTrips.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
            <p className="text-stone-500">{t('trips.noMatch')}</p>
            <button 
              onClick={() => setFilterType('All')}
              className="mt-3 text-emerald-600 font-medium hover:text-emerald-700"
            >
              {t('common.clearFilter')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
