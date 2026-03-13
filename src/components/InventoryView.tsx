import React, { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { useTranslation } from 'react-i18next';
import { Virtuoso } from 'react-virtuoso';
import { InventoryItem, Category, CustomList } from '../types';
import { CATEGORIES, SUGGESTED_ITEMS } from '../data/constants';
import { Plus, Trash2, Star, Box, Edit2, CheckSquare, Square, Save, X, List as ListIcon, Sparkles, Eye, Info, Settings, Filter, ArrowUpDown } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  customLists: CustomList[];
  allEssentials: InventoryItem[];
  setAllEssentials: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onAddItem: (item: InventoryItem) => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (item: InventoryItem) => void;
  onAddList: (list: CustomList) => void;
  onDeleteList: (id: string) => void;
  onUpdateList: (list: CustomList) => void;
}

export default function InventoryView({ 
  inventory, 
  customLists, 
  allEssentials,
  setAllEssentials,
  onAddItem, 
  onDeleteItem, 
  onUpdateItem, 
  onAddList, 
  onDeleteList, 
  onUpdateList 
}: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'gear' | 'lists'>('gear');
  const [editingList, setEditingList] = useState<CustomList | null>(null);
  const [viewingList, setViewingList] = useState<CustomList | null>(null);

  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isMustBringModalOpen, setIsMustBringModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSuggestedEssentialsOpen, setIsSuggestedEssentialsOpen] = useState(false);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Essentials');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemIsMaster, setNewItemIsMaster] = useState(false);
  const [newListItemName, setNewListItemName] = useState('');
  const [newListItemCategory, setNewListItemCategory] = useState<Category>('Essentials');
  const [includeEssentialsInPreset, setIncludeEssentialsInPreset] = useState(() => {
    const saved = localStorage.getItem('packwise_include_essentials');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('packwise_include_essentials', JSON.stringify(includeEssentialsInPreset));
  }, [includeEssentialsInPreset]);

  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'quantity'>('recent');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('Essentials');
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [showOtherInput, setShowOtherInput] = useState<string | null>(null);
  const [showFullNameId, setShowFullNameId] = useState<string | null>(null);

  React.useEffect(() => {
    const handleClickOutside = () => setShowFullNameId(null);
    let timer: NodeJS.Timeout;

    if (showFullNameId) {
      window.addEventListener('click', handleClickOutside);
      timer = setTimeout(() => {
        setShowFullNameId(null);
      }, 3000);
    }

    return () => {
      window.removeEventListener('click', handleClickOutside);
      if (timer) clearTimeout(timer);
    };
  }, [showFullNameId]);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: InventoryItem = {
      id: nanoid(),
      name: newItemName.trim(),
      category: newItemCategory,
      isMaster: newItemIsMaster,
      quantity: newItemQuantity,
    };

    onAddItem(newItem);
    setNewItemName('');
    setNewItemIsMaster(false);
    setNewItemQuantity(1);
  };

  const handleDeleteItem = (id: string) => {
    onDeleteItem(id);
  };

  const toggleMaster = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      onUpdateItem({ ...item, isMaster: !item.isMaster });
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      onUpdateItem({ ...item, quantity: qty });
    }
  };

  const startEditing = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditQuantity(item.quantity || 1);
  };

  const handleUpdateItem = () => {
    if (!editingItemId || !editName.trim()) return;
    const item = inventory.find(i => i.id === editingItemId);
    if (item) {
      onUpdateItem({ ...item, name: editName.trim(), category: editCategory, quantity: editQuantity });
    }
    setEditingItemId(null);
  };

  const handleSaveList = () => {
    if (!editingList || !editingList.name.trim()) return;
    if (customLists.some(l => l.id === editingList.id)) {
      onUpdateList(editingList);
    } else {
      onAddList(editingList);
    }
    setEditingList(null);
  };

  const handleDeleteList = (id: string) => {
    onDeleteList(id);
  };

  const handleAddPresetList = (presetName: string, items: {name: string, category: Category}[]) => {
    let finalItems = [...items];
    if (includeEssentialsInPreset) {
      allEssentials.forEach(essentialItem => {
        if (!finalItems.some(i => i.name.toLowerCase() === essentialItem.name.toLowerCase())) {
          finalItems.push({ name: essentialItem.name, category: essentialItem.category });
        }
      });
    }

    const newList: CustomList = {
      id: nanoid(),
      name: `${t(`type.${presetName}`, presetName)} ${t('inventory.essentials')}`,
      items: finalItems
    };
    onAddList(newList);
  };

  const handleAddMustBringToList = () => {
    if (!editingList) return;
    const mustBrings = inventory.filter(i => i.isMaster);
    const newItems = [...editingList.items];
    mustBrings.forEach(mb => {
      if (!newItems.some(i => i.name.toLowerCase() === mb.name.toLowerCase())) {
        newItems.push({ name: mb.name, category: mb.category });
      }
    });
    setEditingList({ ...editingList, items: newItems });
  };

  const toggleItemInList = (invItem: InventoryItem) => {
    if (!editingList) return;
    const exists = editingList.items.some(i => i.name.toLowerCase() === invItem.name.toLowerCase());
    if (exists) {
      setEditingList({
        ...editingList,
        items: editingList.items.filter(i => i.name.toLowerCase() !== invItem.name.toLowerCase())
      });
    } else {
      setEditingList({
        ...editingList,
        items: [...editingList.items, { name: invItem.name, category: invItem.category }]
      });
    }
  };

  const handleAddCustomItemToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingList || !newListItemName.trim()) return;
    if (!editingList.items.some(i => i.name.toLowerCase() === newListItemName.trim().toLowerCase())) {
      setEditingList({
        ...editingList,
        items: [...editingList.items, { name: newListItemName.trim(), category: newListItemCategory }]
      });
    }
    setNewListItemName('');
  };

  const groupedInventory = CATEGORIES.reduce((acc, category) => {
    let items = inventory.filter(item => item.category === category);
    
    if (sortBy === 'name') {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'quantity') {
      items.sort((a, b) => (b.quantity || 1) - (a.quantity || 1));
    } else if (sortBy === 'recent') {
      items.reverse(); // Assuming original array is chronological, reverse to show newest first
    }
    
    acc[category] = items;
    return acc;
  }, {} as Record<Category, InventoryItem[]>);

  const presetLists = Object.entries(SUGGESTED_ITEMS).filter(([key]) => key !== 'All' && key !== 'All Essentials');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">{t('inventory.title')}</h2>
        <p className="text-stone-500 dark:text-stone-400 mt-1">{t('inventory.tagline')}</p>
      </div>

      <div className="flex gap-4 border-b border-stone-200 dark:border-stone-700">
        <button
          onClick={() => setActiveTab('gear')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'gear' ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          <Box className="w-4 h-4" /> {t('inventory.gear')}
        </button>
        <button
          onClick={() => { setActiveTab('lists'); setEditingList(null); }}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'lists' ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400' : 'border-transparent text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'}`}
        >
          <ListIcon className="w-4 h-4" /> {t('inventory.lists')}
        </button>
      </div>

      {activeTab === 'gear' && (
        <>
          <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 sm:p-8">
            <h3 className="text-lg font-semibold mb-6 text-stone-900 dark:text-stone-100">{t('inventory.addItem')}</h3>
            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-tight ml-1">{t('inventory.itemName')}</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g., Favorite Jacket"
                    list="item-suggestions"
                    className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 h-[45px] text-sm text-stone-900 dark:text-stone-100"
                    required
                  />
                  <datalist id="item-suggestions">
                    {Object.entries(SUGGESTED_ITEMS).flatMap(([key, items]) => key === 'All Essentials' ? allEssentials : items).map((item, index) => (
                      <option key={index} value={item.name} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-tight ml-1">{t('inventory.category')}</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value as Category)}
                    className="w-full bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 h-[45px] appearance-none text-sm text-stone-900 dark:text-stone-100"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-4 border-t border-stone-100 dark:border-stone-700">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-tight ml-1">{t('inventory.quantity')}</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(qty => (
                      <button
                        key={qty}
                        type="button"
                        onClick={() => setNewItemQuantity(qty)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                          newItemQuantity === qty 
                            ? 'bg-emerald-500 text-white shadow-sm' 
                            : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-600'
                        }`}
                      >
                        {qty}
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      value={newItemQuantity > 5 ? newItemQuantity : ''}
                      onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                      placeholder={t('inventory.other')}
                      className={`w-20 h-9 rounded-lg text-xs font-bold px-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all ${
                        newItemQuantity > 5 
                          ? 'bg-emerald-500 text-white placeholder-white/70' 
                          : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400 placeholder-stone-400 dark:placeholder-stone-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isMaster"
                      checked={newItemIsMaster}
                      onChange={(e) => setNewItemIsMaster(e.target.checked)}
                      className="w-5 h-5 rounded border-stone-300 dark:border-stone-600 text-emerald-500 focus:ring-emerald-500 bg-stone-50 dark:bg-stone-900"
                    />
                    <label htmlFor="isMaster" className="text-sm font-medium text-stone-700 dark:text-stone-300 cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5">
                      {t('inventory.mustBring')}
                      <button 
                        type="button"
                        onClick={() => setIsMustBringModalOpen(true)} 
                        className="p-1 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors"
                      >
                        <Info className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500" />
                      </button>
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-6 py-2 flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-200 active:scale-[0.98] h-[40px] text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t('inventory.add')}
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{t('inventory.addedGear', 'Added Gear')}</h3>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full sm:w-40 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none text-stone-900 dark:text-stone-100"
                  >
                    <option value="All">{t('inventory.allCategories', 'All Categories')}</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                  </select>
                </div>
                <div className="relative flex-1 sm:flex-none">
                  <ArrowUpDown className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'quantity')}
                    className="w-full sm:w-44 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 appearance-none text-stone-900 dark:text-stone-100"
                  >
                    <option value="recent">{t('inventory.sortRecent', 'Recently Added')}</option>
                    <option value="name">{t('inventory.sortName', 'Name (A-Z)')}</option>
                    <option value="quantity">{t('inventory.sortQuantity', 'Quantity (High-Low)')}</option>
                  </select>
                </div>
              </div>
            </div>
            
            {CATEGORIES.map(category => {
              if (filterCategory !== 'All' && category !== filterCategory) return null;
              const items = groupedInventory[category];
              if (items.length === 0) return null;

              return (
                <div key={category} className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700">
                  <div className="px-6 py-4 bg-stone-50 dark:bg-stone-900/50 border-b border-stone-100 dark:border-stone-700 flex items-center gap-2 rounded-t-2xl">
                    <Box className="w-5 h-5 text-stone-400 dark:text-stone-500" />
                    <h3 className="font-semibold text-stone-900 dark:text-stone-100">{t(`category.${category}`)}</h3>
                    <span className="text-xs font-medium bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded-full text-stone-500 dark:text-stone-400">
                      {items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-stone-100 dark:divide-stone-700">
                    <div className="px-6 py-2 bg-stone-50/50 dark:bg-stone-900/50 flex items-center text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-widest">
                      <div className="flex-1">{t('inventory.itemName')}</div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="w-12 text-center">{t('inventory.quantity')}</div>
                        <div className="w-24 text-right"></div>
                      </div>
                    </div>
                    {items.map((item, index) => (
                      <div key={item.id} className={`px-6 py-4 flex items-center justify-between hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors gap-4 ${index === items.length - 1 ? 'rounded-b-2xl' : ''}`}>
                        <div className="flex-1 min-w-0">
                          {editingItemId === item.id ? (
                            <div className="flex flex-col gap-3">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-tight">{t('inventory.itemName')}</label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-stone-900 dark:text-stone-100"
                                  autoFocus
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-tight">{t('inventory.category')}</label>
                                  <select
                                    value={editCategory}
                                    onChange={(e) => setEditCategory(e.target.value as Category)}
                                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm appearance-none text-stone-900 dark:text-stone-100"
                                  >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-tight">{t('inventory.quantity')}</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={editQuantity}
                                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-stone-900 dark:text-stone-100"
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <span 
                                className="font-medium text-stone-700 dark:text-stone-200 truncate block cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFullNameId(showFullNameId === item.id ? null : item.id);
                                }}
                              >
                                {t(`item.${item.name}`, item.name)}
                              </span>
                              {showFullNameId === item.id && (
                                <div className="absolute z-50 left-0 top-full mt-2 p-3 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 text-xs rounded-xl shadow-lg border border-stone-100 dark:border-stone-700 min-w-[180px] max-w-xs break-words animate-in fade-in slide-in-from-top-1 duration-200 pointer-events-none">
                                  <p className="font-medium leading-relaxed">{t(`item.${item.name}`, item.name)}</p>
                                  <div className="absolute -top-1 left-4 w-2 h-2 bg-white dark:bg-stone-800 border-t border-l border-stone-100 dark:border-stone-700 rotate-45" />
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          {editingItemId !== item.id && (
                            <div className="w-12 flex justify-center">
                              <span className="text-sm font-semibold text-stone-500 dark:text-stone-400">{item.quantity || 1}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-end gap-1 w-24">
                            {editingItemId === item.id ? (
                              <>
                                <button
                                  onClick={handleUpdateItem}
                                  className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 p-2 transition-colors"
                                  title={t('common.save')}
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingItemId(null)}
                                  className="text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 p-2 transition-colors"
                                  title={t('common.cancel')}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => toggleMaster(item.id)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    item.isMaster 
                                      ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' 
                                      : 'text-stone-300 dark:text-stone-600 hover:text-stone-500 dark:hover:text-stone-400'
                                  }`}
                                  title={item.isMaster ? "Remove from Must Bring List" : "Add to Must Bring List"}
                                >
                                  <Star className={`w-4 h-4 ${item.isMaster ? 'fill-amber-500' : ''}`} />
                                </button>
                                <button
                                  onClick={() => startEditing(item)}
                                  className="text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 p-2 transition-colors"
                                  title={t('inventory.editItem')}
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 p-2 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {inventory.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 border-dashed">
                <Box className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t('inventory.empty')}</h3>
                <p className="text-stone-500 dark:text-stone-400 mt-1">{t('inventory.emptyTagline')}</p>
              </div>
            ) : filterCategory !== 'All' && groupedInventory[filterCategory as Category]?.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 border-dashed">
                <Filter className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t('inventory.noItemsInFilter')}</h3>
              </div>
            ) : null}
          </div>
        </>
      )}

      {activeTab === 'lists' && !editingList && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t('inventory.customLists')}</h3>
              <p className="text-sm text-stone-500 dark:text-stone-400">{t('inventory.customListsTagline')}</p>
            </div>
            <button
              onClick={() => setEditingList({ id: nanoid(), name: '', items: [] })}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-4 py-2 flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> {t('inventory.createList')}
            </button>
          </div>

          {presetLists.length > 0 && (
            <div className="bg-stone-50 dark:bg-stone-900/50 rounded-2xl p-6 border border-stone-200 dark:border-stone-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h4 className="text-sm font-medium text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  {t('inventory.quickStart')}
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeEssentials"
                    checked={includeEssentialsInPreset}
                    onChange={(e) => setIncludeEssentialsInPreset(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 dark:border-stone-600 text-emerald-500 focus:ring-emerald-500 bg-stone-50 dark:bg-stone-900"
                  />
                  <label htmlFor="includeEssentials" className="text-sm text-stone-600 dark:text-stone-400 cursor-pointer select-none flex items-center gap-2">
                    {t('inventory.includeEssentials')}
                    <button onClick={() => setIsAboutModalOpen(true)} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full">
                      <Info className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                    </button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-full">
                      <Settings className="w-4 h-4 text-stone-500 dark:text-stone-400" />
                    </button>
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {presetLists.map(([key, items]) => {
                  let count = items.length;
                  if (includeEssentialsInPreset) {
                    let finalItems = [...items];
                    allEssentials.forEach(essentialItem => {
                      if (!finalItems.some(i => i.name.toLowerCase() === essentialItem.name.toLowerCase())) {
                        finalItems.push({ name: essentialItem.name, category: essentialItem.category });
                      }
                    });
                    count = finalItems.length;
                  }
                  return (
                    <button
                      key={key}
                      onClick={() => handleAddPresetList(key, items)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-stone-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-stone-200 dark:border-stone-700 hover:border-emerald-200 dark:hover:border-emerald-800 text-stone-700 dark:text-stone-300 hover:text-emerald-700 dark:hover:text-emerald-300 text-sm font-medium transition-all shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      {t(`type.${key}`, key)} {t('nav.trips')} ({count} {t('common.items')})
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {customLists.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 border-dashed">
              <ListIcon className="w-12 h-12 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">{t('inventory.noLists')}</h3>
              <p className="text-stone-500 dark:text-stone-400 mt-1">{t('inventory.noListsTagline')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customLists.map(list => (
                <div key={list.id} className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 p-6 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-stone-900 dark:text-stone-100">{list.name}</h3>
                      <p className="text-sm text-stone-500 dark:text-stone-400">{list.items.length} {t('common.items')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingList(list)}
                        className="p-2 text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-stone-50 dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                        title={t('inventory.viewList')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingList(list)}
                        className="p-2 text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors bg-stone-50 dark:bg-stone-900 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg"
                        title={t('inventory.editList')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="p-2 text-stone-400 dark:text-stone-500 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-stone-50 dark:bg-stone-900 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title={t('inventory.deleteList')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {list.items.slice(0, 5).map((item, idx) => (
                      <span key={idx} className="text-xs font-medium bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 px-2.5 py-1 rounded-lg">
                        {t(`item.${item.name}`, item.name)}
                      </span>
                    ))}
                    {list.items.length > 5 && (
                      <span className="text-xs font-medium bg-stone-50 dark:bg-stone-900 text-stone-400 dark:text-stone-500 px-2.5 py-1 rounded-lg border border-stone-100 dark:border-stone-700">
                        +{list.items.length - 5} {t('inventory.more')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'lists' && editingList && (
        <div className="bg-white dark:bg-stone-800 rounded-2xl shadow-sm border border-stone-200 dark:border-stone-700 overflow-hidden">
          <div className="p-6 border-b border-stone-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-stone-900 dark:text-stone-100">{customLists.some(l => l.id === editingList.id) ? t('inventory.editList') : t('inventory.createList')}</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingList(null)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveList}
                  disabled={!editingList.name.trim()}
                  className="bg-stone-900 dark:bg-stone-700 hover:bg-stone-800 dark:hover:bg-stone-600 disabled:bg-stone-300 dark:disabled:bg-stone-600 text-white font-medium rounded-xl px-6 py-2 flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> {t('inventory.saveList')}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <label className="text-sm font-medium text-stone-700 dark:text-stone-300">{t('inventory.listName')}</label>
              <input
                type="text"
                value={editingList.name}
                onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                placeholder="e.g., Ski Trip Essentials"
                className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-lg font-medium text-stone-900 dark:text-stone-100"
                autoFocus
              />
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-stone-900 dark:text-stone-100">{t('inventory.itemsInList')} ({editingList.items.length})</h4>
                  <button
                    onClick={handleAddMustBringToList}
                    className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Star className="w-3.5 h-3.5" /> {t('inventory.addAllMustBring')}
                  </button>
                </div>

                <form onSubmit={handleAddCustomItemToList} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newListItemName}
                    onChange={(e) => setNewListItemName(e.target.value)}
                    placeholder={t('inventory.addCustomItem')}
                    className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-stone-900 dark:text-stone-100"
                  />
                  <select
                    value={newListItemCategory}
                    onChange={(e) => setNewListItemCategory(e.target.value as Category)}
                    className="w-32 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-stone-900 dark:text-stone-100"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                  </select>
                  <button
                    type="submit"
                    disabled={!newListItemName.trim()}
                    className="bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 disabled:opacity-50 text-stone-700 dark:text-stone-300 rounded-xl px-3 py-2 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {editingList.items.length === 0 ? (
                    <p className="text-center text-sm text-stone-500 dark:text-stone-400 py-8 border border-stone-100 dark:border-stone-700 border-dashed rounded-xl">
                      {t('inventory.noItemsAdded')}
                    </p>
                  ) : (
                    editingList.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 group">
                        <div>
                          <p className="font-medium text-stone-900 dark:text-stone-100 text-sm">{t(`item.${item.name}`, item.name)}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{t(`category.${item.category}`)}</p>
                        </div>
                        <button
                          onClick={() => setEditingList({
                            ...editingList,
                            items: editingList.items.filter((_, i) => i !== idx)
                          })}
                          className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:border-l lg:border-stone-100 dark:lg:border-stone-700 lg:pl-8">
              <h4 className="font-medium text-stone-900 dark:text-stone-100">{t('inventory.selectFromGear')}</h4>
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                {CATEGORIES.map(category => {
                  const items = inventory.filter(item => item.category === category);
                  if (items.length === 0) return null;

                  return (
                    <div key={category}>
                      <h5 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">{t(`category.${category}`)}</h5>
                      <div className="space-y-1">
                        {items.map(item => {
                          const isSelected = editingList.items.some(i => i.name.toLowerCase() === item.name.toLowerCase());
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleItemInList(item)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-700/50 transition-colors text-left"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                              ) : (
                                <Square className="w-5 h-5 text-stone-300 dark:text-stone-600 shrink-0" />
                              )}
                              <span className={`text-sm ${isSelected ? 'font-medium text-stone-900 dark:text-stone-100' : 'text-stone-600 dark:text-stone-400'}`}>
                                {t(`item.${item.name}`, item.name)}
                              </span>
                              {item.isMaster && (
                                <Star className="w-3 h-3 fill-amber-500 text-amber-500 ml-auto shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingList && (
        <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
              <div>
                <h3 className="text-xl font-semibold text-stone-900">{viewingList.name}</h3>
                <p className="text-sm text-stone-500">{viewingList.items.length} {t('common.items')}</p>
              </div>
              <button
                onClick={() => setViewingList(null)}
                className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {CATEGORIES.map(category => {
                const categoryItems = viewingList.items.filter(item => item.category === category);
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category} className="space-y-3">
                    <h4 className="text-sm font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-2">
                      <Box className="w-4 h-4" />
                      {t(`category.${category}`)}
                      <span className="bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full text-xs">
                        {categoryItems.length}
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {categoryItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-stone-100 bg-white">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-sm font-medium text-stone-700">{t(`item.${item.name}`, item.name)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="px-6 py-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
              <button
                onClick={() => setViewingList(null)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
              >
                {t('common.close')}
              </button>
              <button
                onClick={() => {
                  setEditingList(viewingList);
                  setViewingList(null);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-6 py-2 flex items-center gap-2 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> {t('inventory.editList')}
              </button>
            </div>
          </div>
        </div>
      )}
      {isMustBringModalOpen && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-emerald-600">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Star className="w-5 h-5 fill-emerald-500" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">{t('inventory.mustBring')}</h3>
            </div>
            <p className="text-stone-600 leading-relaxed text-sm">
              {t('inventory.mustBringDescription')}
            </p>
            <button 
              onClick={() => setIsMustBringModalOpen(false)} 
              className="mt-6 w-full py-3 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl transition-colors active:scale-[0.98]"
            >
              {t('common.close')}
            </button>
          </div>
        </div>
      )}
      {isAboutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl max-w-md w-full shadow-xl">
            <h3 className="text-lg font-semibold mb-2 text-stone-900 dark:text-white">{t('inventory.allEssentials')}</h3>
            <p className="text-sm text-stone-600 dark:text-stone-400 mb-4">
              {t('inventory.customizeHint', 'You can customize this list using the settings button beside it.')}
            </p>
            <div className="flex-1 min-h-[200px] mb-4 overflow-y-auto">
              {allEssentials.length > 0 ? (
                <ul>
                  {allEssentials.map((item, i) => (
                    <li key={i} className="list-disc ml-5 mb-1 text-stone-700 dark:text-stone-300">{t(`item.${item.name}`, item.name)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">{t('inventory.noEssentials')}</p>
              )}
            </div>
            <button onClick={() => setIsAboutModalOpen(false)} className="mt-6 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors">{t('inventory.close')}</button>
          </div>
        </div>
      )}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-stone-800 p-6 rounded-2xl max-w-md w-full max-h-[90vh] flex flex-col shadow-xl">
            <h3 className="text-lg font-semibold mb-4 shrink-0 text-stone-900 dark:text-white">{t('inventory.customizeEssentials')}</h3>
            <div className="flex-1 min-h-[300px] overflow-y-auto">
              {allEssentials.length > 0 ? (
                <div className="space-y-2">
                  {allEssentials.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input 
                        type="text" 
                        value={item.name} 
                        placeholder="Type or select item..."
                        onChange={(e) => {
                          const newEssentials = [...allEssentials];
                          newEssentials[i].name = e.target.value;
                          setAllEssentials(newEssentials);
                        }} 
                        className="flex-1 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-stone-900 dark:text-stone-100" 
                      />
                      <button onClick={() => setAllEssentials(allEssentials.filter((_, index) => index !== i))} className="text-red-500 dark:text-red-400 p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-8">{t('inventory.noEssentials')}</p>
              )}
            </div>
            <div className="shrink-0 pt-4 mt-2 border-t border-stone-100 dark:border-stone-700">
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={() => setIsSuggestedEssentialsOpen(true)} 
                  className="text-emerald-600 dark:text-emerald-400 font-medium hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
                >
                  + {t('inventory.addItem')}
                </button>
                <button 
                  onClick={() => setIsSuggestedEssentialsOpen(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('inventory.quickStart')}
                </button>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 transition-colors text-white font-medium rounded-xl">{t('inventory.save')}</button>
            </div>
          </div>
        </div>
      )}
      {isSuggestedEssentialsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-500" />
                {t('inventory.quickStart')}
              </h3>
              <button 
                onClick={() => setIsSuggestedEssentialsOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="space-y-6">
                {Object.entries(SUGGESTED_ITEMS).filter(([key]) => key !== 'All').map(([key, items]) => (
                  <div key={key} className="space-y-3">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t(`type.${key}`, key)}</h4>
                    <div className="flex flex-wrap gap-2">
                      {items.map((item, idx) => {
                        const isSelected = allEssentials.some(e => e.name.toLowerCase() === item.name.toLowerCase());
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (isSelected) {
                                setAllEssentials(allEssentials.filter(e => e.name.toLowerCase() !== item.name.toLowerCase()));
                              } else {
                                setAllEssentials([...allEssentials, { id: nanoid(), name: item.name, category: item.category }]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                              isSelected
                                ? 'bg-emerald-500 text-white shadow-md'
                                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                            }`}
                          >
                            {t(`item.${item.name}`, item.name)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                <div className="pt-4 border-t border-stone-100">
                  <button 
                    onClick={() => {
                      setAllEssentials([...allEssentials, { id: nanoid(), name: '', category: 'Essentials' }]);
                      setIsSuggestedEssentialsOpen(false);
                    }}
                    className="w-full py-3 border-2 border-dashed border-stone-200 rounded-xl text-stone-500 font-medium hover:border-emerald-500 hover:text-emerald-600 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {t('common.other', 'Other')} / {t('inventory.customItem', 'Custom Item')}
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-stone-100 bg-stone-50">
              <button 
                onClick={() => setIsSuggestedEssentialsOpen(false)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-95"
              >
                {t('common.done')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
