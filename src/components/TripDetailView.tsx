import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import DatePicker from 'react-datepicker';
import { format, parseISO } from 'date-fns';
import { Trip, InventoryItem, Category, PackingItem, UserProfile, CustomList } from '../types';
import { CATEGORIES, SUGGESTED_ITEMS, TRIP_TYPES, TRANSPORTATION_TYPES } from '../data/constants';
import { ArrowLeft, CheckCircle2, Circle, Plus, Minus, Trash2, ChevronDown, ChevronUp, Box, Sparkles, PenLine, Upload, ShieldCheck, Image as ImageIcon, X, Save, Edit3, Map as MapIcon, Car, Calendar, List as ListIcon, Star, Bell, BellOff, AlertCircle } from 'lucide-react';
import { resizeImage } from '../utils/image';
import { formatDateRange } from '../utils/date';
import ConfirmationModal from './ConfirmationModal';

interface Props {
  trip: Trip;
  inventory: InventoryItem[];
  profile: UserProfile | null;
  customLists: CustomList[];
  updateTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onBack: () => void;
}

export default function TripDetailView({ trip, inventory, profile, customLists, updateTrip, onDeleteTrip, onBack }: Props) {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTab, setAddTab] = useState<'mustBring' | 'gear' | 'suggested' | 'custom' | 'lists'>('mustBring');
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [packingFilter, setPackingFilter] = useState<'all' | 'pending' | 'packed'>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showNotificationWarning, setShowNotificationWarning] = useState(false);
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const quantityTimerRef = useRef<any>(null);

  const startEditingQuantity = (itemId: string) => {
    if (quantityTimerRef.current) clearTimeout(quantityTimerRef.current);
    setEditingQuantityId(itemId);
    resetQuantityTimer();
  };

  const resetQuantityTimer = () => {
    if (quantityTimerRef.current) clearTimeout(quantityTimerRef.current);
    quantityTimerRef.current = setTimeout(() => {
      setEditingQuantityId(null);
    }, 3000);
  };

  // Edit trip state
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [editTripName, setEditTripName] = useState(trip.name);
  const [editTripType, setEditTripType] = useState(trip.tripType);
  const [editTripCustomType, setEditTripCustomType] = useState(
    TRIP_TYPES.includes(trip.tripType) ? '' : trip.tripType
  );
  const [editTripTransportation, setEditTripTransportation] = useState(trip.transportationType || TRANSPORTATION_TYPES[0]);
  const [editDateRange, setEditDateRange] = useState<[Date | null, Date | null]>([
    trip.startDate ? parseISO(trip.startDate) : null,
    trip.endDate ? parseISO(trip.endDate) : null
  ]);
  const [editStartDate, editEndDate] = editDateRange;
  const [editTripImageUrl, setEditTripImageUrl] = useState(trip.imageUrl);

  // Custom item state
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState<Category>('Essentials');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    updateTrip({
      ...trip,
      items: trip.items.map(item => 
        item.id === itemId ? { ...item, quantity } : item
      )
    });
    if (editingQuantityId === itemId) {
      resetQuantityTimer();
    }
  };

  const updateMedicineName = (itemId: string, medicineName: string) => {
    updateTrip({
      ...trip,
      items: trip.items.map(item => 
        item.id === itemId ? { ...item, medicineName } : item
      )
    });
  };

  const toggleItemPacked = (itemId: string) => {
    updateTrip({
      ...trip,
      items: trip.items.map(item => 
        item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
      )
    });
  };

  const deleteItem = (itemId: string) => {
    updateTrip({
      ...trip,
      items: trip.items.filter(item => item.id !== itemId)
    });
  };

  const toggleTripNotifications = () => {
    if (profile?.masterNotificationsEnabled === false) {
      setShowNotificationWarning(true);
      return;
    }
    updateTrip({
      ...trip,
      notificationsEnabled: trip.notificationsEnabled === false ? true : false
    });
  };

  const isNotificationOn = profile?.masterNotificationsEnabled !== false && trip.notificationsEnabled !== false;

  const addItemToTrip = (name: string, category: Category) => {
    const newItem: PackingItem = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      category,
      isPacked: false,
      quantity: 1
    };
    updateTrip({
      ...trip,
      items: [...trip.items, newItem]
    });
  };

  const addItemsToTrip = (itemsToAdd: { name: string, category: Category }[]) => {
    const newItems: PackingItem[] = itemsToAdd.map(item => ({
      id: Math.random().toString(36).substring(2, 9),
      name: item.name,
      category: item.category,
      isPacked: false,
      quantity: 1
    }));
    updateTrip({
      ...trip,
      items: [...trip.items, ...newItems]
    });
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    addItemToTrip(customName.trim(), customCategory);
    setCustomName('');
  };

  const handleExportTrip = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trip, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `${trip.name.replace(/\s+/g, '_')}_packing_list.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImage(file, 800, 600);
      setEditTripImageUrl(base64);
    } catch (err) {
      console.error('Failed to resize image', err);
      alert(t('trips.imageResizeError'));
    }
  };

  const handleSaveTrip = () => {
    if (!editTripName.trim()) return;
    const finalTripType = editTripType === 'Other' ? editTripCustomType.trim() || 'Other' : editTripType;
    
    const formattedStartDate = editStartDate ? format(editStartDate, 'yyyy-MM-dd') : '';
    const formattedEndDate = editEndDate ? format(editEndDate, 'yyyy-MM-dd') : '';

    updateTrip({
      ...trip,
      name: editTripName.trim(),
      tripType: finalTripType,
      transportationType: editTripTransportation,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      duration: formattedStartDate && formattedEndDate ? `${formattedStartDate} ${t('trips.to')} ${formattedEndDate}` : trip.duration,
      imageUrl: editTripImageUrl
    });
    setIsEditingTrip(false);
  };

  const filteredItems = trip.items.filter(item => {
    if (packingFilter === 'pending') return !item.isPacked;
    if (packingFilter === 'packed') return item.isPacked;
    return true;
  });

  const groupedItems = CATEGORIES.reduce((acc, category) => {
    acc[category] = filteredItems.filter(item => item.category === category);
    return acc;
  }, {} as Record<Category, PackingItem[]>);

  // Calculate available must bring items
  const availableMustBring = inventory.filter(i => i.isMaster).filter(
    mbItem => !trip.items.some(tripItem => tripItem.name.toLowerCase() === mbItem.name.toLowerCase())
  );

  // Calculate available gear (inventory items not in trip)
  const availableGear = inventory.filter(
    invItem => !trip.items.some(tripItem => tripItem.name.toLowerCase() === invItem.name.toLowerCase())
  );

  // Calculate suggested items (default items not in trip)
  const allSuggestedItems = Array.from(
    new Map(
      Object.values(SUGGESTED_ITEMS)
        .flat()
        .map(item => [item.name.toLowerCase(), item])
    ).values()
  );
  
  const availableSuggestions = allSuggestedItems.filter(
    sugItem => !trip.items.some(tripItem => tripItem.name.toLowerCase() === sugItem.name.toLowerCase())
  );

  const packedCount = trip.items.filter(i => i.isPacked).length;
  const totalCount = trip.items.length;
  const progress = totalCount === 0 ? 0 : Math.round((packedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <div className="relative rounded-3xl overflow-hidden bg-stone-900">
        {trip.imageUrl ? (
          <img src={trip.imageUrl} alt={trip.name} className="w-full h-48 sm:h-64 object-cover opacity-70" />
        ) : (
          <div className="w-full h-32 sm:h-48 bg-gradient-to-r from-emerald-800 to-teal-900 opacity-80" />
        )}
        
        <div className="absolute inset-0 p-6 flex flex-col justify-end">
          <div className="text-white mb-4">
            <h2 className="text-3xl font-bold text-white drop-shadow-md">{trip.name}</h2>
          </div>
          
          <div className="flex flex-nowrap gap-2 overflow-x-auto no-scrollbar pb-2">
            <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs font-medium whitespace-nowrap">
              <MapIcon className="w-3.5 h-3.5 text-emerald-400" />
              {t(`type.${trip.tripType}`, trip.tripType)}
            </div>
            {trip.transportationType && (
              <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs font-medium whitespace-nowrap">
                <Car className="w-3.5 h-3.5 text-blue-400" />
                {t(`transport.${trip.transportationType}`, trip.transportationType)}
              </div>
            )}
            <div className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-white text-xs font-medium whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              {trip.startDate && trip.endDate ? formatDateRange(trip.startDate, trip.endDate) : trip.duration}
            </div>
          </div>
        </div>

        <button
          onClick={toggleTripNotifications}
          className={`absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 transition-all ${isNotificationOn ? 'text-emerald-400' : 'text-white/60'}`}
          title={isNotificationOn ? t('trips.notificationsOn') : t('trips.notificationsOff')}
        >
          {isNotificationOn ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex items-center justify-between mb-4 gap-2">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors text-stone-700"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditingTrip(true)}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            {t('common.edit')}
          </button>
          <button
            onClick={handleExportTrip}
            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {t('common.export')}
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-stone-700">{t('trips.packingProgress')}</span>
          <span className="font-bold text-emerald-600">{progress}%</span>
        </div>
        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden w-full">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-4">
          <div className="flex bg-stone-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setPackingFilter('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${packingFilter === 'all' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setPackingFilter('pending')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${packingFilter === 'pending' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {t('trips.filterPending')}
            </button>
            <button
              onClick={() => setPackingFilter('packed')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${packingFilter === 'packed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
            >
              {t('trips.filterPacked')}
            </button>
          </div>
          <p className="text-sm text-stone-500">{t('trips.packedCount', { packed: packedCount, total: totalCount })}</p>
        </div>
        <div className="mt-6">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full bg-emerald-500 text-white hover:bg-emerald-600 font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t('trips.addItems')}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const items = groupedItems[category];
          if (items.length === 0) return null;

          const isExpanded = expandedCategories[category];
          const catPackedCount = items.filter(i => i.isPacked).length;
          const isAllPacked = catPackedCount === items.length && items.length > 0;

          return (
            <div key={category} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">{t(`category.${category}`)}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isAllPacked ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                    {catPackedCount} / {items.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-stone-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-stone-400" />
                )}
              </button>
              
              {isExpanded && (
                <div className="border-t border-stone-100 px-2 py-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex flex-col hover:bg-stone-50 rounded-xl transition-colors group border-b border-stone-50 last:border-0">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => toggleItemPacked(item.id)}
                          className="flex-1 flex items-center gap-4 px-4 py-3 text-left"
                        >
                          <div className={`flex-shrink-0 transition-colors ${item.isPacked ? 'text-emerald-500' : 'text-stone-300 group-hover:text-stone-400'}`}>
                            {item.isPacked ? (
                              <CheckCircle2 className="w-6 h-6" />
                            ) : (
                              <Circle className="w-6 h-6" />
                            )}
                          </div>
                          <span className={`text-base transition-all ${item.isPacked ? 'text-stone-400 line-through' : 'text-stone-700'}`}>
                            {t(`item.${item.name}`, item.name)}
                            {item.quantity && item.quantity > 1 && (
                              <span className="ml-2 text-sm text-stone-400 font-normal">x{item.quantity}</span>
                            )}
                          </span>
                        </button>
                        <div className="flex items-center">
                          <div className="flex items-center transition-all">
                            {editingQuantityId === item.id ? (
                              <>
                                {!item.isPacked && (
                                  <>
                                    <button
                                      onClick={() => updateItemQuantity(item.id, Math.max(1, (item.quantity || 1) - 1))}
                                      className="p-3 text-stone-400 hover:text-emerald-500 transition-colors"
                                      title={t('common.remove')}
                                    >
                                      <Minus className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => updateItemQuantity(item.id, (item.quantity || 1) + 1)}
                                      className="p-3 text-stone-400 hover:text-emerald-500 transition-colors"
                                      title={t('common.add')}
                                    >
                                      <Plus className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => deleteItem(item.id)}
                                  className="p-3 text-stone-400 hover:text-red-500 transition-all"
                                  title={t('trips.removeItem')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => startEditingQuantity(item.id)}
                                className="p-3 text-stone-400 hover:text-emerald-500 transition-colors"
                                title={t('common.edit')}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Special controls for Medicine */}
                      {!item.isPacked && category === 'Health & Medicine' && (
                        <div className="px-4 pb-3 ml-10">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-tight">Medicine Name</label>
                            <input
                              type="text"
                              value={item.medicineName || ''}
                              onChange={(e) => updateMedicineName(item.id, e.target.value)}
                              placeholder="e.g., Aspirin"
                              className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filteredItems.length === 0 && totalCount > 0 && (
          <div className="text-center py-16 bg-stone-50 rounded-2xl border border-stone-200 border-dashed">
            <CheckCircle2 className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-stone-900">
              {packingFilter === 'pending' ? t('trips.allPacked') : t('trips.noPacked')}
            </h3>
            <p className="text-stone-500 mt-1 mb-6">
              {packingFilter === 'pending' 
                ? t('trips.finishedPacking') 
                : t('trips.startPacking')}
            </p>
            <button
              onClick={() => setPackingFilter('all')}
              className="text-emerald-600 font-medium hover:underline"
            >
              {t('trips.viewAll')}
            </button>
          </div>
        )}
        {totalCount === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 border-dashed">
            <Box className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-stone-900">{t('trips.emptyList')}</h3>
            <p className="text-stone-500 mt-1 mb-6">{t('trips.emptyListTagline')}</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl px-6 py-2.5 inline-flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              {t('trips.addItems')}
            </button>
          </div>
        )}
      </div>

      {/* Add Items Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between bg-white">
              <h3 className="text-xl font-semibold">{t('trips.addItemsToTrip')}</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors"
              >
                {t('common.done')}
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-stone-50 border-b border-stone-100">
              <button
                onClick={() => setAddTab('mustBring')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'mustBring' ? 'bg-amber-100 text-amber-700' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <ShieldCheck className="w-4 h-4" /> {t('inventory.mustBring')}
              </button>
              <button
                onClick={() => setAddTab('gear')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'gear' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <Box className="w-4 h-4" /> {t('inventory.gear')}
              </button>
              <button
                onClick={() => setAddTab('suggested')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'suggested' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <Sparkles className="w-4 h-4" /> {t('trips.tabSuggested')}
              </button>
              <button
                onClick={() => setAddTab('lists')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'lists' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <ListIcon className="w-4 h-4" /> {t('inventory.lists')}
              </button>
              <button
                onClick={() => setAddTab('custom')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'custom' ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <PenLine className="w-4 h-4" /> {t('trips.tabCustom')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {addTab === 'mustBring' && (
                <div className="space-y-3">
                  {availableMustBring.length === 0 ? (
                    <p className="text-center text-stone-500 py-8">
                      {inventory.filter(i => i.isMaster).length === 0 
                        ? t('trips.mustBringSetup') 
                        : t('trips.mustBringPacked')}
                    </p>
                  ) : (
                    <>
                      <div className="flex justify-end mb-4">
                        <button
                          onClick={() => addItemsToTrip(availableMustBring)}
                          className="text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {t('trips.addAll')}
                        </button>
                      </div>
                      {availableMustBring.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50/30 hover:border-amber-400 hover:bg-amber-50 transition-all">
                          <div>
                            <p className="font-medium text-stone-900">{t(`item.${item.name}`, item.name)}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{t(`category.${item.category}`)}</p>
                          </div>
                          <button
                            onClick={() => addItemToTrip(item.name, item.category)}
                            className="w-8 h-8 rounded-full bg-white border border-amber-200 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-colors shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {addTab === 'gear' && (
                <div className="space-y-3">
                  {availableGear.length === 0 ? (
                    <p className="text-center text-stone-500 py-8">{t('trips.gearEmpty')}</p>
                  ) : (
                    availableGear.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-4 rounded-xl border border-stone-200 hover:border-emerald-500/30 hover:bg-emerald-50/30 transition-all">
                        <div>
                          <p className="font-medium text-stone-900">{t(`item.${item.name}`, item.name)}</p>
                          <p className="text-xs text-stone-500 mt-0.5">{t(`category.${item.category}`)}</p>
                        </div>
                        <button
                          onClick={() => addItemToTrip(item.name, item.category)}
                          className="w-8 h-8 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {addTab === 'suggested' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-stone-700 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      {t('inventory.suggestions')}
                    </h4>
                  </div>
                  {availableSuggestions.length === 0 ? (
                    <p className="text-center text-stone-500 py-8">{t('trips.suggestionsEmpty')}</p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6">
                      {CATEGORIES.map(category => {
                        const categorySuggestions = availableSuggestions.filter(item => item.category === category);
                        if (categorySuggestions.length === 0) return null;
                        return (
                          <div key={category}>
                            <h5 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Box className="w-3.5 h-3.5" />
                              {t(`category.${category}`)}
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {categorySuggestions.map((item, idx) => {
                                const isMustBring = inventory.some(i => i.isMaster && i.name.toLowerCase() === item.name.toLowerCase());
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => addItemToTrip(item.name, item.category)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                                      isMustBring 
                                        ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                                        : 'bg-emerald-50 border-emerald-200/50 text-emerald-700 hover:bg-emerald-100'
                                    }`}
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t(`item.${item.name}`, item.name)}
                                    {isMustBring && <Star className="w-3 h-3 fill-amber-500" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {addTab === 'lists' && (
                <div className="space-y-4">
                  {customLists.length === 0 ? (
                    <p className="text-center text-stone-500 py-8">{t('trips.listsEmpty')}</p>
                  ) : (
                    customLists.map(list => (
                      <div key={list.id} className="rounded-xl border border-stone-200 overflow-hidden">
                        <div 
                          className="flex items-center justify-between p-4 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
                          onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                        >
                          <div>
                            <p className="font-medium text-stone-900">{list.name}</p>
                            <p className="text-xs text-stone-500 mt-0.5">{list.items.length} {t('common.items')}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                addItemsToTrip(list.items);
                              }}
                              className="text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              {t('trips.addAll')}
                            </button>
                            {expandedListId === list.id ? (
                              <ChevronUp className="w-5 h-5 text-stone-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-stone-400" />
                            )}
                          </div>
                        </div>
                        {expandedListId === list.id && (
                          <div className="divide-y divide-stone-100 border-t border-stone-200">
                            {list.items.length === 0 ? (
                              <p className="text-center text-stone-500 py-4 text-sm">{t('trips.listEmpty')}</p>
                            ) : (
                              list.items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 px-4 hover:bg-stone-50 transition-colors">
                                  <div>
                                    <p className="font-medium text-stone-900 text-sm">{t(`item.${item.name}`, item.name)}</p>
                                    <p className="text-xs text-stone-500">{t(`category.${item.category}`)}</p>
                                  </div>
                                  <button
                                    onClick={() => addItemToTrip(item.name, item.category)}
                                    className="w-7 h-7 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {addTab === 'custom' && (
                <form onSubmit={handleAddCustom} className="space-y-4 max-w-md mx-auto py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">{t('inventory.itemName')}</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g., Camera Charger"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700">{t('inventory.category')}</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as Category)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors mt-6"
                  >
                    <Plus className="w-5 h-5" />
                    {t('trips.addToTrip')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Edit Trip Modal */}
      {isEditingTrip && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-emerald-500" />
                {t('trips.editDetails')}
              </h3>
              <button 
                onClick={() => setIsEditingTrip(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">{t('trips.coverImage')}</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 flex items-center justify-center">
                      {editTripImageUrl ? (
                        <img src={editTripImageUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-stone-400" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium rounded-xl text-sm transition-colors"
                      >
                        {t('trips.changeBackground')}
                      </button>
                      {editTripImageUrl && (
                        <button
                          type="button"
                          onClick={() => setEditTripImageUrl(undefined)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-xl text-sm transition-colors"
                        >
                          {t('common.remove')}
                        </button>
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleImageUpload} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700">{t('trips.destination')}</label>
                  <input
                    type="text"
                    value={editTripName}
                    onChange={(e) => setEditTripName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 flex items-center gap-2">
                      <MapIcon className="w-4 h-4 text-stone-400" />
                      {t('trips.tripType')}
                    </label>
                    <select
                      value={TRIP_TYPES.includes(editTripType) ? editTripType : 'Other'}
                      onChange={(e) => setEditTripType(e.target.value)}
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
                      value={editTripTransportation}
                      onChange={(e) => setEditTripTransportation(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {TRANSPORTATION_TYPES.map(type => <option key={type} value={type}>{t(`transport.${type}`, type)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {editTripType === 'Other' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700">{t('trips.customType')}</label>
                      <input
                        type="text"
                        value={editTripCustomType}
                        onChange={(e) => setEditTripCustomType(e.target.value)}
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
                      startDate={editStartDate}
                      endDate={editEndDate}
                      onChange={(update) => {
                        setEditDateRange(update as [Date | null, Date | null]);
                      }}
                      placeholderText={t('trips.selectDates')}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      wrapperClassName="w-full"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-stone-100 bg-stone-50 flex justify-between gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2.5 text-red-600 font-medium hover:bg-red-50 rounded-xl transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingTrip(false)}
                  className="px-4 py-2.5 text-stone-600 font-medium hover:bg-stone-200 rounded-xl transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveTrip}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-4 py-2.5 flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {t('trips.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          onDeleteTrip(trip.id);
          setIsEditingTrip(false);
          onBack();
        }}
        title={t('common.delete')}
        message={t('trips.deleteConfirm')}
      />

      {showNotificationWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setShowNotificationWarning(false)} />
          <div className="relative bg-white rounded-3xl shadow-xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('trips.notificationWarningTitle')}</h3>
            <p className="text-stone-500 mb-8">{t('trips.notificationWarningMessage')}</p>
            <button
              onClick={() => setShowNotificationWarning(false)}
              className="w-full bg-stone-900 text-white font-medium rounded-xl px-6 py-3 hover:bg-stone-800 transition-colors"
            >
              {t('common.gotIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
