/**
 * Common email styles shared across all templates
 * These styles ensure consistent branding and appearance
 */
const commonStyles = `
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
  .header { background-color: #1a1a1a; color: white; padding: 20px; text-align: center; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { padding: 30px 20px; max-width: 600px; margin: 0 auto; }
  .footer { background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #666; }
  .highlight { padding: 15px; border-left: 4px solid; margin: 20px 0; }
  .highlight-success { background-color: #e8f5e8; border-color: #28a745; }
  .highlight-info { background-color: #e8f4fd; border-color: #007bff; }
  .highlight-warning { background-color: #fff3e0; border-color: #ff9800; }
  .track-info { background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
  .track-info h3 { margin-top: 0; color: #1a1a1a; }
`;

/**
 * Email template configuration - makes content easily editable
 */
const EMAIL_CONFIG = {
  labelName: 'Collecting Dots Records',
  
  // Liked email content
  liked: {
    subject: (trackTitle: string) => `Your Demo Has Caught Our Attention - ${trackTitle}`,
    heading: '🎵 Your Demo Has Caught Our Attention!',
    intro: (artistName: string, trackTitle: string) => 
      `Dear ${artistName}, we wanted to reach out and let you know that your demo "<strong>${trackTitle}</strong>" has caught the attention of our A&R team.`,
    body: `Your track has been forwarded for further review, which means it stood out among the many submissions we receive. This is an exciting step in our review process!`,
    nextSteps: `Our team is currently evaluating your submission more closely. If your track aligns with our upcoming release schedule and vision, we'll be in touch with next steps.`,
    closing: 'Keep creating amazing music!',
  },
  
  // Rejected email content
  rejected: {
    subject: (trackTitle: string) => `Demo Review Update - ${trackTitle}`,
    heading: 'Thank You for Your Submission',
    intro: (artistName: string, trackTitle: string) => 
      `Dear ${artistName}, thank you for sharing your demo "<strong>${trackTitle}</strong>" with us.`,
    body: `After careful consideration, we've decided that this particular track doesn't quite fit our current release plans. This decision reflects our specific focus right now and is not a judgment on your talent or the quality of your music.`,
    encouragement: `We genuinely appreciate artists who take the time to share their work with us. The music industry is full of success stories that began with persistence and continued growth.`,
    invitation: `We encourage you to continue developing your sound and to submit again in the future. Our taste and needs evolve, and what doesn't fit today might be perfect tomorrow.`,
    closing: 'Wishing you all the best in your musical journey.',
  },
  
  // Final approval email content
  approved: {
    subject: (trackTitle: string) => `Congratulations! Your Demo Has Been Selected - ${trackTitle}`,
    heading: '🎉 Congratulations! Your Demo Has Been Selected!',
    intro: (artistName: string, trackTitle: string) => 
      `Dear ${artistName}, we are thrilled to inform you that your demo "<strong>${trackTitle}</strong>" has been officially selected by our label!`,
    body: `This is a significant milestone, and we're excited about the possibility of working together. Your track resonated with our team and we believe it could be a great addition to our catalog.`,
    nextSteps: [
      'A member of our team will reach out to you shortly via email',
      'We\'ll discuss potential release plans and partnership details',
      'Please keep an eye on your inbox for our follow-up message',
    ],
    closing: 'Welcome to the Collecting Dots family!',
  },
};

interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Generate email for when a demo is liked/forwarded for review
 */
export function getDemoLikedEmail(
  artistName: string,
  trackTitle: string,
  demoId: string
): EmailTemplate {
  const config = EMAIL_CONFIG.liked;
  const labelName = EMAIL_CONFIG.labelName;
  
  const subject = config.subject(trackTitle);
  
  const htmlBody = `
    <html>
    <head><style>${commonStyles}</style></head>
    <body>
      <div class="header">
        <h1>${labelName}</h1>
      </div>
      <div class="content">
        <h2>${config.heading}</h2>
        <p>${config.intro(artistName, trackTitle)}</p>
        <div class="track-info">
          <h3>📀 Track Details</h3>
          <p><strong>Artist:</strong> ${artistName}</p>
          <p><strong>Track:</strong> ${trackTitle}</p>
        </div>
        <p>${config.body}</p>
        <div class="highlight highlight-info">
          <h3>📋 What Happens Next?</h3>
          <p>${config.nextSteps}</p>
        </div>
        <p>${config.closing}</p>
        <p>Best regards,<br><strong>${labelName} Team</strong></p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${labelName}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
${labelName}

${config.heading}

${config.intro(artistName, trackTitle).replace(/<[^>]*>/g, '')}

Track Details:
• Artist: ${artistName}
• Track: ${trackTitle}

${config.body}

What Happens Next?
${config.nextSteps}

${config.closing}

Best regards,
${labelName} Team

© ${new Date().getFullYear()} ${labelName}. All rights reserved.
  `.trim();

  return { subject, htmlBody, textBody };
}

