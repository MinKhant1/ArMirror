import { CAPTURE_COUNTDOWN_SEC, FONTS, ANIMAL_CONFIG } from '../config';

type Props = { countdown: number | null };

export function CaptureScreen({ countdown }: Props) {
  if (countdown == null) return null;
  const colors = Object.values(ANIMAL_CONFIG).map((c) => c.color);
  const idx = (CAPTURE_COUNTDOWN_SEC - countdown) % colors.length;

  return (
    <div className="wild-four__capture-ui">
      <p className="wild-four__capture-prompt" style={{ fontFamily: FONTS.display }}>
        Strike your pose...
      </p>
      {countdown > 0 && (
        <span
          className="wild-four__capture-num"
          style={{ fontFamily: FONTS.display, color: colors[idx] }}
        >
          {countdown}
        </span>
      )}
    </div>
  );
}
