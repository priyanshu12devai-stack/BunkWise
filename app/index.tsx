import { useAuth, useClerk } from "@clerk/expo";
import { type Href, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

export default function Index() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [isLoading, setIsLoading] = useState(false);
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
      await signOut(() => router.replace("/"));
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
    } finally {
      setIsLoading(false);
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
                accessibilityRole="button"
                activeOpacity={0.82}
                className="mt-5 h-14 items-center justify-center rounded-[16px] bg-[#7C3AED] px-10"
                disabled={isLoading}
                onPress={() => void handleAction()}
                style={{ opacity: isLoading ? 0.65 : 1 }}
              >
                <Text className="font-jakarta-semibold text-[17px] text-white">
                  {isLoading ? "Signing Out..." : isSignedIn ? "Sign Out" : "Onboard"}
                </Text>
              </TouchableOpacity>

              {signOutError ? (
                <Text className="mt-3 text-center font-jakarta-medium text-[13px] text-[#DC2626]">
                  {signOutError}
                </Text>
              ) : null}
            </View>
          </ScrollView>

          {/* TODO: Remove this temporary testing button before production. */}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.86}
            className="ds-button absolute bottom-4 self-center rounded-full bg-primary px-8 py-4"
            onPress={() => router.push("/setup-wizard" as Href)}
            style={{ boxShadow: "0 10px 28px rgba(99, 102, 241, 0.38)" }}
          >
            <Text className="font-jakarta-bold text-[16px] leading-6 text-white">
              Test Setup Wizard
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}
