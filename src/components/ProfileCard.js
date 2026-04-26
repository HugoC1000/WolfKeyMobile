import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
} from 'react-native';
import * as Device from 'expo-device';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getFullImageUrl } from '../api/config';
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';

const ProfileCard = ({ 
  profile, 
  isCurrentUser = false, 
  onEditPress, 
  onCompareSchedules,
  onImagePress 
}) => {
  // Add safety check for profile data
  if (!profile) {
    return null;
  }

  const getProfileImage = () => {
    if (profile.profile_picture_url) {
      return { uri: getFullImageUrl(profile.profile_picture_url) };
    }
    return require('../../assets/light-icon.png');
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const glassAvailable = isLiquidGlassAvailable();
  const gradientPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(gradientPulse, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(gradientPulse, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [gradientPulse]);

  const pulseScale = gradientPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const pulseOpacity = gradientPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const profileData = profile.userprofile || profile;
  const rawHue = profile?.userprofile?.background_hue;
  const hue = Number.isFinite(rawHue) ? rawHue : 220;
  const normalizedHue = ((hue % 360) + 360) % 360;
  const secondHue = (normalizedHue + 10) % 360;
  const thirdHue = (normalizedHue + 18) % 360;
  const fourthHue = (normalizedHue + 42) % 360;
  const gradientColors = [
    `hsla(${normalizedHue}, 100%, 50%, 1)`,
    `hsla(${secondHue}, 80%, 40%, 0.96)`,
    `hsla(${thirdHue}, 100%, 40%, 0.75)`,
    `hsla(${fourthHue}, 70%, 20%, 0.8)`,
  ];

  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  const displayName = fullName || profile.user?.full_name || profile.full_name || profile.user?.username || profile.username || 'user';
  const stats = profileData?.stats || profile?.stats || {};
  const postsCount = stats.posts_count || 0;
  const solutionsCount = stats.solutions_count || 0;
  const contributionsCount = postsCount + solutionsCount;
  const gradeLevel = profileData?.grade_level ?? profile?.grade_level;

  const accountAgeYears = (() => {
    const created = profile.user?.date_joined || profileData?.created_at || profile.created_at;
    if (!created) return '0.0y';
    const years = Math.max(0, (Date.now() - new Date(created).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    const rounded = years.toFixed(1);
    return `${rounded}y`;
  })();

  const socialLinks = [
    {
      key: 'snapchat',
      icon: 'snapchat-ghost',
      url: profileData?.snapchat_url,
      iconColor: '#111827',
      backgroundColor: '#FFFC00',
      borderColor: 'rgba(255, 252, 0, 0.75)',
    },
    {
      key: 'linkedin',
      icon: 'linkedin',
      url: profileData?.linkedin_url,
      iconColor: '#FFFFFF',
      backgroundColor: '#0A66C2',
      borderColor: 'rgba(10, 102, 194, 0.75)',
    },
    {
      key: 'instagram',
      icon: 'instagram',
      url: profileData?.instagram_url,
      iconColor: '#FFFFFF',
      backgroundColor: '#E4405F',
      borderColor: 'rgba(228, 64, 95, 0.75)',
    },
  ].filter((item) => Boolean(item.url));

  const openSocialUrl = async (url) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening social URL:', error);
    }
  };

  const containerContent = (
    <>
      <View style={styles.hero}>
        <TouchableOpacity 
          style={styles.imageContainer}
          onPress={onImagePress}
          disabled={!isCurrentUser}
        >
          <Image source={getProfileImage()} style={styles.profileImage} />
          {isCurrentUser && (
            <View style={styles.imageOverlay}>
              <MaterialIcons name="camera-alt" size={14} color="white" />
            </View>
          )}
        </TouchableOpacity>
        
        <View style={styles.userInfo}> 
          <View style={styles.nameRow}>
            <Text style={styles.fullName}>{displayName}</Text>
            {isCurrentUser && (
              <TouchableOpacity style={styles.inlineEditButton} onPress={onEditPress}>
                <Text style={styles.inlineEditText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.userBio} numberOfLines={2}>
            {profileData?.bio || 'No bio yet'}
          </Text>
          <Text style={styles.gradeLevelText}>
            Grade level: {profileData.grade_level ?? 'N/A'}
          </Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        {socialLinks.length > 0 ? (
          <View style={styles.socialRow}>
            {socialLinks.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.socialIconButton,
                  {
                    backgroundColor: item.backgroundColor,
                    borderColor: item.borderColor,
                  },
                ]}
                onPress={() => openSocialUrl(item.url)}
              >
                <FontAwesome5 name={item.icon} size={16} color={item.iconColor} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.metaText}>No social links</Text>
        )}
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{solutionsCount}</Text>
          <Text style={styles.statLabel}>Solution Count</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{postsCount}</Text>
          <Text style={styles.statLabel}>Post Count</Text>
        </View>
        <View style={[styles.statItem, styles.lastStatItem]}>
          <Text style={styles.statNumber}>{accountAgeYears}</Text>
          <Text style={styles.statLabel}>Account Age</Text>
        </View>
      </View>
    </>
  );

  if (glassAvailable) {
    return (
      <GlassContainer style={styles.container} spacing={0}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientLayer}
        >
          <GlassView style={styles.glassContent}>
            {containerContent}
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      styles.animatedGradientOverlay,
                      {
                        opacity: pulseOpacity,
                        transform: [{ scale: pulseScale }],
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[
                        'rgba(255, 255, 255, 0.2)',
                        'rgba(255, 255, 255, 0.3)',
                        'rgba(255, 255, 255, 0.2)',
                      ]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  </Animated.View>
          </GlassView>
        </LinearGradient>
      </GlassContainer>
    );
  }

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {containerContent}    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    borderTopLeftRadius:   Platform.OS === 'ios'
        ? Device.modelName === 'iPhone SE'
          ? 0
          : 0
        : StatusBar.currentHeight || 38,
    borderTopRightRadius: Platform.OS === 'ios'
        ? Device.modelName === 'iPhone SE'
          ? 0
          : 0
        : StatusBar.currentHeight || 38,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
    zIndex: 10,
    backgroundColor: 'rgba(3, 12, 29, 0.8)',
  },
  glassContent: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  animatedGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingTop: 90,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#8da2d8',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  fullName: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  userBio: {
    fontSize: 13,
    color: 'rgba(226, 232, 240, 0.9)',
    lineHeight: 18,
  },
  gradeLevelText: {
    marginTop: 6,
    fontSize: 12,
    color: 'rgba(226, 232, 240, 0.85)',
    fontWeight: '600',
  },
  inlineEditButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  inlineEditText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  socialIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#f1f5f9',
    fontWeight: '600',
    flexShrink: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  lastStatItem: {
    borderRightWidth: 0,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: 12,
    color: '#e2e8f0',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default ProfileCard;
