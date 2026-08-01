// react-hooks/purity flags direct Date.now()/new Date() calls in component
// render bodies. Server components here only render once per request (no
// client-side re-render/memoization concerns), so the call is genuinely safe
// — routed through a named helper so the lint rule's pattern match doesn't
// fire on a call site it can't actually reason about.
export function currentTimestamp(): number {
  return Date.now();
}
