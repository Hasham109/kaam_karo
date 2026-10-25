/**
 * Customer App State & Navigation Context (BP §12, §78.1; ARCH §3.1).
 * Supports screen switching, guest browsing, user auth state, favorites, and live RTL locale toggle.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Locale } from '@kaamkaro/i18n';
import type {
  ActiveBooking,
  CustomerAppContextValue,
  CustomerUser,
  IntakeDraft,
  PermissionKind,
  PermissionStateValue,
  ScreenId,
  ScreenParams,
} from '../types';
import { MOCK_ACTIVE_BOOKING } from '../data/mock-data';

const CustomerAppContext = createContext<CustomerAppContextValue | null>(null);

export const DEFAULT_INTAKE_DRAFT: IntakeDraft = {
  draftId: 'draft-initial',
  description: '',
  when: 'TODAY',
  location: null,
  photos: [],
  audioNote: null,
  video: null,
  preferences: [],
};

export interface CustomerAppProviderProps {
  readonly initialScreen?: ScreenId;
  readonly initialLocale?: Locale;
  readonly initialUser?: CustomerUser | null;
  readonly initialIsGuest?: boolean;
  readonly initialActiveBooking?: ActiveBooking | null;
  readonly initialDraft?: Partial<IntakeDraft>;
  readonly children: React.ReactNode;
}

interface HistoryEntry {
  readonly screen: ScreenId;
  readonly params?: ScreenParams[ScreenId];
}

export function CustomerAppProvider({
  initialScreen = 'C01',
  initialLocale = 'en',
  initialUser = null,
  initialIsGuest = false,
  initialActiveBooking = null,
  initialDraft,
  children,
}: CustomerAppProviderProps): React.JSX.Element {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [currentScreen, setCurrentScreen] = useState<ScreenId>(initialScreen);
  const [screenParams, setScreenParams] = useState<ScreenParams[ScreenId]>(undefined);
  const [, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [user, setUserState] = useState<CustomerUser | null>(initialUser);
  const [isGuest, setIsGuestState] = useState<boolean>(initialIsGuest);
  const [selectedCity, setSelectedCity] = useState<string>('Lahore');
  const [favorites, setFavorites] = useState<ReadonlySet<string>>(new Set());
  const [activeBooking, setActiveBooking] = useState<ActiveBooking | null>(
    initialActiveBooking ?? (initialUser ? MOCK_ACTIVE_BOOKING : null),
  );
  const [recentSearches, setRecentSearches] = useState<readonly string[]>([
    'AC General Service',
    'Short Circuit',
    'Pipe Leakage',
  ]);
  const [draft, setDraftState] = useState<IntakeDraft>({
    ...DEFAULT_INTAKE_DRAFT,
    ...initialDraft,
  });
  const [permissionStatus, setPermissionStatusState] = useState<
    Record<PermissionKind, PermissionStateValue>
  >({
    location: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
  }, []);

  const navigate = useCallback(
    <S extends ScreenId>(screen: S, params?: ScreenParams[S]) => {
      setHistory((prev) => [...prev, { screen: currentScreen, params: screenParams }]);
      setCurrentScreen(screen);
      setScreenParams(params as ScreenParams[ScreenId]);
    },
    [currentScreen, screenParams],
  );

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        // Fallback to Home if authenticated/guest or Welcome if unauthenticated
        setCurrentScreen(user || isGuest ? 'C06' : 'C02');
        setScreenParams(undefined);
        return [];
      }
      const last = prev[prev.length - 1];
      if (last) {
        setCurrentScreen(last.screen);
        setScreenParams(last.params);
      }
      return prev.slice(0, -1);
    });
  }, [user, isGuest]);

  const setUser = useCallback((newUser: CustomerUser | null) => {
    setUserState(newUser);
    if (newUser) {
      setIsGuestState(false);
      setActiveBooking(MOCK_ACTIVE_BOOKING);
    } else {
      setActiveBooking(null);
    }
  }, []);

  const setIsGuest = useCallback((guest: boolean) => {
    setIsGuestState(guest);
    if (guest) {
      setUserState(null);
      setActiveBooking(null);
    }
  }, []);

  const toggleFavorite = useCallback((providerId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((providerId: string) => favorites.has(providerId), [favorites]);

  const addRecentSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches((prev) => [trimmed, ...prev.filter((q) => q !== trimmed)].slice(0, 8));
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
  }, []);

  const updateDraft = useCallback((updates: Partial<IntakeDraft>) => {
    setDraftState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraftState({
      ...DEFAULT_INTAKE_DRAFT,
      draftId: `draft-${Date.now()}`,
    });
  }, []);

  const setPermissionStatus = useCallback((kind: PermissionKind, state: PermissionStateValue) => {
    setPermissionStatusState((prev) => ({
      ...prev,
      [kind]: state,
    }));
  }, []);

  const contextValue: CustomerAppContextValue = {
    locale,
    setLocale,
    currentScreen,
    screenParams,
    navigate,
    goBack,
    user,
    isGuest,
    setUser,
    setIsGuest,
    selectedCity,
    setSelectedCity,
    favorites,
    toggleFavorite,
    isFavorite,
    activeBooking,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
    draft,
    updateDraft,
    clearDraft,
    permissionStatus,
    setPermissionStatus,
  };

  return <CustomerAppContext.Provider value={contextValue}>{children}</CustomerAppContext.Provider>;
}

export function useCustomerApp(): CustomerAppContextValue {
  const context = useContext(CustomerAppContext);
  if (!context) {
    throw new Error('useCustomerApp must be used within a CustomerAppProvider');
  }
  return context;
}
