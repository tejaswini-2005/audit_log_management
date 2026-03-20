import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1";

const API = axios.create({
  baseURL,
  withCredentials: true,
});

export default API;