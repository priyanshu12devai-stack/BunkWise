import Feather from "@expo/vector-icons/Feather";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACTIVE_CIRCLE_SIZE = 54;
const TAB_BAR_HEIGHT = 76;

type TabConfig = {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
};

const TAB_CONFIG: Record<string, TabConfig> = {
  index: { icon: "home", label: "HOME" },
  subjects: { icon: "book-open", label: "SUBJECTS" },
  attendance: { icon: "check-square", label: "ATTENDANCE" },
  schedule: { icon: "calendar", label: "SCHEDULE" },
  analytics: { icon: "bar-chart-2", label: "ANALYTICS" },
};

export function CustomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = useState(0);
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    if (barWidth === 0) return;

    const tabWidth = barWidth / state.routes.length;
    const nextX = state.index * tabWidth + (tabWidth - ACTIVE_CIRCLE_SIZE) / 2;

    indicatorX.value = withSpring(nextX, {
      damping: 20,
      mass: 0.7,
      stiffness: 210,
    });
  }, [barWidth, indicatorX, state.index, state.routes.length]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View
      className="border-t border-[#272C40] bg-[#080B18]"
      onLayout={(event) => setBarWidth(event.nativeEvent.layout.width)}
      style={{ height: TAB_BAR_HEIGHT + insets.bottom }}
    >
      {barWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          className="absolute top-[8px] rounded-full bg-[#6366F1]"
          style={[
            {
              height: ACTIVE_CIRCLE_SIZE,
              width: ACTIVE_CIRCLE_SIZE,
            },
            indicatorStyle,
          ]}
        />
      ) : null}

      <View className="flex-row" style={{ height: TAB_BAR_HEIGHT }}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? {
            icon: "circle" as const,
            label: route.name.toUpperCase(),
          };
          const { options } = descriptors[route.key];

          const handlePress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const handleLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? config.label}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              activeOpacity={0.72}
              className="relative flex-1 items-center"
              onLongPress={handleLongPress}
              onPress={handlePress}
            >
              <View pointerEvents="none" className="absolute top-[23px]">
                <Feather
                  color={isFocused ? "#FFFFFF" : "#858BAF"}
                  name={config.icon}
                  size={23}
                />
              </View>

              {isFocused ? null : (
                <Text
                  className="absolute top-[52px] font-jakarta-semibold text-[9px] leading-[12px] text-[#858BAF]"
                  numberOfLines={1}
                >
                  {config.label}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
