import { View } from "react-native";

type ProgressBarProps = {
  value: number;
  colorClassName?: string;
  accessibilityLabel?: string;
};

export function ProgressBar({
  value,
  colorClassName = "bg-primary-300",
  accessibilityLabel = "Progress",
}: ProgressBarProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: normalizedValue }}
      className="h-2 w-full overflow-hidden rounded-full bg-app-surface-raised"
    >
      <View
        className={`h-full rounded-full ${colorClassName}`}
        style={{ width: `${normalizedValue}%` }}
      />
    </View>
  );
}
