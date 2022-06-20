export type Process<TCtx, TIn, TOut> = (input: TIn, ctx?: TCtx) => Promise<TOut>
export type NextNodeKeyDecider<TCtx, TOut> = (out: TOut, ctx?: TCtx) => Promise<string | null>
export type NextNodeKeyDeciderWithDefault<TCtx, TOut> = (out: TOut, ctx?: TCtx, defaultKey?: string) => Promise<string | null>
export type OutputChecker<TCtx, TOut> = (out: TOut, ctx?: TCtx) => Promise<boolean>
export interface IFlowNode<TCtx = any, TIn = any, TOut = any> {
    getNextKey(out: TOut, ctx?: TCtx): Promise<string | null>
    getProcess(): Process<TCtx, TIn, TOut>
    setDefaultNextKey(key: string): void    
}
export interface IWhenable<TCtx, TOut> {
    when(key: string, condition: OutputChecker<TCtx, TOut>): ICursor<TCtx, TOut>
}
export interface IMergeable<TCtx> {
    merge<TOut>(onMerge: (r: Record<string, Promise<any>>, ctx?: TCtx) => Promise<TOut>): ICursor<TCtx, TOut>
} 

export interface ICursor<TCtx, TOut> {
    continuedBy<TNextOut>(key: string, process: Process<TCtx, TOut, TNextOut>): ICursor<TCtx, TNextOut>
    switches(key: string, decider: NextNodeKeyDecider<TCtx, TOut>): void
    stopped(): IWhenable<TCtx, TOut>
    generateStream<TStart>(fromKey: string, toKey?: string): IStream<TCtx, TStart, TOut>
    tryAlteringTo(alternativeKey: string): IWhenable<TCtx, TOut>
    trySwitchingTo(key: string, decider: NextNodeKeyDecider<TCtx, TOut>): ICursor<TCtx, TOut> 
    fork(key: string, record: Record<string, IStream<TCtx, TOut, unknown>>): IMergeable<TCtx>
}

export interface IFlowGraph<TCtx> {
    generateStream<TStart, TEnd = any>(fromKey: string, toKey: string): IStream<TCtx, TStart, TEnd>
    registerAll(records: Record<string, IFlowNode<TCtx>>): void
    connect(fromKey: string, toKey: string): void
    get<TIn, TOut>(key: string): IFlowNode<TCtx, TIn, TOut>
    register<TIn, TOut>(key: string, process: Process<TCtx, TIn, TOut>): ICursor<TCtx, TOut>
    from<TOut>(key: string): ICursor<TCtx, TOut>
}



export interface IStream<TCtx, A, B> {
    run: Process<TCtx, A, B>
}