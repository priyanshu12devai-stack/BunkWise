import Ionicons from "@expo/vector-icons/Ionicons";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AuthLogo } from "@/components/auth/auth-logo";

type AuthMode = "sign-up" | "sign-in";

type AuthScreenProps = {
  mode: AuthMode;
};

type AuthFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  autoCapitalize?: "none" | "words";
  keyboardType?: "default" | "email-address";
};

function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = "none",
  keyboardType = "default",
}: AuthFieldProps) {
  return (
    <View className="gap-2">
      <Text className="font-jakarta-medium text-[14px] leading-5 text-[#B7B8C8]">
        {label}
      </Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        className="h-[56px] rounded-[14px] border border-[#3B435C] bg-[#1A2338] px-4 font-jakarta-regular text-[16px] text-[#E3E7FF]"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#727A94"
        returnKeyType="done"
        underlineColorAndroid="transparent"
        value={value}
      />
    </View>
  );
}

type SocialButtonProps = {
  icon: "logo-google" | "logo-apple";
  label: string;
  disabled?: boolean;
};

function SocialButton({ icon, label, disabled = false }: SocialButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={`Continue with ${label}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      activeOpacity={0.78}
      className="h-[58px] flex-1 flex-row items-center justify-center gap-3 rounded-[14px] border border-[#313A56] bg-[#172036]"
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Ionicons color="#E0E7FF" name={icon} size={23} />
      <Text className="font-jakarta-medium text-[15px] text-[#D7DCF7]">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const isSignUp = mode === "sign-up";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  return (
    <ScrollView
      className="bg-[#090D14]"
      contentContainerStyle={{ flexGrow: 1, paddingBottom: 36 }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 px-6 pt-6">
        <View className="items-center">
          <AuthLogo compact={isSignUp} />

          <Text
            className={`text-center font-jakarta-bold text-[#E3E7FF] ${
              isSignUp
                ? "mt-8 text-[24px] leading-8"
                : "mt-9 text-[42px] leading-[50px]"
            }`}
          >
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>
          <Text className="mt-2 text-center font-jakarta-regular text-[14px] leading-[22px] text-[#A6A6B7]">
            {isSignUp
              ? "Join BunkWise and start tracking your attendance."
              : "Sign in to continue tracking your attendance with\nBunkWise."}
          </Text>
        </View>

        <View className={`${isSignUp ? "mt-9" : "mt-12"} gap-5`}>
          {isSignUp ? (
            <AuthField
              autoCapitalize="words"
              label="Full Name"
              onChangeText={setFullName}
              placeholder="John Doe"
              value={fullName}
            />
          ) : null}
          <AuthField
            keyboardType="email-address"
            label="Email Address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            value={email}
          />
        </View>

        <TouchableOpacity
          accessibilityState={{ disabled: true }}
          accessibilityRole="button"
          activeOpacity={0.82}
          className="mt-8 h-[61px] items-center justify-center rounded-[14px] bg-[#5454E6]"
          disabled
          style={{
            boxShadow: "0 10px 24px rgba(84, 84, 230, 0.24)",
            opacity: 0.5,
          }}
        >
          <Text className="font-jakarta-bold text-[16px] leading-6 text-white">
            {isSignUp ? "Sign Up" : "Sign In"}
          </Text>
        </TouchableOpacity>

        <View className="my-8 flex-row items-center gap-4">
          <View className="h-px flex-1 bg-[#373C4B]" />
          <Text className="font-jakarta-medium text-[13px] text-[#B6B6C6]">
            OR CONTINUE WITH
          </Text>
          <View className="h-px flex-1 bg-[#373C4B]" />
        </View>

        <View className="flex-row gap-4">
          <SocialButton disabled icon="logo-google" label="Google" />
          <SocialButton disabled icon="logo-apple" label="Apple" />
        </View>

        <View className="mt-10 flex-row justify-center gap-1 pb-4">
          <Text className="font-jakarta-regular text-[14px] text-[#ADADBD]">
            {isSignUp
              ? "Already have an account?"
              : "Don't have an account?"}
          </Text>
          <Link
            className="font-jakarta-semibold text-[14px] text-[#C0BFFF]"
            href={isSignUp ? "/sign-in" : "/sign-up"}
            replace
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
