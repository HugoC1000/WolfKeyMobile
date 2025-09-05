import api from './config';

export const deleteAccount = async () => {
  return api.delete('auth/delete-account/');
};
