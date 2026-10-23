import dayjs from 'dayjs';
import { z } from 'zod';

import { documentFileProblem } from '@/lib/utils';

/**
 * Upload a document (US-F2-03): the file and its dates. Issue and expiry dates are required; dates a certificate
 * can't have are refused here and again on the server, before the rule is checked.
 */
export const documentUploadSchema = z
  .object({
    file: z.instanceof(File).nullable(),
    issuedOn: z.string().min(1, 'Enter the issue date printed on the document.'),
    sampledOn: z.string(),
    validUntil: z.string().min(1, 'Enter the date it is valid until.'),
    issuer: z.string().trim().max(200, 'At most 200 characters.'),
  })
  .superRefine((v, ctx) => {
    const problem = v.file ? documentFileProblem(v.file) : 'Choose the file to upload.';
    if (problem) ctx.addIssue({ code: 'custom', path: ['file'], message: problem });
    if (v.issuedOn && dayjs(v.issuedOn).isAfter(dayjs(), 'day'))
      ctx.addIssue({
        code: 'custom',
        path: ['issuedOn'],
        message: "The issue date can't be in the future.",
      });
    if (v.issuedOn && v.sampledOn && dayjs(v.sampledOn).isAfter(dayjs(v.issuedOn), 'day'))
      ctx.addIssue({
        code: 'custom',
        path: ['sampledOn'],
        message: "The sample date can't be after the issue date.",
      });
    if (v.issuedOn && v.validUntil && dayjs(v.validUntil).isBefore(dayjs(v.issuedOn), 'day'))
      ctx.addIssue({
        code: 'custom',
        path: ['validUntil'],
        message: "It can't expire before it was issued.",
      });
  });
export type DocumentUploadForm = z.infer<typeof documentUploadSchema>;

export const EMPTY_UPLOAD: DocumentUploadForm = {
  file: null,
  issuedOn: '',
  sampledOn: '',
  validUntil: '',
  issuer: '',
};
