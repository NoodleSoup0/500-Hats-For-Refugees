// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";

import {getDatabase,  onValue, ref, update, get,set} from "firebase/database"
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useCallback, useState, useEffect } from "react";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import {firebaseConfig} from firebaseConfig




// Initialize Firebase
const firebase = initializeApp(firebaseConfig);

const database = getDatabase(firebase);
const auth = getAuth(firebase);
const storage = getStorage(firebase);

export { firebase, database, auth };

export const signInWithGoogle = async() => {
    const result = await signInWithPopup(auth, new GoogleAuthProvider());
    return result;
};

export const signOut = () => firebaseSignOut(auth);

export const getRef = async (path) => {
  const snapshot = await get(ref(database, path));
  return snapshot.exists();
};

///admin sign in function
export const AdminSignIn = async (email, password) => {
    try {
        // Authenticate the user using email and password
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Check if the user is an admin in the Realtime Database
        const adminRef = ref(database, `admin/${user.uid}`);
        const adminSnapshot = await get(adminRef);

        if (!adminSnapshot.exists()) {
            console.error('User is not an admin');
            throw new Error('User is not an admin');
        }

        console.log('Admin signed in successfully:', user);
        return { user, isAdmin: true };

    } catch (error) {
        console.error('Error during admin sign-in:', error.message);
        throw error;
    }
};
///User email-password login/signup function
export const loginWithEmail = async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error during user login:", error.message);
      throw error;
    }
  };
  
  export const signUpWithEmail = async (email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error("Error during user sign-up:", error.message);
      throw error;
    }
  };

export const useAuthState = () => {
    const [user, setUser] = useState();
    useEffect(() => (
        onAuthStateChanged(auth, setUser)
    ), []);

    return [user];
};

export const useDbData = (path) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!path) {
      // Reset state when path is invalid or null
      setData(null);
      setError(null);
      return;
    }

    const dbRef = ref(database, path);
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        setData(snapshot.val());
      },
      (err) => {
        setError(err);
      }
    );

    return () => unsubscribe(); // Cleanup listener on unmount or path change
  }, [path]);

  return [data, error];
};

const makeResult = (error) => {
    const timestamp = Date.now();
    const message = error?.message || `Updated: ${new Date(timestamp).toLocaleString()}`;
    return { timestamp, error, message };
};

export const useDbAdd = (path) => {
    const [result, setResult] = useState(null);
  

    const add = async (data, key) => {
      try {
        const newRef = ref(database, `${path}/${key}`); 
        await set(newRef, data); 
        setResult({ message: 'Request added successfully!', error: false });
      } catch (error) {
        setResult({ message: error.message, error: true });
      }
    };
  
    return [add, result];
  };

export const useDbUpdate = (path) => {
    const [result, setResult] = useState();
    const updateData = useCallback(async (value) => {
        console.log('Updating path:', path);
        console.log('Value before update:', value);

        if (!value || typeof value !== 'object') {
            console.error("Invalid value passed to updateData:", value);
            return;
        }

        const dbRef = ref(database, path);
        update(dbRef, value)
            .then(() => setResult(makeResult()))
            .catch((error) => {
                console.error("Error during Firebase update:", error);
                setResult(makeResult(error));
            });
    }, [path]);

    return [updateData, result];
};


//for rejecting an event/donation/image
export const useDbRemove = () => {
    const [result, setResult] = useState(null);

    const removeData = useCallback(async (path) => {
        try {
            const dbRef = ref(database, path);
            const snapshot = await get(dbRef);
            if (snapshot.exists()) {
                await remove(dbRef);
                setResult({ message: `Removed successfully`, error: false });
            } else {
                setResult({ message: `Error: No data found at path: ${path}`, error: true });
            }
        } catch (error) {
            setResult({ message: error.message, error: true });
        }
    }, []);

    return [removeData, result];
};
// Upload image to Firebase Storage and return the image URL
export const uploadImage = async (imageFile) => {
    try {
      const imageRef = storageRef(storage, `images/${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);
      return imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // Update the submission data in the Firebase Realtime Database
export const submitDataToDatabase = async (key, data) => {
    try {
      const dbRef = ref(database, 'submissions'); // Reference to your Firebase path
      const newSubmissionRef = ref(database, 'submissions/' + key); // Use timestamp as unique ID
      await update(newSubmissionRef, data);
      console.log("Data submitted successfully:", data);
    } catch (error) {
      console.error("Error submitting data:", error);
      throw error;
    }
  };
