import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from "firebase/firestore";
import { db, auth } from "../firebase";

export interface BenchmarkResult {
  id?: string;
  userName: string;
  userId?: string;
  updatesPerSec: number;
  totalItems: number;
  browser: string;
  os: string;
  fps?: number;
  timestamp: any;
}

const BENCHMARK_COLLECTION = "benchmarks";

export const saveBenchmarkResult = async (data: Omit<BenchmarkResult, "timestamp" | "userId">) => {
  try {
    const user = auth.currentUser;
    const docData = {
      ...data,
      userId: user?.uid || "anonymous",
      timestamp: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, BENCHMARK_COLLECTION), docData);
    return docRef.id;
  } catch (error) {
    console.error("❌ [benchmarkService] Error during Firestore write:", error);
    throw error;
  }
};

export const getLeaderboard = async (limitCount = 10) => {
  try {
    const q = query(
      collection(db, BENCHMARK_COLLECTION),
      orderBy("updatesPerSec", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as BenchmarkResult[];
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};

export const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  let browser = "Unknown";
  if (ua.indexOf("Firefox") > -1) browser = "Firefox";
  else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
  else if (ua.indexOf("Safari") > -1) browser = "Safari";
  else if (ua.indexOf("Edge") > -1) browser = "Edge";
  
  let os = "Unknown";
  if (ua.indexOf("Win") > -1) os = "Windows";
  else if (ua.indexOf("Mac") > -1) os = "MacOS";
  else if (ua.indexOf("Linux") > -1) os = "Linux";
  else if (ua.indexOf("Android") > -1) os = "Android";
  else if (ua.indexOf("like Mac") > -1) os = "iOS";
  
  return { browser, os };
};
