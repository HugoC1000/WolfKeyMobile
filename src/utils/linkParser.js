import React, { useMemo } from 'react';
import { Text, Linking, Alert } from 'react-native';

/**
 * Decodes HTML entities in text
 */
const decodeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
};

/**
 * Validates if a URL is properly formatted
 */
export const formatUrl = (url) => {
  if (!url) return '';
  return url.trim();
};

/**
 * Opens a URL with error handling and visual feedback
 */
export const openUrl = async (url) => {
  try {
    const formattedUrl = formatUrl(url);
    
    if (!formattedUrl) {
      Alert.alert('Error', 'Invalid URL');
      return;
    }
    
    const supported = await Linking.canOpenURL(formattedUrl);

    if (supported) {
      await Linking.openURL(formattedUrl);
    } else {
      Alert.alert('Cannot Open', `This device cannot open the link`);
    }
  } catch (error) {
    console.error('Error opening URL:', error);
    Alert.alert('Error', 'Failed to open URL. Please try again.');
  }
};

/**
 * Parses HTML text and extracts anchor tags into structured parts
 * Handles EditorJS HTML format with <a> tags
 */
export const parseHtmlWithLinks = (htmlText) => {
  if (!htmlText || typeof htmlText !== 'string') return null;

  const parts = [];
  let lastIndex = 0;

  // Regex to match <a> tags: <a href="url">text</a>
  const linkRegex = /<a\s+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/g;
  let match;

  while ((match = linkRegex.exec(htmlText)) !== null) {
    const href = match[1];
    const linkText = match[2];

    // Add text before the link
    if (match.index > lastIndex) {
      const textBefore = htmlText.substring(lastIndex, match.index);
      const decodedText = decodeHtmlEntities(textBefore);
      // Keep text if it has any non-whitespace content
      if (decodedText.trim().length > 0) {
        parts.push({
          type: 'text',
          content: decodedText,
        });
      }
    }

    // Add the link
    parts.push({
      type: 'link',
      content: decodeHtmlEntities(linkText),
      url: formatUrl(href),
    });

    lastIndex = linkRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < htmlText.length) {
    const remainingText = htmlText.substring(lastIndex);
    const decodedText = decodeHtmlEntities(remainingText);
    // Keep text if it has any non-whitespace content
    if (decodedText.trim().length > 0) {
      parts.push({
        type: 'text',
        content: decodedText,
      });
    }
  }

  return parts.length > 0 ? parts : null;
};

/**
 * Component that renders HTML text with clickable links
 * Handles EditorJS HTML format with <a> tags
 */
export const TextWithLinks = React.memo(({ text, style, linkStyle, ...props }) => {
  // Memoize parsing to avoid recalculation on every render
  const parts = useMemo(() => parseHtmlWithLinks(text), [text]);

  // If no links found, return plain text with HTML entities decoded
  if (!parts) {
    const decodedText = decodeHtmlEntities(text);
    return <Text style={style} {...props}>{decodedText}</Text>;
  }

  const defaultLinkStyle = {
    color: '#007AFF',
    textDecorationLine: 'underline',
  };

  return (
    <Text style={style} {...props} selectable={true}>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <Text
              key={index}
              style={[defaultLinkStyle, linkStyle]}
              onPress={() => openUrl(part.url)}
              suppressHighlighting={false}
              selectable={true}
            >
              {part.content}
            </Text>
          );
        }
        return (
          <Text key={index} selectable={true}>
            {part.content}
          </Text>
        );
      })}
    </Text>
  );
});

TextWithLinks.displayName = 'TextWithLinks';

export default TextWithLinks;
