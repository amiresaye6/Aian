/**
 * ============================================================================
 * AIAN — BASE TRANSACTIONAL EMAIL SHELL
 * ============================================================================
 * @param contentHtml    The specific HTML body for this email (e.g. a
 *                        welcome message, a reset-password notice, etc).
 * @param preheaderText  Optional short preview text shown next to the
 *                        subject line in the inbox list. Keep under ~100
 *                        characters. Omit to skip the preheader entirely.
 * @returns The fully constructed HTML email string, ready to send.
 */
export function buildBaseEmailTemplate(
  contentHtml: string,
  preheaderText: string = '',
): string {
  const currentYear = new Date().getFullYear();
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  // The logo travels as an embedded (CID) attachment on every send — see
  // the sendMail() usage note below — rather than a hosted URL. That means
  // it doesn't depend on your app being publicly reachable, which matters
  // since a URL pointing at localhost only resolves on your own machine,
  // never on the recipient's.
  const logoCid = 'aian-logo';

  // Padding characters that force the preheader to end and stop the email
  // client from pulling in the start of the visible content as preview text.
  const preheaderPadding = '&nbsp;&zwnj;'.repeat(40);

  return `
    <!DOCTYPE html>
    <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="color-scheme" content="dark light">
      <meta name="supported-color-schemes" content="dark light">
      <title>Aian Notification</title>
      <!--[if mso]>
      <noscript>
        <xml>
          <o:OfficeDocumentSettings>
            <o:PixelsPerInch>96</o:PixelsPerInch>
            <o:AllowPNG/>
          </o:OfficeDocumentSettings>
        </xml>
      </noscript>
      <style>
        table { border-collapse: collapse; }
        td, th, div, p, a, h1, h2, h3 { font-family: Arial, Helvetica, sans-serif; }
      </style>
      <![endif]-->
      <style>
        :root {
          color-scheme: dark light;
          supported-color-schemes: dark light;
        }
        body, table, td {
          -webkit-text-size-adjust: 100%;
          -ms-text-size-adjust: 100%;
        }
        body {
          margin: 0;
          padding: 0;
          width: 100% !important;
          background-color: #0d0d0d;
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        }
        img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
        a { text-decoration: none; }

        /* ---------- content typography ---------- */
        .content { padding: 42px 40px 36px; }
        .content, .content p {
          font-size: 16px;
          line-height: 1.65;
          color: #d8d5cc;
        }
        .content p { margin: 0 0 18px; }
        .content h1, .content h2, .content h3 {
          font-family: 'Century Gothic', 'Futura', 'Trebuchet MS', 'Helvetica Neue', Arial, sans-serif;
          color: #f5f1e6;
          font-weight: 700;
          line-height: 1.3;
          margin: 0 0 16px;
        }
        .content h1 { font-size: 24px; letter-spacing: 0.3px; }
        .content h2 { font-size: 20px; letter-spacing: 0.3px; }
        .content h3 { font-size: 17px; letter-spacing: 0.3px; }
        .content a { color: #D4AF37; font-weight: 600; }
        .content strong { color: #f5f1e6; }
        .content ul, .content ol { margin: 0 0 18px; padding-left: 20px; color: #d8d5cc; }
        .content li { margin-bottom: 8px; line-height: 1.6; }

        /* ---------- button ---------- */
        .btn-wrap { margin: 28px 0 30px; }
        .btn {
          display: inline-block;
          padding: 14px 32px;
          background-color: #D4AF37;
          background-image: linear-gradient(135deg, #C9A227 0%, #D4AF37 50%, #E8C765 100%);
          color: #14120b !important;
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 3px;
          mso-padding-alt: 0;
        }

        /* ---------- footer ---------- */
        .footer { padding: 30px 40px 34px; }
        .footer, .footer p, .footer a {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 12px;
          line-height: 1.8;
          color: #7a7a7a;
        }
        .footer p { margin: 0 0 6px; }
        .footer a { color: #B9963A; font-weight: 600; }
        .footer .legal { color: #4d4d4d; font-size: 11px; margin-top: 14px; }

        /* ---------- responsive ---------- */
        @media only screen and (max-width: 600px) {
          .email-container { width: 100% !important; border-radius: 0 !important; }
          .content { padding: 32px 24px 28px !important; }
          .header-cell { padding: 34px 24px 26px !important; }
          .footer { padding: 26px 24px 28px !important; }
          .logo-img { width: 168px !important; height: auto !important; }
          .btn { display: block !important; text-align: center; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background-color:#0d0d0d;">

      ${
        preheaderText
          ? `<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all; font-size:1px; line-height:1px; color:#0d0d0d;">
              ${preheaderText}${preheaderPadding}
            </div>`
          : ''
      }

      <div role="article" aria-roledescription="email" lang="en" style="background-color:#0d0d0d;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0d0d0d;">
          <tr>
            <td align="center" style="padding: 44px 16px;">

              <!-- ============ CARD ============ -->
              <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0"
                style="width:600px; max-width:600px; background-color:#161616; border:1px solid #2a2a2a; border-radius:10px; overflow:hidden;">

                <!-- ============ HEADER ============ -->
                <!-- Dark ground, exact gold mark — matches the source logo as shipped
                     rather than inverting it into a solid color block. Bulletproof
                     <img> conventions: explicit width/height, display:block, real alt
                     text. See LOGO_TECHNICAL_NOTE above for why this is an <img> and
                     not inline SVG/VML. -->
                <tr>
                  <td class="header-cell" align="center" bgcolor="#111111"
                    style="background-color:#111111; padding:46px 30px 38px; border-radius:10px 10px 0 0;">
                    <img src="cid:${logoCid}" width="212" height="76" alt="AIAN" class="logo-img"
                      style="display:block; margin:0 auto; border:0; outline:none; text-decoration:none; max-width:212px; height:auto;">
                  </td>
                </tr>

                <!-- gold hairline seam between header and content -->
                <tr>
                  <td style="height:2px; line-height:2px; font-size:0; background-color:#D4AF37; background-image:linear-gradient(90deg, #8a6d1f 0%, #D4AF37 25%, #F0D78C 50%, #D4AF37 75%, #8a6d1f 100%);">&nbsp;</td>
                </tr>

                <!-- ============ CONTENT (dynamic) ============ -->
                <tr>
                  <td class="content">
                    ${contentHtml}
                  </td>
                </tr>

                <!-- ============ FOOTER ============ -->
                <tr>
                  <td style="padding:0 40px;">
                    <div style="border-top:1px solid #262626;"></div>
                  </td>
                </tr>
                <tr>
                  <td class="footer" align="center" bgcolor="#161616" style="background-color:#161616; border-radius:0 0 10px 10px;">
                    <p style="color:#9a9a9a; font-weight:600; letter-spacing:0.5px;">AIAN</p>
                    <p>
                      Questions? Reach us at
                      <a href="mailto:support@aian.com">support@aian.com</a>
                    </p>
                    <p>
                      <a href="${frontendUrl}">Dashboard</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${frontendUrl}/settings/notifications">Notification settings</a>
                      &nbsp;&nbsp;·&nbsp;&nbsp;
                      <a href="${frontendUrl}/unsubscribe">Unsubscribe</a>
                    </p>
                    <p class="legal">
                      &copy; ${currentYear} Aian Inc. All rights reserved.<br>
                      This is an automated message — please don't reply directly to this email.
                    </p>
                  </td>
                </tr>

              </table>
              <!-- ============ /CARD ============ -->

            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
}
