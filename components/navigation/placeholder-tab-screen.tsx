import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PlaceholderTabScreenProps = {
  name: string;
};

export function PlaceholderTabScreen({ name }: PlaceholderTabScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#091329" }}>
      <View className="flex-1 items-center justify-center bg-[#091329] px-6">
        <Text className="text-center font-jakarta-bold text-[28px] text-[#E0E7FF]">
          {name}
        </Text>
      </View>
    </SafeAreaView>
  );
}
