import { nanoid } from 'nanoid';
import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import { format, parseISO, differenceInDays, startOfDay } from 'date-fns';
import { doc, getDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { Trip, InventoryItem, Category, PackingItem, UserProfile, CustomList } from '../types';
import { CATEGORIES, SUGGESTED_ITEMS, TRIP_TYPES, TRANSPORTATION_TYPES } from '../data/constants';
import { ArrowLeft, CheckCircle2, Circle, Plus, Minus, Trash2, ChevronDown, ChevronUp, Box, Sparkles, PenLine, Upload, ShieldCheck, Image as ImageIcon, X, Save, Edit3, Map as MapIcon, Car, Calendar, List as ListIcon, Star, AlertCircle, Clock, Users, LogOut, Copy, Search } from 'lucide-react';
import { resizeImage } from '../utils/image';
import { formatDateRange } from '../utils/date';
import ConfirmationModal from './ConfirmationModal';
import { Virtuoso } from 'react-virtuoso';
import { TripHeader } from './TripHeader';
import { TripActions } from './TripActions';

import { User as FirebaseUser } from 'firebase/auth';

interface Props {
  trip: Trip;
  inventory: InventoryItem[];
  profile: UserProfile | null;
  user: FirebaseUser | null;
  customLists: CustomList[];
  allEssentials: InventoryItem[];
  updateTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onBack: () => void;
  onAddItem?: (item: InventoryItem) => void;
}

const SMART_SELECTION_ITEMS = ['camera', 'camera lens', 'data cable', 'gaming console'];

export default function TripDetailView({ trip, inventory, profile, user, customLists, allEssentials, updateTrip, onDeleteTrip, onBack, onAddItem }: Props) {
  const { t } = useTranslation();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTab, setAddTab] = useState<'mustBring' | 'gear' | 'suggested' | 'custom' | 'lists' | 'search'>('mustBring');
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  const presetLists = Object.entries(SUGGESTED_ITEMS)
    .filter(([key]) => key !== 'All')
    .map(([key, items]) => [
      key, 
      key === 'All Essentials' ? allEssentials.map(item => ({ name: item.name, category: item.category })) : items
    ] as [string, { name: string, category: Category }[]]);
  const [packingFilter, setPackingFilter] = useState<'all' | 'pending' | 'packed'>('all');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isRemoveInviteeModalOpen, setIsRemoveInviteeModalOpen] = useState(false);
  const [removeInviteeId, setRemoveInviteeId] = useState<string | null>(null);
  const [isLeaveTripModalOpen, setIsLeaveTripModalOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);
  const [isInventoryPromptOpen, setIsInventoryPromptOpen] = useState(false);
  const [isApplyPresetModalOpen, setIsApplyPresetModalOpen] = useState(false);
  const [isCopiedModalOpen, setIsCopiedModalOpen] = useState(false);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('');
  const [otherItemName, setOtherItemName] = useState('');
  const [otherItemCategory, setOtherItemCategory] = useState<Category>('Essentials');
  const participantProfiles = trip.participantProfiles || {};
  const [activeParticipantTab, setActiveParticipantTab] = useState<string>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [editingQuantityId, setEditingQuantityId] = useState<string | null>(null);
  const quantityTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  const [editTripItems, setEditTripItems] = useState<PackingItem[]>(trip.items);
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

  // Pending item details state
  const [pendingItem, setPendingItem] = useState<{ name: string, category: Category, shouldClose?: boolean } | null>(null);
  const [cameraType, setCameraType] = useState('Mirrorless');
  const [otherCameraType, setOtherCameraType] = useState('');
  const [lensDetails, setLensDetails] = useState('');
  const [cableType, setCableType] = useState('USB-C');
  const [otherCableType, setOtherCableType] = useState('');
  const [gamingConsoleType, setGamingConsoleType] = useState('Nintendo Switch');
  const [otherGamingConsoleType, setOtherGamingConsoleType] = useState('');
  const [medicineName, setMedicineName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    console.log('isApplyPresetModalOpen changed:', isApplyPresetModalOpen);
  }, [isApplyPresetModalOpen]);

  // Sync edit state only when modal opens
  React.useEffect(() => {
    if (isEditingTrip) {
      setEditTripName(trip.name);
      setEditTripItems(trip.items);
      setEditTripType(trip.tripType);
      setEditTripCustomType(TRIP_TYPES.includes(trip.tripType) ? '' : trip.tripType);
      setEditTripTransportation(trip.transportationType || TRANSPORTATION_TYPES[0]);
      setEditDateRange([
        trip.startDate ? parseISO(trip.startDate) : null,
        trip.endDate ? parseISO(trip.endDate) : null
      ]);
      setEditTripImageUrl(trip.imageUrl);
    }
  }, [isEditingTrip]); // Only depend on isEditingTrip, not trip prop changes during edit

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
    const item = trip.items.find(i => i.id === itemId);
    if (!item) return;
    
    const isNowPacked = !item.isPacked;
    
    if (navigator.vibrate) {
      if (isNowPacked) {
        navigator.vibrate(30);
      } else {
        navigator.vibrate(50);
      }
    }

    const updatedItems = trip.items.map(i => 
      i.id === itemId ? { ...i, isPacked: isNowPacked } : i
    );
    
    const totalItems = updatedItems.length;
    const packedItems = updatedItems.filter(i => i.isPacked).length;
    
    if (isNowPacked && packedItems === totalItems && totalItems > 0) {
      if (navigator.vibrate) {
        // Delay the 150ms vibration slightly so it doesn't overlap with the 30ms one
        setTimeout(() => navigator.vibrate(150), 50);
      }
    }

    updateTrip({
      ...trip,
      items: updatedItems
    });
  };

  const toggleItemShared = (itemId: string) => {
    const itemToToggle = trip.items.find(item => item.id === itemId);
    if (!itemToToggle) return;

    const newIsShared = !itemToToggle.isShared;
    
    let newItems = trip.items.map(item => 
      item.id === itemId ? { ...item, isShared: newIsShared } : item
    );

    if (newIsShared) {
      // If shared, remove other private items with the same name
      newItems = newItems.filter(item => 
        item.id === itemId || !(item.name.toLowerCase() === itemToToggle.name.toLowerCase() && !item.isShared)
      );
    }

    updateTrip({
      ...trip,
      items: newItems
    });
    if (editingQuantityId === itemId) {
      resetQuantityTimer();
    }
  };

  const deleteItem = (itemId: string) => {
    updateTrip({
      ...trip,
      items: trip.items.filter(item => item.id !== itemId)
    });
  };

  const addItemToTrip = (name: string, category: Category, shouldClose = true) => {
    // Check for special items that need more info
    if (name.toLowerCase() === 'camera' && !pendingItem) {
      setPendingItem({ name, category, shouldClose });
      setCameraType('Mirrorless');
      setOtherCameraType('');
      return;
    }
    if (name.toLowerCase() === 'camera lens' && !pendingItem) {
      setPendingItem({ name, category, shouldClose });
      setLensDetails('');
      return;
    }
    if (name.toLowerCase() === 'data cable' && !pendingItem) {
      setPendingItem({ name, category, shouldClose });
      setCableType('USB-C');
      setOtherCableType('');
      return;
    }
    if (name.toLowerCase() === 'gaming console' && !pendingItem) {
      setPendingItem({ name, category, shouldClose });
      setGamingConsoleType('Nintendo Switch');
      setOtherGamingConsoleType('');
      return;
    }

    const newItem: PackingItem = {
      id: nanoid(),
      name,
      category,
      isPacked: false,
      quantity: 1,
      ownerId: user?.uid,
      isShared: activeParticipantTab === 'shared'
    };

    if (name.toLowerCase() === 'camera') {
      newItem.cameraType = cameraType === 'Other' ? otherCameraType : cameraType;
    } else if (name.toLowerCase() === 'camera lens') {
      newItem.lensDetails = lensDetails;
    } else if (name.toLowerCase() === 'data cable') {
      newItem.cableType = cableType === 'Other' ? otherCableType : cableType;
    } else if (name.toLowerCase() === 'gaming console') {
      newItem.gamingConsoleType = gamingConsoleType === 'Other' ? otherGamingConsoleType : gamingConsoleType;
    }

    updateTrip({
      ...trip,
      items: [...trip.items, newItem]
    });
    setPendingItem(null);
    if (shouldClose) {
      setIsAddModalOpen(false);
    }
  };

  const addItemsToTrip = (itemsToAdd: { name: string, category: Category }[], shouldClose = true) => {
    const newItems: PackingItem[] = itemsToAdd.map(item => ({
      id: nanoid(),
      name: item.name,
      category: item.category,
      isPacked: false,
      quantity: 1,
      ownerId: user?.uid,
      isShared: activeParticipantTab === 'shared'
    }));
    updateTrip({
      ...trip,
      items: [...trip.items, ...newItems]
    });
    if (shouldClose) {
      setIsAddModalOpen(false);
    }
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

  const handleOtherClick = (category: Category) => {
    setOtherItemCategory(category);
    setOtherItemName('');
    setIsOtherModalOpen(true);
  };

  const handleAddOtherItem = () => {
    if (!otherItemName.trim()) return;
    setIsOtherModalOpen(false);
    setIsInventoryPromptOpen(true);
  };

  const confirmAddOther = (addToInventory: boolean) => {
    const name = otherItemName.trim();
    const category = otherItemCategory;

    if (addToInventory && onAddItem) {
      onAddItem({
        id: nanoid(),
        name,
        category,
        isMaster: false,
        quantity: 1
      });
    }

    addItemToTrip(name, category, false);
    setIsInventoryPromptOpen(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await resizeImage(file, 800, 600);
      setEditTripImageUrl(base64);
    } catch (err) {
      console.error('Failed to resize image', err);
      toast.error(t('trips.imageResizeError'));
    }
  };

  const handleClearAllItems = () => {
    updateTrip({
      ...trip,
      items: []
    });
    setIsClearModalOpen(false);
  };

  const handleApplyPreset = (replace: boolean) => {
    console.log('handleApplyPreset called, isEditingTrip:', isEditingTrip);
    let presetItems = [];
    if (selectedPresetKey === 'All Essentials') {
      presetItems = allEssentials.map(item => ({ name: item.name, category: item.category }));
    } else {
      presetItems = SUGGESTED_ITEMS[selectedPresetKey as keyof typeof SUGGESTED_ITEMS] || [];
    }
    const newPackingItems: PackingItem[] = presetItems.map(item => ({
      id: nanoid(),
      name: item.name,
      category: item.category,
      isPacked: false,
      quantity: 1,
      ownerId: user?.uid,
      isShared: false
    }));
    console.log('newPackingItems:', newPackingItems);

    if (isEditingTrip) {
      console.log('Updating local editTripItems');
      setEditTripItems(prev => replace ? newPackingItems : [...prev, ...newPackingItems]);
    } else {
      console.log('Updating global trip items');
      updateTrip({
        ...trip,
        items: replace ? newPackingItems : [...trip.items, ...newPackingItems]
      });
    }
    
    setIsApplyPresetModalOpen(false);
    setSelectedPresetKey('');
  };

  const handleSaveTrip = () => {
    console.log('handleSaveTrip called, editTripItems:', editTripItems);
    if (!editTripName.trim()) return;
    const finalTripType = editTripType === 'Other' ? editTripCustomType.trim() || 'Other' : editTripType;
    
    const formattedStartDate = editStartDate ? format(editStartDate, 'yyyy-MM-dd') : '';
    const formattedEndDate = editEndDate ? format(editEndDate, 'yyyy-MM-dd') : '';

    console.log('Updating trip with items:', editTripItems);

    updateTrip({
      ...trip,
      name: editTripName.trim(),
      tripType: finalTripType,
      transportationType: editTripTransportation,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      duration: formattedStartDate && formattedEndDate ? `${formattedStartDate} ${t('trips.to')} ${formattedEndDate}` : trip.duration,
      imageUrl: editTripImageUrl,
      items: editTripItems
    });
    setIsEditingTrip(false);
  };

  const isSharedTrip = trip.participants && trip.participants.length > 1;
  const isOwner = trip.uid === user?.uid;

  const filteredItems = trip.items.filter(item => {
    if (packingFilter === 'pending' && item.isPacked) return false;
    if (packingFilter === 'packed' && !item.isPacked) return false;
    
    if (isSharedTrip) {
      if (activeParticipantTab === 'shared') return item.isShared;
      if (activeParticipantTab !== 'all' && item.ownerId !== activeParticipantTab) return false;
    }
    
    return true;
  });

  const groupedItems = CATEGORIES.reduce((acc, category) => {
    acc[category] = filteredItems.filter(item => item.category === category);
    return acc;
  }, {} as Record<Category, PackingItem[]>);

  // Calculate available must bring items
  const availableMustBring = useMemo(() => inventory.filter(i => i.isMaster).filter(
    mbItem => (SMART_SELECTION_ITEMS.includes(mbItem.name.toLowerCase()) || 
              !trip.items.some(tripItem => tripItem.name.toLowerCase() === mbItem.name.toLowerCase())) &&
              (addTab !== 'search' || mbItem.name.toLowerCase().includes(searchQuery.toLowerCase()) || t(`item.${mbItem.name}`, mbItem.name).toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => a.name.localeCompare(b.name)), [inventory, trip.items, searchQuery, t, addTab]);

  // Calculate available gear (inventory items not in trip)
  const availableGear = useMemo(() => inventory.filter(
    invItem => (SMART_SELECTION_ITEMS.includes(invItem.name.toLowerCase()) ||
               !trip.items.some(tripItem => tripItem.name.toLowerCase() === invItem.name.toLowerCase())) &&
               (addTab !== 'search' || invItem.name.toLowerCase().includes(searchQuery.toLowerCase()) || t(`item.${invItem.name}`, invItem.name).toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => a.name.localeCompare(b.name)), [inventory, trip.items, searchQuery, t, addTab]);

  // Calculate suggested items (default items not in trip)
  const allSuggestedItems = useMemo(() => Array.from(
    new Map(
      Object.entries(SUGGESTED_ITEMS)
        .flatMap(([key, items]) => key === 'All Essentials' ? allEssentials : items)
        .map(item => [item.name.toLowerCase(), item])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name)), [allEssentials]);
  
  const availableSuggestions = useMemo(() => allSuggestedItems.filter(
    sugItem => (SMART_SELECTION_ITEMS.includes(sugItem.name.toLowerCase()) ||
               !trip.items.some(tripItem => tripItem.name.toLowerCase() === sugItem.name.toLowerCase())) &&
               (addTab !== 'search' || sugItem.name.toLowerCase().includes(searchQuery.toLowerCase()) || t(`item.${sugItem.name}`, sugItem.name).toLowerCase().includes(searchQuery.toLowerCase()))
  ), [allSuggestedItems, trip.items, searchQuery, t, addTab]);

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
    <div className="space-y-4 dark:text-stone-100">
      <TripHeader trip={trip} daysUntil={daysUntil} />

      <div className="flex items-center justify-between mb-4 gap-2">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors text-stone-700 dark:text-stone-300"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <TripActions 
          isOwner={isOwner}
          onInvite={() => setIsInviteModalOpen(true)}
          onEdit={() => {
            setEditTripName(trip.name);
            setEditTripType(trip.tripType);
            setEditTripCustomType(TRIP_TYPES.includes(trip.tripType) ? '' : trip.tripType);
            setEditTripTransportation(trip.transportationType || TRANSPORTATION_TYPES[0]);
            setEditDateRange([
              trip.startDate ? parseISO(trip.startDate) : null,
              trip.endDate ? parseISO(trip.endDate) : null
            ]);
            setEditTripImageUrl(trip.imageUrl);
            setEditTripItems(trip.items);
            setIsEditingTrip(true);
          }}
          onExport={() => setIsExportModalOpen(true)}
          onDelete={() => setIsDeleteModalOpen(true)}
          onLeave={() => setIsLeaveTripModalOpen(true)}
        />
      </div>

      {isSharedTrip && (
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-6 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl w-full">
          <button
            onClick={() => setActiveParticipantTab('all')}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeParticipantTab === 'all'
                ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            {t('common.all')}
          </button>
          <button
            onClick={() => setActiveParticipantTab('shared')}
            className={`px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
              activeParticipantTab === 'shared'
                ? 'bg-white dark:bg-stone-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
            }`}
          >
            <Users className="w-4 h-4" />
            {t('trips.sharedItems', 'Shared')}
          </button>
          {trip.participants?.map(uid => {
            const isMe = uid === user?.uid;
            const name = isMe ? t('trips.mine', 'Mine') : participantProfiles[uid]?.name || t('auth.traveler');
            return (
              <button
                key={uid}
                onClick={() => setActiveParticipantTab(uid)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeParticipantTab === uid
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                }`}
              >
                {participantProfiles[uid]?.avatarUrl ? (
                  <img src={participantProfiles[uid].avatarUrl} alt={name} className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-[10px] font-bold text-stone-500 dark:text-stone-300">
                    {name.charAt(0).toUpperCase()}
                  </div>
                )}
                {name}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-stone-700 dark:text-stone-300">{t('trips.packingProgress')}</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{progress}%</span>
        </div>
        <div className="h-2.5 bg-stone-100 dark:bg-stone-900 rounded-full overflow-hidden w-full">
          <div 
            className="h-full bg-emerald-500 dark:bg-emerald-600 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-4">
          <div className="flex bg-stone-100 dark:bg-stone-900 p-1 rounded-xl w-fit">
            <button
              onClick={() => setPackingFilter('all')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${packingFilter === 'all' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
            >
              {t('common.all')}
            </button>
            <button
              onClick={() => setPackingFilter('pending')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${packingFilter === 'pending' ? 'bg-white dark:bg-stone-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
            >
              {t('trips.filterPending')}
            </button>
            <button
              onClick={() => setPackingFilter('packed')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${packingFilter === 'packed' ? 'bg-white dark:bg-stone-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
            >
              {t('trips.filterPacked')}
            </button>
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-400">{t('trips.packedCount', { packed: packedCount, total: totalCount })}</p>
        </div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600 font-medium rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            {t('trips.addItems')}
          </button>
          {totalCount > 0 && (
            <button
              onClick={() => setIsClearModalOpen(true)}
              className="px-4 py-2.5 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              title={t('trips.clearAll')}
            >
              <Trash2 className="w-5 h-5" />
              <span className="hidden sm:inline">{t('trips.clearAll')}</span>
            </button>
          )}
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
            <div key={category} className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg text-stone-900 dark:text-stone-100">{t(`category.${category}`)}</h3>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${isAllPacked ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400'}`}>
                    {catPackedCount} / {items.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                )}
              </button>
              
              {isExpanded && (
                <div className="border-t border-stone-100 dark:border-stone-700 px-2 py-2">
                  {activeParticipantTab === 'all' && isSharedTrip ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-2">
                      {trip.participants?.map(uid => {
                        const participantItems = items.filter(i => i.ownerId === uid);
                        if (participantItems.length === 0) return null;
                        
                        const profile = participantProfiles[uid];
                        const name = uid === user?.uid ? t('trips.mine', 'Mine') : profile?.name || t('auth.traveler');
                        
                        return (
                          <div key={uid} className="bg-stone-50 dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-stone-700">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-200 dark:border-stone-700">
                              {profile?.avatarUrl ? (
                                <img src={profile.avatarUrl} alt={name} className="w-5 h-5 rounded-full" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-[10px] font-bold text-stone-500 dark:text-stone-300">
                                  {name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="font-medium text-sm text-stone-700 dark:text-stone-300">{name}</span>
                            </div>
                            <div className="space-y-1">
                              {participantItems.map(item => {
                                const isItemOwner = item.ownerId === user?.uid;
                                return (
                                  <div key={item.id} className="flex items-center justify-between group">
                                    <button
                                      onClick={() => isItemOwner && toggleItemPacked(item.id)}
                                      disabled={!isItemOwner}
                                      className={`flex-1 flex items-center gap-2 py-1.5 text-left ${!isItemOwner ? 'cursor-default' : ''}`}
                                    >
                                      <div className={`flex-shrink-0 transition-colors ${item.isPacked ? 'text-emerald-500 dark:text-emerald-400' : (isItemOwner ? 'text-stone-300 dark:text-stone-600 group-hover:text-stone-400' : 'text-stone-200 dark:text-stone-700')}`}>
                                        {item.isPacked ? (
                                          <CheckCircle2 className="w-4 h-4" />
                                        ) : (
                                          <Circle className="w-4 h-4" />
                                        )}
                                      </div>
                                      <span className={`text-sm transition-all ${item.isPacked ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-700 dark:text-stone-300'}`}>
                                        {t(`item.${item.name}`, item.name)}
                                        {item.quantity && item.quantity > 1 && (
                                          <span className="ml-1 text-xs text-stone-400 dark:text-stone-500 font-normal">x{item.quantity}</span>
                                        )}
                                      </span>
                                      {item.isShared && (
                                        <span className="flex items-center gap-1 px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-medium ml-auto">
                                          <Users className="w-3 h-3" />
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    items.map((item) => {
                      const isItemOwner = item.ownerId === user?.uid || (!isSharedTrip && trip.uid === user?.uid);
                      const showAvatar = isSharedTrip && (activeParticipantTab === 'all' || activeParticipantTab === 'shared');
                      const itemOwnerProfile = item.ownerId ? participantProfiles[item.ownerId] : null;

                      return (
                      <div key={item.id} className="flex flex-col hover:bg-stone-50 dark:hover:bg-stone-700 rounded-xl transition-colors group border-b border-stone-50 dark:border-stone-700 last:border-0">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => isItemOwner && toggleItemPacked(item.id)}
                            disabled={!isItemOwner}
                            className={`flex-1 flex items-center gap-4 px-4 py-3 text-left ${!isItemOwner ? 'cursor-default' : ''}`}
                          >
                            <div className={`flex-shrink-0 transition-colors ${item.isPacked ? 'text-emerald-500 dark:text-emerald-400' : (isItemOwner ? 'text-stone-300 dark:text-stone-600 group-hover:text-stone-400' : 'text-stone-200 dark:text-stone-700')}`}>
                              {item.isPacked ? (
                                <CheckCircle2 className="w-6 h-6" />
                              ) : (
                                <Circle className="w-6 h-6" />
                              )}
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <span className={`text-base transition-all ${item.isPacked ? 'text-stone-400 dark:text-stone-500 line-through' : 'text-stone-700 dark:text-stone-300'}`}>
                                {t(`item.${item.name}`, item.name)}
                                {item.quantity && item.quantity > 1 && (
                                  <span className="ml-2 text-sm text-stone-400 dark:text-stone-500 font-normal">x{item.quantity}</span>
                                )}
                                {(item.cameraType || item.lensDetails || item.cableType || item.gamingConsoleType || item.medicineName) && (
                                  <div className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 font-normal flex flex-wrap gap-x-2">
                                    {item.cameraType && <span>• {item.cameraType}</span>}
                                    {item.lensDetails && <span>• {item.lensDetails}</span>}
                                    {item.cableType && <span>• {item.cableType}</span>}
                                    {item.gamingConsoleType && <span>• {item.gamingConsoleType}</span>}
                                    {item.medicineName && <span>• {item.medicineName}</span>}
                                  </div>
                                )}
                              </span>
                              {isSharedTrip && (isItemOwner ? (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemShared(item.id);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.stopPropagation();
                                      toggleItemShared(item.id);
                                    }
                                  }}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium cursor-pointer ${item.isShared ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'}`}
                                >
                                  <Users className="w-3 h-3" />
                                  {item.isShared ? t('trips.shared', 'Shared') : t('trips.private', 'Private')}
                                </div>
                              ) : item.isShared && (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-medium">
                                  <Users className="w-3 h-3" />
                                </span>
                              ))}
                              {showAvatar && itemOwnerProfile && (
                                <div className="ml-auto flex-shrink-0" title={itemOwnerProfile.name}>
                                  {itemOwnerProfile.avatarUrl ? (
                                    <img src={itemOwnerProfile.avatarUrl} alt={itemOwnerProfile.name} className="w-5 h-5 rounded-full opacity-80" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-stone-200 dark:bg-stone-600 flex items-center justify-center text-[10px] font-bold text-stone-500 dark:text-stone-300 opacity-80">
                                      {itemOwnerProfile.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                          {isItemOwner && (
                            <div className="flex items-center">
                              <div className="flex items-center transition-all">
                                {editingQuantityId === item.id ? (
                                  <>
                                    <button
                                      onClick={() => toggleItemShared(item.id)}
                                      className={`p-3 transition-colors ${item.isShared ? 'text-emerald-500 hover:text-emerald-600' : 'text-stone-400 hover:text-emerald-500'}`}
                                      title={t('trips.sharedItems', 'Shared')}
                                    >
                                      <Users className="w-4 h-4" />
                                    </button>
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
                          )}
                        </div>
                      </div>
                      );
                    })
                  )}
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
          <div className="relative bg-white dark:bg-stone-800 rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between bg-white dark:bg-stone-800">
              <h3 className="text-xl font-semibold dark:text-white">{t('trips.addItemsToTrip')}</h3>
              <button 
                onClick={() => {
                  setIsAddModalOpen(false);
                  setSearchQuery('');
                }}
                className="text-stone-400 dark:text-stone-300 hover:text-stone-600 dark:hover:text-stone-100 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                {t('common.done')}
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-4 bg-stone-50 dark:bg-stone-900 border-b border-stone-100 dark:border-stone-700">
              <button
                onClick={() => setAddTab('mustBring')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'mustBring' ? 'bg-amber-100 text-amber-700' : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
              >
                <ShieldCheck className="w-4 h-4" /> {t('inventory.mustBring')}
              </button>
              <button
                onClick={() => setAddTab('gear')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'gear' ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
              >
                <Box className="w-4 h-4" /> {t('inventory.gear')}
              </button>
              <button
                onClick={() => setAddTab('suggested')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'suggested' ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
              >
                <Sparkles className="w-4 h-4" /> {t('trips.tabSuggested')}
              </button>
              <button
                onClick={() => setAddTab('lists')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'lists' ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
              >
                <ListIcon className="w-4 h-4" /> {t('inventory.lists')}
              </button>
              <button
                onClick={() => setAddTab('custom')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'custom' ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
              >
                <PenLine className="w-4 h-4" /> {t('trips.tabCustom')}
              </button>
              <button
                onClick={() => setAddTab('search')}
                className={`px-4 py-3 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2 ${addTab === 'search' ? 'bg-emerald-100 text-emerald-700' : 'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700'}`}
              >
                <Search className="w-4 h-4" /> {t('common.search', 'Search')}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {addTab === 'search' && (
                <div className="space-y-6">
                  <div className="shrink-0">
                    <div className="relative">
                      <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('trips.searchItems')}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    {searchQuery.trim() === '' ? (
                      <p className="text-center text-stone-500 py-8">{t('trips.searchAcrossAll')}</p>
                    ) : (
                      <div className="space-y-2 h-[400px]">
                        {(() => {
                          const searchResults = [...availableMustBring, ...availableGear, ...availableSuggestions]
                            .filter((v, i, a) => a.findIndex(t => (t.name === v.name)) === i);
                          
                          if (searchResults.length === 0) {
                            return <p className="text-center text-stone-500 py-8">No items found</p>;
                          }
                          
                          return (
                            <Virtuoso
                              style={{ height: '100%' }}
                              data={searchResults}
                              itemContent={(index, item) => (
                                <div className="flex items-center justify-between p-4 mb-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-emerald-500/30 hover:shadow-md transition-all group">
                                  <div>
                                    <p className="font-medium text-stone-900 dark:text-white">{t(`item.${item.name}`, item.name)}</p>
                                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{t(`category.${item.category}`)}</p>
                                  </div>
                                  <button
                                    onClick={() => addItemToTrip(item.name, item.category, false)}
                                    className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors shadow-sm"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}
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
                          onClick={() => addItemsToTrip(availableMustBring, false)}
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
                            onClick={() => addItemToTrip(item.name, item.category, false)}
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
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-stone-700 flex items-center gap-2">
                      <Box className="w-4 h-4 text-emerald-500" />
                      {t('nav.inventory')}
                    </h4>
                  </div>
                  {availableGear.length === 0 ? (
                    <p className="text-center text-stone-500 py-8">{t('trips.gearEmpty')}</p>
                  ) : (
                    <div className="max-h-[500px] overflow-y-auto pr-2 space-y-6">
                      {CATEGORIES.map(category => {
                        const categoryGear = availableGear.filter(item => item.category === category);
                        if (categoryGear.length === 0) return null;
                        return (
                          <div key={category}>
                            <h5 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                              <Box className="w-3.5 h-3.5" />
                              {t(`category.${category}`)}
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {categoryGear.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => addItemToTrip(item.name, item.category, false)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border bg-white border-stone-200 text-stone-700 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 shadow-sm"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  {t(`item.${item.name}`, item.name)}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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
                                    onClick={() => addItemToTrip(item.name, item.category, false)}
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
                              <button
                                onClick={() => handleOtherClick(category)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                {t('common.other', 'Other')}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {addTab === 'lists' && (
                <div className="space-y-6">
                  {/* Quick Start Suggestions */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 mb-1">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <h4 className="text-sm font-bold uppercase tracking-wider">{t('inventory.quickStart')}</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {presetLists.map(([key, items]) => {
                        const isExpanded = expandedPresetId === key;
                        return (
                          <div key={key} className="rounded-xl border border-stone-200 overflow-hidden">
                            <div 
                              className="flex items-center justify-between p-4 bg-emerald-50/30 hover:bg-emerald-50 transition-colors cursor-pointer"
                              onClick={() => setExpandedPresetId(isExpanded ? null : key)}
                            >
                              <div>
                                <p className="font-medium text-stone-900">{t(`type.${key}`, key)} {t('nav.trips')}</p>
                                <p className="text-xs text-stone-500 mt-0.5">{items.length} {t('common.items')}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addItemsToTrip(items);
                                  }}
                                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-100/50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  {t('trips.addAll')}
                                </button>
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-stone-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-stone-400" />
                                )}
                              </div>
                            </div>
                            {isExpanded && (
                              <div className="divide-y divide-stone-100 border-t border-stone-200 bg-white">
                                {items.map((item, idx) => (
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
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* User Custom Lists */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 mb-1">
                      <ListIcon className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                      <h4 className="text-sm font-bold uppercase tracking-wider">{t('inventory.customLists')}</h4>
                    </div>
                    {customLists.length === 0 ? (
                      <p className="text-center text-stone-500 dark:text-stone-400 py-8 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 border-dashed">
                        {t('trips.listsEmpty')}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {customLists.map(list => (
                          <div key={list.id} className="rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
                            <div 
                              className="flex items-center justify-between p-4 bg-stone-50 dark:bg-stone-900 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
                              onClick={() => setExpandedListId(expandedListId === list.id ? null : list.id)}
                            >
                              <div>
                                <p className="font-medium text-stone-900 dark:text-stone-100">{list.name}</p>
                                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{list.items.length} {t('common.items')}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addItemsToTrip(list.items);
                                  }}
                                  className="text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  {t('trips.addAll')}
                                </button>
                                {expandedListId === list.id ? (
                                  <ChevronUp className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                                )}
                              </div>
                            </div>
                            {expandedListId === list.id && (
                              <div className="divide-y divide-stone-100 dark:divide-stone-700 border-t border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800">
                                {list.items.length === 0 ? (
                                  <p className="text-center text-stone-500 dark:text-stone-400 py-4 text-sm">{t('trips.listEmpty')}</p>
                                ) : (
                                  list.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 px-4 hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors">
                                      <div>
                                        <p className="font-medium text-stone-900 dark:text-stone-100 text-sm">{t(`item.${item.name}`, item.name)}</p>
                                        <p className="text-xs text-stone-500 dark:text-stone-400">{t(`category.${item.category}`)}</p>
                                      </div>
                                      <button
                                        onClick={() => addItemToTrip(item.name, item.category)}
                                        className="w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 flex items-center justify-center hover:bg-emerald-500 hover:text-white transition-colors"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {addTab === 'custom' && (
                <form onSubmit={handleAddCustom} className="space-y-4 max-w-md mx-auto py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('inventory.itemName')}</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g., Camera Charger"
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('inventory.category')}</label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as Category)}
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
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
          <div className="bg-white dark:bg-stone-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between bg-white dark:bg-stone-800 sticky top-0 z-10">
              <h3 className="text-xl font-bold flex items-center gap-2 dark:text-white">
                <Edit3 className="w-5 h-5 text-emerald-500" />
                {t('trips.editDetails')}
              </h3>
              <button 
                onClick={() => setIsEditingTrip(false)}
                className="w-8 h-8 rounded-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center hover:bg-stone-200 dark:hover:bg-stone-600 transition-colors text-stone-600 dark:text-stone-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('trips.coverImage')}</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 flex items-center justify-center">
                      {editTripImageUrl ? (
                        <img src={editTripImageUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-stone-400 dark:text-stone-500" />
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 font-medium rounded-xl text-sm transition-colors"
                      >
                        {t('trips.changeBackground')}
                      </button>
                      {editTripImageUrl && (
                        <button
                          type="button"
                          onClick={() => setEditTripImageUrl(undefined)}
                          className="px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl text-sm transition-colors"
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
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('trips.destination')}</label>
                  <input
                    type="text"
                    value={editTripName}
                    onChange={(e) => setEditTripName(e.target.value)}
                    className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                      <MapIcon className="w-4 h-4 text-stone-400 dark:text-stone-500" />
                      {t('trips.tripType')}
                    </label>
                    <select
                      value={TRIP_TYPES.includes(editTripType) ? editTripType : 'Other'}
                      onChange={(e) => setEditTripType(e.target.value)}
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
                      value={editTripTransportation}
                      onChange={(e) => setEditTripTransportation(e.target.value)}
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                    >
                      {TRANSPORTATION_TYPES.map(type => <option key={type} value={type}>{t(`transport.${type}`, type)}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {editTripType === 'Other' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('trips.customType')}</label>
                      <input
                        type="text"
                        value={editTripCustomType}
                        onChange={(e) => setEditTripCustomType(e.target.value)}
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
                      startDate={editStartDate}
                      endDate={editEndDate}
                      onChange={(update) => {
                        setEditDateRange(update as [Date | null, Date | null]);
                      }}
                      placeholderText={t('trips.selectDates')}
                      className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                      wrapperClassName="w-full"
                      dateFormat="yyyy-MM-dd"
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 dark:border-stone-700">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Users className="w-4 h-4 text-emerald-500" />
                      {t('trips.invitees', 'Invitees')}
                    </label>
                    <div className="space-y-2">
                      {trip.participants?.filter(uid => uid !== trip.uid).map(uid => {
                        const profile = trip.participantProfiles?.[uid];
                        return (
                          <div key={uid} className="flex items-center justify-between px-4 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl max-w-sm">
                            <span className="text-lg text-stone-700 dark:text-stone-300 font-medium">{profile?.name || t('auth.traveler')}</span>
                            {isOwner && (
                              <button
                                onClick={() => {
                                  setRemoveInviteeId(uid);
                                  setIsRemoveInviteeModalOpen(true);
                                }}
                                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm font-medium"
                              >
                                {t('common.remove', 'Remove')}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      {t('trips.applyPreset', 'Apply Preset Template')}
                    </label>
                    <div className="flex gap-3">
                      <select
                        value={selectedPresetKey}
                        onChange={(e) => setSelectedPresetKey(e.target.value)}
                        className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:text-stone-100"
                      >
                        <option value="">{t('trips.selectTemplate', 'Select a template...')}</option>
                        {presetLists.map(([key]) => (
                          <option key={key} value={key}>{t(`type.${key}`, key)}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedPresetKey}
                        onClick={() => setIsApplyPresetModalOpen(true)}
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 dark:disabled:bg-stone-700 disabled:text-stone-400 dark:disabled:text-stone-500 text-white font-medium rounded-xl transition-all shadow-sm flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {t('inventory.add')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-stone-100 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 flex justify-between gap-3">
              <button
                onClick={() => {
                  if (isOwner) {
                    setIsDeleteModalOpen(true);
                  } else {
                    setIsLeaveTripModalOpen(true);
                  }
                }}
                className="px-4 py-2.5 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors flex items-center gap-2"
              >
                {isOwner ? (
                  <>
                    <Trash2 className="w-4 h-4" />
                    {t('common.delete')}
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    {t('trips.leave', 'Leave')}
                  </>
                )}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditingTrip(false)}
                  className="px-4 py-2.5 text-stone-600 dark:text-stone-400 font-medium hover:bg-stone-200 dark:hover:bg-stone-700 rounded-xl transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveTrip}
                  className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white font-medium rounded-xl px-4 py-2.5 flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {t('trips.saveChanges')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {pendingItem && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl max-w-sm w-full shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-4">
              {t(`item.${pendingItem.name}`, pendingItem.name)} {t('common.details')}
            </h3>
            
            <div className="space-y-4">
              {pendingItem.name.toLowerCase() === 'camera' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    {t('common.type')}
                  </label>
                  <select
                    value={cameraType}
                    onChange={(e) => setCameraType(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  >
                    <option value="Mirrorless">{t('item.camera.mirrorless')}</option>
                    <option value="DSLR">{t('item.camera.dslr')}</option>
                    <option value="Film">{t('item.camera.film')}</option>
                    <option value="Fujifilm Instax">{t('item.camera.instax')}</option>
                    <option value="Other">{t('common.other')}</option>
                  </select>
                  {cameraType === 'Other' && (
                    <input
                      type="text"
                      value={otherCameraType}
                      onChange={(e) => setOtherCameraType(e.target.value)}
                      placeholder={t('common.specify')}
                      className="w-full mt-2 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                      autoFocus
                    />
                  )}
                </div>
              )}

              {pendingItem.name.toLowerCase() === 'other medicine' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    {t('common.details')}
                  </label>
                  <input
                    type="text"
                    value={medicineName}
                    onChange={(e) => setMedicineName(e.target.value)}
                    placeholder="e.g. Panadol, Aspirin"
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    autoFocus
                  />
                </div>
              )}

              {pendingItem.name.toLowerCase() === 'camera lens' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    {t('common.details')}
                  </label>
                  <input
                    type="text"
                    value={lensDetails}
                    onChange={(e) => setLensDetails(e.target.value)}
                    placeholder={t('item.camera.lensPlaceholder')}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                    autoFocus
                  />
                </div>
              )}

              {pendingItem.name.toLowerCase() === 'data cable' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    {t('common.type')}
                  </label>
                  <select
                    value={cableType}
                    onChange={(e) => setCableType(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  >
                    <option value="USB-C">{t('item.cable.usbC')}</option>
                    <option value="Lightning">{t('item.cable.lightning')}</option>
                    <option value="Micro USB">{t('item.cable.microUsb')}</option>
                    <option value="Other">{t('common.other')}</option>
                  </select>
                  {cableType === 'Other' && (
                    <input
                      type="text"
                      value={otherCableType}
                      onChange={(e) => setOtherCableType(e.target.value)}
                      placeholder={t('common.specify')}
                      className="w-full mt-2 px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                      autoFocus
                    />
                  )}
                </div>
              )}

              {pendingItem.name.toLowerCase() === 'gaming console' && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">
                    {t('common.type')}
                  </label>
                  <select
                    value={gamingConsoleType}
                    onChange={(e) => setGamingConsoleType(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  >
                    <option value="Nintendo Switch">{t('item.gaming.switch')}</option>
                    <option value="PS Portal">{t('item.gaming.psPortal')}</option>
                    <option value="Other">{t('common.other')}</option>
                  </select>
                  {gamingConsoleType === 'Other' && (
                    <input
                      type="text"
                      value={otherGamingConsoleType}
                      onChange={(e) => setOtherGamingConsoleType(e.target.value)}
                      placeholder={t('common.specify')}
                      className="w-full mt-2 px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                      autoFocus
                    />
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPendingItem(null)}
                className="flex-1 px-4 py-2 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300 font-medium rounded-xl hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => addItemToTrip(pendingItem.name, pendingItem.category, pendingItem.shouldClose)}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors"
              >
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onConfirm={() => {
          handleExportTrip();
          setIsExportModalOpen(false);
        }}
        title={t('common.export')}
        message={t('trips.exportConfirm')}
        variant="primary"
      />

      <ConfirmationModal
        isOpen={isCopiedModalOpen}
        onClose={() => setIsCopiedModalOpen(false)}
        onConfirm={() => setIsCopiedModalOpen(false)}
        title={t('common.copied', 'Copied!')}
        message={t('trips.inviteCodeCopied', 'The invitation code has been copied to your clipboard.')}
      />

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

      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" onClick={() => setIsInviteModalOpen(false)} />
          <div className="relative bg-white dark:bg-stone-800 rounded-3xl shadow-xl w-full max-w-md flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-stone-100 dark:border-stone-700 flex items-center justify-between bg-white dark:bg-stone-800">
              <h3 className="text-xl font-semibold dark:text-white">{t('trips.inviteCollaborator', 'Invite Collaborator')}</h3>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-stone-400 dark:text-stone-300 hover:text-stone-600 dark:hover:text-stone-100 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
              >
                {t('common.done')}
              </button>
            </div>
            <div className="p-6">
              <p className="text-stone-500 dark:text-stone-400 mb-4 text-sm">
                {t('trips.inviteDescription', 'Share this 6-digit code to invite someone to pack with you. They will be able to add and manage their own items.')}
              </p>
              
              <div className="mb-6">
                {trip.inviteToken ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-4 p-6 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
                      <span className="text-4xl font-mono font-bold tracking-[0.2em] text-stone-800 dark:text-stone-100">
                        {trip.inviteToken}
                      </span>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(trip.inviteToken!);
                          setIsCopiedModalOpen(true);
                        }}
                        className="p-2 text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors rounded-lg hover:bg-stone-100 dark:hover:bg-stone-700"
                        title={t('common.copy', 'Copy')}
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                    </div>
                    <button 
                      onClick={() => updateTrip({ ...trip, inviteToken: deleteField() as any })}
                      className="text-red-500 text-sm font-medium hover:underline w-full text-center"
                    >
                      {t('trips.revokeInvite', 'Revoke Invite Code')}
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => {
                      const token = Array.from({ length: 6 }, () => 
                        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
                      ).join('');
                      updateTrip({ ...trip, inviteToken: token });
                    }}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors"
                  >
                    {t('trips.generateLink', 'Generate Invite Code')}
                  </button>
                )}
              </div>

              {trip.participants && trip.participants.length > 1 && (
                <div>
                  <h4 className="font-medium text-stone-900 mb-3">{t('trips.participants', 'Participants')}</h4>
                  <div className="space-y-3">
                    {trip.participants.map(uid => {
                      if (uid === user?.uid) return null;
                      const profile = participantProfiles[uid];
                      return (
                        <div key={uid} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                          <div className="flex items-center gap-3">
                            {profile?.avatarUrl ? (
                              <img src={profile.avatarUrl} alt={profile.name} className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-bold text-stone-500">
                                {profile?.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                            <span className="font-medium text-stone-700">{profile?.name || t('auth.traveler')}</span>
                          </div>
                          <button 
                            onClick={() => {
                              if (confirm(t('trips.removeParticipantConfirm', 'Are you sure you want to remove this participant? All their items will be deleted.'))) {
                                const newProfiles = { ...trip.participantProfiles };
                                delete newProfiles[uid];
                                updateTrip({
                                  ...trip,
                                  participants: trip.participants?.filter(p => p !== uid),
                                  items: trip.items.filter(item => item.ownerId !== uid),
                                  participantProfiles: newProfiles
                                });
                              }
                            }}
                            className="text-red-500 text-sm font-medium hover:underline"
                          >
                            {t('common.remove')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isRemoveInviteeModalOpen}
        onClose={() => setIsRemoveInviteeModalOpen(false)}
        onConfirm={() => {
          if (removeInviteeId) {
            const newProfiles = { ...trip.participantProfiles };
            delete newProfiles[removeInviteeId];
            updateTrip({
              ...trip,
              participants: trip.participants?.filter(p => p !== removeInviteeId),
              items: trip.items.filter(item => item.ownerId !== removeInviteeId),
              participantProfiles: newProfiles
            });
            setIsRemoveInviteeModalOpen(false);
            setRemoveInviteeId(null);
          }
        }}
        title={t('trips.removeInvitee', 'Remove Invitee')}
        message={t('trips.removeInviteeConfirm', 'Are you sure you want to remove this invitee? All their items will be deleted.')}
      />
      <ConfirmationModal
        isOpen={isLeaveTripModalOpen}
        onClose={() => setIsLeaveTripModalOpen(false)}
        onConfirm={() => {
          const newProfiles = { ...trip.participantProfiles };
          if (user?.uid) delete newProfiles[user.uid];
          updateTrip({
            ...trip,
            participants: trip.participants?.filter(p => p !== user?.uid),
            items: trip.items.filter(item => item.ownerId !== user?.uid),
            participantProfiles: newProfiles
          });
          onBack();
        }}
        title={t('trips.leave', 'Leave')}
        message={t('trips.leaveTripConfirm', 'Are you sure you want to leave this trip? All your items will be deleted.')}
      />
      <ConfirmationModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearAllItems}
        title={t('trips.clearAllConfirmTitle')}
        message={t('trips.clearAllConfirmMessage')}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isApplyPresetModalOpen}
        onClose={() => setIsApplyPresetModalOpen(false)}
        onConfirm={() => handleApplyPreset(true)}
        title={t('trips.applyPresetConfirmTitle')}
        message={t(selectedPresetKey ? 'trips.applyPresetConfirmMessage' : '', { name: t(`type.${selectedPresetKey}`, selectedPresetKey) })}
        confirmText={t('trips.replace')}
        cancelText={t('trips.append')}
        onCancel={() => handleApplyPreset(false)}
        variant="primary"
      />

      {isOtherModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-stone-900 mb-4">
              {t('common.other', 'Other')} {t(`category.${otherItemCategory}`)}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  {t('inventory.itemName')}
                </label>
                <input
                  type="text"
                  value={otherItemName}
                  onChange={(e) => setOtherItemName(e.target.value)}
                  placeholder="e.g. Special Gear"
                  className="w-full px-4 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddOtherItem();
                  }}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsOtherModalOpen(false)}
                className="flex-1 px-4 py-2 border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-50 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddOtherItem}
                disabled={!otherItemName.trim()}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {t('common.add')}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isInventoryPromptOpen}
        onClose={() => confirmAddOther(false)}
        onConfirm={() => confirmAddOther(true)}
        title={t('inventory.addToInventory', 'Add to Inventory?')}
        message={t('inventory.addToInventoryPrompt', 'Would you like to add this item to your permanent gear inventory for future trips?')}
        confirmText={t('common.yes')}
        cancelText={t('common.no')}
        variant="primary"
      />

    </div>
  );
}
