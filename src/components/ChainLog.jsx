import React, { useMemo } from 'react'

export default function ChainLog({ entries = [], onClear, onClose, max = 200 }) {
  const shown = useMemo(() => {
    const slice = entries.slice(-max)
    return [...slice].reverse()
  }, [entries, max])

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <strong>Chain Logs</strong>
        <div style={styles.headerActions}>
          <button onClick={onClear} style={styles.button}>Clear</button>
          <button onClick={onClose} style={styles.button}>Close</button>
        </div>
      </div>
      <div style={styles.body}>
        {shown.length === 0 && (
          <div style={styles.empty}>No logs</div>
        )}
        {shown.map((e, idx) => (
          <div key={idx} style={rowStyle(e)}>
            <div style={styles.rowTop}>
              <span style={styles.time}>{formatTime(e.time)}</span>
              <span style={styles.action}>{e.action}</span>
              <span style={styles.status(e.status)}>{e.status}</span>
              {e.digest && <span style={styles.meta}>digest: {truncate(e.digest)}</span>}
            </div>
            <div style={styles.metaLine}>
              {e.error ? (
                <span style={styles.error}>error: {e.error}</span>
              ) : (
                <span style={styles.metaSmall}>{compactMeta(e)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTime(iso) {
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString()
  } catch { return String(iso || '') }
}

function truncate(s, len = 24) {
  const str = String(s || '')
  return str.length > len ? str.slice(0, len - 3) + '...' : str
}

function compactMeta(e) {
  const omit = new Set(['level', 'action', 'status', 'time', 'digest', 'error'])
  const rest = Object.fromEntries(Object.entries(e || {}).filter(([k]) => !omit.has(k)))
  const keys = Object.keys(rest)
  if (!keys.length) return ''
  return keys.map((k) => `${k}: ${String(rest[k])}`).join('  ')
}

function rowStyle(e) {
  const status = e?.status || ''
  let border = '#333'
  if (status === 'success') border = '#2e7d32'
  else if (status === 'error') border = '#c62828'
  else if (status === 'start') border = '#1565c0'
  else if (status.startsWith && status.startsWith('retry')) border = '#ef6c00'
  return { ...styles.row, borderLeft: `4px solid ${border}` }
}

const styles = {
  wrapper: {
    position: 'fixed',
    right: 12,
    bottom: 12,
    width: 420,
    maxHeight: '60vh',
    background: 'rgba(0,0,0,0.9)',
    color: '#eee',
    border: '1px solid #444',
    borderRadius: 8,
    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderBottom: '1px solid #333',
  },
  headerActions: { display: 'flex', gap: 8 },
  button: {
    background: '#222',
    color: '#ddd',
    border: '1px solid #555',
    borderRadius: 4,
    padding: '4px 8px',
    cursor: 'pointer',
  },
  body: {
    overflowY: 'auto',
    padding: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  empty: { opacity: 0.7, padding: 8 },
  row: {
    background: '#111',
    border: '1px solid #2a2a2a',
    borderRadius: 6,
    padding: '6px 8px',
  },
  rowTop: { display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' },
  time: { fontFamily: 'monospace', opacity: 0.8 },
  action: { fontWeight: 600 },
  status: (s) => ({
    fontFamily: 'monospace',
    color: s === 'success' ? '#7dd97d' : s === 'error' ? '#ff7b7b' : s === 'start' ? '#90caf9' : '#f6c56b',
  }),
  meta: { fontFamily: 'monospace', opacity: 0.8 },
  metaSmall: { fontFamily: 'monospace', opacity: 0.7 },
  metaLine: { marginTop: 4 },
  error: { color: '#ff7b7b', fontFamily: 'monospace' },
}


