import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TouchableOpacity } from 'react-native';

const PostCard = ({ post }) => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity 
      onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
    >
        <View style={styles.postCard}>
        <Text style={styles.title}>{post.title}</Text>
        <Text style={styles.text}>{post.preview_text}</Text>
        <Text style={styles.timestamp}>
          {new Date(post.created_at).toLocaleString()}
        </Text>
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
    fontSize: 10,
    color: '#6B7280',
  },
});

export default PostCard;