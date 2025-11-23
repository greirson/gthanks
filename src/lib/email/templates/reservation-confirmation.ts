export function getReservationConfirmationEmail(data: {
  userName: string;
  wishTitle: string;
  ownerName: string;
  productUrl?: string;
}) {
  return `
Hi ${data.userName}!

You've reserved "${data.wishTitle}" for ${data.ownerName}.

${data.productUrl ? `Buy it here: ${data.productUrl}\n\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

View all your reservations anytime:
https://gthanks.app/reservations

(You'll be prompted to login if needed)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Questions? Reply to this email.

- The gthanks Team
`.trim();
}
