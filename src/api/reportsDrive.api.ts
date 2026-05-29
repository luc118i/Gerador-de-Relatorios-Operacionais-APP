import { request } from "./http";
import type { OccurrenceDriveResponse } from "../domain/drive";

export const reportsDriveApi = {
  sendOccurrenceToDrive(args: {
    occurrenceId: string;
    accessToken?: string;
    folderId?: string;
    fileName?: string;
    force?: boolean;
  }) {
    return request<OccurrenceDriveResponse>({
      method: "POST",
      path: `/reports/occurrences/${args.occurrenceId}/drive`,
      body: {
        ...(args.accessToken ? { accessToken: args.accessToken } : {}),
        ...(args.folderId    ? { folderId: args.folderId }       : {}),
        ...(args.fileName    ? { fileName: args.fileName }       : {}),
        ...(args.force       ? { force: true }                   : {}),
      },
    });
  },

  sendDailyReportToDrive(args: {
    date: string;
    accessToken: string;
    folderId: string;
  }): Promise<{ data: { fileName: string; webViewLink: string } }> {
    return request<{ data: { fileName: string; webViewLink: string } }>({
      method: "POST",
      path: `/reports/daily/${args.date}/drive`,
      body: { accessToken: args.accessToken, folderId: args.folderId },
    });
  },
};
