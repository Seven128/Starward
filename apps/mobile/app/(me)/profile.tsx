import { Redirect, type Href } from "expo-router";

export default function LegacyProfileRoute() {
  return <Redirect href={"/me" as Href} />;
}
