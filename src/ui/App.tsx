export function App({ role }: { role: string | null }) {
  return <div>role: {role ?? 'none'}</div>;
}
