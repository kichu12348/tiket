import { getColor } from "colorthief";
import chroma from "chroma-js";

export async function getBackgroundColor(imagePath: string) {
  try {
    const image = document.createElement("img");
    image.crossOrigin = "anonymous";
    image.src = imagePath;
    await new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = reject;
    });
    const dominantColor = await getColor(image);

    if (!dominantColor) {
      throw new Error("Could not extract dominant color");
    }

    // 2. Load it into chroma.js for manipulation
    const { r, g, b } = dominantColor.rgb();
    let bgColor = chroma.rgb(r, g, b);

    // 3. The "Luma" Transformation
    // Cap the lightness at around 10-15% to ensure it's dark
    if (bgColor.get("hsl.l") > 0.15) {
      bgColor = bgColor.set("hsl.l", 0.12);
    }

    // Optional: Boost the saturation slightly so it doesn't look like muddy grey
    // when darkened (Luma's example had 100% saturation)
    bgColor = bgColor.saturate(1.5);

    // 4. Return the hex value
    return {
      rgba: (round: boolean | undefined) => bgColor.rgba(round),
      hex: () => bgColor.hex(),
      rgb: () => bgColor.rgb(),
      hsl: () => bgColor.hsl(),
      isError: false,
    };
  } catch (err) {
    console.error("Failed to extract color", err);
    throw err;
  }
}
