import "../global.css";

import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { useAppFonts } from "@/hooks/use-app-fonts";
import { colors } from "@/theme";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env file.");
}

function RootNavigator() {
  const [fontsLoaded, fontError] = useAppFonts();
  const { isLoaded, isSignedIn } = useAuth();

  if ((!fontsLoaded && !fontError) || !isLoaded) {
    return null;
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
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />

        <Stack.Protected guard={!isSignedIn}>
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
