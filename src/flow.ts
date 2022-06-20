import { ICursor, IFlowGraph, IFlowNode, IMergeable, IStream, IWhenable, NextNodeKeyDecider, NextNodeKeyDeciderWithDefault, OutputChecker, Process } from "./types"

export class ProcessNode<TCtx, TIn, TOut> implements IFlowNode<TCtx, TIn, TOut> {
    defaultKey?: string
    process: Process<TCtx, TIn, TOut>
    keyDecider: NextNodeKeyDeciderWithDefault<TCtx, TOut>

    constructor(process: Process<TCtx, TIn, TOut>, keyDecider: NextNodeKeyDeciderWithDefault<TCtx, TOut>) {
        this.process = process
        this.keyDecider = keyDecider
    }

    getNextKey(out: TOut, ctx?: TCtx | undefined): Promise<string | null> {
        return this.keyDecider(out, ctx, this.defaultKey)
    }
    getProcess(): Process<TCtx, TIn, TOut> {
        return this.process
    }
    setDefaultNextKey(key: string): void {
        this.defaultKey = key
    }
}

class NormalProcessNode<TCtx, TIn, TOut> extends ProcessNode<TCtx, TIn, TOut> {
    constructor(process: Process<TCtx, TIn, TOut>) {
        super(process, async (out: TOut, ctx?: TCtx, defaultKey?: string) => {
            return defaultKey || null
        })
    }
}

class SwitchingNode<TCtx, TOut> extends ProcessNode<TCtx, TOut, TOut> {
    constructor(decider: NextNodeKeyDecider<TCtx, TOut>) {
        super(async x => x, async (out: TOut, ctx?: TCtx, defaultKey?: string) => {
            const key = await decider(out, ctx)
            if(key){
                return key
            }
            return defaultKey || null
        })
    }
}


class StopperNode<TCtx, TOut> extends ProcessNode<TCtx, TOut, TOut> {
    constructor(checker: OutputChecker<TCtx, TOut>) {
        super(async x => x, async (out: TOut, ctx?: TCtx, defaultKey?: string) => {
            const mustStop = await checker(out, ctx)
            if(mustStop){
                throw new Error("Process Stopped")
            }
            return defaultKey || null
        })
    }
}

class AlteredNode<TCtx, TOut> extends ProcessNode<TCtx, TOut, TOut> {
    constructor(alternativeKey: string, checker: OutputChecker<TCtx, TOut>) {
        super(async x => x, async (out: TOut, ctx?: TCtx, defaultKey?: string) => {
            const isAltered = await checker(out, ctx)
            if(isAltered){
                return alternativeKey
            }
            return defaultKey || null
        })
    }
}



class Cursor<TCtx, TOut> implements ICursor<TCtx, TOut> {
    graph: IFlowGraph<TCtx>
    key: string
    private getNode(): IFlowNode<TCtx, unknown, TOut> {
        return this.graph.get<unknown, TOut>(this.key)
    }
    constructor(graph: IFlowGraph<TCtx>, key: string) {
        this.graph = graph
        this.key = key
    }
    generateStream<TStart>(fromKey: string, toKey?: string): IStream<TCtx, TStart, TOut> {
        toKey = toKey || this.key
        return this.graph.generateStream<TStart, TOut>(fromKey, toKey)
    }
    continuedBy<TNextOut>(nextKey: string, process: Process<TCtx, TOut, TNextOut>): ICursor<TCtx, TNextOut> {
        this.graph.register<TOut, TNextOut>(nextKey, process)
        const node = this.getNode()
        node.setDefaultNextKey(nextKey)
        return this.graph.from<TNextOut>(nextKey)
    }
    switches(nextKey: string, decider: NextNodeKeyDecider<TCtx, TOut>) {
        this.graph.registerAll({
            [nextKey]: new SwitchingNode(decider)
        })
        const node = this.getNode()
        node.setDefaultNextKey(nextKey)
        return this.graph
    }
    trySwitchingTo(key: string, decider: NextNodeKeyDecider<TCtx, TOut>): ICursor<TCtx, TOut> {
        this.graph.registerAll({
            [key]: new SwitchingNode(decider)
        })
        const node = this.getNode()
        node.setDefaultNextKey(key)
        return this.graph.from<TOut>(key)
    }
    tryAlteringTo(alternativeKey: string): IWhenable<TCtx, TOut>{
        return {
            when: (nextKey: string, checker:  OutputChecker<TCtx, TOut>): ICursor<TCtx, TOut> => {
                this.graph.registerAll({
                    [nextKey]: new AlteredNode(alternativeKey, checker)
                })
                const node = this.getNode()
                node.setDefaultNextKey(nextKey)
                return this.graph.from<TOut>(nextKey)        
            }
        }
    }

