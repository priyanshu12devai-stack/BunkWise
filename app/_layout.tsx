import "../global.css";

import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";

import { useAppFonts } from "@/hooks/use-app-fonts";
import { useAttendanceStore } from "@/store/attendance-store";
import { colors } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const unstable_settings = {
  anchor: "(tabs)",
};

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env file.");
}

function RootNavigator() {
  const router = useRouter();
  const [fontsLoaded, fontError] = useAppFonts();
  const { isLoaded, isSignedIn, userId } = useAuth();
  const hasHydrated = useAttendanceStore((state) => state.hasHydrated);
  const hasCompletedSetup = useAttendanceStore((state) =>
    userId ? Boolean(state.setupsByUserId[userId]?.isSetupComplete) : false,
  );
  const initializeUser = useAttendanceStore((state) => state.initializeUser);
  const appResourcesReady = Boolean(
    (fontsLoaded || fontError) && isLoaded && hasHydrated,
  );
  const isReady = appResourcesReady;

  useEffect(() => {
    if (!appResourcesReady || !isSignedIn || !userId) return;

    initializeUser(userId);
  }, [appResourcesReady, initializeUser, isSignedIn, userId]);

  useEffect(() => {
    if (!isReady) return;

    if (!isSignedIn) {
      router.replace("/onboarding");
      return;
    }

    if (!hasCompletedSetup) {
      router.replace("/setup-wizard");
      return;
    }

    router.replace("/");
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
            <Stack.Screen name="(tabs)" />
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
