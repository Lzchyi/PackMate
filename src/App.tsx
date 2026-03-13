import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { onSnapshot, collection, query, where, doc, setDoc, getDoc, deleteDoc, getDocs, or, updateDoc, deleteField } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';
import { auth, db, signInWithGoogle } from './firebase';
import { InventoryItem, Trip, UserProfile, CustomList } from './types';
import InventoryView from './components/InventoryView';
import TripListView from './components/TripListView';
import TripDetailView from './components/TripDetailView';
import ProfileView from './components/ProfileView';
import LandingView from './components/LandingView';
import { Luggage, Box, Plane, User, LogIn, Globe, Home } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { SUGGESTED_ITEMS } from './data/constants';

export default function App() {
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  const [activeTab, setActiveTab] = useState<'landing' | 'trips' | 'inventory' | 'profile'>('landing');
  const [initialized, setInitialized] = useState(false);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [allEssentials, setAllEssentials] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('packwise_essentials_v2');
    return saved ? JSON.parse(saved) : (SUGGESTED_ITEMS['All Essentials'] || []);
  });

  useEffect(() => {
    localStorage.setItem('packwise_essentials_v2', JSON.stringify(allEssentials));
  }, [allEssentials]);

  const tabs: ('landing' | 'trips' | 'inventory' | 'profile')[] = ['landing', 'trips', 'inventory', 'profile'];

  const handleSwipe = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    const velocityThreshold = 0.5;

    if (Math.abs(info.offset.x) < threshold && Math.abs(info.velocity.x) < velocityThreshold) return;

    // Swipe Right (Left to Right) -> Previous
    if (info.offset.x > threshold) {
      if (activeTripId) {
        setActiveTripId(null);
      } else {
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1]);
        }
      }
    } 
    // Swipe Left (Right to Left) -> Next
    else if (info.offset.x < -threshold) {
      if (!activeTripId) {
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1]);
        }
      }
    }
  };

  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  const STORAGE_KEYS = {
    INVENTORY: 'packwise_inventory',
    TRIPS: 'packwise_trips',
    CUSTOM_LISTS: 'packwise_lists',
    PROFILE: 'packwise_profile',
    IS_GUEST: 'packwise_is_guest'
  };

  const handleSignIn = async () => {
    if (isSigningIn) return;
    setIsSigningIn(true);
    setSignInError(null);
    try {
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Sign in error:', error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setSignInError(error.message || t('auth.signInError'));
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleContinueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem(STORAGE_KEYS.IS_GUEST, 'true');
    setActiveTab('landing');
    
    // Initialize guest profile if not exists
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!savedProfile) {
      const guestProfile: UserProfile = {
        uid: 'guest',
        name: t('auth.traveler'),
        joinedAt: Date.now(),
        language: i18n.language as 'en-GB' | 'zh-CN'
      };
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(guestProfile));
      setProfile(guestProfile);
    } else {
      const profile = JSON.parse(savedProfile);
      setProfile(profile);
      if (profile.language) {
        i18n.changeLanguage(profile.language);
      }
    }

    // Load other data
    const savedInventory = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (savedInventory) setInventory(JSON.parse(savedInventory));

    const savedTrips = localStorage.getItem(STORAGE_KEYS.TRIPS);
    if (savedTrips) setTrips(JSON.parse(savedTrips));

    const savedLists = localStorage.getItem(STORAGE_KEYS.CUSTOM_LISTS);
    if (savedLists) setCustomLists(JSON.parse(savedLists));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const guestMode = localStorage.getItem(STORAGE_KEYS.IS_GUEST) === 'true';
      
      if (firebaseUser) {
        setIsGuest(false);
        localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
        setUser(firebaseUser);
        // Ensure user profile exists in Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || t('auth.traveler'),
            email: firebaseUser.email || '',
            avatarUrl: firebaseUser.photoURL || '',
            joinedAt: Date.now(),
            language: i18n.language as 'en-GB' | 'zh-CN'
          };
          await setDoc(userDocRef, newProfile);
          setProfile(newProfile);
        } else {
          const data = userDoc.data() as UserProfile;
          setProfile(data);
          if (data.language) {
            i18n.changeLanguage(data.language);
          }
        }
        if (!initialized) {
          setActiveTab('landing');
          setInitialized(true);
        }
      } else if (guestMode) {
        setIsGuest(true);
        if (!initialized) {
          setActiveTab('landing');
          setInitialized(true);
        }
      } else {
        setUser(null);
        setIsGuest(false);
        setProfile(null);
        setInventory([]);
        setTrips([]);
        setCustomLists([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [i18n]);

  const joinAttemptedRef = React.useRef(false);

  useEffect(() => {
    const handleJoinLink = async () => {
      if (!user || isGuest || joinAttemptedRef.current) return;
      
      const urlParams = new URLSearchParams(window.location.search);
      const joinParam = urlParams.get('join');
      
      if (joinParam) {
        joinAttemptedRef.current = true;
        try {
          const [tripId, joinToken] = joinParam.split('_');
          
          if (!tripId || !joinToken) {
            throw new Error('Invalid invite link format');
          }

          // Get the specific trip
          const tripRef = doc(db, 'trips', tripId);
          let tripSnap;
          try {
            tripSnap = await getDoc(tripRef);
          } catch (err: any) {
            if (err.code === 'permission-denied') {
              alert(t('trips.invalidLink', 'Invalid or expired invite link.'));
              return;
            }
            throw err;
          }
          
          if (tripSnap.exists()) {
            const tripData = tripSnap.data() as Trip;
            
            // Verify token matches
            if (tripData.inviteToken === joinToken) {
              // If user is not already a participant
              if (!tripData.participants?.includes(user.uid)) {
                const updatedParticipants = [...(tripData.participants || [tripData.uid]), user.uid];
                const updatedProfiles = {
                  ...(tripData.participantProfiles || {}),
                  [user.uid]: {
                    name: profile?.name || user.displayName || 'User',
                    avatarUrl: profile?.avatarUrl || user.photoURL || undefined
                  }
                };
                
                await updateDoc(doc(db, 'trips', tripData.id), {
                  participants: updatedParticipants,
                  participantProfiles: removeUndefined(updatedProfiles),
                  lastConsumedToken: joinToken,
                  inviteToken: deleteField()
                });
                
                toast.success(t('trips.joinedSuccessfully', 'Successfully joined the trip!'));
              } else {
                toast.error(t('trips.alreadyJoined', 'You are already a participant in this trip.'));
              }
              
              // Navigate to the trip
              setActiveTab('trips');
              setActiveTripId(tripData.id);
            } else {
              alert(t('trips.invalidLink', 'Invalid or expired invite link.'));
            }
          } else {
            alert(t('trips.invalidLink', 'Invalid or expired invite link.'));
          }
        } catch (error) {
          console.error('Error joining trip:', error);
          toast.error(t('common.error', 'An error occurred.'));
        } finally {
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handleJoinLink();
  }, [user, isGuest, t, profile]);

  useEffect(() => {
    if (!user || isGuest) return;

    const qInventory = query(collection(db, 'inventory'), where('uid', '==', user.uid));
    const unsubInventory = onSnapshot(qInventory, (snapshot) => {
      setInventory(snapshot.docs.map(doc => doc.data() as InventoryItem));
    }, (error) => handleFirestoreError(error, 'list', 'inventory'));

    const qTrips = query(
      collection(db, 'trips'), 
      or(
        where('uid', '==', user.uid),
        where('participants', 'array-contains', user.uid)
      )
    );
    const unsubTrips = onSnapshot(qTrips, (snapshot) => {
      setTrips(snapshot.docs.map(doc => doc.data() as Trip).sort((a, b) => b.createdAt - a.createdAt));
    }, (error) => handleFirestoreError(error, 'list', 'trips'));

    const qLists = query(collection(db, 'customLists'), where('uid', '==', user.uid));
    const unsubLists = onSnapshot(qLists, (snapshot) => {
      setCustomLists(snapshot.docs.map(doc => doc.data() as CustomList));
    }, (error) => handleFirestoreError(error, 'list', 'customLists'));

    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        setProfile(data);
        if (data.language) {
          i18n.changeLanguage(data.language);
        }
      }
    }, (error) => handleFirestoreError(error, 'get', 'users'));

    return () => {
      unsubInventory();
      unsubTrips();
      unsubLists();
      unsubProfile();
    };
  }, [user, i18n]);

  const activeTrip = activeTripId ? trips.find(t => t.id === activeTripId) : null;

  const removeUndefined = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(v => removeUndefined(v));
    }
    if (obj !== null && typeof obj === 'object') {
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => {
             console.log('Filtering:', _, v);
             return v !== undefined;
          })
          .map(([k, v]) => [k, removeUndefined(v)])
      );
    }
    return obj;
  };

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData.map(provider => ({
          providerId: provider.providerId,
          displayName: provider.displayName,
          email: provider.email,
          photoUrl: provider.photoURL
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const joinTrip = async (code: string) => {
    if (!user || isGuest) return;

    try {
      const tripsRef = collection(db, 'trips');
      const q = query(tripsRef, where('inviteToken', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('invalid-code');
      }

      const tripDoc = querySnapshot.docs[0];
      const tripData = tripDoc.data() as Trip;

      if (!tripData.participants?.includes(user.uid)) {
        const participants = tripData.participants || [];
        if (tripData.uid && !participants.includes(tripData.uid)) {
          participants.push(tripData.uid);
        }
        const updatedParticipants = [...participants, user.uid];
        const updatedProfiles = {
          ...(tripData.participantProfiles || {}),
          [user.uid]: {
            name: profile?.name || user.displayName || 'User',
            avatarUrl: profile?.avatarUrl || user.photoURL || undefined
          }
        };
        
        await updateDoc(doc(db, 'trips', tripData.id), {
          participants: updatedParticipants,
          participantProfiles: removeUndefined(updatedProfiles),
          lastConsumedToken: code,
          inviteToken: deleteField()
        });
        
        toast.success(t('trips.joinedSuccessfully', 'Successfully joined the trip!'));
      } else {
        toast.error(t('trips.alreadyJoined', 'You are already a participant in this trip.'));
      }
      
      setActiveTab('trips');
      setActiveTripId(tripData.id);
    } catch (error: any) {
      console.error('Error joining trip:', error);
      if (error.message === 'invalid-code' || error.code === 'permission-denied') {
        toast.error(t('trips.invalidCode', 'Invalid or expired invite code.'));
      } else {
        toast.error(t('common.error', 'An error occurred.'));
      }
      throw error;
    }
  };

  const addTrip = async (trip: Trip) => {
    const tripWithDefaults = { ...trip };
    if (isGuest) {
      const newTrips = [tripWithDefaults, ...trips];
      setTrips(newTrips);
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(newTrips));
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'trips', trip.id), removeUndefined({ 
        ...tripWithDefaults, 
        uid: user.uid,
        participants: [user.uid],
        participantProfiles: {
          [user.uid]: {
            name: profile?.name || user.displayName || 'User',
            avatarUrl: profile?.avatarUrl || user.photoURL || undefined
          }
        }
      }));
    } catch (error) {
      handleFirestoreError(error, 'create', 'trips');
    }
  };

  const deleteTrip = async (id: string) => {
    if (isGuest) {
      const newTrips = trips.filter(t => t.id !== id);
      setTrips(newTrips);
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(newTrips));
      return;
    }
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'trips', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'trips');
    }
  };

  const updateTrip = async (updatedTrip: Trip) => {
    if (isGuest) {
      const newTrips = trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
      setTrips(newTrips);
      localStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(newTrips));
      return;
    }
    if (!user) return;
    try {
      await updateDoc(doc(db, 'trips', updatedTrip.id), removeUndefined({ 
        ...updatedTrip, 
        uid: updatedTrip.uid || user.uid 
      }));
    } catch (error) {
      handleFirestoreError(error, 'update', 'trips');
    }
  };

  const addItem = async (item: InventoryItem) => {
    if (isGuest) {
      const newInventory = [...inventory, item];
      setInventory(newInventory);
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(newInventory));
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'inventory', item.id), removeUndefined({ ...item, uid: user.uid }));
    } catch (error) {
      handleFirestoreError(error, 'create', 'inventory');
    }
  };

  const deleteItem = async (id: string) => {
    if (isGuest) {
      const newInventory = inventory.filter(i => i.id !== id);
      setInventory(newInventory);
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(newInventory));
      return;
    }
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'inventory');
    }
  };

  const updateItem = async (item: InventoryItem) => {
    if (isGuest) {
      const newInventory = inventory.map(i => i.id === item.id ? item : i);
      setInventory(newInventory);
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(newInventory));
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'inventory', item.id), removeUndefined({ ...item, uid: user.uid }));
    } catch (error) {
      handleFirestoreError(error, 'update', 'inventory');
    }
  };

  const addList = async (list: CustomList) => {
    if (isGuest) {
      const newLists = [...customLists, list];
      setCustomLists(newLists);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_LISTS, JSON.stringify(newLists));
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'customLists', list.id), removeUndefined({ ...list, uid: user.uid }));
    } catch (error) {
      handleFirestoreError(error, 'create', 'customLists');
    }
  };

  const deleteList = async (id: string) => {
    if (isGuest) {
      const newLists = customLists.filter(l => l.id !== id);
      setCustomLists(newLists);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_LISTS, JSON.stringify(newLists));
      return;
    }
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'customLists', id));
    } catch (error) {
      handleFirestoreError(error, 'delete', 'customLists');
    }
  };

  const updateList = async (list: CustomList) => {
    if (isGuest) {
      const newLists = customLists.map(l => l.id === list.id ? list : l);
      setCustomLists(newLists);
      localStorage.setItem(STORAGE_KEYS.CUSTOM_LISTS, JSON.stringify(newLists));
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'customLists', list.id), removeUndefined({ ...list, uid: user.uid }));
    } catch (error) {
      handleFirestoreError(error, 'update', 'customLists');
    }
  };

  const updateProfile = async (updatedProfile: UserProfile) => {
    if (isGuest) {
      setProfile(updatedProfile);
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(updatedProfile));
      return;
    }
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), removeUndefined(updatedProfile));
    } catch (error) {
      handleFirestoreError(error, 'update', 'users');
    }
  };

  const handleSignOut = async () => {
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem(STORAGE_KEYS.IS_GUEST);
      setProfile(null);
      setInventory([]);
      setTrips([]);
      setCustomLists([]);
      return;
    }
    await auth.signOut();
  };

  const handleDeleteAccount = async () => {
    if (isGuest) {
      setIsGuest(false);
      localStorage.clear();
      setProfile(null);
      setInventory([]);
      setTrips([]);
      setCustomLists([]);
      return;
    }
    if (!user) return;

    try {
      // Delete all user data in Firestore
      const inventoryDocs = await getDocs(query(collection(db, 'inventory'), where('uid', '==', user.uid)));
      await Promise.all(inventoryDocs.docs.map(doc => deleteDoc(doc.ref)));

      const tripDocs = await getDocs(query(collection(db, 'trips'), where('uid', '==', user.uid)));
      await Promise.all(tripDocs.docs.map(doc => deleteDoc(doc.ref)));

      const listDocs = await getDocs(query(collection(db, 'customLists'), where('uid', '==', user.uid)));
      await Promise.all(listDocs.docs.map(doc => deleteDoc(doc.ref)));

      await deleteDoc(doc(db, 'users', user.uid));

      // Sign out
      await auth.signOut();
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="bg-emerald-500 text-white p-4 rounded-2xl w-fit mx-auto mb-6">
            <Luggage className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('app.name')}</h1>
          <p className="text-stone-500 mb-8">{t('app.tagline')}</p>
          
          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white font-medium rounded-xl px-6 py-4 flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSigningIn ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {isSigningIn ? t('common.loading') : t('auth.signIn')}
            </button>

            <button
              onClick={handleContinueAsGuest}
              className="w-full bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-medium rounded-xl px-6 py-4 flex flex-col items-center justify-center gap-1 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('auth.continueAsGuest')}
              </div>
              <span className="text-[10px] text-stone-400 font-normal">{t('auth.guestWarning')}</span>
            </button>
          </div>

          {signInError && (
            <p className="mt-4 text-sm text-red-500 bg-red-50 p-3 rounded-xl border border-red-100">
              {signInError}
            </p>
          )}
          <div className="mt-8 pt-8 border-t border-stone-100 flex items-center justify-center gap-4 text-sm text-stone-400">
            <button onClick={() => i18n.changeLanguage('en-GB')} className={i18n.language === 'en-GB' ? 'text-stone-900 font-bold' : ''}>English (UK)</button>
            <span>•</span>
            <button onClick={() => i18n.changeLanguage('zh-CN')} className={i18n.language === 'zh-CN' ? 'text-stone-900 font-bold' : ''}>中文</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-sans selection:bg-emerald-200 flex flex-col">
      <Toaster position="top-center" />
      <header className="bg-white dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setActiveTab('landing'); setActiveTripId(null); }}>
            <div className="bg-emerald-500 text-white p-2 rounded-xl">
              <Luggage className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-stone-900 dark:text-white">{t('app.name')}</h1>
          </div>
          
          <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-900 p-1 rounded-xl">
            <button
              onClick={() => { setActiveTab('trips'); setActiveTripId(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'trips' && !activeTripId
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.trips')}</span>
            </button>
            <button
              onClick={() => { setActiveTab('inventory'); setActiveTripId(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'inventory' 
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <Box className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.inventory')}</span>
            </button>
            <button
              onClick={() => { setActiveTab('profile'); setActiveTripId(null); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'profile' 
                  ? 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{t('nav.profile')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-x-hidden">
        <motion.div
          key={activeTripId || activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          onPanEnd={handleSwipe}
          className="h-full"
        >
          {activeTrip ? (
            <TripDetailView 
              trip={activeTrip} 
              inventory={inventory} 
              profile={profile}
              user={user}
              customLists={customLists}
              allEssentials={allEssentials}
              updateTrip={updateTrip} 
              onDeleteTrip={deleteTrip}
              onBack={() => setActiveTripId(null)} 
              onAddItem={addItem}
            />
          ) : activeTab === 'landing' ? (
            <LandingView 
              profile={profile}
              trips={trips}
              onNavigate={(tab) => setActiveTab(tab)}
            />
          ) : activeTab === 'inventory' ? (
            <InventoryView 
              inventory={inventory} 
              customLists={customLists}
              allEssentials={allEssentials}
              setAllEssentials={setAllEssentials}
              onAddItem={addItem}
              onDeleteItem={deleteItem}
              onUpdateItem={updateItem}
              onAddList={addList}
              onDeleteList={deleteList}
              onUpdateList={updateList}
            />
          ) : activeTab === 'profile' ? (
            <ProfileView 
              profile={profile} 
              user={user}
              isGuest={isGuest}
              inventory={inventory}
              onUpdateProfile={updateProfile}
              onSignOut={handleSignOut}
              onDeleteAccount={handleDeleteAccount}
            />
          ) : (
            <TripListView 
              trips={trips} 
              inventory={inventory} 
              profile={profile}
              customLists={customLists}
              allEssentials={allEssentials}
              onAddTrip={addTrip}
              onDeleteTrip={deleteTrip}
              onSelectTrip={setActiveTripId} 
              onJoinTrip={joinTrip}
            />
          )}
        </motion.div>
      </main>
    </div>
  );
}

