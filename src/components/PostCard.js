import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';

const PostCard = ({ post }) => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
    >
      <View style={styles.postCard}>
        <View style={styles.header}>
          <View style={styles.authorInfo}>
            {post.author.userprofile.profile_picture ? (
              <Image 
                source={{ uri: post.author.userprofile.profile_picture }}
                style={styles.profilePic}
              />
            ) : (
              <View style={styles.profilePicPlaceholder} />
            )}
            <View>
              <Text style={styles.authorName}>{post.author_name}</Text>
              <Text style={styles.timestamp}>{new Date(post.created_at).toLocaleString()}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.text}>{post.preview_text}</Text>
        
        {Array.isArray(post.courses) && post.courses.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>

            {post.courses.map((course, idx) => (
              <Text
              key={idx}
              style={[styles.courseContext, {
                backgroundColor:
                course.needs_help ? '#3B82F6' :
                course.is_experienced ? '#198754' :
                '#6C757D'
              }]}
              >
                {course.name}
                {course.needs_help ? ' (needs help)' : ''}
                {course.is_experienced ? ' (experienced)' : ''}
              </Text>

            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  profilePicPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  authorName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  courseContext: {
    fontSize: 12,
    color: '#ffffffff',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    margin: 3,
  },
  title: {
    fontWeight: '600',
    marginBottom: 4,
    fontSize: 16,
  },
  text: {
    fontSize: 12,
    marginBottom: 6,
    fontFamily: 'Nunito-Regular',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  stats: {
    flexDirection: 'row',
    marginTop: 8,
  },
  statItem: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 12,
  },
});

export default PostCard;