/**
 * Partner App State Management Context (Tasks T4.1, T4.2; BP §10, §13, §22, §59; D-002, D-004, D-018).
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type { Locale } from '@kaamkaro/i18n';
import type {
  DateOverrideItem,
  DocumentItem,
  DocumentType,
  LiveStatus,
  OnboardingMode,
  PartnerProfile,
  ProviderServiceItem,
  ProviderType,
  RegStep,
  ScreenId,
  ScreenStateMode,
  ServiceAreaConfig,
  VerificationLevel,
  WeeklySchedule,
} from '../types';

interface PartnerContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
  navigate: (screen: ScreenId) => void;
  goBack: () => void;
  onboardingMode: OnboardingMode;
  setOnboardingMode: (mode: OnboardingMode) => void;
  regStep: RegStep;
  setRegStep: (step: RegStep) => void;
  phone: string;
  setPhone: (phone: string) => void;
  otp: string;
  setOtp: (otp: string) => void;
  fullName: string;
  setFullName: (name: string) => void;
  providerType: ProviderType;
  setProviderType: (type: ProviderType) => void;
  businessName: string;
  setBusinessName: (name: string) => void;
  teamSize: number;
  setTeamSize: (size: number) => void;
  email: string;
  setEmail: (email: string) => void;
  profile: PartnerProfile | null;
  documents: DocumentItem[];
  screenStates: Record<ScreenId, ScreenStateMode>;
  setScreenState: (screen: ScreenId, state: ScreenStateMode) => void;
  sendOtp: () => Promise<boolean>;
  verifyOtp: () => Promise<boolean>;
  saveProfile: () => Promise<boolean>;
  uploadDocument: (docId: DocumentType) => Promise<boolean>;
  replaceDocument: (docId: DocumentType) => Promise<boolean>;
  submitVerification: () => Promise<boolean>;
  resetToStart: () => void;

  // --- T4.2 Service Setup ---
  services: ProviderServiceItem[];
  addService: (item: Omit<ProviderServiceItem, 'id' | 'published'>) => Promise<boolean>;
  togglePublishService: (id: string) => Promise<boolean>;

  // --- T4.2 Availability ---
  weeklySchedule: WeeklySchedule;
  updateWeeklySchedule: (schedule: WeeklySchedule) => Promise<boolean>;

  // --- T4.2 Service Area ---
  serviceArea: ServiceAreaConfig;
  updateServiceArea: (config: ServiceAreaConfig) => Promise<boolean>;

  // --- T4.2 Live Status ---
  liveStatus: LiveStatus;
  setLiveStatusState: (status: LiveStatus) => Promise<boolean>;
  hasPromptedNotification: boolean;
  setHasPromptedNotification: (prompted: boolean) => void;

  // --- T4.2 Date Overrides ---
  dateOverrides: DateOverrideItem[];
  addDateOverride: (override: Omit<DateOverrideItem, 'id'>) => Promise<boolean>;
  removeDateOverride: (id: string) => Promise<boolean>;
}

const INITIAL_DOCS: DocumentItem[] = [
  {
    id: 'CNIC_FRONT',
    titleKey: 'partner.p03.docCnicFront',
    status: 'NOT_UPLOADED',
    required: true,
  },
  {
    id: 'CNIC_BACK',
    titleKey: 'partner.p03.docCnicBack',
    status: 'NOT_UPLOADED',
    required: true,
  },
  {
    id: 'TRADE_CERT',
    titleKey: 'partner.p03.docTradeCert',
    status: 'NOT_UPLOADED',
    required: true,
  },
  {
    id: 'BUSINESS_REG',
    titleKey: 'partner.p03.docBusinessReg',
    status: 'NOT_UPLOADED',
    required: false, // only required if TEAM
  },
];

const INITIAL_SERVICES: ProviderServiceItem[] = [
  {
    id: 'ps_fan_install',
    categoryId: 'electrician',
    categoryName: 'Electrician',
    serviceId: 'ceiling_fan_installation',
    serviceName: 'Ceiling Fan Installation',
    priceModel: 'FIXED',
    sellingModes: ['INSTANT', 'CHOOSE_SUPPLIER'],
    pricingUnit: 'job',
    fixedPricePkr: 1200,
    visitFeePkr: 300,
    verificationNeeded: 'BASIC',
    published: true,
  },
  {
    id: 'ps_ac_service',
    categoryId: 'ac_repair',
    categoryName: 'AC Repair & Service',
    serviceId: 'ac_general_service',
    serviceName: 'AC General Service',
    priceModel: 'FROM',
    sellingModes: ['CHOOSE_SUPPLIER', 'REQUEST_QUOTES'],
    pricingUnit: 'unit',
    startingPricePkr: 2500,
    visitFeePkr: 500,
    verificationNeeded: 'VERIFIED',
    published: true,
  },
  {
    id: 'ps_pipe_leak',
    categoryId: 'plumbing',
    categoryName: 'Plumbing',
    serviceId: 'pipe_leakage_repair',
    serviceName: 'Pipe Leakage Repair',
    priceModel: 'INSPECTION_QUOTE',
    sellingModes: ['REQUEST_QUOTES'],
    pricingUnit: 'job',
    inspectionFeePkr: 800,
    inspectionDeductible: true,
    verificationNeeded: 'BASIC',
    published: false,
  },
];

const INITIAL_WEEKLY_SCHEDULE: WeeklySchedule = {
  days: [
    {
      dayOfWeek: 1,
      isWorking: true,
      startTime: '09:00',
      endTime: '18:00',
      breaks: [{ start: '13:00', end: '14:00' }],
      isEmergency: false,
    },
    {
      dayOfWeek: 2,
      isWorking: true,
      startTime: '09:00',
      endTime: '18:00',
      breaks: [{ start: '13:00', end: '14:00' }],
      isEmergency: false,
    },
    {
      dayOfWeek: 3,
      isWorking: true,
      startTime: '09:00',
      endTime: '18:00',
      breaks: [{ start: '13:00', end: '14:00' }],
      isEmergency: false,
    },
    {
      dayOfWeek: 4,
      isWorking: true,
      startTime: '09:00',
      endTime: '18:00',
      breaks: [{ start: '13:00', end: '14:00' }],
      isEmergency: false,
    },
    {
      dayOfWeek: 5,
      isWorking: true,
      startTime: '09:00',
      endTime: '18:00',
      breaks: [{ start: '12:30', end: '14:30' }],
      isEmergency: true,
    },
    {
      dayOfWeek: 6,
      isWorking: true,
      startTime: '10:00',
      endTime: '17:00',
      breaks: [{ start: '13:00', end: '14:00' }],
      isEmergency: true,
    },
    {
      dayOfWeek: 7,
      isWorking: false,
      startTime: '09:00',
      endTime: '17:00',
      breaks: [],
      isEmergency: false,
    },
  ],
  maxActiveJobs: 3,
};

const INITIAL_SERVICE_AREA: ServiceAreaConfig = {
  center: {
    name: 'Gulberg III, Lahore',
    latitude: 31.5204,
    longitude: 74.3587,
  },
  radiusKm: 15,
  selectedZones: ['Gulberg', 'DHA', 'Model Town', 'Johar Town', 'Cantt', 'Faisal Town'],
};

const PartnerContext = createContext<PartnerContextValue | null>(null);

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ur');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('P01');
  const [screenHistory, setScreenHistory] = useState<ScreenId[]>(['P01']);
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('register');
  const [regStep, setRegStep] = useState<RegStep>('phone');

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [providerType, setProviderType] = useState<ProviderType>('SOLO');
  const [businessName, setBusinessName] = useState('');
  const [teamSize, setTeamSize] = useState<number>(3);
  const [email, setEmail] = useState('');

  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>(INITIAL_DOCS);

  // T4.2 state
  const [services, setServices] = useState<ProviderServiceItem[]>(INITIAL_SERVICES);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(INITIAL_WEEKLY_SCHEDULE);
  const [serviceArea, setServiceArea] = useState<ServiceAreaConfig>(INITIAL_SERVICE_AREA);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('ONLINE_AVAILABLE');
  const [hasPromptedNotification, setHasPromptedNotification] = useState<boolean>(false);
  const [dateOverrides, setDateOverrides] = useState<DateOverrideItem[]>([]);

  const [screenStates, setScreenStates] = useState<Record<ScreenId, ScreenStateMode>>({
    P01: 'empty',
    P02: 'empty',
    P03: 'empty',
    P04: 'empty',
    P05: 'empty',
    P06: 'empty',
    P07: 'empty',
    P22: 'empty',
    P23: 'empty',
  });

  const navigate = (screen: ScreenId) => {
    setScreenHistory((prev) => [...prev, screen]);
    setCurrentScreen(screen);
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const nextHistory = [...screenHistory];
      nextHistory.pop();
      const prevScreen = nextHistory[nextHistory.length - 1];
      if (prevScreen) {
        setScreenHistory(nextHistory);
        setCurrentScreen(prevScreen);
      }
    } else {
      setCurrentScreen('P04');
    }
  };

  const setScreenState = (screen: ScreenId, state: ScreenStateMode) => {
    setScreenStates((prev) => ({ ...prev, [screen]: state }));
  };

  const sendOtp = async (): Promise<boolean> => {
    setScreenState('P02', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setRegStep('otp');
    setScreenState('P02', 'empty');
    return true;
  };

  const verifyOtp = async (): Promise<boolean> => {
    setScreenState('P02', 'loading');
    await new Promise((r) => setTimeout(r, 50));

    if (onboardingMode === 'login') {
      const existingProfile: PartnerProfile = {
        id: 'prov_88102',
        phone,
        fullName: fullName || 'Muhammad Asif',
        providerType: 'SOLO',
        city: 'Lahore',
        verificationLevel: 'BASIC',
        verificationSubmitted: false,
      };
      setProfile(existingProfile);
      setScreenState('P02', 'success');
      navigate('P03');
      return true;
    }

    setRegStep('profile');
    setScreenState('P02', 'empty');
    return true;
  };

  const saveProfile = async (): Promise<boolean> => {
    setScreenState('P02', 'loading');
    await new Promise((r) => setTimeout(r, 50));

    const newProfile: PartnerProfile = {
      id: `prov_${Date.now().toString(36)}`,
      phone,
      fullName,
      providerType,
      businessName: providerType === 'TEAM' ? businessName : undefined,
      teamSize: providerType === 'TEAM' ? teamSize : undefined,
      city: 'Lahore',
      email: email.trim() ? email.trim() : undefined,
      verificationLevel: 'BASIC' as VerificationLevel,
      verificationSubmitted: false,
    };
    setProfile(newProfile);

    // Adjust document requirements based on providerType
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === 'BUSINESS_REG') {
          return { ...doc, required: providerType === 'TEAM' };
        }
        return doc;
      }),
    );

    setScreenState('P02', 'success');
    navigate('P03');
    return true;
  };

  const uploadDocument = async (docId: DocumentType): Promise<boolean> => {
    setScreenState('P03', 'loading');
    await new Promise((r) => setTimeout(r, 50));

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          return {
            ...doc,
            status: 'UPLOADED',
            fileName: `${docId.toLowerCase()}_sample.pdf`,
            fileSizeMb: 1.8,
            uploadedAt: new Date().toISOString(),
          };
        }
        return doc;
      }),
    );
    setScreenState('P03', 'empty');
    return true;
  };

  const replaceDocument = async (docId: DocumentType): Promise<boolean> => {
    return uploadDocument(docId);
  };

  const submitVerification = async (): Promise<boolean> => {
    setScreenState('P03', 'loading');
    await new Promise((r) => setTimeout(r, 50));

    if (profile) {
      setProfile({
        ...profile,
        verificationSubmitted: true,
      });
    }

    setDocuments((prev) =>
      prev.map((doc) => (doc.status === 'UPLOADED' ? { ...doc, status: 'UNDER_REVIEW' } : doc)),
    );

    setScreenState('P03', 'success');
    navigate('P04');
    return true;
  };

  // --- T4.2 Handlers ---
  const addService = async (
    item: Omit<ProviderServiceItem, 'id' | 'published'>,
  ): Promise<boolean> => {
    setScreenState('P05', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    const newService: ProviderServiceItem = {
      ...item,
      id: `ps_${Date.now().toString(36)}`,
      published: true,
    };
    setServices((prev) => [...prev, newService]);
    setScreenState('P05', 'success');
    return true;
  };

  const togglePublishService = async (id: string): Promise<boolean> => {
    setScreenState('P05', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, published: !s.published } : s)));
    setScreenState('P05', 'empty');
    return true;
  };

  const updateWeeklySchedule = async (schedule: WeeklySchedule): Promise<boolean> => {
    setScreenState('P06', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setWeeklySchedule(schedule);
    setScreenState('P06', 'success');
    return true;
  };

  const updateServiceArea = async (config: ServiceAreaConfig): Promise<boolean> => {
    setScreenState('P07', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setServiceArea(config);
    setScreenState('P07', 'success');
    return true;
  };

  const setLiveStatusState = async (status: LiveStatus): Promise<boolean> => {
    setScreenState('P22', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setLiveStatus(status);
    setScreenState('P22', 'success');
    return true;
  };

  const addDateOverride = async (override: Omit<DateOverrideItem, 'id'>): Promise<boolean> => {
    setScreenState('P23', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    const item: DateOverrideItem = {
      ...override,
      id: `ovr_${Date.now().toString(36)}`,
    };
    setDateOverrides((prev) => [...prev, item]);
    setScreenState('P23', 'success');
    return true;
  };

  const removeDateOverride = async (id: string): Promise<boolean> => {
    setScreenState('P23', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setDateOverrides((prev) => prev.filter((o) => o.id !== id));
    setScreenState('P23', 'empty');
    return true;
  };

  const resetToStart = () => {
    setProfile(null);
    setPhone('');
    setOtp('');
    setFullName('');
    setBusinessName('');
    setTeamSize(3);
    setEmail('');
    setDocuments(INITIAL_DOCS);
    setRegStep('phone');
    setOnboardingMode('register');
    setScreenHistory(['P01']);
    setCurrentScreen('P01');
  };

  const value = useMemo<PartnerContextValue>(
    () => ({
      locale,
      setLocale,
      currentScreen,
      setCurrentScreen,
      navigate,
      goBack,
      onboardingMode,
      setOnboardingMode,
      regStep,
      setRegStep,
      phone,
      setPhone,
      otp,
      setOtp,
      fullName,
      setFullName,
      providerType,
      setProviderType,
      businessName,
      setBusinessName,
      teamSize,
      setTeamSize,
      email,
      setEmail,
      profile,
      documents,
      screenStates,
      setScreenState,
      sendOtp,
      verifyOtp,
      saveProfile,
      uploadDocument,
      replaceDocument,
      submitVerification,
      resetToStart,

      // T4.2
      services,
      addService,
      togglePublishService,
      weeklySchedule,
      updateWeeklySchedule,
      serviceArea,
      updateServiceArea,
      liveStatus,
      setLiveStatusState,
      hasPromptedNotification,
      setHasPromptedNotification,
      dateOverrides,
      addDateOverride,
      removeDateOverride,
    }),
    [
      locale,
      currentScreen,
      screenHistory,
      onboardingMode,
      regStep,
      phone,
      otp,
      fullName,
      providerType,
      businessName,
      teamSize,
      email,
      profile,
      documents,
      screenStates,
      services,
      weeklySchedule,
      serviceArea,
      liveStatus,
      hasPromptedNotification,
      dateOverrides,
    ],
  );

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner() {
  const context = useContext(PartnerContext);
  if (!context) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return context;
}
