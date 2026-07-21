import Ionicons from "@expo/vector-icons/Ionicons";
import { TextInput, TextInputProps, View } from "react-native";

import { colors } from "@/theme";

export function SearchField({ className = "", ...props }: TextInputProps) {
  return (
    <View className="relative justify-center">
      <View className="pointer-events-none absolute left-4 z-10">
        <Ionicons color={colors.app.textMuted} name="search-outline" size={24} />
      </View>
      <TextInput
        accessibilityLabel="Search"
        className={`ds-input ${className}`}
        placeholder="Search"
        placeholderTextColor={colors.app.textMuted}
        selectionColor={colors.primary[400]}
        {...props}
      />
    </View>
  );
}
