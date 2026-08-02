import * as React from "react"

const MOBILE_BREAKPOINT = 768

function subscribeToMediaQuery(callback: () => void) {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  mql.addEventListener("change", callback)
  return () => mql.removeEventListener("change", callback)
}

function getIsMobileSnapshot() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

function getIsMobileServerSnapshot() {
  return false
}

export function useIsMobile() {
  return React.useSyncExternalStore(subscribeToMediaQuery, getIsMobileSnapshot, getIsMobileServerSnapshot)
}
