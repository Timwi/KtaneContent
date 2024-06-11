/* Library for utilities related to quantized grid coordinates. */

/**
 * Enum representing the cardinal and intercardinal directions on a 2D grid.
 * The directions are numbered clockwise, starting from 0 (Up).
 * 
 * @readonly
 * @enum {number}
 */
const GridDirection = Object.freeze({
    Up: 0,
    UpRight: 1,
    Right: 2,
    DownRight: 3,
    Down: 4,
    DownLeft: 5,
    Left: 6,
    UpLeft: 7
});

/**
 * Represents a coordinate on a 2D grid with specified number of cells wide and tall.
 */
class Coord {
    /**
     * Creates a new Coord.
     *
     * @param {number} width - The integer width of the grid.
     * @param {number} height - The integer height of the grid.
     * @param {number} index - The linear index of the coordinate in the grid.
     */
    constructor(width, height, index) {
        this.Width = width;
        this.Height = height;
        this.Index = index;
    }

    /**
     * Gets the x-coordinate of the current coordinate.
     *
     * @returns {number} The x-coordinate.
     */
    get X() {
        return this.Index % this.Width;
    }

    /**
     * Gets the y-coordinate of the current coordinate.
     *
     * @returns {number} The y-coordinate.
     */
    get Y() {
        return Math.floor(this.Index / this.Width);
    }

    /**
     * Returns a string representation of the coordinate in the format "(x, y)/(width×height)".
     *
     * @returns {string} The string representation of the coordinate.
     */
    ToString() {
        return `(${this.X}, ${this.Y})/(${this.Width}×${this.Height})`;
    }

   /**
     * Creates a new Coord by adding dx to the x-coordinate, wrapping around the grid width.
     * 
     * @param {number} dx - The change in x-coordinate.
     * @returns {Coord} The new Coord.
     */
    AddXWrap(dx) {
        return new Coord(this.Width, this.Height, ((this.X + dx) % this.Width + this.Width) % this.Width + this.Y * this.Width);
    }

    /**
     * Creates a new Coord by adding dy to the y-coordinate, wrapping around the grid height.
     * 
     * @param {number} dy - The change in y-coordinate.
     * @returns {Coord} The new Coord.
     */
    AddYWrap(dy) {
        return new Coord(this.Width, this.Height, this.X + ((this.Y + dy) % this.Height + this.Height) % this.Height * this.Width);
    }

    /**
     * Creates a new Coord by adding dx and dy to the x and y coordinates, wrapping around the grid.
     * 
     * @param {number} dx - The change in x-coordinate.
     * @param {number} dy - The change in y-coordinate.
     * @returns {Coord} The new Coord.
     */
    AddWrap(dx, dy) {
        return new Coord(this.Width, this.Height, ((this.X + dx) % this.Width + this.Width) % this.Width + ((this.Y + dy) % this.Height + this.Height) % this.Height * this.Width);
    }

    /**
     * Checks if another Coord is equal to this one.
     * 
     * @param {Coord} other - The other Coord to compare.
     * @returns {boolean} True if the Coords are equal, false otherwise.
     */
    Equals(other) {
        return other.Index === this.Index && other.Width === this.Width && other.Height === this.Height;
    }

    /**
     * Creates an array of Coord instances representing all cells in a grid with the specified width and height.
     *
     * @param {number} w - The width of the grid.
     * @param {number} h - The height of the grid.
     * @returns {Array<Coord>} An array of Coord instances representing all cells in the grid.
     */
    static Cells(w, h) {
        return [...Array(w * h).keys()].map(ix => new Coord(w, h, ix));
    }

    /**
     * Checks if the current Coord instance is adjacent to another Coord instance, wrapping around the grid.
     *
     * @param {Coord} other - The other Coord instance to check adjacency with.
     * @returns {boolean} True if the instances are adjacent, false otherwise.
     */
    AdjacentToWrap(other) {
        return other.Equals(this.AddXWrap(1)) || other.Equals(this.AddXWrap(-1)) || other.Equals(this.AddYWrap(1)) || other.Equals(this.AddYWrap(-1));
    }

    /**
     * Checks if the current Coord instance can move in the specified direction by the specified amount without going off the grid.
     *
     * @param {GridDirection} dir - The direction to move in, represented by the GridDirection enum value.
     * @param {number} [amount=1] - The number of steps to move in the specified direction.
     * @returns {boolean} True if the move is possible, false otherwise.
     */
    CanGoTo(dir, amount = 1) {
        switch (dir) {
            case GridDirection.Up: return this.Y >= amount;
            case GridDirection.UpRight: return this.Y >= amount && this.X < this.Width - amount;
            case GridDirection.Right: return this.X < this.Width - amount;
            case GridDirection.DownRight: return this.Y < this.Height - amount && this.X < this.Width - amount;
            case GridDirection.Down: return this.Y < this.Height - amount;
            case GridDirection.DownLeft: return this.Y < this.Height - amount && this.X >= amount;
            case GridDirection.Left: return this.X >= amount;
            case GridDirection.UpLeft: return this.X >= amount && this.Y >= amount;
            default: throw new Error("Invalid GridDirection value.");
        }
    }

