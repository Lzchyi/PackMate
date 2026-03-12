export type Category = 
  | 'Essentials' 
  | 'General Travel Essentials'
  | 'Clothing' 
  | 'Electronics & Gear' 
  | 'Toiletries' 
  | 'Health & Medicine' 
  | 'Accessories'
  | 'Skincare'
  | 'Makeup'
  | 'Hair Care'
  | 'Other';

export interface InventoryItem {
  id: string;
  name: string;
  category: Category;
  isMaster?: boolean;
  quantity?: number;
}

export interface PackingItem {
  id: string;
  name: string;
  category: Category;
  isPacked: boolean;
  quantity?: number;
  medicineName?: string;
}

export interface Trip {
  id: string;
  name: string;
  tripType: string;
  transportationType?: string;
  duration: string; // Keep for backwards compatibility
  startDate?: string;
  endDate?: string;
  items: PackingItem[];
  createdAt: number;
  imageUrl?: string;
  notificationsEnabled?: boolean;
}

export interface CustomList {
  id: string;
  name: string;
  items: { name: string; category: Category }[];
}

export interface UserProfile {
  uid: string;
  name: string;
  email?: string;
  joinedAt: number;
  mustBringItems?: { id: string; name: string; category: Category }[];
  avatarUrl?: string;
  language?: 'en-GB' | 'zh-CN';
  masterNotificationsEnabled?: boolean;
}

