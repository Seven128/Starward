import { useRouter } from "@tarojs/taro";
import { Image, Text, View } from "@tarojs/components";
import { findDemoSpot } from "@starward/miniapp-contracts";
import { CustomNav } from "@/components/custom-nav";
import { StatusPanel } from "@/components/status-panel";
import { useThemeClass } from "@/hooks/use-theme";
import "./photos.scss";
function safe(value?: string) {
  try {
    return decodeURIComponent(value ?? "");
  } catch {
    return value ?? "";
  }
}
export default function PhotosPage() {
  const spot = findDemoSpot(safe(useRouter().params.spotId));
  const themeClass = useThemeClass();
  return (
    <View className={`${themeClass} photos-page`}>
      <CustomNav title="代表媒体图库" subtitle={spot?.name} back />
      <View className="photos-content page-inset safe-bottom">
        {!spot ? (
          <StatusPanel state="ERROR" detail="图库必须绑定正式 spot_id。" />
        ) : (
          spot.media.map((media) => (
            <View className="photo-card card" key={media.id}>
              <Image
                src={media.localPath}
                mode="widthFix"
                aria-label={media.alt}
              />
              <View>
                <Text className="type-section">{media.caption}</Text>
                <Text className="type-caption">
                  摄影：{media.photographer} · {media.license}
                </Text>
                <Text className="type-caption">来源：{media.sourceUrl}</Text>
                <Text className="status-tag status-tag--warning">
                  {media.isSiteSpecific
                    ? "本点位现场"
                    : "非本点位代表媒体，不能证明现场事实"}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}
