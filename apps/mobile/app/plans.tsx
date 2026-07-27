import { Redirect, type Href } from "expo-router";

export default function LegacyPlansRoute() {
  return <Redirect href={"/trips" as Href} />;
}
