
// TODO: allow debug builds without this code

export function prettyConsole(log: string, source: string, isTrimmed: boolean) {
    const trim = (s: string) => (s.match(/^\s*/)?.[0] || '').split('\n').at(-1) || ''
    const errors = log.split('\n').map(x => x.trim()).filter(Boolean).map(e => {
        const match = e.match(/ERROR:\s*(\d+):(\d+): '([^']+)' : (.*)/)
        return {
            line: match?.[2] ? +match[2] - 1 : -1,
            term: match?.[3] || '',
            message: match?.[4] || ''
        }
    })
    const errorByLine = new Map(errors.map(e => [e.line, e]))
    const size = 10
    const ranges = errors.map(e => [e.line - size - 1, e.line + size + 1])
    const ellipRanges = errors.map(e => [e.line - size, e.line + size])
    const style = 'font-weight:normal; font-size:0.95em;'
    const lineNumberStyle = style + 'color:#b3b3b3;'
    const codeStyle = style + 'color:#525151;'
    const errorStyle = style + 'color:#C72B4F; font-weight:500;'
    const caretStyle = style + 'font-style:italic; color:#F31D4F; font-weight:bold;'
    const trimmedSpaces = isTrimmed ? trim(source) : source
    const output: string[] = []
    const styles: string[] = []
    const inRange = (line: number, list: number[][]) => list.some(([a, b]) => line >= a && line <= b)
    const sourceLines = source.trimStart().split('\n')
    const lineNumbers = sourceLines.map((_, i) => (i + 1 + '').padStart(3, ' '))
    for (const [i, line] of sourceLines.entries()) {
        if (!inRange(i, ranges)) continue
        const error = errorByLine.get(i)
        let code = isTrimmed && line.startsWith(trimmedSpaces) ? line.slice(trimmedSpaces.length) : line
        const inEllip = inRange(i, ellipRanges)
        const inPrevEllip = inRange(i - 1, ellipRanges)
        if (!inEllip && !inPrevEllip) continue
        if (!inEllip) code = '...'
        styles.push(lineNumberStyle)
        if (error) {
            let errorPos = code.indexOf(error.term)
            if (errorPos < 0 && error.term === 'constructor') errorPos = code.indexOf('(')
            if (errorPos < 0) errorPos = (code.match(/^\s*/)?.[0] || '').length
            styles.push(errorStyle, caretStyle)
            output.push(`%c${lineNumbers[i]}  %c${code}%c\n     ${' '.repeat(errorPos)}^${error.message}`)
        } else {
            styles.push(codeStyle)
            output.push(`%c${lineNumbers[i]}  %c${code}`)
        }
    }
    return [output.join('\n'), ...styles]
}