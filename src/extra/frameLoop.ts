
export function frameLoop(draw: (now: number, dt: number) => void) {
    let allow = false
    let lastTime = performance.now()
    let frameCount = 0
    let lastFPSTime = lastTime
    const interval = 100

    const display = document.createElement('div')
    display.style.position = 'absolute'
    display.style.top = '0'
    display.style.right = '0'
    display.style.color = 'white'
    display.style.padding = '0.3em'
    display.style.fontFamily = 'Courier New, monospace'
    display.style.fontSize = '12px'
    display.style.backgroundColor = 'rgba(0,0,0,1)'
    display.textContent = 'FPS: 00.0'
    document.body.appendChild(display)

    function loop() {
        if (!allow) return
        const now = performance.now()
        const deltaMs = (now - lastTime)
        lastTime = now
        frameCount++
        draw(now * 0.001, deltaMs * 0.001)
        
        // Update FPS display every interval
        if (now - lastFPSTime >= interval) {
            const frames = frameCount / (now - lastFPSTime) * 1000
            display.textContent = `FPS: ${frames.toFixed(1)}`
            lastFPSTime = now
            frameCount = 0
        }
        requestAnimationFrame(loop)
    }

    function start() {
        allow = true
        loop()
    }

    function stop() {
        allow = false
    }
    
    return { start, stop }
}