/**
 * Generate email for when a demo is rejected
 */
export function getDemoRejectedEmail(
  artistName: string,
  trackTitle: string,
  demoId: string
): EmailTemplate {
  const config = EMAIL_CONFIG.rejected;
  const labelName = EMAIL_CONFIG.labelName;
  
  const subject = config.subject(trackTitle);
  
  const htmlBody = `
    <html>
    <head><style>${commonStyles}</style></head>
    <body>
      <div class="header">
        <h1>${labelName}</h1>
      </div>
      <div class="content">
        <h2>${config.heading}</h2>
        <p>${config.intro(artistName, trackTitle)}</p>
        <div class="track-info">
          <h3>📀 Track Details</h3>
          <p><strong>Artist:</strong> ${artistName}</p>
          <p><strong>Track:</strong> ${trackTitle}</p>
        </div>
        <p>${config.body}</p>
        <div class="highlight highlight-warning">
          <h3>💪 Keep Going!</h3>
          <p>${config.encouragement}</p>
        </div>
        <p>${config.invitation}</p>
        <p>${config.closing}</p>
        <p>Warm regards,<br><strong>${labelName} Team</strong></p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${labelName}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
${labelName}

${config.heading}

${config.intro(artistName, trackTitle).replace(/<[^>]*>/g, '')}

Track Details:
• Artist: ${artistName}
• Track: ${trackTitle}

${config.body}

Keep Going!
${config.encouragement}

${config.invitation}

${config.closing}

Warm regards,
${labelName} Team

© ${new Date().getFullYear()} ${labelName}. All rights reserved.
  `.trim();

  return { subject, htmlBody, textBody };
}

/**
 * Generate email for when a demo is finally approved/selected
 */
export function getDemoApprovedEmail(
  artistName: string,
  trackTitle: string,
  demoId: string
): EmailTemplate {
  const config = EMAIL_CONFIG.approved;
  const labelName = EMAIL_CONFIG.labelName;
  
  const subject = config.subject(trackTitle);
  
  const nextStepsHtml = config.nextSteps.map(step => `<li>${step}</li>`).join('\n');
  const nextStepsText = config.nextSteps.map(step => `• ${step}`).join('\n');
  
  const htmlBody = `
    <html>
    <head><style>${commonStyles}</style></head>
    <body>
      <div class="header">
        <h1>${labelName}</h1>
      </div>
      <div class="content">
        <h2>${config.heading}</h2>
        <p>${config.intro(artistName, trackTitle)}</p>
        <div class="track-info">
          <h3>📀 Track Details</h3>
          <p><strong>Artist:</strong> ${artistName}</p>
          <p><strong>Track:</strong> ${trackTitle}</p>
        </div>
        <p>${config.body}</p>
        <div class="highlight highlight-success">
          <h3>📋 Next Steps</h3>
          <ul>
            ${nextStepsHtml}
          </ul>
        </div>
        <p>${config.closing}</p>
        <p>Best regards,<br><strong>${labelName} Team</strong></p>
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} ${labelName}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textBody = `
${labelName}

${config.heading}

${config.intro(artistName, trackTitle).replace(/<[^>]*>/g, '')}

Track Details:
• Artist: ${artistName}
• Track: ${trackTitle}

${config.body}

Next Steps:
${nextStepsText}

${config.closing}

Best regards,
${labelName} Team

© ${new Date().getFullYear()} ${labelName}. All rights reserved.
  `.trim();

  return { subject, htmlBody, textBody };
}

