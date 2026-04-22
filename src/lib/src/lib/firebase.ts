import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAnSWJKpszL-4HlOe6IR_wcBRRqEweihfE",
  authDomain: "gestao-grupos-4db60.firebaseapp.com",
  projectId: "gestao-grupos-4db60",
  storageBucket: "gestao-grupos-4db60.firebasestorage.app",
  messagingSenderId: "303764313224",
  appId: "1:303764313224:web:70a6da106e9cdd6c88bb3d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