    fork(key: string, record: Record<string, IStream<TCtx, TOut, unknown>>): IMergeable<TCtx>{                
        return {
            merge: <TNextOut,>(onMerge: (results: Record<string, Promise<any>>, ctx?: TCtx) => Promise<TNextOut>): ICursor<TCtx, TNextOut>  => {
                const process: Process<TCtx, TOut, TNextOut> = async (input: TOut, ctx?: TCtx) => {
                    const results: Record<string, Promise<any>> = {}
                    Object.keys(record).map(key => {
                        results[key] = record[key].run(input, ctx)
                    })
                    return await onMerge(results)
                } 
                this.graph.registerAll({
                    [key]: new NormalProcessNode(process)
                })
                const node = this.getNode()
                node.setDefaultNextKey(key)
                return this.graph.from<TNextOut>(key)  
            }        
        }        
    }


    stopped(): IWhenable<TCtx, TOut>{
        return {
            when: (nextKey: string, checker:  OutputChecker<TCtx, TOut>): ICursor<TCtx, TOut> => {
                this.graph.registerAll({
                    [nextKey]: new StopperNode(checker)
                })
                const node = this.getNode()
                node.setDefaultNextKey(nextKey)
                return this.graph.from<TOut>(nextKey)
            }
        }
    }    
}

class Stream<TCtx, TStart, TEnd> implements IStream<TCtx, TStart, TEnd>{
    fromKey: string
    toKey: string
    graph: IFlowGraph<TCtx>
    constructor(fromKey: string, toKey: string, graph: IFlowGraph<TCtx>) {
        this.fromKey = fromKey
        this.toKey = toKey
        this.graph = graph
    }

    async run(input: TStart, ctx?: TCtx): Promise<TEnd> {
        let processOutput: any = input
        let nextKey: string | null = this.fromKey
        const runSafely = async () => {
            if (nextKey == null) {
                return
            }
            try {
                const node: IFlowNode<TCtx> = this.graph.get(nextKey)
                processOutput = await node.getProcess()(processOutput, ctx)
                nextKey = await node.getNextKey(processOutput, ctx)
            } catch (e: any) {
                throw new Error("Exception while running the stream:" + (e ? e.message : e))
            }

        }
        while (nextKey !== this.toKey) {
            await runSafely()
            if(nextKey == null){
                break
            }
        }
        if (nextKey == this.toKey) {
            await runSafely()
        }
        return processOutput as TEnd
    }

}


class FlowGraph<TCtx> implements IFlowGraph<TCtx>{

    dict: Record<string, IFlowNode<TCtx>>
    constructor() {
        this.dict = {}
    }
    from<TOut>(key: string): ICursor<TCtx, TOut> {
        return new Cursor(this, key)
    }

    generateStream<TStart, TEnd = any>(fromKey: string, toKey: string): IStream<TCtx, TStart, TEnd> {
        return new Stream(fromKey, toKey, this)
    }
    registerAll(records: Record<string, IFlowNode<TCtx>>): void {
        Object.keys(records).forEach(key => {
            this.dict[key] = records[key]
        })
    }
    register<TIn, TOut>(key: string, process: Process<TCtx, TIn, TOut>): ICursor<TCtx, TOut> {
        this.dict[key] = new NormalProcessNode(process)
        return new Cursor(this, key)
    }
    connect(fromKey: string, toKey: string): void {
        const fromNode = this.get(fromKey)
        fromNode.setDefaultNextKey(toKey)
    }
    get<TIn, TOut>(key: string): IFlowNode<TCtx, TIn, TOut> {
        const flow = this.dict[key]
        if (!flow) {
            throw new Error("Not Found")
        }
        return flow
    }
}

export function generateGraph<TCtx>():IFlowGraph<TCtx> {
    return new FlowGraph<TCtx>()
}
