import axios from 'axios';
import SecureStorage from './SecureStorage'; // ถ้ามี secureStorage ที่คุณสร้างไว้
import Config from './Config';
const AxiosMaster = axios.create({
  baseURL: Config.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

AxiosMaster.interceptors.request.use(
  (config) => {
    const token = SecureStorage.get('token'); // ดึง token ถ้ามี
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

AxiosMaster.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      refresh();
    }
    return Promise.reject(error);
  }
);

const refresh = () => {
  SecureStorage.remove("token");
  AxiosMaster.post('refresh', { refresh_token: SecureStorage.get("refresh_token") })
    .then((res) => {
      if (res.data.message_code === "0") {
        SecureStorage.set("token", res.data.data.access_token)
        SecureStorage.set("refresh_token", res.data.data.refresh_token)
      } else {
        SecureStorage.clear();
      }
    }).finally()
};

export default AxiosMaster;