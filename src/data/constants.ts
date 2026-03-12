import { Category } from '../types';

export const CATEGORIES: Category[] = [
  'Essentials',
  'Clothing',
  'Electronics & Gear',
  'Toiletries',
  'Health & Medicine',
  'Accessories',
  'Skincare',
  'Makeup',
  'Hair Care'
];

export const TRIP_TYPES = [
  'Leisure',
  'Hiking',
  'Road Trip',
  'Business',
  'Beach',
  'Skiing',
  'Diving',
  'Camping'
];

export const TRANSPORTATION_TYPES = [
  'Flight',
  'Car',
  'Train',
  'Bus',
  'Cruise',
  'Motorcycle',
  'Other'
];

export const SUGGESTED_ITEMS: Record<string, { name: string, category: Category }[]> = {
  'All': [
    { name: 'Passport / ID', category: 'Essentials' },
    { name: 'Wallet / Cash / Cards', category: 'Essentials' },
    { name: 'Keys', category: 'Essentials' },
    { name: 'Phone', category: 'Electronics & Gear' },
    { name: 'Phone Charger', category: 'Electronics & Gear' },
    { name: 'Toothbrush', category: 'Toiletries' },
    { name: 'Toothpaste', category: 'Toiletries' },
    { name: 'Deodorant', category: 'Toiletries' },
    { name: 'Underwear', category: 'Clothing' },
    { name: 'Socks', category: 'Clothing' },
    { name: 'Daily Medications', category: 'Health & Medicine' },
  ],
  'Hiking': [
    { name: 'Trail Map / Navigation', category: 'Essentials' },
    { name: 'Hiking Boots', category: 'Clothing' },
    { name: 'Moisture-wicking socks', category: 'Clothing' },
    { name: 'Rain Jacket', category: 'Clothing' },
    { name: 'Headlamp', category: 'Electronics & Gear' },
    { name: 'First Aid Kit', category: 'Health & Medicine' },
    { name: 'Water Bottle / Bladder', category: 'Accessories' },
    { name: 'Sunscreen', category: 'Toiletries' },
    { name: 'Bug Spray', category: 'Toiletries' },
  ],
  'Beach': [
    { name: 'Swimwear', category: 'Clothing' },
    { name: 'Beach Towel', category: 'Accessories' },
    { name: 'Sunscreen', category: 'Toiletries' },
    { name: 'Sunglasses', category: 'Accessories' },
    { name: 'Flip Flops / Sandals', category: 'Clothing' },
    { name: 'Hat', category: 'Accessories' },
  ],
  'Business': [
    { name: 'Laptop', category: 'Electronics & Gear' },
    { name: 'Laptop Charger', category: 'Electronics & Gear' },
    { name: 'Business Attire', category: 'Clothing' },
    { name: 'Dress Shoes', category: 'Clothing' },
    { name: 'Notebook & Pen', category: 'Accessories' },
  ],
  'Skiing': [
    { name: 'Ski Jacket', category: 'Clothing' },
    { name: 'Snow Pants', category: 'Clothing' },
    { name: 'Thermal Base Layers', category: 'Clothing' },
    { name: 'Ski Goggles', category: 'Accessories' },
    { name: 'Gloves / Mittens', category: 'Clothing' },
    { name: 'Helmet', category: 'Accessories' },
  ],
  'Beauty': [
    { name: 'Face Wash', category: 'Skincare' },
    { name: 'Toner', category: 'Skincare' },
    { name: 'Serum', category: 'Skincare' },
    { name: 'Moisturizer', category: 'Skincare' },
    { name: 'Eye Cream', category: 'Skincare' },
    { name: 'Sunscreen (Face)', category: 'Skincare' },
    { name: 'Makeup Remover', category: 'Skincare' },
    { name: 'Body Lotion', category: 'Skincare' },
    { name: 'Foundation / Concealer', category: 'Makeup' },
    { name: 'Blush / Bronzer', category: 'Makeup' },
    { name: 'Eyeshadow Palette', category: 'Makeup' },
    { name: 'Eyeliner', category: 'Makeup' },
    { name: 'Mascara', category: 'Makeup' },
    { name: 'Lipstick / Lip Balm', category: 'Makeup' },
    { name: 'Makeup Brushes / Sponges', category: 'Makeup' },
    { name: 'Setting Spray', category: 'Makeup' },
    { name: 'Shampoo & Conditioner', category: 'Hair Care' },
    { name: 'Dry Shampoo', category: 'Hair Care' },
    { name: 'Hair Brush / Comb', category: 'Hair Care' },
    { name: 'Hair Ties / Bobby Pins', category: 'Hair Care' },
    { name: 'Hair Dryer', category: 'Hair Care' },
    { name: 'Curling Iron / Straightener', category: 'Hair Care' },
    { name: 'Hair Spray / Styling Products', category: 'Hair Care' },
  ]
};
