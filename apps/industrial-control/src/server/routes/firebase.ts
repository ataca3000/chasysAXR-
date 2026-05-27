// @ts-ignore
// @ts-ignore
import admin from "firebase-admin";

const initializeFirebase = () => {
  if (admin.apps.length > 0) return admin.app();

  // Validamos que existan las variables necesarias
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (
    !projectId ||
    !clientEmail ||
    (!privateKey && process.env.NODE_ENV !== "production")
  ) {
    console.warn(
      "⚠️ Advertencia: Faltan variables de entorno de Firebase. El servidor funcionará en modo degradado.",
    );
    return null;
  }

  try {
    // Si estamos en Cloud Run, Firebase Admin se inicializa automáticamente con ADC
    if (process.env.NODE_ENV === "production" && !privateKey) {
      return admin.initializeApp();
    }

    // Fallback para desarrollo local con variables de entorno
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // Reemplazar los saltos de línea que vienen del string del .env
        privateKey: privateKey?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error);
    return null;
  }
};

const firebaseApp = initializeFirebase();
export const db = firebaseApp ? admin.firestore() : null;
export const auth = firebaseApp ? admin.auth() : null;
export default firebaseApp;
