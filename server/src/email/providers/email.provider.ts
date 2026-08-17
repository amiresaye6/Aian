/**
 * A generic attachment shape, kept independent of any specific mail SDK
 * (Nodemailer, SendGrid, etc.) so this abstraction doesn't leak provider
 * internals. `cid` is what makes an attachment usable as an inline/embedded
 * image — the HTML references it via `src="cid:<cid>"` — as opposed to a
 * regular downloadable attachment, which just omits `cid`.
 */
export interface EmailAttachment {
  /** Filename shown if the attachment is viewed outside the inline reference. */
  filename: string;
  /** Absolute path to the file on disk. */
  path: string;
  /** Content-ID referenced in the HTML body via `cid:<value>` for inline display. */
  cid?: string;
}

export abstract class EmailProvider {
  /**
   * Sends an email using the underlying infrastructure (e.g., Nodemailer, SendGrid).
   *
   * @param to The recipient's email address
   * @param subject The email subject
   * @param html The fully compiled HTML body of the email
   * @param attachments Optional files to send with the email, including
   *   inline/embedded images referenced in `html` via `cid:` (e.g. the
   *   branded email logo).
   */
  abstract sendMail(
    to: string,
    subject: string,
    html: string,
    attachments?: EmailAttachment[],
  ): Promise<void>;
}
