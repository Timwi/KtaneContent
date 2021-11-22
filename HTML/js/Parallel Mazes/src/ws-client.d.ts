import { Json } from "./type";
export declare class WSClient {
    readonly url: string;
    get socket(): WebSocket;
    get whenConnected(): Promise<void>;
    private _socket;
    private nextRequestId;
    private connectionPromise;
    private onConnect;
    private callHandlers;
    private eventHandlers;
    constructor(url: string);
    connect(): Promise<void | null>;
    call<TResult = unknown>(method: string, args: Json): Promise<TResult>;
    onEvent<TResult = unknown>(event: string, handler: (data: TResult) => any): Promise<void>;
    removeEventHandler(event: string, handler: (data: unknown) => any): Promise<void>;
}
