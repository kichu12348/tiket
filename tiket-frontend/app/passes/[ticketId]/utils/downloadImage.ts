import { toPng } from "html-to-image";

export const downloadImg = (node: HTMLDivElement | null, name: string) => {
  if (!node) return;

  toPng(node, {
    quality: 1,
    pixelRatio: 2, // High resolution crisp output
    cacheBust: true,
    style: {
      transform: "scale(1)",
    },
  })
    .then((dataUrl) => {
      const sanitizedName = (name || "pass")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      const link = document.createElement("a");
      link.download = `${sanitizedName}-tiket.png`;
      link.href = dataUrl;
      link.click();
    })
    .catch((err) => {
      console.error("Failed to generate ticket image:", err);
      alert("Failed to generate ticket image. Please try again.");
    });
};
