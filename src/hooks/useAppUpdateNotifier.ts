import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Verifica periodicamente se uma nova versão do app foi publicada
 * (comparando o buildId embutido no bundle com o `version.json` servido
 * estaticamente) e, quando detecta divergência, exibe um toast persistente
 * pedindo ao usuário para recarregar a página.
 *
 * Só roda em produção: em dev o `__APP_BUILD_ID__` muda a cada `npm run dev`
 * e não há `version.json` servido pelo Vite dev server.
 */
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const TOAST_ID = "app-update-available";

async function fetchRemoteBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return data.buildId ?? null;
  } catch {
    // Falha de rede (offline, etc.) não deve incomodar o usuário.
    return null;
  }
}

export function useAppUpdateNotifier() {
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!import.meta.env.PROD) return;

    const checkForUpdate = async () => {
      if (notifiedRef.current) return;

      const remoteBuildId = await fetchRemoteBuildId();
      if (!remoteBuildId || remoteBuildId === __APP_BUILD_ID__) return;

      notifiedRef.current = true;
      toast.info("Nova versão disponível", {
        id: TOAST_ID,
        description: "Atualize a página para usar a versão mais recente.",
        duration: Infinity,
        action: {
          label: "Atualizar",
          onClick: () => window.location.reload(),
        },
      });
    };

    // Checa ao entrar/voltar o foco na aba, além do polling periódico.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") checkForUpdate();
    };

    checkForUpdate();
    const intervalId = window.setInterval(checkForUpdate, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", checkForUpdate);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", checkForUpdate);
    };
  }, []);
}
