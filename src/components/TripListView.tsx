import React, { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Trip, InventoryItem, UserProfile, CustomList, PackingItem } from '../types';
import { TRIP_TYPES, TRANSPORTATION_TYPES } from '../data/constants';
import { Map, Calendar, Plus, ChevronRight, Plane, Filter, ArrowUpDown, Image as ImageIcon, Download, Upload, X, Car } from 'lucide-react';
import { resizeImage } from '../utils/image';

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
  const [newTripTransportation, setNewTripTransportation] = useState(TRANSPORTATION_TYPES[0]);
  const [newTripStartDate, setNewTripStartDate] = useState('');
  const [newTripEndDate, setNewTripEndDate] = useState('');
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

  const handleCreateTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim() || !newTripStartDate || !newTripEndDate) return;

    let initialItems: PackingItem[] = [];
    if (selectedTemplateId === 'must-bring') {
      initialItems = inventory.filter(item => item.isMaster).map(item => ({
        id: Math.random().toString(36).substring(2, 9),
        name: item.name,
        category: item.category,
        isPacked: false
      }));
    } else if (selectedTemplateId !== 'none') {
      const list = customLists?.find(l => l.id === selectedTemplateId);
      if (list) {
        initialItems = list.items.map(item => ({
          id: Math.random().toString(36).substring(2, 9),
          name: item.name,
          category: item.category,
          isPacked: false
        }));
      }
    }

    const newTrip: Trip = {
      id: Math.random().toString(36).substring(2, 9),
      name: newTripName.trim(),
      tripType: newTripType,
      transportationType: newTripTransportation,
      startDate: newTripStartDate,
      endDate: newTripEndDate,
      duration: `${newTripStartDate} ${t('trips.to')} ${newTripEndDate}`,
      items: initialItems,
      createdAt: Date.now(),
      imageUrl: newTripImage
    };

    onAddTrip(newTrip);
    setNewTripName('');
    setNewTripStartDate('');
    setNewTripEndDate('');
    setNewTripImage(undefined);
    setIsCreating(false);
  };

  const filteredAndSortedTrips = useMemo(() => {
    let result = [...trips];
    
    if (filterType !== 'All') {
      result = result.filter(t => t.tripType === filterType);
    }
    
    result.sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt - a.createdAt;
      if (sortBy === 'oldest') return a.createdAt - b.createdAt;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'progress') {
        const progA = a.items.length ? a.items.filter(i => i.isPacked).length / a.items.length : 0;
        const progB = b.items.length ? b.items.filter(i => i.isPacked).length / b.items.length : 0;
        return progB - progA;
      }
      return 0;
    });
    
    return result;
  }, [trips, filterType, sortBy]);

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
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors"
              title={t('trips.import')}
            >
              <Upload className="w-5 h-5" />
              <span className="hidden sm:inline">{t('trips.import')}</span>
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors"
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
              {TRIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  {t('trips.startDate')}
                </label>
                <input
                  type="date"
                  value={newTripStartDate}
                  onChange={(e) => setNewTripStartDate(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  {t('trips.endDate')}
                </label>
                <input
                  type="date"
                  value={newTripEndDate}
                  onChange={(e) => setNewTripEndDate(e.target.value)}
                  min={newTripStartDate}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
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
                className="px-5 py-2.5 text-stone-600 font-medium hover:bg-stone-100 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl px-6 py-2.5 transition-colors"
              >
                {t('trips.createAction')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredAndSortedTrips.map(trip => {
          const packedCount = trip.items.filter(i => i.isPacked).length;
          const totalCount = trip.items.length;
          const progress = totalCount === 0 ? 0 : Math.round((packedCount / totalCount) * 100);

          return (
            <button
              key={trip.id}
              onClick={() => onSelectTrip(trip.id)}
              className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden hover:border-emerald-500/50 hover:shadow-md transition-all text-left group flex flex-col sm:flex-row relative"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTrip(trip.id);
                }}
                className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10"
                title={t('common.delete')}
              >
                <X className="w-4 h-4" />
              </button>
              {trip.imageUrl ? (
                <div className="h-32 sm:h-auto sm:w-48 relative shrink-0">
                  <img src={trip.imageUrl} alt={trip.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent sm:bg-gradient-to-r" />
                  {profile?.avatarUrl && (
                    <img src={profile.avatarUrl} alt="Avatar" className="absolute bottom-3 left-3 w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover" />
                  )}
                </div>
              ) : (
                <div className="h-2 sm:h-auto sm:w-2 bg-emerald-500 shrink-0" />
              )}
              
              <div className="p-5 flex-1 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-stone-900 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                    {!trip.imageUrl && profile?.avatarUrl && (
                      <img src={profile.avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full border border-stone-200 object-cover" />
                    )}
                    {trip.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-stone-500">
                    <span className="flex items-center gap-1"><Plane className="w-3.5 h-3.5" /> {t(`type.${trip.tripType}`, trip.tripType)}</span>
                    {trip.transportationType && (
                      <>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1"><Car className="w-3.5 h-3.5" /> {t(`transport.${trip.transportationType}`, trip.transportationType)}</span>
                      </>
                    )}
                    <span>&bull;</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {trip.startDate && trip.endDate ? `${trip.startDate} ${t('trips.to')} ${trip.endDate}` : trip.duration}</span>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden w-32 sm:w-48">
                      <div 
                        className="h-full bg-emerald-500 rounded-full" 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-stone-500">{t('trips.packedCount', { packed: packedCount, total: totalCount })}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-emerald-50 transition-colors shrink-0 ml-4">
                  <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-emerald-500" />
                </div>
              </div>
            </button>
          );
        })}
        {trips.length === 0 && !isCreating && (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 border-dashed">
            <Plane className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-stone-900">{t('trips.noTrips')}</h3>
            <p className="text-stone-500 mt-1 mb-6">{t('trips.noTripsTagline')}</p>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl px-6 py-2.5 inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('trips.createTitle')}
            </button>
          </div>
        )}
        {trips.length > 0 && filteredAndSortedTrips.length === 0 && (
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
