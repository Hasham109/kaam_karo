/**
 * Partner App State Management Context (Tasks T4.1, T4.2; BP §10, §13, §22, §59; D-002, D-004, D-018).
 */
import { createContext, useContext, useMemo, useState } from 'react';
import type { Locale } from '@kaamkaro/i18n';
import type {
  CompletionEvidence,
  DateOverrideItem,
  DocumentItem,
  DocumentType,
  ExecutionStatus,
  FinalBillTotals,
  IncomingJobRequest,
  LiveStatus,
  OnboardingMode,
  PartnerProfile,
  PaymentMethodChoice,
  ProposedExtraLine,
  ProviderServiceItem,
  ProviderType,
  QuoteDraft,
  QuoteLineItem,
  QuoteTotals,
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

  // --- T4.3 Job Requests & Detail & Media Player ---
  jobRequests: IncomingJobRequest[];
  selectedJobId: string | null;
  selectedJob: IncomingJobRequest | null;
  selectJob: (id: string | null) => void;
  acceptJob: (id: string, crewSize: number) => Promise<boolean>;
  declineJob: (id: string) => Promise<boolean>;
  cancelJob: (id: string) => Promise<boolean>;
  activeActionSheet: 'ACCEPT' | 'DECLINE' | null;
  setActiveActionSheet: (sheet: 'ACCEPT' | 'DECLINE' | null) => void;
  activeMediaIndex: number;
  setActiveMediaIndex: (idx: number) => void;
  isPlayingMedia: boolean;
  setIsPlayingMedia: (playing: boolean) => void;

  // --- T4.4 Structured Quote Builder ---
  quoteDraft: QuoteDraft | null;
  quoteTotals: QuoteTotals;
  initQuoteDraft: (bookingId: string) => void;
  addQuoteLine: (line: Omit<QuoteLineItem, 'id'>) => void;
  removeQuoteLine: (id: string) => void;
  updateQuoteMetadata: (updates: Partial<QuoteDraft>) => void;
  sendQuote: () => Promise<boolean>;

  // --- T4.5 Job Execution, Extras & Completion Evidence ---
  executionStatus: ExecutionStatus;
  setExecutionStatus: (status: ExecutionStatus) => void;
  isSharingLocation: boolean;
  toggleLocationSharing: (sharing: boolean) => void;
  startTrip: () => Promise<boolean>;
  markArrived: () => Promise<boolean>;
  startWork: () => Promise<boolean>;
  finishJob: () => Promise<boolean>;
  stopForSafety: () => Promise<boolean>;
  reportCustomerNotHere: () => Promise<boolean>;
  unpaidCommissionOwed: number;
  setUnpaidCommissionOwed: (amount: number) => void;
  hasPendingApproval: boolean;
  proposedExtras: ProposedExtraLine[];
  addProposedExtra: (
    line: Omit<ProposedExtraLine, 'id' | 'status' | 'createdAt'>,
  ) => Promise<boolean>;
  approveExtraLine: (id: string) => void;
  proposeCrewChange: (newCrewSize: number) => Promise<boolean>;
  completionEvidence: CompletionEvidence;
  updateCompletionNotes: (notes: string) => void;
  addCompletionPhoto: (url: string) => void;
  removeCompletionPhoto: (index: number) => void;
  setCustomerSignature: (sig: string) => void;
  setCompletionCode: (code: string) => void;
  completeJobWithEvidence: () => Promise<boolean>;
  recordPaymentMethod: (method: PaymentMethodChoice) => Promise<boolean>;
  finalBillTotals: FinalBillTotals;
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

const INITIAL_JOB_REQUESTS: IncomingJobRequest[] = [
  {
    id: 'req_001',
    bookingId: 'BK-2026-7841',
    status: 'REQUESTED',
    serviceName: 'Ceiling Fan Installation',
    shortSummary: 'Need installation of 2 ceiling fans in bedrooms',
    areaName: 'Gulberg III',
    distanceKm: 3.2,
    commercialModel: 'INSTANT',
    priceType: 'FIXED',
    pricePkr: 1500,
    timeWindow: 'Today, 2:00 PM – 4:00 PM',
    expiresInMinutes: 15,
    media: [
      {
        type: 'voice',
        url: 'https://cdn.kaamkaro.pk/audio/fan_install.m4a',
        durationSeconds: 24,
        transcriptText: 'Hamare drawing room aur bedroom mein naye fan lagwane hain.',
      },
      {
        type: 'photo',
        url: 'https://cdn.kaamkaro.pk/images/fan_box.jpg',
      },
      {
        type: 'photo',
        url: 'https://cdn.kaamkaro.pk/images/ceiling_hook.jpg',
      },
    ],
  },
  {
    id: 'req_002',
    bookingId: 'BK-2026-9023',
    status: 'REQUESTED',
    serviceName: 'AC Repair & Service',
    shortSummary: 'Split AC not cooling properly and making buzzing sound',
    areaName: 'DHA Phase 5',
    distanceKm: 7.5,
    commercialModel: 'CHOOSE_SUPPLIER',
    priceType: 'FROM',
    pricePkr: 2500,
    timeWindow: 'Tomorrow, 10:00 AM – 1:00 PM',
    expiresInMinutes: 45,
    media: [
      {
        type: 'video',
        url: 'https://cdn.kaamkaro.pk/video/ac_sound.mp4',
        thumbnailUrl: 'https://cdn.kaamkaro.pk/video/ac_thumb.jpg',
        durationSeconds: 15,
      },
      {
        type: 'voice',
        url: 'https://cdn.kaamkaro.pk/audio/ac_issue.m4a',
        durationSeconds: 18,
        transcriptText: 'AC se hawa thandi nahi aa rahi aur ajeeb awaz aa rahi hai.',
      },
    ],
  },
];

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

  // T4.3 state
  const [jobRequests, setJobRequests] = useState<IncomingJobRequest[]>(INITIAL_JOB_REQUESTS);
  const [selectedJobId, setSelectedJobId] = useState<string | null>('req_001');
  const [activeActionSheet, setActiveActionSheet] = useState<'ACCEPT' | 'DECLINE' | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);
  const [isPlayingMedia, setIsPlayingMedia] = useState<boolean>(false);

  const [screenStates, setScreenStates] = useState<Record<ScreenId, ScreenStateMode>>({
    P01: 'empty',
    P02: 'empty',
    P03: 'empty',
    P04: 'empty',
    P05: 'empty',
    P06: 'empty',
    P07: 'empty',
    P08: 'empty',
    P09: 'empty',
    P10: 'empty',
    P12: 'empty',
    P13: 'empty',
    P14: 'empty',
    P15: 'empty',
    P22: 'empty',
    P23: 'empty',
    P24: 'empty',
    P25: 'empty',
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

  // --- T4.3 Job Requests Handlers ---
  const selectedJob = useMemo(
    () => jobRequests.find((j) => j.id === selectedJobId) ?? null,
    [jobRequests, selectedJobId],
  );

  const selectJob = (id: string | null) => {
    setSelectedJobId(id);
  };

  const acceptJob = async (id: string, crewSize: number): Promise<boolean> => {
    setScreenState('P10', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setJobRequests((prev) =>
      prev.map((j) => {
        if (j.id !== id) return j;
        return {
          ...j,
          status: 'ACCEPTED',
          crewSize,
          responsibleName: profile?.fullName || 'Muhammad Ahmad',
          matchedAddress: 'House 12-B, Street 4, Gulberg III, Lahore',
          customerPhone: '03001234567',
          customerName: 'Tariq Mahmood',
        };
      }),
    );
    setActiveActionSheet(null);
    setScreenState('P08', 'success');
    setScreenState('P09', 'success');
    setScreenState('P10', 'success');
    return true;
  };

  const declineJob = async (id: string): Promise<boolean> => {
    setScreenState('P10', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setJobRequests((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'REJECTED' } : j)));
    setActiveActionSheet(null);
    setScreenState('P08', 'success');
    setScreenState('P09', 'success');
    setScreenState('P10', 'success');
    return true;
  };

  const cancelJob = async (id: string): Promise<boolean> => {
    setScreenState('P09', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setJobRequests((prev) => prev.map((j) => (j.id === id ? { ...j, status: 'CANCELLED' } : j)));
    setScreenState('P09', 'success');
    return true;
  };

  // T4.4 Quote Builder state
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft | null>({
    bookingId: 'BK-2026-7841',
    lines: [
      {
        id: 'line_1',
        lineType: 'LABOUR_SERVICE',
        description: 'Standard repair and maintenance',
        quantity: 1,
        unit: 'job',
        amountPkr: 1500,
      },
    ],
    validUntil: '2026-10-31',
    inclusions: 'Standard labour and diagnosis included',
    exclusions: 'Replacement hardware parts not included',
    expectedDurationHours: 2,
    crewSize: 1,
    noteToCustomer: '',
  });

  const quoteTotals = useMemo<QuoteTotals>(() => {
    if (!quoteDraft || quoteDraft.lines.length === 0) {
      return {
        subtotalPkr: 0,
        taxPkr: 0,
        totalCustomerPkr: 0,
        commissionPkr: 0,
        providerSharePkr: 0,
      };
    }
    let subtotal = 0;
    let labourTotal = 0;
    for (const line of quoteDraft.lines) {
      if (line.lineType === 'DISCOUNT') {
        subtotal -= Math.abs(line.amountPkr);
      } else {
        subtotal += line.amountPkr;
      }
      if (line.lineType === 'LABOUR_SERVICE') {
        labourTotal += line.amountPkr;
      }
    }
    const totalCustomerPkr = Math.max(0, subtotal);
    // Commission: 30% on labour lines only (D-006, D-015)
    const commissionPkr = Math.round(labourTotal * 0.3);
    const providerSharePkr = Math.max(0, totalCustomerPkr - commissionPkr);
    return {
      subtotalPkr: totalCustomerPkr,
      taxPkr: 0,
      totalCustomerPkr,
      commissionPkr,
      providerSharePkr,
    };
  }, [quoteDraft]);

  const initQuoteDraft = (bookingId: string) => {
    setQuoteDraft({
      bookingId,
      lines: [
        {
          id: 'line_1',
          lineType: 'LABOUR_SERVICE',
          description: 'Standard repair and maintenance',
          quantity: 1,
          unit: 'job',
          amountPkr: 1500,
        },
      ],
      validUntil: '2026-10-31',
      inclusions: 'Standard labour and diagnosis included',
      exclusions: 'Replacement hardware parts not included',
      expectedDurationHours: 2,
      crewSize: 1,
      noteToCustomer: '',
    });
  };

  const addQuoteLine = (line: Omit<QuoteLineItem, 'id'>) => {
    setQuoteDraft((prev) => {
      if (!prev) return prev;
      const newLine: QuoteLineItem = {
        ...line,
        id: `line_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      };
      return {
        ...prev,
        lines: [...prev.lines, newLine],
      };
    });
  };

  const removeQuoteLine = (id: string) => {
    setQuoteDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lines: prev.lines.filter((l) => l.id !== id),
      };
    });
  };

  const updateQuoteMetadata = (updates: Partial<QuoteDraft>) => {
    setQuoteDraft((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const sendQuote = async (): Promise<boolean> => {
    setScreenState('P24', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setScreenState('P24', 'success');
    return true;
  };

  // --- T4.5 Job Execution, Extras & Completion State (BP §13 P12..P14, BP §57.4, §81, §58.1..2; FARE-003..012; D-003, D-006, D-016, D-030) ---
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('SCHEDULED');
  const [isSharingLocation, setIsSharingLocation] = useState<boolean>(false);
  const [unpaidCommissionOwed, setUnpaidCommissionOwed] = useState<number>(0);
  const [proposedExtras, setProposedExtras] = useState<ProposedExtraLine[]>([]);
  const [completionEvidence, setCompletionEvidence] = useState<CompletionEvidence>({
    workNotes: '',
    photos: [],
  });

  const hasPendingApproval = useMemo(
    () => proposedExtras.some((l) => l.status === 'PROPOSED'),
    [proposedExtras],
  );

  const startTrip = async (): Promise<boolean> => {
    if (unpaidCommissionOwed > 0) {
      setScreenState('P12', 'error');
      return false;
    }
    setScreenState('P12', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setExecutionStatus('EN_ROUTE');
    setIsSharingLocation(true); // BP §57.4, §81: Location only shared during active job (En Route)
    setScreenState('P12', 'success');
    return true;
  };

  const markArrived = async (): Promise<boolean> => {
    setScreenState('P12', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setExecutionStatus('ARRIVED');
    setIsSharingLocation(false); // BP §57.4, LOC-GEO-007: location sharing terminates on Arrived
    setScreenState('P12', 'success');
    return true;
  };

  const startWork = async (): Promise<boolean> => {
    if (unpaidCommissionOwed > 0) {
      setScreenState('P12', 'error');
      return false;
    }
    setScreenState('P12', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setExecutionStatus('IN_PROGRESS');
    setIsSharingLocation(false);
    setScreenState('P12', 'success');
    return true;
  };

  const finishJob = async (): Promise<boolean> => {
    navigate('P14');
    return true;
  };

  const stopForSafety = async (): Promise<boolean> => {
    setScreenState('P12', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    // Safety stop: Arrived -> CANCELLED, In Progress -> DISPUTED (BOOK-CANCEL-006)
    if (executionStatus === 'ARRIVED') {
      setExecutionStatus('CANCELLED');
    } else {
      setExecutionStatus('DISPUTED');
    }
    setIsSharingLocation(false);
    setScreenState('P12', 'success');
    return true;
  };

  const reportCustomerNotHere = async (): Promise<boolean> => {
    setScreenState('P12', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setExecutionStatus('CANCELLED');
    setIsSharingLocation(false);
    setScreenState('P12', 'success');
    return true;
  };

  const toggleLocationSharing = (sharing: boolean) => {
    // Only allowed while EN_ROUTE (BP §57.4, LOC-GEO-007)
    if (executionStatus === 'EN_ROUTE') {
      setIsSharingLocation(sharing);
    } else {
      setIsSharingLocation(false);
    }
  };

  const addProposedExtra = async (
    line: Omit<ProposedExtraLine, 'id' | 'status' | 'createdAt'>,
  ): Promise<boolean> => {
    setScreenState('P13', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    const newLine: ProposedExtraLine = {
      ...line,
      id: `extra_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: 'PROPOSED', // FARE-012: Provider can only propose, never payable until customer approves
      createdAt: new Date().toISOString(),
    };
    setProposedExtras((prev) => [...prev, newLine]);
    setScreenState('P13', 'success');
    return true;
  };

  const approveExtraLine = (id: string) => {
    setProposedExtras((prev) => prev.map((l) => (l.id === id ? { ...l, status: 'APPROVED' } : l)));
  };

  const proposeCrewChange = async (newCrewSize: number): Promise<boolean> => {
    setScreenState('P13', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    const newLine: ProposedExtraLine = {
      id: `crew_change_${Date.now()}`,
      lineType: 'LABOUR_SERVICE',
      description: `Crew size change to ${newCrewSize} workers`,
      amountPkr: 0,
      quantity: newCrewSize,
      status: 'PROPOSED', // PROV-CREW-004
      createdAt: new Date().toISOString(),
    };
    setProposedExtras((prev) => [...prev, newLine]);
    setScreenState('P13', 'success');
    return true;
  };

  const updateCompletionNotes = (notes: string) => {
    setCompletionEvidence((prev) => ({ ...prev, workNotes: notes }));
  };

  const addCompletionPhoto = (url: string) => {
    setCompletionEvidence((prev) => ({ ...prev, photos: [...prev.photos, url] }));
  };

  const removeCompletionPhoto = (index: number) => {
    setCompletionEvidence((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const setCustomerSignature = (sig: string) => {
    setCompletionEvidence((prev) => ({ ...prev, customerSignature: sig }));
  };

  const setCompletionCode = (code: string) => {
    setCompletionEvidence((prev) => ({ ...prev, completionCode: code }));
  };

  const completeJobWithEvidence = async (): Promise<boolean> => {
    setScreenState('P14', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    setExecutionStatus('COMPLETED'); // D-003: job moves to Completed first
    setIsSharingLocation(false);
    setCompletionEvidence((prev) => ({
      ...prev,
      completedAt: new Date().toISOString(),
    }));
    setScreenState('P14', 'success');
    return true;
  };

  const finalBillTotals = useMemo<FinalBillTotals>(() => {
    const baseLabour = selectedJob?.pricePkr ?? 1500;
    let extraLabour = 0;
    let materials = 0;
    let tools = 0;
    let discount = 0;

    // Only APPROVED or FINAL lines count towards bill (FARE-012, PRICE-007)
    for (const line of proposedExtras) {
      if (line.status !== 'APPROVED' && line.status !== 'FINAL') {
        continue;
      }
      if (line.lineType === 'DISCOUNT') {
        discount += Math.abs(line.amountPkr);
      } else if (
        line.lineType === 'LABOUR_SERVICE' ||
        line.lineType === 'EMERGENCY_AFTER_HOURS' ||
        line.lineType === 'TRAVEL_DISTANCE'
      ) {
        extraLabour += line.amountPkr;
      } else if (line.lineType === 'PARTS_MATERIALS' || line.lineType === 'CONSUMABLES') {
        materials += line.amountPkr;
      } else if (line.lineType === 'TOOLS_EQUIPMENT') {
        tools += line.amountPkr;
      }
    }

    const labourPkr = Math.max(0, baseLabour + extraLabour);
    const materialsPkr = materials;
    const taxPkr = 0; // Tax Rs. 0 while rules not set (D-029)
    const subtotal = labourPkr + materialsPkr + tools - discount;
    const customerTotalPkr = Math.max(0, subtotal);
    // Commission: 30% on labour lines only (D-006, D-015, COMM-004)
    const commissionRatePct = 30;
    const commissionPkr = Math.round(labourPkr * 0.3);
    const providerSharePkr = Math.max(0, customerTotalPkr - commissionPkr);

    return {
      customerTotalPkr,
      labourPkr,
      materialsPkr,
      taxPkr,
      commissionPkr,
      providerSharePkr,
      commissionRatePct,
    };
  }, [selectedJob, proposedExtras]);

  const recordPaymentMethod = async (method: PaymentMethodChoice): Promise<boolean> => {
    setScreenState('P14', 'loading');
    await new Promise((r) => setTimeout(r, 50));
    if (method === 'CASH') {
      // Cash confirmation debits commission from balance (D-006, COMM-001)
      const commDebited = finalBillTotals.commissionPkr;
      setCompletionEvidence((prev) => ({
        ...prev,
        paymentMethod: 'CASH',
        cashCommissionDebited: commDebited,
      }));
    } else {
      setCompletionEvidence((prev) => ({
        ...prev,
        paymentMethod: 'DIGITAL',
        digitalStatus: 'WAITING',
      }));
    }
    setScreenState('P14', 'success');
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
    setExecutionStatus('SCHEDULED');
    setIsSharingLocation(false);
    setProposedExtras([]);
    setCompletionEvidence({ workNotes: '', photos: [] });
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

      // T4.3
      jobRequests,
      selectedJobId,
      selectedJob,
      selectJob,
      acceptJob,
      declineJob,
      cancelJob,
      activeActionSheet,
      setActiveActionSheet,
      activeMediaIndex,
      setActiveMediaIndex,
      isPlayingMedia,
      setIsPlayingMedia,

      // T4.4
      quoteDraft,
      quoteTotals,
      initQuoteDraft,
      addQuoteLine,
      removeQuoteLine,
      updateQuoteMetadata,
      sendQuote,

      // T4.5
      executionStatus,
      setExecutionStatus,
      isSharingLocation,
      toggleLocationSharing,
      startTrip,
      markArrived,
      startWork,
      finishJob,
      stopForSafety,
      reportCustomerNotHere,
      unpaidCommissionOwed,
      setUnpaidCommissionOwed,
      hasPendingApproval,
      proposedExtras,
      addProposedExtra,
      approveExtraLine,
      proposeCrewChange,
      completionEvidence,
      updateCompletionNotes,
      addCompletionPhoto,
      removeCompletionPhoto,
      setCustomerSignature,
      setCompletionCode,
      completeJobWithEvidence,
      recordPaymentMethod,
      finalBillTotals,
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
      jobRequests,
      selectedJobId,
      selectedJob,
      activeActionSheet,
      activeMediaIndex,
      isPlayingMedia,
      quoteDraft,
      quoteTotals,
      executionStatus,
      isSharingLocation,
      unpaidCommissionOwed,
      hasPendingApproval,
      proposedExtras,
      completionEvidence,
      finalBillTotals,
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
