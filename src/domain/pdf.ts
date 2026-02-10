export type OccurrencePdfResponse = {
  data: {
    pdf: {
      signedUrl: string;
      ttlSeconds: number;
      cached: boolean;
    };
  };
};
