export type OccurrenceDriveResponse = {
  data: {
    occurrenceId: string;
    drive: {
      fileId: string;
      fileName: string;
      webViewLink: string;
    };
  };
};
