import { registerRootComponent } from "expo";
import { WebApplication } from "./src/shell/WebApplication";

// Keep native and web on the same React Native application root. Expo Router
// remains available to feature code, but an empty route tree must not replace
// the product shell in native builds.
registerRootComponent(WebApplication);
