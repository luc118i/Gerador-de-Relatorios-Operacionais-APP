export type OccurrencePdfResponse = {
  data: {
    occurrenceId: string;
    pdf: {
      storagePath: string;
      signedUrl: string;
      ttlSeconds: number;
      cached: boolean;
    };
  };
};
