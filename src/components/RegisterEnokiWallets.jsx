import React, { useEffect } from "react";
import { useSuiClientContext } from "@mysten/dapp-kit";
import { isEnokiNetwork, registerEnokiWallets } from "@mysten/enoki";

export default function RegisterEnokiWallets() {
  const { client, network } = useSuiClientContext();

  useEffect(() => {
    if (!isEnokiNetwork(network)) {
      console.log("[Enoki] 지원되지 않는 네트워크, 등록 건너뜀", network);
      return;
    }

    const redirectUrl = `${window.location.origin}${window.location.pathname}`;

    console.log("[Enoki] 지갑 등록 시작", { network, redirectUrl });

    const registration = registerEnokiWallets({
      apiKey: import.meta.env.VITE_ENOKI_API_KEY,
      providers: {
        google: {
          clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          redirectUrl,
        },
      },
      client,
      network,
    });

    console.log("[Enoki] 지갑 등록 성공", {
      network,
      wallets: Object.keys(registration.wallets ?? {}),
    });

    return registration.unregister;
  }, [client, network]);

  return null;
}


