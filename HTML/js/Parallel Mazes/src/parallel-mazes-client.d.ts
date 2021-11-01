import { Coord, Move } from "./type";
export declare const ON_MODULE_CONNECTED_EVENT = "connected_to_game";
export declare const ON_MODULE_MOVED_EVENT = "module_moved";
export interface OnModuleConnectedEventData {
    game_id: string;
    expert_id: string;
    module_maze: number[][];
    expert_pos: Coord;
    expert_finish: Coord;
    move: Move;
}
export interface OnModuleMovedEventData {
    game_id: string;
    move: Move;
    strike: boolean;
}
export declare class ParallelMazesClient {
    private ws;
    connect(): Promise<void>;
    createGame(): Promise<{
        gameId: string;
        moduleKey: string;
    }>;
    loginExpert(gameId: string): Promise<{
        pass: string;
    }>;
    makeAMove(gameId: string, direction: string): Promise<{
        move: Move;
        new_pos: Coord;
        strike: false;
    } | {
        move: Move;
        strike: true;
    }>;
    private call;
    onModuleConnected(f: (data: OnModuleConnectedEventData) => unknown): Promise<void>;
    onModuleMoved(f: (data: OnModuleMovedEventData) => unknown): Promise<void>;
    private pingJob;
}
