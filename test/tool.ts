
export function generateMultiplyBy(multiplier: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i * multiplier
    ctx.log.push(`MULTIPLiED BY ${multiplier}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}
export function generateAddedBy(adder: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i + adder
    ctx.log.push(`ADDED BY ${adder}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}
export function generateSubtractedBy(subtractor: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i - subtractor
    ctx.log.push(`SUBTRACTED BY ${subtractor}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}
export function generateDividedBy(divider: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i / divider
    ctx.log.push(`DIVIDED BY ${divider}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}


export type MyContext = {
  log: string[]
}
