import api from './config';

const DEFAULT_LIMIT = 5;

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeItem = (item, type) => ({
  ...item,
  type: item?.type || type,
});

const normalizeAutocompleteResponse = (data) => {
  const payload = data?.data ?? data ?? {};

  return {
    users: toArray(payload.users).map((item) => normalizeItem(item, 'user')),
    courses: toArray(payload.courses).map((item) => normalizeItem(item, 'course')),
    everyone: toArray(payload.everyone).map((item) => normalizeItem(item, 'everyone')),
  };
};

const normalizeLegacySearchResponse = (data) => {
  const payload = data?.data ?? data ?? {};
  const users = toArray(payload.results || payload.users || payload.data || payload.items || payload);

  return {
    users: users.map((item) => normalizeItem(item, 'user')),
    courses: [],
    everyone: [],
  };
};

export const flattenMentionSuggestions = (response) => {
  const normalized = response || { users: [], courses: [], everyone: [] };

  return [
    ...normalized.users.map((item) => ({ ...item, group: 'Users' })),
    ...normalized.courses.map((item) => ({ ...item, group: 'Courses' })),
    ...normalized.everyone.map((item) => ({ ...item, group: 'Everyone' })),
  ];
};

export const searchMentionSuggestions = async (query, limit = DEFAULT_LIMIT) => {
  const trimmedQuery = (query ?? '').trim();

  if (!trimmedQuery) {
    return { users: [], courses: [], everyone: [] };
  }

  try {
    const response = await api.get(
      `mentions/autocomplete/?query=${encodeURIComponent(trimmedQuery)}&limit=${limit}`
    );

    return normalizeAutocompleteResponse(response.data);
  } catch (error) {
    const status = error?.response?.status;

    if (status !== 401 && status !== 403) {
      try {
        const fallbackResponse = await api.get(
          `auth/search_users_api?query=${encodeURIComponent(trimmedQuery)}&limit=${limit}`
        );

        return normalizeLegacySearchResponse(fallbackResponse.data);
      } catch (fallbackError) {
        console.error('Legacy mention search failed:', fallbackError);
      }
    }

    throw error;
  }
};