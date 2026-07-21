import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

const mutedTextColor = "#6D7396";

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <ScrollView
      className="bg-[#090B17]"
      contentContainerStyle={{ flexGrow: 1 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 justify-center px-8">
        <View className="items-center">
          <View
            className="h-20 w-20 items-center justify-center rounded-[28px] bg-[#615FF8]"
            style={{ boxShadow: "0 0 34px rgba(97, 95, 248, 0.32)" }}
          >
            <View className="h-[34px] w-7 justify-end rounded-[4px] border-[3px] border-white pb-[5px]">
              <Ionicons
                color="white"
                name="bookmark"
                size={15}
                style={{ position: "absolute", left: 4, top: -1 }}
              />
              <View className="mx-[3px] h-[3px] rounded-full bg-white" />
            </View>
          </View>

          <Text className="mt-5 font-jakarta-extrabold text-[30px] leading-[38px] text-white">
            BunkWise
          </Text>

          <Text
            className="mt-3 text-center font-jakarta-medium text-[14px] leading-6"
            style={{ color: mutedTextColor }}
          >
            Know Your Attendance.{"\n"}Stay Ahead. Never Guess Again.
          </Text>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            className="mt-12 h-12 w-full items-center justify-center rounded-[14px] bg-[#615FF8]"
            onPress={() => router.push("/sign-up")}
          >
            <Text className="font-jakarta-bold text-[16px] leading-6 text-white">
              Get Started
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
