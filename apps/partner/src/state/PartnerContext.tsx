/**
 * Partner App State Management Context (Task T4.1; BP §10, §13, §22; D-002, D-004, D-018).
 */
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Locale } from '@kaamkaro/i18n';
import type {
  DocumentItem,
  DocumentType,
  OnboardingMode,
  PartnerProfile,
  ProviderType,
  RegStep,
  ScreenId,
  ScreenStateMode,
  VerificationLevel,
} from '../types';

interface PartnerContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  currentScreen: ScreenId;
  setCurrentScreen: (screen: ScreenId) => void;
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

const PartnerContext = createContext<PartnerContextValue | null>(null);

export function PartnerProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ur');
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('P01');
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

  const [screenStates, setScreenStates] = useState<Record<ScreenId, ScreenStateMode>>({
    P01: 'empty',
    P02: 'empty',
    P03: 'empty',
    P04: 'empty',
  });

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
      setCurrentScreen('P03');
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
    setCurrentScreen('P03');
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

    setDocuments((prev) =>
      prev.map((doc) => ({
        ...doc,
        status: doc.status === 'UPLOADED' ? 'UNDER_REVIEW' : doc.status,
      })),
    );

    if (profile) {
      setProfile({ ...profile, verificationSubmitted: true });
    }

    setScreenState('P03', 'success');
    setCurrentScreen('P04');
    return true;
  };

  const resetToStart = () => {
    setCurrentScreen('P01');
    setOnboardingMode('register');
    setRegStep('phone');
    setPhone('');
    setOtp('');
    setFullName('');
    setProviderType('SOLO');
    setBusinessName('');
    setEmail('');
    setProfile(null);
    setDocuments(INITIAL_DOCS);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      currentScreen,
      setCurrentScreen,
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
    }),
    [
      locale,
      currentScreen,
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
    ],
  );

  return <PartnerContext.Provider value={value}>{children}</PartnerContext.Provider>;
}

export function usePartner(): PartnerContextValue {
  const ctx = useContext(PartnerContext);
  if (!ctx) {
    throw new Error('usePartner must be used within a PartnerProvider');
  }
  return ctx;
}
