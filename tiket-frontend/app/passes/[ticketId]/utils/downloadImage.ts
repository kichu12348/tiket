import { toPng } from "html-to-image";

export const downloadImg = async (
  node: HTMLDivElement | null,
  name: string,
): Promise<string | undefined> => {
  if (typeof window === "undefined" || !node) return;

  try {
    const dataUrl = await toPng(node, {
      quality: 1,
      pixelRatio: 2, // High resolution crisp output
      cacheBust: true,
      style: {
        transform: "scale(1)",
      },
    });

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

