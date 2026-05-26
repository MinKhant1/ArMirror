import { FONTS, QR_RESET_MS, UI_COLORS } from '../config';

type Props = {
  artworkUrl: string | null;
  qrDataUrl: string | null;
  qrShownAt: number | null;
  onReset: () => void;
};

export function QrScreen({ artworkUrl, qrDataUrl, onReset }: Props) {
  return (
    <div className="wild-four__screen wild-four__qr">
      {artworkUrl && (
        <img src={artworkUrl} alt="Captured" className="wild-four__qr-thumb" />
      )}
      {qrDataUrl && <img src={qrDataUrl} alt="QR code" className="wild-four__qr-code" />}
      <p className="wild-four__subtitle" style={{ fontFamily: FONTS.body }}>
        Scan to save your photo
      </p>
      <button type="button" className="wild-four__btn" onClick={onReset}>
        New game
      </button>
      <p className="wild-four__hint" style={{ color: UI_COLORS.textMuted }}>
        Auto-reset in {QR_RESET_MS / 1000}s
      </p>
    </div>
  );
}
