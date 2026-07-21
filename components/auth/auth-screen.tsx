import Ionicons from "@expo/vector-icons/Ionicons";
import { useClerk, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { type Href, Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AuthLogo } from "@/components/auth/auth-logo";
import { VerificationModal } from "@/components/auth/verification-modal";

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
  autoComplete?: "email" | "new-password";
  keyboardType?: "default" | "email-address";
  secureTextEntry?: boolean;
};

type ClerkFlowError = {
  code: string;
  longMessage?: string;
  message: string;
};

function AuthField({
  label,
  placeholder,
  value,
  onChangeText,
  autoCapitalize = "none",
  autoComplete,
  keyboardType = "default",
  secureTextEntry = false,
}: AuthFieldProps) {
  return (
    <View className="gap-2">
      <Text className="font-jakarta-medium text-[14px] leading-5 text-[#B7B8C8]">
        {label}
      </Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        className="h-[56px] rounded-[14px] border border-[#3B435C] bg-[#1A2338] px-4 font-jakarta-regular text-[16px] text-[#E3E7FF]"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#727A94"
        returnKeyType="done"
        secureTextEntry={secureTextEntry}
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
  onPress: () => void;
};

function SocialButton({
  icon,
  label,
  disabled = false,
  onPress,
}: SocialButtonProps) {
  return (
    <TouchableOpacity
      accessibilityLabel={`Continue with ${label}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      activeOpacity={0.78}
      className="h-[58px] flex-1 flex-row items-center justify-center gap-3 rounded-[14px] border border-[#313A56] bg-[#172036]"
      disabled={disabled}
      onPress={onPress}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Ionicons color="#E0E7FF" name={icon} size={23} />
      <Text className="font-jakarta-medium text-[15px] text-[#D7DCF7]">
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function getErrorMessage(error: ClerkFlowError) {
  return (
    error.longMessage ??
    error.message ??
    "Something went wrong. Please try again."
  );
}

function isExistingAccountError(error: ClerkFlowError) {
  return error.code === "form_identifier_exists";
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const isSignUp = mode === "sign-up";
  const router = useRouter();
  const { redirectToTasks } = useClerk();
  const { signIn, fetchStatus: signInFetchStatus } = useSignIn();
  const { signUp, fetchStatus: signUpFetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isVerificationOpen, setIsVerificationOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  const isLoading =
    signInFetchStatus === "fetching" ||
    signUpFetchStatus === "fetching" ||
    isSocialLoading;
  const canSubmit =
    email.trim().length > 0 &&
    (!isSignUp || (fullName.trim().length > 0 && password.length > 0));

  const handleSessionActivation = ({
    session,
    decorateUrl,
  }: {
    session: { currentTask?: { key: string } | null };
    decorateUrl: (url: string) => string;
  }) => {
    if (session.currentTask) {
      return redirectToTasks({ redirectUrl: decorateUrl("/") });
    }

    router.replace(decorateUrl("/") as Href);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;

    setAuthError(null);
    const emailAddress = email.trim().toLowerCase();

    if (isSignUp) {
      const [firstName, ...lastNameParts] = fullName.trim().split(/\s+/);
      const { error } = await signUp.password({
        emailAddress,
        firstName,
        lastName: lastNameParts.join(" ") || undefined,
        password,
      });

      if (error) {
        setAuthError(
          isExistingAccountError(error)
            ? "An account with this email already exists. Select Sign In below."
            : getErrorMessage(error),
        );
        return;
      }

      const { error: verificationError } =
        await signUp.verifications.sendEmailCode();
      if (verificationError) {
        setAuthError(getErrorMessage(verificationError));
        return;
      }
    } else {
      const { error } = await signIn.emailCode.sendCode({ emailAddress });
      if (error) {
        setAuthError(getErrorMessage(error));
        return;
      }
    }

    setIsVerificationOpen(true);
  };

  const handleVerify = async (code: string) => {
    setAuthError(null);

    if (isSignUp) {
      const { error } = await signUp.verifications.verifyEmailCode({ code });

      if (error) {
        setAuthError(getErrorMessage(error));
        return false;
      }

      if (!signUp.createdSessionId) {
        const missingFields = signUp.missingFields
          .map((field) => field.replaceAll("_", " "))
          .join(", ");

        setIsVerificationOpen(false);
        setAuthError(
          missingFields
            ? `Your email is verified, but Clerk still requires: ${missingFields}.`
            : "Your email is verified, but Clerk has not completed the account setup.",
        );
        return true;
      }

      const { error: finalizeError } = await signUp.finalize({
        navigate: handleSessionActivation,
      });
      if (finalizeError) {
        setAuthError(getErrorMessage(finalizeError));
        return false;
      }

      setIsVerificationOpen(false);
      return true;
    }

    const { error } = await signIn.emailCode.verifyCode({ code });

    if (error) {
      setAuthError(getErrorMessage(error));
      return false;
    }

    if (!signIn.createdSessionId) {
      setAuthError("Verification is incomplete. Please request a new code.");
      return false;
    }

    const { error: finalizeError } = await signIn.finalize({
      navigate: handleSessionActivation,
    });
    if (finalizeError) {
      setAuthError(getErrorMessage(finalizeError));
      return false;
    }

    setIsVerificationOpen(false);
    return true;
  };

  const handleVerificationClose = () => {
    setIsVerificationOpen(false);
    setAuthError(null);
    void (isSignUp ? signUp.reset() : signIn.reset());
  };

  const handleResendCode = async () => {
    setAuthError(null);

    if (
      isSignUp &&
      signUp.verifications.emailAddress.status === "verified"
    ) {
      setAuthError(
        "Your email is already verified. Complete the remaining account requirements to continue.",
      );
      return false;
    }

    const { error } = isSignUp
      ? await signUp.verifications.sendEmailCode()
      : await signIn.emailCode.sendCode();

    if (error) {
      setAuthError(getErrorMessage(error));
      return false;
    }

    return true;
  };

  const handleSocialAuth = async (
    strategy: "oauth_google" | "oauth_apple",
  ) => {
    if (isLoading) return;

    setAuthError(null);
    setIsSocialLoading(true);

    try {
      const { createdSessionId, setActive, signUp: socialSignUp } =
        await startSSOFlow({ strategy });

      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      } else if (socialSignUp?.status === "missing_requirements") {
        setAuthError("Your social account is missing required profile details.");
      }
    } catch {
      setAuthError("Social sign-in could not be completed. Please try again.");
    } finally {
      setIsSocialLoading(false);
    }
  };

  return (
    <>
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
              autoComplete="email"
              keyboardType="email-address"
              label="Email Address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              value={email}
            />
            {isSignUp ? (
              <AuthField
                autoComplete="new-password"
                label="Password"
                onChangeText={setPassword}
                placeholder="Create a password"
                secureTextEntry
                value={password}
              />
            ) : null}
          </View>

          <TouchableOpacity
            accessibilityState={{ disabled: !canSubmit || isLoading }}
            accessibilityRole="button"
            activeOpacity={0.82}
            className="mt-8 h-[61px] items-center justify-center rounded-[14px] bg-[#5454E6]"
            disabled={!canSubmit || isLoading}
            onPress={() => void handleSubmit()}
            style={{
              boxShadow: "0 10px 24px rgba(84, 84, 230, 0.24)",
              opacity: !canSubmit || isLoading ? 0.5 : 1,
            }}
          >
            <Text className="font-jakarta-bold text-[16px] leading-6 text-white">
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>

          {authError && !isVerificationOpen ? (
            <Text className="mt-3 text-center font-jakarta-medium text-[13px] leading-5 text-[#FF8A8A]">
              {authError}
            </Text>
          ) : null}

          <View className="my-8 flex-row items-center gap-4">
            <View className="h-px flex-1 bg-[#373C4B]" />
            <Text className="font-jakarta-medium text-[13px] text-[#B6B6C6]">
              OR CONTINUE WITH
            </Text>
            <View className="h-px flex-1 bg-[#373C4B]" />
          </View>

          <View className="flex-row gap-4">
            <SocialButton
              disabled={isLoading}
              icon="logo-google"
              label="Google"
              onPress={() => void handleSocialAuth("oauth_google")}
            />
            <SocialButton
              disabled={isLoading}
              icon="logo-apple"
              label="Apple"
              onPress={() => void handleSocialAuth("oauth_apple")}
            />
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

          {isSignUp ? <View nativeID="clerk-captcha" /> : null}
        </View>
      </ScrollView>

      <VerificationModal
        email={email}
        error={authError}
        onCodeChange={() => setAuthError(null)}
        onClose={handleVerificationClose}
        onResend={handleResendCode}
        onVerify={handleVerify}
        visible={isVerificationOpen}
      />
    </>
  );
}
