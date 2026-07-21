import Ionicons from "@expo/vector-icons/Ionicons";
import { View } from "react-native";

type AuthLogoProps = {
  compact?: boolean;
};

export function AuthLogo({ compact = false }: AuthLogoProps) {
  return (
    <View
      className={`items-center justify-center bg-[#7C7BFF] ${
        compact
          ? "h-16 w-16 rounded-[20px]"
          : "h-[76px] w-[76px] rounded-[22px]"
      }`}
      style={{ boxShadow: "0 10px 28px rgba(99, 102, 241, 0.22)" }}
    >
      <Ionicons
        color="#17149B"
        name="bookmark"
        size={compact ? 32 : 38}
      />
    </View>
  );
}
