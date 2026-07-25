import Feather from "@expo/vector-icons/Feather";
import { isClerkAPIResponseError, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type EditProfileModalProps = {
  onClose: () => void;
};

function getErrorMessage(error: unknown) {
  if (isClerkAPIResponseError(error)) {
    return (
      error.errors[0]?.longMessage ??
      error.errors[0]?.message ??
      "Clerk could not update your profile."
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Your profile could not be updated. Please try again.";
}

function getProfileImageFile(asset: ImagePicker.ImagePickerAsset) {
  if (asset.base64) {
    return `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
  }

  if (asset.file) return asset.file;
  throw new Error("Unable to parse asset base64 payload");
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { isLoaded, user } = useUser();
  const userRef = useRef(user);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [pendingImage, setPendingImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  userRef.current = user;

  useEffect(() => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    setFirstName(currentUser.firstName ?? "");
    setLastName(currentUser.lastName ?? "");
    setPendingImage(null);
    setError(null);
  }, [user?.id]);

  const hasCustomAvatar = isLoaded && Boolean(user?.hasImage);
  const imageUrl =
    pendingImage?.uri ??
    (hasCustomAvatar && user
      ? `${user.imageUrl}?t=${user.updatedAt?.getTime() ?? 0}`
      : null);
  const profileInitial = (
    firstName.trim().charAt(0) ||
    user?.firstName?.trim().charAt(0) ||
    "S"
  ).toUpperCase();
  const isBusy = isSaving || isUploadingImage;
  const canSave = Boolean(
    isLoaded && user && firstName.trim() && !isBusy,
  );

  const pickImage = async () => {
    if (!user || isBusy) return;

    setError(null);

    try {
      if (process.env.EXPO_OS === "ios") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          setError("Photo library permission is required to choose an image.");
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
        mediaTypes: ["images"],
        quality: 0.6,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setPendingImage(asset);
      setIsUploadingImage(true);

      const filePayload = getProfileImageFile(asset);

      try {
        await user.setProfileImage({
          file: filePayload,
        });

        await user.reload();
      } catch (responseError) {
        setPendingImage(null);
        setError(getErrorMessage(responseError));
        return;
      }

      setPendingImage(null);
    } catch (uploadError) {
      setPendingImage(null);
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const saveProfile = async () => {
    if (!canSave || !user) return;

    setIsSaving(true);
    setError(null);

    try {
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim() || null,
      });

      await user.reload();
      onClose();
    } catch (saveError) {
      setError(getErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <Pressable
        className="flex-1 justify-center bg-black/60 px-5"
        onPress={isBusy ? undefined : onClose}
      >
        <Pressable
          className="rounded-[28px] border border-[#353543] bg-zinc-900 px-5 pb-5 pt-4"
          onPress={() => undefined}
        >
          <View className="flex-row items-center justify-between">
            <Text className="font-jakarta-bold text-[21px] text-white">
              Edit Profile
            </Text>
            <TouchableOpacity
              accessibilityLabel="Close edit profile"
              accessibilityRole="button"
              activeOpacity={0.7}
              className="h-11 w-11 items-center justify-center rounded-full bg-[#292932]"
              disabled={isBusy}
              onPress={onClose}
            >
              <Feather color="#B8B8C8" name="x" size={21} />
            </TouchableOpacity>
          </View>

          <View className="items-center pb-6 pt-4">
            <TouchableOpacity
              accessibilityLabel="Choose a new profile photo"
              accessibilityRole="button"
              activeOpacity={0.78}
              className="relative h-[100px] w-[100px] items-center justify-center rounded-full border-2 border-[#6863FF] bg-[#28243D]"
              disabled={isBusy}
              onPress={() => void pickImage()}
            >
              {imageUrl ? (
                <Image
                  accessibilityLabel={`${firstName || "Student"}'s profile photo`}
                  cachePolicy="memory"
                  className="h-full w-full rounded-full"
                  contentFit="cover"
                  recyclingKey={
                    pendingImage?.uri ??
                    user?.updatedAt?.getTime().toString() ??
                    null
                  }
                  source={imageUrl}
                />
              ) : (
                <Text className="font-jakarta-bold text-[34px] text-white">
                  {profileInitial}
                </Text>
              )}
              <View className="absolute -bottom-1 -right-1 h-9 w-9 items-center justify-center rounded-full border-2 border-zinc-900 bg-[#6863FF]">
                <Feather color="white" name="camera" size={17} />
              </View>
            </TouchableOpacity>
            <Text className="pt-3 font-jakarta-medium text-[13px] text-[#A7A7BA]">
              {isUploadingImage ? "Uploading…" : "Tap to change photo"}
            </Text>
          </View>

          <View className="gap-4">
            <View className="gap-2">
              <Text className="font-jakarta-medium text-[13px] text-[#B9B9C8]">
                First Name
              </Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="given-name"
                className="h-[54px] rounded-[14px] border border-[#3C3C49] bg-[#202028] px-4 font-jakarta-medium text-[16px] text-white"
                editable={!isBusy}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor="#737382"
                returnKeyType="next"
                underlineColorAndroid="transparent"
                value={firstName}
              />
            </View>

            <View className="gap-2">
              <Text className="font-jakarta-medium text-[13px] text-[#B9B9C8]">
                Last Name
              </Text>
              <TextInput
                autoCapitalize="words"
                autoComplete="family-name"
                className="h-[54px] rounded-[14px] border border-[#3C3C49] bg-[#202028] px-4 font-jakarta-medium text-[16px] text-white"
                editable={!isBusy}
                onChangeText={setLastName}
                onSubmitEditing={() => void saveProfile()}
                placeholder="Last name"
                placeholderTextColor="#737382"
                returnKeyType="done"
                underlineColorAndroid="transparent"
                value={lastName}
              />
            </View>
          </View>

          {error ? (
            <Text className="pt-3 font-jakarta-medium text-[12px] leading-5 text-[#FF829E]">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            activeOpacity={0.8}
            className="mt-5 h-[54px] items-center justify-center rounded-[14px] bg-[#6863FF]"
            disabled={!canSave}
            onPress={() => void saveProfile()}
            style={{ opacity: canSave ? 1 : 0.5 }}
          >
            <Text className="font-jakarta-bold text-[16px] text-white">
              {isSaving ? "Saving…" : "Save Changes"}
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}
