import { Image, Text, View } from "@tarojs/components";
import { SemanticIcon } from "@/components/semantic-asset";
import { SourceAttribution } from "@/components/source-attribution";
import { SourceDisclosure } from "@/components/source-disclosure";
import { publicSharePresentation, type PublicShare } from "@/components/public-share-presentation";
import "./public-share-card.scss";

export function PublicShareCard({ data }: { data: PublicShare }) {
  const card = publicSharePresentation(data);
  const plan = card.kind === "PLAN";
  return <View className={`public-share-card public-share-card--${plan ? "plan" : "spot"}`}>
    {plan ? <>
      <View className="public-share-card__brand"><View><SemanticIcon name="favorite-star" /><Text>STARWARD</Text></View><Text>向星而行 · 行程纪念</Text></View>
      <View className="public-share-card__heading"><Text>{card.date}</Text><Text>向星而行</Text></View>
      <View className="public-share-card__track" aria-hidden="true"><Image src="/content/assets/icons/public-share-track.svg" mode="scaleToFill" /><SemanticIcon name="meteor" /></View>
      <View className="public-share-card__divider" aria-hidden="true"><View /><View /></View>
    </> : <View className="public-share-card__terrain" aria-hidden="true">
      <Image src="/content/assets/icons/public-share-terrain.svg" mode="scaleToFill" /><View><SemanticIcon name="place-pin" /><View /></View>
    </View>}
    <View className="public-share-card__body">
      <View className="public-share-card__place">
        {!plan ? <Text className="public-share-card__region">{card.region}</Text> : null}
        <Text className="public-share-card__name">{card.name}</Text>
        {plan ? <Text className="public-share-card__region">{card.region}</Text> : null}
        {card.address ? <Text className="public-share-card__address">{card.address}</Text> : null}
      </View>
      <View className="public-share-card__facts">{card.facts.map(fact => <View className="public-share-card__fact" key={fact.label}>
        <Text>{fact.label}</Text><View className="public-share-card__value">{fact.segments ? fact.segments.map((segment, index) => <Text className="public-share-card__segment" key={index}>{segment}</Text>) : <Text>{fact.value}</Text>}</View>
      </View>)}</View>
      {card.warnings.length ? <View className="public-share-card__warning">
        {!plan ? <Text className="public-share-card__warning-title">进入与安全说明</Text> : null}
        {card.warnings.map((warning, index) => <Text key={index}>{warning}</Text>)}
      </View> : null}
      <SourceAttribution sources={card.sources} compact />
      <SourceDisclosure id="public-share-sources" label={plan ? "资料来源与行程说明" : "资料来源与说明"} sources={card.sources}>
        {card.notes.length ? <View>{card.notes.map((note, index) => <Text className="public-share-card__note" key={index}>{note}</Text>)}</View> : undefined}
      </SourceDisclosure>
    </View>
  </View>;
}
