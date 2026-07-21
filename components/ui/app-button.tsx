import Ionicons from "@expo/vector-icons/Ionicons";
import { ComponentProps } from "react";
import { Text, TouchableOpacity, TouchableOpacityProps } from "react-native";

import { colors } from "@/theme";

type ButtonVariant = "primary" | "secondary" | "inverted" | "outlined";

type AppButtonProps = TouchableOpacityProps & {
  label: string;
  variant?: ButtonVariant;
  icon?: ComponentProps<typeof Ionicons>["name"];
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "ds-button--primary",
  secondary: "ds-button--secondary",
  inverted: "ds-button--inverted",
  outlined: "ds-button--outlined",
};

const labelClasses: Record<ButtonVariant, string> = {
  primary: "text-primary-900",
  secondary: "text-primary-100",
  inverted: "text-neutral-800",
  outlined: "text-primary-100",
};

export function AppButton({
  label,
  variant = "primary",
  icon,
  className = "",
  disabled,
  ...props
}: AppButtonProps) {
  const iconColor =
    variant === "primary"
      ? colors.primary[900]
      : variant === "inverted"
        ? colors.neutral[800]
        : colors.primary[100];

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      accessibilityRole="button"
      className={`ds-button ${variantClasses[variant]} ${disabled ? "opacity-50" : ""} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon ? <Ionicons color={iconColor} name={icon} size={20} /> : null}
      <Text className={`font-jakarta-medium text-body ${labelClasses[variant]}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
