import { Image, Text, View } from "@tarojs/components";
import { useEffect, useRef, useState } from "react";
import { LoadingIndicator } from "./loading-indicator";
import { SoftButton } from "./soft-button";
import "./reading-image.scss";

type ReadingImageProps = { src: string; alt: string; mode?: "widthFix" | "aspectFill"; className?: string };

/** Reading images share native decode/retry state; their text and queries stay independent. */
export function ReadingImage(props: ReadingImageProps) {
  return <ReadingImageState key={props.src} {...props} />;
}

function ReadingImageState({ src, alt, mode = "widthFix", className = "" }: ReadingImageProps) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const current = useRef({ alive: true, attempt: 0, loading: true });
  useEffect(() => { current.current.alive = true; return () => { current.current.alive = false; }; }, []);
  const settle = (next: "ready" | "error") => {
    if (!current.current.alive || current.current.attempt !== attempt) return;
    current.current.loading = false; setState(next);
  };
  const retry = () => {
    if (!current.current.alive || current.current.loading) return;
    current.current.loading = true; setAttempt(++current.current.attempt); setState("loading");
  };
  return <View className={`reading-image${state === "ready" ? " reading-image--ready" : ""}${mode === "aspectFill" ? " reading-image--cover" : ""} ${className}`} aria-busy={state === "loading"}>
    <Image key={`${src}:${attempt}`} className={`reading-image__image${state === "ready" ? " reading-image__image--ready" : ""}`}
      src={src} mode={mode} lazyLoad ariaLabel={alt} onLoad={() => settle("ready")} onError={() => settle("error")} />
    {state === "loading" ? <View className="reading-image__state" role="status"><LoadingIndicator /><Text>正在加载照片</Text></View>
      : state === "error" ? <View className="reading-image__state" role="status"><Text>照片暂时无法显示</Text><SoftButton label="重试本张照片" onClick={retry}>重试照片</SoftButton></View> : null}
  </View>;
}
