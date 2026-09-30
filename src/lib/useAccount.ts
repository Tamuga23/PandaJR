"use client";

import { useSyncExternalStore } from "react";
import { getAccountSnapshot, subscribeAccount, type AccountInfo } from "@/lib/firebase/pairing";

const SERVER_ACCOUNT: AccountInfo = { uid: null, anonymous: true, email: null, methods: [] };
const getServerAccount = () => SERVER_ACCOUNT;

/** La cuenta de este dispositivo: anónima (solo aquí) o guardada con Google o con un correo. */
export function useAccount(): AccountInfo {
  return useSyncExternalStore(subscribeAccount, getAccountSnapshot, getServerAccount);
}
