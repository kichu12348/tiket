import { create } from "zustand";
import type {
  EmailTemplate,
  EmailTemplateType,
  EmailDocumentJSON,
  EmailNodeJSON,
  AvailableVariables,
  EmailLog,
  EmailAnalytics,
  SmtpConfigSummary,
} from "@/types/email";
import { createDefaultEmailDocument } from "@/utils/emailJsonCompiler";

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

  // Active Draft state
  draftName: string;
  draftSubject: string;
  draftDocument: EmailDocumentJSON;
  draftIsActive: boolean;
  isDirty: boolean;

  // Editor View Controls
  canvasMode: "edit" | "preview" | "json";
  deviceMode: "desktop" | "mobile";
  activeTargetField: "subject" | "body";

  // Data & Metadata
  variables: AvailableVariables | null;
  samplePreviewData: Record<string, string>;
  logs: EmailLog[];
  analytics: EmailAnalytics | null;
  smtpStatus: SmtpConnectionState | null;
  activeTab: "editor" | "logs";

  // Loading Flags
  isLoading: boolean;
  isTemplateLoading: boolean;
  isSaving: boolean;
  isLogsLoading: boolean;
  error: string | null;

  // Actions
  setTemplates: (templates: EmailTemplate[]) => void;
  updateTemplateLocally: (
    templateId: string,
    updates: Partial<EmailTemplate>,
  ) => void;
  setActiveType: (type: EmailTemplateType) => void;
  setSelectedTemplateId: (id: string | null) => void;
  setLoadedTemplate: (template: EmailTemplate) => void;

  // Draft Mutations
  updateDraftName: (name: string) => void;
  updateDraftSubject: (subject: string) => void;
  updateDraftDoc: (doc: EmailNodeJSON) => void;
  updateDraftIsActive: (isActive: boolean) => void;
  markClean: () => void;

  // Controls & Metadata
  setCanvasMode: (mode: "edit" | "preview" | "json") => void;
  setDeviceMode: (mode: "desktop" | "mobile") => void;
  setActiveTargetField: (field: "subject" | "body") => void;
  setVariables: (variables: AvailableVariables | null) => void;
  setSamplePreviewData: (data: Record<string, string>) => void;
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

const defaultDocument = createDefaultEmailDocument();

const initialState = {
  templates: [],
  activeType: "confirmation" as EmailTemplateType,
  selectedTemplateId: null,
  loadedTemplatesMap: {},

  draftName: "",
  draftSubject: "",
  draftDocument: defaultDocument,
  draftIsActive: true,
  isDirty: false,

  canvasMode: "edit" as const,
  deviceMode: "desktop" as const,
  activeTargetField: "body" as const,

  variables: null,
  samplePreviewData: {},
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

export const useEmailStore = create<EmailState>((set, get) => ({
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

  setSelectedTemplateId: (selectedTemplateId) =>
    set((state) => {
      if (!selectedTemplateId) {
        return { selectedTemplateId: null };
      }

      const existingLoaded = state.loadedTemplatesMap[selectedTemplateId];
      if (existingLoaded) {
        return {
          selectedTemplateId,
          draftName: existingLoaded.name,
          draftSubject: existingLoaded.subject || "",
          draftDocument: existingLoaded.body || createDefaultEmailDocument(),
          draftIsActive: existingLoaded.isActive,
          isDirty: false,
        };
      }

      return { selectedTemplateId };
    }),

  setLoadedTemplate: (template) =>
    set((state) => {
      const isSelected = state.selectedTemplateId === template.id;

      const loadedTemplatesMap = {
        ...state.loadedTemplatesMap,
        [template.id]: template,
      };

      if (isSelected) {
        return {
          loadedTemplatesMap,
          draftName: template.name,
          draftSubject: template.subject || "",
          draftDocument: template.body || createDefaultEmailDocument(),
          draftIsActive: template.isActive,
          isDirty: false,
        };
      }

      return { loadedTemplatesMap };
    }),

  updateDraftName: (draftName) => {
    set({ draftName, isDirty: true });
  },

  updateDraftSubject: (draftSubject) => {
    set({ draftSubject, isDirty: true });
  },

  updateDraftDoc: (doc) => {
    const { draftDocument } = get();
    const updatedDocument: EmailDocumentJSON = {
      ...draftDocument,
      version: 1,
      doc,
    };
    set({ draftDocument: updatedDocument, isDirty: true });
  },

  updateDraftIsActive: (draftIsActive) => {
    set({ draftIsActive, isDirty: true });
  },

  markClean: () => {
    set({ isDirty: false });
  },

  setCanvasMode: (canvasMode) => set({ canvasMode }),
  setDeviceMode: (deviceMode) => set({ deviceMode }),
  setActiveTargetField: (activeTargetField) => set({ activeTargetField }),
  setVariables: (variables) => {
    const sampleMap: Record<string, string> = {};
    if (variables) {
      const allVars = [
        ...variables.eventVariables,
        ...variables.attendeeVariables,
        ...variables.ticketVariables,
        ...variables.formVariables,
      ];
      for (const item of allVars) {
        sampleMap[item.key] = item.sample || `[${item.label}]`;
      }
    }
    set({ variables, samplePreviewData: sampleMap });
  },
  setSamplePreviewData: (samplePreviewData) => set({ samplePreviewData }),
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
