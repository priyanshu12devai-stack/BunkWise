import { Tabs } from "expo-router";

import { CustomTabBar } from "@/components/navigation/custom-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: "#091329" },
      }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="subjects" options={{ title: "Subjects" }} />
      <Tabs.Screen name="attendance" options={{ title: "Attendance" }} />
      <Tabs.Screen name="schedule" options={{ title: "Schedule" }} />
      <Tabs.Screen name="analytics" options={{ title: "Analytics" }} />
    </Tabs>
  );
}
