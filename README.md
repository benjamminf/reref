## `reref()`

```ts
import reref from 'reref';

const set: Set<string> = new Set();
const sameSet: Set<string> = reref(set);

sameSet.add('value');

set === sameSet; // false
set.has('value'); // true
```

A utility for changing the reference of an object without the cost of copying the object. Useful for state management or UI libraries like React that rely on reference equality to determine when state has changed.

## Why?

Sometimes you want to leverage the performance of mutable objects while still being compatible with APIs that assume immutability.

One use case is if you have a large set of values that is written to and read often.

```tsx
function App(): ReactNode {
  const [items, setItems] = useState<string[]>([]);
  const lastItem: ?string = items[items.length - 1];
  const addItem = () => {
    // Perform a mutation. This is more performant than
    // copying the array and appending the new value.
    items.push(`item${items.length}`);
    // React will only update if the reference changes.
    // reref() will create a new reference to the array.
    setItems(reref(items));
  };
  return (
    <main>
      {lastItem && <p>Last item: {lastItem}</p>}
      <button onClick={addItem}>Add item</button>
    </main>
  );
}
```

The above example is fairly contrived, but it illustrates the benefit of mutability in cases where you're often writing to unbounded lists, but only reading a constant amount from.

## How?

Like most magic in JS, the simple answer is [proxies](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy).

Calling `reref()` on an object creates a proxy to that object, the effect of which creates a distinct reference but with an identical interface. Any property changes or method calls on the object will mutate the original object.

The source code is tiny so it might be easier to just read through it.

## When?

It is likely your use case does not need this kind of solution. Most of the time, your objects are not going to be large enough or copied often enough that switching to mutability will make a noticeable difference.

However in the case where you do see a measurable or, more importantly, an improved user experience from mutability, then this is an easy drop-in solution while preserving your state structure.

At the end of the day though, you can't beat plain old JS objects when it comes to performance.

```ts
let oldItems = [];
function oldAddItem(item) {
  oldItems = [...oldItems, item];
}

let newItems = {value: []};
function newAddItem(item) {
  const {value} = newItems;
  value.push(item);
  newItems = {value};
}
```

While `reref` will be significantly faster than copying, _this_ will be significantly faster than `reref`. If you can afford to change the structure of your state, then you should consider this approach.

You may or may not consider the cost of readibility and code cleanliness worth the additional performance, in which case `reref` may be your alternative.

## Caveats

One caveat is that proxies will prevent binding `this` on methods.

```ts
const obj = {
  method() {
    console.log(this);
  },
};

obj.method(); // logs obj
obj.method.call('that'); // logs 'that'

reref(obj).method(); // logs obj
reref(obj).method.call('that'); // logs obj
```

As you can see, trying to override `this` will not work for reref'd objects. This is unfortunately a limitation of proxies.

Subsequently, another caveat is since methods need to be wrapped, their references will change as well.

```ts
obj.method === reref(obj).method; // false
```

So long as you aren't doing anything out of the ordinary with methods, `reref`'d objects will behave the same.

Finally, the last caveat is to be aware if you actually need to preserve pre-mutated objects. For example, if you're observing changes and need to do a comparison to the previous value, or if you're using time travel in debug mode. In which case you may want to use an immutable approach.
