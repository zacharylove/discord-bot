// Implementation of a LIFO stack data structure

interface IStack<T> {
    push(item: T): void;
    pop(): T | undefined;
    peek(): T | undefined;
    size(): number;
}
export class Stack<T> implements IStack<T> {
    private storage: T[] = [];

    constructor(private capacity: number = Infinity) {}

    push(item: T): void {
        if (this.size() === this.capacity) {
        throw Error("Stack has reached max capacity, you cannot add more items");
        }
        this.storage.push(item);
    }

    pop(): T | undefined {
        return this.storage.pop();
    }

    peek(): T | undefined {
        return this.storage[this.size() - 1];
    }

    size(): number {
        return this.storage.length;
    }
}

/* Examples:
    const stack = new Stack<string>();
    stack.push("A");
    stack.push("B");

    stack.size(); // Output: 2
    stack.peek(); // Output: "B"
    stack.size(); // Output: 2
    stack.pop();  // Output: "B"
    stack.size(); // Output: 1  

*/


// Implementation of a FIFO Queue
interface IQueue<T> {
    enqueue(item: T): void;
    dequeue(): T | undefined;
    size(): number;
  }
  
export class Queue<T> implements IQueue<T> {
    private storage: T[] = [];

    constructor(private capacity: number = Infinity) {}

    enqueue(item: T): void {
        if (this.size() === this.capacity) {
        throw Error("Queue has reached max capacity, you cannot add more items");
        }
        this.storage.push(item);
    }
    dequeue(): T | undefined {
        return this.storage.shift();
    }
    size(): number {
        return this.storage.length;
    }
}

/* Examples:
  const queue = new Queue<string>();
  
  queue.enqueue("A");
  queue.enqueue("B");
  
  queue.size();    // Output: 2
  queue.dequeue(); // Output: "A"
  queue.size();    // Output: 1
*/