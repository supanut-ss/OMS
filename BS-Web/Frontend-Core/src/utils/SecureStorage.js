import SecureLS from 'secure-ls';

const ls = new SecureLS({ encodingType: 'aes' });

const SecureStorage = {
  set: (key, value) => {
    ls.set(key, value);
  },

  get: (key) => {
    try {
      return ls.get(key);
    } catch (e) {
      console.warn(`Error getting key ${key} from SecureLS`, e);
      return null;
    }
  },

  remove: (key) => {
    ls.remove(key);
  },

  clear: () => {
    ls.clear();
  }
};

export default SecureStorage;