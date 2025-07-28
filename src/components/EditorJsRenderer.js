import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { globalStyles } from '../utils/styles';
import { getFullImageUrl } from '../api/config';

const EditorJsRenderer = ({ blocks }) => {
  if (!blocks) return null;

  const renderBlock = (block, index) => {
    const key = block.id || `block-${index}`;
    
    switch (block.type) {
      case 'paragraph':
        return (
          <Text key={key} style={styles.paragraph}>
            {block.data.text}
          </Text>
        );

      case 'header':
        return (
          <Text 
            key={key} 
            style={[
              styles.header,
              block.data.level === 2 && styles.headerTwo,
              block.data.level === 3 && styles.headerThree
            ]}
          >
            {block.data.text}
          </Text>
        );

      case 'list':
        return (
          <View key={key} style={styles.list}>
            {block.data.items.map((item, index) => (
              <View key={index} style={styles.listItem}>
                <Text style={styles.bullet}>
                  {block.data.style === 'ordered' ? `${index + 1}.` : '•'}
                </Text>
                <Text style={styles.listItemText}>{item}</Text>
              </View>
            ))}
          </View>
        );

      case 'image':
        const imageUrl = block.data.file?.url || block.data.url;
        const fullImageUrl = getFullImageUrl(imageUrl);
        return (
          <View key={key} style={styles.imageContainer}>
            <Image
              source={{ uri: fullImageUrl }}
              style={styles.image}
              resizeMode="cover"
            />
            {block.data.caption && (
              <Text style={styles.imageCaption}>{block.data.caption}</Text>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {blocks.map((block, index) => renderBlock(block, index))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
  },
  paragraph: {
    ...globalStyles.regularText,
    marginVertical: 4,
    lineHeight: 20,
    fontSize: 14,
  },
  header: {
    ...globalStyles.headingText,
    marginVertical: 8,
    fontSize: 18,
    fontWeight: '600',
  },
  headerTwo: {
    fontSize: 16,
  },
  headerThree: {
    fontSize: 15,
  },
  list: {
    marginVertical: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingLeft: 4,
  },
  bullet: {
    ...globalStyles.regularText,
    marginRight: 6,
    minWidth: 16,
    fontSize: 14,
  },
  listItemText: {
    ...globalStyles.regularText,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  imageContainer: {
    marginVertical: 8,
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 6,
  },
  imageCaption: {
    ...globalStyles.smallText,
    textAlign: 'center',
    marginTop: 4,
    color: '#666',
    fontSize: 12,
  }
});

export default EditorJsRenderer;