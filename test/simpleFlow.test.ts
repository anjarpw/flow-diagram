import { generateFlow } from "../src/flow"

type MyContext = {
  log: string[]
}

function generateMultiplyBy(multiplier: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i * multiplier
    ctx.log.push(`MULTIPLY BY ${multiplier}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}
function generateAddedBy(adder: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i + adder
    ctx.log.push(`ADDED BY ${adder}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}
function generateSubtractedBy(subtractor: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i - subtractor
    ctx.log.push(`SUBTRACTED BY ${subtractor}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}
function generateDividedBy(divider: number) {
  return (i: number, ctx: MyContext) => {
    const newVal = i / divider
    ctx.log.push(`DIVIDED BY ${divider}, ${i} becomes ${newVal}`)
    return Promise.resolve(newVal)
  }
}

describe('My work', () => {
  test('Simple Flow', async () => {
    // given
    const multiplyBy2 = generateMultiplyBy(2)
    const addedBy1 = generateAddedBy(1)



    const flow = generateFlow<number, MyContext>()
      .continuedBy(multiplyBy2)
      .continuedBy(addedBy1)

    const ctx = { log: [] }

    // when
    const result = await flow.startWith(3, ctx)

    // then
    expect(result).toEqual(7)
    expect(ctx.log).toEqual([
      "MULTIPLY BY 2, 3 becomes 6",
      "ADDED BY 1, 6 becomes 7"
    ])
  })

  test('Simple Flow With Check', async () => {
    // given

    const multiplyBy3 = generateMultiplyBy(3)
    const addedBy2 = generateAddedBy(2)
    const addedBy10 = generateAddedBy(10)

    const flow = generateFlow<number, MyContext>()
      .continuedBy(multiplyBy3)
      .continuedBy(addedBy2)
      .stopped().when((x: number, ctx: MyContext) => {
        if (x > 10) {
          ctx.log.push(`STOPPED!: ${x} is greater than 10`)
          return Promise.resolve(true)
        }
        ctx.log.push(`NOT STOPPED!: ${x} is NOT greater than 10`)
        return Promise.resolve(false)
      })
      .continuedBy(addedBy10)
      .continued().when((x: number, ctx: MyContext) => {
        if (x % 2 == 0) {
          ctx.log.push(`CONTINUED!: ${x} is even number`)
          return Promise.resolve(true)
        }
        ctx.log.push(`NOT CONTINUED!: ${x} is NOT even number`)
        return Promise.resolve(false)
      })
      .continuedBy(addedBy2)


    // when
    let ctx = { log: [] }
    let func = async () => {
      await flow.startWith(1, ctx)
    }
    // then
    await expect(func).rejects.toThrow()
    expect(ctx.log).toEqual([
      "MULTIPLY BY 3, 1 becomes 3",
      "ADDED BY 2, 3 becomes 5",
      "NOT STOPPED!: 5 is NOT greater than 10",
      "ADDED BY 10, 5 becomes 15",
      "NOT CONTINUED!: 15 is NOT even number",
    ])

    // when
    ctx = { log: [] }
    const result = await flow.startWith(2, ctx)
    // then
    await expect(result).toEqual(20)
    expect(ctx.log).toEqual([
      "MULTIPLY BY 3, 2 becomes 6",
      "ADDED BY 2, 6 becomes 8",
      "NOT STOPPED!: 8 is NOT greater than 10",
      "ADDED BY 10, 8 becomes 18",
      "CONTINUED!: 18 is even number",
      "ADDED BY 2, 18 becomes 20",
    ])

  })
})