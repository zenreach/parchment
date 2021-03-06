import { Blot } from './abstract/blot';
import ContainerBlot from './abstract/container';
import LinkedList from '../collection/linked-list';
import * as Registry from '../registry';


const OBSERVER_CONFIG = {
  attributes: true,
  characterData: true,
  childList: true,
  subtree: true
};

const MAX_OPTIMIZE_ITERATIONS = 100;


class ScrollBlot extends ContainerBlot {
  static blotName = 'scroll';
  static defaultChild = 'block';
  static scope = Registry.Scope.BLOCK_BLOT;
  static tagName = 'DIV';

  observer: MutationObserver;

  constructor(node: HTMLDivElement) {
    super(node);
    this.parent = null;
    this.observer = new MutationObserver((mutations: MutationRecord[]) => {
      this.update(mutations);
    });
    this.observer.observe(this.domNode, OBSERVER_CONFIG);
  }

  detach() {
    super.detach();
    this.observer.disconnect();
  }

  deleteAt(index: number, length: number): void {
    this.update();
    if (index === 0 && length === this.length()) {
      this.children.forEach(function(child) {
        child.remove();
      });
    } else {
      super.deleteAt(index, length)
    }
    this.optimize();
  }

  formatAt(index: number, length: number, name: string, value: any): void {
    this.update();
    super.formatAt(index, length, name, value);
    this.optimize();
  }

  insertAt(index: number, value: string, def?: any): void {
    this.update();
    super.insertAt(index, value, def);
    this.optimize();
  }

  optimize(mutations: MutationRecord[] = []): void {
    super.optimize();
    mutations.push.apply(mutations, this.observer.takeRecords());
    // TODO use WeakMap
    let mark = (blot: Blot) => {
      if (blot == null || blot === this) return;
      if (blot.domNode.parentNode == null) return;
      if (blot.domNode[Registry.DATA_KEY].mutations == null) {
        blot.domNode[Registry.DATA_KEY].mutations = [];
      }
      mark(blot.parent);
    }
    let optimize = function(blot: Blot) {  // Post-order traversal
      if (blot instanceof ContainerBlot) {
        blot.children.forEach(function(child) {
          if (!child.domNode[Registry.DATA_KEY] || child.domNode[Registry.DATA_KEY].mutations == null) return;
          optimize(child);
        });
      }
      blot.optimize();
    }
    let remaining = mutations;
    for (let i = 0; remaining.length > 0; i += 1) {
      if (i >= MAX_OPTIMIZE_ITERATIONS) {
        throw new Error('[Parchment] Maximum optimize iterations reached');
      }
      remaining.forEach(function(mutation) {
        let blot = Registry.find(mutation.target, true);
        if (blot != null && blot.domNode === mutation.target) {
          if (mutation.type === 'childList') {
            mark(Registry.find(mutation.previousSibling, false));
            [].forEach.call(mutation.addedNodes, function(node) {
              let child = Registry.find(node, false);
              mark(child);
              if (child instanceof ContainerBlot) {
                child.children.forEach(mark);
              }
            });
          } else if (mutation.type === 'attributes') {
            mark(blot.prev);
          }
          mark(blot);
        }
      });
      this.children.forEach(optimize);
      remaining = this.observer.takeRecords();
      mutations.push.apply(mutations, remaining);
    }
  }

  update(mutations?: MutationRecord[]): void {
    mutations = mutations || this.observer.takeRecords();
    // TODO use WeakMap
    mutations.map(function(mutation: MutationRecord) {
      let blot = Registry.find(mutation.target, true);
      if (blot == null) return;
      if (blot.domNode[Registry.DATA_KEY].mutations == null) {
        blot.domNode[Registry.DATA_KEY].mutations = [mutation];
        return blot;
      } else {
        blot.domNode[Registry.DATA_KEY].mutations.push(mutation);
        return null;
      }
    }).forEach((blot: Blot) => {
      if (blot == null || blot === this) return;
      blot.update(blot.domNode[Registry.DATA_KEY].mutations || []);
    });
    if (this.domNode[Registry.DATA_KEY].mutations != null) {
      super.update(this.domNode[Registry.DATA_KEY].mutations);
    }
    this.optimize(mutations);
  }
}


export default ScrollBlot;
