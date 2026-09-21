"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import styles from "./Image.module.css";

interface ImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  ref?: React.RefObject<HTMLImageElement | null>;
}

export default function Image({
  ref = useRef(null),
  loading = "lazy",
  ...props
}: ImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setIsError(false);
    const img = ref.current;

    if (img) {
      if (img.complete) {
        setIsLoading(false);
        if (img.naturalWidth === 0) setIsError(true);
      }

      const handleLoad = () => setIsLoading(false);
      const handleError = () => {
        setIsError(true);
        setIsLoading(false);
      };

      img.addEventListener("load", handleLoad);
      img.addEventListener("error", handleError);

      return () => {
        img.removeEventListener("load", handleLoad);
        img.removeEventListener("error", handleError);
      };
    }
  }, [props.src]);

  if (isError) {
    return (
      <div className={`${props.className || ""} ${styles.errorContainer}`}>
        <ImageOff className={styles.errorIcon} />
      </div>
    );
  }

  return (
    <img
      {...props}
      ref={ref}
      loading={loading}
      className={`${props.className || ""} ${isLoading ? styles.shimmer : ""}`}
    />
  );
}
