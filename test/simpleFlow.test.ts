import { generateGraph } from "../src/flow"

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



    const graph = generateGraph<MyContext>()
      .register("STEP1", multiplyBy2)
      .continuedBy("STEP2", addedBy1)

    const ctx = { log: [] }

    // when
    const result = await graph.generateStream("STEP1", "STEP2").run(3, ctx)

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

    const graph = generateGraph<MyContext>()
      .register("STEP1", multiplyBy3)
      .continuedBy("STEP2", addedBy2)
      .stopped().when("STEP3", (x: number, ctx: MyContext) => {
        if (x > 10) {
          ctx.log.push(`STOPPED!: ${x} is greater than 10`)
          return Promise.resolve(true)
        }
        ctx.log.push(`NOT STOPPED!: ${x} is NOT greater than 10`)
        return Promise.resolve(false)
      })
      .continuedBy("STEP4", addedBy10)
      .continuedBy("STEP5", addedBy2)


    const flow = graph.generateStream("STEP1", "STEP5")
    // when
    let ctx = { log: [] }
    let func = async () => {
      await flow.run(5, ctx)
    }
    // then
    await expect(func).rejects.toThrow()
    expect(ctx.log).toEqual([
      "MULTIPLY BY 3, 5 becomes 15",
      "ADDED BY 2, 15 becomes 17",
      "STOPPED!: 17 is greater than 10"
    ])

    // when
    ctx = { log: [] }
    const result = await flow.run(2, ctx)
    // then
    await expect(result).toEqual(20)
    console.log(ctx.log)
    expect(ctx.log).toEqual([
      "MULTIPLY BY 3, 2 becomes 6",
      "ADDED BY 2, 6 becomes 8",
      "NOT STOPPED!: 8 is NOT greater than 10",
      "ADDED BY 10, 8 becomes 18",
      "ADDED BY 2, 18 becomes 20",
    ])

  })
})