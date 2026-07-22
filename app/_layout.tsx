import "../global.css";

import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";

import { useAppFonts } from "@/hooks/use-app-fonts";
import { useSemesterSetupStore } from "@/store/semester-setup-store";
import { colors } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const unstable_settings = {
  anchor: "index",
};

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env file.");
}

function RootNavigator() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useAppFonts();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const hasHydrated = useSemesterSetupStore((state) => state.hasHydrated);
  const hasCompletedSetup = useSemesterSetupStore((state) =>
    userId ? Boolean(state.setupsByUserId[userId]?.isSetupComplete) : false,
  );
  const isReady = Boolean((fontsLoaded || fontError) && isLoaded && hasHydrated);

  useEffect(() => {
    if (!isReady) return;

    if (!isSignedIn) {
      router.replace("/onboarding");
      return;
    }

    router.replace(hasCompletedSetup ? "/" : "/setup-wizard");
  }, [hasCompletedSetup, isReady, isSignedIn, router, userId]);

  if (!isReady) {
    return <View className="flex-1 bg-black" />;
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.app.background },
          headerShown: false,
        }}
      >
        <Stack.Protected guard={Boolean(isSignedIn)}>
          <Stack.Protected guard={hasCompletedSetup}>
            <Stack.Screen name="index" />
          </Stack.Protected>
          <Stack.Screen name="setup-wizard" />
        </Stack.Protected>

        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey!} tokenCache={tokenCache}>
      <RootNavigator />
    </ClerkProvider>
  );
}
