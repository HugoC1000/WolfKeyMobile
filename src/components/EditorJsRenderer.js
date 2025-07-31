import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { globalStyles } from '../utils/styles';
import { getFullImageUrl } from '../api/config';

const EditorJsRenderer = ({ blocks }) => {
  if (!blocks) return null;

  // Helper function to strip HTML tags and decode entities
  const stripHtmlAndDecode = (text) => {
    if (!text) return '';
    return text
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with regular space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/&#39;/g, "'"); // Replace &#39; with '
  };

  const renderBlock = (block, index) => {
    const key = block.id || `block-${index}`;
    
    switch (block.type) {
      case 'paragraph':
        return (
          <Text key={key} style={styles.paragraph}>
            {stripHtmlAndDecode(block.data.text)}
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
            {stripHtmlAndDecode(block.data.text)}
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
                <Text style={styles.listItemText}>
                  {typeof item === 'string' ? item : item.content}
                </Text>
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

      case 'code':
        return (
          <View key={key} style={styles.codeContainer}>
            <Text style={styles.codeText}>{block.data.code}</Text>
            {block.data.language && (
              <Text style={styles.codeLanguage}>{block.data.language}</Text>
            )}
          </View>
        );

      case 'math':
        return (
          <View key={key} style={styles.mathContainer}>
            <Text style={styles.mathText}>{block.data.content}</Text>
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
  },
  codeContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007acc',
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: 13,
    lineHeight: 18,
    color: '#333',
  },
  codeLanguage: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
  },
  mathContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  mathText: {
    fontFamily: 'Courier',
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  }
});

export default EditorJsRenderer;