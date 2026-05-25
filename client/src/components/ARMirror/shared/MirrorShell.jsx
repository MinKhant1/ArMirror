export function MirrorShell({ videoRef, canvasRef, bgRef, status, error, hint, children }) {
  return (
    <div className="ar-mirror">
      <video ref={videoRef} className="ar-mirror__video" playsInline muted />
      {bgRef && <div ref={bgRef} className="ar-mirror__three" />}
      <canvas ref={canvasRef} className="ar-mirror__composite" />
      {children}
      {status === 'loading' && (
        <div className="ar-mirror__overlay-msg">
          <div className="ar-mirror__spinner" />
          <p>Loading AI models &amp; camera…</p>
        </div>
      )}
      {status === 'ready' && hint && <div className="ar-mirror__hint-bar">{hint}</div>}
      {status === 'error' && (
        <div className="ar-mirror__overlay-msg ar-mirror__overlay-msg--error">
          <p>{error}</p>
          <p className="ar-mirror__hint">Allow camera access and use HTTPS or localhost.</p>
        </div>
      )}
    </div>
  );
}
