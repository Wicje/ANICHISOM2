import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    // Instead of calling setState directly in the effect body, 
    // we queue it as a microtask or just use setTimeout to break the synchronous chain.
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    
    // Schedule initial check
    setTimeout(() => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }, 0)

    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
