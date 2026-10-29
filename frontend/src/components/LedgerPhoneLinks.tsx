import { MessageCircle } from 'lucide-react';
import { buildWhatsAppUrl, toWhatsAppNumber } from '../utils/phone';

type LedgerPhoneLinksProps = {
  phone: string | null | undefined;
};

export default function LedgerPhoneLinks({ phone }: LedgerPhoneLinksProps) {
  const displayPhone = phone?.trim();
  if (!displayPhone) return null;

  const digits = displayPhone.replace(/\D/g, '');
  const dialNumber = `${displayPhone.startsWith('+') ? '+' : ''}${digits}`;
  const whatsappNumber = toWhatsAppNumber(displayPhone);

  return (
    <>
      {digits ? (
        <a className="ledger-contact-link" href={`tel:${dialNumber}`} title={`Call ${displayPhone}`} aria-label={`Call ${displayPhone}`}>
          {displayPhone}
        </a>
      ) : (
        <span>{displayPhone}</span>
      )}
      {whatsappNumber ? (
        <>
          {' · '}
          <a
            className="ledger-contact-link ledger-contact-link--whatsapp"
            href={buildWhatsAppUrl(whatsappNumber, '')}
            target="_blank"
            rel="noopener noreferrer"
            title={`WhatsApp ${displayPhone}`}
            aria-label={`WhatsApp ${displayPhone}`}
          >
            <MessageCircle size={14} aria-hidden="true" />
            WhatsApp
          </a>
        </>
      ) : null}
    </>
  );
}
