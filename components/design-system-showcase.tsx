import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from "react-native";

import { AppButton } from "@/components/ui/app-button";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SearchField } from "@/components/ui/search-field";
import { colors, ColorPalette } from "@/theme";

const paletteNames: ColorPalette[] = ["primary", "secondary", "tertiary", "neutral"];
const shadeOrder = [950, 900, 800, 700, 600, 500, 400, 300, 200, 100, 50] as const;

const paletteMeta = {
  primary: { label: "Primary", value: "#6366F1", textClassName: "text-white" },
  secondary: { label: "Secondary", value: "#10B981", textClassName: "text-neutral-950" },
  tertiary: { label: "Tertiary", value: "#F59E0B", textClassName: "text-neutral-950" },
  neutral: { label: "Neutral", value: "#0F172A", textClassName: "text-white" },
} as const;

function PaletteCard({ name }: { name: ColorPalette }) {
  const meta = paletteMeta[name];

  return (
    <View className="overflow-hidden rounded-card bg-neutral-50">
      <View
        className="h-28 justify-between p-5"
        style={{ backgroundColor: colors[name][500] }}
      >
        <View className="flex-row items-center justify-between">
          <Text selectable className={`font-jakarta-semibold text-body ${meta.textClassName}`}>
            {meta.label}
          </Text>
          <Text selectable className={`font-jakarta-medium text-body ${meta.textClassName}`}>
            {meta.value}
          </Text>
        </View>
      </View>
      <View className="h-14 flex-row">
        {shadeOrder.map((shade) => (
          <View
            className="h-full flex-1"
            key={shade}
            style={{ backgroundColor: colors[name][shade] }}
          />
        ))}
      </View>
    </View>
  );
}

function TypeCard({
  label,
  sampleClassName,
}: {
  label: string;
  sampleClassName: string;
}) {
  return (
    <View className="ds-card min-h-52 flex-1 justify-between">
      <View className="flex-row justify-between gap-4">
        <Text className="font-jakarta-semibold text-label text-app-text-muted">{label}</Text>
        <Text className="font-jakarta-medium text-label text-app-text-muted">
          Plus Jakarta Sans
        </Text>
      </View>
      <Text className={`${sampleClassName} text-center text-primary-100`}>Aa</Text>
    </View>
  );
}

function NavigationPreview() {
  const items = [
    { label: "Home", icon: "home-outline" as const, selected: true },
    { label: "Search", icon: "search-outline" as const, selected: false },
    { label: "Profile", icon: "person-outline" as const, selected: false },
  ];

  return (
    <View className="ds-card min-h-44 items-center justify-center">
      <View className="w-full max-w-sm flex-row items-center justify-center gap-5 rounded-full bg-app-surface-raised px-5 py-3">
        {items.map((item) => (
          <TouchableOpacity
            accessibilityLabel={item.label}
            accessibilityRole="button"
            activeOpacity={0.78}
            className={`h-12 w-12 items-center justify-center rounded-full ${item.selected ? "bg-primary-300" : "bg-transparent"}`}
            key={item.label}
          >
            <Ionicons
              color={item.selected ? colors.primary[800] : colors.app.text}
              name={item.icon}
              size={24}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function ActionsPreview() {
  return (
    <View className="ds-card min-h-44 flex-row items-center justify-center gap-3">
      <IconButton
        backgroundClassName="bg-primary-300"
        icon="color-wand-outline"
        iconColor={colors.primary[800]}
        label="Magic action"
      />
      <IconButton
        backgroundClassName="bg-secondary-300"
        icon="shapes-outline"
        iconColor={colors.secondary[800]}
        label="Shape action"
      />
      <IconButton
        backgroundClassName="bg-tertiary-300"
        icon="pricetag-outline"
        iconColor={colors.tertiary[900]}
        label="Tag action"
      />
      <IconButton
        backgroundClassName="bg-app-danger"
        icon="trash-outline"
        iconColor="#7F1D1D"
        label="Delete"
      />
    </View>
  );
}

function CompactActionsPreview() {
  return (
    <View className="flex-row gap-5">
      <View className="ds-card flex-1 items-center justify-center">
        <TouchableOpacity
          accessibilityLabel="Edit"
          accessibilityRole="button"
          activeOpacity={0.78}
          className="h-14 w-14 items-center justify-center rounded-control bg-tertiary-600"
        >
          <Ionicons color={colors.neutral[950]} name="pencil-outline" size={24} />
        </TouchableOpacity>
      </View>
      <View className="ds-card flex-1 items-center justify-center">
        <AppButton icon="pencil-outline" label="Label" />
      </View>
    </View>
  );
}

export function DesignSystemShowcase() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <ScrollView
      className="ds-screen"
      contentContainerStyle={{
        gap: 20,
        paddingBottom: 48,
        paddingHorizontal: 20,
        paddingTop: 24,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <View className="gap-1">
        <Text selectable className="ds-type--headline">
          BunkWise design system
        </Text>
        <Text className="ds-type--body text-app-text-muted">
          Color, typography, controls, progress, and navigation foundations.
        </Text>
      </View>

      <Link href="./onboarding" asChild>
        <TouchableOpacity
          accessibilityRole="link"
          activeOpacity={0.78}
          className="h-12 items-center justify-center rounded-control bg-primary-300 px-5"
        >
          <Text className="font-jakarta-semibold text-body text-primary-900">
            Open onboarding
          </Text>
        </TouchableOpacity>
      </Link>

      <View className={isWide ? "flex-row gap-5" : "gap-5"}>
        <View className="flex-1 gap-5">
          {paletteNames.map((name) => (
            <PaletteCard key={name} name={name} />
          ))}
        </View>

        <View className="flex-[2] gap-5">
          <View className={isWide ? "flex-row gap-5" : "gap-5"}>
            <TypeCard label="Headline" sampleClassName="font-jakarta-bold text-8xl" />
            <View className="ds-card flex-1 justify-center gap-3">
              <View className="flex-row gap-3">
                <AppButton className="flex-1" label="Primary" />
                <AppButton className="flex-1" label="Secondary" variant="secondary" />
              </View>
              <View className="flex-row gap-3">
                <AppButton className="flex-1" label="Inverted" variant="inverted" />
                <AppButton className="flex-1" label="Outlined" variant="outlined" />
              </View>
            </View>
          </View>

          <View className={isWide ? "flex-row gap-5" : "gap-5"}>
            <TypeCard label="Body" sampleClassName="font-jakarta text-8xl" />
            <View className="ds-card flex-1 justify-center gap-5">
              <ProgressBar accessibilityLabel="Primary progress" value={70} />
              <ProgressBar
                accessibilityLabel="Secondary progress"
                colorClassName="bg-secondary-300"
                value={85}
              />
              <ProgressBar
                accessibilityLabel="Tertiary progress"
                colorClassName="bg-tertiary-300"
                value={55}
              />
            </View>
          </View>

          <View className={isWide ? "flex-row gap-5" : "gap-5"}>
            <TypeCard label="Label" sampleClassName="font-jakarta-medium text-8xl" />
            <View className="flex-1 gap-5">
              <View className="ds-card justify-center">
                <SearchField />
              </View>
              <CompactActionsPreview />
              <NavigationPreview />
              <ActionsPreview />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
