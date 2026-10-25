/**
 * Intake AI Client & Fake Implementation (T3.3, owner A07; ARCH §4 M7, §6.2, §18; BP §56, §67, §77, §79).
 * Provides closed schema interpretation, intent mapping, confidence calculation, time/place extraction,
 * and supplier summary generation across English, Urdu, and Roman Urdu.
 */

import { Injectable } from '@nestjs/common';
import {
  AiSafetyState,
  AppLanguage,
  checkContentModeration,
  ClosedAiInterpretation,
  InterpretIntentInput,
  RequestedTimeHint,
} from './intake.types';

export const INTAKE_AI_CLIENT = Symbol('INTAKE_AI_CLIENT');

export interface IntakeAiClient {
  interpret(input: InterpretIntentInput): Promise<ClosedAiInterpretation>;
}

@Injectable()
export class FakeIntakeAiClient implements IntakeAiClient {
  readonly modelVersion = 'fake-intake-ai-v1';
  readonly serviceVersion = 'intake-prompts-v0.1.0';

  async interpret(input: InterpretIntentInput): Promise<ClosedAiInterpretation> {
    const rawText = input.intentText.trim();
    const lower = rawText.toLowerCase();
    const lang = input.appLanguage ?? AppLanguage.UR;

    // 1. Content Moderation check (REQ-AI-009, ARCH §0.3)
    const moderation = checkContentModeration(rawText);
    if (!moderation.allowed) {
      return {
        serviceId: null,
        serviceName: null,
        serviceFamily: null,
        intentSummary: 'Blocked due to policy violation or excluded category',
        supplierSummary: null,
        summaryLanguage: lang,
        confidence: 0,
        needsClarification: true,
        clarifyingQuestions: [
          'This service request cannot be processed as it violates platform policy or falls outside household services.',
        ],
        timeHint: null,
        requestedWindowFrom: null,
        requestedWindowTo: null,
        locationHint: null,
        isEmergency: false,
        safetyState: AiSafetyState.BLOCKED,
        modelVersion: this.modelVersion,
        serviceVersion: this.serviceVersion,
      };
    }

    // 2. Extract Location Hint (e.g. DHA Phase 4, Gulberg, Johar Town, Model Town)
    const locationHint = this.extractLocationHint(rawText);

    // 3. Extract Time Hint & Windows (e.g. kal shaam, aaj 7 baje ke baad, foran)
    const { timeHint, windowFrom, windowTo } = this.extractTimeWindow(rawText);

    // 4. Intent & Service Family Detection
    const serviceMatch = this.detectService(lower);

    // 5. Emergency detection
    const isEmergency =
      lower.includes('emergency') ||
      lower.includes('foran') ||
      lower.includes('urgent') ||
      lower.includes('aag') ||
      lower.includes('sparking') ||
      lower.includes('سیلاب');

    if (!serviceMatch) {
      // Ambiguous / Vague Intent -> Low confidence fallback (REQ-AI-003, REQ-AI-006)
      return {
        serviceId: null,
        serviceName: null,
        serviceFamily: null,
        intentSummary: rawText.slice(0, 100),
        supplierSummary: null,
        summaryLanguage: lang,
        confidence: 0.4, // kk-allow-literal: < 0.6 fallback
        needsClarification: true,
        clarifyingQuestions: [
          lang === AppLanguage.UR
            ? 'آپ کو کس چیز کی سروس چاہیے؟ (مثلاً اے سی، پلمبنگ، یا الیکٹریشن)'
            : 'What type of service do you need? (e.g., AC, Plumbing, or Electrician)',
          lang === AppLanguage.UR
            ? 'کیا آپ مسئلہ تھوڑا مزید واضح کر سکتے ہیں؟'
            : 'Could you please describe the problem in more detail?',
        ],
        timeHint,
        requestedWindowFrom: windowFrom,
        requestedWindowTo: windowTo,
        locationHint,
        isEmergency,
        safetyState: AiSafetyState.ALLOWED,
        modelVersion: this.modelVersion,
        serviceVersion: this.serviceVersion,
      };
    }

    // High confidence matched service
    const supplierSummary =
      lang === AppLanguage.UR ? serviceMatch.summaryUr : serviceMatch.summaryEn;

    return {
      serviceId: serviceMatch.serviceIdHint ?? null,
      serviceName: serviceMatch.serviceName,
      serviceFamily: serviceMatch.serviceFamily,
      intentSummary: serviceMatch.intentSummary,
      supplierSummary,
      summaryLanguage: lang,
      confidence: serviceMatch.confidence,
      needsClarification: false,
      clarifyingQuestions: [],
      timeHint,
      requestedWindowFrom: windowFrom,
      requestedWindowTo: windowTo,
      locationHint,
      isEmergency,
      safetyState: AiSafetyState.ALLOWED,
      modelVersion: this.modelVersion,
      serviceVersion: this.serviceVersion,
    };
  }

  private extractLocationHint(text: string): string | null {
    const locations = [
      'dha phase 1',
      'dha phase 2',
      'dha phase 3',
      'dha phase 4',
      'dha phase 5',
      'dha phase 6',
      'dha',
      'gulberg',
      'model town',
      'johar town',
      'bahria town',
      'cantt',
      'faisal town',
      'wapda town',
      'garden town',
      'allama iqbal town',
    ];

    const lower = text.toLowerCase();
    for (const loc of locations) {
      if (lower.includes(loc)) {
        // Return title-cased match
        return loc
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }
    }
    return null;
  }

