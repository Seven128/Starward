import { Linking, Platform } from "react-native";
import { wgs84ToGcj02, type Wgs84Coordinate } from "../../../../../packages/coordinate-system/src/index";

export async function openNativeMapNavigation(destination: Wgs84Coordinate, name: string): Promise<void> {
  const gcj02 = wgs84ToGcj02(destination);
  const query = `dlat=${gcj02.lat}&dlon=${gcj02.lon}&dname=${encodeURIComponent(name)}&dev=0&t=0`;
  const nativeUrl = `${Platform.OS === "ios" ? "iosamap" : "amapuri"}://route/plan/?${query}`;
  const fallbackUrl = `https://uri.amap.com/navigation?to=${gcj02.lon},${gcj02.lat},${encodeURIComponent(name)}&mode=car&policy=1&src=starward&coordinate=gaode&callnative=1`;
  const target = await Linking.canOpenURL(nativeUrl) ? nativeUrl : fallbackUrl;
  await Linking.openURL(target);
}
