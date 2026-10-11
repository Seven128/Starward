declare const __MINIAPP_API_BASE__: string;
declare const __MINIAPP_OPERATOR_PREVIEW_TOKEN__: string;
declare const __DELIVERY_TARGET__: string;
declare const __MINIAPP_ACCEPTANCE_DIAGNOSTICS__: boolean;
declare const __MINIAPP_DEVICE_REQUEST_DIAGNOSTICS__: boolean;
declare const __MINIAPP_DEVELOPMENT_FIXTURE_MODE__: boolean;
declare const __MINIAPP_SKY_FEEDBACK_ID__: string;

declare namespace JSX {
  interface IntrinsicElements {
    "weather-icon": {
      kind: "temperature" | "wind" | "droplet";
      class?: string;
      "aria-hidden"?: boolean | undefined;
      "aria-role"?: string | undefined;
      "aria-label"?: string | undefined;
    };
  }
}
