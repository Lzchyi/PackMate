import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InventoryItem, Category, CustomList } from '../types';
import { CATEGORIES, SUGGESTED_ITEMS } from '../data/constants';
import { Plus, Trash2, Star, Box, Edit2, CheckSquare, Square, Save, X, List as ListIcon, Copy, Sparkles, Eye, Info, Settings } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  customLists: CustomList[];
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
  const [allEssentials, setAllEssentials] = useState(SUGGESTED_ITEMS['All'] || []);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<Category>('Essentials');
  const [newItemIsMaster, setNewItemIsMaster] = useState(false);
  const [includeEssentialsInPreset, setIncludeEssentialsInPreset] = useState(true);

  const [newListItemName, setNewListItemName] = useState('');
  const [newListItemCategory, setNewListItemCategory] = useState<Category>('Clothing');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: InventoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: newItemName.trim(),
      category: newItemCategory,
      isMaster: newItemIsMaster,
    };

    onAddItem(newItem);
    setNewItemName('');
    setNewItemIsMaster(false);
  };

  const handleAddSuggestedItem = (name: string, category: Category) => {
    const newItem: InventoryItem = {
      id: Math.random().toString(36).substring(2, 9),
      name,
      category,
      isMaster: false,
    };
    onAddItem(newItem);
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

  const handleDuplicateList = (list: CustomList) => {
    const duplicatedList: CustomList = {
      ...list,
      id: Math.random().toString(36).substring(2, 9),
      name: `${list.name}${t('common.copy')}`
    };
    onAddList(duplicatedList);
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
      id: Math.random().toString(36).substring(2, 9),
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
    acc[category] = inventory.filter(item => item.category === category);
    return acc;
  }, {} as Record<Category, InventoryItem[]>);

  // Get unique suggested items that are not in inventory
  const allSuggestedItems = Array.from(
    new Map(
      Object.values(SUGGESTED_ITEMS)
        .flat()
        .map(item => [item.name.toLowerCase(), item])
    ).values()
  );
  
  const availableSuggestions = allSuggestedItems.filter(
    suggested => !inventory.some(item => item.name.toLowerCase() === suggested.name.toLowerCase())
  );

  const presetLists = Object.entries(SUGGESTED_ITEMS).filter(([key]) => key !== 'All');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">{t('inventory.title')}</h2>
        <p className="text-stone-500 mt-1">{t('inventory.tagline')}</p>
      </div>

      <div className="flex gap-4 border-b border-stone-200">
        <button
          onClick={() => setActiveTab('gear')}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'gear' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
        >
          <Box className="w-4 h-4" /> {t('inventory.gear')}
        </button>
        <button
          onClick={() => { setActiveTab('lists'); setEditingList(null); }}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'lists' ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
        >
          <ListIcon className="w-4 h-4" /> {t('inventory.lists')}
        </button>
      </div>

      {activeTab === 'gear' && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
            <h3 className="text-lg font-medium mb-4">{t('inventory.addItem')}</h3>
            <form onSubmit={handleAddItem} className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 w-full space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('inventory.itemName')}</label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g., Favorite Jacket"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  required
                />
              </div>
              <div className="w-full sm:w-48 space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('inventory.category')}</label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value as Category)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 h-11 px-2">
                <input
                  type="checkbox"
                  id="isMaster"
                  checked={newItemIsMaster}
                  onChange={(e) => setNewItemIsMaster(e.target.checked)}
                  className="w-5 h-5 rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
                />
                <label htmlFor="isMaster" className="text-sm font-medium text-stone-700 cursor-pointer">
                  {t('inventory.mustBring')}
                </label>
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl px-6 py-2.5 flex items-center justify-center gap-2 transition-colors h-11"
              >
                <Plus className="w-4 h-4" />
                {t('inventory.add')}
              </button>
            </form>

            {availableSuggestions.length > 0 && (
              <div className="mt-6 pt-6 border-t border-stone-100">
                <h4 className="text-sm font-medium text-stone-700 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  {t('inventory.suggestions')}
                </h4>
                <div className="max-h-[280px] overflow-y-auto pr-2 space-y-4">
                  {CATEGORIES.map(category => {
                    const categorySuggestions = availableSuggestions.filter(item => item.category === category);
                    if (categorySuggestions.length === 0) return null;
                    return (
                      <div key={category}>
                        <h5 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t(`category.${category}`)}</h5>
                        <div className="flex flex-wrap gap-2">
                          {categorySuggestions.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleAddSuggestedItem(item.name, item.category)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium transition-colors border border-emerald-200/50"
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
              </div>
            )}
          </div>

          <div className="space-y-6">
            {CATEGORIES.map(category => {
              const items = groupedInventory[category];
              if (items.length === 0) return null;

              return (
                <div key={category} className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
                  <div className="px-6 py-4 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
                    <Box className="w-5 h-5 text-stone-400" />
                    <h3 className="font-semibold">{t(`category.${category}`)}</h3>
                    <span className="text-xs font-medium bg-white border border-stone-200 px-2 py-0.5 rounded-full text-stone-500">
                      {items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-stone-100">
                    {items.map(item => (
                      <div key={item.id} className="px-6 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors">
                        <span className="font-medium text-stone-700">{t(`item.${item.name}`, item.name)}</span>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => toggleMaster(item.id)}
                            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              item.isMaster 
                                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                            }`}
                            title={item.isMaster ? "Remove from Master List" : "Add to Master List"}
                          >
                            <Star className={`w-4 h-4 ${item.isMaster ? 'fill-amber-500' : ''}`} />
                            <span className="hidden sm:inline">{t('inventory.mustBring')}</span>
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-stone-400 hover:text-red-500 p-2 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {inventory.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
                <Box className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-stone-900">{t('inventory.empty')}</h3>
                <p className="text-stone-500 mt-1">{t('inventory.emptyTagline')}</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'lists' && !editingList && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-stone-900">{t('inventory.customLists')}</h3>
              <p className="text-sm text-stone-500">{t('inventory.customListsTagline')}</p>
            </div>
            <button
              onClick={() => setEditingList({ id: Math.random().toString(36).substring(2, 9), name: '', items: [] })}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl px-6 py-2.5 flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> {t('inventory.createList')}
            </button>
          </div>

          {presetLists.length > 0 && (
            <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h4 className="text-sm font-medium text-stone-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  {t('inventory.quickStart')}
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="includeEssentials"
                    checked={includeEssentialsInPreset}
                    onChange={(e) => setIncludeEssentialsInPreset(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 text-emerald-500 focus:ring-emerald-500"
                  />
                  <label htmlFor="includeEssentials" className="text-sm text-stone-600 cursor-pointer select-none flex items-center gap-2">
                    {t('inventory.includeEssentials')}
                    <button onClick={() => setIsAboutModalOpen(true)} className="p-1 hover:bg-stone-200 rounded-full">
                      <Info className="w-4 h-4 text-stone-400" />
                    </button>
                    <button onClick={() => setIsSettingsModalOpen(true)} className="p-1 hover:bg-stone-200 rounded-full">
                      <Settings className="w-4 h-4 text-stone-400" />
                    </button>
                  </label>
                </div>
              </div>
                  <div className="flex flex-wrap gap-3">
                {presetLists.map(([key, items]) => (
                  <button
                    key={key}
                    onClick={() => handleAddPresetList(key, items)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-200 text-stone-700 hover:text-emerald-700 text-sm font-medium transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {t(`type.${key}`, key)} {t('nav.trips')} ({includeEssentialsInPreset ? items.length + (SUGGESTED_ITEMS['All']?.length || 0) : items.length} {t('common.items')})
                  </button>
                ))}
              </div>
            </div>
          )}

          {customLists.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 border-dashed">
              <ListIcon className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-stone-900">{t('inventory.noLists')}</h3>
              <p className="text-stone-500 mt-1">{t('inventory.noListsTagline')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customLists.map(list => (
                <div key={list.id} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg text-stone-900">{list.name}</h3>
                      <p className="text-sm text-stone-500">{list.items.length} {t('common.items')}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewingList(list)}
                        className="p-2 text-stone-400 hover:text-emerald-600 transition-colors bg-stone-50 hover:bg-emerald-50 rounded-lg"
                        title={t('inventory.viewList')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicateList(list)}
                        className="p-2 text-stone-400 hover:text-emerald-600 transition-colors bg-stone-50 hover:bg-emerald-50 rounded-lg"
                        title={t('inventory.duplicateList')}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingList(list)}
                        className="p-2 text-stone-400 hover:text-emerald-600 transition-colors bg-stone-50 hover:bg-emerald-50 rounded-lg"
                        title={t('inventory.editList')}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="p-2 text-stone-400 hover:text-red-600 transition-colors bg-stone-50 hover:bg-red-50 rounded-lg"
                        title={t('inventory.deleteList')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {list.items.slice(0, 5).map((item, idx) => (
                      <span key={idx} className="text-xs font-medium bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg">
                        {t(`item.${item.name}`, item.name)}
                      </span>
                    ))}
                    {list.items.length > 5 && (
                      <span className="text-xs font-medium bg-stone-50 text-stone-400 px-2.5 py-1 rounded-lg border border-stone-100">
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
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">{customLists.some(l => l.id === editingList.id) ? t('inventory.editList') : t('inventory.createList')}</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setEditingList(null)}
                  className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSaveList}
                  disabled={!editingList.name.trim()}
                  className="bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-medium rounded-xl px-6 py-2 flex items-center gap-2 transition-colors"
                >
                  <Save className="w-4 h-4" /> {t('inventory.saveList')}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-w-md">
              <label className="text-sm font-medium text-stone-700">{t('inventory.listName')}</label>
              <input
                type="text"
                value={editingList.name}
                onChange={(e) => setEditingList({ ...editingList, name: e.target.value })}
                placeholder="e.g., Ski Trip Essentials"
                className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-lg font-medium"
                autoFocus
              />
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-stone-900">{t('inventory.itemsInList')} ({editingList.items.length})</h4>
                  <button
                    onClick={handleAddMustBringToList}
                    className="text-sm font-medium text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
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
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <select
                    value={newListItemCategory}
                    onChange={(e) => setNewListItemCategory(e.target.value as Category)}
                    className="w-32 bg-stone-50 border border-stone-200 rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
                  </select>
                  <button
                    type="submit"
                    disabled={!newListItemName.trim()}
                    className="bg-stone-100 hover:bg-stone-200 disabled:opacity-50 text-stone-700 rounded-xl px-3 py-2 flex items-center justify-center transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {editingList.items.length === 0 ? (
                    <p className="text-center text-sm text-stone-500 py-8 border border-stone-100 border-dashed rounded-xl">
                      {t('inventory.noItemsAdded')}
                    </p>
                  ) : (
                    editingList.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 bg-stone-50/50 group">
                        <div>
                          <p className="font-medium text-stone-900 text-sm">{t(`item.${item.name}`, item.name)}</p>
                          <p className="text-xs text-stone-500">{t(`category.${item.category}`)}</p>
                        </div>
                        <button
                          onClick={() => setEditingList({
                            ...editingList,
                            items: editingList.items.filter((_, i) => i !== idx)
                          })}
                          className="p-1.5 text-stone-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:border-l lg:border-stone-100 lg:pl-8">
              <h4 className="font-medium text-stone-900">{t('inventory.selectFromGear')}</h4>
              <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                {CATEGORIES.map(category => {
                  const items = inventory.filter(item => item.category === category);
                  if (items.length === 0) return null;

                  return (
                    <div key={category}>
                      <h5 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{t(`category.${category}`)}</h5>
                      <div className="space-y-1">
                        {items.map(item => {
                          const isSelected = editingList.items.some(i => i.name.toLowerCase() === item.name.toLowerCase());
                          return (
                            <button
                              key={item.id}
                              onClick={() => toggleItemInList(item)}
                              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-stone-50 transition-colors text-left"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                              ) : (
                                <Square className="w-5 h-5 text-stone-300 shrink-0" />
                              )}
                              <span className={`text-sm ${isSelected ? 'font-medium text-stone-900' : 'text-stone-600'}`}>
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
      {isAboutModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('inventory.allEssentials')}</h3>
            <ul className="list-disc pl-5 space-y-1">
              {allEssentials.map((item, i) => <li key={i}>{t(`item.${item.name}`, item.name)}</li>)}
            </ul>
            <button onClick={() => setIsAboutModalOpen(false)} className="mt-6 w-full py-2 bg-emerald-500 text-white rounded-xl">{t('inventory.close')}</button>
          </div>
        </div>
      )}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">{t('inventory.customizeEssentials')}</h3>
            <div className="space-y-2">
              {allEssentials.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input type="text" value={item.name} onChange={(e) => {
                    const newEssentials = [...allEssentials];
                    newEssentials[i].name = e.target.value;
                    setAllEssentials(newEssentials);
                  }} className="flex-1 border border-stone-200 rounded-lg px-2 py-1" />
                  <button onClick={() => setAllEssentials(allEssentials.filter((_, index) => index !== i))} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <button onClick={() => setAllEssentials([...allEssentials, { name: 'New Item', category: 'Essentials' }])} className="mt-4 text-emerald-600 font-medium">+ {t('inventory.addItem')}</button>
            <button onClick={() => setIsSettingsModalOpen(false)} className="mt-6 w-full py-2 bg-emerald-500 text-white rounded-xl">{t('inventory.save')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
