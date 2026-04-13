import { request } from "./http";
import type { OccurrenceDriveResponse } from "../domain/drive";

export const reportsDriveApi = {
  sendOccurrenceToDrive(args: {
    occurrenceId: string;
    accessToken?: string;
    folderId?: string;
    fileName?: string;
  }) {
    return request<OccurrenceDriveResponse>({
      method: "POST",
      path: `/reports/occurrences/${args.occurrenceId}/drive`,
      body: {
        ...(args.accessToken ? { accessToken: args.accessToken } : {}),
        ...(args.folderId    ? { folderId: args.folderId }       : {}),
        ...(args.fileName    ? { fileName: args.fileName }       : {}),
      },
    });
  },
};
