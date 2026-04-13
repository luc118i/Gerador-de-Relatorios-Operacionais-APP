function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Falha ao carregar script: ${src}`));
    document.head.appendChild(s);
  });
}

/**
 * Solicita um access token do Google Drive via OAuth2 (popup de consentimento).
 * Reutiliza scripts já carregados. Não abre o Drive Picker.
 */
export async function requestDriveToken(clientId: string): Promise<string> {
  await loadScript("https://accounts.google.com/gsi/client");

  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive",
      callback: (resp: any) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token as string);
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

export { loadScript };
