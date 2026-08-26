const buttonStyle: React.CSSProperties = {
  padding: '2rem 3rem',
  fontSize: '1.5rem',
  border: '2px solid #002c5a',
  borderRadius: 8,
  background: '#fff',
  color: '#002c5a',
  cursor: 'pointer',
};

export function RolePicker() {
  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2rem',
      }}
    >
      <h1 style={{ color: '#002c5a' }}>Judo Scoreboard</h1>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <a href="?role=panel" style={buttonStyle}>Control panel</a>
        <a href="?role=scoreboard" style={buttonStyle}>Scoreboard</a>
      </div>
      <p style={{ maxWidth: 460, textAlign: 'center', color: '#555' }}>
        Open the control panel here and the scoreboard in a second tab, then drag
        that tab to the display facing the hall.
      </p>
    </div>
  );
}
