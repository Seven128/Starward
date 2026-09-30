import { Image, Text, View } from "@tarojs/components";
import { SemanticIcon } from "./semantic-asset";

/** Shared identity layout; the caller owns navigation, record status and media authorization. */
export function SpotIdentityContent({ region, name, address, mediaSrc, mediaAlt }: {
  region: string;
  name: string;
  address?: string | null;
  mediaSrc?: string | null;
  mediaAlt?: string;
}) {
  return <>
    {mediaSrc ? <Image className="spot-identity-card__media" src={mediaSrc} mode="aspectFill" lazyLoad ariaLabel={mediaAlt || `${name}现场照片`} /> : null}
    <View className="spot-identity-card__copy">
      <Text className="spot-identity-card__region">{region}</Text>
      <Text className="spot-identity-card__title">{name}</Text>
      {address ? <View className="spot-identity-card__address"><SemanticIcon name="location" /><Text className="spot-identity-card__address-text">{address}</Text></View> : null}
    </View>
  </>;
}
