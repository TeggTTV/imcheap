import { Transaction } from './expenseMath';
import { createTimestamp } from './dateUtils';

/**
 * Node for Doubly Linked List representing a Transaction
 */
export class TransactionNode {
  public value: Transaction;
  public prev: TransactionNode | null = null;
  public next: TransactionNode | null = null;

  constructor(value: Transaction) {
    this.value = value;
  }
}

/**
 * Doubly Linked List for managing transactions in chronological/display order.
 * Head represents the newest transaction; tail represents the oldest.
 */
export class TransactionList {
  private head: TransactionNode | null = null;
  private tail: TransactionNode | null = null;
  private size: number = 0;

  constructor(initialItems: Transaction[] = []) {
    for (const item of initialItems) {
      this.append(item);
    }
  }

  get length(): number {
    return this.size;
  }

  get isEmpty(): boolean {
    return this.size === 0;
  }

  /**
   * Prepend a transaction (added to the top / newest).
   */
  prepend(tx: Transaction): TransactionNode {
    const node = new TransactionNode(tx);
    if (!this.head) {
      this.head = node;
      this.tail = node;
    } else {
      node.next = this.head;
      this.head.prev = node;
      this.head = node;
    }
    this.size++;
    return node;
  }

  /**
   * Append a transaction (added to the end / oldest).
   */
  append(tx: Transaction): TransactionNode {
    const node = new TransactionNode(tx);
    if (!this.tail) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      node.prev = this.tail;
      this.tail = node;
    }
    this.size++;
    return node;
  }

  /**
   * Remove transaction node by transaction ID.
   */
  removeById(id: string): Transaction | null {
    let curr = this.head;
    while (curr) {
      if (curr.value.id === id) {
        if (curr.prev) {
          curr.prev.next = curr.next;
        } else {
          this.head = curr.next;
        }

        if (curr.next) {
          curr.next.prev = curr.prev;
        } else {
          this.tail = curr.prev;
        }

        this.size--;
        return curr.value;
      }
      curr = curr.next;
    }
    return null;
  }

  /**
   * Update a transaction by ID.
   */
  updateById(id: string, updates: Partial<Transaction>): Transaction | null {
    let curr = this.head;
    while (curr) {
      if (curr.value.id === id) {
        curr.value = { ...curr.value, ...updates };
        return curr.value;
      }
      curr = curr.next;
    }
    return null;
  }

  /**
   * Find a transaction by ID.
   */
  findById(id: string): Transaction | null {
    let curr = this.head;
    while (curr) {
      if (curr.value.id === id) {
        return curr.value;
      }
      curr = curr.next;
    }
    return null;
  }

  /**
   * Convert linked list to an array.
   */
  toArray(): Transaction[] {
    const result: Transaction[] = [];
    let curr = this.head;
    while (curr) {
      result.push(curr.value);
      curr = curr.next;
    }
    return result;
  }

  /**
   * Filter linked list into an array.
   */
  filter(predicate: (tx: Transaction) => boolean): Transaction[] {
    const result: Transaction[] = [];
    let curr = this.head;
    while (curr) {
      if (predicate(curr.value)) {
        result.push(curr.value);
      }
      curr = curr.next;
    }
    return result;
  }

  /**
   * Clone into a new TransactionList.
   */
  clone(): TransactionList {
    const newList = new TransactionList();
    let curr = this.head;
    while (curr) {
      newList.append({ ...curr.value });
      curr = curr.next;
    }
    return newList;
  }
}

export interface CreateTransactionParams {
  title?: string;
  category?: string;
  amount: number;
  type?: 'expense' | 'income';
  icon?: string;
  note?: string;
  timestamp?: string;
}

/**
 * Factory and repository abstraction for managing transactions cleanly.
 */
export class TransactionManager {
  private list: TransactionList;

  constructor(initialTransactions: Transaction[] = []) {
    this.list = new TransactionList(initialTransactions);
  }

  /**
   * Factory method to build and prepend a new transaction.
   */
  createTransaction(params: CreateTransactionParams): Transaction {
    const finalAmount = Math.max(0, Number(params.amount.toFixed(2)));
    const tx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: params.title?.trim() || 'Expense',
      category: params.category || 'General',
      timestamp: params.timestamp || createTimestamp(),
      amount: finalAmount,
      type: params.type || 'expense',
      icon: params.icon || 'receipt_long',
      note: params.note?.trim() || undefined,
    };

    this.list.prepend(tx);
    return tx;
  }

  /**
   * Remove a transaction by ID.
   */
  removeTransaction(id: string): boolean {
    return this.list.removeById(id) !== null;
  }

  /**
   * Update an existing transaction.
   */
  updateTransaction(id: string, updates: Partial<Transaction>): Transaction | null {
    return this.list.updateById(id, updates);
  }

  /**
   * Get all transactions as an array.
   */
  getAll(): Transaction[] {
    return this.list.toArray();
  }

  /**
   * Get underlying linked list data structure.
   */
  getList(): TransactionList {
    return this.list;
  }

  /**
   * Search transactions matching query.
   */
  search(query: string): Transaction[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAll();
    return this.list.filter((tx) =>
      tx.title.toLowerCase().includes(q) ||
      tx.category.toLowerCase().includes(q) ||
      (tx.note ? tx.note.toLowerCase().includes(q) : false)
    );
  }
}

