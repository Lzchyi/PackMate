import React, { useState, useMemo, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { Trip, InventoryItem, UserProfile, CustomList, PackingItem } from '../types';
import { TRIP_TYPES, TRANSPORTATION_TYPES, SUGGESTED_ITEMS } from '../data/constants';
import { Map, Calendar, Plus, ChevronRight, Plane, Filter, ArrowUpDown, Image as ImageIcon, Download, X, Car, Clock, Users } from 'lucide-react';
import { resizeImage } from '../utils/image';
import { formatDateRange } from '../utils/date';
import ConfirmationModal from './ConfirmationModal';
import { TripCard } from './TripCard';

interface Props {
  trips: Trip[];
  inventory: InventoryItem[];
  profile: UserProfile | null;
  isGuest: boolean;
  customLists: CustomList[];
  allEssentials: InventoryItem[];
  onAddTrip: (trip: Trip) => void;
  onDeleteTrip: (id: string) => void;
  onSelectTrip: (id: string) => void;
  onJoinTrip: (code: string) => Promise<void>;
}

type SortOption = 'newest' | 'oldest' | 'name' | 'progress';

export default function TripListView({ trips, inventory, profile, isGuest, customLists, allEssentials, onAddTrip, onDeleteTrip, onSelectTrip, onJoinTrip }: Props) {
  const { t } = useTranslation();
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [isSubmittingJoin, setIsSubmittingJoin] = useState(false);
  const [newTripName, setNewTripName] = useState('');
  const [newTripType, setNewTripType] = useState(TRIP_TYPES[0]);
  const [newTripCustomType, setNewTripCustomType] = useState('');
  const [newTripTransportation, setNewTripTransportation] = useState(TRANSPORTATION_TYPES[0]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  const [newTripImage, setNewTripImage] = useState<string | undefined>();
  
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportStartModalOpen, setIsImportStartModalOpen] = useState(false);
  const [pendingImportTrip, setPendingImportTrip] = useState<Trip | null>(null);
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
      toast.error(t('trips.imageResizeError'));
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
            id: nanoid(),
            createdAt: Date.now(),
            // Reset packed status for imported trips
            items: importedTrip.items.map((item: any) => ({
              ...item,
              id: nanoid(),
              isPacked: false
            }))
          };
          setPendingImportTrip(newTrip);
          setIsImportModalOpen(true);
        } else {
          toast.error(t('trips.importError'));
        }
      } catch (err) {
        console.error('Failed to parse trip file', err);
        toast.error(t('trips.importError'));
      }
    };
    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('must-bring');

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || isSubmittingJoin) return;

    setIsSubmittingJoin(true);
    try {
      await onJoinTrip(joinCode);
      setIsJoining(false);
      setJoinCode('');
    } catch (err) {
      // Error is handled in App.tsx
    } finally {
      setIsSubmittingJoin(false);
    }
  };

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName.trim() || !startDate || !endDate) return;

    const formattedStartDate = format(startDate, 'yyyy-MM-dd');
    const formattedEndDate = format(endDate, 'yyyy-MM-dd');

    let initialItems: PackingItem[] = [];
    
    // Always include "Must Bring" items
    const mustBringItems: PackingItem[] = inventory.filter(item => item.isMaster).map(item => ({
      id: nanoid(),
      name: item.name,
      category: item.category,
      isPacked: false,
      quantity: item.quantity || 1
    }));

    let templateItems: PackingItem[] = [];
    if (selectedTemplateId === 'must-bring') {
      // Also add "All Essentials" suggested items
      templateItems = allEssentials.map(item => ({
        id: nanoid(),
        name: item.name,
        category: item.category,
        isPacked: false,
        quantity: 1
      }));
    } else if (selectedTemplateId !== 'none') {
      const list = customLists?.find(l => l.id === selectedTemplateId);
      if (list) {
        templateItems = list.items.map(item => ({
          id: nanoid(),
          name: item.name,
          category: item.category,
          isPacked: false,
          quantity: 1
        }));
      }
    }

    // Combine and avoid duplicates by name
    const combined = [...mustBringItems];
    templateItems.forEach(item => {
      if (!combined.some(c => c.name.toLowerCase() === item.name.toLowerCase())) {
        combined.push(item);
      }
    });
    initialItems = combined;

    const finalTripType = newTripType === 'Other' ? newTripCustomType.trim() || 'Other' : newTripType;

    const newTrip: Trip = {
      id: nanoid(),
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
      toast.error(t('trips.createError') || 'Failed to create trip. Please try again.');
    }
  };

  const { upcomingTrips, pastTrips, sharedTrips } = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    let filtered = [...trips];
    
    if (filterType !== 'All') {
      if (filterType === 'Shared') {
        filtered = filtered.filter(t => (t.participants?.length || 0) > 1);
      } else {
        filtered = filtered.filter(t => t.tripType === filterType);
      }
    }

    const upcoming: Trip[] = [];
    const past: Trip[] = [];
    const shared: Trip[] = [];

    filtered.forEach(trip => {
      const isShared = (trip.participants?.length || 0) > 1;
      const tripEndDate = trip.endDate ? parseISO(trip.endDate) : null;
      const isPast = tripEndDate && tripEndDate < now;

      if (isPast) {
        past.push(trip);
      } else if (isShared) {
        shared.push(trip);
      } else {
        upcoming.push(trip);
      }
    });

    // Sort function
    const sortTrips = (tripsToSort: Trip[]) => {
      return tripsToSort.sort((a, b) => {
        if (sortBy === 'newest') {
          const dateA = a.startDate ? parseISO(a.startDate).getTime() : 0;
          const dateB = b.startDate ? parseISO(b.startDate).getTime() : 0;
          return dateA - dateB;
        }
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'progress') {
          const progA = a.items.length ? a.items.filter(i => i.isPacked).length / a.items.length : 0;
          const progB = b.items.length ? b.items.filter(i => i.isPacked).length / b.items.length : 0;
          return progB - progA;
        }
        return b.createdAt - a.createdAt;
      });
    };

    return { upcomingTrips: sortTrips(upcoming), pastTrips: sortTrips(past), sharedTrips: sortTrips(shared) };
  }, [trips, filterType, sortBy, profile?.uid]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold dark:text-white">{t('trips.title')}</h2>
          <p className="text-stone-500 dark:text-stone-400 mt-1">{t('trips.tagline')}</p>
        </div>
        {!isCreating && !isJoining && (
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImportTrip} 
            />
            <button
              onClick={() => setIsImportStartModalOpen(true)}
              className="bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-medium rounded-xl px-4 py-2 flex-1 flex items-center justify-center gap-2 transition-colors"
              title={t('trips.import')}
            >
              <Download className="w-5 h-5" />
              <span>{t('trips.import')}</span>
            </button>
            <button
              onClick={() => {
                if (isGuest) {
                  toast.error(t('auth.guestCollaborationWarning', 'Collaboration features are only available for logged-in users.'));
                  return;
                }
                setIsJoining(true);
              }}
              className={`px-4 py-2 flex-1 flex items-center justify-center gap-2 transition-colors font-medium rounded-xl ${isGuest ? 'bg-stone-200 dark:bg-stone-700 text-stone-400 cursor-not-allowed' : 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300'}`}
            >
              <Users className="w-5 h-5" />
              <span className="whitespace-nowrap">{t('trips.join', 'Join')}</span>
            </button>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-4 py-2 flex-1 flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="whitespace-nowrap">{t('trips.new', 'New')}</span>
            </button>
          </div>
        )}
      </div>

      {trips.length > 0 && !isCreating && !isJoining && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
          <h3 className="text-lg font-semibold dark:text-white">{t('inventory.filterAndSort')}</h3>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full sm:w-40 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none dark:text-stone-200"
              >
                {['All', 'Shared', ...TRIP_TYPES.filter(t => t !== 'Other')].sort().concat('Other').map(type => (
                  <option key={type} value={type}>
                    {type === 'All' ? t('trips.allTypes') : type === 'Shared' ? t('trips.shared', 'Shared') : t(`type.${type}`, type)}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 sm:flex-none">
              <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full sm:w-40 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none dark:text-stone-200"
              >
                <option value="newest">{t('trips.newest')}</option>
                <option value="oldest">{t('trips.oldest')}</option>
                <option value="name">{t('trips.name')}</option>
                <option value="progress">{t('trips.progress')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {isJoining && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 sm:p-8">
          <h3 className="text-lg font-semibold mb-6 dark:text-white">{t('trips.join', 'Join Trip')}</h3>
          <form onSubmit={handleJoinSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('trips.inviteCode', 'Invite Code')}</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g., X7B9QA"
                className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono tracking-widest uppercase dark:text-stone-100"
                required
                maxLength={6}
              />
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-2">
                {t('trips.inviteCodeHelp', 'Enter the 6-digit code shared by the trip owner.')}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-700">
              <button
                type="button"
                onClick={() => {
                  setIsJoining(false);
                  setJoinCode('');
                }}
                className="px-4 py-2.5 text-stone-600 dark:text-stone-400 font-medium hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmittingJoin || joinCode.length < 6}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-4 py-2.5 transition-colors flex items-center gap-2"
              >
                {isSubmittingJoin ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
                {t('trips.join', 'Join Trip')}
              </button>
            </div>
          </form>
        </div>
      )}

      {isCreating && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 sm:p-8">
          <h3 className="text-lg font-semibold mb-6 dark:text-white">{t('trips.createTitle')}</h3>
          <form onSubmit={handleCreateTrip} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('trips.destination')}</label>
              <input
                type="text"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
                placeholder="e.g., Weekend in Paris"
                className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Map className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                  {t('trips.type')}
                </label>
                <select
                  value={newTripType}
                  onChange={(e) => setNewTripType(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                >
                  {TRIP_TYPES.map(type => <option key={type} value={type}>{t(`type.${type}`, type)}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Car className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                  {t('trips.transportation')}
                </label>
                <select
                  value={newTripTransportation}
                  onChange={(e) => setNewTripTransportation(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                >
                  {TRANSPORTATION_TYPES.map(transport => <option key={transport} value={transport}>{t(`transport.${transport}`, transport)}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {newTripType === 'Other' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('trips.customType')}</label>
                  <input
                    type="text"
                    value={newTripCustomType}
                    onChange={(e) => setNewTripCustomType(e.target.value)}
                    placeholder="e.g., Photography Trip"
                    className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-stone-400 dark:text-stone-500" />
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
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                  wrapperClassName="w-full"
                  dateFormat="yyyy-MM-dd"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('trips.template')}</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
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
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                {t('trips.image')}
              </label>
              <div className="flex items-center gap-4">
                {newTripImage && (
                  <div className="relative shrink-0">
                    <img src={newTripImage} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-stone-200 dark:border-stone-700" />
                    <button
                      type="button"
                      onClick={() => setNewTripImage(undefined)}
                      className="absolute -top-2 -right-2 bg-white dark:bg-stone-800 text-red-500 rounded-full p-1 shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title={t('trips.removeImage')}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <label className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 border-dashed rounded-xl px-4 py-4 flex flex-col items-center justify-center cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors">
                  <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">{t('trips.uploadImage')}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2.5 text-stone-600 dark:text-stone-400 font-medium hover:bg-stone-100 dark:hover:bg-stone-700 rounded-xl transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-4 py-2.5 transition-colors"
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
            <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">{t('trips.upcomingTrips', 'Upcoming Trips')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingTrips.map(trip => <TripCard key={trip.id} trip={trip} onSelectTrip={onSelectTrip} profile={profile || undefined} />)}
            </div>
          </div>
        )}

        {sharedTrips.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">{t('trips.sharedTrips', 'Shared Trips')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedTrips.map(trip => <TripCard key={trip.id} trip={trip} onSelectTrip={onSelectTrip} profile={profile || undefined} />)}
            </div>
          </div>
        )}

        {pastTrips.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest px-1">{t('trips.pastTrips', 'Past Trips')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75 grayscale-[0.2]">
              {pastTrips.map(trip => <TripCard key={trip.id} trip={trip} onSelectTrip={onSelectTrip} profile={profile || undefined} />)}
            </div>
          </div>
        )}

        {trips.length === 0 && !isCreating && !isJoining && (
          <div className="text-center py-16 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 border-dashed">
            <Plane className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-stone-900 dark:text-white">{t('trips.noTrips')}</h3>
            <p className="text-stone-500 dark:text-stone-400 mt-1 mb-6">{t('trips.noTripsTagline')}</p>
            <button
              onClick={() => setIsCreating(true)}
              className="bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-medium rounded-xl px-4 py-2 inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('trips.createTitle')}
            </button>
          </div>
        )}

        {trips.length > 0 && upcomingTrips.length === 0 && pastTrips.length === 0 && sharedTrips.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 border-dashed">
            <p className="text-stone-500 dark:text-stone-400">{t('trips.noMatch')}</p>
            <button 
              onClick={() => setFilterType('All')}
              className="mt-3 text-emerald-600 dark:text-emerald-400 font-medium hover:text-emerald-700 dark:hover:text-emerald-300"
            >
              {t('common.clearFilter')}
            </button>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={async () => {
          if (pendingImportTrip) {
            await onAddTrip(pendingImportTrip);
            onSelectTrip(pendingImportTrip.id);
          }
          setIsImportModalOpen(false);
        }}
        title={t('trips.import')}
        message={t('trips.importConfirm', 'Would you like to import this trip?')}
        variant="primary"
      />
      <ConfirmationModal
        isOpen={isImportStartModalOpen}
        onClose={() => setIsImportStartModalOpen(false)}
        onConfirm={() => {
          setIsImportStartModalOpen(false);
          fileInputRef.current?.click();
        }}
        title={t('trips.import')}
        message={t('trips.importStartConfirm', 'Are you sure you want to import a trip?')}
        variant="primary"
      />
    </div>
  );
}
