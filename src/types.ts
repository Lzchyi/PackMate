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
  | 'Sports'
  | 'Other';

export type TripType = 
  | 'Beach'
  | 'Business'
  | 'Camping'
  | 'Diving'
  | 'Hiking'
  | 'Leisure'
  | 'Road Trip'
  | 'Skiing'
  | 'Other';

export type TransportationType = 
  | 'Flight'
  | 'Car'
  | 'Train'
  | 'Bus'
  | 'Cruise'
  | 'Motorcycle'
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
  cameraType?: string;
  lensDetails?: string;
  cableType?: string;
  gamingConsoleType?: string;
  ownerId?: string;
  isShared?: boolean;
}

export interface Trip {
  id: string;
  name: string;
  tripType: TripType | string;
  transportationType?: TransportationType | string;
  duration: string; // Keep for backwards compatibility
  startDate?: string;
  endDate?: string;
  items: PackingItem[];
  createdAt: number;
  imageUrl?: string;
  uid?: string;
  participants?: string[];
  participantProfiles?: Record<string, { name: string; avatarUrl?: string }>;
  inviteToken?: string;
  lastConsumedToken?: string;
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
}

