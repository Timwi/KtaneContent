export declare class MazeMap {
    readonly tableId: string;
    readonly table: HTMLElement;
    data: number[][];
    cells: HTMLElement[][];
    constructor(tableId: string);
    render(): void;
}
