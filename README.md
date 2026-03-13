# PackMate

PackMate is a comprehensive trip planning and inventory management application designed to make packing for your adventures stress-free. Whether you're planning a weekend getaway or a long-term expedition, PackMate helps you stay organized, track your gear, and ensure you never forget the essentials.

## Key Features

- **Trip Planning**: Manage your upcoming trips, track dates, and destinations in one place.
- **Co-Planning**: Collaborate with friends and family in real-time to plan trips and manage inventory together.
- **Inventory Management**: Build and maintain your personal gear library. Categorize items, track quantities, and mark essential "must-bring" items.
- **Custom Lists**: Create custom packing lists for different types of trips or use our preset templates to get started quickly.
- **User Profiles**: Personalize your experience with avatars and language settings (English and Chinese supported).
- **Responsive Design**: Fully responsive interface with support for both light and dark themes.
- **Real-time Sync**: Powered by Firebase for seamless, real-time data synchronization across all your devices.

## Tech Stack

- **Frontend**: React 18+, TypeScript, Tailwind CSS
- **Backend/Database**: Firebase (Authentication, Firestore, Storage)
- **UI Components**: Lucide React, React Virtuoso
- **Internationalization**: react-i18next
- **Utilities**: date-fns, nanoid

## Getting Started

1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Firebase:**
   - Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable Firebase Authentication (Google) and Firestore.
   - Update `firebase-applet-config.json` with your project credentials.
4. **Run the development server:**
   ```bash
   npm run dev
   ```

## License

This project is open-source and available for personal use.
