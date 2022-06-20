import { generateGraph } from "../src/flow"
import { generateAddedBy, generateMultiplyBy, generateSubtractedBy, MyContext } from "./tool"

const addedBy1 = generateAddedBy(1)
const subtractBy2 = generateSubtractedBy(2)
const multiplyBy2 = generateMultiplyBy(2)
const addedBy2 = generateAddedBy(2)
const subtractBy1 = generateSubtractedBy(1)

describe('Altered Flow', () => {
  test('Simple Circular Flow', async () => {
    const ctx = { log: [] }
    // given
    const graph = generateGraph<MyContext>()
      .register("STEP1", addedBy2)
      .continuedBy("STEP2", subtractBy1)
      .continuedBy("STEP3", multiplyBy2)
      .tryAlteringTo("STEP1").when("ALTER_A", async (out, ctx) => {
        const isAltered: boolean = out < 30
        if (isAltered) {
          ctx.log.push("RETURN BACK TO STEP1")
        }
        return isAltered
      })
      .continuedBy("STEP4", addedBy1)
      .continuedBy("STEP5", subtractBy2)

    const flow = graph.generateStream("STEP1", "STEP5")

    // when
    const result = await flow.run(3, ctx)

    // then
    expect(result).toEqual(37)
    expect(ctx.log).toEqual([
      "ADDED BY 2, 3 becomes 5",
      "SUBTRACTED BY 1, 5 becomes 4",
      "MULTIPLiED BY 2, 4 becomes 8",
      "RETURN BACK TO STEP1",
      "ADDED BY 2, 8 becomes 10",
      "SUBTRACTED BY 1, 10 becomes 9",
      "MULTIPLiED BY 2, 9 becomes 18",
      "RETURN BACK TO STEP1",
      "ADDED BY 2, 18 becomes 20",
      "SUBTRACTED BY 1, 20 becomes 19",
      "MULTIPLiED BY 2, 19 becomes 38",
      "ADDED BY 1, 38 becomes 39",
      "SUBTRACTED BY 2, 39 becomes 37",

    ])
  })


  test('Branch Circular Flow', async () => {
    const ctx = { log: [] }
    // given
    const graph = generateGraph<MyContext>()
    graph.register("STEP1", addedBy2)
      .trySwitchingTo("SWITCH", async (out, ctx) => {
        if (out < 6) {
          return null
        }
        const path = "PATH" + (1 + (out % 3))
        ctx.log.push("SWITCH TO " + path)
        return path
      })
      .continuedBy("STEP5", subtractBy2)

    graph.register("PATH1", multiplyBy2).continuedBy("PATH1-2", multiplyBy2).continuedTo("STEP5")
    graph.register("PATH2", subtractBy1).continuedBy("PATH2-2", subtractBy1).continuedTo("STEP5")
    graph.register("PATH3", addedBy2).continuedBy("PATH3-2", addedBy2).continuedTo("STEP5")


    const flow = graph.generateStream("STEP1", "STEP5")

    // when
    let result = await flow.run(3, ctx)
    // then
    expect(result).toEqual(3)
    expect(ctx.log).toEqual([
      "ADDED BY 2, 3 becomes 5",
      "SUBTRACTED BY 2, 5 becomes 3",
    ])

    // when
    ctx.log = []
    result = await flow.run(10, ctx)
    console.log(ctx.log)
    // then
    expect(result).toEqual(46)
    expect(ctx.log).toEqual([
      "ADDED BY 2, 10 becomes 12",
      "SWITCH TO PATH1",
      "MULTIPLiED BY 2, 12 becomes 24",
      "MULTIPLiED BY 2, 24 becomes 48",
      "SUBTRACTED BY 2, 48 becomes 46"
    ])

    // when
    ctx.log = []
    result = await flow.run(11, ctx)
    console.log(ctx.log)
    // then
    expect(result).toEqual(9)
    expect(ctx.log).toEqual([
      "ADDED BY 2, 11 becomes 13",
      "SWITCH TO PATH2",
      "SUBTRACTED BY 1, 13 becomes 12",
      "SUBTRACTED BY 1, 12 becomes 11",
      "SUBTRACTED BY 2, 11 becomes 9",
    ])

    // when
    ctx.log = []
    result = await flow.run(12, ctx)
    console.log(ctx.log)
    // then
    expect(result).toEqual(16)
    expect(ctx.log).toEqual([
      "ADDED BY 2, 12 becomes 14",
      "SWITCH TO PATH3",
      "ADDED BY 2, 14 becomes 16",
      "ADDED BY 2, 16 becomes 18",
      "SUBTRACTED BY 2, 18 becomes 16"
    ])

    
  })

})