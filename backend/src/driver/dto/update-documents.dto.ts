// Internal DTO used by the service layer — not sent by the client directly.
// Values are populated from uploaded file URLs by the controller.
export class UpdateDocumentsDto {
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  licenseFrontUrl?: string;
  licenseBackUrl?: string;
}
