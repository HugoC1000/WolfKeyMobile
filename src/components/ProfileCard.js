import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getFullImageUrl } from '../api/config';


const { width } = Dimensions.get('window');

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
  };

  const formatJoinDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
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
          <Text style={styles.fullName}>
            {profile.first_name || ''} {profile.last_name || ''}
          </Text>
          <Text style={styles.userBio}>
            {profile.userprofile?.bio}
          </Text>
        </View>
        
        <View style={styles.actions}>
          {isCurrentUser && (
            <TouchableOpacity style={styles.editButton} onPress={onEditPress}>
              <MaterialIcons name="edit" size={20} color="white" />
              <Text style={styles.buttonText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {profile.userprofile.courses?.experienced_courses?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Experienced</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {profile.userprofile.courses?.help_needed_courses?.length || 0}
          </Text>
          <Text style={styles.statLabel}>Need Help</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {profile.userprofile.stats?.posts_count || 0}
          </Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {profile.stats?.solutions_count || 0}
          </Text>
          <Text style={styles.statLabel}>Solutions</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
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
  fullName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 4,
  },
  major: {
    fontSize: 14,
    color: '#2563eb',
    marginBottom: 2,
  },
  graduationYear: {
    fontSize: 14,
    color: '#2563eb',
  },
  actions: {
    alignItems: 'flex-end',
  },
  editButton: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  compareButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  }, 
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default ProfileCard;
