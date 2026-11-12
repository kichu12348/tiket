import { useState, useCallback, useMemo, useEffect } from "react";
import React from "react";
import { toast } from "sonner";
import {
  getFormFields,
  createFormField,
  updateFormField,
  deleteFormField,
  deleteFormPage,
} from "@/api/forms";
import type { FormField } from "@/types/form";
import type { LocalField, StandardField, StandardFieldStatus } from "../types";
import {
  serverToLocal,
  getPagesFromFields,
  buildOptionsPayload,
  isChoiceField,
} from "../functions/formHelpers";
import { User, Mail, Phone } from "lucide-react";

export function useFormData(eventId?: string) {
  const [customFields, setCustomFields] = useState<LocalField[]>([]);
  const [standardFields, setStandardFields] = useState<StandardField[]>([
    {
      name: "name",
      label: "Name",
      icon: <User size={16} />,
      status: "Required",
      page: 1,
    },
    {
      name: "email",
      label: "Email",
      icon: <Mail size={16} />,
      status: "Required",
      page: 1,
    },
    {
      name: "phone",
      label: "Phone",
      icon: <Phone size={16} />,
      status: "Off",
      page: 1,
    },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFields = useCallback(async () => {
    if (!eventId) return;
    return getFormFields(eventId)
      .then(async (data) => {
        const custom: LocalField[] = [];
        const stdMap = new Map<string, FormField>();

        data.forEach((f) => {
          if (["name", "email", "phone"].includes(f.name) && (f.page === 0 || f.page === 1)) {
            stdMap.set(f.name, f);
          } else {
            custom.push(serverToLocal(f));
          }
        });

        custom.sort((a, b) => a.sortOrder - b.sortOrder);

        // Preserve editing state during refresh
        setCustomFields((prev) => {
          return custom.map((newField) => {
            const oldField = prev.find((p) => p.serverId === newField.serverId);
            if (oldField?.isEditing) return { ...newField, isEditing: true };
            return newField;
          });
        });

        setStandardFields((prev) =>
          prev.map((std) => {
            const dbField = stdMap.get(std.name);
            if (std.name === "name" || std.name === "email") {
              return {
                ...std,
                serverId: dbField?.id,
                status: "Required",
                page: 1,
              };
            }
            if (!dbField) return { ...std, serverId: undefined, status: "Off", page: 1 };
            return {
              ...std,
              serverId: dbField.id,
              status: dbField.isRequired ? "Required" : "Optional",
              page: 1,
            };
          }),
        );
      })
      .catch((error: unknown) => {
        console.error("Failed to fetch form fields", error);
        toast.error("Failed to load form fields.");
      });
  }, [eventId]);

  useEffect(() => {
    refreshFields().finally(() => setIsLoading(false));
  }, [refreshFields]);

  const toggleInlineEdit = (localId: string, isEditing?: boolean) => {
    setCustomFields((prev) =>
      prev.map((f) =>
        f.localId === localId
          ? { ...f, isEditing: isEditing !== undefined ? isEditing : !f.isEditing }
          : f,
      ),
    );
  };

  const updateStandardField = async (
    name: string,
    status: StandardFieldStatus,
  ) => {
    if (!eventId) return;
    const std = standardFields.find((f) => f.name === name);
    if (!std) return;

    if (name === "name" || name === "email") {
      toast.error("Name and Email are required Page 1 attendee fields.");
      return;
    }

    try {
      if (status === "Off") {
        if (std.serverId) await deleteFormField(eventId, std.serverId);
      } else {
        const isReq = status === "Required";
        if (!std.serverId) {
          await createFormField(eventId, {
            name: std.name,
            label: std.label,
            fieldType: "phone",
            isRequired: isReq,
            page: 1,
            sortOrder: 0,
          });
        } else {
          await updateFormField(eventId, std.serverId, { isRequired: isReq, page: 1 });
        }
      }
      await refreshFields();
      toast.success(`${std.label} updated.`);
    } catch {
      toast.error("Failed to update field.");
    }
  };

  const saveCustomField = async (
    fieldData: Omit<LocalField, "isEditing" | "localId">,
    isEdit: boolean,
    localId?: string,
    activePage?: number,
  ) => {
    if (!eventId) return;

    const isChoice = isChoiceField(fieldData.fieldType);
    const isMulti =
      fieldData.fieldType === "multi_select" && fieldData.isMulti !== false;

    if (isChoice) {
      const validChoices = (fieldData.options || []).map((o) => o.trim()).filter(Boolean);
      if (validChoices.length === 0) {
        toast.error("At least one option is required.");
        return;
      }
    }

    const finalOptions = buildOptionsPayload(
      fieldData.fieldType,
      fieldData.options,
      fieldData.minOptions,
      fieldData.maxOptions,
      fieldData.allowCustom,
      fieldData.isMulti,
    );

    if (!isEdit) {
      const tempId = crypto.randomUUID();
      const targetPage = activePage || 1;
      const pageFields = customFields.filter((f) => f.page === targetPage);
      const maxSort = pageFields.reduce(
        (max, f) => Math.max(max, f.sortOrder),
        -1,
      );

      const newField: LocalField = {
        ...fieldData,
        localId: tempId,
        sortOrder: maxSort + 1,
        page: targetPage,
        options: isChoice ? (fieldData.options || []) : null,
        allowCustom: isChoice ? fieldData.allowCustom : false,
        isMulti: fieldData.fieldType === "multi_select" ? fieldData.isMulti : undefined,
        minOptions: isMulti ? (fieldData.minOptions ?? null) : null,
        maxOptions: isMulti ? (fieldData.maxOptions ?? null) : null,
      };

      setCustomFields((prev) => [...prev, newField]);

      try {
        const created = await createFormField(eventId, {
          name: newField.name,
          label: newField.label,
          fieldType: newField.fieldType,
          isRequired: newField.isRequired,
          options: finalOptions,
          sortOrder: newField.sortOrder,
          page: newField.page,
        });
        setCustomFields((prev) =>
          prev.map((f) =>
            f.localId === tempId ? { ...f, serverId: created.id } : f,
          ),
        );
      } catch (err) {
        toast.error("Failed to add question.");
        setCustomFields((prev) => prev.filter((f) => f.localId !== tempId));
        throw err;
      }
    } else if (isEdit && localId) {
      const originalField = customFields.find((f) => f.localId === localId);
      if (!originalField) return;

      const updatedField: LocalField = {
        ...originalField,
        ...fieldData,
        options: isChoice ? (fieldData.options || []) : null,
        allowCustom: isChoice ? fieldData.allowCustom : false,
        isMulti: fieldData.fieldType === "multi_select" ? fieldData.isMulti : undefined,
        minOptions: isMulti ? (fieldData.minOptions ?? null) : null,
        maxOptions: isMulti ? (fieldData.maxOptions ?? null) : null,
      };

      setCustomFields((prev) =>
        prev.map((f) => (f.localId === localId ? updatedField : f)),
      );

      if (updatedField.serverId) {
        try {
          await updateFormField(eventId, updatedField.serverId, {
            name: updatedField.name,
            label: updatedField.label,
            fieldType: updatedField.fieldType,
            isRequired: updatedField.isRequired,
            options: finalOptions,
            sortOrder: updatedField.sortOrder,
            page: updatedField.page,
          });
        } catch (err) {
          toast.error("Failed to save changes.");
          setCustomFields((prev) =>
            prev.map((f) => (f.localId === localId ? originalField : f)),
          );
          throw err;
        }
      }
    }
  };

  const deleteCustomField = async (id: string) => {
    if (!eventId) {
      toast.error("Event not found.");
      return;
    }

    const field = customFields.find((f) => f.localId === id);
    if (!field) {
      toast.error("Question not found.");
      return;
    }

    setCustomFields((prev) => prev.filter((f) => f.localId !== id));

    if (field.serverId) {
      try {
        const { message } = await deleteFormField(eventId, field.serverId);
        toast.success(message);
      } catch (err) {
        toast.error("Failed to delete question.");
        setCustomFields((prev) => [...prev, field]);
        throw err;
      }
    }
  };

  const reorderCustomFields = async (
    updatedFields: LocalField[],
    originalFields: LocalField[],
    activePage: number,
  ) => {
    if (!eventId) return;

    setCustomFields((prev) => {
      const otherPages = prev.filter((f) => f.page !== activePage);
      return [...otherPages, ...updatedFields];
    });

    try {
      for (const item of updatedFields) {
        const original = originalFields.find((f) => f.localId === item.localId);
        if (
          original &&
          original.sortOrder !== item.sortOrder &&
          item.serverId
        ) {
          await updateFormField(eventId, item.serverId, {
            sortOrder: item.sortOrder,
          });
        }
      }
    } catch {
      toast.error("Failed to save reorder. Reverting.");
      await refreshFields();
    }
  };

  const deletePageFromDB = async (pageNum: number) => {
    if (!eventId) return;
    try {
      await deleteFormPage(eventId, pageNum);
      setCustomFields((prev) =>
        prev
          .filter((f) => f.page !== pageNum)
          .map((f) => (f.page > pageNum ? { ...f, page: f.page - 1 } : f)),
      );
      await refreshFields();
    } catch (e) {
      toast.error("Failed to delete page.");
      throw e;
    }
  };

  const pages = useMemo(() => getPagesFromFields(customFields), [customFields]);

  return {
    customFields,
    standardFields,
    isLoading,
    pages,
    refreshFields,
    toggleInlineEdit,
    updateStandardField,
    saveCustomField,
    deleteCustomField,
    reorderCustomFields,
    deletePageFromDB,
  };
}
