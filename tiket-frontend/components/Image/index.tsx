"use client";

import { useCallback, useState, type ImgHTMLAttributes, type RefObject } from "react";
import { ImageOff } from "lucide-react";
import styles from "./Image.module.css";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  ref?: RefObject<HTMLImageElement | null>;
}

function ImageContent({ ref, loading = "lazy", alt = "", onLoad, onError, ...props }: ImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");
  const attach = useCallback((node: HTMLImageElement | null) => {
    if (ref) ref.current = node;
    if (node?.complete) setStatus(node.naturalWidth > 0 ? "loaded" : "error");
  }, [ref]);
  if (status === "error") return <div role="img" aria-label={alt || "Image unavailable"} className={`${props.className || ""} ${styles.errorContainer}`}><ImageOff className={styles.errorIcon} /></div>;
  return <img {...props} alt={alt} ref={attach} loading={loading}
    onLoad={event => { setStatus("loaded"); onLoad?.(event); }}
    onError={event => { setStatus("error"); onError?.(event); }}
    className={`${props.className || ""} ${status === "loading" ? styles.shimmer : ""}`} />;
}

export default function Image(props: ImageProps) {
  return <ImageContent key={String(props.src)} {...props} />;
}
