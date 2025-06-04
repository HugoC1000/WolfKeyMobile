import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { globalStyles } from '../utils/styles';

const EditorJsRenderer = ({ blocks }) => {
  if (!blocks) return null;

  const renderBlock = (block) => {
    switch (block.type) {
      case 'paragraph':
        return (
          <Text key={block.id} style={styles.paragraph}>
            {block.data.text}
          </Text>
        );

      case 'header':
        return (
          <Text 
            key={block.id} 
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
          <View key={block.id} style={styles.list}>
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
        return (
          <View key={block.id} style={styles.imageContainer}>
            <Image
              source={{ uri: block.data.url }}
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
      {blocks.map(block => renderBlock(block))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  paragraph: {
    ...globalStyles.regularText,
    marginVertical: 8,
    lineHeight: 24,
  },
  header: {
    ...globalStyles.headingText,
    marginVertical: 12,
  },
  headerTwo: {
    fontSize: 20,
  },
  headerThree: {
    fontSize: 18,
  },
  list: {
    marginVertical: 8,
  },
  listItem: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingLeft: 8,
  },
  bullet: {
    ...globalStyles.regularText,
    marginRight: 8,
    minWidth: 20,
  },
  listItemText: {
    ...globalStyles.regularText,
    flex: 1,
  },
  imageContainer: {
    marginVertical: 12,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  imageCaption: {
    ...globalStyles.smallText,
    textAlign: 'center',
    marginTop: 8,
    color: '#666',
  }
});

export default EditorJsRenderer;