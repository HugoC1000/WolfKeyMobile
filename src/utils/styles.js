
import { StyleSheet } from 'react-native';
import { COLORS, FONTS, SHADOWS } from './constants';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "transparent",
  },
  card: {
    backgroundColor: COLORS.card.background,
    borderRadius: 12,
    padding: 15,
    marginBottom: 16,
    ...SHADOWS.small,
  },
  pageHeader: {
    padding: 20,
    paddingTop: 10,
  },
  headingText: {
    fontSize: 18,
    ...FONTS.bold,
    color: COLORS.text.primary,
  },
  regularText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.primary,
    fontFamily: 'Nunito-Regular' 
  },
  smallText: {
    fontSize: FONTS.sizes.small,
    color: COLORS.text.secondary,
    fontFamily: 'Nunito-Regular' 
  },
});