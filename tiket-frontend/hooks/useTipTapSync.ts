import { useState, useEffect, useCallback, useMemo } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import type { StyleObject } from "@/types/email";

export interface TipTapSyncSnapshot {
  activeBlockType: string;
  activeContainerAttrs: Record<string, unknown> | null;
  activeContainerPos: number | null;
  activeNodeAttrs: Record<string, unknown>;
  activeNodePos: number | null;
  activeTextStyle: StyleObject;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  activeLinkHref: string;
}

function computeSnapshot(editor: Editor | null): TipTapSyncSnapshot {
  if (!editor || editor.isDestroyed) {
    return {
      activeBlockType: "paragraph",
      activeContainerAttrs: null,
      activeContainerPos: null,
      activeNodeAttrs: {},
      activeNodePos: null,
      activeTextStyle: {},
      isBold: false,
      isItalic: false,
      isUnderline: false,
      activeLinkHref: "",
    };
  }

  const { state } = editor;
  const { selection } = state;
  const { $from } = selection;

  // 1. Resolve active block and container
  let activeType = "paragraph";
  let nodeAttrs: Record<string, unknown> = {};
  let nodePos: number | null = null;
  let containerAttrs: Record<string, unknown> | null = null;
  let containerPos: number | null = null;

  if (selection instanceof NodeSelection) {
    activeType = selection.node.type.name;
    nodeAttrs = selection.node.attrs || {};
    nodePos = selection.from;
  } else {
    // Find deepest block node
    for (let depth = $from.depth; depth > 0; depth--) {
      const node = $from.node(depth);
      const typeName = node.type.name;

      if (typeName === "containerBlock" || typeName === "container") {
        if (!containerAttrs) {
          containerAttrs = node.attrs;
          containerPos = $from.before(depth);
        }
      } else if (!nodePos && node.isBlock) {
        activeType = typeName;
        nodeAttrs = node.attrs;
        nodePos = $from.before(depth);
      }
    }

    if (!nodePos && $from.parent.isBlock) {
      activeType = $from.parent.type.name;
      nodeAttrs = $from.parent.attrs;
      nodePos = $from.before();
    }
  }

  // 2. Resolve text styles & marks with block-level and type-aware fallbacks
  const textStyleAttrs = editor.getAttributes("textStyle") || {};
  const highlightAttrs = editor.getAttributes("highlight") || {};
  const highlightBg =
    ((highlightAttrs.style as StyleObject)?.backgroundColor as string) ||
    (highlightAttrs.color as string) ||
    undefined;
  const nodeStyle = (nodeAttrs.style && typeof nodeAttrs.style === "object"
    ? nodeAttrs.style
    : {}) as StyleObject;

  const defaultFontSize =
    activeType === "heading"
      ? nodeAttrs.level === 1
        ? "24px"
        : nodeAttrs.level === 2
          ? "20px"
          : "18px"
      : activeType === "buttonBlock"
        ? (nodeStyle.fontSize as string) || "15px"
        : "15px";

  const resolvedFontSize =
    (textStyleAttrs.fontSize as string) ||
    ((textStyleAttrs.style as StyleObject)?.fontSize as string) ||
    (nodeStyle.fontSize as string) ||
    defaultFontSize;

  const resolvedFontFamily =
    (textStyleAttrs.fontFamily as string) ||
    ((textStyleAttrs.style as StyleObject)?.fontFamily as string) ||
    (nodeStyle.fontFamily as string) ||
    undefined;

  const resolvedFontWeight =
    (textStyleAttrs.fontWeight as string) ||
    ((textStyleAttrs.style as StyleObject)?.fontWeight as string) ||
    (nodeStyle.fontWeight as string) ||
    (activeType === "heading" ? "700" : undefined);

  const textStyle: StyleObject = {
    fontFamily: resolvedFontFamily,
    fontSize: resolvedFontSize,
    fontWeight: resolvedFontWeight,
    color: textStyleAttrs.color || (nodeStyle.color as string) || undefined,
    backgroundColor:
      highlightBg ||
      textStyleAttrs.backgroundColor ||
      (nodeStyle.backgroundColor as string) ||
      undefined,
    ...nodeStyle,
    ...((textStyleAttrs.style as StyleObject) || {}),
    ...(resolvedFontSize ? { fontSize: resolvedFontSize } : {}),
    ...(resolvedFontFamily ? { fontFamily: resolvedFontFamily } : {}),
  };

  const isBold =
    String(textStyle.fontWeight || textStyleAttrs.fontWeight) === "700" ||
    Number(textStyle.fontWeight || textStyleAttrs.fontWeight) >= 700 ||
    editor.isActive("bold");

  const isItalic = editor.isActive("italic");
  const isUnderline = editor.isActive("underline");
  const linkAttrs = editor.getAttributes("link") || {};
  const activeLinkHref = linkAttrs.href || "";

  return {
    activeBlockType: activeType,
    activeContainerAttrs: containerAttrs,
    activeContainerPos: containerPos,
    activeNodeAttrs: nodeAttrs,
    activeNodePos: nodePos,
    activeTextStyle: textStyle,
    isBold,
    isItalic,
    isUnderline,
    activeLinkHref,
  };
}

