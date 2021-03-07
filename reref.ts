const TARGET = Symbol();

function unproxy<T extends Object>(obj: T): T {
  // Unwraps a proxy to get the original object.
  return obj[TARGET] ? unproxy(obj[TARGET]) : obj;
}

function proxy<T extends Object>(obj: T, target: T): T {
  return new Proxy<T>(obj, {
    get: (_, prop) => {
      // Return the original object so we can flatten proxies when
      // called recursively.
      if (prop === TARGET) {
        return target;
      }

      const value = Reflect.get(target, prop);

      // Bind methods so the object as context is not lost.
      // This unfortunately means you cannot re-bind the context.
      if (value instanceof Function) {
        const method = unproxy(value);

        // Functions are also objects, and objects can have props.
        // Proxy the original function so props aren't lost when
        // binding.
        return proxy(method.bind(target), method);
      }

      return value;
    },
    set:
      // Setters aren't necessary if the proxied object is also
      // the target.
      obj !== target
        ? (_, prop, value) => Reflect.set(target, prop, value)
        : undefined,
  });
}

export default function reref<T extends Object>(obj: T): T {
  const target = unproxy(obj);

  return proxy(target, target);
}
