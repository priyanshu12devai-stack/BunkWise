import { useAuth } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import {
  clearAllSemesterSetupState,
} from "@/store/semester-setup-store";

export default function Index() {
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingStorage, setIsClearingStorage] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  const handleAction = async () => {
    if (isLoading) return;

    if (!isSignedIn) {
      router.push("/onboarding");
      return;
    }

    setSignOutError(null);
    setIsLoading(true);
    try {
      await signOut();
      router.replace("/onboarding");
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSetupState = async () => {
    if (isClearingStorage) return;

    setIsClearingStorage(true);
    try {
      await clearAllSemesterSetupState();
    } finally {
      setIsClearingStorage(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
        <View className="flex-1 bg-[#F7F7F7]">
          <ScrollView
            className="bg-[#F7F7F7]"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingBottom: 120,
              paddingHorizontal: 24,
            }}
            contentInsetAdjustmentBehavior="automatic"
          >
            <View className="items-center">
              <Text className="font-jakarta-bold text-[34px] leading-[42px] text-[#7C3AED]">
                BunkWise
              </Text>

              <TouchableOpacity
                accessibilityLabel="Setup semester"
                accessibilityRole="button"
                activeOpacity={0.82}
                className="mt-6 w-full items-center justify-center rounded-2xl bg-[#7C3AED] p-4"
                onPress={() => router.push("/setup-wizard")}
              >
                <Text className="font-jakarta-bold text-[17px] leading-6 text-white">
                  Setup Semester
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.82}
                className="mt-4 w-full items-center justify-center rounded-2xl bg-red-500/10 p-4"
                disabled={isLoading}
                onPress={() => void handleAction()}
                style={{ opacity: isLoading ? 0.65 : 1 }}
              >
                <Text className="font-jakarta-semibold text-[17px] text-red-500">
                  {isLoading ? "Signing Out..." : isSignedIn ? "Sign Out" : "Onboard"}
                </Text>
              </TouchableOpacity>

              {signOutError ? (
                <Text className="mt-3 text-center font-jakarta-medium text-[13px] text-[#DC2626]">
                  {signOutError}
                </Text>
              ) : null}

              {/* TODO: Remove this temporary testing button before production. */}
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.86}
                className="mt-4 w-full items-center justify-center rounded-2xl bg-zinc-800 p-4"
                disabled={isClearingStorage}
                onPress={() => void clearSetupState()}
                style={{ opacity: isClearingStorage ? 0.65 : 1 }}
              >
                <Text className="font-jakarta-bold text-[16px] leading-6 text-white">
                  {isClearingStorage ? "Clearing..." : "Clear Setup State"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}
