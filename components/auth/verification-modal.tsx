import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type VerificationModalProps = {
  email: string;
  visible: boolean;
  onClose: () => void;
};

const CODE_LENGTH = 6;

export function VerificationModal({
  email,
  visible,
  onClose,
}: VerificationModalProps) {
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");

  const handleClose = () => {
    Keyboard.dismiss();
    setCode("");
    onClose();
  };

  const handleCodeChange = (value: string) => {
    const nextCode = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(nextCode);

    if (nextCode.length === CODE_LENGTH) {
      Keyboard.dismiss();
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleClose}
      onShow={() => inputRef.current?.focus()}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
          backgroundColor: "rgba(2, 4, 12, 0.82)",
        }}
      >
        <View
          className="w-full rounded-[28px] border border-[#343C55] bg-[#121827] px-5 pb-7 pt-5"
          style={{
            borderCurve: "continuous",
            boxShadow: "0 18px 50px rgba(0, 0, 0, 0.42)",
          }}
        >
          <View className="items-end">
            <TouchableOpacity
              accessibilityLabel="Close verification"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#1D263B]"
              onPress={handleClose}
            >
              <Ionicons color="#B8BDD1" name="close" size={24} />
            </TouchableOpacity>
          </View>

          <View className="items-center px-1">
            <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-[#7775FF]">
              <Ionicons color="#17149B" name="mail" size={31} />
            </View>

            <Text className="mt-5 text-center font-jakarta-bold text-[25px] leading-8 text-[#E4E8FF]">
              Check your email
            </Text>
            <Text className="mt-2 text-center font-jakarta-regular text-[14px] leading-[22px] text-[#969AAF]">
              We sent a verification code to{"\n"}
              <Text className="font-jakarta-semibold text-[#C6CAFF]">
                {email.trim() || "your email"}
              </Text>
            </Text>

            <TouchableOpacity
              accessibilityHint="Opens the number pad to enter your verification code"
              accessibilityLabel="Six digit verification code"
              activeOpacity={1}
              className="relative mt-7 w-full flex-row justify-between"
              onPress={() => inputRef.current?.focus()}
            >
              {Array.from({ length: CODE_LENGTH }, (_, index) => (
                <View
                  className={`h-[52px] flex-1 items-center justify-center rounded-[12px] border bg-[#1B2439] ${
                    index === code.length
                      ? "border-[#7775FF]"
                      : "border-[#39425B]"
                  } ${index > 0 ? "ml-2" : ""}`}
                  key={index}
                >
                  <Text className="font-jakarta-bold text-[20px] text-[#E4E8FF]">
                    {code[index] ?? ""}
                  </Text>
                </View>
              ))}

              <TextInput
                ref={inputRef}
                accessibilityLabel="Verification code input"
                autoComplete="one-time-code"
                caretHidden
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                onChangeText={handleCodeChange}
                style={{
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  opacity: 0.01,
                }}
                textContentType="oneTimeCode"
                value={code}
              />
            </TouchableOpacity>

            <Text className="mt-5 text-center font-jakarta-medium text-[13px] leading-5 text-[#777C94]">
              Enter the 6-digit code to continue
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
