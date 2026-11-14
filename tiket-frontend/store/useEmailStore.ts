import { create } from "zustand";
import type {
  EmailTemplate,
  EmailTemplateType,
  AvailableVariables,
  EmailLog,
  EmailAnalytics,
  SmtpConfigSummary,
} from "@/types/email";

export interface SmtpConnectionState {
  custom: boolean;
  defaultProvider: string;
  config?: SmtpConfigSummary;
}

export interface EmailState {
  templates: EmailTemplate[];
  activeType: EmailTemplateType;
  selectedTemplateId: string | null;
  loadedTemplatesMap: Record<string, EmailTemplate>;
  variables: AvailableVariables | null;
  logs: EmailLog[];
  analytics: EmailAnalytics | null;
  smtpStatus: SmtpConnectionState | null;
  activeTab: "editor" | "logs";
  isLoading: boolean;
  isTemplateLoading: boolean;
  isSaving: boolean;
  isLogsLoading: boolean;
  error: string | null;

  // Actions (Pure state mutations & optimistic updates only - no API calls)
  setTemplates: (templates: EmailTemplate[]) => void;
  updateTemplateLocally: (
    templateId: string,
    updates: Partial<EmailTemplate>,
  ) => void;
  setActiveType: (type: EmailTemplateType) => void;
  setSelectedTemplateId: (id: string | null) => void;
  setLoadedTemplate: (template: EmailTemplate) => void;
  setVariables: (variables: AvailableVariables | null) => void;
  setLogsAndAnalytics: (
    logs: EmailLog[],
    analytics: EmailAnalytics | null,
  ) => void;
  setSmtpStatus: (status: SmtpConnectionState | null) => void;
  setActiveTab: (tab: "editor" | "logs") => void;
  setLoading: (isLoading: boolean) => void;
  setTemplateLoading: (isTemplateLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setLogsLoading: (isLogsLoading: boolean) => void;
  setError: (error: string | null) => void;
  resetStore: () => void;
}

const initialState = {
  templates: [],
  activeType: "confirmation" as EmailTemplateType,
  selectedTemplateId: null,
  loadedTemplatesMap: {},
  variables: null,
  logs: [],
  analytics: null,
  smtpStatus: null,
  activeTab: "editor" as const,
  isLoading: true,
  isTemplateLoading: false,
  isSaving: false,
  isLogsLoading: false,
  error: null,
};

export const useEmailStore = create<EmailState>((set) => ({
  ...initialState,

  setTemplates: (templates) => set({ templates }),

  updateTemplateLocally: (templateId, updates) =>
    set((state) => {
      const updatedTemplates = state.templates.map((tpl) =>
        tpl.id === templateId ? { ...tpl, ...updates } : tpl,
      );
      const existingLoaded = state.loadedTemplatesMap[templateId];
      const updatedMap = existingLoaded
        ? {
            ...state.loadedTemplatesMap,
            [templateId]: { ...existingLoaded, ...updates },
          }
        : state.loadedTemplatesMap;

      return {
        templates: updatedTemplates,
        loadedTemplatesMap: updatedMap,
      };
    }),

  setActiveType: (activeType) => set({ activeType }),

  setSelectedTemplateId: (selectedTemplateId) => set({ selectedTemplateId }),

  setLoadedTemplate: (template) =>
    set((state) => ({
      loadedTemplatesMap: {
        ...state.loadedTemplatesMap,
        [template.id]: template,
      },
      templates: state.templates.some((t) => t.id === template.id)
        ? state.templates.map((t) => (t.id === template.id ? template : t))
        : [...state.templates, template],
    })),

  setVariables: (variables) => set({ variables }),

  setLogsAndAnalytics: (logs, analytics) => set({ logs, analytics }),

  setSmtpStatus: (smtpStatus) => set({ smtpStatus }),

  setActiveTab: (activeTab) => set({ activeTab }),

  setLoading: (isLoading) => set({ isLoading }),

  setTemplateLoading: (isTemplateLoading) => set({ isTemplateLoading }),

  setSaving: (isSaving) => set({ isSaving }),

  setLogsLoading: (isLogsLoading) => set({ isLogsLoading }),

  setError: (error) => set({ error }),

  resetStore: () => set(initialState),
}));
