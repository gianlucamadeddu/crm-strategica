// Firebase Configuration per CRM Strategica
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBywiaLRnBoaGPdAUoCW4HcTE66JxUNrug",
  authDomain: "crm-strategica.firebaseapp.com",
  projectId: "crm-strategica",
  storageBucket: "crm-strategica.firebasestorage.app",
  messagingSenderId: "707651144970",
  appId: "1:707651144970:web:1f9cba1a3e00fec434bef3"
};

// Inizializzazione Firebase (verrà fatto in app.js dopo il caricamento SDK)
let db = null;

function initializeFirebase() {
  if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    console.log('✅ Firebase inizializzato');
    return true;
  }
  console.error('❌ Firebase SDK non caricato');
  return false;
}

// Export per uso globale
window.FirebaseConfig = {
  config: firebaseConfig,
  init: initializeFirebase,
  getDb: () => db
};
