import { Link } from "expo-router";
import { ScrollView } from "react-native";

export default function Index() {
  return (
    <ScrollView
      className="ds-screen"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: 20,
      }}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Link
        accessibilityHint="Navigates to the onboarding screen"
        className="text-center font-jakarta-medium text-body text-primary-300 underline"
        href="/onboarding"
      >
        Open onboarding
      </Link>
    </ScrollView>
  );
}
