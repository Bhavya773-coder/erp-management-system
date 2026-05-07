// WhatsApp-Inspired Theme System
const lightPalette = {
  primary: '#075E54',
  primaryDark: '#054D44',
  primaryLight: '#128C7E',
  teal: '#25D366',
  tealDark: '#1DA851',
  accent: '#25D366',
  accentLight: '#34EB7A',
  bgPrimary: '#FFFFFF',
  bgSecondary: '#F0F2F5',
  bgTertiary: '#E9EDEF',
  bgChat: '#EFEAE2',
  bgBubbleOutgoing: '#E7FFDB',
  bgBubbleIncoming: '#FFFFFF',
  bgHeader: '#F0F2F5',
  bgInput: '#FFFFFF',
  bgModal: '#FFFFFF',
  bgOverlay: 'rgba(0,0,0,0.4)',
  textPrimary: '#111B21',
  textSecondary: '#667781',
  textLight: '#54656F',
  textMuted: '#8696A0',
  textOnPrimary: '#FFFFFF',
  textLink: '#027EB5',
  online: '#1FA855',
  offline: '#667781',
  delivered: '#53BDEB',
  seen: '#53BDEB',
  sent: '#8696A0',
  error: '#EA4335',
  warning: '#F5A623',
  border: '#E9EDEF',
  borderLight: '#F0F2F5',
  divider: '#F0F2F5',
  unreadBadge: '#25D366',
  searchBg: '#F0F2F5',
  ripple: 'rgba(0,0,0,0.05)',
};

const darkPalette = {
  primary: '#075E54',
  primaryDark: '#054D44',
  primaryLight: '#128C7E',
  teal: '#25D366',
  tealDark: '#1DA851',
  accent: '#25D366',
  accentLight: '#34EB7A',
  bgPrimary: '#111B21',
  bgSecondary: '#1F2C34',
  bgTertiary: '#233138',
  bgChat: '#0B141A',
  bgBubbleOutgoing: '#005C4B',
  bgBubbleIncoming: '#202C33',
  bgHeader: '#1F2C34',
  bgInput: '#2A3942',
  bgModal: '#233138',
  bgOverlay: 'rgba(0,0,0,0.6)',
  textPrimary: '#E9EDEF',
  textSecondary: '#8696A0',
  textLight: '#AEBAC1',
  textMuted: '#667781',
  textOnPrimary: '#FFFFFF',
  textLink: '#53BDEB',
  online: '#25D366',
  offline: '#667781',
  delivered: '#53BDEB',
  seen: '#53BDEB',
  sent: '#8696A0',
  error: '#EA4335',
  warning: '#F5A623',
  border: '#2A3942',
  borderLight: '#374045',
  divider: '#222D34',
  unreadBadge: '#25D366',
  searchBg: '#2A3942',
  ripple: 'rgba(37,211,102,0.12)',
};

import { useThemeStore } from '../store/themeStore';

// Hook-like function to get current theme colors
export const useTheme = () => {
  const mode = useThemeStore((state) => state.mode);
  return mode === 'dark' ? darkPalette : lightPalette;
};

// Static export of the default (light) theme for cases where hooks cannot be used
// (Though components should use the useTheme hook)
export const Colors = lightPalette;

export const Fonts = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    title: 28,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 999,
};
