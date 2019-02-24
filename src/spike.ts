import "reflect-metadata";

//const injectionContext : any = {};

type Selector = any;

interface InjectionContext {
  params : Map<number, Selector>;
}

interface Injectable {
  get() : any;
}

class StaticInjectable implements Injectable {
  constructor(private value : any) {
  }

  get() : any {
    return this.value;
  }
}

class FactoryInjectable implements Injectable {
  constructor(private func : () => any) {
  }

  get() : any {
    return this.func();
  }
}

const dependenciesMap : Map<Selector, Injectable> = new Map<Selector, Injectable>();

const constructorInjectionContext : Map<string, InjectionContext> = new Map<string, InjectionContext>();
const classParameterInjectionContext : Map<any, Map<string | symbol, InjectionContext>> = new Map<any, Map<string | symbol, InjectionContext>>();

export function Inject(selector : Selector) {
  function decorator(
    target : any,
    propertyKey : string | symbol,
    parameterIndexOrPropertyDescriptor : number | TypedPropertyDescriptor<any>,
  ) {
    let injectionContext : InjectionContext = null;
    let parameterIndex: number = -1;
    let typedPropertyDescriptor: TypedPropertyDescriptor<any> = null;
    if (typeof target === 'function') {
      parameterIndex = parameterIndexOrPropertyDescriptor as number;
      if (constructorInjectionContext.has(target.name)) {
        injectionContext = constructorInjectionContext.get(target.name);
      } else {
        injectionContext = {
          params: new Map<number, Selector>()
        };
        constructorInjectionContext.set(target.name, injectionContext);
      }
    } else {
      //console.log(target, propertyKey, parameterIndexOrPropertyDescriptor);
      if(isNaN(parameterIndexOrPropertyDescriptor as number)) {
        typedPropertyDescriptor = parameterIndexOrPropertyDescriptor as TypedPropertyDescriptor<any>;
        if (classParameterInjectionContext.has(target)
         && classParameterInjectionContext.get(target).has(propertyKey)) {
          //classParameterInjectionContext.get(target).get(propertyKey).
          const originalFunction: Function = typedPropertyDescriptor.value;
          typedPropertyDescriptor.value = function() {
            return originalFunction.apply(
              this,
              createParams(classParameterInjectionContext.get(target).get(propertyKey)))
          };
          register(selector, typedPropertyDescriptor.value());
        } else {
          register(selector, target[propertyKey]());
        }
        //typedPropertyDescriptor.value = () => console.log('b');
      } else {
        parameterIndex = parameterIndexOrPropertyDescriptor as number;
        if (!classParameterInjectionContext.has(target)) {
          classParameterInjectionContext.set(target, new Map<string | symbol, InjectionContext>());
          //let propertyKeyMap: Map<string, InjectionContext> = parameterInjectionContext.get(target);
        }
        const parameterInjectionContext: Map<string | symbol, InjectionContext> = classParameterInjectionContext.get(target);
        if (!parameterInjectionContext.has(propertyKey)) {
          parameterInjectionContext.set(propertyKey, injectionContext = {
            params: new Map<number, Selector>()
          });
        }
        injectionContext = parameterInjectionContext.get(propertyKey);
      }
    }
    if (injectionContext !== null) {
      injectionContext.params.set(parameterIndex, selector);
    }
  }

  return decorator;
}

const instantiate = (selector : Selector) : any => {
  if (dependenciesMap.has(selector)) {
    return dependenciesMap.get(selector).get();
  }
  throw new Error(`No dependency found for selector ${selector}`);
};

const createParams = (injectionContext: InjectionContext): any[] => {
  const params : any[] = [];
  injectionContext.params.forEach((selector : Selector, index : number) => {
    params.splice(index, 0, instantiate(selector));
  });
  return params;
};

export const create = <T>(type : any) : T => {
  const injectionContext : InjectionContext = constructorInjectionContext.get(type.name);
  return new type(...createParams(injectionContext)) as T;
};

export const factory = (func : () => any) => {
  return new FactoryInjectable(func);
};

export const register = (selector : Selector, definition : any) : void => {
  if (definition === undefined) {
    throw new Error(`Registered undefined for selector ${selector}`);
  } else {
    if (typeof definition.get !== 'function') {
      return register(selector, new StaticInjectable(definition));
    }
    dependenciesMap.set(selector, definition);
  }
};

//const call = (method)

// function foo2(baz: any, @DecoratedParameter bar: any) {
//   console.log("Global function foo");
// }

// const test = new TargetDemo("a");

// let prox = new Proxy(test, {
//   get: function (target: any, propKey, receiver) {
//     // console.log('getting' + target.constructor.name);
//     // return target[name];
//     const origMethod = target[propKey];
//     return function (...args) {
//       //
//       const newArgs = [];
//       const injectables = target._injectionContext.methods[propKey].injectableParams;
//       for(let i = 0; i < args.length; i++) {
//         let value = args[i];
//         for (let j = 0; j < injectables.length; j++) {
//           if(injectables[j].index === i) {
//             //value = `${injectables[j].type}`;
//             for(let p = 0; p < dependencies.length; p++) {
//               if(dependencies[p].type === injectables[j].type) {
//                 value = dependencies[p].value();
//               }
//             }
//             //value = depen
//           }
//         }
//         newArgs.push(value);
//       }
//       let result = origMethod.apply(this, newArgs);
//       console.log(propKey, JSON.stringify(newArgs)
//         + ' -> ' + JSON.stringify(result));
//     };
//   }
// });

// prox.foo1("class baz", "class bar", "foo");

//test.foo1("class baz", "class bar");

// foo2("function baz", "function bar");

