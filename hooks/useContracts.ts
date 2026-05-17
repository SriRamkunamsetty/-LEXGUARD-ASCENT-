import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { ContractRecord } from "../src/shared/contracts";

export interface ContractData extends ContractRecord {}

export function useContracts() {
  const [contracts, setContracts] = useState<ContractData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setContracts([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "contracts"),
      where("userId", "==", auth.currentUser.uid),
      orderBy("uploadDate", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: ContractData[] = [];
        snapshot.forEach((doc) => {
          results.push({ id: doc.id, ...doc.data() } as ContractData);
        });
        setContracts(results);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching contracts:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  return { contracts, loading };
}
