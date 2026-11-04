import { toPng } from "html-to-image";
import qrcode from "qrcode-generator";
import type {
  TicketPassData,
  TicketPassTemplate,
  TicketCanvasConfig,
} from "@/types/ticket";
import { getElementText } from "../components/CustomTicketCanvas";

async function exportCustomTicketToCanvas(
  template: TicketPassTemplate,
  pass: TicketPassData,
): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;

  let config: TicketCanvasConfig = {
    canvasWidth: 600,
    canvasHeight: 300,
    elements: [],
  };

  if (template.elementsJson) {
    if (typeof template.elementsJson === "string") {
      try {
        config = JSON.parse(template.elementsJson) as TicketCanvasConfig;
      } catch {
        // Fallback default
      }
    } else {
      config = template.elementsJson as TicketCanvasConfig;
    }
  }

  const canvasWidth = config.canvasWidth || 600;
  const canvasHeight = config.canvasHeight || 300;
  const elements = config.elements || [];

  const canvas = document.createElement("canvas");
  const pixelRatio = 2; // Crisp 2x native resolution
  canvas.width = canvasWidth * pixelRatio;
  canvas.height = canvasHeight * pixelRatio;

  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;

  ctx.scale(pixelRatio, pixelRatio);

  // 1. Draw background image
  if (template.backgroundImageUrl) {
    try {
      const bgImg = new Image();
      bgImg.crossOrigin = "anonymous";
      await new Promise<void>((resolve) => {
        bgImg.onload = () => resolve();
        bgImg.onerror = () => resolve();
        bgImg.src = template.backgroundImageUrl!;
      });
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        ctx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
      } else {
        ctx.fillStyle = "#1c1c1e";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }
    } catch {
      ctx.fillStyle = "#1c1c1e";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  } else {
    ctx.fillStyle = "#1c1c1e";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // 2. Draw elements
  for (const el of elements) {
    const rotation = el.rotation ?? 0;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);

    if (el.type === "qr") {
      const isScannable = pass.status === "active" || pass.status === "used";
      if (isScannable && pass.qrCode) {
        try {
          const qr = qrcode(0, "M");
          qr.addData(pass.qrCode);
          qr.make();
          const qrDataUrl = qr.createDataURL(4, 0);
          const qrImg = new Image();
          await new Promise<void>((resolve) => {
            qrImg.onload = () => resolve();
            qrImg.onerror = () => resolve();
            qrImg.src = qrDataUrl;
          });
          if (qrImg.complete && qrImg.naturalWidth > 0) {
            ctx.drawImage(qrImg, el.x, el.y, el.width, el.height);
          }
        } catch {
          ctx.fillStyle = el.style?.qrBgColor || "#ffffff";
          ctx.fillRect(el.x, el.y, el.width, el.height);
        }
      } else {
        ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
        ctx.fillRect(el.x, el.y, el.width, el.height);
        ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(el.x, el.y, el.width, el.height);

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          pass.status === "pending_approval" ? "PENDING APPROVAL" : "LOCKED",
          cx,
          cy,
        );
      }
    } else {
      const text = getElementText(el, pass);
      if (text) {
        const baseFontSize = el.style?.fontSize ?? 16;
        const fontFamily = el.style?.fontFamily || "sans-serif";
        const fontWeight = el.style?.fontWeight || "normal";
        const isVariable = el.type === "variable" || Boolean(el.variableKey);
        const autoFit = el.style?.autoFitText ?? (isVariable ? true : false);

        let finalFontSize = baseFontSize;
        ctx.font = `${fontWeight} ${baseFontSize}px ${fontFamily}`;
        if (autoFit && el.width > 0) {
          const measured = ctx.measureText(text).width;
          if (measured > el.width) {
            const scale = el.width / measured;
            finalFontSize = Math.max(8, Math.floor(baseFontSize * scale));
          }
        }

        ctx.font = `${fontWeight} ${finalFontSize}px ${fontFamily}`;
        ctx.fillStyle = el.style?.color || "#ffffff";
        ctx.textBaseline = "middle";

        let textX = el.x;
        if (el.style?.textAlign === "center") {
          ctx.textAlign = "center";
          textX = cx;
        } else if (el.style?.textAlign === "right") {
          ctx.textAlign = "right";
          textX = el.x + el.width;
        } else {
          ctx.textAlign = "left";
          textX = el.x;
        }

        ctx.fillText(text, textX, cy);
      }
    }

    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}

export const downloadImg = async (
  node: HTMLDivElement | null,
  name: string,
  template?: TicketPassTemplate | null,
  pass?: TicketPassData | null,
): Promise<string | undefined> => {
  if (typeof window === "undefined") return;

  try {
    let dataUrl: string | undefined;

    if (template && template.backgroundImageUrl && pass) {
      try {
        dataUrl = await exportCustomTicketToCanvas(template, pass);
      } catch (canvasErr) {
        console.warn(
          "Offscreen canvas export failed, falling back to DOM capture:",
          canvasErr,
        );
      }
    }

    if (!dataUrl && node) {
      dataUrl = await toPng(node, {
        quality: 1,
        pixelRatio: 2, // High resolution crisp output
        cacheBust: true,
        style: {
          transform: "scale(1)",
        },
      });
    }

    if (!dataUrl) return undefined;

    const sanitizedName = (name || "pass")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");
    const link = document.createElement("a");
    link.download = `${sanitizedName}-tiket.png`;
    link.href = dataUrl;
    link.click();
    return dataUrl;
  } catch (err) {
    console.error("Failed to generate ticket image:", err);
    return undefined;
  }
};

export const downloadImage = downloadImg;