  private extractTimeWindow(text: string): {
    timeHint: RequestedTimeHint | null;
    windowFrom: Date | null;
    windowTo: Date | null;
  } {
    const lower = text.toLowerCase();
    const now = new Date();

    if (lower.includes('kal shaam') || lower.includes('tomorrow evening')) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const from = new Date(tomorrow);
      from.setHours(17, 0, 0, 0);
      const to = new Date(tomorrow);
      to.setHours(21, 0, 0, 0);
      return { timeHint: RequestedTimeHint.LATER, windowFrom: from, windowTo: to };
    }

    if (lower.includes('kal subah') || lower.includes('tomorrow morning')) {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const from = new Date(tomorrow);
      from.setHours(9, 0, 0, 0);
      const to = new Date(tomorrow);
      to.setHours(13, 0, 0, 0);
      return { timeHint: RequestedTimeHint.LATER, windowFrom: from, windowTo: to };
    }

    if (lower.includes('7 baje ke baad') || lower.includes('after 7')) {
      const from = new Date(now);
      from.setHours(19, 0, 0, 0);
      const to = new Date(now);
      to.setHours(22, 0, 0, 0);
      return { timeHint: RequestedTimeHint.TODAY, windowFrom: from, windowTo: to };
    }

    if (lower.includes('aaj shaam') || lower.includes('today evening')) {
      const from = new Date(now);
      from.setHours(17, 0, 0, 0);
      const to = new Date(now);
      to.setHours(21, 0, 0, 0);
      return { timeHint: RequestedTimeHint.TODAY, windowFrom: from, windowTo: to };
    }

    if (
      lower.includes('foran') ||
      lower.includes('urgent') ||
      lower.includes('emergency') ||
      lower.includes('right now') ||
      lower.includes('abhi')
    ) {
      const from = new Date(now);
      const to = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      return { timeHint: RequestedTimeHint.NOW, windowFrom: from, windowTo: to };
    }

    return { timeHint: null, windowFrom: null, windowTo: null };
  }

  private detectService(lower: string): {
    serviceName: string;
    serviceFamily: string;
    serviceIdHint?: string;
    intentSummary: string;
    summaryEn: string;
    summaryUr: string;
    confidence: number;
  } | null {
    // 1. AC / Cooling (BP §56.1 "Mera AC thanda nahi kar raha")
    if (
      lower.includes('ac thanda') ||
      lower.includes('ac cooling') ||
      lower.includes('ac general service') ||
      lower.includes('air conditioner') ||
      lower.includes('ac repair') ||
      lower.includes('ac leak') ||
      (lower.includes('ac') && lower.includes('kharab'))
    ) {
      return {
        serviceName: 'AC cooling issue diagnosis',
        serviceFamily: 'AC, Cooling & Heating',
        intentSummary: 'AC cooling failure and repair',
        summaryEn: 'AC not cooling properly; inspection and repair required.',
        summaryUr: 'اے سی ٹھنڈا نہیں کر رہا، معائنہ اور مرمت درکار ہے۔',
        confidence: 0.92,
      };
    }

    // 2. Electrician / Electrical (BP §56.1 "Kal shaam electrician chahiye")
    if (
      lower.includes('electrician') ||
      lower.includes('bijli') ||
      lower.includes('switch') ||
      lower.includes('socket') ||
      lower.includes('short circuit') ||
      lower.includes('breaker') ||
      lower.includes('wiring') ||
      lower.includes('fuse')
    ) {
      return {
        serviceName: 'Short-circuit diagnosis',
        serviceFamily: 'Electrical & Power',
        intentSummary: 'Electrical power and wiring inspection',
        summaryEn: 'Electrician needed for electrical checkup and repair.',
        summaryUr: 'الیکٹریشن کی ضرورت ہے، بجلی کی وائرنگ اور فالٹ کی جانچ۔',
        confidence: 0.88,
      };
    }

    // 3. Plumbing & Water / Geyser (BP §56.1 "Mera geyser leak kar raha hai…")
    if (
      lower.includes('geyser') ||
      lower.includes('pipe leakage') ||
      lower.includes('water leak') ||
      lower.includes('tap repair') ||
      lower.includes('nal') ||
      lower.includes('plumber') ||
      lower.includes('drain blockage') ||
      lower.includes('water tank') ||
      lower.includes('water pump')
    ) {
      return {
        serviceName: 'Pipe leakage repair',
        serviceFamily: 'Plumbing & Water',
        intentSummary: 'Water pipe and geyser leak repair',
        summaryEn: 'Water leak detected; plumbing inspection and leak repair required.',
        summaryUr: 'پانی کی لیکیج کا مسئلہ، پلمبنگ اور لیکیج کی مرمت درکار ہے۔',
        confidence: 0.94,
      };
    }

    // 4. Home Appliances
    if (
      lower.includes('washing machine') ||
      lower.includes('fridge') ||
      lower.includes('refrigerator') ||
      lower.includes('microwave') ||
      lower.includes('oven')
    ) {
      return {
        serviceName: 'Refrigerator cooling diagnosis',
        serviceFamily: 'Home Appliances',
        intentSummary: 'Home appliance fault diagnosis',
        summaryEn: 'Home appliance issue reported; diagnosis and repair needed.',
        summaryUr: 'گھریلو آلات کی خرابی، معائنہ اور مرمت درکار ہے۔',
        confidence: 0.86,
      };
    }

    // 5. Carpentry & Furniture
    if (
      lower.includes('carpenter') ||
      lower.includes('darwaza') ||
      lower.includes('door lock') ||
      lower.includes('furniture')
    ) {
      return {
        serviceName: 'Door lock repair',
        serviceFamily: 'Carpentry & Furniture',
        intentSummary: 'Carpentry and door maintenance',
        summaryEn: 'Carpentry service needed for door/furniture repair.',
        summaryUr: 'کارپینٹر کی ضرورت ہے، دروازے اور فرنیچر کی مرمت۔',
        confidence: 0.85,
      };
    }

    // Vague / ambiguous
    return null;
  }
}
