import LinkedList from '../collection/linked-list';
import Shadow from './base';


class ShadowParent extends Shadow {
  children: LinkedList<Shadow> = new LinkedList<Shadow>();

  appendChild(other: Shadow): void {
    this.insertBefore(other);
  }

  insertBefore(childNode: Shadow, refNode?: Shadow): void {
    this.children.insertBefore(childNode, refNode);
    var refDomNode = null;
    if (refNode != null) {
      refDomNode = refNode.domNode;
    }
    if (childNode.next == null || childNode.domNode.nextSibling != refDomNode) {
      this.domNode.insertBefore(childNode.domNode, refDomNode);
    }
    childNode.parent = this;
  }

  isolate(index: number, length: number): ShadowParent {
    return <ShadowParent>super.isolate(index, length);
  }

  moveChildren(parent: ShadowParent, refNode?: Shadow): void {
    this.children.forEach(function(child) {
      parent.insertBefore(child, refNode);
    });
  }

  replace(name: string, value: any): ShadowParent {
    var replacement = <ShadowParent>super.replace(name, value);
    this.moveChildren(replacement);
    return replacement;
  }

  split(index: number): Shadow {
    if (index === 0) return this;
    if (index === this.length()) return this.next;
    var after = <ShadowParent>this.clone();
    this.parent.insertBefore(after, this.next);
    this.children.forEachAt(index, this.length(), function(child, offset, length) {
      var child = child.split(offset);
      child.remove();
      after.appendChild(child);
    });
    return after;
  }

  unwrap(): void {
    this.moveChildren(this.parent, this);
    this.remove();
  }
}


export default ShadowParent;