import { generateGraph } from "../src/flow"
import { generateAddedBy, generateMultiplyBy, MyContext } from "./tool"


const multiplyBy3 = generateMultiplyBy(3)
const addedBy2 = generateAddedBy(2)
const addedBy10 = generateAddedBy(10)

const graph = generateGraph<MyContext>()
  .register("STEP1", multiplyBy3)
  .continuedBy("STEP2", addedBy2)
  .stopped().when("CHECK_A", async (x: number, ctx: MyContext) => {
    const mustStop = x > 10
    if (mustStop) {
      ctx.log.push(`STOPPED!: ${x} is greater than 10`)
    } else {
      ctx.log.push(`NOT STOPPED!: ${x} is NOT greater than 10`)      
    }
    return mustStop    
  })
  .continuedBy("STEP3", addedBy10)
  .stopped().when("CHECK_B",async (x: number, ctx: MyContext) => {
    const mustStop = x % 5 == 0
    if (mustStop) {
      ctx.log.push(`STOPPED!: ${x} is divisible by 5`)
    } else {
      ctx.log.push(`NOT STOPPED!: ${x} is NOT divisible by 5`)      
    }
    return mustStop    
  })
  .continuedBy("STEP4", addedBy2)


describe('Test Checker', () => {

  test('Flow With Check 1', async () => {
    // given
    const flow = graph.generateStream("STEP1", "STEP4")
    // when
    const ctx = { log: [] }
    // then
    await expect(flow.run(5, ctx)).rejects.toThrow()
    expect(ctx.log).toEqual([
      "MULTIPLiED BY 3, 5 becomes 15",
      "ADDED BY 2, 15 becomes 17",
      "STOPPED!: 17 is greater than 10"
    ])

  })

  test('Flow With Check 2', async () => {
    // given
    const flow = graph.generateStream("STEP1", "STEP4")
    // when
    const ctx = { log: [] }
    const result = await flow.run(2, ctx)
    // then
    await expect(result).toEqual(20)
    expect(ctx.log).toEqual([
      "MULTIPLiED BY 3, 2 becomes 6",
      "ADDED BY 2, 6 becomes 8",
      "NOT STOPPED!: 8 is NOT greater than 10",
      "ADDED BY 10, 8 becomes 18",
      "NOT STOPPED!: 18 is NOT divisible by 5",
      "ADDED BY 2, 18 becomes 20",
    ])

  })

  test('Flow With Check 3', async () => {
    // given
    const flow = graph.generateStream("STEP1", "STEP4")
    // when
    const ctx = { log: [] }
    // then
    await expect(flow.run(1, ctx)).rejects.toThrow()
    expect(ctx.log).toEqual([
      "MULTIPLiED BY 3, 1 becomes 3",
      "ADDED BY 2, 3 becomes 5",
      "NOT STOPPED!: 5 is NOT greater than 10",
      "ADDED BY 10, 5 becomes 15",
      "STOPPED!: 15 is divisible by 5",
    ])

  })
})