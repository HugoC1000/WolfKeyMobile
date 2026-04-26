import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Text,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getFullImageUrl } from '../api/config';

const SearchBarCard = ({ profileHue, searchResults, onSearch, onResultPress }) => {
  const [isFocused, setIsFocused] = useState(false);
  const textInputRef = useRef(null);

  const handleResultPress = (username) => {
    // Call the parent handler
    onResultPress(username);
    // Close the dropdown
    setIsFocused(false);
  };

  const rawHue = profileHue;
  const hue = Number.isFinite(rawHue) ? rawHue : 220;
  const normalizedHue = ((hue % 360) + 360) % 360;
  
  // Lighter background color (90% lightness instead of darker)
  const lighterBackgroundColor = `hsla(${normalizedHue}, 100%, 90%, 1)`;

  const renderUserResult = ({ item }) => (
    <Pressable
      style={({ pressed }) => [
        styles.resultItem,
        pressed && { backgroundColor: '#F0F0F0' },
      ]}
      onPress={() => handleResultPress(item.username)}
    >
      <Image
        source={
          item.profile_picture_url
            ? { uri: getFullImageUrl(item.profile_picture_url) }
            : require('../../assets/light-icon.png')
        }
        style={styles.resultAvatar}
      />
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>
          {item.first_name && item.last_name
            ? `${item.first_name} ${item.last_name}`
            : item.username}
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.card]}>
      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color="#666" />
        <TextInput
          ref={textInputRef}
          style={styles.input}
          placeholder="Search users..."
          placeholderTextColor="#999"
          onChangeText={onSearch}
          onFocus={() => setIsFocused(true)}
        />
      </View>
      {isFocused && searchResults.length > 0 && (
        <View style={styles.resultsWrapper}>
          <FlatList
            data={searchResults}
            renderItem={renderUserResult}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            nestedScrollEnabled={false}
            style={styles.resultsList}
            pointerEvents="auto"
            scrollEventThrottle={16}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 99,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333333',
  },
  resultsWrapper: {
    marginTop: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  resultsList: {
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  resultAvatar: {
    width: 25,
    height: 25,
    borderRadius: 20,
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  resultUsername: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
});

export default SearchBarCard;