export function useTipTapSync(editor: Editor | null) {
  const [snapshot, setSnapshot] = useState<TipTapSyncSnapshot>(() =>
    computeSnapshot(editor),
  );

  const refreshSnapshot = useCallback(() => {
    setSnapshot(computeSnapshot(editor));
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      setSnapshot(computeSnapshot(editor));
    };

    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);
    editor.on("update", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
      editor.off("update", handleUpdate);
    };
  }, [editor]);

  // Focus-safe mutator: updates style on active block or specified node type without stealing input focus
  const updateBlockStyleLive = useCallback(
    (stylePatch: StyleObject, targetNodeType?: string) => {
      if (!editor || editor.isDestroyed) return;

      const { state, view } = editor;
      const { selection } = state;
      const { tr } = state;

      // Check if current NodeSelection matches
      if (selection instanceof NodeSelection) {
        if (!targetNodeType || selection.node.type.name === targetNodeType) {
          const currentAttrs = selection.node.attrs;
          const mergedStyle = {
            ...((currentAttrs.style as StyleObject) || {}),
            ...stylePatch,
          };
          tr.setNodeMarkup(selection.from, undefined, {
            ...currentAttrs,
            style: mergedStyle,
          });
          view.dispatch(tr);
          return;
        }
      }

      // Look up tree for matching node
      const { $from } = selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (!targetNodeType || node.type.name === targetNodeType) {
          const pos = $from.before(depth);
          const currentAttrs = node.attrs;
          const mergedStyle = {
            ...((currentAttrs.style as StyleObject) || {}),
            ...stylePatch,
          };
          tr.setNodeMarkup(pos, undefined, {
            ...currentAttrs,
            style: mergedStyle,
          });
          view.dispatch(tr);
          return;
        }
      }
    },
    [editor],
  );

  // Focus-safe mutator: updates attributes without stealing input focus
  const updateBlockAttrsLive = useCallback(
    (attrsPatch: Record<string, unknown>, targetNodeType?: string) => {
      if (!editor || editor.isDestroyed) return;

      const { state, view } = editor;
      const { selection } = state;
      const { tr } = state;

      if (selection instanceof NodeSelection) {
        if (!targetNodeType || selection.node.type.name === targetNodeType) {
          tr.setNodeMarkup(selection.from, undefined, {
            ...selection.node.attrs,
            ...attrsPatch,
          });
          view.dispatch(tr);
          return;
        }
      }

      const { $from } = selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (!targetNodeType || node.type.name === targetNodeType) {
          const pos = $from.before(depth);
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            ...attrsPatch,
          });
          view.dispatch(tr);
          return;
        }
      }
    },
    [editor],
  );

  // Updates inline text style (or focuses editor if discrete button click)
  const updateInlineStyleLive = useCallback(
    (stylePatch: StyleObject, refocusEditor = false) => {
      if (!editor || editor.isDestroyed) return;

      const currentAttrs = editor.getAttributes("textStyle") || {};
      const currentStyle = (currentAttrs.style as StyleObject) || {};
      const mergedStyle = { ...currentStyle, ...stylePatch };

      const chain = editor.chain();
      if (refocusEditor) {
        chain.focus();
      }

      chain
        .setMark("textStyle", {
          ...stylePatch,
          style: mergedStyle,
        })
        .run();

      if (editor.state.selection.empty) {
        updateBlockStyleLive(stylePatch);
      }
    },
    [editor, updateBlockStyleLive],
  );

  // Toggles bold weight between 700 and 400
  const toggleBoldUnified = useCallback(() => {
    const nextWeight = snapshot.isBold ? "400" : "700";
    updateInlineStyleLive({ fontWeight: nextWeight }, true);
  }, [snapshot.isBold, updateInlineStyleLive]);

  return useMemo(
    () => ({
      ...snapshot,
      updateBlockStyleLive,
      updateBlockAttrsLive,
      updateInlineStyleLive,
      toggleBoldUnified,
      refreshSnapshot,
    }),
    [
      snapshot,
      updateBlockStyleLive,
      updateBlockAttrsLive,
      updateInlineStyleLive,
      toggleBoldUnified,
      refreshSnapshot,
    ],
  );
}