    /**
     * Checks if the current Coord instance can move by the specified x and y offsets without going off the grid.
     *
     * @param {number} x - The offset in the x-coordinate.
     * @param {number} y - The offset in the y-coordinate.
     * @returns {boolean} True if the move is possible, false otherwise.
     */
    CanMoveBy(x, y) {
        return (this.X + x) >= 0 && (this.X + x) < this.Width && (this.Y + y) >= 0 && (this.Y + y) < this.Height;
    }

    /**
     * Returns a new Coord instance moved in the specified direction by the specified amount, or throws an error if the move would go off the grid.
     *
     * @param {GridDirection} dir - The direction to move in, represented by the GridDirection enum value.
     * @param {number} [amount=1] - The number of steps to move in the specified direction.
     * @returns {Coord} A new Coord instance moved in the specified direction.
     * @throws {Error} If the move would go off the grid.
     */
    GoTo(dir, amount = 1) {
        if (!this.CanGoTo(dir, amount)) throw new Error(`Taking ${amount} step(s) in that direction would go off the grid.`);
        return this.GoToWrap(dir, amount);
    }

    /**
     * Returns a new Coord instance moved in the specified direction by the specified amount, wrapping around the grid.
     *
     * @param {GridDirection} dir - The direction to move in, represented by the GridDirection enum value.
     * @param {number} [amount=1] - The number of steps to move in the specified direction.
     * @returns {Coord} A new Coord instance moved in the specified direction, wrapping around the grid.
     */
    GoToWrap(dir, amount = 1) {
        switch (dir) {
            case GridDirection.Up: return this.AddWrap(0, -amount);
            case GridDirection.UpRight: return this.AddWrap(amount, -amount);
            case GridDirection.Right: return this.AddWrap(amount, 0);
            case GridDirection.DownRight: return this.AddWrap(amount, amount);
            case GridDirection.Down: return this.AddWrap(0, amount);
            case GridDirection.DownLeft: return this.AddWrap(-amount, amount);
            case GridDirection.Left: return this.AddWrap(-amount, 0);
            case GridDirection.UpLeft: return this.AddWrap(-amount, -amount);
            default: throw new Error("Invalid GridDirection value.");
        }
    }

    /**
     * Returns a new Coord instance representing the neighbor in the specified direction, or throws an error if there is no neighbor in that direction.
     *
     * @param {GridDirection} dir - The direction to get the neighbor in, represented by the GridDirection enum value.
     * @returns {Coord} A new Coord instance representing the neighbor in the specified direction.
     * @throws {Error} If there is no neighbor in the specified direction.
     */
    Neighbor(dir) {
        if (!this.CanGoTo(dir)) throw new Error("The grid has no neighbor in that direction.");
        return this.NeighborWrap(dir);
    }

    /**
     * Returns a new Coord instance representing the neighbor in the specified direction, wrapping around the grid.
     *
     * @param {GridDirection} dir - The direction to get the neighbor in, represented by the GridDirection enum value.
     * @returns {Coord} A new Coord instance representing the neighbor in the specified direction, wrapping around the grid.
     */
    NeighborWrap(dir) {
        switch (dir) {
            case GridDirection.Up: return this.AddWrap(0, -1);
            case GridDirection.UpRight: return this.AddWrap(1, -1);
            case GridDirection.Right: return this.AddWrap(1, 0);
            case GridDirection.DownRight: return this.AddWrap(1, 1);
            case GridDirection.Down: return this.AddWrap(0, 1);
            case GridDirection.DownLeft: return this.AddWrap(-1, 1);
            case GridDirection.Left: return this.AddWrap(-1, 0);
            case GridDirection.UpLeft: return this.AddWrap(-1, -1);
            default: throw new Error("Invalid GridDirection value.");
        }
    }

    /**
     * Gets an array of Coord instances representing all neighbors of the current coordinate, including diagonal neighbors.
     *
     * @returns {Array<Coord>} An array of Coord instances representing all neighbors of the current coordinate.
     */
    get Neighbors() {
        let result = [];
        for (let i = 0; i < 8; i++) {
            if (this.CanGoTo(i)) {
                result.push(this.Neighbor(i));
            }
        }
        return result;
    }

    /**
     * Gets an array of Coord instances representing the orthogonal (non-diagonal) neighbors of the current coordinate.
     *
     * @returns {Array<Coord>} An array of Coord instances representing the orthogonal neighbors of the current coordinate.
     */
    get OrthogonalNeighbors() {
        let result = [];
        for (let i = 0; i < 4; i++) {
            if (this.CanGoTo(i * 2)) {
                result.push(this.Neighbor(i * 2));
            }
        }
        return result;
    }
}