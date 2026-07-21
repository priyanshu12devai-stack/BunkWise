export const fontFamilies = {
  regular: "PlusJakartaSans-Regular",
  medium: "PlusJakartaSans-Medium",
  semibold: "PlusJakartaSans-SemiBold",
  bold: "PlusJakartaSans-Bold",
  extrabold: "PlusJakartaSans-ExtraBold",
} as const;

export const typography = {
  display: { fontSize: 48, lineHeight: 56, fontFamily: fontFamilies.bold },
  headline: { fontSize: 32, lineHeight: 40, fontFamily: fontFamilies.bold },
  title: { fontSize: 24, lineHeight: 32, fontFamily: fontFamilies.semibold },
  subtitle: { fontSize: 20, lineHeight: 28, fontFamily: fontFamilies.semibold },
  body: { fontSize: 16, lineHeight: 24, fontFamily: fontFamilies.regular },
  label: { fontSize: 14, lineHeight: 20, fontFamily: fontFamilies.medium },
  caption: { fontSize: 12, lineHeight: 16, fontFamily: fontFamilies.medium },
} as const;
