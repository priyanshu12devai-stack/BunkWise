import Ionicons from "@expo/vector-icons/Ionicons";
import { ComponentProps } from "react";
import { TouchableOpacity, TouchableOpacityProps } from "react-native";

type IconButtonProps = TouchableOpacityProps & {
  icon: ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  backgroundClassName: string;
  label: string;
};

export function IconButton({
  icon,
  iconColor,
  backgroundClassName,
  label,
  className = "",
  ...props
}: IconButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={label}
      accessibilityRole="button"
      activeOpacity={0.78}
      className={`ds-icon-button ${backgroundClassName} ${className}`}
      {...props}
    >
      <Ionicons color={iconColor} name={icon} size={23} />
    </TouchableOpacity>
  );
}
